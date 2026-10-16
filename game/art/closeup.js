'use strict';
// Style C, "close-up": dramatic head-and-shoulders portraits. Each unit fills the tile, lit from
// the top left in gold with a second rim of the group colour from behind, glowing white eyes,
// a halo behind the head, light rays and a little atmosphere (sparks, embers, motes).
// Loads after icons.js (uses its L / C / P helpers, colours and group tables).

// Two fierce almond eyes, angled down toward the nose. glow: the colour of the haze around them.
function eyes(x, y, s = 1, gap = 8.5, glow = '#ffffff') {
  const eye = (cx, m) => `M${cx - 5 * s * m} ${y - 1.6 * s} Q${cx} ${y - 3.4 * s} ${cx + 4.4 * s * m} ${y + 1.1 * s} Q${cx - 0.6 * s * m} ${y + 2.7 * s} ${cx - 5 * s * m} ${y - 1.6 * s} Z`;
  const d = eye(x - gap / 2, 1) + ' ' + eye(x + gap / 2, -1);
  return `<path d="${d}" fill="${glow}" opacity="0.75" filter="url(#eyeglow)"/><path d="${d}" fill="#fff"/>`;
}
// The shoulders at the bottom of the frame (dx shifts them, w widens them).
const shoulders = (dx = 0, w = 1, fill = 'url(#skin)') => {
  const x = v => 48 + dx + (v - 48) * w;
  return P(`M${x(4)} 101 C${x(7)} 86 ${x(20)} 77 ${x(36)} 75 L${x(48)} 73 L${x(60)} 75 C${x(76)} 77 ${x(89)} 86 ${x(92)} 101 Z`, fill);
};
const head = (x, y, r) => C(x, y, r, 'url(#skin)');
const neck = (x, y1, y2, w = 12) => L(`${x},${y1} ${x},${y2}`, w, '#120f0c');
const sparks = (pts, col = '#ffe7a0') => pts.map(([x, y, r]) => C(x, y, r, col)).join('');

const CLOSE_ART = {
  miner: {
    halo: [46, 46],
    fig: `
      ${L('30,98 82,24', 4.6, WOOD)}
      ${P('M62 16 Q82 10 98 32 L94 35 Q80 18 64 21 Z', 'url(#steel)', `stroke="${INK}" stroke-width="1.4"`)}
      ${shoulders(0)}${neck(46, 62, 74)}
      ${C(33, 90, 5.5, 'url(#skin)')}
      ${head(46, 49, 18.5)}
      ${P('M27.5 44 Q46 34 64.5 42 L64 47 Q46 40 28 49 Z', '#8a6038', `stroke="${INK}" stroke-width="0.8"`)}
      ${C(54, 38.5, 5, '#3a2a1a')}${C(54, 38.5, 3.4, GOLD_LT)}
      ${P('M72 88 L78 80 L88 79 L94 86 L90 94 L76 94 Z', '#5d5650', `stroke="${INK}" stroke-width="1"`)}`,
    fx: `${P('M57 36 L100 18 L100 58 Z', 'url(#lampcone)')}
      ${C(54, 38.5, 9, 'url(#glow)')}
      ${eyes(50, 52)}
      ${sparks([[79, 85, 2.6], [85, 84, 2], [88, 89, 1.8], [82, 90, 1.5]], GOLD)}
      ${sparks([[70, 70, 0.9], [92, 72, 0.8], [66, 80, 0.7]])}`,
  },

  sword: {
    halo: [44, 46],
    fig: `
      ${L('28,42 14,30 2,32', 3, GOLD)}${L('28,44 12,46 3,56', 2.6, GOLD)}
      ${shoulders(-2)}${neck(44, 60, 74)}
      ${head(44, 47, 18.5)}
      ${P('M25.5 42 Q44 32 62.5 40 L62.5 45.5 Q44 38 25.8 47.5 Z', GOLD, `stroke="${INK}" stroke-width="0.8"`)}
      ${P('M64 82 L88 6 L94 8 L71 84 Z', 'url(#steel)', `stroke="${INK}" stroke-width="1.6" stroke-linejoin="round"`)}
      ${L('58,75 79,82', 5, GOLD)}${L('58,75 79,82', 1.2, '#7a5a10')}
      ${L('68,85 65,96', 5.5, WOOD_DK)}
      ${C(67, 90, 6, 'url(#skin)')}`,
    fx: `${L('86,12 70,64', 1.4, '#ffffff')}
      ${eyes(48, 49)}
      ${sparks([[90, 4, 1.4], [96, 14, 1], [84, 2, 0.9]], '#ffffff')}`,
  },

  spear: {
    halo: [44, 46],
    fig: `
      ${L('60,101 92,12', 4.4, WOOD)}
      ${P('M88 2 L96 14 L93 22 L86 18 Z', 'url(#steel)', `stroke="${INK}" stroke-width="1.4" stroke-linejoin="round"`)}
      ${shoulders(2)}${neck(44, 62, 74)}
      ${P('M14 46 Q24 8 62 20 Q50 18 42 21 Q28 25 20 46 Z', '#a82418', `stroke="${INK}" stroke-width="1.2"`)}
      ${L('22,36 30,22', 0.9, '#5a0e08')}${L('30,30 40,18', 0.9, '#5a0e08')}${L('38,26 48,18', 0.9, '#5a0e08')}
      ${P('M24 62 Q21 29 44 27 Q67 29 64 62 L60 70 L28 70 Z', 'url(#bronzeDk)', `stroke="${INK}" stroke-width="1.6"`)}
      ${P('M29 46 L59 46 L59 53 L48.5 53 L48.5 69 L39.5 69 L39.5 53 L29 53 Z', '#0a0806')}
      ${P('M24.5 40 Q44 33 63.5 40', 'none', `stroke="${GOLD}" stroke-width="1.6"`)}
      ${C(16, 96, 30, 'url(#bronze)', `stroke="${INK}" stroke-width="2.4"`)}
      ${C(16, 96, 24, 'none', `stroke="${GOLD_LT}" stroke-width="1.4" opacity="0.7"`)}
      ${P('M8 86 L16 74 L24 86', 'none', `stroke="${INK}" stroke-width="3" stroke-linejoin="round"`)}`,
    fx: `${eyes(44, 49.5, 0.9, 9)}
      ${L('90,8 94,16', 1.2, '#ffffff')}`,
  },

  ninja: {
    halo: [46, 46],
    fig: `
      ${P('M8 92 Q48 52 92 6 L96 9 Q52 56 12 96 Z', 'url(#steel)', `stroke="${INK}" stroke-width="1.2"`)}
      <ellipse cx="22" cy="80" rx="7" ry="3" transform="rotate(-45 22 80)" fill="${GOLD}" stroke="${INK}" stroke-width="1"/>
      ${L('19,83 6,96', 4.5, '#3a1414')}
      ${shoulders(0, 1, '#1b1715')}${neck(46, 60, 74)}
      ${head(46, 47, 18.5)}
      ${P('M27.5 43 L64.5 41 L64.5 52 L27.5 54 Z', '#3a2d24')}
      ${L('28,41 14,34 3,38', 3.4, '#b0281a')}${L('28,43 15,47 6,57', 3, '#b0281a')}
      ${P('M66 70 L74 77 L84 72 L79 81 L88 87 L78 87 L75 96 L71 87 L62 87 L69 81 Z', 'url(#steel)', `stroke="${INK}" stroke-width="1.2" stroke-linejoin="round"`)}
      ${C(75, 81, 2.2, INK)}`,
    fx: `${eyes(49, 47, 1, 9)}
      ${L('88,10 60,38', 1.2, '#ffffff')}`,
  },

  saboteur: {
    halo: [46, 48],
    fig: `
      ${P('M64 70 Q80 58 92 70 Q98 90 84 96 Q66 98 62 84 Z', '#d6cdb8', `stroke="${INK}" stroke-width="1.6"`)}
      ${L('66,68 72,62 78,66', 2.6, '#6a5a44')}
      ${shoulders(-4, 1, '#26211d')}
      ${P('M16 88 Q10 36 46 22 Q80 32 76 88 Q68 60 46 58 Q26 60 16 88 Z', '#2e2824', `stroke="${INK}" stroke-width="1.4"`)}
      <ellipse cx="46" cy="52" rx="15" ry="17" fill="#060504"/>
      ${P('M18 101 L28 70 L32 72 L26 101 Z', 'url(#steel)', `stroke="${INK}" stroke-width="1"`)}`,
    fx: `${eyes(47, 51, 0.85, 9)}
      ${sparks([[70, 98, 1.3], [76, 99, 1], [86, 97, 1.1], [64, 95, 0.8]], '#f2efe6')}
      <path d="M6 70 q8 -6 4 -14 q-4 -8 6 -12 M88 46 q8 -4 4 -12" fill="none" stroke="#c9c2b6" stroke-width="1.4" stroke-linecap="round" opacity="0.35"/>`,
  },

  archer: {
    halo: [42, 48],
    fig: `
      ${P('M80 2 Q100 52 80 102', 'none', `stroke="${WOOD_DK}" stroke-width="5" stroke-linecap="round"`)}
      ${P('M80 2 Q100 52 80 102', 'none', `stroke="${WOOD}" stroke-width="2.2" stroke-linecap="round"`)}
      ${shoulders(-6)}${neck(40, 62, 74)}
      ${head(40, 49, 17.5)}
      ${P('M18 70 Q12 30 40 27 Q64 28 61 50 Q55 38 40 38 Q26 40 24 70 Z', '#3e4a24', `stroke="${INK}" stroke-width="1.4"`)}
      ${P('M26 34 Q20 22 10 24 Q16 30 20 44 Z', '#3e4a24', `stroke="${INK}" stroke-width="1.2" stroke-linejoin="round"`)}
      ${L('80,2 54,57 80,102', 1, '#efe6d0')}
      ${L('26,57 94,57', 2.2, WOOD)}
      ${P('M100 57 L92 53 L92 61 Z', 'url(#steel)', `stroke="${INK}" stroke-width="1"`)}
      ${P('M26 57 L18 52 L20 57 L18 62 Z', '#b8a070')}
      ${C(54, 58, 5.5, 'url(#skin)')}${C(91, 57, 5.5, 'url(#skin)')}`,
    fx: `${eyes(45, 50, 0.95, 8.5)}`,
  },

  flyer: {
    halo: [48, 52],
    fig: `
      ${P('M-4 34 Q46 -8 104 16 Q92 22 80 21 Q50 18 18 36 Z', 'url(#wing)', `stroke="${INK}" stroke-width="1.8" stroke-linejoin="round"`)}
      ${L('18,35 48,20 80,21', 1.2, GOLD_LT)}${L('30,28 36,16', 1, '#3a2d20')}${L('50,22 52,10', 1, '#3a2d20')}${L('68,21 70,12', 1, '#3a2d20')}
      ${L('40,24 36,44', 2.6, '#3a2d20')}${L('60,22 60,42', 2.6, '#3a2d20')}
      ${shoulders(0)}${neck(48, 66, 76)}
      ${head(48, 55, 17)}
      ${P('M31 52 Q30 36 48 36 Q66 36 65 52 Q58 44 48 44 Q38 44 31 52 Z', '#5a4428', `stroke="${INK}" stroke-width="1.2"`)}
      ${L('31,55 65,54', 4, '#3a2d20')}
      ${C(42, 55, 6.2, '#3a2d20')}${C(55, 54.5, 6.2, '#3a2d20')}
      ${P('M56 90 L98 78 L98 84 L58 96 Z', WOOD, `stroke="${INK}" stroke-width="1.2"`)}
      ${P('M92 64 Q100 81 94 98', 'none', `stroke="${STEEL_DK}" stroke-width="3" stroke-linecap="round"`)}
      ${C(60, 92, 5.5, 'url(#skin)')}`,
    fx: `${C(42, 55, 4.6, '#e9f7ff')}${C(55, 54.5, 4.6, '#e9f7ff')}
      ${C(42, 55, 9, 'url(#glowWhite)')}${C(55, 54.5, 9, 'url(#glowWhite)')}
      ${C(40.5, 53.5, 1.4, '#ffffff')}${C(53.5, 53, 1.4, '#ffffff')}
      ${L('4,62 22,62', 1.2, '#ffffff')}${L('2,72 16,72', 1, '#ffffff')}${L('6,82 18,82', 0.9, '#ffffff')}`,
  },

  firebird: {
    halo: [48, 54],
    fig: `
      ${P('M-6 36 Q46 -10 106 18 Q98 24 92 22 Q86 32 78 24 Q70 34 62 24 Q54 34 46 25 Q36 36 28 28 Q18 40 10 32 Q2 42 -6 36 Z', 'url(#fire)', `stroke="${INK}" stroke-width="1.8" stroke-linejoin="round"`)}
      ${L('40,26 36,44', 2.6, '#3a2d20')}${L('60,24 60,42', 2.6, '#3a2d20')}
      ${shoulders(2)}${neck(50, 66, 76)}
      ${head(50, 56, 17)}
      ${P('M33 53 Q32 37 50 37 Q68 37 67 53 Q60 45 50 45 Q40 45 33 53 Z', '#5a4428', `stroke="${INK}" stroke-width="1.2"`)}
      ${L('33,56 67,55', 4, '#3a2d20')}
      ${C(44, 56, 6.2, '#3a2d20')}${C(57, 55.5, 6.2, '#3a2d20')}
      ${C(20, 80, 10, '#6a4a30', `stroke="${INK}" stroke-width="1.8"`)}
      ${P('M14 71 L26 71 L25 66 L15 66 Z', '#4e3420', `stroke="${INK}" stroke-width="1"`)}
      ${C(22, 90, 5.5, 'url(#skin)')}`,
    fx: `${C(44, 56, 4.6, '#fff1c8')}${C(57, 55.5, 4.6, '#fff1c8')}
      ${C(44, 56, 9, 'url(#glowFire)')}${C(57, 55.5, 9, 'url(#glowFire)')}
      ${P('M20 66 Q14 56 20 46 Q22 56 27 57 Q28 63 20 66 Z', '#ffb347')}${P('M20 65 Q17 59 20 53 Q23 59 24 60 Q23 64 20 65 Z', '#fff1b0')}
      ${C(20, 58, 13, 'url(#glowFire)')}
      ${sparks([[30, 40, 1.4], [74, 34, 1.2], [86, 44, 1], [12, 46, 1.1], [92, 30, 1.4], [6, 60, 0.9]], '#ffb347')}`,
  },

  ballista: {
    halo: [32, 46],
    fig: `
      ${shoulders(-18, 0.85)}${neck(30, 60, 74)}
      ${head(30, 48, 16.5)}
      ${P('M13.6 43 Q30 34 46.4 41 L46.3 46 Q30 39 13.8 48 Z', GOLD, `stroke="${INK}" stroke-width="0.8"`)}
      ${L('14,98 100,70', 7, WOOD)}${L('14,98 100,70', 1.4, '#4a3220')}
      ${P('M84 26 Q98 52 86 76 Q98 98 86 120', 'none', `stroke="${WOOD_DK}" stroke-width="6" stroke-linecap="round"`)}
      ${L('84,26 52,80 86,120', 1.1, '#efe6d0')}
      ${L('46,82 98,66', 3, '#3e2a1a')}
      ${P('M100 64 L92 63 L94 70 Z', 'url(#steel)', `stroke="${INK}" stroke-width="1"`)}
      ${C(36, 92, 7, STEEL_DK, `stroke="${INK}" stroke-width="1.6"`)}${C(36, 92, 2.5, INK)}
      ${C(46, 84, 5.5, 'url(#skin)')}`,
    fx: `${eyes(34, 49, 0.9, 8)}
      ${L('94,66 99,64.5', 1.2, '#ffffff')}`,
  },

  beastmaster: {
    halo: [44, 50],
    fig: `
      ${L('62,74 76,46 84,24', 7, '#120f0c')}
      ${C(84, 23, 5, 'url(#skin)')}
      ${shoulders(-2)}${neck(44, 64, 74)}
      ${P('M6 100 Q8 78 22 72 L28 80 L32 70 L40 78 L46 70 L52 78 L58 70 L64 78 L70 72 Q84 78 88 100 Z', '#5a3c22', `stroke="${INK}" stroke-width="1.2"`)}
      ${head(44, 54, 17.5)}
      ${P('M20 60 Q16 30 40 24 Q60 22 74 30 L86 34 Q86 41 76 41 L72 46 Q62 37 46 37 Q32 39 26 62 Z', '#6e4a2c', `stroke="${INK}" stroke-width="1.4"`)}
      ${P('M30 28 L24 8 L40 22 Z M44 24 L48 6 L56 24 Z', '#6e4a2c', `stroke="${INK}" stroke-width="1.2" stroke-linejoin="round"`)}
      ${P('M74 34 L86 34 L82 38 Z', '#efe6d0')}
      ${C(60, 31, 1.6, '#e8b040')}`,
    fx: `${eyes(48, 55, 0.95, 8.5)}
      <ellipse cx="80" cy="18" rx="17" ry="8" fill="none" stroke="#f0e6cc" stroke-width="1.2" stroke-dasharray="4 3" opacity="0.7" transform="rotate(-12 80 18)"/>
      ${C(95, 13, 3.6, '#9a948a', `stroke="${INK}" stroke-width="1.2"`)}`,
  },

  cleric: {
    halo: [46, 50],
    fig: `
      ${L('78,102 80,22', 3.6, WOOD)}
      ${shoulders(-2, 1.05, '#e8e2d2')}
      ${P('M30 76 L40 101 L48 101 L40 74 Z M62 76 L54 101 L60 101 L68 74 Z', GOLD)}
      ${P('M20 80 Q14 30 46 24 Q78 30 72 80 Q66 56 46 56 Q28 56 20 80 Z', '#ece6d6', `stroke="${INK}" stroke-width="1.6"`)}
      ${P('M23 76 Q20 34 46 29 Q72 34 69 76', 'none', `stroke="${GOLD}" stroke-width="1.6"`)}
      <ellipse cx="46" cy="55" rx="14" ry="16" fill="url(#skin)"/>
      ${P('M70 24 Q80 6 90 24 Q80 32 70 24 Z', 'none', `stroke="${GOLD}" stroke-width="2.6"`)}
      ${C(78, 66, 5.5, 'url(#skin)')}`,
    fx: `${C(80, 18, 6, '#a9f5d8')}${C(80, 18, 20, 'url(#glowHeal)')}
      <ellipse cx="54" cy="56" rx="10" ry="14" fill="url(#glowHeal)" opacity="0.5"/>
      ${eyes(47, 54, 0.9, 8.5, '#9ff0d0')}
      ${P('M88 40 v8 M84 44 h8', 'none', 'stroke="#c8ffe8" stroke-width="2" stroke-linecap="round"')}${P('M12 30 v5 M9.5 32.5 h5', 'none', 'stroke="#c8ffe8" stroke-width="1.6" stroke-linecap="round" opacity="0.8"')}
      ${sparks([[66, 10, 1], [92, 28, 1.2], [70, 34, 0.8]], '#c8ffe8')}`,
  },

  warlock: {
    halo: [46, 52],
    fig: `
      ${L('16,102 20,26', 3.6, '#3a2a30')}
      ${P('M12 26 L16 14 L20 22 L24 12 L28 26 Z', '#3a2a30')}
      ${shoulders(2, 1.05, '#24162f')}
      ${P('M18 84 Q16 44 30 30 Q42 12 64 0 Q54 16 60 28 Q74 46 72 84 Q66 58 46 58 Q30 58 18 84 Z', '#3a2350', `stroke="${INK}" stroke-width="1.6"`)}
      <ellipse cx="46" cy="58" rx="14" ry="16" fill="#060407"/>
      ${C(19, 70, 5.5, 'url(#skin)')}`,
    fx: `${C(20, 20, 6.5, '#d49bff')}${C(20, 20, 20, 'url(#glowHex)')}
      ${eyes(47, 57, 0.95, 8.5, '#c27bff')}
      ${P('M84 66 q8 -8 0 -16 q-8 -8 -16 0', 'none', 'stroke="#c27bff" stroke-width="1.6" stroke-linecap="round" opacity="0.8"')}
      ${P('M90 30 l3 -5 l3 5 l-3 5 Z M80 86 l2.5 -4 l2.5 4 l-2.5 4 Z', '#d49bff', 'opacity="0.8"')}
      ${sparks([[34, 14, 1], [8, 44, 1.1], [30, 34, 0.8]], '#e0b8ff')}`,
  },

  giant: {
    halo: [46, 44],
    fig: `
      ${P('M70 104 L88 8 Q96 0 100 12 L84 106 Z', WOOD, `stroke="${INK}" stroke-width="2"`)}
      ${C(92, 14, 1.8, STEEL_DK)}${C(96, 24, 1.6, STEEL_DK)}${C(89, 28, 1.6, STEEL_DK)}${C(93, 36, 1.4, STEEL_DK)}
      ${shoulders(-2, 1.35)}${neck(46, 66, 78, 20)}
      ${head(46, 44, 25)}
      ${P('M23 41 Q35 35 47 43 Q59 35 70 39 L69 45 Q59 41 47 50 Q35 41 23 47 Z', '#050403', `stroke="#3a3028" stroke-width="0.8"`)}
      ${L('28,58 38,64', 1.4, '#5a4a3a')}${L('58,26 65,37', 1.4, '#5a4a3a')}${L('61,27 59,31', 1, '#5a4a3a')}
      ${P('M24 76 Q46 84 68 76 L70 84 Q46 92 22 84 Z', '#5a5a5c', `stroke="${INK}" stroke-width="1.4"`)}
      ${C(32, 80, 1.6, '#aaa')}${C(46, 84, 1.6, '#aaa')}${C(60, 80, 1.6, '#aaa')}
      ${P('M42 86 h8 v8 h-8 Z', GOLD, `stroke="${INK}" stroke-width="1.2"`)}`,
    fx: `${eyes(47, 50, 0.8, 11)}
      ${P('M46 94 q-3 4 0 7', 'none', `stroke="${STEEL_DK}" stroke-width="2" stroke-dasharray="3 2"`)}`,
  },

  golem: {
    halo: [48, 42],
    fig: `
      ${P('M0 101 L4 76 L30 70 L66 70 L94 76 L98 101 Z', '#7a746b', `stroke="${INK}" stroke-width="2"`)}
      ${P('M30 70 L66 70 L62 101 L34 101 Z', '#8a847a', `stroke="${INK}" stroke-width="1.6"`)}
      ${P('M26 22 L70 18 L74 62 L24 66 Z', 'url(#stone)', `stroke="${INK}" stroke-width="2.4" stroke-linejoin="round"`)}
      ${P('M26 22 L70 18 L70 26 L27 30 Z', '#a8a296')}
      ${L('34,32 40,40 36,48', 1.2, INK)}${L('64,44 58,52 66,58', 1.2, INK)}${L('8,84 16,90', 1.2, INK)}${L('84,82 90,92', 1.2, INK)}
      ${P('M30 62 Q34 58 40 62 M60 64 Q66 60 70 62', 'none', 'stroke="#5d7a3a" stroke-width="2.4" stroke-linecap="round"')}`,
    fx: `${P('M32 40 L45 42 L44 47 L32 45 Z M53 42 L66 40 L66 45 L54 47 Z', '#eaffff')}
      ${C(39, 44, 9, 'url(#glowRune)')}${C(60, 44, 9, 'url(#glowRune)')}
      ${L('34,32 40,40 36,48', 0.8, '#7fe0ff')}${L('64,44 58,52 66,58', 0.8, '#7fe0ff')}
      ${C(48, 86, 5, '#7fe0ff')}${C(48, 86, 13, 'url(#glowRune)')}`,
  },
};

function unitIconCloseup(type) {
  const art = CLOSE_ART[type];
  const gc = ICON_GROUPS[ICON_GROUP_OF[type]];
  const id = `c-${type}-${ICON_SEQ++}`;
  const u = s => s.replace(/url\(#(\w+)\)/g, `url(#${id}-$1)`);
  const [hx, hy] = art.halo;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">
  <defs>
    <radialGradient id="${id}-bg" cx="${hx / 100}" cy="${hy / 100}" r="0.75"><stop offset="0" stop-color="${gc}"/><stop offset="0.35" stop-color="${gc}" stop-opacity="0.55"/><stop offset="1" stop-color="#070605"/></radialGradient>
    <radialGradient id="${id}-skin" cx="0.35" cy="0.3" r="0.8"><stop offset="0" stop-color="#2e2620"/><stop offset="1" stop-color="#0b0908"/></radialGradient>
    <linearGradient id="${id}-steel" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#ffffff"/><stop offset="0.45" stop-color="#c9cfd4"/><stop offset="1" stop-color="#6d757c"/></linearGradient>
    <linearGradient id="${id}-stone" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#a39d92"/><stop offset="1" stop-color="#5e594f"/></linearGradient>
    <radialGradient id="${id}-bronze" cx="0.4" cy="0.3" r="0.8"><stop offset="0" stop-color="#ecc070"/><stop offset="0.55" stop-color="#a0702c"/><stop offset="1" stop-color="#4a3014"/></radialGradient>
    <linearGradient id="${id}-bronzeDk" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#8a6a3a"/><stop offset="0.5" stop-color="#4a3824"/><stop offset="1" stop-color="#1e1610"/></linearGradient>
    <linearGradient id="${id}-wing" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#4a3614"/><stop offset="0.6" stop-color="#8a6a26"/><stop offset="1" stop-color="#d8ac40"/></linearGradient>
    <linearGradient id="${id}-fire" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#6a140c"/><stop offset="0.45" stop-color="#e0602a"/><stop offset="1" stop-color="#ffd27a"/></linearGradient>
    <linearGradient id="${id}-lampcone" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#ffe9a0" stop-opacity="0.55"/><stop offset="1" stop-color="#ffe9a0" stop-opacity="0"/></linearGradient>
    <radialGradient id="${id}-glow"><stop offset="0" stop-color="#ffe9a0" stop-opacity="0.95"/><stop offset="1" stop-color="#ffe9a0" stop-opacity="0"/></radialGradient>
    <radialGradient id="${id}-glowWhite"><stop offset="0" stop-color="#ffffff" stop-opacity="0.6"/><stop offset="1" stop-color="#ffffff" stop-opacity="0"/></radialGradient>
    <radialGradient id="${id}-glowFire"><stop offset="0" stop-color="#ffb347" stop-opacity="0.85"/><stop offset="1" stop-color="#ff6a2a" stop-opacity="0"/></radialGradient>
    <radialGradient id="${id}-glowHeal"><stop offset="0" stop-color="#9ff0d0" stop-opacity="0.9"/><stop offset="1" stop-color="#9ff0d0" stop-opacity="0"/></radialGradient>
    <radialGradient id="${id}-glowHex"><stop offset="0" stop-color="#c27bff" stop-opacity="0.9"/><stop offset="1" stop-color="#c27bff" stop-opacity="0"/></radialGradient>
    <radialGradient id="${id}-glowRune"><stop offset="0" stop-color="#7fe0ff" stop-opacity="0.85"/><stop offset="1" stop-color="#7fe0ff" stop-opacity="0"/></radialGradient>
    <linearGradient id="${id}-rays" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#fff" stop-opacity="0.16"/><stop offset="0.7" stop-color="#fff" stop-opacity="0"/></linearGradient>
    <linearGradient id="${id}-floor" x1="0" y1="0" x2="0" y2="1"><stop offset="0.55" stop-color="#000" stop-opacity="0"/><stop offset="1" stop-color="#000" stop-opacity="0.7"/></linearGradient>
    <filter id="${id}-eyeglow" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="1.8"/></filter>
    <filter id="${id}-rim" x="-10%" y="-10%" width="120%" height="120%">
      <feOffset in="SourceAlpha" dx="1.5" dy="1.5" result="a"/>
      <feComposite in="SourceAlpha" in2="a" operator="out" result="edgeA"/>
      <feFlood flood-color="${GOLD_LT}" flood-opacity="0.95"/><feComposite in2="edgeA" operator="in" result="litA"/>
      <feOffset in="SourceAlpha" dx="-1.3" dy="-0.6" result="b"/>
      <feComposite in="SourceAlpha" in2="b" operator="out" result="edgeB"/>
      <feFlood flood-color="${gc}" flood-opacity="0.9"/><feComposite in2="edgeB" operator="in" result="litB"/>
      <feMerge><feMergeNode in="SourceGraphic"/><feMergeNode in="litB"/><feMergeNode in="litA"/></feMerge>
    </filter>
  </defs>
  <rect width="100" height="100" fill="#070605"/>
  <rect width="100" height="100" fill="url(#${id}-bg)"/>
  <path d="M-10 -10 L34 -10 L6 110 L-10 110 Z M44 -10 L58 -10 L22 110 L12 110 Z" fill="url(#${id}-rays)"/>
  <g filter="url(#${id}-rim)">${u(art.fig)}</g>
  ${u(art.fx)}
  <rect width="100" height="100" fill="url(#${id}-floor)"/>
  <rect x="0.5" y="0.5" width="99" height="99" fill="none" stroke="#000" stroke-opacity="0.6"/>
</svg>`;
}
