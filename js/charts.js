// Small SVG charts: weight trend (line + weigh-in dots) and daily intake (columns + goal line).
import { html, useState, useRef, useLayoutEffect } from './vendor/preact.js';
import { parseKey } from './store.js';
import { kgToDisplay, weightUnit, fmtKcal } from './nutrients.js';
import { dayNum } from './weight.js';

function useWidth(ref, fallback = 320) {
  const [width, setWidth] = useState(fallback);
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return undefined;
    setWidth(el.clientWidth || fallback);
    if (!window.ResizeObserver) return undefined;
    const ro = new ResizeObserver(([e]) => setWidth(Math.round(e.contentRect.width)));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  return width;
}

function niceTicks(min, max, count = 4) {
  const raw = (max - min || 1) / (count - 1);
  const mag = 10 ** Math.floor(Math.log10(raw));
  const step = [1, 2, 2.5, 5, 10].map((s) => s * mag).find((s) => s >= raw);
  const lo = Math.floor(min / step) * step;
  const hi = Math.ceil(max / step) * step;
  const ticks = [];
  for (let v = lo; v <= hi + step / 2; v += step) ticks.push(+v.toFixed(6));
  return { lo, hi, ticks };
}

const shortDate = (key) => parseKey(key).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
const longDate = (key) => parseKey(key).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
const fmtTick = (v) => (Number.isInteger(v) ? v.toLocaleString('en-US') : v.toFixed(1));

// Tooltip box placed above a point, kept inside the chart.
const Tip = ({ x, y, width, children }) => {
  const w = 132;
  const left = Math.max(0, Math.min(width - w, x - w / 2));
  return html`<div class="chart-tip" style=${{ left: `${left}px`, top: `${Math.max(0, y - 66)}px`, width: `${w}px` }}>${children}</div>`;
};

export function WeightChart({ points, from, to, units }) {
  const ref = useRef();
  const W = useWidth(ref);
  const H = 190;
  const pad = { l: 38, r: 14, t: 14, b: 26 };
  const [hover, setHover] = useState(null);

  const disp = (kg) => kgToDisplay(kg, units);
  const vals = points.flatMap((p) => [disp(p.kg), disp(p.trend)]);
  let min = Math.min(...vals);
  let max = Math.max(...vals);
  const minSpan = units === 'metric' ? 1 : 2;
  if (max - min < minSpan) { const mid = (max + min) / 2; min = mid - minSpan / 2; max = mid + minSpan / 2; }
  const { lo, hi, ticks } = niceTicks(min, max, 4);

  const d0 = dayNum(from);
  const d1 = dayNum(to);
  const plotW = W - pad.l - pad.r;
  const x = (key) => pad.l + ((dayNum(key) - d0) / Math.max(1, d1 - d0)) * plotW;
  const y = (v) => pad.t + (1 - (v - lo) / (hi - lo)) * (H - pad.t - pad.b);
  const trend = points.map((p, i) => `${i ? 'L' : 'M'}${x(p.key).toFixed(1)},${y(disp(p.trend)).toFixed(1)}`).join('');
  const last = points[points.length - 1];

  const track = (e) => {
    const px = e.clientX - e.currentTarget.getBoundingClientRect().left;
    let best = 0;
    points.forEach((p, i) => { if (Math.abs(x(p.key) - px) < Math.abs(x(points[best].key) - px)) best = i; });
    setHover(best);
  };
  const h = hover != null ? points[hover] : null;
  const unit = weightUnit(units);

  return html`
    <div class="chart" ref=${ref}>
      <svg width=${W} height=${H} role="img"
        aria-label=${`Weight from ${shortDate(points[0].key)} to ${shortDate(last.key)}: ${disp(points[0].kg).toFixed(1)} to ${disp(last.kg).toFixed(1)} ${unit}`}
        onPointerDown=${track} onPointerMove=${track} onPointerLeave=${() => setHover(null)}>
        ${ticks.map((t) => html`
          <line x1=${pad.l} x2=${W - pad.r} y1=${y(t)} y2=${y(t)} class="grid" />
          <text x=${pad.l - 8} y=${y(t) + 4} class="tick" text-anchor="end">${fmtTick(t)}</text>`)}
        <text x=${pad.l} y=${H - 6} class="tick">${shortDate(from)}</text>
        <text x=${W - pad.r} y=${H - 6} class="tick" text-anchor="end">${shortDate(to)}</text>
        ${points.map((p) => html`<circle cx=${x(p.key)} cy=${y(disp(p.kg))} r="4" class="wdot" />`)}
        ${points.length > 1 && html`<path d=${trend} class="wline" />`}
        <circle cx=${x(last.key)} cy=${y(disp(last.trend))} r="5" class="wend" />
        ${h && html`
          <line x1=${x(h.key)} x2=${x(h.key)} y1=${pad.t} y2=${H - pad.b} class="crosshair" />
          <circle cx=${x(h.key)} cy=${y(disp(h.kg))} r="5.5" class="wdot hot" />`}
      </svg>
      ${h && html`
        <${Tip} x=${x(h.key)} y=${y(disp(h.kg))} width=${W}>
          <b>${disp(h.kg).toFixed(1)} ${unit}</b>
          <span>${longDate(h.key)}</span>
          <span>Trend ${disp(h.trend).toFixed(1)}</span>
        <//>`}
      <div class="chart-legend">
        <span><i class="key-dot" />Weigh-ins</span>
        <span><i class="key-line" />7-day trend</span>
      </div>
    </div>`;
}

// One column per day. `days`: [{ key, value, logged }]
export function IntakeChart({ days, goal, unit, label, color, todayKey }) {
  const ref = useRef();
  const W = useWidth(ref);
  const H = 170;
  const pad = { l: 40, r: 6, t: 18, b: 24 };
  const [hover, setHover] = useState(null);

  const max = Math.max(goal * 1.2, ...days.map((d) => d.value));
  const { hi, ticks } = niceTicks(0, max, 3);
  const plotW = W - pad.l - pad.r;
  const band = plotW / days.length;
  const bw = Math.min(24, Math.max(6, band - 6));
  const y = (v) => pad.t + (1 - v / hi) * (H - pad.t - pad.b);
  const base = y(0);
  const fmt = (v) => (unit === 'kcal' ? fmtKcal(v) : Math.round(v));

  const column = (cx, top) => {
    const h = base - top;
    const r = Math.min(4, h, bw / 2);
    const x0 = cx - bw / 2;
    const x1 = cx + bw / 2;
    return `M${x0},${base}V${top + r}Q${x0},${top} ${x0 + r},${top}H${x1 - r}Q${x1},${top} ${x1},${top + r}V${base}Z`;
  };
  const hv = hover != null ? days[hover] : null;
  const cx = (i) => pad.l + band * i + band / 2;

  return html`
    <div class="chart" ref=${ref}>
      <svg width=${W} height=${H} role="img" aria-label=${`Daily ${label} for the last ${days.length} days, goal ${fmt(goal)} ${unit}`}
        onPointerLeave=${() => setHover(null)}>
        ${ticks.map((t) => html`
          <line x1=${pad.l} x2=${W - pad.r} y1=${y(t)} y2=${y(t)} class="grid" />
          <text x=${pad.l - 8} y=${y(t) + 4} class="tick" text-anchor="end">${fmtTick(t)}</text>`)}
        ${days.map((d, i) => d.logged && d.value > 0 && html`
          <path d=${column(cx(i), y(d.value))} fill=${color} class=${hover === i ? 'col hot' : 'col'} />`)}
        <line x1=${pad.l} x2=${W - pad.r} y1=${y(goal)} y2=${y(goal)} class="goal-line" />
        <text x=${W - pad.r} y=${y(goal) - 5} class="tick goal-label" text-anchor="end">Goal ${fmt(goal)}</text>
        ${days.map((d, i) => html`
          <text x=${cx(i)} y=${H - 7} class=${d.key === todayKey ? 'tick strong' : 'tick'} text-anchor="middle">${'SMTWTFS'[parseKey(d.key).getDay()]}</text>
          <rect x=${pad.l + band * i} y=${pad.t} width=${band} height=${H - pad.t} fill="transparent"
            onPointerDown=${() => setHover(i)} onPointerEnter=${() => setHover(i)} />`)}
      </svg>
      ${hv && html`
        <${Tip} x=${cx(hover)} y=${hv.logged && hv.value > 0 ? y(hv.value) : base} width=${W}>
          <b>${hv.logged ? `${fmt(hv.value)} ${unit}` : 'Not logged'}</b>
          <span>${longDate(hv.key)}</span>
          ${hv.logged && html`<span>${Math.round((hv.value / goal) * 100)}% of goal</span>`}
        <//>`}
    </div>`;
}
