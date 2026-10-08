// Shared UI building blocks.
import { html, useState, useEffect, useRef } from './vendor/preact.js';
import { fmtQty, fmtKcal, fmtNum, MICROS } from './nutrients.js';

const P = (d) => html`<path d=${d} />`;
const ICONS = {
  plus: P('M12 5v14M5 12h14'),
  minus: P('M5 12h14'),
  close: P('M6 6l12 12M18 6L6 18'),
  check: P('M5 12.5l4.5 4.5L19 7.5'),
  back: P('M15 5l-7 7 7 7'),
  left: P('M14.5 6l-6 6 6 6'),
  right: P('M9.5 6l6 6-6 6'),
  search: html`<circle cx="11" cy="11" r="6.5" /><path d="M20 20l-4.2-4.2" />`,
  barcode: P('M4 8V5.5A1.5 1.5 0 0 1 5.5 4H8M16 4h2.5A1.5 1.5 0 0 1 20 5.5V8M20 16v2.5a1.5 1.5 0 0 1-1.5 1.5H16M8 20H5.5A1.5 1.5 0 0 1 4 18.5V16M8 8.5v7M11 8.5v7M14 8.5v7M17 8.5v7'),
  sparkle: P('M12 3.5l1.9 5.1a2 2 0 0 0 1.2 1.2l5.1 1.9-5.1 1.9a2 2 0 0 0-1.2 1.2L12 20.5l-1.9-5.1a2 2 0 0 0-1.2-1.2L3.8 12.3l5.1-1.9a2 2 0 0 0 1.2-1.2z'),
  camera: html`<path d="M4 8.5A1.5 1.5 0 0 1 5.5 7h2l1.6-2h5.8l1.6 2h2A1.5 1.5 0 0 1 20 8.5v9a1.5 1.5 0 0 1-1.5 1.5h-13A1.5 1.5 0 0 1 4 17.5z" /><circle cx="12" cy="12.8" r="3.3" />`,
  drop: P('M12 3.5s6 6.4 6 10.9a6 6 0 0 1-12 0c0-4.5 6-10.9 6-10.9z'),
  sliders: html`<path d="M4 7h9M17 7h3M4 17h3M11 17h9" /><circle cx="15" cy="7" r="2" /><circle cx="9" cy="17" r="2" />`,
  ring: html`<circle cx="12" cy="12" r="7.5" opacity=".35" /><path d="M12 4.5a7.5 7.5 0 0 1 7.5 7.5" />`,
  leaf: P('M5 19c0-8 5.5-14 14-14 0 8.5-6 14-14 14zM5 19l6.5-6.5'),
  trash: P('M4.5 7h15M9.5 7V4.5h5V7M6.5 7l.9 12.5h9.2L17.5 7M10 11v5M14 11v5'),
  pill: html`<rect x="3.2" y="8.6" width="17.6" height="6.8" rx="3.4" transform="rotate(-45 12 12)" /><path d="M9.6 9.6l4.8 4.8" />`,
  edit: P('M4 20h4L19 9l-4-4L4 16zM13.5 6.5l4 4'),
  download: P('M12 4v11M7.5 10.5L12 15l4.5-4.5M5 20h14'),
  upload: P('M12 15V4M7.5 8.5L12 4l4.5 4.5M5 20h14'),
  key: html`<circle cx="8" cy="15" r="3.5" /><path d="M10.5 12.5L19 4M16 7l2.5 2.5M14 9l2 2" />`,
  info: html`<circle cx="12" cy="12" r="8.5" /><path d="M12 11v5M12 7.8v.2" />`,
  share: P('M12 15V4M8 7.5L12 3.5l4 4M6 11H5v9h14v-9h-1'),
  history: P('M4 12a8 8 0 1 0 2.3-5.6M4 4.5V8h3.5M12 8v4.5l3 2'),
};

export const Icon = ({ name, size = 22, stroke = 1.8 }) => html`
  <svg class="icon" width=${size} height=${size} viewBox="0 0 24 24" fill="none" stroke="currentColor"
    stroke-width=${stroke} stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${ICONS[name]}</svg>`;

export function Ring({ value, max, size = 200, stroke = 12, color = 'var(--accent)', track = 'var(--track)', className = '', children }) {
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const pct = max > 0 ? Math.max(0, Math.min(value / max, 1)) : 0;
  const mid = size / 2;
  return html`
    <div class="ring ${className}" style=${{ width: size + 'px', height: size + 'px' }}>
      <svg width=${size} height=${size} viewBox=${`0 0 ${size} ${size}`}>
        <circle cx=${mid} cy=${mid} r=${r} fill="none" stroke=${track} stroke-width=${stroke} />
        ${pct > 0 && html`<circle class="ring-progress" cx=${mid} cy=${mid} r=${r} fill="none" stroke=${color}
          stroke-width=${stroke} stroke-linecap="round" stroke-dasharray=${c} stroke-dashoffset=${c * (1 - pct)}
          transform=${`rotate(-90 ${mid} ${mid})`} />`}
      </svg>
      ${children && html`<div class="ring-center">${children}</div>`}
    </div>`;
}

export const Bar = ({ value, max, color = 'var(--accent)', className = '' }) => {
  const pct = max > 0 ? Math.max(0, Math.min(value / max, 1)) : 0;
  return html`<div class="bar ${className}"><div class="bar-fill" style=${{ width: pct * 100 + '%', background: color }} /></div>`;
};

export function Sheet({ onClose, label, className = '', render }) {
  const [leaving, setLeaving] = useState(false);
  const ref = useRef();
  const drag = useRef(null);
  const closing = useRef(false);

  const close = () => {
    if (closing.current) return;
    closing.current = true;
    if (ref.current) ref.current.style.transform = '';
    setLeaving(true);
    setTimeout(onClose, 230);
  };

  useEffect(() => {
    const onKey = (e) => e.key === 'Escape' && close();
    addEventListener('keydown', onKey);
    document.body.classList.add('sheet-open');
    return () => {
      removeEventListener('keydown', onKey);
      document.body.classList.remove('sheet-open');
    };
  }, []);

  const down = (e) => {
    drag.current = { y: e.clientY, dy: 0 };
    e.currentTarget.setPointerCapture?.(e.pointerId);
  };
  const move = (e) => {
    if (!drag.current) return;
    const dy = Math.max(0, e.clientY - drag.current.y);
    drag.current.dy = dy;
    ref.current.style.transition = 'none';
    ref.current.style.transform = `translateY(${dy}px)`;
  };
  const up = () => {
    if (!drag.current) return;
    const { dy } = drag.current;
    drag.current = null;
    ref.current.style.transition = '';
    if (dy > 110) close();
    else ref.current.style.transform = '';
  };

  return html`
    <div class="sheet-layer ${leaving ? 'leaving' : ''}">
      <div class="sheet-backdrop" onClick=${close} />
      <div class="sheet ${className}" ref=${ref} role="dialog" aria-modal="true" aria-label=${label}>
        <div class="sheet-grip" onPointerDown=${down} onPointerMove=${move} onPointerUp=${up} onPointerCancel=${up}><span /></div>
        ${render(close)}
      </div>
    </div>`;
}

export const Segmented = ({ options, value, onChange, className = '' }) => html`
  <div class="seg ${className}" role="tablist">
    ${options.map((o) => html`
      <button type="button" role="tab" aria-selected=${o.value === value} class=${o.value === value ? 'on' : ''}
        onClick=${() => onChange(o.value)}>
        ${o.icon && html`<${Icon} name=${o.icon} size=${17} />`}<span>${o.label}</span>
      </button>`)}
  </div>`;

export function Stepper({ value, onChange, step = 0.5, min = 0.25, display }) {
  const dec = () => onChange(Math.max(min, +(value - step).toFixed(2)));
  const inc = () => onChange(+(value + step).toFixed(2));
  return html`
    <div class="stepper">
      <button type="button" class="step-btn" onClick=${dec} disabled=${value <= min} aria-label="Less"><${Icon} name="minus" size=${18} /></button>
      <span class="step-val">${display ? display(value) : fmtQty(value)}</span>
      <button type="button" class="step-btn" onClick=${inc} aria-label="More"><${Icon} name="plus" size=${18} /></button>
    </div>`;
}

// Number input that keeps the iOS decimal keypad and tolerates partial input.
export function NumberInput({ value, onChange, placeholder, className = '', suffix, label, step }) {
  const [text, setText] = useState(value == null || value === '' ? '' : String(value));
  useEffect(() => {
    const parsed = parseFloat(text);
    if (value !== (isNaN(parsed) ? '' : parsed)) setText(value == null || value === '' ? '' : String(value));
  }, [value]);
  return html`
    <label class="num-input ${className}">
      ${label && html`<span class="num-label">${label}</span>`}
      <span class="num-wrap">
        <input type="text" inputmode="decimal" enterkeyhint="done" placeholder=${placeholder} value=${text} step=${step}
          onInput=${(e) => {
            const t = e.currentTarget.value.replace(',', '.');
            setText(t);
            const v = parseFloat(t);
            onChange(isNaN(v) ? '' : v);
          }} />
        ${suffix && html`<span class="num-suffix">${suffix}</span>`}
      </span>
    </label>`;
}

export function Toast({ toast, onDismiss }) {
  if (!toast) return null;
  return html`
    <div class="toast" key=${toast.id} role="status">
      <span>${toast.message}</span>
      ${toast.action && html`<button type="button" onClick=${() => { toast.action.run(); onDismiss(); }}>${toast.action.label}</button>`}
    </div>`;
}

export const Empty = ({ icon, title, children }) => html`
  <div class="empty">
    ${icon && html`<div class="empty-icon"><${Icon} name=${icon} size=${26} /></div>`}
    <p class="empty-title">${title}</p>
    ${children && html`<div class="empty-body">${children}</div>`}
  </div>`;

export const statusColor = (s) => ({ low: 'var(--low)', mid: 'var(--mid)', good: 'var(--good)', over: 'var(--over)', none: 'var(--ink-3)' }[s]);

const SUMMARY_MACROS = [['protein', 'Protein'], ['carbs', 'Carbs'], ['fat', 'Fat']];

// Calories, macros and the vitamins/minerals a food is richest in.
export function NutritionSummary({ n, t }) {
  const micros = MICROS
    .map((m) => ({ m, pct: (n[m.key] || 0) / t[m.key] }))
    .filter((x) => x.pct >= 0.05)
    .sort((a, b) => b.pct - a.pct)
    .slice(0, 6);
  return html`
    <div class="nsum">
      <div class="nsum-kcal"><span class="nsum-num">${fmtKcal(n.kcal)}</span><span class="nsum-unit">kcal</span></div>
      <div class="nsum-macros">
        ${SUMMARY_MACROS.map(([k, label]) => html`
          <div class="nsum-macro">
            <span class="nsum-label"><i class="dot" style=${{ background: `var(--${k})` }} />${label}</span>
            <b>${fmtNum(n[k] || 0)} g</b>
          </div>`)}
      </div>
      ${micros.length > 0 && html`
        <p class="group-label">Richest in</p>
        <div class="chips">
          ${micros.map((x) => html`<span class="chip static">${x.m.name.replace(/ \(.+\)/, '')} <b>${Math.round(x.pct * 100)}%</b></span>`)}
        </div>`}
    </div>`;
}
