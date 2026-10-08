# Plate

A calm, private calorie tracker for your phone. It tracks calories, macros, water and 18 vitamins and minerals, and suggests what to eat when you're running low. It's free, with no account, no subscription and no ads.

**Open it:** https://maronov-r.github.io/Calorie-Tracking-/

## Install on iPhone

1. Open the link above in **Safari**.
2. Tap **Share**, then **Add to Home Screen**.
3. Open Plate from your home screen. It runs full-screen and works offline.

## What it does

- **Today:** calorie and protein rings side by side, quick protein ideas when you're short, carb and fat bars, water with one-tap buttons for your own bottles (Stanley, Hydro Flask, any size), a grid of vitamin and mineral rings, and a small weigh-in button.
- **Profile:** your plan with a plain-language coach, your weight trend (smoothed over 7 days) with a weekly rate, 14 days of protein or calories against your goal, how many days you hit protein, and how your vitamins are doing.
- **Coach (free, built in):** explains what your goal means and exactly how each number is worked out, and after two weeks of weigh-ins it suggests small calorie changes when you drift off pace.
- **Eating styles:** Balanced, Higher carb, Low carb or Keto. A style changes only how your calories split between carbs and fat, never your calories or protein, and applies from the day you pick it. Keto tracks net carbs.
- **Ask the coach (optional):** chat with Claude about your eating. It sees your goal, targets, food log and weight trend, and can offer to change your plan with one tap. Uses your API key, about 1 to 3¢ a question.
- **Three ways to log food:**
  - **Search** about 7,800 everyday foods from the USDA with full vitamin and mineral data. It works offline.
  - **Scan** a barcode on packaged food (via Open Food Facts).
  - **Describe** a meal in words or snap a photo, and Claude estimates it (needs your own API key, see below).
- **Nutrients:** see today or a 7-day average against the U.S. Recommended Dietary Allowances for your age and sex. Tap any nutrient to see where yours came from and which foods are good sources.
- **Supplements:** add what you take once, then tick it off each day. It counts toward your totals.
- **Goals:** Lose fat, Lose fat slowly, Maintain, Build muscle (lean bulk, +300 kcal, about 0.9 g protein per lb) or Bulk. Targets are calculated from your age, sex, height, weight and activity level (Mifflin–St Jeor), follow your latest weigh-in, and can be overridden.
- **Themes:** Oat (default), Midnight and Porcelain. Change them in Settings.

## AI logging (optional)

Describing meals and photo logging use Claude through your own Anthropic API key. You pay Anthropic per use, with no subscription:

| Model | Roughly per log |
|---|---|
| Claude Opus 5.5 (default, most accurate) | ~3¢ |
| Claude Sonnet 5.5 | ~1.5¢ |
| Claude Haiku 5.5 | under 0.1¢ |

Get a key at [console.anthropic.com](https://console.anthropic.com/settings/keys), then paste it into **Settings → AI food logging**. The key is stored only on your phone and only ever sent to Anthropic.

## Your data

Everything lives in your phone's browser storage (IndexedDB). Nothing is uploaded anywhere. Use **Settings → Export backup** now and then, and save the file to Files or iCloud Drive. **Restore from backup** brings it back on a new phone.

## How it's built

A static web app with no build step, served by GitHub Pages.

```
index.html, sw.js, manifest.webmanifest   app shell, offline cache, install metadata
css/app.css                               all styles and the three themes
js/app.js                                 tabs, sheets, startup
js/store.js                               state + IndexedDB persistence
js/nutrients.js                           nutrient list, RDAs, targets, formatting
js/foods.js                               local food search
js/weight.js, js/charts.js                weight trend math and SVG charts
js/coach.js                               built-in coaching: plan explanation, calorie check-ins, protein ideas
js/off.js                                 Open Food Facts barcode lookup
js/ai.js                                  Claude meal estimates and coach chat
js/views/*                                screens
js/vendor/*                               Preact + htm, Anthropic SDK, barcode scanner (bundled)
data/foods.json                           USDA SR Legacy, trimmed to 26 nutrients
```

To run it locally, serve the folder with any static server (for example `npx serve .`) and open it in a browser.

### Data sources

- USDA FoodData Central, SR Legacy (public domain)
- Open Food Facts (Open Database License)
- U.S. Dietary Reference Intakes (NIH Office of Dietary Supplements)

Plate gives estimates, not medical advice.
