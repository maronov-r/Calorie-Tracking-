// Demo of the pay-as-you-go AI coach: fake credit, a pretend checkout and built-in answers.
// Only active on the demo page (demo/index.html sets PLATE_DEMO). No money, no server, no API key.
import { state, setWallet, getTargets, styleOn, totalsFor, toast, dateKey as todayKey } from './store.js';
import { computeTargets, styleFor, goalFor, paceFor, experienceFor, normalizeProfile, STYLES, KG_PER_LB } from './nutrients.js';
import { goalGuide, styleGuide, planWhy, proteinIdeas, calorieCheck, coachLine } from './coach.js';
import { foodByName } from './foods.js';

export const DEMO = !!globalThis.PLATE_DEMO;

export const STARTER_CENTS = 25; // free credit to try the coach
export const LOW_CENTS = 10; // "running low" from here
export const AVG_QUESTION_CENTS = 3.5;
export const STORE_FEE = 0.15; // Apple and Google take from small developers
export const AI_SHARE = 0.56; // of each credit cent, what the AI actually costs the owner

export const PACKS = [
  { value: 500, label: '$5', credit: 500 },
  { value: 1000, label: '$10', credit: 1100 },
  { value: 2000, label: '$20', credit: 2300 },
];

export const fmtMoney = (cents) => `$${(Math.max(0, cents) / 100).toFixed(2)}`;
export const fmtCents = (cents) => (cents < 100 ? `${cents}¢` : fmtMoney(cents));
export function questionsFor(cents) {
  const n = cents / AVG_QUESTION_CENTS;
  return n >= 100 ? Math.round(n / 10) * 10 : Math.max(1, Math.round(n));
}

export function wallet() {
  return state.wallet || { cents: STARTER_CENTS, paid: 0, seenPrivacy: false, log: [{ t: Date.now(), what: 'Free starter credit', cents: STARTER_CENTS }] };
}

const save = (patch, entry) => {
  const w = wallet();
  setWallet({ ...w, ...patch, log: entry ? [entry, ...w.log].slice(0, 50) : w.log });
};

export const markPrivacySeen = () => save({ seenPrivacy: true });

// Take the cost of one answer. The last answer can be cheaper if the balance is nearly empty.
export function charge(cents, what) {
  const taken = Math.min(cents, wallet().cents);
  save({ cents: wallet().cents - taken }, { t: Date.now(), what, cents: -taken });
  return taken;
}

export function addCredit(pack) {
  const w = wallet();
  save({ cents: w.cents + pack.credit, paid: w.paid + pack.value }, { t: Date.now(), what: `Added ${pack.label}${pack.credit > pack.value ? ` (+${fmtMoney(pack.credit - pack.value)} bonus)` : ''}`, cents: pack.credit });
  toast(`Added ${fmtMoney(pack.credit)} of credit`);
}

export const setDemoBalance = (cents) => save({ cents }, { t: Date.now(), what: 'Demo: balance set by hand', cents: cents - wallet().cents });

// Where a top-up goes, from the owner's side.
export function split(pack) {
  const fee = pack.value * STORE_FEE;
  const ai = pack.credit * AI_SHARE;
  return { fee, ai, keep: pack.value - fee - ai };
}

// ---- Built-in answers, so the demo needs no API key ----

const has = (q, re) => re.test(q);

export async function demoReply(question) {
  await new Promise((r) => setTimeout(r, 900 + Math.random() * 700));
  const q = question.toLowerCase();
  const p = state.profile;
  const units = state.settings.units;
  const ov = state.settings.overrides || {};
  const style = styleOn();
  const t = getTargets();
  const out = (paras, extra = {}) => ({ text: paras.filter(Boolean).join('\n\n'), meals: [], actions: [], ...extra });

  const styleAsked = has(q, /keto/) ? 'keto' : has(q, /low.?carb|carbs/) ? 'low_carb' : has(q, /higher carb|more carbs/) ? 'performance' : null;
  if (styleAsked) {
    const st = STYLES.find((x) => x.value === styleAsked);
    const tt = computeTargets(p, ov, styleAsked);
    return out(
      [`**${st.label}** for you: ${tt.carbs} g ${tt.netCarbs ? 'net carbs at most' : 'carbs'}, ${tt.fat} g fat and ${tt.protein} g protein, at ${tt.kcal.toLocaleString('en-US')} kcal.`, ...styleGuide(styleAsked, tt, p.goal)],
      { actions: style === styleAsked ? [] : [{ type: 'set_style', value: styleAsked, label: `Switch to ${st.label.toLowerCase()} from today` }] },
    );
  }

  if (has(q, /protein|eat|tonight|dinner|lunch|breakfast|snack|hungry|meal|food/)) {
    const eaten = Math.round(totalsFor(todayKey()).protein || 0);
    const left = Math.round(t.protein - eaten);
    if (left < 8) return out([`You've had ${eaten} g of protein today, which covers your ${t.protein} g target. Nice work. Anything else today can be about calories and enjoying your food.`]);
    const ideas = proteinIdeas(left, style, todayKey() + state.coach.length); // a different idea each time
    const items = ideas.map((f) => ({ food_id: foodByName(f.usda)?.ref, grams: f.grams, label: f.label })).filter((it) => it.food_id != null);
    return out(
      [`You've had **${eaten} g** of protein today, so **${left} g** to go. Here's a simple way to close most of that gap, with the numbers from Plate's USDA food data:`],
      { meals: items.length ? [{ title: ideas.length > 1 ? 'Two easy wins' : 'One easy win', items }] : [] },
    );
  }

  if (has(q, /how long|how fast|how soon|when will|how many (weeks|months)|timeline/)) return out(timeline(normalizeProfile(p), units));

  const goalAsked = has(q, /recomp|both|lose fat and build|lose fat \+ build/) ? 'recomp'
    : has(q, /bulk|build muscle|gain|bigger/) ? 'lean_bulk'
    : has(q, /lose|losing|loss|cut|lean out|shred|slim/) ? 'cut'
    : has(q, /maintain/) ? 'maintain' : null;
  if (goalAsked) {
    const tt = computeTargets({ ...p, goal: goalAsked, adjust: goalAsked === p.goal ? p.adjust : 0 }, ov, style);
    const g = goalFor(goalAsked);
    return out(
      [`**${g.label}** for you means about ${tt.kcal.toLocaleString('en-US')} kcal and ${tt.protein} g protein a day.`, ...goalGuide(goalAsked, tt, units)],
      { actions: p.goal === goalAsked ? [] : [{ type: 'set_goal', value: goalAsked, label: `Switch my goal to ${g.label.toLowerCase()}` }] },
    );
  }

  if (has(q, /pace|trend|scale|weigh|progress|working|on track/)) {
    const check = calorieCheck();
    return out([check ? check.text : coachLine()], check ? { actions: [{ type: 'adjust_calories', value: check.delta, label: `${check.delta > 0 ? 'Add' : 'Cut'} ${Math.abs(check.delta)} kcal a day` }] } : {});
  }

  if (has(q, /plan|calorie|why|target|number|how much/)) {
    return out([`Your plan is **${t.kcal.toLocaleString('en-US')} kcal** with **${t.protein} g protein**, eating ${styleFor(style).label.toLowerCase()}.`, planWhy(p, t, units).map((x) => `- ${x}`).join('\n')]);
  }

  return out([
    coachLine(),
    'In this demo I answer from Plate\'s built-in guide, so try asking about **protein**, **keto or low carb**, **bulking or losing fat**, **your pace** or **your plan**. The real coach can answer any question.',
  ]);
}

// How long a goal takes, from the healthy weekly pace for this person.
function timeline(p, units) {
  const g = goalFor(p.goal);
  const metric = units === 'metric';
  const unit = metric ? 'kg' : 'lb';
  const amt = metric ? 5 : 10;
  // The weekly change the chosen pace aims for: % of bodyweight when losing, experience-based when gaining.
  const kgWeek = g.value === 'cut' ? p.weightKg * paceFor(p.pace).cut / 100
    : g.value === 'lean_bulk' ? p.weightKg * experienceFor(p.experience).gainPct * paceFor(p.pace).gain / 100 / 4.33 : 0;
  if (kgWeek > 0 && !(p.pregnant && g.dir < 0)) {
    const rate = metric ? kgWeek : kgWeek / KG_PER_LB;
    const weeks = (n) => Math.round(n / rate);
    return [
      `At your ${paceFor(p.pace).label.toLowerCase()} pace you'd ${g.dir < 0 ? 'lose' : 'gain'} about **${rate.toFixed(1)} ${unit} a week**. So ${amt} ${unit} takes about **${weeks(amt)} weeks**, and ${amt * 2} ${unit} about ${weeks(amt * 2)} weeks.`,
      g.dir < 0
        ? 'The first week or two often drops faster because of water, then it settles. Real weeks bounce around, so judge by your trend after two weeks of weigh-ins.'
        : 'Gaining faster than that is mostly fat. Judge by your trend after two weeks of weigh-ins.',
    ];
  }
  if (g.value === 'recomp') {
    return [
      'When you lose fat and build muscle together, the scale is a slow clock: muscle added hides some of the fat lost.',
      'Most beginners lifting 3 times a week and hitting protein get noticeably stronger in the first month and see a clear change in the mirror and their waist in **8 to 12 weeks**. Take a photo and a waist measurement now so you can compare.',
    ];
  }
  return ['On maintain there’s no finish line: your weight holds steady while you get stronger. Most people notice strength gains within a few weeks of regular lifting.'];
}

// What one demo answer costs: a little more when it looks foods up.
export const replyCost = (res) => 3 + (res.meals?.length ? 1 : 0);
