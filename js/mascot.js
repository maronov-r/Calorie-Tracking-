// Plate's mascots: Sprout, Avo and Drop. Drawn as SVG and animated with CSS (see .mascot in app.css).
// For now they only appear on the demo and test pages, like the Supporter Pack.
import { SUPPORTER_ON } from './supporter.js';

export const MASCOT_ON = SUPPORTER_ON;

const INK = '#1C1612';

export const CHARACTERS = {
  sprout: { label: 'Sprout', faceY: 146, dx: 26, iris: '#8A6440', ground: 228,
    shape: 'M120 84 C170 84 198 118 198 158 C198 202 165 228 120 228 C75 228 42 202 42 158 C42 118 70 84 120 84Z',
    palettes: [
      { name: 'Oat', light: '#FFF8E8', base: '#F2DFBA', shade: '#CDAE77', line: '#8C6C3E' },
      { name: 'Mint', light: '#F0FCF3', base: '#BDE7C8', shade: '#7DBB91', line: '#3F7552' },
      { name: 'Peach', light: '#FFF2EA', base: '#FFCBAA', shade: '#EA9670', line: '#A35A38' },
      { name: 'Lilac', light: '#F7F3FF', base: '#D8CEF7', shade: '#A698E0', line: '#6456AA' },
    ] },
  avo: { label: 'Avo', faceY: 128, dx: 23, iris: '#4C7A30', ground: 238,
    shape: 'M120 62 C161 62 196 109 196 162 C196 208 163 238 120 238 C77 238 44 208 44 162 C44 109 79 62 120 62Z',
    palettes: [
      { name: 'Classic', light: '#F6F9C9', base: '#D7E792', shade: '#A6C459', line: '#1E3816', skin: '#4A7A33', skinDark: '#22451A' },
      { name: 'Ripe', light: '#FCF7CE', base: '#E9DF92', shade: '#C6B75A', line: '#1C2416', skin: '#3D4A2E', skinDark: '#1B2214' },
      { name: 'Golden', light: '#FFF8D6', base: '#F7DF8A', shade: '#DFB24C', line: '#3A2F14', skin: '#86972F', skinDark: '#4E5A16' },
    ] },
  drop: { label: 'Drop', faceY: 170, dx: 25, iris: '#1D5EA8', ground: 236,
    shape: 'M120 36 C141 76 196 118 196 167 C196 212 162 236 120 236 C78 236 44 212 44 167 C44 118 99 76 120 36Z',
    palettes: [
      { name: 'Sky', light: '#E2F2FF', base: '#6CB6F3', shade: '#2E7BCB', line: '#184C88' },
      { name: 'Lagoon', light: '#DDFBF4', base: '#57CFBA', shade: '#1D9584', line: '#0D5A50' },
      { name: 'Berry', light: '#FFE6F0', base: '#F58DB8', shade: '#CF5088', line: '#87234F' },
      { name: 'Grape', light: '#EEE6FF', base: '#AA90F1', shade: '#7356CC', line: '#40308A' },
    ] },
};

export const swatchBg = (ch, p) => (ch === 'avo'
  ? `linear-gradient(135deg, ${p.skin} 0 45%, ${p.base} 45% 100%)`
  : `linear-gradient(135deg, ${p.light}, ${p.base} 55%, ${p.shade})`);

export const DEFAULT_MASCOT = { on: true, ch: 'sprout', pal: 0, name: '' };
export const mascotSettings = (settings) => ({ ...DEFAULT_MASCOT, ...(settings.mascot || {}) });
export const mascotName = (m) => m.name.trim() || CHARACTERS[m.ch].label;

let uid = 0;
const star = (x, y, s, c, d) => `<path class="spark" style="animation-delay:${d}s" d="M${x} ${y - s} C${x + s * 0.12} ${y - s * 0.12} ${x + s * 0.12} ${y - s * 0.12} ${x + s} ${y} C${x + s * 0.12} ${y + s * 0.12} ${x + s * 0.12} ${y + s * 0.12} ${x} ${y + s} C${x - s * 0.12} ${y + s * 0.12} ${x - s * 0.12} ${y + s * 0.12} ${x - s} ${y} C${x - s * 0.12} ${y - s * 0.12} ${x - s * 0.12} ${y - s * 0.12} ${x} ${y - s}Z" fill="${c}"/>`;
const wavePath = (y, amp) => { let d = `M-60 ${y}`; for (let x = -60; x < 300; x += 60) d += ` q15 ${-amp} 30 0 t30 0`; return `${d} V270 H-60Z`; };
const heart = (x, y, s, col, d) => `<path class="heart" style="animation-delay:${d}s" d="M${x} ${y + s * 0.9} C${x - s * 1.4} ${y - s * 0.1} ${x - s * 0.9} ${y - s * 1.2} ${x} ${y - s * 0.45} C${x + s * 0.9} ${y - s * 1.2} ${x + s * 1.4} ${y - s * 0.1} ${x} ${y + s * 0.9}Z" fill="${col}"/>`;

function defs(ch, c, p, id) {
  const shared = `<linearGradient id="e${id}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#3B2E25"/><stop offset="1" stop-color="#0E0A08"/></linearGradient>
    <radialGradient id="k${id}" cx="0.5" cy="0.5" r="0.5"><stop offset="0" stop-color="#FF6F7D" stop-opacity="0.6"/><stop offset="1" stop-color="#FF6F7D" stop-opacity="0"/></radialGradient>
    <radialGradient id="o${id}" cx="0.72" cy="0.9" r="0.75"><stop offset="0" stop-color="${p.shade}" stop-opacity="0.75"/><stop offset="1" stop-color="${p.shade}" stop-opacity="0"/></radialGradient>
    <clipPath id="c${id}"><path d="${c.shape}"/></clipPath>`;
  if (ch === 'sprout') return `${shared}
    <radialGradient id="b${id}" cx="0.36" cy="0.28" r="0.82"><stop offset="0" stop-color="${p.light}"/><stop offset="0.55" stop-color="${p.base}"/><stop offset="1" stop-color="${p.shade}"/></radialGradient>
    <linearGradient id="l${id}" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#A8E27A"/><stop offset="0.6" stop-color="#5DA846"/><stop offset="1" stop-color="#357A2D"/></linearGradient>`;
  if (ch === 'avo') return `${shared}
    <radialGradient id="s${id}" cx="0.34" cy="0.26" r="0.9"><stop offset="0" stop-color="${p.skin}"/><stop offset="1" stop-color="${p.skinDark}"/></radialGradient>
    <radialGradient id="b${id}" cx="0.46" cy="0.34" r="0.78"><stop offset="0" stop-color="${p.light}"/><stop offset="0.55" stop-color="${p.base}"/><stop offset="1" stop-color="${p.shade}"/></radialGradient>
    <radialGradient id="p${id}" cx="0.36" cy="0.3" r="0.8"><stop offset="0" stop-color="#D49863"/><stop offset="0.65" stop-color="#8C5529"/><stop offset="1" stop-color="#5A3214"/></radialGradient>`;
  return `${shared}
    <linearGradient id="b${id}" x1="0.25" y1="0" x2="0.75" y2="1"><stop offset="0" stop-color="${p.light}"/><stop offset="0.42" stop-color="${p.base}"/><stop offset="1" stop-color="${p.shade}"/></linearGradient>
    <radialGradient id="g${id}" cx="0.5" cy="0.62" r="0.5"><stop offset="0" stop-color="#FFFFFF" stop-opacity="0.35"/><stop offset="1" stop-color="#FFFFFF" stop-opacity="0"/></radialGradient>`;
}

function bodyArt(ch, c, p, id, mood) {
  const isDrop = ch === 'drop';
  const water = mood === 'water' ? `<g clip-path="url(#c${id})">
      <g class="wave2"><path d="${wavePath(176, 7)}" fill="${isDrop ? '#FFFFFF' : '#5DB2F2'}" opacity="${isDrop ? 0.18 : 0.22}"/></g>
      <g class="wave"><path d="${wavePath(182, 6)}" fill="${isDrop ? '#FFFFFF' : '#4AA3EC'}" opacity="${isDrop ? 0.22 : 0.3}"/></g>
      <circle class="bubble" cx="96" cy="222" r="3.5" fill="#FFFFFF" opacity="0.7"/><circle class="bubble" style="animation-delay:1.1s" cx="146" cy="226" r="2.6" fill="#FFFFFF" opacity="0.7"/><circle class="bubble" style="animation-delay:2s" cx="122" cy="230" r="3" fill="#FFFFFF" opacity="0.7"/>
    </g>` : '';
  if (ch === 'sprout') return `
    <g class="sprout">
      <path d="M120 88 C116 76 124 66 120 52" fill="none" stroke="#3B7430" stroke-width="5.5" stroke-linecap="round"/>
      <path d="M120 62 C104 40 80 40 71 52 C88 68 108 70 120 62Z" fill="url(#l${id})" stroke="#2A6123" stroke-width="2" stroke-linejoin="round"/>
      <path d="M117 61 C103 55 90 53 78 53" fill="none" stroke="#2A6123" stroke-opacity="0.45" stroke-width="1.6" stroke-linecap="round"/>
      <path d="M121 57 C132 33 159 30 168 42 C152 59 134 63 121 57Z" fill="url(#l${id})" stroke="#2A6123" stroke-width="2" stroke-linejoin="round"/>
      <path d="M124 56 C137 48 150 44 163 43" fill="none" stroke="#2A6123" stroke-opacity="0.45" stroke-width="1.6" stroke-linecap="round"/>
      <ellipse cx="98" cy="50" rx="7" ry="3" transform="rotate(30 98 50)" fill="#FFFFFF" opacity="0.4"/>
    </g>
    <path d="${c.shape}" fill="url(#b${id})"/>
    <path d="${c.shape}" fill="url(#o${id})"/>
    ${water}
    <ellipse cx="120" cy="196" rx="44" ry="25" fill="${p.light}" opacity="0.45"/>
    <path d="M56 186 C66 210 90 222 112 224" fill="none" stroke="#FFFFFF" stroke-opacity="0.35" stroke-width="3.5" stroke-linecap="round"/>
    <path d="${c.shape}" fill="none" stroke="${p.line}" stroke-width="3"/>
    <ellipse cx="82" cy="112" rx="17" ry="9" transform="rotate(-34 82 112)" fill="#FFFFFF" opacity="0.7"/>
    <circle cx="101" cy="100" r="3.5" fill="#FFFFFF" opacity="0.7"/>`;
  if (ch === 'avo') {
    const flesh = 'M120 76 C155 76 184 115 184 162 C184 201 157 226 120 226 C83 226 56 201 56 162 C56 115 85 76 120 76Z';
    return `
    <path d="${c.shape}" fill="url(#s${id})"/>
    <circle cx="68" cy="134" r="2.3" fill="${p.skinDark}" opacity="0.8"/><circle cx="171" cy="120" r="2.1" fill="${p.skinDark}" opacity="0.8"/><circle cx="60" cy="186" r="2.5" fill="${p.skinDark}" opacity="0.8"/><circle cx="179" cy="198" r="2.3" fill="${p.skinDark}" opacity="0.8"/><circle cx="150" cy="78" r="1.8" fill="${p.skinDark}" opacity="0.8"/>
    <path d="${flesh}" fill="url(#b${id})"/>
    <path d="${flesh}" fill="url(#o${id})"/>
    ${water}
    <circle cx="120" cy="188" r="28" fill="url(#p${id})"/><circle cx="120" cy="188" r="28" fill="none" stroke="#4A280D" stroke-width="2"/>
    <ellipse cx="109" cy="177" rx="10" ry="6" transform="rotate(-28 109 177)" fill="#FFFFFF" opacity="0.38"/><circle cx="133" cy="199" r="3" fill="#FFFFFF" opacity="0.12"/>
    <path d="${c.shape}" fill="none" stroke="${p.line}" stroke-width="3"/>
    <path d="M76 106 C82 92 93 82 105 77" fill="none" stroke="#FFFFFF" stroke-opacity="0.45" stroke-width="5" stroke-linecap="round"/>`;
  }
  return `
    <path d="${c.shape}" fill="url(#b${id})"/>
    <path d="${c.shape}" fill="url(#g${id})"/>
    <path d="${c.shape}" fill="url(#o${id})"/>
    ${water}
    <path d="M72 162 C70 134 86 108 104 90" fill="none" stroke="#FFFFFF" stroke-opacity="0.8" stroke-width="8" stroke-linecap="round"/>
    <circle cx="77" cy="186" r="5.5" fill="#FFFFFF" opacity="0.6"/>
    <path d="M148 214 C162 206 172 194 176 180" fill="none" stroke="#FFFFFF" stroke-opacity="0.3" stroke-width="4" stroke-linecap="round"/>
    <path d="${c.shape}" fill="none" stroke="${p.line}" stroke-width="3" stroke-linejoin="round"/>`;
}

function face(c, mood, id) {
  const fy = c.faceY;
  const my = fy + 25;
  let eyes = '';
  for (const s of [-1, 1]) {
    const x = 120 + s * c.dx;
    if (mood === 'goal' || mood === 'water') eyes += `<path d="M${x - 11} ${fy + 4} Q${x} ${fy - 12} ${x + 11} ${fy + 4}" fill="none" stroke="${INK}" stroke-width="5" stroke-linecap="round"/>`;
    else if (mood === 'sleepy') eyes += `<path d="M${x - 11} ${fy + 1} Q${x} ${fy + 9} ${x + 11} ${fy + 1}" fill="none" stroke="${INK}" stroke-width="4.5" stroke-linecap="round"/><path d="M${x - 9} ${fy + 7} l-3 4 M${x} ${fy + 9} v5 M${x + 9} ${fy + 7} l3 4" stroke="${INK}" stroke-width="2" stroke-linecap="round" opacity="0.7"/>`;
    else eyes += `<g class="eye"><ellipse cx="${x}" cy="${fy}" rx="11.5" ry="14.5" fill="url(#e${id})"/><ellipse cx="${x}" cy="${fy + 7}" rx="7.5" ry="5" fill="${c.iris}" opacity="0.55"/><circle cx="${x + 4.2}" cy="${fy - 5.5}" r="4.8" fill="#FFFFFF"/><circle cx="${x - 3.8}" cy="${fy + 5.5}" r="2.1" fill="#FFFFFF" opacity="0.9"/></g>`;
  }
  const cheeks = `<ellipse cx="${120 - c.dx - 19}" cy="${fy + 16}" rx="15" ry="9" fill="url(#k${id})"/><ellipse cx="${120 + c.dx + 19}" cy="${fy + 16}" rx="15" ry="9" fill="url(#k${id})"/>`;
  let mouth = '';
  if (mood === 'chill' || mood === 'water') mouth = `<path d="M109 ${my - 3} Q120 ${my + 9} 131 ${my - 3}" fill="none" stroke="${INK}" stroke-width="4.2" stroke-linecap="round"/>`;
  if (mood === 'goal' || mood === 'cheer') mouth = `<path d="M104 ${my - 5} Q120 ${my - 8} 136 ${my - 5} Q134 ${my + 22} 120 ${my + 22} Q106 ${my + 22} 104 ${my - 5}Z" fill="#5E1E2E" stroke="${INK}" stroke-width="3" stroke-linejoin="round"/><path d="M110 ${my + 12} Q120 ${my + 4} 130 ${my + 12} Q126 ${my + 20} 120 ${my + 20} Q114 ${my + 20} 110 ${my + 12}Z" fill="#FF7D8C"/><path d="M107 ${my - 4} h26 v4 Q120 ${my + 1} 107 ${my}Z" fill="#FFFFFF" opacity="0.92"/>`;
  if (mood === 'sleepy') mouth = `<ellipse cx="120" cy="${my + 1}" rx="6" ry="4.5" fill="#5E1E2E" stroke="${INK}" stroke-width="2"/>`;
  return `<g class="eyes">${eyes}</g>${cheeks}${mouth}`;
}

function effects(mood) {
  if (mood === 'goal') return star(34, 72, 13, '#FFC94A', 0) + star(206, 92, 10, '#FFC94A', 0.5) + star(198, 40, 7, '#FFE08A', 0.9) + star(48, 120, 6, '#FFE08A', 1.2);
  if (mood === 'cheer') {
    const colors = ['#FF6B6B', '#4D9BF0', '#FFC94A', '#5CC98A', '#B78CF2', '#FF9F5A'];
    let out = '';
    for (let i = 0; i < 12; i++) {
      const x = 20 + ((i * 53) % 200);
      const d = (i * 0.23).toFixed(2);
      const col = colors[i % colors.length];
      out += i % 3 === 0
        ? `<circle class="conf" style="animation-delay:${d}s" cx="${x}" cy="10" r="3.5" fill="${col}"/>`
        : `<rect class="conf" style="animation-delay:${d}s" x="${x}" y="6" width="${i % 2 ? 9 : 6}" height="${i % 2 ? 5 : 9}" rx="1.5" fill="${col}"/>`;
    }
    return out;
  }
  if (mood === 'sleepy') return ['26,170,88,#8C82D9,0', '20,182,70,#A79FE6,1.05', '15,164,76,#C3BDF0,2.1'].map((z) => {
    const [size, x, y, col, d] = z.split(',');
    return `<text class="z" style="animation-delay:${d}s" x="${x}" y="${y}" font-family="Fraunces, Georgia, serif" font-weight="600" font-size="${size}" fill="${col}">z</text>`;
  }).join('');
  return '';
}

// One mascot as an SVG string. mood: chill | goal | water | cheer | sleepy.
export function mascotSvg(m, mood, label = '') {
  const c = CHARACTERS[m.ch] || CHARACTERS.sprout;
  const p = c.palettes[m.pal] || c.palettes[0];
  const id = `m${++uid}`;
  return `<svg class="mascot mascot-${mood}" viewBox="0 0 240 262" role="img" aria-label="${label.replace(/[<>"&]/g, '')}">
    <defs>${defs(m.ch, c, p, id)}</defs>
    <ellipse class="shadow" cx="120" cy="${c.ground + 12}" rx="64" ry="9" fill="var(--track)"/>
    <g class="bodyg">${bodyArt(m.ch, c, p, id, mood)}${face(c, mood, id)}</g>
    ${effects(mood)}
    ${heart(76, 82, 9, '#FF6F7D', 0)}${heart(162, 70, 11, '#FF8A96', 0.12)}${heart(120, 46, 8, '#FFB0B8', 0.24)}
  </svg>`;
}
