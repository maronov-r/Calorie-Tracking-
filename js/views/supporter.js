// Supporter Pack screens: the card in Settings, the badge, and the goal celebration.
import { html, useState, useEffect, useRef } from '../vendor/preact.js';
import { useStore, state, setSettings, applyTheme, toast } from '../store.js';
import { Icon, Segmented } from '../ui.js';
import { SUPPORTER_ON, PACK_PRICE, PREMIUM_THEMES, APP_ICONS, iconFor, applyIcon } from '../supporter.js';

export const isSupporter = () => SUPPORTER_ON && !!state.settings.supporter;

export const SupporterBadge = () => html`<span class="sp-badge"><${Icon} name="heart" size=${13} stroke=${2.4} /> Supporter</span>`;

const reducedMotion = () => matchMedia('(prefers-reduced-motion: reduce)').matches;

// A small burst of dots when a goal is reached while you're looking (supporters, unless turned off).
// It plays when `trigger` changes to something truthy, so opening the app on a finished day stays calm.
export function Celebrate({ trigger, color, force = false }) {
  const s = useStore();
  const last = useRef(trigger);
  const [burst, setBurst] = useState(0);
  const on = force || (isSupporter() && s.settings.celebrate !== false);
  useEffect(() => {
    if (trigger && trigger !== last.current && on && !reducedMotion()) setBurst(Date.now());
    last.current = trigger;
  }, [trigger]);
  useEffect(() => {
    if (!burst) return;
    const timer = setTimeout(() => setBurst(0), 1500);
    return () => clearTimeout(timer);
  }, [burst]);
  if (!burst) return null;
  return html`
    <span class="burst" key=${burst} aria-hidden="true" style=${{ '--burst': color }}>
      ${Array.from({ length: 16 }, (_, i) => html`<i style=${{ '--a': `${i * 22.5}deg`, '--d': `${(i % 3) * 45}ms` }} />`)}
    </span>`;
}

export function SupporterCard() {
  const s = useStore();
  const unlocked = !!s.settings.supporter;
  const [preview, setPreview] = useState(null); // a theme tried on for now, not saved
  const [shownIcon, setShownIcon] = useState(s.settings.appIcon || 'classic');
  const [play, setPlay] = useState(0);
  const icon = iconFor(shownIcon);
  const iconOn = (s.settings.appIcon || 'classic') === icon.value;

  // Leaving Settings ends a preview.
  useEffect(() => () => applyTheme(state.settings.theme), []);

  const endPreview = () => { setPreview(null); applyTheme(state.settings.theme); };
  const tryTheme = (value) => {
    if (unlocked) { setSettings({ theme: value }); return; }
    if (preview === value) { endPreview(); return; }
    setPreview(value);
    applyTheme(value, true);
  };
  const unlock = () => {
    setSettings({ supporter: true, ...(preview && { theme: preview }) });
    setPreview(null);
    toast('Thank you for supporting Plate! (Pretend unlock, no money moved.)');
  };
  const relock = () => {
    const premium = PREMIUM_THEMES.some((x) => x.value === s.settings.theme);
    setSettings({ supporter: false, appIcon: 'classic', ...(premium && { theme: 'oat' }) });
    applyIcon('classic');
    setShownIcon('classic');
  };
  const useIcon = () => { setSettings({ appIcon: icon.value }); applyIcon(icon.value); };
  const previewName = PREMIUM_THEMES.find((x) => x.value === preview)?.label;

  return html`
    <section class="card set-section supporter" id="supporter">
      <div class="sp-head">
        <span class="sp-mark"><${Icon} name="heart" size=${22} stroke=${2} /><${Celebrate} trigger=${play} color="var(--accent)" force /></span>
        <div class="sp-head-text">
          <h2 class="card-title">Supporter Pack</h2>
          ${unlocked ? html`<${SupporterBadge} />` : html`<span class="sp-price">${PACK_PRICE} · one time</span>`}
        </div>
      </div>
      <p class="sp-pitch">Plate is free and private. If you love it, the Supporter Pack is a one-time way to help keep it going.</p>
      <ul class="sp-perks">
        <li><b>${PREMIUM_THEMES.length} themes</b> made with care</li>
        <li><b>${APP_ICONS.length - 1} app icons</b> for your home screen</li>
        <li><b>Goal celebrations</b>, a little burst when you hit a target
          <button type="button" class="link" onClick=${() => setPlay((n) => n + 1)}>Try it</button></li>
        <li><b>A supporter badge</b> on your profile</li>
      </ul>

      <p class="group-label">Themes</p>
      <div class="themes">
        ${PREMIUM_THEMES.map((th) => {
          const on = unlocked ? th.value === s.settings.theme : th.value === preview;
          return html`
            <button type="button" class="theme ${on ? 'on' : ''}" onClick=${() => tryTheme(th.value)} aria-pressed=${on}>
              <span class="theme-swatch" style=${{ background: th.swatch[0] }}>
                <i style=${{ background: th.swatch[1] }} /><i style=${{ background: th.swatch[2] }} />
                ${!unlocked && html`<span class="theme-lock"><${Icon} name="lock" size=${13} stroke=${2.2} /></span>`}
              </span>
              <span class="theme-name">${th.label}</span>
              <span class="theme-hint">${th.hint}</span>
            </button>`;
        })}
      </div>
      ${preview && html`
        <div class="sp-preview">
          <span>Previewing <b>${previewName}</b>. It goes back to your theme when you leave Settings.</span>
          <div class="coach-btns">
            <button type="button" class="btn btn-quiet" onClick=${endPreview}>Back</button>
            <button type="button" class="btn btn-primary" onClick=${unlock}>Unlock</button>
          </div>
        </div>`}

      <p class="group-label">App icon</p>
      <div class="icon-grid" role="radiogroup">
        ${APP_ICONS.map((ic) => html`
          <button type="button" role="radio" aria-checked=${ic.value === shownIcon} class="icon-pick ${ic.value === shownIcon ? 'on' : ''}"
            onClick=${() => setShownIcon(ic.value)} aria-label=${ic.label}>
            <img src=${ic.src} alt="" width="56" height="56" />
            ${!unlocked && !ic.free && html`<span class="theme-lock"><${Icon} name="lock" size=${12} stroke=${2.2} /></span>`}
          </button>`)}
      </div>
      <div class="icon-preview">
        <img src=${icon.src} alt="" width="84" height="84" />
        <div>
          <b>${icon.label}</b>
          <span>${icon.hint}</span>
          <small>Applies on the App Store version. Here it changes the browser tab icon.</small>
          ${unlocked
            ? html`<button type="button" class="chip ${iconOn ? 'done' : 'chip-accent'}" disabled=${iconOn} onClick=${useIcon}>
                ${iconOn ? html`<${Icon} name="check" size=${15} stroke=${2.4} /> In use` : 'Use this icon'}</button>`
            : !icon.free && html`<button type="button" class="chip chip-accent" onClick=${unlock}><${Icon} name="lock" size=${14} stroke=${2.2} /> Unlock</button>`}
        </div>
      </div>

      ${unlocked && html`
        <div class="set-row">
          <span>Goal celebrations</span>
          <${Segmented} className="seg-sm" options=${[{ value: true, label: 'On' }, { value: false, label: 'Off' }]}
            value=${s.settings.celebrate !== false} onChange=${(v) => setSettings({ celebrate: v })} />
        </div>`}

      ${unlocked
        ? html`<p class="fine">You're a supporter. Thank you, it really helps.
            <button type="button" class="link" onClick=${relock}>Undo pretend unlock</button></p>`
        : html`
          <button type="button" class="btn btn-primary btn-block" onClick=${unlock}>Unlock everything · ${PACK_PRICE}</button>
          <p class="fine center">Test version: unlocking is pretend and no money moves.</p>`}
    </section>`;
}
