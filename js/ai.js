// AI food estimates with Claude. Uses the user's own Anthropic API key, stored only on this device.

export const AI_MODELS = [
  { id: 'claude-opus-5-5', label: 'Claude Opus 5.5', hint: 'Most accurate · about 3¢ per log' },
  { id: 'claude-sonnet-5-5', label: 'Claude Sonnet 5.5', hint: 'Fast and accurate · about 1.5¢ per log' },
  { id: 'claude-haiku-5-5', label: 'Claude Haiku 5.5', hint: 'Cheapest · under 0.1¢ per log' },
];

// Dollars per million tokens (Claude API pricing). Cache writes cost 1.25× input; cache reads are the cheap repeat rate.
const PRICES = {
  'claude-opus-5-5': { in: 4, out: 20, cacheRead: 0.2 },
  'claude-sonnet-5-5': { in: 2, out: 10, cacheRead: 0.2 },
  'claude-haiku-5-5': { in: 0.1, out: 0.5, cacheRead: 0.01 },
};

// Adds one response's tokens and cost (in cents) to a running total. Output tokens include the model's thinking.
function addUsage(total, msg, fallbackModel) {
  const u = msg.usage || {};
  const price = PRICES[msg.model] || PRICES[fallbackModel] || PRICES['claude-opus-5-5'];
  const t = {
    in: u.input_tokens || 0, out: u.output_tokens || 0,
    cacheWrite: u.cache_creation_input_tokens || 0, cacheRead: u.cache_read_input_tokens || 0,
  };
  const dollars = (t.in * price.in + t.cacheWrite * price.in * 1.25 + t.cacheRead * price.cacheRead + t.out * price.out) / 1e6;
  return {
    model: msg.model || fallbackModel,
    steps: (total?.steps || 0) + 1,
    cents: (total?.cents || 0) + dollars * 100,
    in: (total?.in || 0) + t.in, out: (total?.out || 0) + t.out,
    cacheWrite: (total?.cacheWrite || 0) + t.cacheWrite, cacheRead: (total?.cacheRead || 0) + t.cacheRead,
  };
}

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
  const server = globalThis.PLATE_SERVER;
  return new sdk.Anthropic({ apiKey, dangerouslyAllowBrowser: true, maxRetries: 1, ...(server ? { baseURL: server } : {}) });
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

  const cost = addUsage(null, msg, model);
  if (msg.stop_reason === 'refusal') throw new AiError('Claude declined to estimate this one. Try describing it differently.');
  if (msg.stop_reason === 'max_tokens') throw new AiError('The answer got cut off. Try fewer foods at once.');
  const block = msg.content.find((b) => b.type === 'text');
  if (!block) throw new AiError('No estimate came back. Try again.');

  let data;
  try { data = JSON.parse(block.text); } catch { throw new AiError('The estimate came back garbled. Try again.'); }
  return {
    cost,
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

// ---- Supplement labels ----

const SUPP_KEYS = ['vitA', 'vitC', 'vitD', 'vitE', 'vitK', 'b1', 'b2', 'b3', 'b5', 'b6', 'folate', 'b12', 'calcium', 'iron', 'magnesium', 'potassium', 'zinc', 'selenium', 'sodium'];

const LABEL_SCHEMA = {
  type: 'object',
  properties: {
    name: { type: 'string' },
    ...Object.fromEntries(SUPP_KEYS.map((k) => [FIELDS[k], { type: 'number' }])),
    other: {
      type: 'array',
      items: {
        type: 'object',
        properties: { name: { type: 'string' }, amount: { type: 'number' }, unit: { type: 'string', enum: ['mg', 'µg', 'g', 'IU', 'billion CFU'] } },
        required: ['name', 'amount', 'unit'],
        additionalProperties: false,
      },
    },
    note: { type: 'string' },
  },
  required: ['name', ...SUPP_KEYS.map((k) => FIELDS[k]), 'other', 'note'],
  additionalProperties: false,
};

const LABEL_SYSTEM = `You read supplement labels for a personal tracker. The photo shows a supplement bottle or its Supplement Facts panel. Copy the amounts for one serving exactly as printed; do not estimate from what the product usually contains.

- name: the product as someone would call it, with the brand if visible ("Thorne Vitamin D3", "Optimum Nutrition Creatine").
- The numeric fields are per serving, in the unit their name says. Convert where needed: vitamin D in µg (IU ÷ 40); vitamin A in µg RAE (if only IU: retinol or retinyl IU × 0.3, beta-carotene IU × 0.05); vitamin E in mg (natural d-alpha IU × 0.67, synthetic dl-alpha IU × 0.45); folate in µg DFE (if the label gives only µg of folic acid, × 1.7). Use 0 for anything not on the label.
- other: every other active ingredient that has an amount, such as creatine, EPA, DHA, biotin, iodine, copper, manganese, chromium, choline, caffeine, herbal extracts or probiotic counts (as billion CFU). Use the label's amount and the closest allowed unit (mcg is µg). Skip "other ingredients" like capsule materials and fillers.
- note: one short sentence with the serving size ("Per 2 capsules"), plus anything you couldn't read clearly.

If the photo isn't a supplement label or can't be read, return 0 everywhere, empty other, and say so in the note.`;

export async function readSupplementLabel({ apiKey, model, imageB64 }) {
  const client = await getClient(apiKey);
  const params = {
    model,
    max_tokens: 16000,
    system: LABEL_SYSTEM,
    messages: [{ role: 'user', content: [
      { type: 'image', source: { type: 'base64', media_type: 'image/jpeg', data: imageB64 } },
      { type: 'text', text: 'Read this supplement label.' },
    ] }],
    output_config: { effort: 'medium', format: { type: 'json_schema', schema: LABEL_SCHEMA } },
  };
  const msg = model === 'claude-haiku-5-5'
    ? await client.messages.create(params)
    : await client.beta.messages.create({ ...params, betas: ['server-side-fallback-2026-07-01'], fallbacks: 'default' });
  const cost = addUsage(null, msg, model);
  if (msg.stop_reason === 'refusal') throw new AiError("Claude couldn't read this one. Try typing it in.");
  if (msg.stop_reason === 'max_tokens') throw new AiError('The answer got cut off. Try a closer photo of just the facts panel.');
  const block = msg.content.find((b) => b.type === 'text');
  if (!block) throw new AiError('Nothing came back. Try again.');
  let data;
  try { data = JSON.parse(block.text); } catch { throw new AiError('The answer came back garbled. Try again.'); }
  const n = {};
  for (const k of SUPP_KEYS) {
    const v = +data[FIELDS[k]];
    if (v > 0) n[k] = +v.toPrecision(4);
  }
  const extra = (data.other || []).filter((x) => x.name && +x.amount > 0).map((x) => ({ name: x.name, amount: +x.amount, unit: x.unit }));
  if (!Object.keys(n).length && !extra.length) throw new AiError(data.note || "Couldn't find any amounts on that label. Try a closer, sharper photo of the facts panel.");
  return { name: String(data.name || '').trim(), n, extra, note: data.note || '', cost };
}

// ---- Coach chat ----

const COACH_SCHEMA = {
  type: 'object',
  properties: {
    reply: { type: 'string' },
    meals: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          title: { type: 'string' },
          items: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                food_id: { type: 'integer' },
                grams: { type: 'number' },
                label: { type: 'string' },
              },
              required: ['food_id', 'grams', 'label'],
              additionalProperties: false,
            },
          },
        },
        required: ['title', 'items'],
        additionalProperties: false,
      },
    },
    actions: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          type: { type: 'string', enum: ['set_goal', 'set_pace', 'set_style', 'adjust_calories'] },
          value: { type: 'string' },
          label: { type: 'string' },
        },
        required: ['type', 'value', 'label'],
        additionalProperties: false,
      },
    },
  },
  required: ['reply', 'meals', 'actions'],
  additionalProperties: false,
};

const LOOKUP_TOOL = {
  name: 'look_up_foods',
  description: 'Look up exact nutrition in the USDA FoodData Central database stored in Plate (about 7,800 everyday foods). Returns up to 3 matches per query, each with an id, the full USDA name, calories, protein, carbs, fiber and fat for the grams you ask for, and the household portions USDA lists with their gram weights (use these to convert cups, eggs, cans and scoops to grams). USDA names say whether a food is raw or cooked: pick the form the person will actually weigh or eat, usually cooked. Look up several foods in one call.',
  strict: true,
  input_schema: {
    type: 'object',
    properties: {
      foods: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            query: { type: 'string', description: 'A few plain words, e.g. "chicken breast roasted", "greek yogurt nonfat plain", "ground beef 93 crumbles", "protein powder whey", "rice white long-grain cooked".' },
            grams: { type: 'number', description: 'How many grams to calculate for.' },
          },
          required: ['query', 'grams'],
          additionalProperties: false,
        },
      },
    },
    required: ['foods'],
    additionalProperties: false,
  },
};

const COACH_SYSTEM = `You are the nutrition coach inside Plate, a personal food, water, vitamin and weight tracker. You talk with one person about their eating. Their profile, targets, today's log and weight trend are below, and they are current: rely on them instead of asking for numbers you already have.

Accuracy comes first. People use these numbers to hit exact targets, so a wrong number is worse than no number.
- Never state calories or macros for a food from memory. Look every food up with look_up_foods first and use those numbers. If a food has no good match, say you couldn't find it rather than guessing.
- Always say whether a weight is cooked or raw, and give amounts the way people measure (6 oz cooked, 1 cup, 1 scoop, 3 large eggs) alongside grams.
- For anything about the rest of today, start from "Left for today" in the data. Never describe progress loosely ("most of the way", "nearly there"): give the number that would still be left.
- Check your arithmetic before answering: per-meal splits must add up to the target, and food totals must add up to what you claim.

Suggesting food:
- Put each concrete meal or snack you suggest in "meals": a short title and its items, using the food ids and grams from look_up_foods. The app shows each meal's exact totals and how much of today's target would be left after it, and lets the person log it with one tap.
- In the reply, name the meals and explain the plan briefly. You don't need to repeat every item's numbers, since the meal cards show them. Any number you do write must match the lookups.
- Suggest realistic portions for one sitting (for example up to about 8 oz of cooked meat, not a pound).

How to coach:
- Be direct and practical, like a good coach texting a client. Lead with the answer, then the reason. Use their actual numbers.
- Keep replies short: usually 2 to 5 sentences, or a short list of "- " bullets. Use **bold** sparingly for the key number. No headings, no tables.
- Ground advice in mainstream sports nutrition: a 250 to 500 kcal surplus for building muscle, and judging progress from the weekly weight trend rather than single weigh-ins. Their protein target already accounts for strength training, goal, age and body fat (about 1.6 g per kg for lifters maintaining or gaining, more when cutting, less without lifting, based on lean or adjusted weight for bigger bodies). Explain it from the data rather than quoting a different number.
- When they ask about a diet change such as keto, explain what changes (where calories come from) and what stays the same (calories and protein), and what to expect.
- You are not a doctor. If they mention a medical condition, medication, pregnancy, an eating disorder, or extreme plans (under about 1,200 kcal, fasting for days, losing more than 1% of bodyweight a week), give general guidance and suggest a doctor or registered dietitian.

What Plate can change (offer these in "actions" only when the person would clearly want them):
- set_goal, value one of: cut (lose fat), recomp (lose fat and build muscle together: about 5–10% under maintenance with high protein and lifting; usually best for new lifters with some fat to lose), lean_bulk (build muscle with a small surplus sized to lifting experience), maintain. Calories are scaled to their body, workouts and pace, so don't quote fixed numbers like "-500".
- set_pace, value one of: gentle, steady, faster. For cut: about 0.25, 0.5 or 0.75% of bodyweight a week. For lean_bulk: slower or faster gain.
- set_style, value one of: balanced (30% fat), performance (higher carb, 20% fat), low_carb (about 100 g carbs), keto (25 g net carbs max). Style changes only carbs and fat; calories and protein stay the same. It applies from today on.
- adjust_calories, value a whole number of kcal to add to or subtract from the daily target, such as "150" or "-150". Use steps of 100 to 250.
Each action needs a short button label, such as "Switch to keto" or "Add 150 kcal". Never claim you made a change; the person taps the button. Use empty lists for meals and actions when there are none.

The person's data:
`;

const MAX_STEPS = 6;

// runTool(name, input) -> string. Food lookups run on the phone against the local database.
export async function askCoach({ apiKey, model, history, context, runTool }) {
  const client = await getClient(apiKey);
  const messages = history.map((m) => ({ role: m.role, content: m.text }));
  let cost = null;
  for (let step = 0; step < MAX_STEPS; step++) {
    // Standard endpoint, no server-side fallback: switching models partway through a tool loop isn't safe.
    const msg = await client.messages.create({
      model,
      max_tokens: 16000,
      // Caching: the instructions are the same for every question, and each step of the tool loop
      // resends everything before it. Cached text costs a fraction of the normal price.
      system: [
        { type: 'text', text: COACH_SYSTEM, cache_control: { type: 'ephemeral' } },
        { type: 'text', text: context },
      ],
      cache_control: { type: 'ephemeral' }, // also caches the conversation so far, for the next step
      tools: [LOOKUP_TOOL],
      messages,
      output_config: { effort: 'medium', format: { type: 'json_schema', schema: COACH_SCHEMA } },
    });
    cost = addUsage(cost, msg, model);
    if (msg.stop_reason === 'refusal') throw new AiError("The coach can't help with that one. Try asking another way.");
    if (msg.stop_reason === 'max_tokens') throw new AiError('The answer got cut off. Try a narrower question.');
    if (msg.stop_reason === 'tool_use') {
      messages.push({ role: 'assistant', content: msg.content });
      messages.push({
        role: 'user',
        content: msg.content.filter((b) => b.type === 'tool_use').map((b) => {
          try {
            return { type: 'tool_result', tool_use_id: b.id, content: runTool(b.name, b.input) };
          } catch (err) {
            return { type: 'tool_result', tool_use_id: b.id, content: `Lookup failed: ${err.message}`, is_error: true };
          }
        }),
      });
      continue;
    }
    const block = msg.content.find((b) => b.type === 'text');
    if (!block) throw new AiError('No answer came back. Try again.');
    let data;
    try { data = JSON.parse(block.text); } catch { throw new AiError('The answer came back garbled. Try again.'); }
    return {
      reply: String(data.reply || '').trim(),
      meals: Array.isArray(data.meals) ? data.meals : [],
      actions: Array.isArray(data.actions) ? data.actions : [],
      cost,
    };
  }
  throw new AiError('The coach took too many steps on that one. Try a simpler question.');
}

export const fmtAiCents = (c) => (c < 0.1 ? '<0.1¢' : c < 10 ? `${c.toFixed(1)}¢` : `${Math.round(c)}¢`);

export function aiErrorMessage(err) {
  if (err instanceof AiError) return err.message;
  const status = err?.status;
  const msg = String(err?.message || '');
  if (status === 402) return 'You’re out of coach credit. Add credit to keep using AI.';
  if (status === 401) return globalThis.PLATE_SERVER ? 'Your Plate account wasn’t found. Reopen the app and try again.' : 'That API key was rejected. Check it in Settings.';
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
