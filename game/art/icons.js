'use strict';
// Unit portrait icons for the training bar (draft for the graphics overhaul). Each icon is a
// self-contained 100x100 SVG: a tile tinted with the unit's training group colour, a black
// silhouette lit from the top left with a warm gold rim, and the unit's signature gear in colour.
// unitIconSVG(type) returns the markup; it carries its own defs, so it can also be drawn into a
// canvas through an Image.

const ICON_GROUPS = {
  workers: '#c9a23a', infantry: '#c0503a', ranged: '#7aa84a', mages: '#9a62d8', giants: '#8f8a80',
};
const ICON_GROUP_OF = {
  miner: 'workers', sword: 'infantry', spear: 'infantry', ninja: 'infantry', saboteur: 'infantry',
  archer: 'ranged', flyer: 'ranged', firebird: 'ranged', ballista: 'ranged', beastmaster: 'ranged',
  cleric: 'mages', warlock: 'mages', giant: 'giants', golem: 'giants',
};

const INK = '#15120f', GOLD = '#d8ac2c', GOLD_LT = '#f3d77e', STEEL = '#c9cfd4', STEEL_DK = '#7d858c', WOOD = '#7a5432', WOOD_DK = '#4e3420';

// stroke helpers: a limb or pole, and a filled shape
const L = (pts, w = 6.5, col = INK) => `<polyline points="${pts}" fill="none" stroke="${col}" stroke-width="${w}" stroke-linecap="round" stroke-linejoin="round"/>`;
const C = (x, y, r, col = INK, extra = '') => `<circle cx="${x}" cy="${y}" r="${r}" fill="${col}" ${extra}/>`;
const P = (d, fill = INK, extra = '') => `<path d="${d}" fill="${fill}" ${extra}/>`;

// Each entry: the figure (lit by the rim filter) and optional fx drawn on top unlit (glows, sparks).
const ICON_ART = {
  miner: () => ({
    fig: `
      ${P('M64 92 L70 77 L84 72 L96 80 L97 92 Z', '#6d6660')}
      ${P('M70 77 L84 72 L88 78 L76 82 Z', '#8a837b')}
      ${L('47,64 37,89', 7)}${L('47,64 59,88', 7)}
      ${L('43,38 47,64', 8)}
      ${L('44,44 56,36 61,27', 6)}${L('44,46 52,40 61,28', 6)}
      ${L('61,28 71,10', 4.5, WOOD)}
      ${P('M55 9 Q71 2 88 15 L85 18 Q71 9 57 13 Z', STEEL, `stroke="${INK}" stroke-width="1.5"`)}
      ${C(41, 28, 10)}
      ${L('31,25 51,23', 3.2, '#5a3a22')}
      ${C(50, 22.5, 3.4, GOLD_LT)}`,
    fx: `${C(50, 22.5, 7, 'url(#glow)')}
      ${C(76, 86, 3.6, GOLD)}${C(84, 83, 2.8, GOLD_LT)}${C(89, 88, 2.4, GOLD)}${C(80, 90, 2, GOLD_LT)}`,
  }),

  sword: () => ({
    fig: `
      ${L('50,62 36,74 33,88', 7)}${L('50,62 63,76 72,84', 7)}
      ${L('42,38 50,62', 8)}
      ${L('44,44 33,53 27,52', 6)}
      ${L('45,43 56,40 63,33', 6)}
      ${P('M61 35 L88 6 L91 9 L65 38 Z', STEEL, `stroke="${INK}" stroke-width="1.6" stroke-linejoin="round"`)}
      ${L('56,29 69,41', 4, GOLD)}
      ${L('63,35 57,41', 4, WOOD_DK)}
      ${C(39, 28, 10)}
      ${L('30,25 48,23', 3.4, GOLD)}
      ${L('31,26 20,22 12,27', 2.6, GOLD)}${L('31,27 21,29 15,35', 2.4, GOLD)}`,
    fx: `${L('86,9 72,24', 1.4, '#ffffff', )}`,
  }),

  spear: () => ({
    fig: `
      ${L('42,66 35,89', 7)}${L('46,66 56,89', 7)}
      ${L('16,52 94,20', 4, WOOD)}
      ${P('M99 17 L86 18 L84 23 L90 27 Z', STEEL, `stroke="${INK}" stroke-width="1.4" stroke-linejoin="round"`)}
      ${C(40, 57, 22, 'url(#bronze)', `stroke="${INK}" stroke-width="2.2"`)}
      ${C(40, 57, 17, 'none', `stroke="${GOLD_LT}" stroke-width="1.2" opacity="0.55"`)}
      ${C(40, 57, 4.2, GOLD_LT, `stroke="${INK}" stroke-width="1"`)}
      ${C(38, 24, 10.5)}
      ${P('M27 26 Q28 12 39 12 Q50 12 50 25 L50 30 L45 30 L45 23 L31 23 L31 30 L27 30 Z', '#3b3228')}
      ${P('M24 14 Q36 -2 54 10 Q47 8 40 10 Q31 11 24 14 Z', '#b32a1e', `stroke="${INK}" stroke-width="1.2"`)}
      ${L('31,23 45,23', 2, GOLD)}`,
    fx: '',
  }),

  ninja: () => ({
    fig: `
      ${L('48,60 34,70 30,86', 7)}${L('48,60 62,68 70,82', 7)}
      ${L('46,38 48,60', 8)}
      ${L('47,44 60,48 70,42', 6)}
      ${L('46,44 34,52 24,46', 6)}
      ${P('M68 42 Q86 26 96 6 Q90 24 71 45 Z', STEEL, `stroke="${INK}" stroke-width="1.4"`)}
      ${L('69,43 64,48', 4, '#3a1414')}
      ${C(47, 28, 10.5)}
      ${P('M37 26 L57 25 L57 29.5 L37 30.5 Z', '#e2c98e')}
      ${L('41,28 44,28', 1.6, INK)}${L('49,27.6 52,27.6', 1.6, INK)}
      ${L('37,25 24,20 14,26', 3, '#a52a1c')}${L('37,27 25,30 18,37', 2.6, '#a52a1c')}`,
    fx: `<g transform="translate(18 80) rotate(20)">${P('M0 -9 L2.5 -2.5 L9 0 L2.5 2.5 L0 9 L-2.5 2.5 L-9 0 L-2.5 -2.5 Z', STEEL, `stroke="${INK}" stroke-width="1.2"`)}${C(0, 0, 1.8, INK)}</g>`,
  }),

  saboteur: () => ({
    fig: `
      ${L('46,64 32,74 26,88', 7)}${L('46,64 60,72 64,88', 7)}
      ${L('40,42 46,64', 8)}
      ${P('M52 50 Q66 46 72 56 Q74 70 62 74 Q50 74 49 62 Z', '#cfc6b4', `stroke="${INK}" stroke-width="1.8"`)}
      ${L('54,49 60,44', 3, '#6a5a44')}
      ${L('42,48 54,56', 6)}
      ${L('41,47 30,56 24,64', 6)}
      ${L('24,64 18,74', 3.2, WOOD)}
      ${P('M12 70 Q17 66 24 72 L22 75 Q17 71 14 73 Z', STEEL, `stroke="${INK}" stroke-width="1"`)}
      ${C(38, 32, 10)}
      ${P('M26 36 Q24 16 38 14 Q52 14 52 30 Q46 22 38 22 Q30 23 30 38 Z', '#2b2622')}
      ${P('M34 30 L46 29 L46 32 L34 33 Z', '#0a0908')}`,
    fx: `${C(62, 82, 1.8, '#f2efe6')}${C(68, 86, 1.4, '#f2efe6')}${C(57, 87, 1.2, '#f2efe6')}${C(72, 80, 1.1, '#f2efe6')}
      <ellipse cx="40" cy="90" rx="26" ry="4" fill="#bfb6a8" opacity="0.18"/>`,
  }),

  archer: () => ({
    fig: `
      ${L('40,64 31,89', 7)}${L('40,64 52,88', 7)}
      ${L('38,38 40,64', 8)}
      ${L('39,44 54,41 66,41', 6)}
      ${L('39,45 30,42 24,40', 6)}
      ${P('M66 8 Q88 41 66 76', 'none', `stroke="${WOOD_DK}" stroke-width="4.5" stroke-linecap="round"`)}
      ${P('M66 8 Q88 41 66 76', 'none', `stroke="${WOOD}" stroke-width="2" stroke-linecap="round"`)}
      ${L('66,8 24,41 66,76', 1.1, '#e8dfca')}
      ${L('24,41 90,41', 2.2, WOOD)}
      ${P('M97 41 L89 37 L89 45 Z', STEEL, `stroke="${INK}" stroke-width="1"`)}
      ${P('M24 41 L18 37 L19 41 L18 45 Z', '#c9b27a')}
      ${C(36, 28, 10)}
      ${P('M24 34 Q22 13 37 13 Q50 13 50 27 L46 27 Q44 20 36 20 Q28 21 28 36 Z', '#4d5a2e')}`,
    fx: '',
  }),

  flyer: () => ({
    fig: `
      ${P('M6 30 Q46 4 96 22 Q84 26 70 24 Q46 21 22 32 Z', 'url(#wing)', `stroke="${INK}" stroke-width="1.8" stroke-linejoin="round"`)}
      ${L('22,31 50,22 70,24', 1.2, GOLD_LT)}
      ${L('48,24 46,40', 2.4, '#3a2d20')}${L('56,23 52,40', 2.4, '#3a2d20')}
      ${L('47,50 40,70 30,80', 6.5)}${L('47,50 52,70 46,84', 6.5)}
      ${L('47,40 47,50', 7.5)}
      ${L('48,44 62,48 72,46', 5.5)}
      ${P('M68 42 L86 44 L86 48 L68 48 Z', WOOD, `stroke="${INK}" stroke-width="1.2"`)}
      ${P('M84 38 Q90 46 84 54', 'none', `stroke="${INK}" stroke-width="2.4" stroke-linecap="round"`)}
      ${C(47, 34, 8.5)}
      ${P('M40 31 L55 31 L55 35 L40 35 Z', '#6b5a3a')}
      ${C(44, 33, 2.4, '#9ad3e6', `stroke="${INK}" stroke-width="1"`)}${C(51, 33, 2.4, '#9ad3e6', `stroke="${INK}" stroke-width="1"`)}`,
    fx: `${L('12,58 30,58', 1.2, '#ffffff')}${L('8,66 22,66', 1, '#ffffff')}`,
  }),

  firebird: () => ({
    fig: `
      ${P('M2 34 Q46 0 98 22 Q90 26 86 26 Q80 34 72 27 Q64 35 56 27 Q48 36 40 29 Q30 38 22 32 Q12 40 2 34 Z', 'url(#fire)', `stroke="${INK}" stroke-width="1.8" stroke-linejoin="round"`)}
      ${L('48,26 46,42', 2.4, '#3a2d20')}${L('58,25 54,42', 2.4, '#3a2d20')}
      ${L('49,52 42,70 32,80', 6.5)}${L('49,52 54,70 48,84', 6.5)}
      ${L('49,42 49,52', 7.5)}
      ${L('50,46 62,54 66,62', 5.5)}
      ${C(49, 36, 8.5)}
      ${P('M42 33 L57 33 L57 37 L42 37 Z', '#6b5a3a')}
      ${C(46, 35, 2.4, '#ffcf7a', `stroke="${INK}" stroke-width="1"`)}${C(53, 35, 2.4, '#ffcf7a', `stroke="${INK}" stroke-width="1"`)}
      ${C(70, 74, 7, '#6a4a30', `stroke="${INK}" stroke-width="1.6"`)}
      ${P('M66 68 L74 68 L73 64 L67 64 Z', '#4e3420')}`,
    fx: `${P('M70 63 Q65 55 70 48 Q71 55 75 56 Q76 61 70 63 Z', '#ffb347')}${P('M70 62 Q68 57 70 53 Q72 58 73 59 Q72 62 70 62 Z', '#fff1b0')}
      ${C(70, 58, 9, 'url(#glowFire)')}`,
  }),

  ballista: () => ({
    fig: `
      ${L('16,58 12,74 10,88', 5.5)}${L('16,58 22,74 26,88', 5.5)}
      ${L('16,38 16,58', 6.5)}${L('16,44 28,50 34,52', 5)}
      ${C(16, 29, 8.5)}
      ${L('9,27 23,26', 2.6, GOLD)}
      ${L('30,80 86,80', 5, WOOD)}
      ${L('46,80 50,62', 4.5, WOOD)}${L('64,80 60,61', 4.5, WOOD)}
      ${L('28,62 88,52', 5.5, WOOD)}
      ${C(31, 61, 3.4, STEEL_DK, `stroke="${INK}" stroke-width="1"`)}
      ${P('M84 34 Q93 44 86 53 Q93 62 84 71', 'none', `stroke="${WOOD_DK}" stroke-width="4" stroke-linecap="round"`)}
      ${L('84,34 46,57 84,71', 1, '#e8dfca')}
      ${L('46,56 92,51', 2.4, '#4a3220')}
      ${P('M99 50 L91 47 L92 54 Z', STEEL, `stroke="${INK}" stroke-width="1"`)}
      ${C(38, 84, 8, INK)}${C(38, 84, 4, '#8a6a44')}${C(76, 84, 8, INK)}${C(76, 84, 4, '#8a6a44')}`,
    fx: '',
  }),

  beastmaster: () => ({
    fig: `
      ${L('42,64 32,89', 7)}${L('42,64 54,88', 7)}
      ${L('40,40 42,64', 8)}
      ${L('41,46 30,54 26,64', 6)}
      ${L('42,44 52,32 58,20', 6)}
      ${L('58,20 64,10', 1.6, '#c9b27a')}${L('58,20 72,18', 1.6, '#c9b27a')}
      ${C(38, 30, 10)}
      ${P('M24 38 Q20 18 36 15 Q52 13 53 28 L54 36 Q48 26 38 26 Q30 27 28 40 Z', '#6e4a2c', `stroke="${INK}" stroke-width="1.2"`)}
      ${P('M28 18 L25 7 L34 15 Z', '#6e4a2c', `stroke="${INK}" stroke-width="1.2"`)}${P('M44 15 L48 5 L51 17 Z', '#6e4a2c', `stroke="${INK}" stroke-width="1.2"`)}
      ${P('M22 40 Q18 52 26 58 Q30 48 34 44 Z', '#5a3c22', `stroke="${INK}" stroke-width="1"`)}`,
    fx: `<ellipse cx="66" cy="14" rx="15" ry="7" fill="none" stroke="#f0e6cc" stroke-width="1.2" stroke-dasharray="4 3" opacity="0.7"/>
      ${C(78, 11, 3.4, '#9a948a', `stroke="${INK}" stroke-width="1.2"`)}`,
  }),

  cleric: () => ({
    fig: `
      ${P('M30 42 Q44 36 52 42 L66 90 L18 90 Z', '#e8e2d2', `stroke="${INK}" stroke-width="2"`)}
      ${P('M33 52 L40 90 L46 90 L40 50 Z', GOLD, 'opacity="0.85"')}
      ${L('46,46 62,52 68,40', 5.5, '#e8e2d2')}${L('46,46 62,52 68,40', 1.6, INK)}
      ${L('70,92 72,16', 3.6, WOOD)}
      ${P('M64 16 Q72 2 80 16 Q72 24 64 16 Z', 'none', `stroke="${GOLD}" stroke-width="2.4"`)}
      ${C(41, 30, 10)}
      ${P('M28 40 Q24 16 41 15 Q58 16 54 40 Q50 26 41 25 Q32 26 28 40 Z', '#e8e2d2', `stroke="${INK}" stroke-width="1.6"`)}`,
    fx: `${C(72, 15, 5, '#9ff0d0')}${C(72, 15, 14, 'url(#glowHeal)')}
      ${P('M84 30 v8 M80 34 h8', 'none', 'stroke="#c8ffe8" stroke-width="2" stroke-linecap="round"')}${P('M86 50 v5 M83.5 52.5 h5', 'none', 'stroke="#c8ffe8" stroke-width="1.6" stroke-linecap="round" opacity="0.8"')}`,
  }),

  warlock: () => ({
    fig: `
      ${P('M30 42 Q44 36 52 42 L68 90 L16 90 Z', '#2a1a3a', `stroke="${INK}" stroke-width="2"`)}
      ${P('M22 90 L30 70 L36 90 Z M46 90 L54 72 L60 90 Z', '#1a1024')}
      ${L('46,46 60,40 66,30', 5.5, '#2a1a3a')}${L('46,46 60,40 66,30', 1.4, INK)}
      ${L('68,92 70,22', 3.6, '#3a2a30')}
      ${P('M62 22 L66 12 L70 18 L74 10 L78 22 Z', '#3a2a30')}
      ${C(41, 30, 10)}
      ${P('M27 42 Q26 22 34 14 Q40 2 52 0 Q44 10 50 18 Q56 28 54 42 Q50 27 41 26 Q32 27 27 42 Z', '#3d2552', `stroke="${INK}" stroke-width="1.6"`)}
      ${C(37, 32, 1.6, '#d9a6ff')}${C(45, 32, 1.6, '#d9a6ff')}`,
    fx: `${C(70, 18, 5.5, '#c27bff')}${C(70, 18, 15, 'url(#glowHex)')}
      ${P('M84 40 q6 -6 0 -12 q-6 -6 -12 0', 'none', 'stroke="#c27bff" stroke-width="1.6" stroke-linecap="round" opacity="0.8"')}
      ${P('M18 62 q-6 -4 -4 -11', 'none', 'stroke="#c27bff" stroke-width="1.4" stroke-linecap="round" opacity="0.6"')}`,
  }),

  giant: () => ({
    fig: `
      ${L('46,66 32,92', 13)}${L('54,66 66,92', 13)}
      ${P('M28 40 Q40 22 62 26 Q76 30 74 50 Q70 68 50 70 Q32 70 28 56 Z', INK)}
      ${L('66,36 80,52 76,70', 11)}
      ${L('32,42 22,58 20,74', 11)}
      ${P('M74 64 L92 20 Q98 12 96 26 L82 70 Z', WOOD, `stroke="${INK}" stroke-width="2"`)}
      ${C(91, 22, 1.8, STEEL_DK)}${C(95, 30, 1.6, STEEL_DK)}${C(88, 32, 1.6, STEEL_DK)}
      ${C(40, 26, 11)}
      ${C(44, 25, 1.8, '#f0c060')}
      ${P('M17 72 h9 v5 h-9 Z M71 66 h9 v5 h-9 Z', GOLD, `stroke="${INK}" stroke-width="1"`)}`,
    fx: `${P('M21 77 q-2 6 2 9 q4 3 1 8', 'none', `stroke="${STEEL_DK}" stroke-width="2" stroke-dasharray="3 2"`)}
      ${P('M75 71 q4 5 0 9 q-4 4 1 8', 'none', `stroke="${STEEL_DK}" stroke-width="2" stroke-dasharray="3 2"`)}`,
  }),

  golem: () => ({
    fig: `
      ${P('M34 66 h12 v24 h-14 Z M56 66 h12 l2 24 h-14 Z', '#6f6a62', `stroke="${INK}" stroke-width="2"`)}
      ${P('M24 30 L76 28 L80 68 L22 70 Z', '#8a847a', `stroke="${INK}" stroke-width="2.4" stroke-linejoin="round"`)}
      ${P('M24 30 L76 28 L74 36 L28 38 Z', '#a39d92')}
      ${P('M8 34 h16 v30 h-14 Z M76 32 h16 l-2 30 h-14 Z', '#6f6a62', `stroke="${INK}" stroke-width="2"`)}
      ${P('M36 8 h28 l2 22 h-32 Z', '#8a847a', `stroke="${INK}" stroke-width="2.2"`)}
      ${L('30,46 44,50 40,60', 1.4, INK)}${L('64,44 70,56', 1.4, INK)}`,
    fx: `${P('M40 18 h6 v4 h-6 Z M54 18 h6 v4 h-6 Z', '#7fe0ff')}
      ${C(50, 49, 6, '#7fe0ff')}${C(50, 49, 16, 'url(#glowRune)')}
      ${P('M14 44 l6 4 l-6 4 M84 42 l-6 4 l6 4', 'none', 'stroke="#7fe0ff" stroke-width="1.6" stroke-linecap="round"')}`,
  }),
};

let ICON_SEQ = 0;
function unitIconSVG(type) {
  const art = ICON_ART[type]();
  const gc = ICON_GROUPS[ICON_GROUP_OF[type]];
  const id = `i-${type}-${ICON_SEQ++}`;
  // ids unique to each copy, so many icons can sit on one page (a hidden copy can't break the rest)
  const u = s => s.replace(/url\(#(\w+)\)/g, `url(#${id}-$1)`);
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">
  <defs>
    <radialGradient id="${id}-bg" cx="0.42" cy="0.36" r="0.8"><stop offset="0" stop-color="${gc}" stop-opacity="0.85"/><stop offset="0.55" stop-color="${gc}" stop-opacity="0.28"/><stop offset="1" stop-color="#0b0907"/></radialGradient>
    <linearGradient id="${id}-sheen" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#fff" stop-opacity="0.12"/><stop offset="0.5" stop-color="#fff" stop-opacity="0"/></linearGradient>
    <radialGradient id="${id}-glow"><stop offset="0" stop-color="#ffe9a0" stop-opacity="0.9"/><stop offset="1" stop-color="#ffe9a0" stop-opacity="0"/></radialGradient>
    <radialGradient id="${id}-glowFire"><stop offset="0" stop-color="#ffb347" stop-opacity="0.8"/><stop offset="1" stop-color="#ff6a2a" stop-opacity="0"/></radialGradient>
    <radialGradient id="${id}-glowHeal"><stop offset="0" stop-color="#9ff0d0" stop-opacity="0.85"/><stop offset="1" stop-color="#9ff0d0" stop-opacity="0"/></radialGradient>
    <radialGradient id="${id}-glowHex"><stop offset="0" stop-color="#c27bff" stop-opacity="0.85"/><stop offset="1" stop-color="#c27bff" stop-opacity="0"/></radialGradient>
    <radialGradient id="${id}-glowRune"><stop offset="0" stop-color="#7fe0ff" stop-opacity="0.75"/><stop offset="1" stop-color="#7fe0ff" stop-opacity="0"/></radialGradient>
    <radialGradient id="${id}-bronze" cx="0.38" cy="0.32" r="0.75"><stop offset="0" stop-color="#e2b45a"/><stop offset="0.6" stop-color="#a0702c"/><stop offset="1" stop-color="#5a3c18"/></radialGradient>
    <linearGradient id="${id}-wing" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#5a4318"/><stop offset="0.6" stop-color="#8a6a26"/><stop offset="1" stop-color="#c49a2c"/></linearGradient>
    <linearGradient id="${id}-fire" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#7a1a10"/><stop offset="0.5" stop-color="#e0602a"/><stop offset="1" stop-color="#ffc35a"/></linearGradient>
    <filter id="${id}-rim" x="-10%" y="-10%" width="120%" height="120%">
      <feOffset in="SourceAlpha" dx="1.4" dy="1.4" result="shift"/>
      <feComposite in="SourceAlpha" in2="shift" operator="out" result="edge"/>
      <feFlood flood-color="${GOLD_LT}" flood-opacity="0.9"/>
      <feComposite in2="edge" operator="in" result="lit"/>
      <feMerge><feMergeNode in="SourceGraphic"/><feMergeNode in="lit"/></feMerge>
    </filter>
  </defs>
  <rect width="100" height="100" fill="#0b0907"/>
  <rect width="100" height="100" fill="url(#${id}-bg)"/>
  <ellipse cx="50" cy="92" rx="38" ry="6" fill="#000" opacity="0.45"/>
  <g filter="url(#${id}-rim)">${u(art.fig)}</g>
  ${u(art.fx || '')}
  <rect width="100" height="100" fill="url(#${id}-sheen)"/>
</svg>`;
}

// Style B, "parchment medallion": the same figures in brown ink on a parchment roundel, the gear
// hand-tinted in faded colour, hatched shading under the feet, inside a ring in the group colour.
const WOOD_INK = '#2b2116';
function unitIconWoodcut(type) {
  const art = ICON_ART[type]();
  const gc = ICON_GROUPS[ICON_GROUP_OF[type]];
  const id = `w-${type}-${ICON_SEQ++}`;
  const u = s => s.replace(/url\(#(\w+)\)/g, `url(#${id}-$1)`).split(INK).join(WOOD_INK);
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">
  <defs>
    <radialGradient id="${id}-paper" cx="0.45" cy="0.4" r="0.7"><stop offset="0" stop-color="#f1e6c8"/><stop offset="0.75" stop-color="#dcc79a"/><stop offset="1" stop-color="#b8996a"/></radialGradient>
    <pattern id="${id}-hatch" width="3" height="3" patternUnits="userSpaceOnUse" patternTransform="rotate(-35)"><line x1="0" y1="0" x2="0" y2="3" stroke="${WOOD_INK}" stroke-width="0.9"/></pattern>
    <filter id="${id}-grain" x="0" y="0" width="100%" height="100%"><feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="2" seed="4"/><feColorMatrix values="0 0 0 0 0.17  0 0 0 0 0.13  0 0 0 0 0.08  0 0 0 0.35 0"/><feComposite in2="SourceGraphic" operator="in"/></filter>
    <filter id="${id}-tint"><feColorMatrix type="matrix" values="0.82 0.16 0.04 0 0.02  0.1 0.8 0.08 0 0.02  0.08 0.16 0.66 0 0  0 0 0 1 0"/></filter>
    <radialGradient id="${id}-glow"><stop offset="0" stop-color="#fff3c0" stop-opacity="0.9"/><stop offset="1" stop-color="#fff3c0" stop-opacity="0"/></radialGradient>
    <radialGradient id="${id}-glowFire"><stop offset="0" stop-color="#ffb347" stop-opacity="0.6"/><stop offset="1" stop-color="#ff6a2a" stop-opacity="0"/></radialGradient>
    <radialGradient id="${id}-glowHeal"><stop offset="0" stop-color="#6fd8b0" stop-opacity="0.6"/><stop offset="1" stop-color="#6fd8b0" stop-opacity="0"/></radialGradient>
    <radialGradient id="${id}-glowHex"><stop offset="0" stop-color="#a45be0" stop-opacity="0.55"/><stop offset="1" stop-color="#a45be0" stop-opacity="0"/></radialGradient>
    <radialGradient id="${id}-glowRune"><stop offset="0" stop-color="#4cb8e0" stop-opacity="0.55"/><stop offset="1" stop-color="#4cb8e0" stop-opacity="0"/></radialGradient>
    <radialGradient id="${id}-bronze" cx="0.38" cy="0.32" r="0.75"><stop offset="0" stop-color="#e6c27a"/><stop offset="0.7" stop-color="#b0843c"/><stop offset="1" stop-color="#7a5626"/></radialGradient>
    <linearGradient id="${id}-wing" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#8a6a36"/><stop offset="1" stop-color="#c9a44a"/></linearGradient>
    <linearGradient id="${id}-fire" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#9a3420"/><stop offset="0.5" stop-color="#d8703a"/><stop offset="1" stop-color="#f0c060"/></linearGradient>
    <clipPath id="${id}-round"><circle cx="50" cy="50" r="41"/></clipPath>
  </defs>
  <rect width="100" height="100" rx="8" fill="#22180f"/>
  <circle cx="50" cy="50" r="47" fill="${gc}"/>
  <circle cx="50" cy="50" r="47" fill="none" stroke="#000" stroke-opacity="0.35" stroke-width="1"/>
  <circle cx="50" cy="50" r="42.5" fill="none" stroke="#e8c870" stroke-width="1.2"/>
  <g clip-path="url(#${id}-round)">
    <rect width="100" height="100" fill="url(#${id}-paper)"/>
    <rect width="100" height="100" filter="url(#${id}-grain)"/>
    <ellipse cx="50" cy="91" rx="40" ry="8" fill="url(#${id}-hatch)" opacity="0.55"/>
    <line x1="6" y1="90" x2="94" y2="90" stroke="${WOOD_INK}" stroke-width="0.9" opacity="0.6"/>
    <g transform="translate(50 50) scale(0.86) translate(-50 -50)">
      <g filter="url(#${id}-tint)">${u(art.fig)}</g>
      <g opacity="0.85">${u(art.fx || '')}</g>
    </g>
  </g>
  <circle cx="50" cy="50" r="41" fill="none" stroke="${WOOD_INK}" stroke-width="1.6"/>
</svg>`;
}

const ICON_TYPES = Object.keys(ICON_ART);
