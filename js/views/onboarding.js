import { html, useState } from '../vendor/preact.js';
import { setProfile, setSettings, setWeight, dateKey as todayKey } from '../store.js';
import { Ring } from '../ui.js';
import { PlanBuilder } from './builder.js';
import { recommendGoal } from '../nutrients.js';
import { DEMO } from '../demo.js';

// 5′10″, 200 lb, new to lifting, planning weights 3× a week, high protein and low carb.
const SAMPLE = {
  sex: 'male', age: 30, heightCm: 177.8, weightKg: 90.7, daily: 'sitting', experience: 'new', pace: 'steady',
  proteinPref: 'higher', diet: [], workouts: { perWeek: 3, type: 'weights', minutes: 60 },
};

export function Onboarding() {
  const [started, setStarted] = useState(false);
  const [units, setUnits] = useState('us');

  const finish = (plan, style) => {
    const today = todayKey();
    setSettings({ units });
    setProfile({ ...plan, styles: { [today]: style }, planVersion: 2 });
    setWeight(today, plan.weightKg); // first point on the weight trend
  };

  if (!started) {
    return html`
      <div class="ob ob-welcome">
        <div class="ob-hero">
          <${Ring} value=${0.72} max=${1} size=${132} stroke=${11} className="glow" />
          <h1 class="ob-title">Plate</h1>
          <p class="ob-lead">Calories, water and vitamins, tracked simply, with a plan built around you. Everything stays on your phone, and there's no subscription.</p>
        </div>
        <button type="button" class="btn btn-primary btn-block btn-lg" onClick=${() => setStarted(true)}>Get started</button>
        ${DEMO && html`<button type="button" class="btn btn-quiet btn-block" onClick=${() => finish({ ...SAMPLE, goal: recommendGoal(SAMPLE).goal }, 'low_carb')}>Skip: use a sample person</button>`}
      </div>`;
  }

  return html`
    <div class="ob">
      <${PlanBuilder} initial=${{ sex: '', age: '', heightCm: '', weightKg: '' }} units=${units} setUnits=${setUnits}
        onBack=${() => setStarted(false)} onDone=${finish} />
    </div>`;
}
