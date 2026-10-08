import { html, useState, useRef, useEffect } from '../vendor/preact.js';
import {
  useStore, state, getTargets, updatePlan, setStyle, setSettings, setCoach, toast, dateKey as todayKey,
} from '../store.js';
import { Icon, Sheet, Segmented, Empty } from '../ui.js';
import { GOALS, STYLES, computeTargets, goalFor, styleFor, fmtKcal } from '../nutrients.js';
import { goalGuide, styleGuide, planSteps, coachContext, COACH_GOALS, COACH_STYLES } from '../coach.js';
import { askCoach, aiErrorMessage } from '../ai.js';
import { ChoiceList } from './settings.js';

const Paras = ({ list }) => html`<div class="prose">${list.map((p) => html`<p>${p}</p>`)}</div>`;

// ---- Plan: goal, eating style, and how the numbers are worked out ----

export function PlanSheet({ onClose, openCoach, tab }) {
  return html`<${Sheet} onClose=${onClose} className="sheet-tall" label="Your plan"
    render=${(close) => html`<${Plan} close=${close} openCoach=${openCoach} startTab=${tab} />`} />`;
}

function Plan({ close, openCoach, startTab }) {
  const s = useStore();
  const p = s.profile;
  const units = s.settings.units;
  const t = getTargets();
  const ov = s.settings.overrides || {};
  const [tab, setTab] = useState(startTab || 'plan');
  const handSet = ['kcal', 'protein', 'carbs', 'fat'].filter((k) => ov[k]);

  const goalOpts = GOALS.map((g) => {
    const x = computeTargets({ ...p, goal: g.value, adjust: g.value === p.goal ? p.adjust : 0 }, ov, t.style);
    return { value: g.value, label: g.label, hint: `${fmtKcal(x.kcal)} kcal · ${x.protein} g protein` };
  });
  const styleOpts = STYLES.map((st) => {
    const x = computeTargets(p, ov, st.value);
    return { value: st.value, label: st.label, hint: `${x.carbs} g ${st.value === 'keto' ? 'net carbs max' : 'carbs'} · ${x.fat} g fat` };
  });

  return html`
    <div class="sheet-head">
      <span class="icon-btn-spacer" />
      <span class="sheet-head-title">Your plan</span>
      <button type="button" class="icon-btn" onClick=${close} aria-label="Close"><${Icon} name="close" /></button>
    </div>
    <div class="sheet-body">
      <div class="plan-sum">
        <div><b>${fmtKcal(t.kcal)}</b><span>kcal</span></div>
        <div><b style=${{ color: 'var(--protein)' }}>${t.protein} g</b><span>protein</span></div>
        <div><b>${t.carbs} g</b><span>${t.netCarbs ? 'net carbs' : 'carbs'}</span></div>
        <div><b>${t.fat} g</b><span>fat</span></div>
      </div>
      ${handSet.length > 0 && html`
        <div class="tip warn-tip">
          <${Icon} name="info" size=${17} />
          <span>You set ${handSet.map((k) => ({ kcal: 'calories', protein: 'protein', carbs: 'carbs', fat: 'fat' }[k])).join(' and ')} by hand in Settings, so changing your goal won't move ${handSet.length > 1 ? 'them' : 'it'}.
            <button type="button" class="link" onClick=${() => setSettings({ overrides: { water: ov.water } })}>Use automatic</button></span>
        </div>`}

      <${Segmented} className="seg-sm plan-tabs" options=${[{ value: 'plan', label: 'Goal & style' }, { value: 'math', label: 'How it’s worked out' }]} value=${tab} onChange=${setTab} />

      ${tab === 'plan' ? html`
        <p class="list-label">Goal</p>
        <${ChoiceList} options=${goalOpts} value=${p.goal} onChange=${(v) => updatePlan({ goal: v })} />
        <p class="list-label">What ${goalFor(p.goal).label.toLowerCase()} means</p>
        <${Paras} list=${goalGuide(p.goal, t, units)} />

        <p class="list-label">Eating style <span class="field-hint">from today on</span></p>
        <${ChoiceList} options=${styleOpts} value=${t.style} onChange=${setStyle} />
        <p class="list-label">${styleFor(t.style).label}</p>
        <${Paras} list=${styleGuide(t.style, t, p.goal)} />
      ` : html`
        <p class="lead">Here's exactly what Plate does with your details. When you weigh in, everything updates.</p>
        <ol class="steps">
          ${planSteps(t, units).map((st) => html`
            <li class=${st.total ? 'total' : ''}>
              <div class="step-top"><span>${st.label}</span><b>${st.value}</b></div>
              ${st.note && html`<p>${st.note}</p>`}
            </li>`)}
        </ol>
      `}
    </div>
    <div class="sheet-foot">
      <button type="button" class="btn btn-quiet btn-block" onClick=${() => { close(); setTimeout(openCoach, 240); }}>
        <${Icon} name="chat" size=${18} /> Ask the coach a question
      </button>
    </div>`;
}

// ---- Coach chat (uses the person's own API key) ----

const STARTERS = [
  'What does lean bulking mean for me?',
  'I want to do keto this week. What changes?',
  'What should I eat tonight to hit protein?',
  'Am I gaining at the right pace?',
];

export function CoachSheet({ onClose, toSettings }) {
  return html`<${Sheet} onClose=${onClose} className="sheet-full" label="Coach"
    render=${(close) => html`<${Coach} close=${close} toSettings=${() => { close(); setTimeout(toSettings, 240); }} />`} />`;
}

// Tiny formatter: paragraphs, "- " bullets and **bold**. Everything else stays plain text.
function Rich({ text }) {
  const inline = (line) => line.split(/(\*\*[^*]+\*\*)/g).map((part) => (part.startsWith('**') && part.endsWith('**') ? html`<b>${part.slice(2, -2)}</b>` : part));
  const blocks = text.split(/\n{2,}/);
  return html`<div class="prose">${blocks.map((b) => {
    const lines = b.split('\n').filter((l) => l.trim());
    if (lines.length && lines.every((l) => /^\s*[-•]\s/.test(l))) return html`<ul>${lines.map((l) => html`<li>${inline(l.replace(/^\s*[-•]\s/, ''))}</li>`)}</ul>`;
    return html`<p>${lines.map((l, i) => html`${i ? html`<br />` : ''}${inline(l)}`)}</p>`;
  })}</div>`;
}

function applyAction(a) {
  const p = state.profile;
  if (a.type === 'set_goal' && COACH_GOALS.includes(a.value)) { updatePlan({ goal: a.value }); return true; }
  if (a.type === 'set_style' && COACH_STYLES.includes(a.value)) { setStyle(a.value); return true; }
  if (a.type === 'adjust_calories') {
    const v = Math.round(parseFloat(a.value) / 10) * 10;
    if (!v || Math.abs(v) > 500) return false;
    const adjust = Math.max(-600, Math.min(600, (p.adjust || 0) + v));
    updatePlan({ adjust, adjustOn: todayKey() });
    return true;
  }
  return false;
}

function Coach({ close, toSettings }) {
  const s = useStore();
  const [text, setText] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const listRef = useRef();
  const msgs = s.coach;
  const hasKey = !!s.settings.apiKey;

  useEffect(() => {
    const el = listRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [msgs.length, busy]);

  const send = async (q) => {
    const question = (q ?? text).trim();
    if (!question || busy) return;
    setError('');
    setText('');
    const history = [...state.coach, { role: 'user', text: question, t: Date.now() }];
    setCoach(history);
    setBusy(true);
    try {
      const recent = history.slice(-12);
      while (recent.length && recent[0].role !== 'user') recent.shift();
      const res = await askCoach({ apiKey: s.settings.apiKey, model: s.settings.model, history: recent, context: coachContext() });
      setCoach([...state.coach, { role: 'assistant', text: res.reply || 'Sorry, I lost my train of thought. Ask me again?', actions: res.actions, t: Date.now() }]);
    } catch (err) {
      setCoach(state.coach.slice(0, -1)); // drop the unanswered question so the chat stays in turn
      setText(question);
      setError(aiErrorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  const tapAction = (mi, ai) => {
    const m = state.coach[mi];
    if (!applyAction(m.actions[ai])) { toast("That change didn't look right, so Plate skipped it."); return; }
    setCoach(state.coach.map((x, i) => (i === mi ? { ...x, applied: [...(x.applied || []), ai] } : x)));
  };

  return html`
    <div class="sheet-head">
      ${msgs.length > 0 && !busy
        ? html`<button type="button" class="link head-link" onClick=${() => setCoach([])}>Clear</button>`
        : html`<span class="icon-btn-spacer" />`}
      <span class="sheet-head-title">Coach</span>
      <button type="button" class="icon-btn" onClick=${close} aria-label="Close"><${Icon} name="close" /></button>
    </div>
    <div class="sheet-body chat" ref=${listRef}>
      ${!hasKey ? html`
        <${Empty} icon="chat" title="Ask anything about your eating">
          The coach knows your goal, targets, food log and weight trend, and can change your plan when you ask. It uses Claude through your own API key, at about 1 to 3¢ a question.
        <//>
        <button type="button" class="btn btn-primary btn-block" onClick=${toSettings}>Add your API key</button>
        <p class="fine center">Your plan's explanation, eating styles and calorie check-ins are free and work without a key.</p>
      ` : msgs.length === 0 ? html`
        <div class="chat-intro">
          <p class="lead">I can see your goal, targets, food log and weight trend. Ask me anything, or tap a question to start.</p>
          <div class="starters">
            ${STARTERS.map((q) => html`<button type="button" class="chip" onClick=${() => send(q)}>${q}</button>`)}
          </div>
        </div>
      ` : msgs.map((m, mi) => (m.role === 'user'
        ? html`<div class="bubble me">${m.text}</div>`
        : html`<div class="bubble coach">
            <${Rich} text=${m.text} />
            ${m.actions?.length > 0 && html`
              <div class="chat-actions">
                ${m.actions.map((a, ai) => (m.applied?.includes(ai)
                  ? html`<span class="chip static done"><${Icon} name="check" size=${15} stroke=${2.4} /> ${a.label}</span>`
                  : html`<button type="button" class="chip chip-accent" onClick=${() => tapAction(mi, ai)}>${a.label}</button>`))}
              </div>`}
          </div>`))}
      ${busy && html`<div class="bubble coach typing" aria-label="Coach is typing"><i /><i /><i /></div>`}
      ${error && html`<p class="error center">${error}</p>`}
    </div>
    ${hasKey && html`
      <form class="chat-input" onSubmit=${(e) => { e.preventDefault(); send(); }}>
        <textarea rows="1" value=${text} placeholder="Ask your coach…" enterkeyhint="send"
          onInput=${(e) => { setText(e.currentTarget.value); e.currentTarget.style.height = 'auto'; e.currentTarget.style.height = Math.min(120, e.currentTarget.scrollHeight) + 'px'; }}
          onKeyDown=${(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(); } }} />
        <button type="submit" class="send" disabled=${!text.trim() || busy} aria-label="Send"><${Icon} name="send" size=${20} stroke=${2.2} /></button>
      </form>`}`;
}
