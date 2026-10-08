import { html, useState, useEffect, useMemo, useRef } from '../vendor/preact.js';
import {
  useStore, MEALS, mealLabel, mealForNow, addEntries, pushRecent, saveCustomFood, getTargets, toast,
} from '../store.js';
import { Icon, Sheet, Segmented, Stepper, NumberInput, NutritionSummary, Empty } from '../ui.js';
import {
  loadFoods, foodsReady, search, tokenize, customFood, aiFood, unitsFor, defaultAmount, nutrientsFor, makeEntry, describeAmount,
} from '../foods.js';
import { fmtKcal, fmtNum, fmtQty, NUTRIENTS, N } from '../nutrients.js';
import { estimateMeal, aiErrorMessage, prepareImage, AI_MODELS } from '../ai.js';
import { ScanPane } from './scan.js';

export function AddSheet({ dateKey, meal, mode, query, onClose, toSettings }) {
  return html`<${Sheet} className="sheet-full" onClose=${onClose} label="Add food"
    render=${(close) => html`<${AddFlow} dateKey=${dateKey} initialMeal=${meal} initialMode=${mode} initialQuery=${query} close=${close} toSettings=${toSettings} />`} />`;
}

const MODES = [
  { value: 'search', label: 'Search', icon: 'search' },
  { value: 'scan', label: 'Scan', icon: 'barcode' },
  { value: 'ai', label: 'Describe', icon: 'sparkle' },
];

function AddFlow({ dateKey, initialMeal, initialMode, initialQuery, close, toSettings }) {
  const [meal, setMeal] = useState(initialMeal || mealForNow());
  const [mode, setMode] = useState(initialMode || 'search');
  const [query, setQuery] = useState(initialQuery || '');
  const [detail, setDetail] = useState(null); // { food, unitIdx, amount }
  const [creating, setCreating] = useState(null); // { name, barcode }

  const log = (items) => {
    addEntries(dateKey, items.map(({ food, unit, amount }) => ({ ...makeEntry(food, unit, amount), meal })));
    for (const { food, unitIdx, amount } of items) pushRecent(food, unitIdx, amount);
    const kcal = items.reduce((a, { food, unit, amount }) => a + (nutrientsFor(food, unit, amount).kcal || 0), 0);
    toast(`Added ${fmtKcal(kcal)} kcal to ${mealLabel(meal)}`);
    close();
  };
  const logOne = (food, unitIdx, amount) => log([{ food, unit: unitsFor(food)[unitIdx], unitIdx, amount }]);

  const back = detail ? () => setDetail(null) : creating ? () => setCreating(null) : null;

  return html`
    <div class="sheet-head">
      ${back ? html`<button type="button" class="icon-btn" onClick=${back} aria-label="Back"><${Icon} name="back" /></button>` : html`<span class="icon-btn-spacer" />`}
      <label class="meal-picker">
        <span>Add to</span>
        <select value=${meal} onChange=${(e) => setMeal(e.currentTarget.value)} aria-label="Meal">
          ${MEALS.map((m) => html`<option value=${m.value}>${m.label}</option>`)}
        </select>
      </label>
      <button type="button" class="icon-btn" onClick=${close} aria-label="Close"><${Icon} name="close" /></button>
    </div>
    ${detail ? html`<${FoodDetail} key=${detail.food.ref} food=${detail.food} unitIdx=${detail.unitIdx} amount=${detail.amount} meal=${meal} onAdd=${logOne} />`
    : creating ? html`<${CustomFoodForm} initial=${creating}
        onSave=${(f) => { const saved = saveCustomFood(f); setCreating(null); setDetail({ food: customFood(saved) }); }} />`
    : html`
      <div class="add-modes"><${Segmented} options=${MODES} value=${mode} onChange=${setMode} /></div>
      ${mode === 'search' && html`<${SearchPane} query=${query} setQuery=${setQuery}
        onPick=${(food, unitIdx, amount) => setDetail({ food, unitIdx, amount })}
        onQuick=${(r) => logOne(r.food, r.unitIdx, r.amount)}
        onCreate=${() => setCreating({ name: query })}
        onDescribe=${() => setMode('ai')} />`}
      ${mode === 'scan' && html`<${ScanPane}
        onFound=${(food) => setDetail({ food })}
        onCreate=${(barcode) => setCreating({ barcode })}
        onDescribe=${() => setMode('ai')} />`}
      ${mode === 'ai' && html`<${AiPane} initialText=${query} onLog=${log} toSettings=${toSettings} />`}
    `}`;
}

// ---- Search ----

function SearchPane({ query, setQuery, onPick, onQuick, onCreate, onDescribe }) {
  const s = useStore();
  const [db, setDb] = useState(foodsReady());
  const [failed, setFailed] = useState(false);
  useEffect(() => { if (!db) loadFoods().then(setDb, () => setFailed(true)); }, []);

  const q = query.trim();
  const results = useMemo(() => (db && q.length >= 2 ? search(q) : []), [db, q]);
  const mine = useMemo(() => {
    const qt = tokenize(q);
    if (!qt.length) return s.customFoods;
    return s.customFoods.filter((c) => {
      const ft = tokenize(`${c.name} ${c.brand || ''}`);
      return qt.every((x) => ft.some((f) => f.startsWith(x)));
    });
  }, [q, s.customFoods]);

  return html`
    <div class="search-bar">
      <${Icon} name="search" size=${19} />
      <input type="search" placeholder="Search 7,800 foods" value=${query} autofocus
        onInput=${(e) => setQuery(e.currentTarget.value)} enterkeyhint="search" autocomplete="off" autocorrect="off" autocapitalize="off" spellcheck=${false} />
      ${query && html`<button type="button" class="icon-btn sm" onClick=${() => setQuery('')} aria-label="Clear"><${Icon} name="close" size=${16} /></button>`}
    </div>
    <div class="sheet-body">
      ${!q ? html`
        ${s.recents.length > 0 ? html`
          <p class="list-label">Recent</p>
          <ul class="food-list">${s.recents.map((r) => html`<${RecentRow} r=${r} onPick=${onPick} onQuick=${onQuick} />`)}</ul>`
        : html`<${Empty} icon="search" title="Search everyday foods">
            Every food comes with full vitamin and mineral data from the USDA. For packaged foods, scan the barcode instead.
          <//>`}
        ${mine.length > 0 && html`
          <p class="list-label">Your foods</p>
          <ul class="food-list">${mine.map((c) => html`<${FoodRow} food=${customFood(c)} onPick=${onPick} />`)}</ul>`}
      ` : html`
        ${mine.length > 0 && html`<ul class="food-list">${mine.map((c) => html`<${FoodRow} food=${customFood(c)} onPick=${onPick} />`)}</ul>`}
        ${!db && !failed && html`<p class="loading-line"><span class="spinner" /> Loading foods…</p>`}
        ${failed && html`<p class="error">Couldn't load the food list. Check your connection and reopen this sheet.</p>`}
        ${db && q.length >= 2 && results.length === 0 && mine.length === 0 && html`
          <${Empty} title="No matches">Try one simple word (“yogurt”, not “vanilla yogurt cup”), or describe it to AI.<//>`}
        <ul class="food-list">${results.map((f) => html`<${FoodRow} food=${f} onPick=${onPick} />`)}</ul>
      `}
      <div class="search-foot">
        <button type="button" class="btn btn-quiet" onClick=${onDescribe}><${Icon} name="sparkle" size=${18} /> Describe it</button>
        <button type="button" class="btn btn-quiet" onClick=${onCreate}><${Icon} name="edit" size=${18} /> Create a food</button>
      </div>
    </div>`;
}

function FoodRow({ food, onPick }) {
  const unit = unitsFor(food)[0];
  const kcal = nutrientsFor(food, unit, defaultAmount(unit)).kcal || 0;
  return html`
    <li>
      <button type="button" class="food-row" onClick=${() => onPick(food, 0)}>
        <span class="entry-main">
          <span class="entry-name">${food.name}</span>
          <span class="entry-sub">${[food.sub, describeAmount(defaultAmount(unit), unit, fmtQty)].filter(Boolean).join(' · ')}</span>
        </span>
        <span class="food-kcal">${fmtKcal(kcal)}<small>kcal</small></span>
      </button>
    </li>`;
}

function RecentRow({ r, onPick, onQuick }) {
  const units = unitsFor(r.food);
  const unit = units[Math.min(r.unitIdx || 0, units.length - 1)];
  const kcal = nutrientsFor(r.food, unit, r.amount).kcal || 0;
  return html`
    <li class="recent">
      <button type="button" class="food-row" onClick=${() => onPick(r.food, r.unitIdx, r.amount)}>
        <span class="entry-main">
          <span class="entry-name">${r.food.name}</span>
          <span class="entry-sub">${describeAmount(r.amount, unit, fmtQty)} · ${fmtKcal(kcal)} kcal</span>
        </span>
      </button>
      <button type="button" class="quick-add" onClick=${() => onQuick(r)} aria-label=${`Log ${r.food.name} again`}><${Icon} name="plus" size=${18} stroke=${2.2} /></button>
    </li>`;
}

// ---- Food detail: choose amount, preview nutrition, add ----

const SOURCE = {
  usda: 'Nutrition data: USDA FoodData Central',
  off: 'Nutrition data: Open Food Facts (from the package label)',
  ai: 'Estimated by AI. Adjust the amount if it looks off.',
  custom: 'A food you created',
};

function unitOption(u, food) {
  if (u.kind === 'g') return 'grams';
  if (u.kind === 'oz') return 'ounces';
  return food.mass ? `${u.label} · ${fmtNum(u.g)} g` : u.label;
}

function FoodDetail({ food, unitIdx = 0, amount: initialAmount, meal, onAdd }) {
  const units = useMemo(() => unitsFor(food), [food]);
  const [ui, setUi] = useState(Math.min(unitIdx, units.length - 1));
  const unit = units[ui];
  const [amount, setAmount] = useState(initialAmount ?? defaultAmount(unit));
  const n = nutrientsFor(food, unit, amount || 0);
  const t = getTargets();
  const changeUnit = (i) => { setUi(i); setAmount(defaultAmount(units[i])); };

  return html`
    <div class="sheet-body">
      <h2 class="food-title">${food.name}</h2>
      ${food.sub && html`<p class="food-sub">${food.sub}</p>`}
      <div class="amount-card">
        ${unit.kind === 'portion'
          ? html`<${Stepper} value=${amount} onChange=${setAmount} step=${0.25} min=${0.25} />`
          : html`<${NumberInput} className="amount-input" value=${amount} onChange=${setAmount} suffix=${unit.label} />`}
        ${units.length > 1
          ? html`<select class="unit-select" value=${ui} onChange=${(e) => changeUnit(+e.currentTarget.value)} aria-label="Unit">
              ${units.map((u, i) => html`<option value=${i}>${unitOption(u, food)}</option>`)}
            </select>`
          : html`<span class="unit-static">${unitOption(unit, food)}</span>`}
      </div>
      <${NutritionSummary} n=${n} t=${t} />
      <p class="fine source">${SOURCE[food.src]}</p>
    </div>
    <div class="sheet-foot">
      <button type="button" class="btn btn-primary btn-block" disabled=${!(amount > 0)} onClick=${() => onAdd(food, ui, amount)}>
        Add to ${mealLabel(meal)} · ${fmtKcal(n.kcal)} kcal
      </button>
    </div>`;
}

// ---- Describe with AI ----

function AiPane({ initialText, onLog, toSettings }) {
  const s = useStore();
  const [text, setText] = useState(initialText || '');
  const [photo, setPhoto] = useState(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const [res, setRes] = useState(null);
  const fileRef = useRef();
  const model = AI_MODELS.find((m) => m.id === s.settings.model) || AI_MODELS[0];

  if (!s.settings.apiKey) {
    return html`
      <div class="sheet-body">
        <${Empty} icon="sparkle" title="Describe meals in plain words">
          Type “turkey sandwich and an apple” or snap a photo of your plate, and Claude fills in calories, macros and vitamins.
          <br /><br />
          This uses your own Anthropic API key. You pay Anthropic only for what you use, with no subscription.
        <//>
        <button type="button" class="btn btn-primary btn-block" onClick=${toSettings}><${Icon} name="key" size=${18} /> Add API key</button>
      </div>`;
  }

  const pick = async (e) => {
    const file = e.currentTarget.files?.[0];
    e.currentTarget.value = '';
    if (!file) return;
    setErr('');
    try { setPhoto(await prepareImage(file)); } catch (x) { setErr(x.message); }
  };

  const run = async () => {
    setBusy(true);
    setErr('');
    try {
      const out = await estimateMeal({ apiKey: s.settings.apiKey, model: model.id, text, imageB64: photo?.b64 });
      setRes({ note: out.note, items: out.items.map((it) => ({ food: aiFood(it), portion: it.portion, mult: 1, on: true })) });
    } catch (x) {
      setErr(aiErrorMessage(x));
    } finally {
      setBusy(false);
    }
  };

  if (res) {
    const patch = (i, p) => setRes({ ...res, items: res.items.map((x, j) => (j === i ? { ...x, ...p } : x)) });
    const chosen = res.items.filter((x) => x.on);
    const kcalOf = (x) => (x.food.base.n.kcal || 0) * x.mult;
    const total = chosen.reduce((a, x) => a + kcalOf(x), 0);
    return html`
      <div class="sheet-body">
        ${res.items.length === 0
          ? html`<${Empty} icon="sparkle" title="Nothing to log">${res.note || 'No food found. Try describing it in more detail.'}<//>`
          : html`
            <ul class="ai-items">
              ${res.items.map((x, i) => {
                const n = x.food.base.n;
                return html`
                  <li class="ai-item ${x.on ? '' : 'off'}">
                    <button type="button" class="ai-check" aria-pressed=${x.on} onClick=${() => patch(i, { on: !x.on })} aria-label=${x.on ? 'Skip this item' : 'Include this item'}>
                      ${x.on && html`<${Icon} name="check" size=${15} stroke=${2.6} />`}
                    </button>
                    <div class="ai-main">
                      <span class="entry-name">${x.food.name}</span>
                      <span class="entry-sub">${x.mult === 1 ? x.portion : `${fmtQty(x.mult)} × ${x.portion}`}</span>
                      <span class="ai-macros">P ${fmtNum((n.protein || 0) * x.mult)}g · C ${fmtNum((n.carbs || 0) * x.mult)}g · F ${fmtNum((n.fat || 0) * x.mult)}g</span>
                    </div>
                    <div class="ai-side">
                      <span class="entry-kcal">${fmtKcal(kcalOf(x))}</span>
                      <${Stepper} value=${x.mult} onChange=${(v) => patch(i, { mult: v })} step=${0.25} min=${0.25} />
                    </div>
                  </li>`;
              })}
            </ul>`}
        ${res.note && res.items.length > 0 && html`<p class="ai-note"><${Icon} name="info" size=${16} /> ${res.note}</p>`}
      </div>
      <div class="sheet-foot two">
        <button type="button" class="btn btn-quiet" onClick=${() => setRes(null)}>Back</button>
        <button type="button" class="btn btn-primary" disabled=${!chosen.length}
          onClick=${() => onLog(chosen.map((x) => ({ food: x.food, unit: unitsFor(x.food)[0], unitIdx: 0, amount: x.mult })))}>
          Add ${chosen.length > 1 ? `${chosen.length} · ` : ''}${fmtKcal(total)} kcal
        </button>
      </div>`;
  }

  return html`
    <div class="sheet-body">
      <textarea class="ai-input" rows="4" value=${text} onInput=${(e) => setText(e.currentTarget.value)}
        placeholder=${'What did you eat?\ne.g. “chicken burrito bowl with guac” or “2 eggs, buttered toast and a latte”'}></textarea>
      ${photo
        ? html`<div class="photo-preview">
            <img src=${photo.dataUrl} alt="Your food photo" />
            <button type="button" class="photo-remove" onClick=${() => setPhoto(null)} aria-label="Remove photo"><${Icon} name="close" size=${16} /></button>
          </div>`
        : html`<button type="button" class="btn btn-quiet btn-block" onClick=${() => fileRef.current.click()}><${Icon} name="camera" size=${19} /> Add a photo</button>`}
      <input ref=${fileRef} type="file" accept="image/*" hidden onChange=${pick} />
      ${err && html`<p class="error">${err}</p>`}
      <p class="fine">Uses ${model.label} with your API key. Portions are estimates, so adjust them before adding.</p>
    </div>
    <div class="sheet-foot">
      <button type="button" class="btn btn-primary btn-block" disabled=${busy || (!text.trim() && !photo)} onClick=${run}>
        ${busy ? html`<span class="spinner light" /> Estimating…` : html`<${Icon} name="sparkle" size=${18} /> Estimate`}
      </button>
    </div>`;
}

// ---- Create a custom food (e.g. from a nutrition label) ----

const LABEL_MAIN = ['kcal', 'protein', 'carbs', 'fat'];
const LABEL_MORE = NUTRIENTS.filter((n) => !LABEL_MAIN.includes(n.key));

function CustomFoodForm({ initial, onSave }) {
  const [f, setF] = useState({ name: initial.name || '', brand: '', servingLabel: '1 serving', servingG: '', barcode: initial.barcode || '', n: {} });
  const [more, setMore] = useState(false);
  const set = (p) => setF((x) => ({ ...x, ...p }));
  const setN = (k, v) => setF((x) => ({ ...x, n: { ...x.n, [k]: v } }));
  const valid = f.name.trim() && LABEL_MAIN.some((k) => f.n[k] > 0);

  const save = () => {
    const n = {};
    for (const [k, v] of Object.entries(f.n)) if (v > 0) n[k] = v;
    onSave({ name: f.name.trim(), brand: f.brand.trim(), servingLabel: f.servingLabel.trim() || '1 serving', servingG: +f.servingG || 0, barcode: f.barcode, n });
  };

  return html`
    <div class="sheet-body form">
      <h2 class="food-title">Create a food</h2>
      <p class="food-sub">${f.barcode ? `Barcode ${f.barcode} will be remembered next time you scan it.` : 'Copy the numbers from a nutrition label.'}</p>
      <label class="field"><span class="field-label">Name</span>
        <input type="text" value=${f.name} onInput=${(e) => set({ name: e.currentTarget.value })} placeholder="e.g. Protein bar" /></label>
      <label class="field"><span class="field-label">Brand (optional)</span>
        <input type="text" value=${f.brand} onInput=${(e) => set({ brand: e.currentTarget.value })} /></label>
      <div class="field-row">
        <label class="field"><span class="field-label">Serving</span>
          <input type="text" value=${f.servingLabel} onInput=${(e) => set({ servingLabel: e.currentTarget.value })} placeholder="1 bar" /></label>
        <${NumberInput} className="field" label="Weight (optional)" value=${f.servingG} onChange=${(v) => set({ servingG: v })} suffix="g" />
      </div>
      <p class="list-label">Per serving</p>
      <div class="field-grid">
        ${LABEL_MAIN.map((k) => html`<${NumberInput} className="field" label=${N[k].name} value=${f.n[k] ?? ''} onChange=${(v) => setN(k, v)} suffix=${N[k].unit} />`)}
      </div>
      ${more
        ? html`<div class="field-grid">
            ${LABEL_MORE.map((n) => html`<${NumberInput} className="field" label=${n.name} value=${f.n[n.key] ?? ''} onChange=${(v) => setN(n.key, v)} suffix=${n.unit} />`)}
          </div>`
        : html`<button type="button" class="btn btn-quiet btn-block" onClick=${() => setMore(true)}>More nutrients (fiber, sodium, vitamins…)</button>`}
    </div>
    <div class="sheet-foot">
      <button type="button" class="btn btn-primary btn-block" disabled=${!valid} onClick=${save}>Save food</button>
    </div>`;
}
