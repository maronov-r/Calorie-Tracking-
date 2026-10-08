// Local USDA food database: loading, search, and turning foods into log entries.
import { scale } from './nutrients.js';

let loading = null;
let DB = null;

export const foodsReady = () => DB;

export function loadFoods() {
  if (!loading) {
    loading = fetch(new URL('../data/foods.json', import.meta.url))
      .then((r) => { if (!r.ok) throw new Error('Food database failed to load'); return r.json(); })
      .then(build)
      .catch((err) => { loading = null; throw err; });
  }
  return loading;
}

function build(raw) {
  const foods = raw.foods;
  DB = {
    keys: raw.keys,
    foods,
    tokens: foods.map((f) => tokenize(f[0])),
    // Single-word name segments near the front, e.g. "Fish, salmon, Atlantic" -> fish, salmon, atlantic
    segs: foods.map((f) => f[0].split(', ').slice(0, 3).map((s) => tokenize(s)).filter((t) => t.length === 1).map((t) => t[0])),
  };
  return DB;
}

// ---- Search ----

const stem = (w) => {
  if (w.length > 4 && w.endsWith('ies')) return w.slice(0, -3) + 'y';
  if (w.length > 4 && /(oes|ches|shes|xes|sses)$/.test(w)) return w.slice(0, -2);
  if (w.length > 3 && w.endsWith('s') && !w.endsWith('ss')) return w.slice(0, -1);
  return w;
};

// Less common forms sink below the everyday version unless you search for them.
const STOP = new Set(['with', 'and', 'without', 'added', 'from', 'the', 'for', 'type', 'includes']);
const ODD = new Set(['dried', 'dry', 'dehydrated', 'powder', 'mix', 'imitation', 'sheep', 'goat', 'buffalo', 'human', 'instant', 'babyfood']);
export const tokenize = (s) => s.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim().split(' ').filter(Boolean).map(stem);

// Everyday words that don't appear in USDA's naming.
const SYNONYMS = {
  oatmeal: ['oat'], fry: ['french'], soda: ['carbonated'], pop: ['carbonated'], coke: ['cola'], ketchup: ['catsup'],
  burger: ['hamburger'], hotdog: ['frankfurter'], pb: ['peanut'], yoghurt: ['yogurt'], courgette: ['zucchini'],
  garbanzo: ['chickpea'], edamame: ['soybean'], steak: ['beef'], latte: ['coffee'], oj: ['orange'],
};

// Category ranking tweaks (USDA category ids)
const CAT_PENALTY = { 3: 45, 24: 30, 21: 6, 25: 6, 2: 3, 4: 2, 22: 2, 18: 1 };

export function search(query, limit = 40) {
  if (!DB) return [];
  const q = tokenize(query);
  if (!q.length) return [];
  const scored = [];
  const { foods, tokens, segs } = DB;
  for (let i = 0; i < foods.length; i++) {
    const ft = tokens[i];
    const seg = segs[i];
    let score = 0;
    let ok = true;
    for (const qt of q) {
      const alts = [qt, ...(SYNONYMS[qt] || [])];
      let best = -1;
      for (let j = 0; j < ft.length; j++) {
        if (alts.some((a) => ft[j].startsWith(a))) { best = j; break; }
      }
      if (best < 0) { ok = false; break; }
      score += best === 0 ? 30 : best < 3 ? 12 : 5;
      if (ft[best] === qt) score += 4;
      if (seg.includes(qt)) score += 25; // the word is a whole part of the name, not a modifier

    }
    if (!ok) continue;
    for (const w of ft) {
      if (w.length > 2 && !STOP.has(w) && !/^\d/.test(w)) score -= 1.2; // shorter, plainer names first
      if (ODD.has(w) && !q.includes(w)) score -= 6;
    }
    if (/^[^,]+, whole(,|$)/.test(foods[i][0])) score += 5; // "Milk, whole", "Egg, whole"
    score -= CAT_PENALTY[foods[i][1]] || 0;
    scored.push([score, i]);
  }
  scored.sort((a, b) => b[0] - a[0] || foods[a[1]][0].length - foods[b[1]][0].length);
  return scored.slice(0, limit).map(([, i]) => usdaFood(i));
}

// ---- Food objects ----
// A food is { name, sub, src, ref, base: { g, n }, portions: [{ label, g }], mass }
// `base.n` holds nutrients for `base.g` grams. `mass` means real gram weights are known.

function splitName(name) {
  const parts = name.split(', ');
  const cut = parts.length > 1 && parts[0].length < 24 ? 2 : 1;
  return [parts.slice(0, cut).join(', '), parts.slice(cut).join(', ')];
}

export function usdaFood(i) {
  const [name, , vals, portions] = DB.foods[i];
  const n = {};
  DB.keys.forEach((k, j) => { if (vals[j]) n[k] = vals[j]; });
  const [title, sub] = splitName(name);
  return {
    name: title,
    sub,
    src: 'usda',
    ref: i,
    base: { g: 100, n },
    portions: portions.map(([label, g]) => ({ label, g })),
    mass: true,
  };
}

export function customFood(c) {
  const g = +c.servingG || 0;
  return {
    name: c.name,
    sub: c.brand || 'Your food',
    src: 'custom',
    ref: c.id,
    base: { g: g || 1, n: c.n },
    portions: [{ label: c.servingLabel || '1 serving', g: g || 1 }],
    mass: g > 0,
  };
}

export function aiFood(item) {
  const g = +item.grams || 0;
  const { name, portion, grams, ...n } = item;
  return {
    name,
    sub: 'Estimated by AI',
    src: 'ai',
    ref: `${name}|${portion}`.toLowerCase(),
    base: { g: g || 1, n },
    portions: [{ label: portion || '1 serving', g: g || 1 }],
    mass: g > 0,
  };
}

// Units the amount picker offers for a food.
export function unitsFor(food) {
  const units = food.portions.map((p) => ({ label: p.label, g: p.g, kind: 'portion' }));
  if (food.mass) {
    units.push({ label: 'g', g: 1, kind: 'g' });
    units.push({ label: 'oz', g: 28.3495, kind: 'oz' });
  }
  if (!units.length) units.push({ label: '100 g', g: 100, kind: 'portion' });
  return units;
}

export const defaultAmount = (unit) => (unit.kind === 'g' ? 100 : 1);

export function nutrientsFor(food, unit, amount) {
  return scale(food.base.n, (unit.g * amount) / food.base.g);
}

// An entry stores nutrients per one unit (`pu`) so its amount can be edited later.
export function makeEntry(food, unit, amount) {
  return {
    name: food.name,
    sub: food.sub || '',
    src: food.src,
    unit: { label: unit.label, g: unit.g, kind: unit.kind },
    amount,
    pu: scale(food.base.n, unit.g / food.base.g),
  };
}

export function describeAmount(amount, unit, fmtQty) {
  if (unit.kind === 'g') return `${Math.round(amount)} g`;
  if (unit.kind === 'oz') return `${fmtQty(amount)} oz`;
  if (amount === 1) return unit.label;
  return `${fmtQty(amount)} × ${unit.label}`;
}
