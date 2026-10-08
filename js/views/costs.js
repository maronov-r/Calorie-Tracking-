// What each AI feature really costs, from the token counts Anthropic bills. Numbers only, never content.
import { html } from '../vendor/preact.js';
import { useStore, clearAiLog } from '../store.js';
import { AI_MODELS, fmtAiCents } from '../ai.js';

const KINDS = { coach: 'Coach questions', meal: 'Meal logs', label: 'Label scans' };
const PRICE_CENTS = 5; // the planned price per coach question
const STORE_FEE = 0.15;
const k = (n) => Math.round(n).toLocaleString('en-US');

export function AiCostCard() {
  const s = useStore();
  const log = s.aiLog;
  const groups = {};
  for (const x of log) (groups[`${x.kind}|${x.model}`] ||= []).push(x);
  const rows = Object.entries(groups).map(([key, xs]) => {
    const [kind, model] = key.split('|');
    const avg = (f) => xs.reduce((a, x) => a + (x[f] || 0), 0) / xs.length;
    const cents = xs.map((x) => x.cents);
    return {
      kind, model, n: xs.length, avg: avg('cents'), total: cents.reduce((a, c) => a + c, 0),
      lo: Math.min(...cents), hi: Math.max(...cents),
      tokIn: avg('in') + avg('cacheRead') + avg('cacheWrite'), tokReused: avg('cacheRead'), tokOut: avg('out'), steps: avg('steps'),
    };
  }).sort((a, b) => b.n - a.n);
  const modelName = (id) => AI_MODELS.find((m) => m.id === id)?.label.replace('Claude ', '') || id;
  const coach = rows.filter((r) => r.kind === 'coach');
  const coachN = coach.reduce((a, r) => a + r.n, 0);
  const coachAvg = coachN ? coach.reduce((a, r) => a + r.avg * r.n, 0) / coachN : 0;
  const keep = PRICE_CENTS * (1 - STORE_FEE) - coachAvg;

  return html`
    <section class="card set-section" id="costs">
      <h2 class="card-title">What AI costs you</h2>
      <p class="fine">Worked out from what Anthropic bills for each request. Only the numbers are kept on this phone, never what you asked.</p>
      ${!log.length ? html`<p class="fine">Ask the coach or log a meal with AI, and the real cost shows up here.</p>` : html`
        <div class="plan-list cost-rows">
          ${rows.map((r) => html`
            <div>
              <span>${KINDS[r.kind] || r.kind} · ${modelName(r.model)}
                <small>${r.n} so far · ${fmtAiCents(r.lo)} to ${fmtAiCents(r.hi)} · total ${fmtAiCents(r.total)}</small>
                <small>Each: ${k(r.tokIn)} tokens in${r.tokReused ? ` (${k(r.tokReused)} reused)` : ''}, ${k(r.tokOut)} out${r.kind === 'coach' ? `, ${r.steps.toFixed(1)} steps` : ''}</small>
              </span>
              <b>${fmtAiCents(r.avg)}<small>average</small></b>
            </div>`)}
        </div>
        ${coachN >= 3 && html`
          <p class=${`cost-verdict ${keep > 0 ? 'good' : 'bad'}`}>
            At ${PRICE_CENTS}¢ a coach question, after Apple's 15% you'd ${keep > 0 ? html`keep about <b>${fmtAiCents(keep)}</b>` : html`<b>lose about ${fmtAiCents(-keep)}</b>`} per question.
          </p>`}
        <button type="button" class="link" onClick=${clearAiLog}>Clear these numbers</button>`}
    </section>`;
}
