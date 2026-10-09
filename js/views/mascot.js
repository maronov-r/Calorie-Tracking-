import { html, useState, useEffect, useRef, useMemo } from '../vendor/preact.js';
import { useStore, state, setSettings, getDay, shiftKey, dateKey as todayKey } from '../store.js';
import { Segmented } from '../ui.js';
import { focusFor, directionOf, macroLabel, macroValue, fmtWater } from '../nutrients.js';
import { CHARACTERS, mascotSvg, mascotSettings, mascotName, swatchBg } from '../mascot.js';

function loggedStreak(today) {
  let k = getDay(today).entries.length ? today : shiftKey(today, -1);
  let n = 0;
  while (getDay(k).entries.length) { n++; k = shiftKey(k, -1); }
  return n;
}

let cheeredOn = null; // the streak party plays once a day, the first time Today opens


// A mascot that can be tapped: squishes and sends up hearts.
function Buddy({ m, mood, label, className = '' }) {
  const ref = useRef();
  const svg = useMemo(() => mascotSvg(m, mood, label), [m.ch, m.pal, mood, label]);
  const boop = () => {
    const el = ref.current?.querySelector('svg');
    if (!el) return;
    el.classList.remove('boop');
    void el.getBBox();
    el.classList.add('boop');
    setTimeout(() => el.classList.remove('boop'), 1200);
  };
  return html`<button type="button" ref=${ref} class="buddy-btn ${className}" onClick=${boop} aria-label=${`${label}. Tap to say hi`}
    dangerouslySetInnerHTML=${{ __html: svg }} />`;
}

// ---- Today: the mascot and one line about the day ----

export function BuddyCard({ dateKey, totals, t, water }) {
  const s = useStore();
  const m = mascotSettings(s.settings);
  const today = todayKey();
  const [flash, setFlash] = useState(null);
  const timer = useRef();
  const prevWater = useRef(water);
  const prevMet = useRef(null);

  const focus = focusFor(s.profile, t);
  const dir = directionOf(focus, s.profile.goal, t);
  const label = macroLabel(focus, t);
  const value = macroValue(focus, totals, t);
  const kcal = totals.kcal || 0;
  const met = dir === 'min' ? value >= t[focus] * 0.98 : kcal >= t.kcal * 0.9 && value <= t[focus];
  const streak = loggedStreak(today);
  const logged = getDay(dateKey).entries.length > 0;

  const show = (mood, ms) => {
    setFlash(mood);
    clearTimeout(timer.current);
    timer.current = setTimeout(() => setFlash(null), ms);
  };
  useEffect(() => () => clearTimeout(timer.current), []);
  useEffect(() => {
    if (water > prevWater.current) show('water', 5000);
    prevWater.current = water;
  }, [water]);
  useEffect(() => {
    if (prevMet.current === false && met) show('goal', 7000);
    prevMet.current = met;
  }, [met]);
  useEffect(() => {
    if (streak >= 3 && cheeredOn !== today) { cheeredOn = today; show('cheer', 6000); }
  }, []);

  if (!m.on || dateKey !== today) return null;

  const hour = new Date().getHours();
  const mood = flash || (hour >= 22 || hour < 5 ? 'sleepy' : met ? 'goal' : 'chill');
  const name = mascotName(m);
  const lower = label.toLowerCase();
  const line = {
    water: `Ahh, refreshing. ${fmtWater(water, s.settings.units)} so far today.`,
    cheer: `${streak} days in a row. Keep it going!`,
    goal: dir === 'min' ? `You hit your ${lower} today. Nice work!` : `On target today, and under your ${lower} limit.`,
    sleepy: logged ? 'Getting late. Good day today, rest up.' : 'Getting late. See you tomorrow.',
    chill: !logged ? 'Log your first meal and I’ll keep you company.'
      : dir === 'min' ? `${Math.max(0, Math.round(t[focus] - value))} g ${lower} to go today.`
        : `${Math.max(0, Math.round(t[focus] - value))} g of ${lower} left before your limit.`,
  }[mood];

  return html`
    <div class="card buddy-card">
      <${Buddy} m=${m} mood=${mood} label=${name} />
      <div class="buddy-talk" aria-live="polite">
        <b>${name}</b>
        <p>${line}</p>
      </div>
    </div>`;
}

// ---- Settings: pick and name the buddy ----

export function MascotCard() {
  const s = useStore();
  const m = mascotSettings(s.settings);
  const update = (patch) => setSettings({ mascot: { ...mascotSettings(state.settings), ...patch } }); // latest values, so quick changes don't undo each other
  const c = CHARACTERS[m.ch];
  return html`
    <section class="card set-section" id="mascot">
      <h2 class="card-title">Your buddy</h2>
      <p class="fine">A little friend on the Today screen that reacts to your day: it celebrates goals, sips when you log water and gets sleepy at night. Tap it to say hi.</p>
      <${Segmented} options=${[{ value: true, label: 'Show on Today' }, { value: false, label: 'Hide' }]} value=${m.on} onChange=${(v) => update({ on: v })} />
      <div class="buddy-pick" role="group" aria-label="Character">
        ${Object.entries(CHARACTERS).map(([k, ch]) => html`
          <button type="button" class="buddy-choice" aria-pressed=${k === m.ch} onClick=${() => update({ ch: k, pal: 0 })}>
            <span dangerouslySetInnerHTML=${{ __html: mascotSvg({ ch: k, pal: k === m.ch ? m.pal : 0 }, 'chill', ch.label) }} />
            ${ch.label}
          </button>`)}
      </div>
      <div class="buddy-swatches" role="group" aria-label="Color">
        ${c.palettes.map((p, i) => html`
          <button type="button" class="buddy-swatch" aria-pressed=${i === m.pal} aria-label=${p.name} title=${p.name}
            style=${{ background: swatchBg(m.ch, p) }} onClick=${() => update({ pal: i })} />`)}
      </div>
      <label class="field">
        <span class="field-label">Name</span>
        <input type="text" id="buddy-name" maxlength="16" value=${m.name} placeholder=${c.label} autocomplete="off"
          onInput=${(e) => update({ name: e.currentTarget.value })} />
      </label>
    </section>`;
}
