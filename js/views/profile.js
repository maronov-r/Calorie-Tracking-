import { html, useState } from '../vendor/preact.js';
import {
  useStore, state, getTargets, getDay, totalsFor, weekAverage, weighIns, latestWeighIn, setWeight, toast, updatePlan, setProfile,
  dateKey as todayKey, shiftKey, parseKey,
} from '../store.js';
import { Icon, Bar, Segmented, Sheet, NumberInput, Empty, statusColor } from '../ui.js';
import {
  goalFor, styleFor, MICROS, fmtKcal, fmtWeight, kgToDisplay, displayToKg, weightUnit, KG_PER_LB,
  focusFor, directionOf, macroLabel, macroValue, dayMet,
} from '../nutrients.js';
import { coachLine, calorieCheck } from '../coach.js';
import { withTrend, weeklyRate, paceAdvice, fmtRate } from '../weight.js';
import { WeightChart, IntakeChart } from '../charts.js';

const RANGES = [{ value: '30', label: '30 days' }, { value: '90', label: '90 days' }, { value: 'all', label: 'All' }];
const lastDays = (n, end) => Array.from({ length: n }, (_, i) => shiftKey(end, i - n + 1));

function relativeDay(key) {
  const today = todayKey();
  if (key === today) return 'today';
  if (key === shiftKey(today, -1)) return 'yesterday';
  return `on ${parseKey(key).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`;
}

function loggedStreak(today) {
  let k = getDay(today).entries.length ? today : shiftKey(today, -1);
  let n = 0;
  while (getDay(k).entries.length) { n++; k = shiftKey(k, -1); }
  return n;
}

function heightLabel(cm, units) {
  if (units === 'metric') return `${Math.round(cm)} cm`;
  const total = Math.round(cm / 2.54);
  return `${Math.floor(total / 12)}′${total % 12}″`;
}

export function ProfileView({ openSheet, go }) {
  const s = useStore();
  const p = s.profile;
  const units = s.settings.units;
  const unit = weightUnit(units);
  const t = getTargets();
  const g = goalFor(p.goal);
  const today = todayKey();
  const [range, setRange] = useState('30');
  const focus = focusFor(p, t);
  const [picked, setMetric] = useState(null);
  const metric = picked === 'kcal' ? 'kcal' : focus;
  const fdir = directionOf(focus, p.goal, t);
  const flabel = macroLabel(focus, t);

  // ---- Weight ----
  const all = withTrend(weighIns());
  const latest = all[all.length - 1];
  const from = range === 'all' ? (all[0]?.key || today) : shiftKey(today, -(+range - 1));
  const shown = all.filter((w) => w.key >= from);
  const change = shown.length >= 2 ? shown[shown.length - 1].trend - shown[0].trend : null;
  const changeDisp = change == null ? 0 : units === 'metric' ? change : change / KG_PER_LB;
  const rate = weeklyRate(all, today);
  const advice = paceAdvice(rate, p);

  // ---- Eating ----
  const days = lastDays(14, today).map((k) => {
    const tot = totalsFor(k);
    return { key: k, logged: getDay(k).entries.length > 0, value: metric === 'kcal' ? tot.kcal || 0 : macroValue(focus, tot, getTargets(k)) };
  });
  const week = weekAverage(today);
  const hits = lastDays(7, today).map((k) => {
    const logged = getDay(k).entries.length > 0;
    // A limit only counts once the day is over; a target counts as soon as it's reached.
    const done = fdir !== 'max' || k !== today;
    return { key: k, logged, hit: logged && done && dayMet(focus, totalsFor(k), getTargets(k), fdir) };
  });
  const hitCount = hits.filter((h) => h.hit).length;
  const streak = loggedStreak(today);

  // ---- Vitamins ----
  const microTotals = week.count ? week.totals : totalsFor(today);
  const met = MICROS.filter((n) => (microTotals[n.key] || 0) >= t[n.key]).length;
  const lowest = MICROS.map((n) => ({ n, pct: (microTotals[n.key] || 0) / t[n.key] })).sort((a, b) => a.pct - b.pct).slice(0, 3);
  const anyFood = week.count > 0 || getDay(today).entries.length > 0;

  return html`
    <header class="page-head">
      <div>
        <h1 class="title">Profile</h1>
        <p class="subtitle">${g.label} · ${p.age} · ${heightLabel(p.heightCm, units)}</p>
      </div>
    </header>

    <${PlanCard} t=${t} openSheet=${openSheet} />

    <section class="card">
      <div class="card-head">
        <h2 class="card-title">Weight</h2>
        <button type="button" class="chip chip-accent" onClick=${() => openSheet({ type: 'weigh' })}><${Icon} name="scale" size=${16} /> Weigh in</button>
      </div>
      ${latest ? html`
        <div class="weight-hero">
          <span class="weight-num">${kgToDisplay(latest.kg, units).toFixed(1)}<small>${unit}</small></span>
          ${change != null && Math.abs(changeDisp) >= 0.05 && html`
            <span class="weight-delta">${changeDisp > 0 ? '↑' : '↓'} ${Math.abs(changeDisp).toFixed(1)} ${unit}
              <span>${range === 'all' ? 'overall' : `in ${range} days`}</span></span>`}
        </div>
        <p class="fine">Last weigh-in ${relativeDay(latest.key)}</p>
        ${shown.length >= 2
          ? html`<${WeightChart} points=${shown} from=${range === 'all' ? shown[0].key : from} to=${today} units=${units} />`
          : html`<p class="chart-empty">Weigh in a few times a week and your trend line shows up here.</p>`}
        <${Segmented} className="seg-sm" options=${RANGES} value=${range} onChange=${setRange} />
        ${advice
          ? html`<div class="pace"><i class="dot" style=${{ background: statusColor(advice.tone === 'good' ? 'good' : 'mid') }} />
              <p><b>${fmtRate(rate, units)}</b> · ${advice.text}</p></div>`
          : html`<p class="fine">After about two weeks of weigh-ins, you'll see your weekly rate and whether it fits your goal.</p>`}
      ` : html`
        <${Empty} icon="scale" title="No weigh-ins yet">
          Weigh in first thing in the morning a few times a week. Plate smooths out the daily ups and downs into a trend.
        <//>`}
    </section>

    <section class="card">
      <div class="card-head">
        <h2 class="card-title">Eating</h2>
        <${Segmented} className="seg-sm" options=${[{ value: focus, label: flabel }, { value: 'kcal', label: 'Calories' }]} value=${metric} onChange=${setMetric} />
      </div>
      <${IntakeChart} days=${days} goal=${metric === 'kcal' ? t.kcal : t[focus]} unit=${metric === 'kcal' ? 'kcal' : 'g'}
        label=${metric === 'kcal' ? 'calories' : flabel.toLowerCase()}
        color=${metric === 'kcal' ? 'var(--chart-kcal)' : `var(--chart-${focus})`} todayKey=${today} />
      <div class="hits">
        <span class="hits-label">${fdir === 'max' ? `Stayed under ${flabel.toLowerCase()}` : `${flabel} goal hit`}</span>
        <span class="hit-dots" style=${{ "--hit": `var(--chart-${focus})` }}>
          ${hits.map((h) => html`<i class=${h.hit ? 'on' : h.logged ? 'miss' : ''} title=${h.key} />`)}
        </span>
        <b>${hitCount} of 7 days</b>
      </div>
      <div class="stat-pair">
        <div class="stat-box">
          <span class="stat-box-label">Avg calories</span>
          <span class="stat-box-num">${week.count ? fmtKcal(week.totals.kcal) : '–'}</span>
          <span class="stat-box-sub">goal ${fmtKcal(t.kcal)}</span>
        </div>
        <div class="stat-box">
          <span class="stat-box-label">Avg ${flabel.toLowerCase()}</span>
          <span class="stat-box-num">${week.count ? `${Math.round(macroValue(focus, week.totals, t))} g` : '–'}</span>
          <span class="stat-box-sub">${fdir === 'max' ? 'max' : 'goal'} ${t[focus]} g</span>
        </div>
      </div>
      <p class="fine">${week.count ? `Averages of your last ${week.count} logged day${week.count > 1 ? 's' : ''}, not counting today.` : 'Averages appear after your first full day.'}
        ${streak > 1 ? ` ${streak}-day logging streak.` : ''}</p>
    </section>

    <section class="card">
      <div class="card-head">
        <h2 class="card-title">Vitamins & minerals</h2>
        <button type="button" class="link" onClick=${() => go('nutrients')}>Details</button>
      </div>
      ${anyFood ? html`
        <p class="micro-score"><b>${met} of ${MICROS.length}</b> daily targets met ${week.count ? 'on average this week' : 'so far today'}</p>
        <${Bar} value=${met} max=${MICROS.length} />
        <p class="low-label">Lowest</p>
        <div class="chips">
          ${lowest.map((x) => html`<button type="button" class="chip" onClick=${() => openSheet({ type: 'nutrient', key: x.n.key })}>
            ${x.n.name.replace(/ \(.+\)/, '')} <b style=${{ color: statusColor(x.pct < 0.5 ? 'low' : x.pct < 1 ? 'mid' : 'good') }}>${Math.round(x.pct * 100)}%</b></button>`)}
        </div>`
      : html`<p class="fine">Log some food to see how your vitamins and minerals are doing.</p>`}
    </section>

  `;
}

// ---- Plan and coach ----

function PlanCard({ t, openSheet }) {
  const p = state.profile;
  const today = todayKey();
  const check = calorieCheck(today);
  const apply = () => {
    updatePlan({ adjust: (p.adjust || 0) + check.delta, adjustOn: today });
  };
  const snooze = () => setProfile({ ...state.profile, checkSnooze: shiftKey(today, 7) }); // ask again in a week
  return html`
    <section class="card plan-card">
      <div class="card-head">
        <h2 class="card-title">Your plan</h2>
        <button type="button" class="link" onClick=${() => openSheet({ type: 'plan' })}>Change</button>
      </div>
      <button type="button" class="plan-pills" onClick=${() => openSheet({ type: 'plan' })}>
        <span class="pill">${goalFor(p.goal).label}</span>
        <span class="pill">${styleFor(t.style).label}</span>
      </button>
      <div class="plan-sum">
        <div><b>${fmtKcal(t.kcal)}</b><span>kcal</span></div>
        <div><b style=${{ color: 'var(--protein)' }}>${t.protein} g</b><span>protein</span></div>
        <div><b>${t.carbs} g</b><span>${t.netCarbs ? 'net carbs' : 'carbs'}</span></div>
        <div><b>${t.fat} g</b><span>fat</span></div>
      </div>
      ${check ? html`
        <div class="coach-note check">
          <p><b>Calorie check-in.</b> ${check.text}</p>
          <div class="coach-btns">
            <button type="button" class="btn btn-quiet" onClick=${snooze}>Not now</button>
            <button type="button" class="btn btn-primary" onClick=${apply}>${check.delta > 0 ? 'Add' : 'Cut'} 150 kcal</button>
          </div>
        </div>` : html`
        <div class="coach-note"><p>${coachLine(today)}</p></div>`}
      <div class="coach-btns">
        <button type="button" class="btn btn-quiet" onClick=${() => openSheet({ type: 'plan', tab: 'math' })}>How it works</button>
        <button type="button" class="btn btn-quiet" onClick=${() => openSheet({ type: 'coach' })}><${Icon} name="chat" size=${18} /> Ask the coach</button>
      </div>
    </section>`;
}

// ---- Quick weigh-in ----

export function WeighInSheet({ onClose }) {
  return html`<${Sheet} onClose=${onClose} label="Weigh in" render=${(close) => html`<${WeighIn} close=${close} />`} />`;
}

function WeighIn({ close }) {
  const s = useStore();
  const units = s.settings.units;
  const unit = weightUnit(units);
  const today = todayKey();
  const latest = latestWeighIn();
  const start = kgToDisplay(latest ? latest.kg : s.profile.weightKg, units);
  const [v, setV] = useState(+start.toFixed(1));
  const step = units === 'metric' ? 0.1 : 0.2;
  const already = s.weights[today] != null;
  const nudge = (d) => setV((x) => +((+x || 0) + d).toFixed(1));

  const save = () => {
    setWeight(today, displayToKg(v, units));
    toast(`Saved ${(+v).toFixed(1)} ${unit}`);
    close();
  };

  return html`
    <div class="sheet-head">
      <span class="icon-btn-spacer" />
      <span class="sheet-head-title">${already ? 'Update today’s weight' : 'Weigh in'}</span>
      <button type="button" class="icon-btn" onClick=${close} aria-label="Close"><${Icon} name="close" /></button>
    </div>
    <div class="sheet-body weigh">
      <div class="weigh-row">
        <button type="button" class="weigh-step" onClick=${() => nudge(-step)} aria-label=${`Minus ${step} ${unit}`}><${Icon} name="minus" /></button>
        <${NumberInput} className="weigh-input" value=${v} onChange=${setV} suffix=${unit} />
        <button type="button" class="weigh-step" onClick=${() => nudge(step)} aria-label=${`Plus ${step} ${unit}`}><${Icon} name="plus" /></button>
      </div>
      ${latest && latest.key !== today && html`<p class="fine center">Last time: ${fmtWeight(latest.kg, units)} ${relativeDay(latest.key)}</p>`}
      <p class="tip"><${Icon} name="info" size=${17} /><span>For a steady trend, weigh in first thing in the morning, before eating or drinking.</span></p>
    </div>
    <div class="sheet-foot">
      <button type="button" class="btn btn-primary btn-block" disabled=${!(v > 0)} onClick=${save}>Save</button>
    </div>`;
}
