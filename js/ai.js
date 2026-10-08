// AI food estimates with Claude. Uses the user's own Anthropic API key, stored only on this device.

export const AI_MODELS = [
  { id: 'claude-opus-5-5', label: 'Claude Opus 5.5', hint: 'Most accurate · about 3¢ per log' },
  { id: 'claude-sonnet-5-5', label: 'Claude Sonnet 5.5', hint: 'Fast and accurate · about 1.5¢ per log' },
  { id: 'claude-haiku-5-5', label: 'Claude Haiku 5.5', hint: 'Cheapest · under 0.1¢ per log' },
];

// Field names spell out units so the model never has to guess them.
const FIELDS = {
  kcal: 'calories_kcal', protein: 'protein_g', carbs: 'carbs_g', fat: 'fat_g', fiber: 'fiber_g', sugar: 'sugar_g',
  satfat: 'saturated_fat_g', sodium: 'sodium_mg', vitA: 'vitamin_a_rae_ug', vitC: 'vitamin_c_mg', vitD: 'vitamin_d_ug',
  vitE: 'vitamin_e_mg', vitK: 'vitamin_k_ug', b1: 'thiamin_b1_mg', b2: 'riboflavin_b2_mg', b3: 'niacin_b3_mg',
  b5: 'pantothenic_acid_b5_mg', b6: 'vitamin_b6_mg', folate: 'folate_dfe_ug', b12: 'vitamin_b12_ug', calcium: 'calcium_mg',
  iron: 'iron_mg', magnesium: 'magnesium_mg', potassium: 'potassium_mg', zinc: 'zinc_mg', selenium: 'selenium_ug',
};

const ITEM = {
  type: 'object',
  properties: {
    name: { type: 'string' },
    portion: { type: 'string' },
    grams: { type: 'number' },
    ...Object.fromEntries(Object.values(FIELDS).map((f) => [f, { type: 'number' }])),
  },
  required: ['name', 'portion', 'grams', ...Object.values(FIELDS)],
  additionalProperties: false,
};

const SCHEMA = {
  type: 'object',
  properties: { items: { type: 'array', items: ITEM }, note: { type: 'string' } },
  required: ['items', 'note'],
  additionalProperties: false,
};

const SYSTEM = `You estimate nutrition for a personal food log. The user tells you or shows you what they ate; return one item per distinct food or drink.

For each item:
- name: short and natural, the way someone would say it ("Scrambled eggs", "Oat milk latte").
- portion: the amount eaten in everyday terms ("2 large eggs", "1 grande, 16 fl oz").
- grams: the edible weight of that portion (for drinks, treat ml as grams).
- nutrient fields: totals for the whole portion, not per 100 g. Base them on USDA FoodData Central values, or on the brand's published nutrition facts when a brand or restaurant chain is named. Include cooking fats, sauces, dressings and toppings that are normally part of the dish.

When the amount isn't stated, infer it from the photo (plate size, utensils, packaging) or assume a typical serving. Give a best estimate for every vitamin and mineral; use 0 only when the food has essentially none of it.

note: one short sentence naming the assumption that most affects the calories (for example "Assumed 1 tbsp of oil for cooking"), or an empty string if there is nothing notable.

If the input isn't food or drink, return an empty items list and say so in the note.`;

class AiError extends Error {}

let sdk;
async function getClient(apiKey) {
  if (!sdk) sdk = await import('./vendor/anthropic.js');
  return new sdk.Anthropic({ apiKey, dangerouslyAllowBrowser: true, maxRetries: 1 });
}

export async function estimateMeal({ apiKey, model, text, imageB64 }) {
  const client = await getClient(apiKey);
  const content = [];
  if (imageB64) content.push({ type: 'image', source: { type: 'base64', media_type: 'image/jpeg', data: imageB64 } });
  const said = (text || '').trim();
  content.push({ type: 'text', text: said ? `What I ate: ${said}` : 'Estimate what is in this photo.' });

  const params = {
    model,
    max_tokens: 16000,
    system: SYSTEM,
    messages: [{ role: 'user', content }],
    output_config: { effort: 'medium', format: { type: 'json_schema', schema: SCHEMA } },
  };

  // Server-side fallback reroutes a rare safety-classifier decline to another model.
  // Haiku has no server-side fallback, so it uses the standard endpoint.
  const msg = model === 'claude-haiku-5-5'
    ? await client.messages.create(params)
    : await client.beta.messages.create({ ...params, betas: ['server-side-fallback-2026-07-01'], fallbacks: 'default' });

  if (msg.stop_reason === 'refusal') throw new AiError('Claude declined to estimate this one. Try describing it differently.');
  if (msg.stop_reason === 'max_tokens') throw new AiError('The answer got cut off. Try fewer foods at once.');
  const block = msg.content.find((b) => b.type === 'text');
  if (!block) throw new AiError('No estimate came back. Try again.');

  let data;
  try { data = JSON.parse(block.text); } catch { throw new AiError('The estimate came back garbled. Try again.'); }
  return {
    note: data.note || '',
    items: (data.items || []).map((it) => {
      const out = { name: it.name, portion: it.portion, grams: Math.max(0, +it.grams || 0) };
      for (const [key, field] of Object.entries(FIELDS)) {
        const v = +it[field];
        if (v > 0) out[key] = +v.toPrecision(4);
      }
      return out;
    }),
  };
}

// ---- Coach chat ----

const COACH_SCHEMA = {
  type: 'object',
  properties: {
    reply: { type: 'string' },
    actions: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          type: { type: 'string', enum: ['set_goal', 'set_style', 'adjust_calories'] },
          value: { type: 'string' },
          label: { type: 'string' },
        },
        required: ['type', 'value', 'label'],
        additionalProperties: false,
      },
    },
  },
  required: ['reply', 'actions'],
  additionalProperties: false,
};

const COACH_SYSTEM = `You are the nutrition coach inside Plate, a personal food, water, vitamin and weight tracker. You talk with one person about their eating. Their profile, targets, recent food log and weight trend are below, and they are current: rely on them instead of asking for numbers you already have.

How to coach:
- Be direct and practical, like a good coach texting a client. Lead with the answer, then the reason. Use their actual numbers.
- Keep replies short: usually 2 to 5 sentences, or a short list of "- " bullets when listing foods or steps. Use **bold** sparingly for the key number. No headings, no tables.
- Ground advice in mainstream sports nutrition: protein of 1.6 to 2.2 g per kg for people who lift, a 250 to 500 kcal surplus for building muscle, judging progress from the weekly weight trend rather than single weigh-ins.
- Suggest specific, ordinary foods with rough portions and protein amounts.
- When they ask about a diet change such as keto, explain what changes (where calories come from) and what stays the same (calories and protein), and what to expect.
- You are not a doctor. If they mention a medical condition, medication, pregnancy, an eating disorder, or extreme plans (under about 1,200 kcal, fasting for days, losing more than 1% of bodyweight a week), give general guidance and suggest a doctor or registered dietitian.

What Plate can do (offer these as actions when they fit, and only when the person would clearly want them):
- set_goal, value one of: cut (lose fat, -500 kcal), cut_slow (-250), maintain, lean_bulk (build muscle, +300 kcal, high protein), bulk (+500).
- set_style, value one of: balanced (30% fat), performance (higher carb, 20% fat), low_carb (about 100 g carbs), keto (25 g net carbs max). Style changes only carbs and fat; calories and protein stay the same. It applies from today on, so switching for a week and back is fine.
- adjust_calories, value a whole number of kcal to add or subtract from the daily target, such as "150" or "-150". Use steps of 100 to 250.
Each action needs a short button label, such as "Switch to keto" or "Add 150 kcal". Return an empty actions list when no change is needed. Never claim you made a change; the person taps the button to apply it.

The person's data:
`;

export async function askCoach({ apiKey, model, history, context }) {
  const client = await getClient(apiKey);
  const params = {
    model,
    max_tokens: 8000,
    system: COACH_SYSTEM + context,
    messages: history.map((m) => ({ role: m.role, content: m.text })),
    output_config: { effort: 'low', format: { type: 'json_schema', schema: COACH_SCHEMA } },
  };
  const msg = model === 'claude-haiku-5-5'
    ? await client.messages.create(params)
    : await client.beta.messages.create({ ...params, betas: ['server-side-fallback-2026-07-01'], fallbacks: 'default' });

  if (msg.stop_reason === 'refusal') throw new AiError("The coach can't help with that one. Try asking another way.");
  if (msg.stop_reason === 'max_tokens') throw new AiError('The answer got cut off. Try a narrower question.');
  const block = msg.content.find((b) => b.type === 'text');
  if (!block) throw new AiError('No answer came back. Try again.');
  let data;
  try { data = JSON.parse(block.text); } catch { throw new AiError('The answer came back garbled. Try again.'); }
  return { reply: String(data.reply || '').trim(), actions: Array.isArray(data.actions) ? data.actions : [] };
}

export function aiErrorMessage(err) {
  if (err instanceof AiError) return err.message;
  const status = err?.status;
  const msg = String(err?.message || '');
  if (status === 401) return 'That API key was rejected. Check it in Settings.';
  if (status === 403) return "This API key doesn't have access. Check it in Settings.";
  if (status === 400 && /credit/i.test(msg)) return 'Your Anthropic account is out of credits. Add some at console.anthropic.com.';
  if (status === 429) return 'Too many requests right now. Wait a moment and try again.';
  if (status >= 500) return 'Claude is busy right now. Try again in a minute.';
  if (!navigator.onLine || /connection|fetch|network/i.test(msg)) return 'No connection. AI estimates need the internet.';
  return msg || 'Something went wrong. Try again.';
}

// Shrink photos before upload: faster, and far fewer tokens.
export async function prepareImage(file) {
  const url = URL.createObjectURL(file);
  try {
    const img = await new Promise((resolve, reject) => {
      const i = new Image();
      i.onload = () => resolve(i);
      i.onerror = () => reject(new Error("Couldn't read that image."));
      i.src = url;
    });
    const max = 1024;
    const s = Math.min(1, max / Math.max(img.naturalWidth, img.naturalHeight));
    const w = Math.round(img.naturalWidth * s);
    const h = Math.round(img.naturalHeight * s);
    const canvas = document.createElement('canvas');
    canvas.width = w;
    canvas.height = h;
    canvas.getContext('2d').drawImage(img, 0, 0, w, h);
    const dataUrl = canvas.toDataURL('image/jpeg', 0.82);
    return { dataUrl, b64: dataUrl.slice(dataUrl.indexOf(',') + 1) };
  } finally {
    URL.revokeObjectURL(url);
  }
}
