import { html, useState } from '../vendor/preact.js';
import { useStore, setWater, getDay, getBottles, saveBottles, getTargets, toast, uid } from '../store.js';
import { Icon, Sheet, NumberInput } from '../ui.js';
import { fmtWater, ML_PER_OZ } from '../nutrients.js';

// Common bottles, so "my Stanley" is one tap to set up.
const PRESETS = [
  { name: 'Stanley', oz: 40, kind: 'tumbler' },
  { name: 'Stanley', oz: 30, kind: 'tumbler' },
  { name: 'Hydro Flask', oz: 32, kind: 'bottle' },
  { name: 'Owala', oz: 24, kind: 'bottle' },
  { name: 'Nalgene', oz: 32, kind: 'bottle' },
  { name: 'Yeti', oz: 26, kind: 'bottle' },
  { name: 'Can', oz: 12, kind: 'glass' },
];

export const fmtSize = (ml, units) => {
  if (units === 'metric') return ml >= 1000 ? `${+(ml / 1000).toFixed(2)} L` : `${Math.round(ml)} ml`;
  return `${+(ml / ML_PER_OZ).toFixed(1)} oz`;
};

function addWater(dateKey, amount, units, what) {
  const before = getDay(dateKey).water || 0;
  setWater(dateKey, before + amount);
  const label = amount < 0 ? `Removed ${fmtSize(-amount, units)}` : `Added ${what ? `${what}, ` : ''}${fmtSize(amount, units)}`;
  toast(label, { label: 'Undo', run: () => setWater(dateKey, before) });
}

const DROP = 'M12 3.5s6 6.4 6 10.9a6 6 0 0 1-12 0c0-4.5 6-10.9 6-10.9z';
const Drop = ({ fill, id }) => html`
  <svg viewBox="0 0 24 24" width="30" height="30" aria-hidden="true">
    <defs><clipPath id=${id}><rect x="0" y=${3.5 + 16.9 * (1 - fill)} width="24" height="24" /></clipPath></defs>
    <path d=${DROP} class="drop-bg" />
    ${fill > 0 && html`<path d=${DROP} class="drop-fill" clip-path=${`url(#${id})`} />`}
  </svg>`;

export function WaterCard({ dateKey, ml, goal, units, openSheet }) {
  const bottles = getBottles();
  const glass = units === 'metric' ? 250 : 8 * ML_PER_OZ;
  let per = glass;
  let count = Math.ceil(goal / per - 0.01);
  if (count > 12) { per = glass * 2; count = Math.ceil(goal / per - 0.01); }
  const filled = ml / per;
  const tap = (i) => {
    const target = (i + 1) * per;
    setWater(dateKey, Math.abs(ml - target) < 2 ? i * per : target);
  };
  const done = ml >= goal - 1;
  return html`
    <section class="card water">
      <div class="card-head">
        <h2 class="card-title"><span class="title-icon" style=${{ color: 'var(--water)' }}><${Icon} name="drop" size=${18} /></span>Water</h2>
        <span class="card-meta"><b>${fmtWater(ml, units)}</b> / ${fmtWater(goal, units)}${done ? ' ✓' : ''}</span>
      </div>
      <div class="drops" style=${{ gridTemplateColumns: `repeat(${Math.min(count, 12)}, 1fr)` }}>
        ${Array.from({ length: count }, (_, i) => html`
          <button type="button" class="drop" onClick=${() => tap(i)} aria-label=${`Set water to ${fmtWater((i + 1) * per, units)}`}>
            <${Drop} fill=${Math.max(0, Math.min(1, filled - i))} id=${`drop-${i}`} />
          </button>`)}
      </div>
      <div class="bottle-row">
        ${bottles.map((b) => html`
          <button type="button" class="chip bottle-chip" onClick=${() => addWater(dateKey, b.ml, units, b.name)}>
            <${Icon} name=${b.kind || 'bottle'} size=${17} /> ${b.name} <b>${fmtSize(b.ml, units)}</b>
          </button>`)}
        <button type="button" class="chip icon-chip" onClick=${() => openSheet({ type: 'water' })} aria-label="More water options">
          <${Icon} name="more" size=${18} />
        </button>
      </div>
    </section>`;
}

export function WaterSheet({ dateKey, onClose }) {
  return html`<${Sheet} onClose=${onClose} className="sheet-tall" label="Water"
    render=${(close) => html`<${WaterPanel} dateKey=${dateKey} close=${close} />`} />`;
}

function WaterPanel({ dateKey, close }) {
  const s = useStore();
  const units = s.settings.units;
  const unit = units === 'metric' ? 'ml' : 'oz';
  const toMl = (v) => (units === 'metric' ? v : v * ML_PER_OZ);
  const ml = getDay(dateKey).water || 0;
  const bottles = getBottles();
  const [amount, setAmount] = useState('');
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState('');
  const [size, setSize] = useState('');

  const addBottle = (b) => {
    saveBottles([{ id: uid(), ...b }, ...bottles]); // newest first: it is usually the one you carry
    toast(`${b.name} added`);
  };
  const addCustom = () => {
    const sizeMl = Math.round(toMl(+size));
    addBottle({ name: name.trim(), ml: sizeMl, kind: sizeMl > 400 ? 'bottle' : 'glass' });
    setName('');
    setSize('');
  };
  const presetMl = (p) => (units === 'metric' ? Math.round(p.oz * ML_PER_OZ / 10) * 10 : Math.round(p.oz * ML_PER_OZ));
  const unused = PRESETS.filter((p) => !bottles.some((b) => b.name === p.name && Math.abs(b.ml - presetMl(p)) < 15));
  const goal = getTargets(dateKey).water;

  return html`
    <div class="sheet-head">
      <span class="icon-btn-spacer" />
      <span class="sheet-head-title">Water</span>
      <button type="button" class="icon-btn" onClick=${close} aria-label="Close"><${Icon} name="close" /></button>
    </div>
    <div class="sheet-body form">
      <div class="water-total">
        <span class="water-num">${fmtWater(ml, units)}</span>
        <span class="fine">of ${fmtWater(goal, units)}</span>
      </div>

      <p class="list-label">Any amount</p>
      <div class="water-amount">
        <${NumberInput} className="field" value=${amount} onChange=${setAmount} placeholder=${units === 'metric' ? '330' : '12'} suffix=${unit} />
        <button type="button" class="btn btn-quiet" disabled=${!(amount > 0) || ml <= 0}
          onClick=${() => { addWater(dateKey, -Math.min(ml, toMl(amount)), units); setAmount(''); }}>Remove</button>
        <button type="button" class="btn btn-primary" disabled=${!(amount > 0)}
          onClick=${() => { addWater(dateKey, toMl(amount), units); setAmount(''); }}>Add</button>
      </div>

      <div class="list-head">
        <p class="list-label">Your bottles</p>
        ${bottles.length > 0 && html`<button type="button" class="link" onClick=${() => setEditing(!editing)}>${editing ? 'Done' : 'Edit'}</button>`}
      </div>
      <ul class="bottles">
        ${bottles.map((b) => html`
          <li class="bottle">
            <span class="bottle-icon"><${Icon} name=${b.kind || 'bottle'} size=${22} /></span>
            <span class="entry-main"><span class="entry-name">${b.name}</span><span class="entry-sub">${fmtSize(b.ml, units)}</span></span>
            ${editing
              ? html`<button type="button" class="icon-btn sm danger" onClick=${() => saveBottles(bottles.filter((x) => x.id !== b.id))} aria-label=${`Remove ${b.name}`}><${Icon} name="trash" size=${18} /></button>`
              : html`<span class="fracs">
                  ${[[0.25, '¼'], [0.5, '½'], [1, 'Full']].map(([f, l]) => html`
                    <button type="button" class="chip" onClick=${() => addWater(dateKey, b.ml * f, units, f === 1 ? b.name : `${l} ${b.name}`)}>${l}</button>`)}
                </span>`}
          </li>`)}
      </ul>
      ${!bottles.length && html`<p class="fine">No bottles yet. Add the one you use most.</p>`}

      <p class="list-label">Add a bottle</p>
      ${unused.length > 0 && html`
        <div class="chips">
          ${unused.map((p) => html`<button type="button" class="chip" onClick=${() => addBottle({ name: p.name, ml: presetMl(p), kind: p.kind })}>
            <${Icon} name="plus" size=${14} stroke=${2.2} /> ${p.name} ${units === 'metric' ? fmtSize(presetMl(p), units) : `${p.oz} oz`}</button>`)}
        </div>`}
      <div class="bottle-form">
        <label class="field"><span class="field-label">Name</span>
          <input type="text" value=${name} onInput=${(e) => setName(e.currentTarget.value)} placeholder="e.g. Gym bottle" /></label>
        <${NumberInput} className="field" label="Holds" value=${size} onChange=${setSize} suffix=${unit} />
        <button type="button" class="btn btn-quiet" disabled=${!name.trim() || !(size > 0)} onClick=${addCustom}>Add</button>
      </div>
      <p class="fine">Bottles show up on Today. Tap one to log it, or use ¼ and ½ here when you only drank part of it.</p>
    </div>`;
}
