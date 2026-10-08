import { html, useState } from '../vendor/preact.js';
import { setProfile, setSettings, setWeight, dateKey as todayKey } from '../store.js';
import { Icon, Ring, Segmented } from '../ui.js';
import { ACTIVITY, GOALS, MICROS, ML_PER_OZ, computeTargets, fmtKcal } from '../nutrients.js';
import { ProfileFields, ChoiceList } from './settings.js';

export function Onboarding() {
  const [step, setStep] = useState(0);
  const [units, setUnits] = useState('us');
  const [p, setP] = useState({ sex: '', age: '', heightCm: '', weightKg: '', activity: 'light', goal: 'maintain' });
  const upd = (patch) => setP((x) => ({ ...x, ...patch }));
  const aboutDone = p.sex && p.age && p.heightCm && p.weightKg;
  const t = aboutDone ? computeTargets(p) : null;

  const finish = () => {
    setSettings({ units });
    setProfile(p);
    setWeight(todayKey(), p.weightKg); // first point on the weight trend
  };

  // Plain helpers (not components) so the buttons keep their DOM nodes between renders.
  const dots = () => html`<div class="ob-dots">${[1, 2, 3, 4].map((i) => html`<span class=${i <= step ? 'on' : ''} />`)}</div>`;
  const nav = (next, disabled = false, label = 'Continue') => html`
    <div class="ob-foot">
      <button type="button" class="btn btn-quiet" onClick=${() => setStep(step - 1)}>Back</button>
      <button type="button" class="btn btn-primary" disabled=${disabled} onClick=${next}>${label}</button>
    </div>`;

  if (step === 0) {
    return html`
      <div class="ob ob-welcome">
        <div class="ob-hero">
          <${Ring} value=${0.72} max=${1} size=${132} stroke=${11} className="glow" />
          <h1 class="ob-title">Plate</h1>
          <p class="ob-lead">Calories, water and vitamins, tracked simply. Everything stays on your phone, and there's no subscription.</p>
        </div>
        <button type="button" class="btn btn-primary btn-block btn-lg" onClick=${() => setStep(1)}>Get started</button>
      </div>`;
  }

  if (step === 1) {
    return html`
      <div class="ob">
        ${dots()}
        <h1 class="ob-h">About you</h1>
        <p class="ob-sub">Used to set your calorie target and the vitamin amounts right for your age and sex.</p>
        <div class="field">
          <span class="field-label">Units</span>
          <${Segmented} options=${[{ value: 'us', label: 'US (lb, ft, oz)' }, { value: 'metric', label: 'Metric' }]} value=${units} onChange=${setUnits} />
        </div>
        <${ProfileFields} key=${units} profile=${p} onChange=${upd} units=${units} />
        ${nav(() => setStep(2), !aboutDone)}
      </div>`;
  }

  if (step === 2) {
    return html`
      <div class="ob">
        ${dots()}
        <h1 class="ob-h">How active are you?</h1>
        <p class="ob-sub">Think about a typical week.</p>
        <${ChoiceList} options=${ACTIVITY} value=${p.activity} onChange=${(v) => upd({ activity: v })} />
        ${nav(() => setStep(3))}
      </div>`;
  }

  if (step === 3) {
    return html`
      <div class="ob">
        ${dots()}
        <h1 class="ob-h">What's your goal?</h1>
        <p class="ob-sub">You can change this any time on the Profile page, along with your eating style (balanced, low carb or keto).</p>
        <${ChoiceList} options=${GOALS.map((g) => ({ value: g.value, label: g.label, hint: g.hint }))} value=${p.goal} onChange=${(v) => upd({ goal: v })} />
        ${nav(() => setStep(4))}
      </div>`;
  }

  const water = units === 'metric' ? `${(t.water / 1000).toFixed(1)} L` : `${Math.round(t.water / ML_PER_OZ)} oz`;
  return html`
    <div class="ob">
      ${dots()}
      <h1 class="ob-h">Your daily plan</h1>
      <p class="ob-sub">You burn about ${fmtKcal(t.auto.tdee)} kcal a day. Here's where to aim.</p>
      <div class="card plan">
        <div class="plan-kcal"><span class="plan-num">${fmtKcal(t.kcal)}</span><span class="plan-unit">kcal a day</span></div>
        <div class="plan-grid">
          <div><span class="plan-label"><i class="dot" style=${{ background: 'var(--protein)' }} />Protein</span><b>${t.protein} g</b></div>
          <div><span class="plan-label"><i class="dot" style=${{ background: 'var(--carbs)' }} />Carbs</span><b>${t.carbs} g</b></div>
          <div><span class="plan-label"><i class="dot" style=${{ background: 'var(--fat)' }} />Fat</span><b>${t.fat} g</b></div>
          <div><span class="plan-label"><i class="dot" style=${{ background: 'var(--water)' }} />Water</span><b>${water}</b></div>
        </div>
        <p class="plan-micro"><${Icon} name="leaf" size=${17} /> Plus ${MICROS.length} vitamin and mineral targets from the official U.S. recommendations.</p>
      </div>
      ${nav(finish, false, 'Start tracking')}
    </div>`;
}
