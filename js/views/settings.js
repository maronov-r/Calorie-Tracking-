import { html, useState, useRef, useEffect } from '../vendor/preact.js';
import {
  useStore, setSettings, getTargets, THEMES,
  exportData, importData, eraseAll, toast,
} from '../store.js';
import { Icon, Segmented, NumberInput } from '../ui.js';
import { dailyFor, workoutTypeFor, experienceFor, normalizeProfile, ML_PER_OZ, fmtNum, fmtKcal, computeTargets, goalFor, styleFor, KG_PER_LB } from '../nutrients.js';
import { suppSummary } from './supplements.js';
import { AI_MODELS } from '../ai.js';
import { DEMO, PAID } from '../demo.js';
import { CreditCard } from './credit.js';
import { AiCostCard } from './costs.js';
import { SupporterCard } from './supporter.js';
import { SUPPORTER_ON } from '../supporter.js';


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

// What the plan is built from, at a glance.
function AboutSummary({ p: raw, units }) {
  const p = normalizeProfile(raw);
  const inches = Math.round(p.heightCm / 2.54);
  const height = units === 'metric' ? `${Math.round(p.heightCm)} cm` : `${Math.floor(inches / 12)}′${inches % 12}″`;
  const weight = units === 'metric' ? `${p.weightKg.toFixed(1)} kg` : `${(p.weightKg / KG_PER_LB).toFixed(1)} lb`;
  const w = p.workouts;
  const rows = [
    ['Body', `${p.sex === 'male' ? 'Male' : 'Female'} · ${p.age} · ${height} · ${weight}${p.bodyFat ? ` · ${p.bodyFat}% body fat` : ''}`],
    ['Normal day', dailyFor(p.daily).label],
    ['Workouts', w.perWeek ? `${workoutTypeFor(w.type).label} ${w.perWeek}× a week, ${w.minutes} min` : 'None yet'],
    ['Lifting', experienceFor(p.experience).label],
  ];
  return html`<div class="plan-list">${rows.map(([k, v]) => html`<div><span>${k}</span><b>${v}</b></div>`)}</div>`;
}

export const ChoiceList = ({ options, value, onChange }) => html`
  <div class="choices" role="radiogroup">
    ${options.map((o) => html`
      <button type="button" role="radio" aria-checked=${o.value === value} class="choice ${o.value === value ? 'on' : ''}" onClick=${() => onChange(o.value)}>
        <span class="choice-text"><span class="choice-label">${o.label}</span>${o.hint && html`<span class="choice-hint">${o.hint}</span>`}</span>
        <span class="choice-dot" />
      </button>`)}
  </div>`;

export function SettingsView({ go, section, openSheet }) {
  useEffect(() => {
    if (section) document.getElementById(section)?.scrollIntoView({ block: 'start' });
  }, [section]);
  const s = useStore();
  const p = s.profile;
  const units = s.settings.units;
  const t = getTargets();
  const ov = s.settings.overrides || {};
  const [confirmErase, setConfirmErase] = useState(false);
  const [showKey, setShowKey] = useState(false);
  const importRef = useRef();

  const handSet = ['kcal', 'protein', 'carbs', 'fat'].filter((k) => ov[k]);
  const setOv = (k, v) => setSettings({ overrides: { ...ov, [k]: v > 0 ? v : undefined } });
  // What each target would be without its own override (carbs and fat follow the calorie/protein targets).
  const auto = computeTargets(p, {}, t.style);
  const autoSplit = computeTargets(p, { kcal: ov.kcal, protein: ov.protein }, t.style);
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

    ${SUPPORTER_ON && html`<${SupporterCard} />`}

    <section class="card set-section">
      <h2 class="card-title">About you</h2>
      <${AboutSummary} p=${p} units=${units} />
      <button type="button" class="btn btn-quiet btn-block" onClick=${() => openSheet({ type: 'builder' })}><${Icon} name="edit" size=${18} /> Rebuild my plan</button>
      <div class="field">
        <span class="field-label">Goal and eating style</span>
        <button type="button" class="select-row" onClick=${() => openSheet({ type: 'plan' })}>
          <span><b>${goalFor(p.goal).label}</b> · ${styleFor(t.style).label}<small>${fmtKcal(t.kcal)} kcal · ${t.protein} g protein</small></span>
          <${Icon} name="right" size=${18} />
        </button>
      </div>
    </section>

    <section class="card set-section">
      <h2 class="card-title">Daily targets</h2>
      <p class="fine">Worked out from your details (you burn about ${fmtNum(t.auto.tdee)} kcal a day). Type a number to override one, or clear it to go back to automatic.
        <button type="button" class="link" onClick=${() => openSheet({ type: 'plan', tab: 'math' })}>See how</button></p>
      ${handSet.length > 0 && html`
        <div class="tip warn-tip">
          <${Icon} name="info" size=${17} />
          <span>Numbers you type here stay fixed: changing your goal, eating style or weight won't move them.
            <button type="button" class="link" onClick=${() => setSettings({ overrides: { water: ov.water } })}>Use automatic</button></span>
        </div>`}
      <div class="field-grid">
        <${NumberInput} className="field" label="Calories" value=${ov.kcal || ''} placeholder=${`${auto.kcal} auto`} suffix="kcal" onChange=${(v) => setOv('kcal', v)} />
        <${NumberInput} className="field" label="Protein" value=${ov.protein || ''} placeholder=${`${auto.protein} auto`} suffix="g" onChange=${(v) => setOv('protein', v)} />
        <${NumberInput} className="field" label="Carbs" value=${ov.carbs || ''} placeholder=${`${autoSplit.carbs} auto`} suffix="g" onChange=${(v) => setOv('carbs', v)} />
        <${NumberInput} className="field" label="Fat" value=${ov.fat || ''} placeholder=${`${autoSplit.fat} auto`} suffix="g" onChange=${(v) => setOv('fat', v)} />
        <${NumberInput} className="field" label="Water" value=${waterVal} placeholder=${`${autoWater} auto`} suffix=${units === 'metric' ? 'ml' : 'oz'}
          onChange=${(v) => setOv('water', v > 0 ? (units === 'metric' ? v : Math.round(v * ML_PER_OZ)) : '')} />
      </div>
    </section>

    ${PAID ? html`<${CreditCard} openSheet=${openSheet} />` : html`<section class="card set-section" id="ai">
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
    </section>`}
    ${!DEMO && html`<${AiCostCard} />`}

    <section class="card set-section">
      <h2 class="card-title">Supplements</h2>
      <p class="fine">Add what you take, or scan the label, then tick it off on the Today screen. It counts toward your vitamins and minerals, and anything else (creatine, fish oil…) is totaled each day.</p>
      ${s.supplements.length > 0 && html`
        <ul class="supp-list">
          ${s.supplements.map((sp) => html`
            <li><button type="button" class="supp-item" onClick=${() => openSheet({ type: 'supp', supp: sp })}>
              <span class="entry-main"><span class="entry-name">${sp.name}</span><span class="entry-sub">${suppSummary(sp)}</span></span>
              <${Icon} name="edit" size=${18} />
            </button></li>`)}
        </ul>`}
      <button type="button" class="btn btn-quiet btn-block" onClick=${() => openSheet({ type: 'supp', supp: {} })}><${Icon} name="plus" size=${18} /> Add a supplement</button>
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

  `;
}
