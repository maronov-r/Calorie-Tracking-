import { html, useState, useRef } from '../vendor/preact.js';
import { useStore, saveSupplement, deleteSupplement } from '../store.js';
import { Icon, Sheet, NumberInput } from '../ui.js';
import { N, SUPP_FIELDS, SUPP_PRESETS, fmtNum } from '../nutrients.js';
import { readSupplementLabel, prepareImage, aiErrorMessage } from '../ai.js';

// One line for lists: tracked nutrients first, then anything else on the label.
export function suppSummary(sp) {
  const parts = [
    ...Object.entries(sp.n || {}).filter(([, v]) => v > 0).map(([k, v]) => `${N[k].sym || N[k].name} ${fmtNum(v)} ${N[k].unit}`),
    ...(sp.extra || []).filter((x) => x.name && x.amount > 0).map((x) => `${x.name} ${fmtNum(x.amount)} ${x.unit}`),
  ];
  if (!parts.length) return 'Nothing entered yet';
  return parts.length > 4 ? `${parts.slice(0, 4).join(' · ')} +${parts.length - 4} more` : parts.join(' · ');
}

export function SupplementSheet({ supp, onClose, toSettings }) {
  return html`<${Sheet} onClose=${onClose} className="sheet-tall" label="Supplement"
    render=${(close) => html`<${SupplementForm} supp=${supp} close=${close} toSettings=${() => { close(); setTimeout(toSettings, 240); }} />`} />`;
}

const UNITS = ['mg', 'µg', 'g', 'IU', 'billion CFU'];

function SupplementForm({ supp, close, toSettings }) {
  const s = useStore();
  const [name, setName] = useState(supp.name || '');
  const [n, setN] = useState(supp.n || {});
  const [extra, setExtra] = useState(supp.extra?.length ? supp.extra : []);
  const [showAll, setShowAll] = useState(false);
  const [scan, setScan] = useState({ busy: false, error: '', note: '', photo: null });
  const fileRef = useRef();
  const isNew = !supp.id;
  const hasKey = !!s.settings.apiKey;

  const usePreset = (pr) => { setName(pr.name); setN(pr.n || {}); setExtra(pr.extra || []); };
  const setRow = (i, patch) => setExtra((cur) => cur.map((x, j) => (j === i ? { ...x, ...patch } : x)));
  const cleanExtra = extra.filter((x) => x.name.trim() && x.amount > 0).map((x) => ({ name: x.name.trim(), amount: +x.amount, unit: x.unit || 'mg' }));
  const valid = name.trim() && (Object.values(n).some((v) => v > 0) || cleanExtra.length > 0);
  // Fields with an amount always show; the rest stay folded away until asked for.
  const shown = showAll ? SUPP_FIELDS : SUPP_FIELDS.filter((f) => n[f.key] > 0);

  const save = () => {
    const clean = {};
    for (const [k, v] of Object.entries(n)) if (v > 0) clean[k] = v;
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
      <div class="scan-label">
        <input ref=${fileRef} type="file" accept="image/*" capture="environment" hidden onChange=${onPhoto} />
        ${hasKey
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
