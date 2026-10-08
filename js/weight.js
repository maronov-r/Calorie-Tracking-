// Weight trend math: smoothing out day-to-day water swings, weekly rate, and pace coaching.
import { parseKey } from './store.js';
import { goalFor, KG_PER_LB } from './nutrients.js';

export const dayNum = (key) => Math.round(parseKey(key).getTime() / 86400000);

// Trailing 7-day average at each weigh-in. Daily weight jumps around by a pound or two;
// the trend is what actually moves.
export function withTrend(points) {
  return points.map((p) => {
    const d = dayNum(p.key);
    const win = points.filter((q) => { const dq = dayNum(q.key); return dq <= d && dq > d - 7; });
    return { ...p, trend: win.reduce((a, q) => a + q.kg, 0) / win.length };
  });
}

// Least-squares slope over the last 4 weeks, in kg per week. Null until there's enough data.
export function weeklyRate(points, todayKey) {
  const end = dayNum(todayKey);
  const pts = points.filter((p) => dayNum(p.key) > end - 28);
  if (pts.length < 3) return null;
  const xs = pts.map((p) => dayNum(p.key));
  if (Math.max(...xs) - Math.min(...xs) < 6) return null;
  const ys = pts.map((p) => p.kg);
  const mx = xs.reduce((a, b) => a + b, 0) / xs.length;
  const my = ys.reduce((a, b) => a + b, 0) / ys.length;
  let num = 0;
  let den = 0;
  xs.forEach((x, i) => { num += (x - mx) * (ys[i] - my); den += (x - mx) ** 2; });
  return den ? (num / den) * 7 : null;
}

export function fmtRate(kgPerWeek, units) {
  const v = units === 'metric' ? kgPerWeek : kgPerWeek / KG_PER_LB;
  const sign = v > 0.005 ? '+' : v < -0.005 ? '−' : '';
  return `${sign}${Math.abs(v).toFixed(units === 'metric' ? 2 : 1)} ${units === 'metric' ? 'kg' : 'lb'} a week`;
}

// Compare the trend with the goal's healthy pace. tone: 'good' | 'warn'
export function paceAdvice(rate, goalValue) {
  if (rate == null) return null;
  const g = goalFor(goalValue);
  const [lo, hi] = g.pace;
  const gaining = g.delta > 0;
  const losing = g.delta < 0;
  if (rate >= lo && rate <= hi) {
    return { tone: 'good', text: gaining ? 'Right on pace for building muscle. Keep it up.' : losing ? 'Right on pace. Keep protein high to hold on to muscle.' : 'Holding steady. Nice.' };
  }
  if (rate < lo) {
    if (gaining) return { tone: 'warn', text: 'Gaining slower than planned. If it stays this way another week or two, eat about 150 kcal more a day.' };
    if (losing) return { tone: 'warn', text: 'Losing faster than planned. Eating a bit more helps you keep muscle.' };
    return { tone: 'warn', text: 'Drifting down. Eat a little more if that isn’t what you want.' };
  }
  if (gaining) return { tone: 'warn', text: 'Gaining faster than planned, so some of it is likely fat. Try about 150 kcal less a day.' };
  if (losing) return { tone: 'warn', text: 'Losing slower than planned. If it holds, trim about 150 kcal a day.' };
  return { tone: 'warn', text: 'Drifting up. Eat a little less if that isn’t what you want.' };
}
