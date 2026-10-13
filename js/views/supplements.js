import { html, useState, useRef, useEffect } from '../vendor/preact.js';
import { useStore, saveSupplement, deleteSupplement, logAiCost } from '../store.js';
import { Icon, Sheet, NumberInput } from '../ui.js';
import { N, SUPP_FIELDS, SUPP_PRESETS, suppNutrient, suppNutrients, suppOther } from '../nutrients.js';
import { searchSupplements, loadSupplement } from '../dsld.js';
import { readSupplementLabel, prepareImage, aiErrorMessage } from '../ai.js';
import { DEMO, BETA, settleUse } from '../demo.js';

export { suppSummary } from '../nutrients.js';

export function SupplementSheet({ supp, onClose, toSettings }) {
  return html`<${Sheet} onClose=${onClose} className="sheet-tall" label="Supplement"
    render=${(close) => html`<${SupplementForm} supp=${supp} close=${close} toSettings=${() => { close(); setTimeout(toSettings, 240); }} />`} />`;
}

const UNITS = ['mg', 'µg', 'g', 'IU', 'billion CFU'];

function SupplementForm({ supp, close, toSettings }) {
  const s = useStore();
  const [name, setName] = useState(supp.name || '');
  // Vitamins typed under "Anything else" move into their tracked field, where they count.
  const [n, setN] = useState(() => suppNutrients(supp));
  const [extra, setExtra] = useState(() => suppOther(supp));
  const [found, setFound] = useState(null);
  const [showAll, setShowAll] = useState(false);
  const [scan, setScan] = useState({ busy: false, error: '', note: '', photo: null });
  const fileRef = useRef();
  const isNew = !supp.id;
  const hasKey = !!s.settings.apiKey;

  const usePreset = (pr) => { setName(pr.name); setN(pr.n || {}); setExtra(pr.extra || []); setFound(null); };
  const useFound = (sp) => { setName(sp.name); setN(sp.n); setExtra(sp.extra); setShowAll(false); setFound(sp); };
  const setRow = (i, patch) => setExtra((cur) => cur.map((x, j) => (j === i ? { ...x, ...patch } : x)));
  const allExtra = extra.filter((x) => x.name.trim() && x.amount > 0).map((x) => ({ name: x.name.trim(), amount: +x.amount, unit: x.unit || 'mg' }));
  const cleanExtra = allExtra.filter((x) => !suppNutrient(x.name, x.amount, x.unit));
  const valid = name.trim() && (Object.values(n).some((v) => v > 0) || allExtra.length > 0);
  // Fields with an amount always show; the rest stay folded away until asked for.
  const shown = showAll ? SUPP_FIELDS : SUPP_FIELDS.filter((f) => n[f.key] > 0);

  const save = () => {
    const clean = {};
    for (const [k, v] of Object.entries(n)) if (v > 0) clean[k] = v;
    // A vitamin added as an ingredient ("Vitamin C 500 mg") still counts, in its tracked field.
    for (const x of allExtra) {
      const m = suppNutrient(x.name, x.amount, x.unit);
      if (m && !clean[m.key]) clean[m.key] = m.value;
    }
    saveSupplement({ ...supp, name: name.trim(), n: clean, extra: cleanExtra });
    close();
  };

  const onPhoto = async (e) => {
    const file = e.currentTarget.files?.[0];
    e.currentTarget.value = '';
    if (!file) return;
    setScan({ busy: true, error: '', note: '', photo: null });
    try {
      const img = await prepareImage(file);
      setScan((x) => ({ ...x, photo: img.dataUrl }));
      const res = await readSupplementLabel({ apiKey: s.settings.apiKey, model: s.settings.model, imageB64: img.b64 });
      logAiCost('label', res.cost);
      if (BETA) settleUse('Label scan');
      setFound(null);
      if (res.name) setName(res.name);
      setN(res.n);
      setExtra(res.extra);
      setShowAll(false);
      setScan({ busy: false, error: '', note: res.note, photo: img.dataUrl });
    } catch (err) {
      setScan((x) => ({ ...x, busy: false, error: aiErrorMessage(err) }));
    }
  };

  return html`
    <div class="sheet-head">
      <span class="icon-btn-spacer" />
      <span class="sheet-head-title">${isNew ? 'New supplement' : 'Edit supplement'}</span>
      <button type="button" class="icon-btn" onClick=${close} aria-label="Close"><${Icon} name="close" /></button>
    </div>
    <div class="sheet-body form">
      <${SuppSearch} onPick=${useFound} />
      ${found && html`<p class="ai-note"><${Icon} name="check" size=${17} /><span>Filled in from the NIH label database${found.serving ? `, for one serving (${found.serving})` : ''}. Check it matches your bottle, then save.</span></p>`}

      <div class="scan-label">
        <input ref=${fileRef} type="file" accept="image/*" capture="environment" hidden onChange=${onPhoto} />
        ${DEMO
          ? html`<button type="button" class="btn btn-quiet btn-block" disabled><${Icon} name="camera" size=${18} /> Label scan: about 1¢ in the full version</button>`
          : hasKey
          ? html`<button type="button" class="btn btn-quiet btn-block" disabled=${scan.busy} onClick=${() => fileRef.current.click()}>
              ${scan.busy ? html`<span class="spinner" /> Reading the label…` : html`<${Icon} name="camera" size=${18} /> Scan the label`}
            </button>`
          : html`<button type="button" class="btn btn-quiet btn-block" onClick=${toSettings}><${Icon} name="camera" size=${18} /> Scan the label (add an API key first)</button>`}
        ${scan.photo && html`<img class="label-thumb" src=${scan.photo} alt="Supplement label" />`}
        ${scan.error && html`<p class="error">${scan.error}</p>`}
        ${scan.note && html`<p class="ai-note"><${Icon} name="sparkle" size=${17} /><span>${scan.note} Check the numbers against the label before saving.</span></p>`}
      </div>

      ${isNew && html`
        <p class="list-label">Or start from</p>
        <div class="chips">${SUPP_PRESETS.map((pr) => html`<button type="button" class="chip" onClick=${() => usePreset(pr)}>${pr.name}</button>`)}</div>`}

      <label class="field"><span class="field-label">Name</span>
        <input type="text" value=${name} onInput=${(e) => setName(e.currentTarget.value)} placeholder="e.g. Vitamin D3, Creatine, Fish oil" /></label>

      <p class="list-label">Vitamins & minerals Plate tracks <span class="field-hint">per daily dose · vitamin D: 1 µg = 40 IU</span></p>
      ${shown.length > 0 && html`
        <div class="field-grid">
          ${shown.map((m) => html`<${NumberInput} className="field" label=${m.name} value=${n[m.key] ?? ''} suffix=${m.unit} onChange=${(v) => setN({ ...n, [m.key]: v })} />`)}
        </div>`}
      ${!showAll && html`<button type="button" class="link" onClick=${() => setShowAll(true)}>${shown.length ? 'Show all vitamins & minerals' : 'Enter vitamins & minerals'}</button>`}

      <p class="list-label">Anything else <span class="field-hint">creatine, fish oil, biotin, herbs…</span></p>
      ${extra.length > 0 && html`
        <ul class="extra-list">
          ${extra.map((x, i) => html`
            <li class="extra-row">
              <input type="text" class="extra-name" value=${x.name} placeholder="Ingredient" aria-label="Ingredient" onInput=${(e) => setRow(i, { name: e.currentTarget.value })} />
              <${NumberInput} className="extra-amt" value=${x.amount} onChange=${(v) => setRow(i, { amount: v })} placeholder="0" />
              <select class="select extra-unit" value=${UNITS.includes(x.unit) ? x.unit : 'mg'} onChange=${(e) => setRow(i, { unit: e.currentTarget.value })} aria-label="Unit">
                ${UNITS.map((u) => html`<option value=${u}>${u}</option>`)}
              </select>
              <button type="button" class="icon-btn sm" onClick=${() => setExtra(extra.filter((_, j) => j !== i))} aria-label="Remove"><${Icon} name="close" size=${16} /></button>
            </li>`)}
        </ul>`}
      <button type="button" class="btn btn-quiet btn-block" onClick=${() => setExtra([...extra, { name: '', amount: '', unit: 'mg' }])}>
        <${Icon} name="plus" size=${18} /> Add an ingredient
      </button>
      <p class="fine">Ingredients without a daily target are still totaled for each day on the Nutrients screen.</p>
    </div>
    <div class="sheet-foot ${isNew ? '' : 'two'}">
      ${!isNew && html`<button type="button" class="btn btn-quiet danger" onClick=${() => { deleteSupplement(supp.id); close(); }}><${Icon} name="trash" size=${18} /> Delete</button>`}
      <button type="button" class="btn btn-primary ${isNew ? 'btn-block' : ''}" disabled=${!valid || scan.busy} onClick=${save}>Save</button>
    </div>`;
}

// Search U.S. supplement labels by name and brand, and fill the form from the one picked.
function SuppSearch({ onPick }) {
  const [q, setQ] = useState('');
  const [res, setRes] = useState({ busy: false, items: null, error: '', loading: null });
  const term = q.trim();

  useEffect(() => {
    if (term.length < 3) { setRes((r) => ({ ...r, busy: false, items: null, error: '' })); return; }
    let stale = false;
    setRes((r) => ({ ...r, busy: true, error: '' }));
    const timer = setTimeout(async () => {
      try {
        const items = await searchSupplements(term);
        if (!stale) setRes((r) => ({ ...r, busy: false, items }));
      } catch {
        if (!stale) setRes((r) => ({ ...r, busy: false, items: null, error: "Couldn't search right now. Check your connection, or enter it below." }));
      }
    }, 350);
    return () => { stale = true; clearTimeout(timer); };
  }, [term]);

  const pick = async (item) => {
    setRes((r) => ({ ...r, loading: item.id, error: '' }));
    try {
      const sp = await loadSupplement(item.id);
      if (!Object.keys(sp.n).length && !sp.extra.length) throw new Error('empty');
      onPick(sp);
      setQ('');
      setRes({ busy: false, items: null, error: '', loading: null });
    } catch {
      setRes((r) => ({ ...r, loading: null, error: "Couldn't load that label. Try another one, or enter it below." }));
    }
  };

  return html`
    <div class="supp-search">
      <div class="search-bar">
        <${Icon} name="search" size=${19} />
        <input type="search" placeholder="Search by name or brand, e.g. Centrum Men" value=${q}
          onInput=${(e) => setQ(e.currentTarget.value)} enterkeyhint="search" autocomplete="off" autocorrect="off" spellcheck=${false} />
        ${q && html`<button type="button" class="icon-btn sm" onClick=${() => setQ('')} aria-label="Clear"><${Icon} name="close" size=${16} /></button>`}
      </div>
      ${res.busy && html`<p class="loading-line"><span class="spinner" /> Searching…</p>`}
      ${res.error && html`<p class="error">${res.error}</p>`}
      ${!res.busy && res.items && res.items.length === 0 && html`<p class="fine">No labels found. Try just the brand, or enter it below.</p>`}
      ${!res.busy && res.items?.length > 0 && html`
        <ul class="food-list">
          ${res.items.map((x) => html`
            <li>
              <button type="button" class="food-row" disabled=${!!res.loading} onClick=${() => pick(x)}>
                <span class="entry-main">
                  <span class="entry-name">${x.name}</span>
                  <span class="entry-sub">${[x.brand, x.off && 'no longer sold'].filter(Boolean).join(' · ')}</span>
                </span>
                ${res.loading === x.id && html`<span class="spinner" />`}
              </button>
            </li>`)}
        </ul>`}
    </div>`;
}
