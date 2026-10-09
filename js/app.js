import { html, render, useState, useEffect } from './vendor/preact.js';
import { useStore, loadState, state, emit, rebuildPlan, styleOn, dateKey as todayKey } from './store.js';
import { Icon, Toast } from './ui.js';
import { loadFoods } from './foods.js';
import { Today, EntrySheet } from './views/today.js';
import { AddSheet } from './views/add.js';
import { NutrientsView, NutrientSheet } from './views/nutrients.js';
import { ProfileView, WeighInSheet } from './views/profile.js';
import { SettingsView } from './views/settings.js';
import { PlanSheet, CoachSheet } from './views/coach.js';
import { WaterSheet } from './views/water.js';
import { SupplementSheet } from './views/supplements.js';
import { BuilderSheet } from './views/builder.js';
import { Onboarding } from './views/onboarding.js';
import { DEMO, BETA, ensureAccount } from './demo.js';
import { TopUpSheet } from './views/credit.js';

const TABS = [
  { value: 'today', label: 'Today', icon: 'ring' },
  { value: 'nutrients', label: 'Nutrients', icon: 'leaf' },
  null, // the add button sits in the middle
  { value: 'profile', label: 'Profile', icon: 'user' },
  { value: 'settings', label: 'Settings', icon: 'sliders' },
];

function App() {
  const s = useStore();
  const [tab, setTab] = useState('today');
  const [day, setDay] = useState(todayKey());
  const [sheet, setSheet] = useState(null);
  const [section, setSection] = useState(null);

  // Roll over to the new day if the app stays open past midnight.
  useEffect(() => {
    let last = todayKey();
    const check = () => {
      const now = todayKey();
      if (now !== last) { setDay((cur) => (cur === last ? now : cur)); last = now; }
    };
    document.addEventListener('visibilitychange', check);
    const timer = setInterval(check, 60000);
    return () => { document.removeEventListener('visibilitychange', check); clearInterval(timer); };
  }, []);

  // Warm up the food database in the background so search is instant (and protein ideas can show).
  useEffect(() => {
    if (s.ready && s.profile) (window.requestIdleCallback || setTimeout)(() => loadFoods().then(emit).catch(() => {}));
  }, [s.ready, !!s.profile]);

  useEffect(() => { if (s.ready && s.profile) ensureAccount().catch(() => {}); }, [s.ready, !!s.profile]);

  if (!s.ready) return html`<div class="boot" />`;
  if (!s.profile) return html`<${Onboarding} />`;

  const go = (next, toSection = null) => {
    setTab(next);
    setSection(toSection);
    window.scrollTo(0, 0);
  };
  const closeSheet = (which) => () => setSheet((cur) => (cur === which ? null : cur));

  return html`
    ${DEMO && html`<div class="demo-ribbon">Demo version · fake money, your real data isn’t touched</div>`}
    ${BETA && html`<div class="demo-ribbon">Test version · real AI, pretend money</div>`}
    <main class="app">
      ${tab === 'today' && html`<${Today} dateKey=${day} setDateKey=${setDay} openSheet=${setSheet} go=${go} />`}
      ${tab === 'nutrients' && html`<${NutrientsView} dateKey=${day} openSheet=${setSheet} go=${go} />`}
      ${tab === 'profile' && html`<${ProfileView} openSheet=${setSheet} go=${go} />`}
      ${tab === 'settings' && html`<${SettingsView} go=${go} section=${section} openSheet=${setSheet} />`}
    </main>

    <nav class="tabbar" aria-label="Main">
      ${TABS.map((t) => (t
        ? html`<button type="button" class="tab ${tab === t.value ? 'on' : ''}" onClick=${() => go(t.value)} aria-current=${tab === t.value ? 'page' : null}>
            <${Icon} name=${t.icon} size=${23} /><span>${t.label}</span>
          </button>`
        : html`<button type="button" class="tab-add" onClick=${() => setSheet({ type: 'add' })} aria-label="Add food">
            <${Icon} name="plus" size=${28} stroke=${2.2} />
          </button>`))}
    </nav>

    ${sheet?.type === 'add' && html`
      <${AddSheet} key=${sheet.query || 'add'} dateKey=${day} meal=${sheet.meal} mode=${sheet.mode} query=${sheet.query}
        onClose=${closeSheet(sheet)} toSettings=${() => { setSheet(null); go('settings', 'ai'); }} />`}
    ${sheet?.type === 'entry' && html`<${EntrySheet} dateKey=${day} id=${sheet.id} onClose=${closeSheet(sheet)} />`}
    ${sheet?.type === 'weigh' && html`<${WeighInSheet} onClose=${closeSheet(sheet)} />`}
    ${sheet?.type === 'water' && html`<${WaterSheet} dateKey=${day} onClose=${closeSheet(sheet)} />`}
    ${sheet?.type === 'builder' && html`<${BuilderSheet} profile=${s.profile} style=${styleOn()} units=${s.settings.units} onClose=${closeSheet(sheet)} onSave=${rebuildPlan} />`}
    ${sheet?.type === 'supp' && html`<${SupplementSheet} supp=${sheet.supp} onClose=${closeSheet(sheet)} toSettings=${() => go('settings', 'ai')} />`}
    ${sheet?.type === 'plan' && html`<${PlanSheet} tab=${sheet.tab} onClose=${closeSheet(sheet)} openCoach=${() => setSheet({ type: 'coach' })} rebuild=${() => setSheet({ type: 'builder' })} />`}
    ${sheet?.type === 'topup' && html`<${TopUpSheet} onClose=${closeSheet(sheet)} />`}
    ${sheet?.type === 'coach' && html`<${CoachSheet} onClose=${closeSheet(sheet)} toSettings=${() => go('settings', 'ai')} />`}
    ${sheet?.type === 'nutrient' && html`
      <${NutrientSheet} nkey=${sheet.key} dateKey=${day} onClose=${closeSheet(sheet)}
        onSearch=${(q) => setSheet({ type: 'add', mode: 'search', query: q })} />`}

    <${Toast} toast=${s.toast} onDismiss=${() => { state.toast = null; emit(); }} />
  `;
}

render(html`<${App} />`, document.getElementById('root'));
loadState();

const local = ['localhost', '127.0.0.1'].includes(location.hostname);
if ('serviceWorker' in navigator && !local) {
  navigator.serviceWorker.register('./sw.js').catch((err) => console.warn('Offline mode unavailable', err));
}
