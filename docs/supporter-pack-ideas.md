# Supporter Pack: ideas and plan

Plate is free and private. The Supporter Pack is a one-time purchase (placeholder price: **$4.99**) for people who love the app and want to help keep it going. It's **cosmetic**: it never unlocks tracking features, and nothing in it collects data. Everything runs on the phone.

## What's in the prototype (branch `supporter-pack`)

It only shows on the demo and test pages (`/demo/`, `/beta/`), or on the normal page with `?supporter-preview` in the address. On the live app, normal users see nothing new. "Unlock" is pretend: it just sets `supporter: true` in this phone's settings.

- **6 themes**: Grove, Tide, Harvest (dark) and Sunrise, Lavender, Ink (light). Tap a locked one to preview it live in Settings.
- **8 app icons** built on Plate's ring. A web app can't change its home-screen icon after install, so here they only change the browser tab icon. The App Store version can offer them as alternate icons.
- **Goal celebrations**: a small burst of dots when you reach your protein (or other focus) target or your water goal, while you're looking. It can be turned off and is skipped when the phone asks for reduced motion.
- **Supporter badge** on the Profile screen and in the Settings card.

## Free for everyone (never behind the Supporter Pack)

The owner decided these should be free, because they help people stick with healthy habits:

- **Achievements and streak badges.** Unobtrusive: no popups in the way. A list that's easy to find (for example a row on Profile that opens "Your achievements"). Earned quietly, shown when you look.
- **Home-screen widgets** (native app): calories left, water, protein ring.
- **Nicer exports**, for example a monthly summary PDF made on the phone.
- **Custom meal names** (rename "Snacks" to "Pre-workout", add a fourth meal).
- **Personal greeting** ("Good morning, Sam"). The name is stored only on the phone.

## Supporter Pack ideas (cosmetic, all on-device)

| Idea | Effort | Recommendation |
| --- | --- | --- |
| **Customizable mascot**: a small character on Today that reacts to the day (sleepy in the morning, cheering when you hit protein, sipping when you log water), with a look you can change (color, hat, accessory) | Medium-large | **Build next.** The owner loves it and it gives the pack a personality. Start with one character, 3 moods, a few outfits. Keep it small and quiet, never in the way. |
| **Custom accent color**: pick your own accent on any theme | Small | **Build.** Cheap and popular. Check contrast automatically (block colors that fail 4.5:1 for button text). |
| **Coach credit bonus**: e.g. $1 of coach credit included with the pack | Small | **Build** when the coach is live. A nice thank-you; it's a one-off grant to the coach balance, separate from the pack itself. |
| **Supporter badge** | Done | Done in the prototype. |
| **Ring styles**: thin, chunky, segmented, gradient, glowing | Small-medium | Worth it. Fits Plate's ring identity. |
| **More celebration effects**: confetti, a ring "pulse", a gentle haptic | Small | Worth it, one or two at a time. Always respect reduced motion. |
| **Seasonal themes** (winter, spring) added over time | Small each | Nice way to say thank you to existing supporters. |
| **App icon per theme, auto-matched** | Small | Native app only. |
| **Custom fonts for numbers** (serif, rounded, mono) | Small | Maybe. Partly covered by themes already. |

Not recommended: anything that limits tracking, hides data, or needs an account or server. The pack should feel like a thank-you, not a paywall.

## How the purchase would work later

- On iPhone and Android, the pack would be an **in-app purchase of type "non-consumable"**: bought once, owned forever.
- Unlike coach credit (a **consumable** that gets used up and isn't restored), a non-consumable **is restorable**. If someone gets a new phone or reinstalls, "Restore purchases" brings the pack back through their Apple ID or Google account. Plate never needs to know who they are.
- The store tells the app "this person owns the Supporter Pack"; the app then sets `supporter: true` on the phone, the same flag the prototype uses. No account, no server, no data collected.
- Apple and Google take 15% (small developers), so $4.99 leaves about $4.24.
- Family Sharing can be turned on for the pack in App Store Connect (a nice touch for a one-time purchase).
- On the web version, there's no good way to sell it without collecting data, so the web app could keep showing the pack as "Available in the App Store version".

## Notes for later

- The prototype stores `supporter`, `appIcon` and `celebrate` in the normal settings, so they are included in backups. With real purchases, the store is the source of truth: re-check ownership on launch (and with "Restore purchases") instead of trusting a restored backup.
- Turning the pack on for the live web app means removing the `SUPPORTER_ON` gate in `js/supporter.js` and swapping the pretend unlock for the real purchase.
