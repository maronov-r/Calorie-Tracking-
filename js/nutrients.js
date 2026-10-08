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

export const ACTIVITY = [
  { value: 'sedentary', label: 'Mostly sitting', hint: 'Desk job, little exercise', factor: 1.2 },
  { value: 'light', label: 'Lightly active', hint: 'Exercise 1–3 days a week', factor: 1.375 },
  { value: 'moderate', label: 'Active', hint: 'Exercise 3–5 days a week', factor: 1.55 },
  { value: 'very', label: 'Very active', hint: 'Hard exercise 6–7 days a week', factor: 1.725 },
  { value: 'athlete', label: 'Athlete', hint: 'Physical job or training twice a day', factor: 1.9 },
];

export const GOALS = [
  { value: 'lose1', delta: -500, us: 'Lose 1 lb a week', metric: 'Lose 0.5 kg a week' },
  { value: 'lose05', delta: -250, us: 'Lose ½ lb a week', metric: 'Lose 0.25 kg a week' },
  { value: 'maintain', delta: 0, us: 'Maintain weight', metric: 'Maintain weight' },
  { value: 'gain05', delta: 250, us: 'Gain ½ lb a week', metric: 'Gain 0.25 kg a week' },
  { value: 'gain1', delta: 500, us: 'Gain 1 lb a week', metric: 'Gain 0.5 kg a week' },
];

const round = (v, step = 1) => Math.round(v / step) * step;

export function computeTargets(profile, overrides = {}) {
  const { sex = 'female', age = 30, heightCm = 170, weightKg = 70, activity = 'light', goal = 'maintain' } = profile || {};
  const bmr = 10 * weightKg + 6.25 * heightCm - 5 * age + (sex === 'male' ? 5 : -161);
  const factor = (ACTIVITY.find((a) => a.value === activity) || ACTIVITY[1]).factor;
  const delta = (GOALS.find((g) => g.value === goal) || GOALS[2]).delta;
  const floor = sex === 'male' ? 1500 : 1200;
  const autoKcal = Math.max(floor, round(bmr * factor + delta, 10));
  const kcal = overrides.kcal || autoKcal;

  const proteinPerKg = goal === 'maintain' ? 1.3 : 1.6;
  const protein = overrides.protein || round(Math.min(weightKg, 120) * proteinPerKg);
  const fat = overrides.fat || round((kcal * 0.3) / 9);
  const carbs = overrides.carbs || Math.max(50, round((kcal - protein * 4 - fat * 9) / 4));
  const water = overrides.water || Math.min(4000, Math.max(2000, round(weightKg * 35, 250)));

  const t = {
    kcal, protein, carbs, fat, water,
    fiber: round((kcal / 1000) * 14),
    satfat: round((kcal * 0.1) / 9),
    sodium: 2300,
    sugar: 0,
    auto: { kcal: autoKcal, bmr: Math.round(bmr), tdee: round(bmr * factor, 10) },
  };
  const table = DRI[sex === 'male' ? 'male' : 'female'];
  const b = band(age);
  for (const n of MICROS) {
    const v = table[n.key];
    t[n.key] = Array.isArray(v) ? v[b] : v;
  }
  return t;
}

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

export const SUPP_PRESETS = [
  { name: 'Multivitamin', n: { vitA: 900, vitC: 90, vitD: 25, vitE: 15, vitK: 80, b1: 1.2, b2: 1.3, b3: 16, b5: 5, b6: 1.7, folate: 400, b12: 6, calcium: 200, iron: 8, magnesium: 50, zinc: 11, selenium: 55 } },
  { name: 'Vitamin D3 2,000 IU', n: { vitD: 50 } },
  { name: 'Vitamin B12 1,000 µg', n: { b12: 1000 } },
  { name: 'Vitamin C 500 mg', n: { vitC: 500 } },
  { name: 'Magnesium 200 mg', n: { magnesium: 200 } },
  { name: 'Iron 18 mg', n: { iron: 18 } },
  { name: 'Zinc 15 mg', n: { zinc: 15 } },
  { name: 'Calcium 500 mg', n: { calcium: 500 } },
];
