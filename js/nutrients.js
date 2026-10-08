// Nutrient definitions, daily targets (USDA/NIH Dietary Reference Intakes) and helpers.

export const NUTRIENTS = [
  { key: 'kcal', name: 'Calories', unit: 'kcal' },
  { key: 'protein', name: 'Protein', unit: 'g', group: 'macros' },
  { key: 'carbs', name: 'Carbs', unit: 'g', group: 'macros' },
  { key: 'fat', name: 'Fat', unit: 'g', group: 'macros' },
  { key: 'fiber', name: 'Fiber', unit: 'g', group: 'macros' },
  { key: 'sugar', name: 'Sugar', unit: 'g', group: 'macros', info: true },
  { key: 'satfat', name: 'Saturated fat', unit: 'g', group: 'macros', limit: true },
  { key: 'sodium', name: 'Sodium', unit: 'mg', group: 'macros', limit: true },
  { key: 'vitA', name: 'Vitamin A', sym: 'A', unit: 'µg', group: 'vitamins' },
  { key: 'vitC', name: 'Vitamin C', sym: 'C', unit: 'mg', group: 'vitamins' },
  { key: 'vitD', name: 'Vitamin D', sym: 'D', unit: 'µg', group: 'vitamins' },
  { key: 'vitE', name: 'Vitamin E', sym: 'E', unit: 'mg', group: 'vitamins' },
  { key: 'vitK', name: 'Vitamin K', sym: 'K', unit: 'µg', group: 'vitamins' },
  { key: 'b1', name: 'Thiamin (B1)', sym: 'B1', unit: 'mg', group: 'vitamins' },
  { key: 'b2', name: 'Riboflavin (B2)', sym: 'B2', unit: 'mg', group: 'vitamins' },
  { key: 'b3', name: 'Niacin (B3)', sym: 'B3', unit: 'mg', group: 'vitamins' },
  { key: 'b5', name: 'Pantothenic acid (B5)', sym: 'B5', unit: 'mg', group: 'vitamins' },
  { key: 'b6', name: 'Vitamin B6', sym: 'B6', unit: 'mg', group: 'vitamins' },
  { key: 'folate', name: 'Folate (B9)', sym: 'B9', unit: 'µg', group: 'vitamins' },
  { key: 'b12', name: 'Vitamin B12', sym: 'B12', unit: 'µg', group: 'vitamins' },
  { key: 'calcium', name: 'Calcium', sym: 'Ca', unit: 'mg', group: 'minerals' },
  { key: 'iron', name: 'Iron', sym: 'Fe', unit: 'mg', group: 'minerals' },
  { key: 'magnesium', name: 'Magnesium', sym: 'Mg', unit: 'mg', group: 'minerals' },
  { key: 'potassium', name: 'Potassium', sym: 'K', unit: 'mg', group: 'minerals' },
  { key: 'zinc', name: 'Zinc', sym: 'Zn', unit: 'mg', group: 'minerals' },
  { key: 'selenium', name: 'Selenium', sym: 'Se', unit: 'µg', group: 'minerals' },
];

export const N = Object.fromEntries(NUTRIENTS.map((n) => [n.key, n]));
export const MICROS = NUTRIENTS.filter((n) => n.group === 'vitamins' || n.group === 'minerals');
export const VITAMINS = NUTRIENTS.filter((n) => n.group === 'vitamins');
export const MINERALS = NUTRIENTS.filter((n) => n.group === 'minerals');
export const MACROS = NUTRIENTS.filter((n) => n.group === 'macros');

// RDA / AI values by age band: [14–18, 19–30, 31–50, 51–70, 71+]
const DRI = {
  male: {
    vitA: 900, vitC: [75, 90, 90, 90, 90], vitD: [15, 15, 15, 15, 20], vitE: 15, vitK: [75, 120, 120, 120, 120],
    b1: 1.2, b2: 1.3, b3: 16, b5: 5, b6: [1.3, 1.3, 1.3, 1.7, 1.7], folate: 400, b12: 2.4,
    calcium: [1300, 1000, 1000, 1000, 1200], iron: [11, 8, 8, 8, 8], magnesium: [410, 400, 420, 420, 420],
    potassium: [3000, 3400, 3400, 3400, 3400], zinc: 11, selenium: 55,
  },
  female: {
    vitA: 700, vitC: [65, 75, 75, 75, 75], vitD: [15, 15, 15, 15, 20], vitE: 15, vitK: [75, 90, 90, 90, 90],
    b1: [1.0, 1.1, 1.1, 1.1, 1.1], b2: [1.0, 1.1, 1.1, 1.1, 1.1], b3: 14, b5: 5, b6: [1.2, 1.3, 1.3, 1.5, 1.5], folate: 400, b12: 2.4,
    calcium: [1300, 1000, 1000, 1200, 1200], iron: [15, 18, 18, 8, 8], magnesium: [360, 310, 320, 320, 320],
    potassium: [2300, 2600, 2600, 2600, 2600], zinc: [9, 8, 8, 8, 8], selenium: 55,
  },
};

// Tolerable upper intake levels (adults) — only for nutrients where too much is a real concern.
export const UPPER = { vitA: 3000, vitC: 2000, vitD: 100, b6: 100, calcium: 2500, iron: 45, zinc: 40, selenium: 400 };

const band = (age) => (age < 19 ? 0 : age < 31 ? 1 : age < 51 ? 2 : age < 71 ? 3 : 4);

// ---- Your plan: what it's built from ----

// Daily life outside workouts. It multiplies resting burn (Mifflin–St Jeor); workouts are added on top.
export const DAILY = [
  { value: 'sitting', label: 'Mostly sitting', hint: 'Desk job or school, under about 5,000 steps', factor: 1.2 },
  { value: 'some', label: 'On my feet some', hint: 'Errands and walking, about 5,000–10,000 steps', factor: 1.35 },
  { value: 'lot', label: 'On my feet a lot', hint: 'Retail, teaching, nursing, 10,000+ steps', factor: 1.5 },
  { value: 'physical', label: 'Physical job', hint: 'Construction, warehouse, farm work', factor: 1.7 },
];

// Typical workout intensity in METs (Compendium of Physical Activities).
export const WORKOUT_TYPES = [
  { value: 'weights', label: 'Weights', hint: 'Strength training', met: 5 },
  { value: 'both', label: 'Weights + cardio', hint: 'Lifting plus runs, rides or classes', met: 6 },
  { value: 'cardio', label: 'Cardio', hint: 'Running, cycling, swimming, classes', met: 7 },
  { value: 'sports', label: 'Sports', hint: 'Basketball, soccer, martial arts', met: 7 },
];
export const WORKOUT_MINUTES = [30, 45, 60, 90];

// gainPct: realistic weight gain while building muscle, % of bodyweight per month. New lifters grow fastest.
export const EXPERIENCE = [
  { value: 'new', label: 'New, or haven’t started yet', hint: 'Your fastest gains are ahead of you', gainPct: 1.25 },
  { value: 'under1', label: 'Less than a year', hint: 'Still gaining quickly', gainPct: 1 },
  { value: 'mid', label: '1 to 3 years', hint: 'Steady, slower gains', gainPct: 0.6 },
  { value: 'long', label: '3 years or more', hint: 'Small gains take patience', gainPct: 0.35 },
];

// dir: -1 losing, 0 holding, +1 gaining. focus: what Today shows next to calories by default.
export const GOALS = [
  { value: 'cut', label: 'Lose fat', hint: 'Lift to keep your muscle while the fat comes off', dir: -1, focus: 'fat' },
  { value: 'recomp', label: 'Lose fat + build muscle', hint: 'A small deficit, high protein and regular lifting', dir: -1, focus: 'protein' },
  { value: 'lean_bulk', label: 'Build muscle', hint: 'A small surplus so you have material to grow', dir: 1, focus: 'protein' },
  { value: 'maintain', label: 'Maintain', hint: 'Stay at your weight and get stronger', dir: 0, focus: 'protein' },
];

// cut: % of bodyweight lost per week. gain: multiplier on the experience-based gain rate.
export const PACES = [
  { value: 'gentle', label: 'Gentle', cut: 0.25, gain: 0.6 },
  { value: 'steady', label: 'Steady', cut: 0.5, gain: 1 },
  { value: 'faster', label: 'Faster', cut: 0.75, gain: 1.5 },
];

export const DIETS = [
  { value: 'vegetarian', label: 'Vegetarian' },
  { value: 'vegan', label: 'Vegan' },
  { value: 'pescatarian', label: 'Pescatarian' },
  { value: 'dairy_free', label: 'Dairy-free' },
  { value: 'gluten_free', label: 'Gluten-free' },
];

const LEGACY_GOALS = { lose1: 'cut', lose05: 'cut', cut_slow: 'cut', gain05: 'lean_bulk', gain1: 'lean_bulk', bulk: 'lean_bulk' };
export const goalFor = (value) => GOALS.find((g) => g.value === (LEGACY_GOALS[value] || value)) || GOALS[3];
export const isGaining = (value) => goalFor(value).dir > 0;
export const paceFor = (value) => PACES.find((x) => x.value === value) || PACES[1];
export const dailyFor = (value) => DAILY.find((x) => x.value === value) || DAILY[0];
export const workoutTypeFor = (value) => WORKOUT_TYPES.find((x) => x.value === value) || WORKOUT_TYPES[0];
export const experienceFor = (value) => EXPERIENCE.find((x) => x.value === value) || EXPERIENCE[1];

// Profiles saved before the plan builder (one "activity" level plus a lifting answer) mapped onto the new answers.
const OLD_ACTIVITY = { sedentary: ['sitting', 0], light: ['sitting', 2], moderate: ['some', 4], very: ['some', 6], athlete: ['lot', 6] };
export function normalizeProfile(p) {
  if (!p) return p;
  const out = { ...p };
  if (p.goal === 'cut_slow' || p.goal === 'lose05') out.pace = out.pace || 'gentle';
  if (p.goal === 'bulk' || p.goal === 'gain1') out.pace = out.pace || 'faster';
  out.goal = goalFor(p.goal).value;
  if (!out.daily) {
    const [daily, perWeek] = OLD_ACTIVITY[p.activity] || ['sitting', 2];
    const type = p.training === 'none' ? 'cardio' : p.training === 'some' ? 'both' : 'weights';
    out.daily = daily;
    out.workouts = out.workouts || { perWeek: p.training === 'lift' ? Math.max(perWeek, 2) : perWeek, type, minutes: 60 };
  }
  out.workouts = { perWeek: 0, type: 'weights', minutes: 60, ...(out.workouts || {}) };
  out.experience = out.experience || 'under1';
  out.pace = out.pace || 'steady';
  return out;
}

// ---- Calories ----

const round = (v, step = 1) => Math.round(v / step) * step;

export function energyOf(p) {
  const { sex = 'female', age = 30, heightCm = 170, weightKg = 70 } = p;
  const bmr = 10 * weightKg + 6.25 * heightCm - 5 * age + (sex === 'male' ? 5 : -161);
  const factor = dailyFor(p.daily).factor;
  const w = p.workouts || {};
  const met = workoutTypeFor(w.type).met;
  // Net of what you'd burn resting anyway (MET − 1), averaged over the week.
  const workout = ((+w.perWeek || 0) * (met - 1) * weightKg * ((+w.minutes || 60) / 60)) / 7;
  return { bmr, factor, base: bmr * factor, workout, tdee: bmr * factor + workout };
}

// How much body fat there is to lose, from body fat % when known, otherwise BMI.
export function fatLevel(p) {
  const male = p.sex === 'male';
  const bf = p.bodyFat >= 3 && p.bodyFat <= 60 ? p.bodyFat : null;
  const h = (p.heightCm || 170) / 100;
  const bmi = (p.weightKg || 70) / (h * h);
  if (bf != null) return bf >= (male ? 25 : 35) ? 'high' : bf >= (male ? 18 : 28) ? 'some' : bf < (male ? 12 : 20) ? 'lean' : 'normal';
  return bmi >= 30 ? 'high' : bmi >= 25 ? 'some' : bmi < 22 ? 'lean' : 'normal';
}

// Daily calories added (+) or removed (−) for the goal, scaled to the person rather than a fixed number.
export function goalAdjust(p, tdee) {
  const g = goalFor(p.goal);
  const pace = paceFor(p.pace);
  const w = p.weightKg || 70;
  if (p.pregnant && g.dir < 0) return 0; // never a deficit while pregnant or breastfeeding
  if (g.value === 'cut') {
    const pct = p.age < 18 ? Math.min(pace.cut, 0.25) : pace.cut;
    return -Math.min((w * (pct / 100) * 7700) / 7, tdee * 0.25); // ~7,700 kcal per kg of fat; deficit capped at 25%
  }
  if (g.value === 'recomp') return -tdee * (['high', 'some'].includes(fatLevel(p)) ? 0.1 : 0.05);
  if (g.value === 'lean_bulk') {
    const kgPerWeek = (w * (experienceFor(p.experience).gainPct / 100) * pace.gain) / 4.33;
    return Math.min(500, Math.max(100, (kgPerWeek * 7700) / 7));
  }
  return 0;
}

// Healthy weekly weight change for the plan, in kg [low, high]. Used to judge the weight trend.
export function goalPace(pIn) {
  const p = normalizeProfile(pIn);
  const w = p.weightKg || 70;
  const g = goalFor(p.goal);
  if (p.pregnant) return null;
  if (g.value === 'cut') {
    const t = (w * (p.age < 18 ? Math.min(paceFor(p.pace).cut, 0.25) : paceFor(p.pace).cut)) / 100;
    return [-1.5 * t, -0.5 * t];
  }
  if (g.value === 'recomp') return [-0.0035 * w, 0.0005 * w];
  if (g.value === 'lean_bulk') {
    const t = (w * (experienceFor(p.experience).gainPct / 100) * paceFor(p.pace).gain) / 4.33;
    return [0.5 * t, 1.5 * t];
  }
  return [-0.002 * w, 0.002 * w];
}

// A goal suggestion with the reason, for "Recommend for me".
export function recommendGoal(pIn) {
  const p = normalizeProfile(pIn);
  const lifts = trainingFor(p) !== 'none' && ['weights', 'both'].includes(p.workouts.type);
  const newish = ['new', 'under1'].includes(p.experience);
  const level = fatLevel(p);
  const guessed = !(p.bodyFat >= 3);
  if (p.pregnant) return { goal: 'maintain', why: 'While pregnant or breastfeeding, Plate doesn’t set a calorie deficit. Your doctor or midwife can tell you how much extra to eat.' };
  if (level === 'high') {
    return { goal: 'cut', why: lifts
      ? 'You have more fat to lose than muscle to gain right now, so losing fat comes first. Lifting while you do keeps your muscle, and newer lifters often build some along the way.'
      : 'You have more fat to lose than muscle to gain right now, so losing fat comes first. Adding 2–3 strength workouts a week makes sure the weight you lose is fat, not muscle.' };
  }
  if (level === 'some' && (p.age || 30) >= 65) {
    return { goal: lifts ? 'recomp' : 'maintain', why: lifts
      ? 'At your age, keeping muscle matters more than the number on the scale. A small deficit with plenty of protein and regular lifting trims fat while protecting strength.'
      : 'At your age, keeping muscle matters more than losing a few pounds. Holding steady, eating enough protein and adding 2–3 strength sessions a week does the most for your health.' };
  }
  if (level === 'some') {
    if (lifts && newish) return { goal: 'recomp', why: 'New lifters with some fat to lose can build muscle and lose fat at the same time. A small deficit, high protein and regular lifting does both.' };
    if (lifts) return { goal: 'recomp', why: `A slow lean-out while you keep lifting lets you lose fat without giving up muscle.${guessed ? ' Height and weight can’t tell muscle from fat, so add your body fat % for a sharper suggestion.' : ''}` };
    return { goal: 'cut', why: 'Losing some fat is the most useful goal at your size. Adding strength workouts would protect your muscle while you do.' };
  }
  if (lifts && level === 'lean') return { goal: 'lean_bulk', why: 'You’re lean, so a small calorie surplus gives your body what it needs to build muscle without much fat gain.' };
  if (lifts && newish) return { goal: 'recomp', why: 'You’re at a healthy weight and new to lifting, so you can build muscle while eating close to maintenance and staying lean.' };
  if (lifts) return { goal: 'lean_bulk', why: 'You’re at a healthy weight with training behind you, so a small surplus is the most efficient way to keep adding muscle.' };
  return { goal: 'maintain', why: 'You’re at a healthy weight. Holding steady while eating well is a great goal, and adding strength training would let you build muscle too.' };
}

// ---- Protein ----

// Weights twice a week or more counts as lifting; that's what makes extra protein pay off.
export function trainingFor(pIn) {
  const w = pIn?.workouts || normalizeProfile(pIn || {}).workouts;
  const n = +w.perWeek || 0;
  const lifts = w.type === 'weights' || w.type === 'both' ? n : 0;
  if (lifts >= 2) return 'lift';
  if (lifts === 1 || n >= 2) return 'some';
  return 'none';
}

// Grams per kg of reference weight (below), by training and goal. From the research:
// - Lifting while maintaining or gaining: ~1.6 g/kg is where extra protein stops adding muscle
//   (Morton et al. 2018, 49 trials). A calorie surplus doesn't raise that.
// - Lifting while losing fat: as much or more, since protein protects muscle in a deficit
//   (ISSN 2017: 1.4–2.0 g/kg for most, more for lean dieting lifters).
// - Not lifting: 1.2–1.6 g/kg while losing weight preserves lean mass (AJCN 2015 review);
//   about 1.0 at maintenance, above the 0.8 RDA minimum.
const PROTEIN = {
  lift: { cut: 2.0, recomp: 2.0, maintain: 1.6, lean_bulk: 1.6 },
  some: { cut: 1.6, recomp: 1.6, maintain: 1.3, lean_bulk: 1.5 },
  none: { cut: 1.4, recomp: 1.4, maintain: 1.0, lean_bulk: 1.2 },
};

// Body fat doesn't need protein, so multiplying total weight overestimates for bigger bodies.
// - Body fat % known: lean mass scaled to a typical healthy body fat (15% men, 25% women), never above actual weight.
// - Otherwise, above a BMI of 25: adjusted weight = BMI-25 weight + 25% of the rest (clinical practice).
export function proteinBasis(profile) {
  const { weightKg = 70, heightCm = 170, sex = 'female', bodyFat } = profile || {};
  if (bodyFat >= 3 && bodyFat <= 60) {
    const lean = weightKg * (1 - bodyFat / 100);
    return { kg: Math.min(weightKg, lean / (sex === 'male' ? 0.85 : 0.75)), how: 'bodyfat', lean };
  }
  const h = heightCm / 100;
  const healthy = 25 * h * h;
  if (weightKg > healthy) return { kg: healthy + 0.25 * (weightKg - healthy), how: 'adjusted', healthy };
  return { kg: weightKg, how: 'weight' };
}

export function proteinPerKg(pIn) {
  const p = normalizeProfile(pIn || {});
  let per = PROTEIN[trainingFor(p)][goalFor(p.goal).value];
  if (p.proteinPref === 'higher') per = Math.min(2.2, +(per + 0.2).toFixed(1)); // top of the researched range
  if (p.pregnant) per = Math.max(per, 1.1); // pregnancy and breastfeeding RDA
  if ((p.age || 30) >= 65) per = Math.max(per, 1.2); // PROT-AGE: older adults need at least 1.0–1.2
  return per;
}

// ---- What to put front and center on Today ----

export const FOCUS = [
  { value: 'protein', label: 'Protein' },
  { value: 'fat', label: 'Fat' },
  { value: 'carbs', label: 'Carbs' },
];
const MACRO_NAMES = { protein: 'Protein', carbs: 'Carbs', fat: 'Fat' };

// Your own pick, or what fits the plan: carbs on keto and low carb, otherwise the goal's default.
export function focusFor(profile, t) {
  if (profile?.focus) return profile.focus;
  if (t.style === 'keto' || t.style === 'low_carb') return 'carbs';
  return goalFor(profile?.goal).focus;
}

// 'min': a target to reach. 'max': a limit to stay under.
export function directionOf(key, goalValue, t) {
  const dir = goalFor(goalValue).dir;
  if (key === 'kcal') return dir > 0 ? 'min' : 'max';
  if (key === 'carbs') return t.style === 'keto' || t.style === 'low_carb' || dir < 0 ? 'max' : 'min';
  if (key === 'fat') return dir < 0 && t.style !== 'keto' && t.style !== 'low_carb' ? 'max' : 'min';
  return 'min';
}

export const macroLabel = (key, t) => (key === 'carbs' && t.netCarbs ? 'Net carbs' : MACRO_NAMES[key]);
export const macroValue = (key, totals, t) => (key === 'carbs' && t.netCarbs
  ? Math.max(0, (totals.carbs || 0) - (totals.fiber || 0))
  : totals[key] || 0);

// Whether a day met a macro: reached for targets, stayed under for limits.
export function dayMet(key, totals, t, dir) {
  const v = macroValue(key, totals, t);
  return dir === 'max' ? v <= t[key] : v >= t[key];
}


// How the calories left after protein are split between carbs and fat. Calories and protein never change with style.
export const STYLES = [
  { value: 'balanced', label: 'Balanced', hint: 'A normal mix of carbs and fat' },
  { value: 'performance', label: 'Higher carb', hint: 'More fuel for hard training, less fat' },
  { value: 'low_carb', label: 'Low carb', hint: 'About 100 g of carbs, more fat' },
  { value: 'keto', label: 'Keto', hint: 'Under 25 g net carbs, mostly fat' },
];
export const styleFor = (value) => STYLES.find((s) => s.value === value) || STYLES[0];
export const KETO_NET_CARBS = 25;

// adjust (on the profile): calories the coach added or removed after checking your weight trend.
export function computeTargets(profileIn, overrides = {}, style = 'balanced') {
  const profile = normalizeProfile(profileIn || {});
  const { sex = 'female', age = 30, weightKg = 70, adjust = 0 } = profile;
  const e = energyOf(profile);
  const delta = goalAdjust(profile, e.tdee);
  const floor = sex === 'male' ? 1500 : 1200;
  const tdee = round(e.tdee, 10);
  const autoKcal = Math.max(floor, round(e.tdee + delta + adjust, 10));
  const kcal = overrides.kcal || autoKcal;

  const basis = proteinBasis(profile);
  const perKg = proteinPerKg(profile);
  const protein = overrides.protein || round(basis.kg * perKg);
  const st = styleFor(style).value;
  let fat;
  let carbs;
  if (st === 'keto' || st === 'low_carb') {
    carbs = overrides.carbs || (st === 'keto' ? KETO_NET_CARBS : Math.min(125, Math.max(75, round((kcal * 0.13) / 4, 5))));
    fat = overrides.fat || Math.max(40, round((kcal - protein * 4 - carbs * 4) / 9));
  } else {
    fat = overrides.fat || round((kcal * (st === 'performance' ? 0.2 : 0.3)) / 9);
    carbs = overrides.carbs || Math.max(50, round((kcal - protein * 4 - fat * 9) / 4));
  }
  const water = overrides.water || Math.min(4000, Math.max(2000, round(weightKg * 35, 250)));

  const t = {
    kcal, protein, carbs, fat, water,
    style: st,
    netCarbs: st === 'keto', // on keto the carb target is a ceiling on carbs minus fiber
    fiber: round((kcal / 1000) * 14),
    satfat: round((kcal * 0.1) / 9),
    sodium: 2300,
    sugar: 0,
    auto: {
      kcal: autoKcal, bmr: Math.round(e.bmr), tdee, factor: e.factor, base: round(e.base, 10), workout: round(e.workout, 10),
      delta: autoKcal - tdee - adjust, adjust, protein: { ...basis, perKg }, // the goal's real effect after floors and rounding
    },
  };
  const table = DRI[sex === 'male' ? 'male' : 'female'];
  const b = band(age);
  for (const n of MICROS) {
    const v = table[n.key];
    t[n.key] = Array.isArray(v) ? v[b] : v;
  }
  return t;
}

export const ageBand = (age) => ['14–18', '19–30', '31–50', '51–70', '71+'][band(age)];

// ---- Math on nutrient maps ----

export function addInto(target, n, mult = 1) {
  if (!n) return target;
  for (const k in n) target[k] = (target[k] || 0) + n[k] * mult;
  return target;
}

export function scale(n, mult) {
  const out = {};
  for (const k in n) {
    const v = n[k] * mult;
    if (v) out[k] = +v.toPrecision(4);
  }
  return out;
}

export const entryNutrients = (e) => scale(e.pu, e.amount);

export function dayTotals(day, supplements = []) {
  const t = {};
  if (!day) return t;
  for (const e of day.entries || []) addInto(t, e.pu, e.amount);
  for (const id of day.supps || []) {
    const s = supplements.find((x) => x.id === id);
    if (s) addInto(t, s.n);
  }
  return t;
}

// Status of a nutrient against its target: 'none' | 'low' | 'mid' | 'good' | 'over'
export function status(key, value, target) {
  const def = N[key];
  if (!target || def?.info) return 'none';
  const pct = value / target;
  if (def?.limit) return pct > 1 ? 'over' : 'good';
  if (UPPER[key] && value > UPPER[key]) return 'over';
  if (pct >= 1) return 'good';
  if (pct >= 0.5) return 'mid';
  return 'low';
}

// ---- Formatting ----

export function fmtNum(v) {
  if (v == null || isNaN(v)) return '0';
  const a = Math.abs(v);
  if (a >= 1000) return Math.round(v).toLocaleString('en-US');
  if (a >= 20 || a === 0) return String(Math.round(v));
  if (a >= 1) return String(+v.toFixed(1));
  if (a >= 0.01) return String(+v.toFixed(2));
  return '0';
}

export const fmtKcal = (v) => Math.round(v || 0).toLocaleString('en-US');

export function fmtQty(q) {
  const whole = Math.floor(q);
  const frac = +(q - whole).toFixed(2);
  const map = { 0.25: '¼', 0.5: '½', 0.75: '¾', 0.33: '⅓', 0.67: '⅔' };
  if (frac === 0) return String(whole);
  if (map[frac]) return (whole ? whole : '') + map[frac];
  return String(+q.toFixed(2));
}

export const KG_PER_LB = 0.45359237;
export const weightUnit = (units) => (units === 'metric' ? 'kg' : 'lb');
export const kgToDisplay = (kg, units) => (units === 'metric' ? kg : kg / KG_PER_LB);
export const displayToKg = (v, units) => (units === 'metric' ? v : v * KG_PER_LB);
export const fmtWeight = (kg, units) => `${kgToDisplay(kg, units).toFixed(1)} ${weightUnit(units)}`;

export const ML_PER_OZ = 29.5735;
export const fmtWater = (ml, units) => (units === 'metric' ? `${+(ml / 1000).toFixed(2)} L` : `${Math.round(ml / ML_PER_OZ)} oz`);

// ---- Plain-language guidance for each nutrient ----

const S = (label, q) => ({ label, q: q || label });
export const INFO = {
  kcal: { why: 'The energy in your food. Your target is set from your body, activity and goal.' },
  protein: { why: 'Builds and repairs muscle and keeps you full between meals.', sources: [S('Chicken breast'), S('Greek yogurt', 'yogurt greek'), S('Eggs'), S('Tuna'), S('Lentils'), S('Tofu')] },
  carbs: { why: "Your body's main fuel, especially for exercise and your brain.", sources: [S('Oats'), S('Rice'), S('Potatoes'), S('Bananas'), S('Whole wheat bread', 'bread whole wheat'), S('Black beans')] },
  fat: { why: 'Needed to absorb vitamins A, D, E and K and to make hormones.', sources: [S('Avocado'), S('Olive oil', 'oil olive'), S('Almonds'), S('Salmon'), S('Peanut butter'), S('Chia seeds', 'seeds chia')] },
  fiber: { why: 'Keeps digestion regular, steadies energy and helps you feel full.', sources: [S('Lentils'), S('Black beans'), S('Raspberries'), S('Chia seeds', 'seeds chia'), S('Oats'), S('Pears')] },
  sugar: { why: 'Total sugars, including the natural sugar in fruit and milk. There is no daily target. Added sugar is the part worth keeping low.' },
  satfat: { why: 'Best kept under about 10% of your calories for heart health.', tip: 'Mostly comes from butter, cheese, fatty meats, coconut oil and pastries.' },
  sodium: { why: 'Keep it under 2,300 mg a day. Most of it comes from packaged and restaurant food, not the salt shaker.' },
  vitA: { why: 'Supports vision, immune function and healthy skin.', sources: [S('Sweet potato'), S('Carrots'), S('Spinach'), S('Kale'), S('Cantaloupe'), S('Eggs')] },
  vitC: { why: 'Supports your immune system and skin repair, and helps you absorb iron.', sources: [S('Bell peppers', 'peppers sweet red raw'), S('Oranges'), S('Kiwi'), S('Strawberries'), S('Broccoli'), S('Brussels sprouts')] },
  vitD: { why: 'Supports bone strength, muscles and immune function.', sources: [S('Salmon'), S('Sardines'), S('Trout'), S('Egg yolk'), S('Fortified milk', 'milk vitamin d'), S('Mushrooms')], tip: 'Very few foods have much vitamin D. Sunlight and a D3 supplement are the usual ways to close the gap.' },
  vitE: { why: 'An antioxidant that protects your cells from damage.', sources: [S('Almonds'), S('Sunflower seeds', 'seeds sunflower'), S('Hazelnuts'), S('Avocado'), S('Spinach'), S('Peanut butter')] },
  vitK: { why: 'Helps your blood clot normally and supports bone health.', sources: [S('Kale'), S('Spinach'), S('Broccoli'), S('Brussels sprouts'), S('Cabbage'), S('Green beans', 'beans snap green')] },
  b1: { why: 'Turns food into energy and supports your nerves.', sources: [S('Pork'), S('Black beans'), S('Sunflower seeds', 'seeds sunflower'), S('Brown rice', 'rice brown'), S('Green peas', 'peas green'), S('Whole wheat bread', 'bread whole wheat')] },
  b2: { why: 'Helps make energy and keeps skin and eyes healthy.', sources: [S('Milk'), S('Yogurt'), S('Eggs'), S('Almonds'), S('Mushrooms'), S('Beef')] },
  b3: { why: 'Supports energy metabolism and your nervous system.', sources: [S('Chicken breast'), S('Tuna'), S('Turkey'), S('Salmon'), S('Peanuts'), S('Brown rice', 'rice brown')] },
  b5: { why: 'Helps your body make energy and hormones.', sources: [S('Chicken'), S('Beef'), S('Avocado'), S('Mushrooms'), S('Eggs'), S('Sunflower seeds', 'seeds sunflower')] },
  b6: { why: 'Supports protein metabolism, mood and immune function.', sources: [S('Chickpeas'), S('Salmon'), S('Chicken breast'), S('Potatoes'), S('Bananas'), S('Tuna')] },
  folate: { why: 'Helps make new cells and DNA, and matters most before and during pregnancy.', sources: [S('Lentils'), S('Spinach'), S('Asparagus'), S('Black-eyed peas', 'cowpeas'), S('Avocado'), S('Broccoli')] },
  b12: { why: 'Keeps your nerves and red blood cells healthy.', sources: [S('Clams'), S('Beef'), S('Salmon'), S('Tuna'), S('Eggs'), S('Milk')], tip: 'B12 is found almost only in animal foods. If you eat mostly plants, a supplement or fortified foods are the reliable route.' },
  calcium: { why: 'Builds bones and teeth and helps muscles and nerves work.', sources: [S('Yogurt'), S('Milk'), S('Cheese'), S('Sardines'), S('Tofu'), S('Kale')] },
  iron: { why: 'Carries oxygen in your blood. Low iron is a common cause of tiredness.', sources: [S('Beef'), S('Lentils'), S('Spinach'), S('Tofu'), S('Kidney beans', 'beans kidney'), S('Pumpkin seeds', 'seeds pumpkin')], tip: 'Eat plant sources with vitamin C (peppers, citrus) to absorb more iron.' },
  magnesium: { why: 'Supports muscles, nerves, sleep and energy.', sources: [S('Pumpkin seeds', 'seeds pumpkin'), S('Almonds'), S('Spinach'), S('Black beans'), S('Dark chocolate', 'chocolate dark'), S('Cashews')] },
  potassium: { why: 'Helps control blood pressure, heart rhythm and muscle function.', sources: [S('Potatoes'), S('Bananas'), S('White beans', 'beans white'), S('Avocado'), S('Yogurt'), S('Spinach')], tip: 'Most people fall short on potassium. Potatoes and beans have more than bananas.' },
  zinc: { why: 'Supports immunity, wound healing, taste and smell.', sources: [S('Oysters'), S('Beef'), S('Pumpkin seeds', 'seeds pumpkin'), S('Chickpeas'), S('Cashews'), S('Yogurt')] },
  selenium: { why: 'An antioxidant that supports your thyroid.', sources: [S('Brazil nuts', 'brazilnuts'), S('Tuna'), S('Sardines'), S('Eggs'), S('Chicken'), S('Turkey')], tip: 'One or two Brazil nuts cover a whole day.' },
};

// What a supplement can count toward: every tracked vitamin and mineral, plus sodium for electrolytes.
export const SUPP_FIELDS = [...MICROS, N.sodium];

// extra: ingredients without a daily target. They're totaled per day but not scored.
export const SUPP_PRESETS = [
  { name: 'Multivitamin', n: { vitA: 900, vitC: 90, vitD: 25, vitE: 15, vitK: 80, b1: 1.2, b2: 1.3, b3: 16, b5: 5, b6: 1.7, folate: 400, b12: 6, calcium: 200, iron: 8, magnesium: 50, zinc: 11, selenium: 55 } },
  { name: 'Vitamin D3 2,000 IU', n: { vitD: 50 } },
  { name: 'Creatine 5 g', extra: [{ name: 'Creatine monohydrate', amount: 5, unit: 'g' }] },
  { name: 'Fish oil', extra: [{ name: 'EPA', amount: 180, unit: 'mg' }, { name: 'DHA', amount: 120, unit: 'mg' }] },
  { name: 'Magnesium 200 mg', n: { magnesium: 200 } },
  { name: 'Electrolytes', n: { sodium: 1000, potassium: 200, magnesium: 60 } },
  { name: 'Vitamin B12 1,000 µg', n: { b12: 1000 } },
  { name: 'Vitamin C 500 mg', n: { vitC: 500 } },
  { name: 'Zinc 15 mg', n: { zinc: 15 } },
  { name: 'Iron 18 mg', n: { iron: 18 } },
  { name: 'Calcium 500 mg', n: { calcium: 500 } },
  { name: 'Biotin', extra: [{ name: 'Biotin', amount: 5000, unit: 'µg' }] },
  { name: 'Ashwagandha', extra: [{ name: 'Ashwagandha root extract', amount: 600, unit: 'mg' }] },
  { name: 'Probiotic', extra: [{ name: 'Probiotic cultures', amount: 10, unit: 'billion CFU' }] },
];

// Ingredients without a target (creatine, EPA, biotin…) from the supplements ticked off on a day.
export function suppExtras(day, supplements = []) {
  const by = new Map();
  for (const id of day?.supps || []) {
    const sp = supplements.find((x) => x.id === id);
    for (const x of sp?.extra || []) {
      const key = `${x.name.toLowerCase()}|${x.unit}`;
      const cur = by.get(key) || { name: x.name, unit: x.unit, amount: 0, from: [] };
      cur.amount += +x.amount || 0;
      cur.from.push(sp.name);
      by.set(key, cur);
    }
  }
  return [...by.values()];
}
