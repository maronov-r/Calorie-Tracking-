// The built-in coach: explains the plan in plain words, spots when it needs adjusting,
// and suggests foods to close the protein gap. All of it runs on the phone, free.
import {
  state, getTargets, styleOn, weighIns, latestWeighIn, getDay, totalsFor, weekAverage, mealLabel, dateKey as todayKey, shiftKey,
} from './store.js';
import {
  goalFor, styleFor, ACTIVITY, GOALS, STYLES, MICROS, KG_PER_LB, KETO_NET_CARBS, fmtKcal, fmtWater, ageBand, scale, addInto,
  focusFor, directionOf, macroLabel, macroValue, dayMet,
} from './nutrients.js';
import { weeklyRate, dayNum, fmtRate } from './weight.js';
import { search, foodById, foodByName, fullName } from './foods.js';

const lb = (kg) => kg / KG_PER_LB;
const perWeek = (kg, units) => (units === 'metric' ? `${+kg.toFixed(2)} kg` : `${+lb(kg).toFixed(1)} lb`);
const paceRange = (g, units) => {
  const [a, b] = g.pace.map(Math.abs).sort((x, y) => x - y);
  return `${perWeek(a, units)} to ${perWeek(b, units)}`;
};

// ---- What the goal and eating style mean ----

export function goalGuide(goalValue, t, units) {
  const g = goalFor(goalValue);
  const perLb = (t.protein / lb(state.profile.weightKg)).toFixed(1);
  const protein = `Eat ${t.protein} g of protein every day, about ${perLb} g per lb of bodyweight. Spread it over 3 to 5 meals of 30 to 50 g each.`;
  const pace = paceRange(g, units);
  switch (g.value) {
    case 'lean_bulk': return [
      'A lean bulk means eating a little more than you burn, about 300 kcal a day. That gives your body spare material to build muscle while keeping fat gain small. It only works alongside lifting: the extra food feeds the muscle your training asks for.',
      `Aim to gain ${pace} a week. Faster than that is mostly fat. If your trend stays flat for 2 to 3 weeks, you aren't eating enough to grow.`,
      protein,
      'Check the weight trend below every week or two. Once there are two weeks of weigh-ins, the coach suggests small calorie changes if you drift off pace.',
    ];
    case 'bulk': return [
      'A bulk means eating about 500 kcal more than you burn. Size and strength come faster, with more fat along the way. It suits people who are very lean or find it hard to gain.',
      `Aim to gain ${pace} a week.`,
      protein,
    ];
    case 'maintain': return [
      'Maintaining means eating about what you burn, so your weight stays roughly level. You can still build some muscle this way, especially if you are new to lifting, while slowly losing a little fat.',
      protein,
    ];
    case 'cut_slow': return [
      'A slow cut means eating about 250 kcal less than you burn. Fat comes off gradually, and it is easier to keep your strength and muscle. Your Today screen shows fat next to calories, since it is the easiest place to save calories.',
      `Aim to lose ${pace} a week.`,
      protein,
    ];
    default: return [
      'A cut means eating about 500 kcal less than you burn. Calories are what decide fat loss, so they come first. Fat is the easiest place to save them (9 kcal a gram, more than double protein or carbs), so your Today screen shows it next to calories as a limit to stay under.',
      `Aim to lose ${pace} a week. Losing faster than that tends to cost muscle.`,
      `${protein} Keeping protein up while you eat less is what makes the weight you lose fat rather than muscle, so keep lifting too.`,
    ];
  }
}

export function styleGuide(style, t, goalValue) {
  const gaining = goalFor(goalValue).delta > 0;
  switch (styleFor(style).value) {
    case 'performance': return [
      `Fat drops to about 20% of your calories (${t.fat} g), so more comes from carbs (${t.carbs} g). Carbs refill the energy your muscles burn in hard sessions, so this suits heavy training most days or lots of cardio.`,
    ];
    case 'low_carb': return [
      `Carbs stay around ${t.carbs} g a day and fat fills in the rest (${t.fat} g). Some people find their appetite easier to manage this way. Put most of your carbs around training.`,
    ];
    case 'keto': return [
      `Keto changes only where your energy comes from. Your calories (${fmtKcal(t.kcal)}) and protein (${t.protein} g) stay exactly the same. Carbs drop under ${KETO_NET_CARBS} g net a day and fat makes up the difference (${t.fat} g).`,
      'Net carbs are carbs minus fiber. Plate counts them for you and shows them on Today.',
      'In the first week, expect the scale to drop 2 to 5 lb. That is water stored with carbs, not fat or muscle, and it comes back when you eat carbs again. The coach ignores that drop when judging your pace.',
      gaining
        ? `Building muscle on keto works, but it is the harder route. Reaching ${fmtKcal(t.kcal)} kcal mostly from fat takes planning: think eggs, fatty fish, steak, cheese, olive oil, nuts and avocado. Many lifters also feel flat in hard sessions for 2 to 4 weeks while they adapt.`
        : 'Most people feel tired or foggy for a few days at the start ("keto flu"). It usually passes within a week.',
      'Get extra salt, potassium and magnesium: broth, avocado, leafy greens and nuts help, and they also ease the keto flu.',
    ];
    default: return [
      `About 30% of your calories come from fat (${t.fat} g) and the rest, after protein, from carbs (${t.carbs} g). It's a solid default for anyone who lifts.`,
    ];
  }
}

// ---- How the numbers are worked out ----

export function planSteps(t, units) {
  const p = state.profile;
  const act = ACTIVITY.find((a) => a.value === p.activity) || ACTIVITY[1];
  const g = goalFor(p.goal);
  const ov = state.settings.overrides || {};
  const height = units === 'metric' ? `${Math.round(p.heightCm)} cm` : (() => { const i = Math.round(p.heightCm / 2.54); return `${Math.floor(i / 12)}′${i % 12}″`; })();
  const weight = units === 'metric' ? `${p.weightKg.toFixed(1)} kg` : `${lb(p.weightKg).toFixed(1)} lb`;
  const sign = (v) => (v > 0 ? `+${fmtKcal(v)}` : v < 0 ? `−${fmtKcal(-v)}` : '0');
  const steps = [
    { label: 'Resting burn', value: `${fmtKcal(t.auto.bmr)} kcal`, note: `What your body burns doing nothing at all, from your age (${p.age}), sex, height (${height}) and weight (${weight}). This is the Mifflin–St Jeor formula, the most accurate of the standard ones.` },
    { label: `× ${act.factor} for activity`, value: `${fmtKcal(t.auto.tdee)} kcal`, note: `“${act.label}” adds the energy you burn moving and training. This is your maintenance: eat this much and your weight stays put.` },
    { label: `${g.label}`, value: `${sign(t.auto.delta)} kcal`, note: g.delta > 0 ? 'The surplus your body uses to build.' : g.delta < 0 ? 'The deficit that makes your body use stored fat.' : 'No change from maintenance.' },
  ];
  if (t.auto.adjust) steps.push({ label: 'Coach adjustment', value: `${sign(t.auto.adjust)} kcal`, note: `Added ${p.adjustOn ? `on ${new Date(p.adjustOn + 'T12:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} ` : ''}after checking your weight trend.` });
  steps.push({ label: 'Daily calories', value: `${fmtKcal(t.kcal)} kcal`, total: true, note: ov.kcal ? 'You set this by hand in Settings, so the steps above don’t change it.' : '' });
  steps.push({ label: 'Protein', value: `${t.protein} g`, note: ov.protein ? 'Set by hand in Settings.' : `${g.protein} g per kg of bodyweight (${(g.protein * KG_PER_LB).toFixed(1)} g per lb)${p.weightKg > 120 ? ', counted up to 120 kg' : ''}. Protein has 4 kcal per gram.` });
  steps.push({ label: t.netCarbs ? 'Net carbs (max)' : 'Carbs', value: `${t.carbs} g`, note: ov.carbs ? 'Set by hand in Settings.' : `From your eating style, ${styleFor(t.style).label}.` });
  steps.push({ label: 'Fat', value: `${t.fat} g`, note: ov.fat ? 'Set by hand in Settings.' : 'Whatever calories are left after protein and carbs, at 9 kcal per gram.' });
  steps.push({ label: 'Water', value: fmtWater(t.water, units), note: ov.water ? 'Set by hand in Settings.' : 'About 35 ml per kg of bodyweight, between 2 and 4 liters.' });
  steps.push({ label: 'Vitamins & minerals', value: `${MICROS.length} targets`, note: `The U.S. Recommended Dietary Allowances for ${p.sex === 'male' ? 'men' : 'women'} aged ${ageBand(p.age)}.` });
  return steps;
}

// ---- Calorie check-ins from the weight trend ----

const STEP_KCAL = 150;

// A suggestion to nudge calories, or null. Needs two weeks of weigh-ins and waits two weeks between changes.
export function calorieCheck(today = todayKey()) {
  const p = state.profile;
  const ov = state.settings.overrides || {};
  if (ov.kcal) return null;
  const pts = weighIns().filter((w) => dayNum(w.key) > dayNum(today) - 28);
  if (pts.length < 4 || dayNum(pts[pts.length - 1].key) - dayNum(pts[0].key) < 13) return null;
  if (p.adjustOn && dayNum(today) - dayNum(p.adjustOn) < 14) return null;
  if (p.checkSnooze && today < p.checkSnooze) return null;
  if (ketoSwitchWithin(14, today)) return null; // water weight would fool the trend
  const rate = weeklyRate(weighIns(), today);
  if (rate == null) return null;
  const g = goalFor(p.goal);
  const [lo, hi] = g.pace;
  const adjust = p.adjust || 0;
  let delta = 0;
  if (rate < lo) delta = STEP_KCAL;
  else if (rate > hi) delta = -STEP_KCAL;
  if (!delta || Math.abs(adjust + delta) > 600) return null;
  const units = state.settings.units;
  const gaining = g.delta > 0;
  const losing = g.delta < 0;
  const why = delta > 0
    ? (gaining ? (rate <= 0.02 ? "you're not gaining yet, and muscle needs a surplus" : "you're gaining slower than your goal needs") : losing ? "you're losing faster than planned, which can cost muscle" : "you're drifting down")
    : (gaining ? "you're gaining faster than planned, so some of it is likely fat" : losing ? (rate >= -0.02 ? "you're not losing yet" : "you're losing slower than planned") : "you're drifting up");
  return { delta, rate, text: `Your trend is ${fmtRate(rate, units)}: ${why}. Eat ${STEP_KCAL} kcal ${delta > 0 ? 'more' : 'less'} a day?` };
}

export function ketoSwitchWithin(days, today = todayKey()) {
  const styles = state.profile?.styles || {};
  const from = shiftKey(today, -days);
  return Object.keys(styles).some((k) => k > from && k <= today && (styles[k] === 'keto') !== (styleOn(shiftKey(k, -1)) === 'keto'));
}

// ---- One line of coaching for the Profile page ----

export function coachLine(today = todayKey()) {
  const p = state.profile;
  const t = getTargets(today);
  const g = goalFor(p.goal);
  if (ketoSwitchWithin(10, today)) {
    return styleOn(today) === 'keto'
      ? 'You started keto recently. A quick 2–5 lb drop is water, not fat or muscle, so the coach waits for it to settle before judging your pace.'
      : 'You came off keto recently. A quick 2–5 lb jump is water returning, not fat.';
  }
  const days = Array.from({ length: 7 }, (_, i) => shiftKey(today, -i - 1)).filter((k) => getDay(k).entries.length);
  const focus = focusFor(p, t);
  if (days.length >= 3 && directionOf(focus, p.goal, t) === 'max') {
    const label = macroLabel(focus, t).toLowerCase();
    const under = days.filter((k) => dayMet(focus, totalsFor(k), getTargets(k), 'max')).length;
    const avg = days.reduce((a, k) => a + macroValue(focus, totalsFor(k), getTargets(k)), 0) / days.length;
    const kcal = weekAverage(today).totals.kcal || 0;
    if (under < days.length * 0.7) {
      return `You stayed under your ${label} limit on ${under} of your last ${days.length} logged days, averaging ${Math.round(avg)} g against ${t[focus]} g. Trimming that is the quickest way to bring calories down.`;
    }
    if (kcal > t.kcal * 1.05) return `${macroLabel(focus, t)} is in check, but calories are averaging ${fmtKcal(kcal)}, about ${fmtKcal(kcal - t.kcal)} over your target. Look at portions and drinks.`;
    return `Under your ${label} limit on ${under} of ${days.length} days. That consistency is what moves the scale.`;
  }
  if (days.length >= 3) {
    const hit = days.filter((k) => (totalsFor(k).protein || 0) >= t.protein * 0.95).length;
    const avg = days.reduce((a, k) => a + (totalsFor(k).protein || 0), 0) / days.length;
    if (hit < days.length * 0.7) {
      return `You hit protein on ${hit} of your last ${days.length} logged days, averaging ${Math.round(avg)} g. Closing that ${Math.round(t.protein - avg)} g gap is the biggest thing you can do for ${g.delta > 0 ? 'building muscle' : 'keeping muscle'} right now.`;
    }
    const kcal = weekAverage(today).totals.kcal || 0;
    if (g.delta > 0 && kcal < t.kcal * 0.9) {
      return `Protein is on point. Calories are averaging ${fmtKcal(kcal)}, about ${fmtKcal(t.kcal - kcal)} under your goal, and a lean bulk needs that surplus to grow.`;
    }
    return `Protein hit on ${hit} of ${days.length} days. That consistency is what builds results.`;
  }
  if (!latestWeighIn() || weighIns().length < 3) return 'Log your food and weigh in a few mornings a week. After about two weeks the coach can tell whether your calories are right.';
  return g.delta > 0
    ? `Eat about ${fmtKcal(t.kcal)} kcal with ${t.protein} g protein, lift hard, and let the trend do the talking.`
    : `Aim for about ${fmtKcal(t.kcal)} kcal with ${t.protein} g protein each day.`;
}

// ---- Protein ideas to close today's gap ----

// Exact USDA entries, so the protein shown matches what you'd log. grams: the portion.
const QUICK_PROTEIN = [
  { label: 'Chicken breast, 6 oz cooked', usda: 'Chicken, breast, meat only, cooked, roasted', grams: 170, q: 'chicken breast roasted' },
  { label: 'Lean ground beef, 6 oz cooked', usda: 'Beef, ground, 93% lean meat / 7% fat, crumbles, cooked, pan-browned', grams: 170, q: 'ground beef 93 crumbles' },
  { label: 'Salmon, 6 oz cooked', usda: 'Fish, salmon, Atlantic, farmed, cooked, dry heat', grams: 170, q: 'salmon atlantic farmed cooked' },
  { label: 'Can of tuna', usda: 'Fish, tuna, light, canned in water, drained solids', grams: 165, q: 'tuna light canned water' },
  { label: 'Cottage cheese, 1 cup', usda: 'Cheese, cottage, lowfat, 1% milkfat', grams: 226, q: 'cottage cheese 1%' },
  { label: 'Scoop of whey', usda: 'Beverages, Protein powder whey based', grams: 32, q: 'protein powder whey' },
  { label: 'Greek yogurt, 8 oz', usda: 'Yogurt, Greek, plain, nonfat', grams: 227, q: 'greek yogurt nonfat plain', carby: true },
  { label: '3 hard-boiled eggs', usda: 'Egg, whole, cooked, hard-boiled', grams: 150, q: 'egg hard-boiled' },
];

// One or two foods that together cover what's left, varied by day so it isn't always chicken.
// Empty until the food database has loaded.
export function proteinIdeas(left, style, seed = todayKey()) {
  if (left < 8) return [];
  const pool = QUICK_PROTEIN.filter((f) => !(style === 'keto' && f.carby)).map((f) => {
    const food = foodByName(f.usda);
    return food && { ...f, g: Math.round(((food.base.n.protein || 0) * f.grams) / food.base.g) };
  }).filter(Boolean);
  if (!pool.length) return [];
  const singles = pool.map((f) => [f]);
  const pairs = [];
  for (let i = 0; i < pool.length; i++) for (let j = i + 1; j < pool.length; j++) pairs.push([pool[i], pool[j]]);
  const score = (combo) => {
    const sum = combo.reduce((acc, f) => acc + f.g, 0);
    return sum >= left ? sum - left : 1000 + (left - sum);
  };
  const covers = singles.filter((c) => score(c) < 15);
  const options = (covers.length ? covers : [...singles, ...pairs]).map((c) => ({ c, s: score(c) })).sort((x, y) => x.s - y.s);
  const best = options[0].s;
  const near = options.filter((o) => o.s <= best + 12);
  const n = [...seed].reduce((acc, ch) => acc + ch.charCodeAt(0), 0);
  return near[n % near.length].c;
}

// ---- Tools for the AI coach ----

const r1 = (v) => Math.round((v || 0) * 10) / 10;

// The coach looks foods up here instead of estimating from memory.
export function lookUpFoods(input) {
  const out = (input?.foods || []).slice(0, 12).map(({ query, grams }) => {
    const g = Math.max(1, Math.min(3000, +grams || 100));
    const matches = search(String(query || ''), 3).map((f) => {
      const n = scale(f.base.n, g / f.base.g);
      return {
        id: f.ref,
        name: fullName(f),
        grams: g,
        kcal: Math.round(n.kcal || 0),
        protein_g: r1(n.protein), carbs_g: r1(n.carbs), fiber_g: r1(n.fiber), fat_g: r1(n.fat),
        portions: f.portions.slice(0, 4).map((x) => `${x.label} = ${x.g} g`),
      };
    });
    return { query, matches: matches.length ? matches : 'No match. Try fewer, plainer words, such as "chicken breast roasted".' };
  });
  return JSON.stringify(out);
}

// Turn a meal the coach suggested into real foods and exact totals. Unknown ids are dropped.
export function resolveMeal(meal) {
  const items = (meal?.items || []).map((it) => {
    const food = foodById(Number(it.food_id));
    const grams = Math.max(1, Math.min(3000, +it.grams || 0));
    if (!food || !(+it.grams > 0)) return null;
    return { food, grams, label: it.label || food.name, n: scale(food.base.n, grams / food.base.g) };
  }).filter(Boolean);
  const total = {};
  for (const it of items) addInto(total, it.n);
  return { title: meal?.title || 'Meal', items, total };
}

// ---- Context for the AI coach ----

export function coachContext(today = todayKey()) {
  const p = state.profile;
  const units = state.settings.units;
  const t = getTargets(today);
  const g = goalFor(p.goal);
  const ov = state.settings.overrides || {};
  const r = (v) => Math.round(v || 0);
  const days = Array.from({ length: 14 }, (_, i) => shiftKey(today, -i)).reverse()
    .filter((k) => getDay(k).entries.length)
    .map((k) => {
      const x = totalsFor(k);
      return `${k}${k === today ? ' (today, so far)' : ''}${styleOn(k) !== 'balanced' ? ` [${styleOn(k)}]` : ''}: ${r(x.kcal)} kcal, ${r(x.protein)} g protein, ${r(x.carbs)} g carbs, ${r(x.fiber)} g fiber, ${r(x.fat)} g fat`;
    });
  const weights = weighIns().slice(-12).map((w) => `${w.key}: ${lb(w.kg).toFixed(1)} lb / ${w.kg.toFixed(1)} kg`);
  const rate = weeklyRate(weighIns(), today);
  const week = weekAverage(today);
  const low = week.count
    ? MICROS.map((n) => ({ n, pct: (week.totals[n.key] || 0) / t[n.key] })).filter((x) => x.pct < 0.7).map((x) => `${x.n.name} ${Math.round(x.pct * 100)}%`)
    : [];
  const eaten = totalsFor(today);
  const left = (k) => r(t[k] - (eaten[k] || 0));
  const netEaten = Math.max(0, (eaten.carbs || 0) - (eaten.fiber || 0));
  const byMeal = {};
  for (const e of getDay(today).entries) {
    const m = mealLabel(e.meal);
    byMeal[m] = byMeal[m] || { names: [], protein: 0, kcal: 0 };
    byMeal[m].names.push(e.name);
    byMeal[m].protein += (e.pu.protein || 0) * e.amount;
    byMeal[m].kcal += (e.pu.kcal || 0) * e.amount;
  }
  const todayLines = Object.entries(byMeal).map(([m, x]) => `${m}: ${x.names.join(', ')} (${r(x.kcal)} kcal, ${r(x.protein)} g protein)`);
  const now = new Date().toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
  const act = ACTIVITY.find((a) => a.value === p.activity) || ACTIVITY[1];

  return [
    `Today is ${today}. The user prefers ${units === 'metric' ? 'metric units (kg, ml)' : 'US units (lb, oz)'}.`,
    `Profile: ${p.sex}, ${p.age} years, ${Math.round(p.heightCm)} cm (${Math.floor(p.heightCm / 2.54 / 12)} ft ${Math.round(p.heightCm / 2.54) % 12} in), ${p.weightKg.toFixed(1)} kg (${lb(p.weightKg).toFixed(1)} lb). Activity: ${act.label} (${act.hint}).`,
    `Goal: ${g.label} (id ${g.value}). Healthy pace for this goal: ${g.pace[0]} to ${g.pace[1]} kg a week.`,
    `Eating style today: ${styleFor(t.style).label} (id ${t.style}). Their Today screen puts ${macroLabel(focusFor(p, t), t).toLowerCase()} next to calories as ${directionOf(focusFor(p, t), p.goal, t) === 'max' ? 'a limit to stay under' : 'a target to reach'}, so treat that as their main number after calories.`,
    `Daily targets: ${t.kcal} kcal, ${t.protein} g protein, ${t.carbs} g ${t.netCarbs ? 'net carbs (maximum)' : 'carbs'}, ${t.fat} g fat, ${Math.round(t.water)} ml water.`,
    `How calories were set: resting burn ${t.auto.bmr} kcal × activity ${t.auto.factor} = ${t.auto.tdee} kcal maintenance, ${t.auto.delta >= 0 ? '+' : ''}${t.auto.delta} for the goal${t.auto.adjust ? `, ${t.auto.adjust > 0 ? '+' : ''}${t.auto.adjust} coach adjustment` : ''}.${ov.kcal || ov.protein ? ` The user overrode some targets by hand: ${JSON.stringify(Object.fromEntries(Object.entries(ov).filter(([, v]) => v)))}.` : ''}`,
    `Weigh-ins (last 12): ${weights.length ? weights.join('; ') : 'none yet'}.`,
    `Weight trend: ${rate == null ? 'not enough data yet' : `${rate.toFixed(2)} kg a week (${lb(rate).toFixed(2)} lb a week)`}.`,
    `Food logged, last 14 days: ${days.length ? '\n' + days.join('\n') : 'nothing yet'}.`,
    `Logged today so far (it is ${now} now): ${todayLines.length ? todayLines.join('; ') : 'nothing yet'}.`,
    `Left for today (targets minus what's logged; use these exact numbers): ${left('kcal')} kcal, ${left('protein')} g protein, ${t.netCarbs ? `${r(t.carbs - netEaten)} g net carbs` : `${left('carbs')} g carbs`}, ${left('fat')} g fat. A negative number means over target.`,
    `Vitamins and minerals under 70% of target (7-day average): ${low.length ? low.join(', ') : week.count ? 'none' : 'not enough data'}.`,
  ].join('\n');
}

export const COACH_GOALS = GOALS.map((g) => g.value);
export const COACH_STYLES = STYLES.map((s) => s.value);
