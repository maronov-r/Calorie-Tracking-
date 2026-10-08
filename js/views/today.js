import { html, useState, useEffect } from '../vendor/preact.js';
import {
  useStore, getDay, getTargets, totalsFor, weekAverage, MEALS, setWater, toggleSupp, setSettings,
  dateKey as todayKey, shiftKey, parseKey, updateEntry, removeEntry, addEntries, toast, latestWeighIn,
} from '../store.js';
import { Ring, Bar, Icon, Stepper, Segmented, Sheet, NutritionSummary, statusColor } from '../ui.js';
import {
  fmtKcal, fmtWater, fmtWeight, ML_PER_OZ, MICROS, VITAMINS, MINERALS, status, fmtQty, scale, isGaining,
} from '../nutrients.js';
import { describeAmount } from '../foods.js';

const WEEKDAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

export function dayTitle(key) {
  const today = todayKey();
  if (key === today) return 'Today';
  if (key === shiftKey(today, -1)) return 'Yesterday';
  return WEEKDAYS[parseKey(key).getDay()];
}

export function dateLine(key) {
  const d = parseKey(key);
  const opts = { weekday: 'long', month: 'long', day: 'numeric' };
  if (d.getFullYear() !== new Date().getFullYear()) opts.year = 'numeric';
  return d.toLocaleDateString('en-US', opts);
}

const isIOS = /iphone|ipad|ipod/i.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
const standalone = navigator.standalone || matchMedia('(display-mode: standalone)').matches;

export function Today({ dateKey, setDateKey, openSheet, go }) {
  const s = useStore();
  const t = getTargets();
  const day = getDay(dateKey);
  const totals = totalsFor(dateKey);
  const week = weekAverage(dateKey);
  const today = todayKey();
  const latest = latestWeighIn();

  return html`
    <header class="page-head">
      <div>
        <h1 class="title">${dayTitle(dateKey)}</h1>
        <p class="subtitle">${dateLine(dateKey)}</p>
      </div>
      <div class="head-actions">
        ${dateKey !== today
          ? html`<button type="button" class="chip" onClick=${() => setDateKey(today)}>Back to today</button>`
          : html`<button type="button" class="chip weigh-chip ${latest?.key === today ? 'done' : ''}" onClick=${() => openSheet({ type: 'weigh' })}
              aria-label=${latest ? `Weigh in. Last: ${fmtWeight(latest.kg, s.settings.units)}` : 'Weigh in'}>
              <${Icon} name=${latest?.key === today ? 'check' : 'scale'} size=${16} stroke=${latest?.key === today ? 2.4 : 1.8} />
              ${latest ? fmtWeight(latest.kg, s.settings.units) : 'Weigh in'}
            </button>`}
      </div>
    </header>

    <${WeekStrip} dateKey=${dateKey} setDateKey=${setDateKey} today=${today} goal=${t.kcal} />

    ${isIOS && !standalone && !s.settings.hideInstallHint && html`
      <div class="hint-card">
        <${Icon} name="share" size=${20} />
        <p>Install Plate: tap <b>Share</b>, then <b>Add to Home Screen</b>. It opens full-screen, works offline, and keeps your data safer.</p>
        <button type="button" class="icon-btn sm" onClick=${() => setSettings({ hideInstallHint: true })} aria-label="Dismiss"><${Icon} name="close" size=${16} /></button>
      </div>`}

    <${CalorieCard} totals=${totals} t=${t} gaining=${isGaining(s.profile.goal)} openNutrient=${(key) => openSheet({ type: 'nutrient', key })} />
    <${WaterCard} dateKey=${dateKey} ml=${day.water || 0} goal=${t.water} units=${s.settings.units} />
    <${MicroCard} totals=${totals} t=${t} week=${week} hasFood=${day.entries.length > 0}
      openNutrient=${(key) => openSheet({ type: 'nutrient', key })} go=${go} />
    ${s.supplements.length > 0 && html`<${SuppCard} supps=${s.supplements} taken=${day.supps || []} dateKey=${dateKey} />`}
    <${Meals} day=${day} openSheet=${openSheet} />
  `;
}

function WeekStrip({ dateKey, setDateKey, today, goal }) {
  const dow = (parseKey(dateKey).getDay() + 6) % 7; // Monday first
  const start = shiftKey(dateKey, -dow);
  const days = Array.from({ length: 7 }, (_, i) => shiftKey(start, i));
  const canNext = shiftKey(start, 7) <= today;
  const next = () => { const k = shiftKey(dateKey, 7); setDateKey(k > today ? today : k); };
  return html`
    <div class="week">
      <button type="button" class="week-nav" onClick=${() => setDateKey(shiftKey(dateKey, -7))} aria-label="Previous week"><${Icon} name="left" size=${18} /></button>
      <div class="week-days">
        ${days.map((k, i) => {
          const future = k > today;
          const kcal = future ? 0 : totalsFor(k).kcal || 0;
          return html`
            <button type="button" class="wd ${k === dateKey ? 'sel' : ''} ${k === today ? 'is-today' : ''}" disabled=${future}
              onClick=${() => setDateKey(k)} aria-label=${dateLine(k)}>
              <span class="wd-letter">${'MTWTFSS'[i]}</span>
              <${Ring} value=${kcal} max=${goal} size=${36} stroke=${3.5} color=${kcal > goal * 1.05 ? 'var(--over)' : 'var(--accent)'}>
                <span class="wd-num">${parseKey(k).getDate()}</span>
              <//>
            </button>`;
        })}
      </div>
      <button type="button" class="week-nav" disabled=${!canNext} onClick=${next} aria-label="Next week"><${Icon} name="right" size=${18} /></button>
    </div>`;
}

const MACRO_ROWS = [['carbs', 'Carbs'], ['fat', 'Fat']];

// Calories and protein side by side: the two numbers that matter most for building muscle.
function CalorieCard({ totals, t, gaining, openNutrient }) {
  const eaten = totals.kcal || 0;
  const left = t.kcal - eaten;
  const over = left < 0;
  const protein = totals.protein || 0;
  const proteinLeft = t.protein - protein;
  const proteinHit = proteinLeft <= 0;
  return html`
    <section class="card hero">
      <div class="duo">
        <button type="button" class="duo-item" onClick=${() => openNutrient('kcal')}>
          <${Ring} value=${eaten} max=${t.kcal} size=${148} stroke=${12} color=${over ? 'var(--over)' : 'var(--accent)'} className="glow">
            <span class="ring-num">${fmtKcal(Math.abs(left))}</span>
            <span class="ring-label">${over ? 'kcal over' : gaining ? 'kcal to go' : 'kcal left'}</span>
          <//>
          <span class="duo-cap"><b>${fmtKcal(eaten)}</b> / ${fmtKcal(t.kcal)} kcal</span>
        </button>
        <button type="button" class="duo-item" onClick=${() => openNutrient('protein')}>
          <${Ring} value=${protein} max=${t.protein} size=${148} stroke=${12} color="var(--protein)" className="glow-protein">
            ${proteinHit
              ? html`<span class="ring-check"><${Icon} name="check" size=${30} stroke=${2.6} /></span><span class="ring-label">protein hit</span>`
              : html`<span class="ring-num">${Math.ceil(proteinLeft)}<small>g</small></span><span class="ring-label">protein to go</span>`}
          <//>
          <span class="duo-cap"><b>${Math.round(protein)}</b> / ${t.protein} g protein</span>
        </button>
      </div>
      <div class="macros two">
        ${MACRO_ROWS.map(([k, label]) => html`
          <div class="macro">
            <span class="macro-label"><i class="dot" style=${{ background: `var(--${k})` }} />${label}</span>
            <${Bar} value=${totals[k] || 0} max=${t[k]} color=${`var(--${k})`} />
            <span class="macro-val"><b>${Math.round(totals[k] || 0)}</b> / ${t[k]} g</span>
          </div>`)}
      </div>
    </section>`;
}

const DROP = 'M12 3.5s6 6.4 6 10.9a6 6 0 0 1-12 0c0-4.5 6-10.9 6-10.9z';
const Drop = ({ fill, id }) => html`
  <svg viewBox="0 0 24 24" width="30" height="30" aria-hidden="true">
    <defs><clipPath id=${id}><rect x="0" y=${3.5 + 16.9 * (1 - fill)} width="24" height="24" /></clipPath></defs>
    <path d=${DROP} class="drop-bg" />
    ${fill > 0 && html`<path d=${DROP} class="drop-fill" clip-path=${`url(#${id})`} />`}
  </svg>`;

function WaterCard({ dateKey, ml, goal, units }) {
  const glass = units === 'metric' ? 250 : 8 * ML_PER_OZ;
  let per = glass;
  let count = Math.ceil(goal / per - 0.01);
  if (count > 12) { per = glass * 2; count = Math.ceil(goal / per - 0.01); }
  const filled = ml / per;
  const perLabel = units === 'metric' ? `${per} ml` : `${Math.round(per / ML_PER_OZ)} oz`;
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
      <div class="water-foot">
        <span class="fine">Tap a drop · each is ${perLabel}</span>
        <div class="water-btns">
          <button type="button" class="chip icon-chip" onClick=${() => setWater(dateKey, ml - per)} disabled=${ml <= 0} aria-label=${`Remove ${perLabel}`}><${Icon} name="minus" size=${16} /></button>
          <button type="button" class="chip" onClick=${() => setWater(dateKey, ml + per)}><${Icon} name="plus" size=${16} /> ${perLabel}</button>
        </div>
      </div>
    </section>`;
}

const shortName = (n) => n.name.replace(/ \(.+\)/, '');

function MicroCard({ totals, t, week, hasFood, openNutrient, go }) {
  const cell = (n) => {
    const v = totals[n.key] || 0;
    const st = status(n.key, v, t[n.key]);
    return html`
      <button type="button" class="micro" onClick=${() => openNutrient(n.key)} aria-label=${`${n.name}: ${Math.round((v / t[n.key]) * 100)}% of daily target`}>
        <${Ring} value=${v} max=${t[n.key]} size=${44} stroke=${4} color=${statusColor(st)}><span class="micro-sym">${n.sym}</span><//>
      </button>`;
  };
  const base = week.count ? week.totals : totals;
  const low = (week.count || hasFood)
    ? MICROS.map((n) => ({ n, pct: (base[n.key] || 0) / t[n.key] })).filter((x) => x.pct < 0.7).sort((a, b) => a.pct - b.pct).slice(0, 3)
    : [];
  return html`
    <section class="card">
      <div class="card-head">
        <h2 class="card-title">Vitamins & minerals</h2>
        <button type="button" class="link" onClick=${() => go('nutrients')}>See all</button>
      </div>
      <p class="group-label">Vitamins</p>
      <div class="micro-grid">${VITAMINS.map(cell)}</div>
      <p class="group-label">Minerals</p>
      <div class="micro-grid">${MINERALS.map(cell)}</div>
      ${low.length > 0 && html`
        <div class="low-row">
          <span class="low-label">${week.count ? 'Running low this week' : 'Lowest so far today'}</span>
          <div class="chips">
            ${low.map((x) => html`<button type="button" class="chip" onClick=${() => openNutrient(x.n.key)}>${shortName(x.n)} <b style=${{ color: statusColor(x.pct < 0.5 ? 'low' : 'mid') }}>${Math.round(x.pct * 100)}%</b></button>`)}
          </div>
        </div>`}
    </section>`;
}

function SuppCard({ supps, taken, dateKey }) {
  return html`
    <section class="card">
      <div class="card-head"><h2 class="card-title">Supplements</h2><span class="card-meta">${taken.filter((id) => supps.some((s) => s.id === id)).length} / ${supps.length}</span></div>
      <div class="supp-row">
        ${supps.map((sp) => {
          const on = taken.includes(sp.id);
          return html`
            <button type="button" class="supp ${on ? 'on' : ''}" aria-pressed=${on} onClick=${() => toggleSupp(dateKey, sp.id)}>
              <span class="supp-icon">${on && html`<${Icon} name="check" size=${16} stroke=${2.4} />`}</span>${sp.name}
            </button>`;
        })}
      </div>
    </section>`;
}

function Meals({ day, openSheet }) {
  return html`
    <div class="meals">
      ${MEALS.map((m) => {
        const items = day.entries.filter((e) => e.meal === m.value);
        const kcal = items.reduce((a, e) => a + (e.pu.kcal || 0) * e.amount, 0);
        return html`
          <section class="card meal">
            <div class="meal-head">
              <div class="meal-title-wrap">
                <h3 class="meal-title">${m.label}</h3>
                ${items.length > 0 && html`<span class="meal-kcal">${fmtKcal(kcal)} kcal</span>`}
              </div>
              <button type="button" class="add-btn" onClick=${() => openSheet({ type: 'add', meal: m.value })} aria-label=${`Add to ${m.label}`}>
                <${Icon} name="plus" size=${18} stroke=${2.2} />
              </button>
            </div>
            ${items.length > 0 && html`
              <ul class="entries">
                ${items.map((e) => html`
                  <li>
                    <button type="button" class="entry" onClick=${() => openSheet({ type: 'entry', id: e.id })}>
                      <span class="entry-main">
                        <span class="entry-name">${e.name}</span>
                        <span class="entry-sub">${describeAmount(e.amount, e.unit, fmtQty)}</span>
                      </span>
                      <span class="entry-kcal">${fmtKcal((e.pu.kcal || 0) * e.amount)}</span>
                    </button>
                  </li>`)}
              </ul>`}
          </section>`;
      })}
    </div>`;
}

// ---- Edit a logged entry ----

export function EntrySheet({ dateKey, id, onClose }) {
  const entry = getDay(dateKey).entries.find((x) => x.id === id);
  useEffect(() => { if (!entry) onClose(); }, [entry]);
  if (!entry) return null;
  return html`<${Sheet} onClose=${onClose} label="Edit food" render=${(close) => html`<${EntryEditor} entry=${entry} dateKey=${dateKey} close=${close} />`} />`;
}

function EntryEditor({ entry, dateKey, close }) {
  const [amount, setAmount] = useState(entry.amount);
  const [meal, setMeal] = useState(entry.meal);
  const t = getTargets();
  const n = scale(entry.pu, amount);
  const kind = entry.unit.kind;

  const save = () => { updateEntry(dateKey, entry.id, { amount, meal }); close(); };
  const remove = () => {
    const removed = removeEntry(dateKey, entry.id);
    close();
    toast(`Removed ${entry.name}`, { label: 'Undo', run: () => addEntries(dateKey, [removed]) });
  };

  return html`
    <div class="sheet-head">
      <span class="icon-btn-spacer" />
      <span class="sheet-head-title">Edit</span>
      <button type="button" class="icon-btn" onClick=${close} aria-label="Close"><${Icon} name="close" /></button>
    </div>
    <div class="sheet-body">
      <h2 class="food-title">${entry.name}</h2>
      ${entry.sub && html`<p class="food-sub">${entry.sub}</p>`}
      <div class="amount-card">
        <${Stepper} value=${amount} onChange=${setAmount}
          step=${kind === 'g' ? 10 : kind === 'oz' ? 0.5 : 0.25} min=${kind === 'g' ? 5 : 0.25}
          display=${(v) => describeAmount(v, entry.unit, fmtQty)} />
      </div>
      <${Segmented} className="seg-sm" options=${MEALS} value=${meal} onChange=${setMeal} />
      <${NutritionSummary} n=${n} t=${t} />
    </div>
    <div class="sheet-foot two">
      <button type="button" class="btn btn-quiet danger" onClick=${remove}><${Icon} name="trash" size=${18} /> Remove</button>
      <button type="button" class="btn btn-primary" onClick=${save}>Save</button>
    </div>`;
}
