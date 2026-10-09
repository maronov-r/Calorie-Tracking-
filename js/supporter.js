// The Supporter Pack: a one-time purchase that helps keep Plate going, with extra themes, app icons and goal celebrations.
// It isn't on sale yet. It only shows on the demo and test pages (or with ?supporter-preview in the address),
// where "Unlock" is pretend and only sets a flag in this phone's settings. Everyone else sees the app exactly as before.

export const SUPPORTER_ON = !!(globalThis.PLATE_DEMO || globalThis.PLATE_SERVER)
  || (typeof location !== 'undefined' && new URLSearchParams(location.search).has('supporter-preview'));

export const PACK_PRICE = '$4.99';

// Same shape as THEMES in store.js.
export const PREMIUM_THEMES = [
  { value: 'grove', label: 'Grove', hint: 'Forest at night, mint glow', color: '#0C1410', swatch: ['#0C1410', '#9BE0B0', '#F5835B'] },
  { value: 'tide', label: 'Tide', hint: 'Deep ocean, aqua light', color: '#06141F', swatch: ['#06141F', '#5CE1E6', '#F87E77'] },
  { value: 'harvest', label: 'Harvest', hint: 'Autumn cocoa and gold', color: '#17100C', swatch: ['#17100C', '#F2B544', '#F0834E'] },
  { value: 'sunrise', label: 'Sunrise', hint: 'Warm peach, burnt orange', color: '#FFF1E6', swatch: ['#FFF1E6', '#BF3F0B', '#D24572'] },
  { value: 'lavender', label: 'Lavender', hint: 'Soft lilac, violet', color: '#F3F0FA', swatch: ['#FFFFFF', '#6A4BD8', '#CE4A72'] },
  { value: 'ink', label: 'Ink', hint: 'Black on white, typewriter', color: '#FFFFFF', swatch: ['#FFFFFF', '#000000', '#B7191C'] },
];

// App icon designs, all built on Plate's ring. A web app can't change its home-screen icon after it's installed,
// so here they only change the browser tab icon; the App Store version will offer them as alternate icons.
export const APP_ICONS = [
  { value: 'classic', label: 'Classic', hint: 'The original', src: 'icons/favicon.svg', free: true },
  { value: 'grove', label: 'Grove', hint: 'Mint ring, a sprout', src: 'icons/supporter/grove.svg' },
  { value: 'tide', label: 'Tide', hint: 'Aqua glow, a wave', src: 'icons/supporter/tide.svg' },
  { value: 'harvest', label: 'Harvest', hint: 'Gold ring, a pumpkin', src: 'icons/supporter/harvest.svg' },
  { value: 'sunrise', label: 'Sunrise', hint: 'The sun coming up', src: 'icons/supporter/sunrise.svg' },
  { value: 'lavender', label: 'Lavender', hint: 'Violet, a little flower', src: 'icons/supporter/lavender.svg' },
  { value: 'ink', label: 'Ink', hint: 'A single line', src: 'icons/supporter/ink.svg' },
  { value: 'neon', label: 'Neon', hint: 'Lime glow in the dark', src: 'icons/supporter/neon.svg' },
  { value: 'confetti', label: 'Confetti', hint: 'Every macro, a party', src: 'icons/supporter/confetti.svg' },
];

export const iconFor = (v) => APP_ICONS.find((x) => x.value === v) || APP_ICONS[0];

export function applyIcon(v) {
  document.querySelector('link[rel=icon]')?.setAttribute('href', iconFor(v).src);
}
