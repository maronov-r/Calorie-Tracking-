// The plan builder: a few questions about you, your days, your workouts and how you like to eat,
// then a plan with the reasons it fits. Used for first setup and for "Rebuild my plan".
import { html, useState } from '../vendor/preact.js';
import { Icon, Segmented, NumberInput, Sheet } from '../ui.js';
import {
  DAILY, WORKOUT_TYPES, WORKOUT_MINUTES, EXPERIENCE, GOALS, PACES, STYLES, DIETS, MICROS,
  computeTargets, recommendGoal, goalFor, fmtKcal, fmtWater,
} from '../nutrients.js';
import { planWhy } from '../coach.js';
import { ProfileFields, ChoiceList } from './settings.js';

const STEPS = ['body', 'day', 'workouts', 'goal', 'eating', 'plan'];
const PER_WEEK = [0, 1, 2, 3, 4, 5, 6].map((n) => ({ value: n, label: n === 6 ? '6+' : String(n) }));

// initial: the current profile (or a blank one). onDone(profile, style) saves it.
export function PlanBuilder({ initial, initialStyle = 'balanced', units, setUnits, onDone, onBack, doneLabel = 'Start tracking' }) {
  const [p, setP] = useState(() => ({
    daily: 'sitting', experience: 'new', pace: 'steady', proteinPref: 'recommended', diet: [],
    ...initial,
    workouts: { perWeek: 3, type: 'weights', minutes: 60, ...(initial.workouts || {}) },
  }));
  const [style, setStyle] = useState(initialStyle);
  const [step, setStep] = useState(0);
  const [goalPicked, setGoalPicked] = useState(!!initial.goal);
  const upd = (patch) => setP((x) => ({ ...x, ...patch }));
  const updW = (patch) => setP((x) => ({ ...x, workouts: { ...x.workouts, ...patch } }));
  const bodyDone = p.sex && p.age && p.heightCm && p.weightKg;
  const rec = bodyDone ? recommendGoal(p) : null;
  const goal = goalPicked ? p.goal : rec?.goal || 'maintain';
  const plan = { ...p, goal };
  const t = bodyDone ? computeTargets(plan, {}, style) : null;
  const name = STEPS[step];

  const next = () => setStep((s) => Math.min(STEPS.length - 1, s + 1));
  const back = () => (step === 0 ? onBack?.() : setStep(step - 1));
  const dots = html`<div class="ob-dots">${STEPS.map((_, i) => html`<span class=${i <= step ? 'on' : ''} />`)}</div>`;
  const foot = (label = 'Continue', disabled = false, onClick = next) => html`
    <div class="ob-foot">
      <button type="button" class="btn btn-quiet" onClick=${back} disabled=${step === 0 && !onBack}>Back</button>
      <button type="button" class="btn btn-primary" disabled=${disabled} onClick=${onClick}>${label}</button>
    </div>`;

  if (name === 'body') {
    return html`
      ${dots}
      <h1 class="ob-h">About you</h1>
      <p class="ob-sub">Used for your calories, protein and the vitamin amounts right for your age and sex.</p>
      ${setUnits && html`
        <div class="field">
          <span class="field-label">Units</span>
          <${Segmented} options=${[{ value: 'us', label: 'US (lb, ft, oz)' }, { value: 'metric', label: 'Metric' }]} value=${units} onChange=${setUnits} />
        </div>`}
      <${ProfileFields} key=${units} profile=${p} onChange=${upd} units=${units} />
      <${NumberInput} className="field" label="Body fat % (optional)" value=${p.bodyFat || ''} placeholder="Skip if you don't know" suffix="%"
        onChange=${(v) => (v === '' || (v >= 3 && v <= 60)) && upd({ bodyFat: v || null })} />
      ${p.sex === 'female' && html`
        <div class="field">
          <span class="field-label">Pregnant or breastfeeding?</span>
          <${Segmented} options=${[{ value: false, label: 'No' }, { value: true, label: 'Yes' }]} value=${!!p.pregnant} onChange=${(v) => upd({ pregnant: v })} />
        </div>`}
      ${foot('Continue', !bodyDone)}`;
  }

  if (name === 'day') {
    return html`
      ${dots}
      <h1 class="ob-h">Your normal day</h1>
      <p class="ob-sub">Not counting workouts. Those come next.</p>
      <${ChoiceList} options=${DAILY} value=${p.daily} onChange=${(v) => upd({ daily: v })} />
      ${foot()}`;
  }

  if (name === 'workouts') {
    const w = p.workouts;
    return html`
      ${dots}
      <h1 class="ob-h">Your workouts</h1>
      <p class="ob-sub">What you do now, or what you're about to start. Your plan is built for the routine you're going for.</p>
      <div class="field">
        <span class="field-label">Workouts a week</span>
        <${Segmented} className="seg-num" options=${PER_WEEK} value=${Math.min(6, w.perWeek)} onChange=${(v) => updW({ perWeek: v })} />
      </div>
      ${w.perWeek > 0 && html`
        <div class="field">
          <span class="field-label">Mostly</span>
          <${ChoiceList} options=${WORKOUT_TYPES} value=${w.type} onChange=${(v) => updW({ type: v })} />
        </div>
        <div class="field">
          <span class="field-label">About how long</span>
          <${Segmented} options=${WORKOUT_MINUTES.map((m) => ({ value: m, label: `${m} min` }))} value=${w.minutes} onChange=${(v) => updW({ minutes: v })} />
        </div>`}
      <div class="field">
        <span class="field-label">How long have you been lifting weights?</span>
        <${ChoiceList} options=${EXPERIENCE} value=${p.experience} onChange=${(v) => upd({ experience: v })} />
      </div>
      ${foot()}`;
  }

  if (name === 'goal') {
    const opts = GOALS.map((g) => {
      const x = computeTargets({ ...p, goal: g.value }, {}, style);
      return { value: g.value, label: g.value === rec?.goal ? `${g.label} · Recommended` : g.label, hint: `${g.hint}. ${fmtKcal(x.kcal)} kcal · ${x.protein} g protein` };
    });
    const showPace = goal === 'cut' || goal === 'lean_bulk';
    return html`
      ${dots}
      <h1 class="ob-h">Your goal</h1>
      ${rec && html`
        <div class="rec-card">
          <span class="rec-label"><${Icon} name="sparkle" size=${16} /> Recommended for you: <b>${goalFor(rec.goal).label}</b></span>
          <p>${rec.why}</p>
        </div>`}
      <${ChoiceList} options=${opts} value=${goal} onChange=${(v) => { upd({ goal: v }); setGoalPicked(true); }} />
      ${showPace && html`
        <div class="field">
          <span class="field-label">Pace</span>
          <${Segmented} options=${PACES.map((x) => ({ value: x.value, label: x.label }))} value=${p.pace} onChange=${(v) => upd({ pace: v })} />
          <span class="field-hint">${goal === 'cut'
            ? { gentle: 'About 0.25% of your weight a week. Easiest to keep muscle.', steady: 'About 0.5% of your weight a week. The usual sweet spot.', faster: 'About 0.75% a week. Harder to stick with and to keep muscle.' }[p.pace]
            : { gentle: 'Slower gain, the least fat along the way.', steady: 'A realistic rate for your experience.', faster: 'Faster gain, with more fat along the way.' }[p.pace]}</span>
        </div>`}
      ${foot()}`;
  }

  if (name === 'eating') {
    const toggleDiet = (d) => upd({ diet: p.diet.includes(d) ? p.diet.filter((x) => x !== d) : [...p.diet, d] });
    return html`
      ${dots}
      <h1 class="ob-h">How you like to eat</h1>
      <p class="ob-sub">Your calories and protein stay the same whichever you pick. This only changes carbs and fat.</p>
      <${ChoiceList} options=${STYLES} value=${style} onChange=${setStyle} />
      <div class="field">
        <span class="field-label">Protein</span>
        <${Segmented} options=${[{ value: 'recommended', label: 'Recommended' }, { value: 'higher', label: 'Higher' }]} value=${p.proteinPref} onChange=${(v) => upd({ proteinPref: v })} />
        <span class="field-hint">${p.proteinPref === 'higher' ? 'The top of the researched range. Can help with fullness while losing fat.' : 'What research supports for your goal and training.'}</span>
      </div>
      <div class="field">
        <span class="field-label">Anything you don't eat? <span class="field-hint">for food ideas and the coach</span></span>
        <div class="chips">
          ${DIETS.map((d) => html`<button type="button" class="chip ${p.diet.includes(d.value) ? 'chip-accent' : ''}" aria-pressed=${p.diet.includes(d.value)} onClick=${() => toggleDiet(d.value)}>${d.label}</button>`)}
        </div>
      </div>
      ${foot('See my plan')}`;
  }

  // The plan
  return html`
    ${dots}
    <h1 class="ob-h">Your plan</h1>
    <p class="ob-sub">${goalFor(goal).label}, built for you.</p>
    <div class="card plan">
      <div class="plan-kcal"><span class="plan-num">${fmtKcal(t.kcal)}</span><span class="plan-unit">kcal a day</span></div>
      <div class="plan-grid">
        <div><span class="plan-label"><i class="dot" style=${{ background: 'var(--protein)' }} />Protein</span><b>${t.protein} g</b></div>
        <div><span class="plan-label"><i class="dot" style=${{ background: 'var(--carbs)' }} />${t.netCarbs ? 'Net carbs' : 'Carbs'}</span><b>${t.carbs} g</b></div>
        <div><span class="plan-label"><i class="dot" style=${{ background: 'var(--fat)' }} />Fat</span><b>${t.fat} g</b></div>
        <div><span class="plan-label"><i class="dot" style=${{ background: 'var(--water)' }} />Water</span><b>${fmtWater(t.water, units)}</b></div>
      </div>
      <p class="plan-micro"><${Icon} name="leaf" size=${17} /> Plus ${MICROS.length} vitamin and mineral targets from the official U.S. recommendations.</p>
    </div>
    <ul class="why-list">${planWhy(plan, t, units).map((x) => html`<li>${x}</li>`)}</ul>
    ${foot(doneLabel, false, () => onDone(plan, style))}`;
}

// "Rebuild my plan", in a full-height sheet.
export function BuilderSheet({ onClose, profile, style, units, onSave }) {
  return html`<${Sheet} onClose=${onClose} className="sheet-full" label="Rebuild my plan"
    render=${(close) => html`
      <div class="sheet-head">
        <span class="icon-btn-spacer" />
        <span class="sheet-head-title">Rebuild my plan</span>
        <button type="button" class="icon-btn" onClick=${close} aria-label="Close"><${Icon} name="close" /></button>
      </div>
      <div class="sheet-body">
        <div class="ob ob-sheet">
          <${PlanBuilder} initial=${profile} initialStyle=${style} units=${units} onBack=${close} doneLabel="Save my plan"
            onDone=${(p, st) => { onSave(p, st); close(); }} />
        </div>
      </div>`} />`;
}
