// Agreeing to the Terms of Use: on first launch, and again whenever TERMS_VERSION goes up.
import { html, useState } from '../vendor/preact.js';
import { setSettings } from '../store.js';

export const TERMS_VERSION = 1;
const SITE = 'https://maronov-r.github.io/Calorie-Tracking-/'; // absolute, so links also work inside the iPhone app
export const TERMS_URL = `${SITE}terms.html`;
export const PRIVACY_URL = `${SITE}privacy.html`;

export const termsAccepted = (settings) => (settings.terms?.v || 0) >= TERMS_VERSION;
const accept = () => setSettings({ terms: { v: TERMS_VERSION, at: Date.now() } });

const Check = ({ on, set, children }) => html`
  <label class="agree-row">
    <input type="checkbox" checked=${on} onChange=${(e) => set(e.currentTarget.checked)} />
    <span>${children}</span>
  </label>`;

// The two checkboxes and the button. `label` is the button text; `onDone` runs after accepting.
export function TermsAgree({ label = 'Agree and continue', onDone }) {
  const [age, setAge] = useState(false);
  const [terms, setTerms] = useState(false);
  return html`
    <div class="agree">
      <${Check} on=${age} set=${setAge}>I'm 18 or older, or I'm 14 to 17 and a parent or guardian has read and agrees to the Terms too.<//>
      <${Check} on=${terms} set=${setTerms}>
        I agree to the <a href=${TERMS_URL} target="_blank" rel="noopener">Terms of Use</a> and <a href=${PRIVACY_URL} target="_blank" rel="noopener">Privacy Policy</a>, and I understand Plate and its coach give general estimates, not medical advice.
      <//>
      <button type="button" class="btn btn-primary btn-block btn-lg" disabled=${!(age && terms)} onClick=${() => { accept(); onDone?.(); }}>${label}</button>
    </div>`;
}

// Full screen for people who set up Plate before the Terms existed (or before they changed).
export function TermsGate() {
  return html`
    <div class="ob ob-welcome">
      <div class="ob-hero">
        <h1 class="ob-title">Before you continue</h1>
        <p class="ob-lead">Plate has Terms of Use. The short version: Plate and its AI coach give general estimates, not medical advice, and can make mistakes. Check with a doctor before changing your diet, supplements or medication.</p>
      </div>
      <${TermsAgree} />
    </div>`;
}
