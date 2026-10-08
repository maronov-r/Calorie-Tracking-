import { html, useState, useRef, useEffect } from '../vendor/preact.js';
import {
  useStore, state, setProfile, setSettings, setWeight, getTargets, THEMES, saveSupplement, deleteSupplement,
  exportData, importData, eraseAll, toast, dateKey as todayKey,
} from '../store.js';
import { Icon, Segmented, NumberInput, Sheet } from '../ui.js';
import { ACTIVITY, GOALS, ML_PER_OZ, MICROS, N, SUPP_PRESETS, fmtNum, computeTargets, KG_PER_LB } from '../nutrients.js';
import { AI_MODELS } from '../ai.js';


// Profile inputs, shared by onboarding and settings. Calls onChange only with valid values.
export function ProfileFields({ profile, onChange, units }) {
  const p = profile;
  const totalIn = p.heightCm ? p.heightCm / 2.54 : 0;
  // Feet and inches live in a ref so two quick edits never combine stale values.
  const h = useRef({ ft: totalIn ? Math.floor(Math.round(totalIn) / 12) : '', inch: totalIn ? Math.round(totalIn) % 12 : '' });
  const [, rerender] = useState(0);
  const { ft, inch } = h.current;
  const setHeightUS = (patch) => {
    h.current = { ...h.current, ...patch };
    rerender((n) => n + 1);
    const total = (+h.current.ft || 0) * 12 + (+h.current.inch || 0);
    if (h.current.ft > 0 && total > 36) onChange({ heightCm: +(total * 2.54).toFixed(1) });
  };
  const lb = p.weightKg ? +(p.weightKg / KG_PER_LB).toFixed(1) : '';

  return html`
    <div class="profile-fields">
      <div class="field">
        <span class="field-label">Sex <span class="field-hint">for calorie and vitamin targets</span></span>
        <${Segmented} options=${[{ value: 'female', label: 'Female' }, { value: 'male', label: 'Male' }]} value=${p.sex} onChange=${(v) => onChange({ sex: v })} />
      </div>
      <div class="field-row">
        <${NumberInput} className="field" label="Age" value=${p.age} suffix="years"
          onChange=${(v) => v >= 14 && v <= 110 && onChange({ age: Math.round(v) })} />
        ${units === 'metric'
          ? html`<${NumberInput} className="field" label="Weight" value=${p.weightKg} suffix="kg"
              onChange=${(v) => v >= 30 && v <= 350 && onChange({ weightKg: v })} />`
          : html`<${NumberInput} className="field" label="Weight" value=${lb} suffix="lb"
              onChange=${(v) => v >= 66 && v <= 770 && onChange({ weightKg: +(v * KG_PER_LB).toFixed(2) })} />`}
      </div>
      ${units === 'metric'
        ? html`<${NumberInput} className="field" label="Height" value=${p.heightCm} suffix="cm"
            onChange=${(v) => v >= 100 && v <= 250 && onChange({ heightCm: v })} />`
        : html`
          <div class="field-row">
            <${NumberInput} className="field" label="Height" value=${ft} suffix="ft" onChange=${(v) => setHeightUS({ ft: v })} />
            <${NumberInput} className="field" label=" " value=${inch} suffix="in" onChange=${(v) => setHeightUS({ inch: v })} />
          </div>`}
    </div>`;
}

export const ChoiceList = ({ options, value, onChange }) => html`
  <div class="choices" role="radiogroup">
    ${options.map((o) => html`
      <button type="button" role="radio" aria-checked=${o.value === value} class="choice ${o.value === value ? 'on' : ''}" onClick=${() => onChange(o.value)}>
        <span class="choice-text"><span class="choice-label">${o.label}</span>${o.hint && html`<span class="choice-hint">${o.hint}</span>`}</span>
        <span class="choice-dot" />
      </button>`)}
  </div>`;

export function SettingsView({ go, section }) {
  useEffect(() => {
    if (section) document.getElementById(section)?.scrollIntoView({ block: 'start' });
  }, [section]);
  const s = useStore();
  const p = s.profile;
  const units = s.settings.units;
  const t = getTargets();
  const ov = s.settings.overrides || {};
  const [editing, setEditing] = useState(null);
  const [confirmErase, setConfirmErase] = useState(false);
  const [showKey, setShowKey] = useState(false);
  const importRef = useRef();

  // A weight typed here counts as today's weigh-in, so the trend and targets stay in sync.
  const upd = ({ weightKg, ...patch }) => {
    if (weightKg) setWeight(todayKey(), weightKg);
    if (Object.keys(patch).length) setProfile({ ...state.profile, ...patch });
  };
  const setOv = (k, v) => setSettings({ overrides: { ...ov, [k]: v > 0 ? v : undefined } });
  // What each target would be without its own override (carbs and fat follow the calorie/protein targets).
  const auto = computeTargets(p, {});
  const autoSplit = computeTargets(p, { kcal: ov.kcal, protein: ov.protein });
  const waterVal = ov.water ? (units === 'metric' ? ov.water : Math.round(ov.water / ML_PER_OZ)) : '';
  const autoWater = units === 'metric' ? auto.water : Math.round(auto.water / ML_PER_OZ);

  const doExport = async () => {
    const data = JSON.stringify(exportData());
    const name = `plate-backup-${new Date().toISOString().slice(0, 10)}.json`;
    const file = new File([data], name, { type: 'application/json' });
    try {
      if (navigator.canShare?.({ files: [file] })) { await navigator.share({ files: [file], title: 'Plate backup' }); return; }
    } catch (e) { if (e.name === 'AbortError') return; }
    const a = document.createElement('a');
    a.href = URL.createObjectURL(file);
    a.download = name;
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 2000);
  };

  const doImport = async (e) => {
    const file = e.currentTarget.files?.[0];
    e.currentTarget.value = '';
    if (!file) return;
    try {
      await importData(JSON.parse(await file.text()));
      toast('Backup restored');
    } catch (err) {
      toast(err.message.includes('Plate') ? err.message : "That file couldn't be read.");
    }
  };

  return html`
    <header class="page-head">
      <h1 class="title">Settings</h1>
    </header>

    <section class="card set-section">
      <h2 class="card-title">Look</h2>
      <div class="themes">
        ${THEMES.map((th) => html`
          <button type="button" class="theme ${th.value === s.settings.theme ? 'on' : ''}" onClick=${() => setSettings({ theme: th.value })} aria-pressed=${th.value === s.settings.theme}>
            <span class="theme-swatch" style=${{ background: th.swatch[0] }}>
              <i style=${{ background: th.swatch[1] }} /><i style=${{ background: th.swatch[2] }} />
            </span>
            <span class="theme-name">${th.label}</span>
            <span class="theme-hint">${th.hint}</span>
          </button>`)}
      </div>
      <div class="set-row">
        <span>Units</span>
        <${Segmented} className="seg-sm" options=${[{ value: 'us', label: 'US' }, { value: 'metric', label: 'Metric' }]} value=${units} onChange=${(v) => setSettings({ units: v })} />
      </div>
    </section>

    <section class="card set-section">
      <h2 class="card-title">About you</h2>
      <${ProfileFields} key=${units} profile=${p} onChange=${upd} units=${units} />
      <div class="field">
        <span class="field-label">Activity</span>
        <select class="select" value=${p.activity} onChange=${(e) => upd({ activity: e.currentTarget.value })}>
          ${ACTIVITY.map((a) => html`<option value=${a.value}>${a.label}: ${a.hint}</option>`)}
        </select>
      </div>
      <div class="field">
        <span class="field-label">Goal</span>
        <select class="select" value=${p.goal} onChange=${(e) => upd({ goal: e.currentTarget.value })}>
          ${GOALS.map((g) => html`<option value=${g.value}>${g.label} · ${g.hint}</option>`)}
        </select>
      </div>
    </section>

    <section class="card set-section">
      <h2 class="card-title">Daily targets</h2>
      <p class="fine">Worked out from your details (you burn about ${fmtNum(t.auto.tdee)} kcal a day). Type a number to override one, or clear it to go back to automatic.</p>
      <div class="field-grid">
        <${NumberInput} className="field" label="Calories" value=${ov.kcal || ''} placeholder=${`${auto.kcal} auto`} suffix="kcal" onChange=${(v) => setOv('kcal', v)} />
        <${NumberInput} className="field" label="Protein" value=${ov.protein || ''} placeholder=${`${auto.protein} auto`} suffix="g" onChange=${(v) => setOv('protein', v)} />
        <${NumberInput} className="field" label="Carbs" value=${ov.carbs || ''} placeholder=${`${autoSplit.carbs} auto`} suffix="g" onChange=${(v) => setOv('carbs', v)} />
        <${NumberInput} className="field" label="Fat" value=${ov.fat || ''} placeholder=${`${autoSplit.fat} auto`} suffix="g" onChange=${(v) => setOv('fat', v)} />
        <${NumberInput} className="field" label="Water" value=${waterVal} placeholder=${`${autoWater} auto`} suffix=${units === 'metric' ? 'ml' : 'oz'}
          onChange=${(v) => setOv('water', v > 0 ? (units === 'metric' ? v : Math.round(v * ML_PER_OZ)) : '')} />
      </div>
    </section>

    <section class="card set-section" id="ai">
      <h2 class="card-title">AI food logging</h2>
      <p class="fine">Describe a meal or snap a photo and Claude estimates it, vitamins included. It uses your own Anthropic API key, which never leaves this phone except to talk to Anthropic. You pay per use, with no subscription.</p>
      <label class="field">
        <span class="field-label">Anthropic API key</span>
        <span class="key-wrap">
          <input type=${showKey ? 'text' : 'password'} value=${s.settings.apiKey} placeholder="sk-ant-…" autocomplete="off" autocapitalize="off" spellcheck=${false}
            onInput=${(e) => setSettings({ apiKey: e.currentTarget.value.trim() })} />
          <button type="button" class="link" onClick=${() => setShowKey(!showKey)}>${showKey ? 'Hide' : 'Show'}</button>
        </span>
      </label>
      <a class="link-out" href="https://console.anthropic.com/settings/keys" target="_blank" rel="noopener">Get a key at console.anthropic.com</a>
      <div class="field">
        <span class="field-label">Model</span>
        <${ChoiceList} options=${AI_MODELS.map((m) => ({ value: m.id, label: m.label, hint: m.hint }))} value=${s.settings.model} onChange=${(v) => setSettings({ model: v })} />
      </div>
    </section>

    <section class="card set-section">
      <h2 class="card-title">Supplements</h2>
      <p class="fine">Add what you take, then tick it off on the Today screen. It counts toward your vitamins and minerals.</p>
      ${s.supplements.length > 0 && html`
        <ul class="supp-list">
          ${s.supplements.map((sp) => html`
            <li><button type="button" class="supp-item" onClick=${() => setEditing(sp)}>
              <span class="entry-main"><span class="entry-name">${sp.name}</span><span class="entry-sub">${suppSummary(sp)}</span></span>
              <${Icon} name="edit" size=${18} />
            </button></li>`)}
        </ul>`}
      <button type="button" class="btn btn-quiet btn-block" onClick=${() => setEditing({})}><${Icon} name="plus" size=${18} /> Add a supplement</button>
    </section>

    <section class="card set-section">
      <h2 class="card-title">Your data</h2>
      <p class="fine">Everything is stored only on this phone. Export a backup every so often, for example to Files or iCloud Drive.</p>
      <button type="button" class="btn btn-quiet btn-block" onClick=${doExport}><${Icon} name="download" size=${18} /> Export backup</button>
      <button type="button" class="btn btn-quiet btn-block" onClick=${() => importRef.current.click()}><${Icon} name="upload" size=${18} /> Restore from backup</button>
      <input ref=${importRef} type="file" accept="application/json,.json" hidden onChange=${doImport} />
      <button type="button" class="btn btn-quiet btn-block danger" onClick=${() => (confirmErase ? eraseAll() : setConfirmErase(true))}>
        ${confirmErase ? 'Tap again to erase everything' : 'Erase all data'}
      </button>
    </section>

    <p class="fine center colophon">
      Plate · Food data from USDA FoodData Central and Open Food Facts (ODbL).<br />
      Targets follow the U.S. Dietary Reference Intakes. This isn’t medical advice.
    </p>

    ${editing && html`<${SupplementSheet} supp=${editing} onClose=${() => setEditing(null)} />`}
  `;
}

function suppSummary(sp) {
  const parts = Object.entries(sp.n || {}).filter(([, v]) => v > 0).map(([k, v]) => `${N[k].sym || N[k].name} ${fmtNum(v)} ${N[k].unit}`);
  if (!parts.length) return 'No nutrients entered';
  return parts.length > 4 ? `${parts.slice(0, 4).join(' · ')} +${parts.length - 4} more` : parts.join(' · ');
}

function SupplementSheet({ supp, onClose }) {
  return html`<${Sheet} onClose=${onClose} className="sheet-tall" label="Supplement"
    render=${(close) => html`<${SupplementForm} supp=${supp} close=${close} />`} />`;
}

function SupplementForm({ supp, close }) {
  const [name, setName] = useState(supp.name || '');
  const [n, setN] = useState(supp.n || {});
  const isNew = !supp.id;
  const usePreset = (pr) => { setName(pr.name); setN(pr.n); };
  const valid = name.trim() && Object.values(n).some((v) => v > 0);
  const save = () => {
    const clean = {};
    for (const [k, v] of Object.entries(n)) if (v > 0) clean[k] = v;
    saveSupplement({ ...supp, name: name.trim(), n: clean });
    close();
  };

  return html`
    <div class="sheet-head">
      <span class="icon-btn-spacer" />
      <span class="sheet-head-title">${isNew ? 'New supplement' : 'Edit supplement'}</span>
      <button type="button" class="icon-btn" onClick=${close} aria-label="Close"><${Icon} name="close" /></button>
    </div>
    <div class="sheet-body form">
      ${isNew && html`
        <p class="list-label">Start from</p>
        <div class="chips">${SUPP_PRESETS.map((pr) => html`<button type="button" class="chip" onClick=${() => usePreset(pr)}>${pr.name}</button>`)}</div>`}
      <label class="field"><span class="field-label">Name</span>
        <input type="text" value=${name} onInput=${(e) => setName(e.currentTarget.value)} placeholder="e.g. Vitamin D3" /></label>
      <p class="list-label">Amount per daily dose <span class="field-hint">(vitamin D: 1 µg = 40 IU)</span></p>
      <div class="field-grid">
        ${MICROS.map((m) => html`<${NumberInput} className="field" label=${m.name} value=${n[m.key] ?? ''} suffix=${m.unit} onChange=${(v) => setN({ ...n, [m.key]: v })} />`)}
      </div>
    </div>
    <div class="sheet-foot ${isNew ? '' : 'two'}">
      ${!isNew && html`<button type="button" class="btn btn-quiet danger" onClick=${() => { deleteSupplement(supp.id); close(); }}><${Icon} name="trash" size=${18} /> Delete</button>`}
      <button type="button" class="btn btn-primary ${isNew ? 'btn-block' : ''}" disabled=${!valid} onClick=${save}>Save</button>
    </div>`;
}
