'use strict';
// Small math / color / RNG helpers shared by every other script.

const TAU = Math.PI * 2;
const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
const lerp = (a, b, t) => a + (b - a) * t;
const easeOut = t => 1 - (1 - t) * (1 - t);
const rnd = (a, b) => a + (b - a) * Math.random();
const rndi = (a, b) => Math.floor(rnd(a, b + 1));
const chance = p => Math.random() < p;
const pick = arr => arr[Math.floor(Math.random() * arr.length)];

// Deterministic RNG so a map seed always produces the same layout.
function makeRng(seed) {
  let a = seed >>> 0;
  const f = () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  return {
    f,
    range: (lo, hi) => lo + (hi - lo) * f(),
    int: (lo, hi) => Math.floor(lo + (hi - lo + 1) * f()),
    pick: arr => arr[Math.floor(f() * arr.length)],
    chance: p => f() < p,
  };
}

const clampByte = v => Math.max(0, Math.min(255, Math.round(v)));
function hexToRgb(h) {
  const n = parseInt(h.slice(1), 16);
  return [n >> 16, (n >> 8) & 255, n & 255];
}
function rgbToHex(r, g, b) {
  return '#' + ((1 << 24) | (clampByte(r) << 16) | (clampByte(g) << 8) | clampByte(b)).toString(16).slice(1);
}
// amt in -1..1: negative darkens toward black, positive lightens toward white.
function shade(h, amt) {
  const [r, g, b] = hexToRgb(h);
  const t = amt < 0 ? 0 : 255, p = Math.abs(amt);
  return rgbToHex(r + (t - r) * p, g + (t - g) * p, b + (t - b) * p);
}
function mixHex(a, b, t) {
  const A = hexToRgb(a), B = hexToRgb(b);
  return rgbToHex(lerp(A[0], B[0], t), lerp(A[1], B[1], t), lerp(A[2], B[2], t));
}
function rgba(h, a) {
  const [r, g, b] = hexToRgb(h);
  return `rgba(${r},${g},${b},${a})`;
}

// Pull a color toward its own grey and darken it a touch (used for the gritty grade).
function grit(h, desat = 0.3, dark = 0.08) {
  const [r, g, b] = hexToRgb(h);
  const l = 0.3 * r + 0.59 * g + 0.11 * b;
  const k = 1 - dark;
  return rgbToHex(lerp(r, l, desat) * k, lerp(g, l, desat) * k, lerp(b, l, desat) * k);
}

// Procedural textures, built once at boot.
const TEX = {};
function buildTextures() {
  const mk = (w, h) => { const c = document.createElement('canvas'); c.width = w; c.height = h; return c; };
  // speckle: dark/light flecks and short scratches on transparent, overlaid on dirt and stone
  const sp = mk(256, 256), s = sp.getContext('2d');
  for (let i = 0; i < 2600; i++) {
    const dark = Math.random() < 0.7;
    s.fillStyle = dark ? `rgba(0,0,0,${rnd(0.08, 0.35)})` : `rgba(255,255,255,${rnd(0.04, 0.14)})`;
    const r = rnd(0.4, 1.6);
    s.fillRect(rnd(0, 256), rnd(0, 256), r, r * rnd(0.6, 1.4));
  }
  s.lineWidth = 0.8;
  for (let i = 0; i < 70; i++) {
    const x = rnd(0, 256), y = rnd(0, 256), a = rnd(-0.4, 0.4), l = rnd(4, 14);
    s.strokeStyle = `rgba(0,0,0,${rnd(0.08, 0.22)})`;
    s.beginPath();
    s.moveTo(x, y);
    s.lineTo(x + Math.cos(a) * l, y + Math.sin(a) * l);
    s.stroke();
  }
  TEX.speck = sp;
  // film grain: per-pixel grey noise
  const gr = mk(192, 192), g = gr.getContext('2d'), img = g.createImageData(192, 192);
  for (let i = 0; i < img.data.length; i += 4) {
    const v = Math.random() * 255;
    img.data[i] = img.data[i + 1] = img.data[i + 2] = v;
    img.data[i + 3] = 255;
  }
  g.putImageData(img, 0, 0);
  TEX.grain = gr;
}
function texPattern(ctx, name) {
  if (!ctx._pats) ctx._pats = {};
  if (!ctx._pats[name]) ctx._pats[name] = ctx.createPattern(TEX[name], 'repeat');
  return ctx._pats[name];
}

function ellipse(ctx, x, y, rx, ry) {
  ctx.beginPath();
  ctx.ellipse(x, y, rx, ry, 0, 0, TAU);
}
function poly(ctx, pts, ox = 0, oy = 0) {
  ctx.beginPath();
  ctx.moveTo(pts[0][0] + ox, pts[0][1] + oy);
  for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i][0] + ox, pts[i][1] + oy);
  ctx.closePath();
}
