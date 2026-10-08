import { html, useState } from '../vendor/preact.js';
import { useStore, getTargets, totalsFor, weekAverage, getDay, dateKey as todayKey } from '../store.js';
import { Icon, Ring, Bar, Segmented, Sheet, statusColor } from '../ui.js';
import { N, INFO, UPPER, MACROS, VITAMINS, MINERALS, MICROS, status, fmtNum } from '../nutrients.js';
import { dayTitle } from './today.js';

const GROUPS = [['Macros & more', MACROS], ['Vitamins', VITAMINS], ['Minerals', MINERALS]];

export function NutrientsView({ dateKey, openSheet, go }) {
  const s = useStore();
  const [range, setRange] = useState('day');
  const t = getTargets();
  const week = weekAverage(dateKey);
  const totals = range === 'day' ? totalsFor(dateKey) : week.totals;
  const met = MICROS.filter((n) => (totals[n.key] || 0) >= t[n.key]).length;
  const low = MICROS.filter((n) => (totals[n.key] || 0) < t[n.key] * 0.5).length;
  const title = dayTitle(dateKey);
  const when = dateKey === todayKey() ? 'today' : title === 'Yesterday' ? 'yesterday' : `on ${title}`;
  const subtitle = range === 'day'
    ? `Everything you logged ${when}`
    : week.count ? `Daily average of your last ${week.count} logged day${week.count > 1 ? 's' : ''}` : 'No earlier days logged yet, so this shows today';

  return html`
    <header class="page-head">
      <div>
        <h1 class="title">Nutrients</h1>
        <p class="subtitle">${subtitle}</p>
      </div>
      <button type="button" class="icon-btn" onClick=${() => go('settings')} aria-label="Settings"><${Icon} name="sliders" /></button>
    </header>

    <${Segmented} className="range-seg" options=${[{ value: 'day', label: dayTitle(dateKey) }, { value: 'week', label: '7-day average' }]} value=${range} onChange=${setRange} />

    <section class="card score">
      <${Ring} value=${met} max=${MICROS.length} size=${68} stroke=${6}><span class="score-num">${met}</span><//>
      <div>
        <p class="score-title">${met} of ${MICROS.length} vitamins & minerals met</p>
        <p class="score-sub">${low ? `${low} under half your target. Tap one to see what to eat.` : 'Nothing is seriously low. Nice work.'}</p>
      </div>
    </section>

    ${GROUPS.map(([label, list]) => html`
      <section class="card nlist">
        <h2 class="card-title">${label}</h2>
        ${list.map((n) => html`<${NutrientRow} n=${n} value=${totals[n.key] || 0} target=${t[n.key]} onClick=${() => openSheet({ type: 'nutrient', key: n.key })} />`)}
      </section>`)}

    <p class="fine center">Targets are the U.S. Recommended Dietary Allowances for your age and sex.${s.supplements.length ? ' Supplements you tick off count too.' : ''}</p>
  `;
}

const OWN_COLOR = ['protein', 'carbs', 'fat'];

function NutrientRow({ n, value, target, onClick }) {
  const st = status(n.key, value, target);
  const pct = target ? value / target : 0;
  // Macros fill up over the day, so they use their own color instead of "low" red.
  const color = OWN_COLOR.includes(n.key) && st !== 'over' ? `var(--${n.key})` : statusColor(st);
  return html`
    <button type="button" class="nrow" onClick=${onClick}>
      <span class="nrow-top">
        <span class="nrow-name">${n.name}</span>
        <span class="nrow-val"><b>${fmtNum(value)}</b>${target ? ` / ${n.limit ? 'max ' : ''}${fmtNum(target)}` : ''} ${n.unit}</span>
      </span>
      ${target ? html`
        <span class="nrow-bar">
          <${Bar} value=${value} max=${target} color=${color} />
          <span class="nrow-pct" style=${{ color }}>${Math.round(pct * 100)}%</span>
        </span>` : null}
    </button>`;
}

// ---- Detail sheet for one nutrient ----

export function NutrientSheet({ nkey, dateKey, onClose, onSearch }) {
  return html`<${Sheet} onClose=${onClose} label=${N[nkey].name}
    render=${(close) => html`<${NutrientDetail} nkey=${nkey} dateKey=${dateKey} close=${close} onSearch=${onSearch} />`} />`;
}

function contributors(nkey, keys, supplements) {
  const by = new Map();
  let sum = 0;
  for (const k of keys) {
    const day = getDay(k);
    for (const e of day.entries) {
      const v = (e.pu[nkey] || 0) * e.amount;
      if (v > 0) { by.set(e.name, (by.get(e.name) || 0) + v); sum += v; }
    }
    for (const id of day.supps || []) {
      const sp = supplements.find((x) => x.id === id);
      const v = sp?.n?.[nkey] || 0;
      if (v > 0) { by.set(sp.name, (by.get(sp.name) || 0) + v); sum += v; }
    }
  }
  return [...by.entries()].map(([name, v]) => ({ name, share: v / sum })).sort((a, b) => b.share - a.share).slice(0, 5);
}

function Stat({ nkey, target, label, value }) {
  const n = N[nkey];
  const st = status(nkey, value, target);
  return html`
    <div class="stat-box">
      <span class="stat-box-label">${label}</span>
      <span class="stat-box-num">${value == null ? '–' : fmtNum(value)} <small>${n.unit}</small></span>
      ${value != null && target ? html`<span class="stat-box-pct" style=${{ color: statusColor(st) }}>${Math.round((value / target) * 100)}% of ${n.limit ? 'max ' : ''}${fmtNum(target)}</span>` : null}
    </div>`;
}

function NutrientDetail({ nkey, dateKey, close, onSearch }) {
  const s = useStore();
  const n = N[nkey];
  const info = INFO[nkey] || {};
  const t = getTargets();
  const target = t[nkey];
  const day = totalsFor(dateKey)[nkey] || 0;
  const week = weekAverage(dateKey);
  const avg = week.count ? week.totals[nkey] || 0 : null;
  const from = contributors(nkey, [...new Set([dateKey, ...week.keys])], s.supplements);

  return html`
    <div class="sheet-head">
      <span class="icon-btn-spacer" />
      <span class="sheet-head-title">${n.name}</span>
      <button type="button" class="icon-btn" onClick=${close} aria-label="Close"><${Icon} name="close" /></button>
    </div>
    <div class="sheet-body">
      <p class="lead">${info.why}</p>
      <div class="stat-pair">
        <${Stat} nkey=${nkey} target=${target} label=${dayTitle(dateKey)} value=${day} />
        <${Stat} nkey=${nkey} target=${target} label="7-day average" value=${avg} />
      </div>
      ${UPPER[nkey] && html`<p class="fine">Upper limit: ${fmtNum(UPPER[nkey])} ${n.unit} a day. That mostly matters if you take supplements.</p>`}

      ${from.length > 0 && html`
        <p class="list-label">Where yours came from</p>
        <ul class="contrib">
          ${from.map((c) => html`
            <li>
              <span class="contrib-name">${c.name}</span>
              <${Bar} value=${c.share} max=${1} color="var(--accent)" />
              <span class="contrib-pct">${Math.round(c.share * 100)}%</span>
            </li>`)}
        </ul>`}

      ${info.sources && html`
        <p class="list-label">Good sources</p>
        <div class="chips">
          ${info.sources.map((src) => html`<button type="button" class="chip" onClick=${() => onSearch(src.q)}><${Icon} name="plus" size=${14} stroke=${2.2} /> ${src.label}</button>`)}
        </div>`}
      ${info.tip && html`<p class="tip"><${Icon} name="info" size=${17} /> <span>${info.tip}</span></p>`}
    </div>`;
}
