// Demo of coach credit: the privacy promise, a pretend checkout and the balance in Settings.
import { html, useState } from '../vendor/preact.js';
import { useStore, eraseAll, toast } from '../store.js';
import { Icon, Sheet } from '../ui.js';
import { coachContext } from '../coach.js';
import {
  BETA, TIERS, currentTier, setTier, tierPriceText, markupNow, deleteServerAccount, wallet, addCredit, markPrivacySeen, setDemoBalance, split, fmtMoney, fmtCents, questionsFor, PACKS, STARTER_CENTS, PRICE_CENTS, AI_COST_CENTS, LEAN_AI_COST_CENTS,
} from '../demo.js';
import { ChoiceList } from './settings.js';

// What the coach gets, shown before the first question and any time after.
export function PrivacyPane({ onDone }) {
  useStore();
  const w = wallet();
  const [show, setShow] = useState(false);
  const done = () => { markPrivacySeen(); onDone(); };
  return html`
    <div class="privacy-pane">
      <h3 class="pp-title">Your info stays yours</h3>
      <ul class="pp-list">
        <li><b>Everything lives on your phone.</b> Your food log, weight and plan are never uploaded.</li>
        <li><b>Only when you ask</b>, Plate sends your question with a short summary so the coach can answer.</li>
        <li><b>Nothing is kept.</b> Plate's server passes it to the AI and only writes down the cost, like “5¢”, next to a random number. No name, no email.</li>
        <li><b>No ads, no tracking, nothing sold.</b></li>
      </ul>
      <button type="button" class="link" onClick=${() => setShow(!show)}>${show ? 'Hide' : 'See exactly'} what the coach gets</button>
      ${show && html`<pre class="pp-shared">${coachContext()}</pre>`}
      <p class="fine">${BETA ? 'This is a test version: answers come from the real AI through your Plate server, and credit is pretend.' : 'In this demo, nothing leaves your phone at all.'}</p>
      ${!w.seenPrivacy && html`<p class="pp-credit">You have <b>${fmtCents(STARTER_CENTS)} free</b> to try it: about ${questionsFor(STARTER_CENTS)} questions.</p>`}
      <button type="button" class="btn btn-primary btn-block" onClick=${done}>${w.seenPrivacy ? 'Back to the chat' : 'Got it'}</button>
    </div>`;
}

// The pretend checkout. In the real app this would open Apple's or Google's payment sheet.
export function TopUp({ onDone, onCancel }) {
  const [pick, setPick] = useState(PACKS[0].value);
  const [busy, setBusy] = useState(false);
  const pack = PACKS.find((x) => x.value === pick);
  const pay = () => {
    setBusy(true);
    Promise.all([addCredit(pack), new Promise((r) => setTimeout(r, 1100))])
      .then(onDone)
      .catch((err) => { setBusy(false); toast(err.message || "Couldn’t add credit. Try again."); });
  };
  return html`
    <div class="topup">
      <h3 class="pp-title">Add coach credit</h3>
      <p class="fine">Pay only for what you use. No subscription, and credit never expires.</p>
      <${ChoiceList} options=${PACKS.map((x) => ({
        value: x.value,
        label: x.credit > x.value ? `${x.label}, get ${fmtMoney(x.credit)}` : x.label,
        hint: `About ${questionsFor(x.credit)} questions${x.credit > x.value ? ` · ${fmtMoney(x.credit - x.value)} bonus` : ''}`,
      }))} value=${pick} onChange=${setPick} />
      <button type="button" class="btn btn-pay btn-block" disabled=${busy} onClick=${pay}>
        ${busy ? html`<span class="spinner" /> Paying…` : `Pay ${fmtMoney(pack.value)}`}
      </button>
      <p class="fine center">Demo: no real money. In the real app this opens Apple's or Google's payment screen.</p>
      ${onCancel && html`<button type="button" class="btn btn-quiet btn-block" onClick=${onCancel} disabled=${busy}>Not now</button>`}
    </div>`;
}

export function TopUpSheet({ onClose }) {
  return html`<${Sheet} onClose=${onClose} label="Add credit"
    render=${(close) => html`
      <div class="sheet-head">
        <span class="icon-btn-spacer" />
        <span class="sheet-head-title">Add credit</span>
        <button type="button" class="icon-btn" onClick=${close} aria-label="Close"><${Icon} name="close" /></button>
      </div>
      <div class="sheet-body"><${TopUp} onDone=${close} /></div>`} />`;
}

const when = (t) => new Date(t).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });

// Settings: balance, recent use, and the owner's side of the money.
export function CreditCard({ openSheet }) {
  useStore();
  const w = wallet();
  const [owner, setOwner] = useState(false);
  return html`
    <section class="card set-section" id="ai">
      <h2 class="card-title">AI coach credit</h2>
      <div class="credit-hero">
        <b>${fmtMoney(w.cents)}</b>
        <span>about ${w.cents > 0 ? questionsFor(w.cents) : 0} questions left</span>
      </div>
      <button type="button" class="btn btn-primary btn-block" onClick=${() => openSheet({ type: 'topup' })}><${Icon} name="plus" size=${18} /> Add credit</button>
      <p class="fine">Plate is free. Only the AI coach uses credit, a few cents a question. Your data stays on this phone.</p>
      ${BETA && html`
        <p class="list-label">Coach quality</p>
        <${ChoiceList} options=${TIERS.map((t) => ({ value: t.value, label: t.label, hint: `${tierPriceText(t)}${t.value === 'best' ? ' · most detailed, uses credit about 3× faster' : ' · great for almost everything'}` }))}
          value=${currentTier().value} onChange=${setTier} />`}

      ${w.log.length > 0 && html`
        <p class="list-label">Recent</p>
        <div class="plan-list credit-log">
          ${w.log.slice(0, 6).map((x) => html`<div><span>${x.what}<small>${when(x.t)}</small></span><b class=${x.cents > 0 ? 'plus' : ''}>${x.cents > 0 ? '+' : '−'}${fmtCents(Math.abs(x.cents))}</b></div>`)}
        </div>`}

      <button type="button" class="link" onClick=${() => setOwner(!owner)}>${owner ? 'Hide' : 'Owner view:'} where the money goes</button>
      ${owner && html`
        <div class="owner">
          ${PACKS.map((x) => {
            const m = split(x);
            return html`<div class="owner-row">
              <b>${x.label} top-up: they get about ${questionsFor(x.credit)} questions</b>
              <span>Apple or Google take ${fmtMoney(m.fee)} · the AI bill for those questions is ${fmtMoney(m.ai)} · <b class="keep">you keep ${fmtMoney(m.keep)}</b></span>
              ${!BETA && html`<span>If you get the AI cost down to ${LEAN_AI_COST_CENTS}¢: <b class="keep">you keep ${fmtMoney(m.keepLean)}</b></span>`}
            </div>`;
          })}
          ${BETA ? html`<p class="fine">People pay what the AI costs × ${markupNow()}. Question counts are for ${currentTier().label}. The free ${fmtCents(STARTER_CENTS)} starter credit costs you about ${fmtCents(STARTER_CENTS / markupNow())} per person who tries the coach.</p>` : html`<p class="fine">Every question is ${PRICE_CENTS}¢ for the user and about ${AI_COST_CENTS}¢ for you in AI. The free starter credit (${STARTER_CENTS / PRICE_CENTS} questions) costs you about ${fmtCents(STARTER_CENTS / PRICE_CENTS * AI_COST_CENTS)} per person who tries the coach.</p>`}
        </div>`}

      <p class="list-label">Demo tools</p>
      <div class="chips">
        ${!BETA && html`<button type="button" class="chip" onClick=${() => setDemoBalance(5)}>Set credit to 5¢</button>`}
        <button type="button" class="chip" onClick=${async () => { await deleteServerAccount(); eraseAll(); }}>${BETA ? 'Delete my AI account and start over' : 'Start the demo over'}</button>
      </div>
    </section>`;
}
