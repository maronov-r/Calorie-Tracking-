// Barcode lookups via Open Food Facts (free, open database of packaged foods).

const FIELDS = 'code,product_name,product_name_en,brands,serving_size,serving_quantity,nutriments';

// Open Food Facts reports every nutrient in grams per 100 g. Convert to our units.
const MAP = [
  ['protein', 'proteins', 1], ['carbs', 'carbohydrates', 1], ['fat', 'fat', 1], ['fiber', 'fiber', 1],
  ['sugar', 'sugars', 1], ['satfat', 'saturated-fat', 1], ['sodium', 'sodium', 1e3],
  ['vitA', 'vitamin-a', 1e6], ['vitC', 'vitamin-c', 1e3], ['vitD', 'vitamin-d', 1e6], ['vitE', 'vitamin-e', 1e3],
  ['vitK', 'vitamin-k', 1e6], ['b1', 'vitamin-b1', 1e3], ['b2', 'vitamin-b2', 1e3], ['b3', 'vitamin-pp', 1e3],
  ['b5', 'pantothenic-acid', 1e3], ['b6', 'vitamin-b6', 1e3], ['folate', 'vitamin-b9', 1e6], ['b12', 'vitamin-b12', 1e6],
  ['calcium', 'calcium', 1e3], ['iron', 'iron', 1e3], ['magnesium', 'magnesium', 1e3], ['potassium', 'potassium', 1e3],
  ['zinc', 'zinc', 1e3], ['selenium', 'selenium', 1e6],
];

export async function lookupBarcode(code) {
  const res = await fetch(`https://world.openfoodfacts.org/api/v2/product/${encodeURIComponent(code)}.json?fields=${FIELDS}`);
  if (res.status === 404) return null;
  if (!res.ok) throw new Error('Lookup failed');
  const data = await res.json();
  if (data.status !== 1 || !data.product) return null;
  return offFood(data.product, code);
}

function offFood(p, code) {
  const nm = p.nutriments || {};
  const n = {};
  let kcal = nm['energy-kcal_100g'];
  if (kcal == null && nm['energy_100g'] != null) kcal = nm['energy_100g'] / 4.184;
  if (kcal) n.kcal = +(+kcal).toFixed(1);
  for (const [key, off, mult] of MAP) {
    const v = nm[`${off}_100g`];
    if (v != null && !isNaN(v) && +v > 0) n[key] = +(+v * mult).toPrecision(4);
  }
  if (!n.kcal && !n.protein && !n.carbs && !n.fat) return null; // no usable nutrition facts

  const portions = [];
  const sq = +p.serving_quantity;
  if (sq > 0) portions.push({ label: `1 serving${p.serving_size ? ` (${p.serving_size})` : ''}`, g: sq });
  const brand = (p.brands || '').split(',')[0].trim();
  return {
    name: (p.product_name || p.product_name_en || 'Unnamed product').trim(),
    sub: brand || 'Packaged food',
    src: 'off',
    ref: code,
    base: { g: 100, n },
    portions,
    mass: true,
  };
}
