// App state, persisted to IndexedDB on this device.
import { useReducer, useEffect } from './vendor/preact.js';
import { idbEntries, idbSet, idbClear, idbSetMany } from './lib/db.js';
import { computeTargets, dayTotals, addInto, goalFor } from './nutrients.js';

export const THEMES = [
  { value: 'oat', label: 'Oat', hint: 'Warm paper, forest green', color: '#F2EEE6', swatch: ['#F2EEE6', '#2F5D46', '#C4683F'] },
  { value: 'midnight', label: 'Midnight', hint: 'Dark, with a lime glow', color: '#0A0B0D', swatch: ['#0A0B0D', '#C8F169', '#FF8C6B'] },
  { value: 'porcelain', label: 'Porcelain', hint: 'Crisp white, cobalt blue', color: '#F6F6F7', swatch: ['#FFFFFF', '#2E5BFF', '#FF5C7A'] },
];

export const MEALS = [
  { value: 'breakfast', label: 'Breakfast' },
  { value: 'lunch', label: 'Lunch' },
  { value: 'dinner', label: 'Dinner' },
  { value: 'snack', label: 'Snacks' },
];
export const mealLabel = (m) => (MEALS.find((x) => x.value === m) || MEALS[3]).label;

export function mealForNow(d = new Date()) {
  const h = d.getHours() + d.getMinutes() / 60;
  if (h >= 4 && h < 10.5) return 'breakfast';
  if (h >= 11 && h < 14.5) return 'lunch';
  if (h >= 17 && h < 21.5) return 'dinner';
  return 'snack';
}

export const state = {
  ready: false,
  profile: null,
  settings: { theme: 'oat', units: 'us', apiKey: '', model: 'claude-opus-5-5', overrides: {}, hideInstallHint: false },
  days: {},
  weights: {}, // dateKey -> kg
  recents: [],
  supplements: [],
  customFoods: [],
  toast: null,
};

const listeners = new Set();
let version = 0;
export function emit() {
  version++;
  listeners.forEach((fn) => fn());
}

export function useStore() {
  const [, force] = useReducer((x) => x + 1, 0);
  const seen = version;
  useEffect(() => {
    listeners.add(force);
    if (version !== seen) force(); // state changed between render and subscribe
    return () => listeners.delete(force);
  }, []);
  return state;
}

const persist = (key, value) => idbSet(key, value).catch((err) => {
  console.error('Save failed', key, err);
  toast('Could not save. Is storage full?');
});

export async function loadState() {
  try {
    for (const [k, v] of await idbEntries()) {
      if (k.startsWith('d:')) state.days[k.slice(2)] = v;
      else if (k === 'profile') state.profile = v;
      else if (k === 'weights') state.weights = v;
      else if (k === 'settings') state.settings = { ...state.settings, ...v };
      else if (k === 'recents') state.recents = v;
      else if (k === 'supplements') state.supplements = v;
      else if (k === 'customFoods') state.customFoods = v;
    }
  } catch (err) {
    console.warn('Storage unavailable', err);
  }
  if (state.profile) {
    const goal = goalFor(state.profile.goal).value; // migrate old goal names
    if (goal !== state.profile.goal) setProfile({ ...state.profile, goal });
  }
  applyTheme(state.settings.theme);
  state.ready = true;
  emit();
  if (navigator.storage?.persist) navigator.storage.persist().catch(() => {});
}

// ---- Dates ----

export function dateKey(d = new Date()) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}
export function parseKey(key) {
  const [y, m, d] = key.split('-').map(Number);
  return new Date(y, m - 1, d);
}
export function shiftKey(key, days) {
  const d = parseKey(key);
  d.setDate(d.getDate() + days);
  return dateKey(d);
}

// ---- Days ----

const EMPTY_DAY = { entries: [], water: 0, supps: [] };
export const getDay = (key) => state.days[key] || EMPTY_DAY;

function putDay(key, day) {
  state.days[key] = day;
  persist('d:' + key, day);
  emit();
}

export const uid = () => Math.random().toString(36).slice(2, 10) + Date.now().toString(36).slice(-4);

export function addEntries(key, entries) {
  const d = getDay(key);
  putDay(key, { ...d, entries: [...d.entries, ...entries.map((e) => ({ id: uid(), t: Date.now(), ...e }))] });
}
export function updateEntry(key, id, patch) {
  const d = getDay(key);
  putDay(key, { ...d, entries: d.entries.map((e) => (e.id === id ? { ...e, ...patch } : e)) });
}
export function removeEntry(key, id) {
  const d = getDay(key);
  const removed = d.entries.find((e) => e.id === id);
  putDay(key, { ...d, entries: d.entries.filter((e) => e.id !== id) });
  return removed;
}
export function setWater(key, ml) {
  const d = getDay(key);
  putDay(key, { ...d, water: Math.max(0, Math.round(ml)) });
}
export function toggleSupp(key, suppId) {
  const d = getDay(key);
  const supps = d.supps || [];
  putDay(key, { ...d, supps: supps.includes(suppId) ? supps.filter((x) => x !== suppId) : [...supps, suppId] });
}

// ---- Profile, settings, targets ----

export function setProfile(profile) {
  state.profile = profile;
  persist('profile', profile);
  emit();
}

export function setSettings(patch) {
  state.settings = { ...state.settings, ...patch };
  persist('settings', state.settings);
  if (patch.theme) applyTheme(patch.theme);
  emit();
}

export const getTargets = () => computeTargets(state.profile, state.settings.overrides);

// ---- Weight ----

export const weighIns = () => Object.entries(state.weights).sort(([a], [b]) => (a < b ? -1 : 1)).map(([key, kg]) => ({ key, kg }));
export const latestWeighIn = () => {
  const all = weighIns();
  return all.length ? all[all.length - 1] : null;
};

// Logging a weight also updates the profile, so targets follow your current bodyweight.
export function setWeight(key, kg) {
  state.weights = { ...state.weights, [key]: +kg.toFixed(2) };
  persist('weights', state.weights);
  const latest = latestWeighIn();
  if (state.profile && latest) {
    state.profile = { ...state.profile, weightKg: latest.kg };
    persist('profile', state.profile);
  }
  emit();
}

export function deleteWeight(key) {
  const { [key]: _, ...rest } = state.weights;
  state.weights = rest;
  persist('weights', rest);
  emit();
}

export function applyTheme(theme) {
  const t = THEMES.find((x) => x.value === theme) || THEMES[0];
  document.documentElement.setAttribute('data-theme', t.value);
  document.querySelector('meta[name=theme-color]')?.setAttribute('content', t.color);
  try { localStorage.setItem('plate-theme', t.value); } catch (e) { /* private mode */ }
}

// ---- Recents, supplements, custom foods ----

export function pushRecent(food, unitIdx, amount) {
  const key = `${food.src}:${food.ref ?? food.name}`;
  const next = [{ key, food, unitIdx, amount, t: Date.now() }, ...state.recents.filter((r) => r.key !== key)].slice(0, 40);
  state.recents = next;
  persist('recents', next);
  emit();
}
export function saveSupplement(s) {
  const exists = state.supplements.some((x) => x.id === s.id);
  state.supplements = exists ? state.supplements.map((x) => (x.id === s.id ? s : x)) : [...state.supplements, { ...s, id: s.id || uid() }];
  persist('supplements', state.supplements);
  emit();
}
export function deleteSupplement(id) {
  state.supplements = state.supplements.filter((x) => x.id !== id);
  persist('supplements', state.supplements);
  emit();
}

export function saveCustomFood(f) {
  const food = { ...f, id: f.id || uid() };
  state.customFoods = [food, ...state.customFoods.filter((x) => x.id !== food.id)];
  persist('customFoods', state.customFoods);
  emit();
  return food;
}
export function deleteCustomFood(id) {
  state.customFoods = state.customFoods.filter((x) => x.id !== id);
  persist('customFoods', state.customFoods);
  emit();
}

// ---- Aggregates ----

export const totalsFor = (key) => dayTotals(getDay(key), state.supplements);

// Average over the last 7 logged days before `key`. Falls back to `key` itself when nothing earlier is logged.
export function weekAverage(key) {
  const days = [];
  for (let i = 1; i <= 7; i++) {
    const k = shiftKey(key, -i);
    if (getDay(k).entries.length) days.push(k);
  }
  if (!days.length) return { totals: totalsFor(key), count: 0, keys: [key] };
  const sum = {};
  for (const k of days) addInto(sum, totalsFor(k));
  for (const k in sum) sum[k] /= days.length;
  return { totals: sum, count: days.length, keys: days };
}

// ---- Toast ----

let toastTimer;
export function toast(message, action) {
  state.toast = { message, action, id: Date.now() };
  emit();
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => { state.toast = null; emit(); }, action ? 4500 : 2200);
}

// ---- Backup ----

export function exportData() {
  const { apiKey, ...settings } = state.settings; // never export the API key
  return {
    app: 'plate',
    version: 1,
    exportedAt: new Date().toISOString(),
    profile: state.profile,
    settings,
    days: state.days,
    weights: state.weights,
    recents: state.recents,
    supplements: state.supplements,
    customFoods: state.customFoods,
  };
}

export async function importData(data) {
  if (!data || data.app !== 'plate' || typeof data.days !== 'object') throw new Error('This file is not a Plate backup.');
  const apiKey = state.settings.apiKey;
  await idbClear();
  const settings = { ...state.settings, ...(data.settings || {}), apiKey };
  const pairs = [
    ['settings', settings],
    ['weights', data.weights || {}],
    ['recents', data.recents || []],
    ['supplements', data.supplements || []],
    ['customFoods', data.customFoods || []],
    ...Object.entries(data.days).map(([k, v]) => ['d:' + k, v]),
  ];
  if (data.profile) pairs.push(['profile', data.profile]);
  await idbSetMany(pairs);
  Object.assign(state, {
    profile: data.profile || null,
    settings,
    days: data.days,
    weights: data.weights || {},
    recents: data.recents || [],
    supplements: data.supplements || [],
    customFoods: data.customFoods || [],
  });
  applyTheme(settings.theme);
  emit();
}

export async function eraseAll() {
  await idbClear();
  try { localStorage.removeItem('plate-theme'); } catch (e) { /* ignore */ }
  location.reload();
}

