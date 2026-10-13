// Supplement search: the NIH Dietary Supplement Label Database (DSLD), about 200,000 U.S. labels.
// Free, no key, and it allows calls straight from the browser. Needs a connection.
import { suppNutrient } from './nutrients.js';

const API = 'https://api.ods.od.nih.gov/dsld/v9';

async function get(path) {
  const res = await fetch(`${API}${path}`);
  if (!res.ok) throw new Error(`DSLD ${res.status}`);
  return res.json();
}

// Products on the market first, then newest. The same product is often listed once per label version.
export async function searchSupplements(q) {
  const data = await get(`/search-filter?q=${encodeURIComponent(q)}&size=40`);
  const seen = new Set();
  return (data.hits || [])
    .map((h) => ({ id: h._id, name: h._source.fullName || '', brand: h._source.brandName || '', off: !!h._source.offMarket, date: h._source.entryDate || '' }))
    .filter((x) => x.name)
    .sort((a, b) => a.off - b.off || b.date.localeCompare(a.date))
    .filter((x) => {
      const key = `${x.brand}|${x.name}`.toLowerCase();
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    })
    .slice(0, 20);
}

// One label as a supplement: tracked nutrients plus everything else, for one serving.
export async function loadSupplement(id) {
  const d = await get(`/label/${encodeURIComponent(id)}`);
  const n = {};
  const extra = [];
  for (const row of d.ingredientRows || []) {
    const q = (row.quantity || []).find((x) => (x.servingSizeOrder ?? 1) === 1) || row.quantity?.[0];
    if (!q || !(+q.quantity > 0)) continue;
    const m = suppNutrient(row.name, q.quantity, q.unit) || suppNutrient(row.ingredientGroup, q.quantity, q.unit);
    if (m) n[m.key] = +((n[m.key] || 0) + m.value).toPrecision(4);
    else if (!SKIP.test(row.name) && UNITS.includes(cleanUnit(q.unit))) extra.push({ name: row.name, amount: +q.quantity, unit: cleanUnit(q.unit) });
  }
  const sv = d.servingSizes?.[0];
  const serving = sv ? `${sv.minQuantity} ${String(sv.unit || '').replace('(s)', sv.minQuantity === 1 ? '' : 's').toLowerCase()}` : '';
  // The listed brand is sometimes the maker ("GSK" for Centrum), so the product name is used as printed.
  return { name: String(d.fullName || '').replace(/\s+/g, ' ').trim(), n, extra, serving };
}

// Food-label rows a gummy or powder lists, which Plate tracks through food instead.
const SKIP = /^(calories|total (carbohydrate|fat|sugars?)|sugars?|added sugars?|includes .*added sugars|protein|dietary fiber|cholesterol|saturated fat|trans fat)/i;
const UNITS = ['mg', 'µg', 'g', 'IU', 'billion CFU'];
const UNIT_MAP = { mcg: 'µg', 'gram(s)': 'g', grams: 'g', gram: 'g', iu: 'IU' };
const cleanUnit = (u) => {
  const s = String(u || 'mg').toLowerCase().trim();
  return UNIT_MAP[s] || (s.startsWith('mcg') ? 'µg' : s.includes('cfu') ? 'billion CFU' : s.split(/\s+/)[0]);
};
