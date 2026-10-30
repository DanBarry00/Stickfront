'use strict';
// Lighting: a half-resolution shade layer laid over the world after it's drawn. The map's theme
// sets how dim the day is (theme.shade); the keeps are indoors, so they're darker still. Every
// light source then cuts a soft hole in the shade and adds a warm (or magical) glow on top:
// torches, braziers and lit windows in the keeps, the statues' crystals, the Monolith, miners'
// cap lamps, fire (burning soldiers, Firebirds, fire pots, flaming arrows), spells and mages.

// Lights fixed to a keep, in castle coordinates (x from the world edge; the red keep is mirrored).
const FLOOR_Y = LANE_TOP - 10;
const KEEP_LIGHTS = [
  // wall torches inside the hall
  { x: 155, y: FLOOR_Y - 125, r: 190, col: [255, 160, 70], a: 0.75, flick: 1 },
  { x: 395, y: FLOOR_Y - 117, r: 190, col: [255, 160, 70], a: 0.75, flick: 2 },
  { x: 530, y: FLOOR_Y - 95, r: 170, col: [255, 160, 70], a: 0.7, flick: 3 },
  { x: 275, y: FLOOR_Y + 60, r: 220, col: [255, 190, 120], a: 0.45, flick: 11 },   // torchlight pooled on the floor
  // lit windows and doorways of the buildings
  { x: BUILD_X.sword, y: FLOOR_Y - 60, r: 60, col: [255, 180, 90], a: 0.5, flick: 4 },
  { x: CLASS_X.mages - 12, y: FLOOR_Y - 92, r: 50, col: [255, 225, 150], a: 0.4, flick: 5 },   // the Mage Tower's windows: candlelight...
  { x: CLASS_X.mages + 14, y: FLOOR_Y - 70, r: 45, col: [190, 120, 255], a: 0.35, flick: 9 },   // ...a violet glow...
  { x: CLASS_X.mages, y: FLOOR_Y - 46, r: 40, col: [130, 255, 150], a: 0.3, flick: 10 },   // ...and the necromancer's green
  { x: BUILD_X.archer, y: FLOOR_Y - 58, r: 55, col: [255, 180, 90], a: 0.45, flick: 6 },
  { x: BUILD_X.miner, y: FLOOR_Y - 40, r: 70, col: [255, 140, 50], a: 0.45, flick: 7 },   // the lodge's forge
  // braziers flanking the gate, outside
  { x: GATE_X + 34, y: LANE_TOP - 30, r: 130, col: [255, 140, 50], a: 0.6, flick: 8 },
];

let LIGHT = null;
function lightLayer(vw) {
  const w = Math.ceil(vw / 2), h = VIEW_H / 2;
  if (!LIGHT || LIGHT.w !== w) {
    const c = document.createElement('canvas');
    c.width = w;
    c.height = h;
    LIGHT = { c, g: c.getContext('2d'), w, h };
  }
  return LIGHT;
}

const flicker = seed => 1 + Math.sin(RT * 13 + seed * 7.3) * 0.06 + Math.sin(RT * 23 + seed * 3.1) * 0.04;

// Every light in or near the view: { x, y, r, col: [r, g, b], a } in world coordinates.
function collectLights(x0, x1) {
  const out = [], near = (x, r) => x + r > x0 && x - r < x1;
  const add = (x, y, r, col, a, seed = 0) => { if (near(x, r)) out.push({ x, y, r: r * flicker(seed), col, a }); };
  for (const t of G.teams) {
    if (t.noCastle) continue;   // (a campaign field with no castle on that side)
    for (const l of KEEP_LIGHTS) add(t.edge(l.x), l.y, l.r, l.col, l.a, l.flick + t.id * 11);
    // the statue's crystal (a dimmer, colder glow once it's broken)
    const s = t.statue, c = hexRgb(TEAM_STYLE[t.id].crystal);
    if (!s.dead) add(s.x, LANE_TOP - 35, 110 + s.glow * 60, c, 0.45 + s.glow * 0.3);
  }
  if (G.shrine) {
    const s = G.shrine, c = s.owner < 0 ? [230, 220, 190] : hexRgb(TEAM_STYLE[s.owner].crystal);
    add(s.x, s.y - 140, 120 + s.pulse * 80, c, 0.5);
  }
  for (const u of G.units) {
    if (u.dead || u.inside || !near(u.x, 120)) continue;
    const air = u.alt || 0;
    if (u.burnT > 0) add(u.x, u.y - 30 - air, 70, [255, 130, 40], 0.55, u.seed);
    if (u.type === 'firebird') add(u.x, u.y - air - 60, 110, [255, 140, 50], 0.6, u.seed);
    if (u.type === 'miner' && unitGear('miner', u.team, u.perks) === 'lamp') add(u.x + u.facing * 6, u.y - 56, 55, [255, 220, 140], 0.4, u.seed);
    if (u.type === 'golem') add(u.x, u.y - 40 * u.scale, 60, [120, 220, 255], 0.35);
    if (u.isStatueGiant) add(u.x, u.y - 50 * u.scale, 90, hexRgb(TEAM_STYLE[u.team].crystal), 0.45);
    if ((u.type === 'cleric' || u.type === 'warlock') && u.swingKind === 'cast' && u.swing >= 0) {
      add(u.x + u.facing * 10, u.y - 75, 90, u.type === 'cleric' ? [190, 255, 220] : [190, 120, 255], 0.55);
    }
  }
  for (const p of G.projectiles) {
    if (p.fire) add(p.x, p.y, 45, [255, 150, 50], 0.5, p.t * 10);
    if (p.kind === 'pot') add(p.x, p.y, 55, [255, 150, 50], 0.5, p.t * 10);
  }
  for (const p of G.pools) {
    const col = p.kind === 'blight' ? [140, 220, 90] : [200, 255, 220];
    add(p.x, p.y - 10, p.r * 1.4, col, 0.35);
  }
  for (const f of G.spellFx) if (f.kind === 'blast' || f.kind === 'fireball') add(f.x, f.y - 20, (f.r || 60) * 2, [255, 160, 60], 0.7 * (1 - f.t / f.max));
  return out;
}

function hexRgb(h) {
  const n = parseInt(h.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

// Lay the shade over the world (already drawn on ctx in screen space) and add the lights' glow.
function drawLighting(ctx, vw) {
  const th = G.map.theme, camX = G.cam.x, Lg = lightLayer(vw), g = Lg.g, k = 0.5;
  const lights = collectLights(camX, camX + vw);
  g.setTransform(k, 0, 0, k, -camX * k, 0);
  g.globalCompositeOperation = 'source-over';
  g.clearRect(camX, 0, vw, VIEW_H);
  // the day's shade, heavier toward the bottom of the screen where things are closest
  const sh = th.shade ?? 0.2;
  const grad = g.createLinearGradient(0, 0, 0, VIEW_H);
  grad.addColorStop(0, `rgba(16,12,22,${sh * 0.5})`);
  grad.addColorStop(0.55, `rgba(16,12,22,${sh})`);
  grad.addColorStop(1, `rgba(10,8,14,${Math.min(0.85, sh + 0.18)})`);
  g.fillStyle = grad;
  g.fillRect(camX, 0, vw, VIEW_H);
  // indoors: the keeps are gloomy
  g.fillStyle = 'rgba(8,6,10,0.16)';
  for (const t of G.teams) {
    if (t.noCastle) continue;
    const a = t.edge(-80), b = t.edge(GATE_X - 14);
    g.fillRect(Math.min(a, b), WALL_TOP + 14, Math.abs(b - a), LANE_BOT + 16 - WALL_TOP - 14);
  }
  // each light cuts a soft hole in the shade
  g.globalCompositeOperation = 'destination-out';
  for (const l of lights) {
    const rg = g.createRadialGradient(l.x, l.y, 0, l.x, l.y, l.r);
    rg.addColorStop(0, `rgba(0,0,0,${Math.min(1, l.a * 1.6)})`);
    rg.addColorStop(1, 'rgba(0,0,0,0)');
    g.fillStyle = rg;
    g.fillRect(l.x - l.r, l.y - l.r, l.r * 2, l.r * 2);
  }
  ctx.drawImage(Lg.c, 0, 0, vw, VIEW_H);
  // and adds its coloured glow
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  for (const l of lights) {
    const x = l.x - camX, [r, gg, b] = l.col, gr = l.r * 0.75;
    const rg = ctx.createRadialGradient(x, l.y, 0, x, l.y, gr);
    rg.addColorStop(0, `rgba(${r},${gg},${b},${l.a * 0.32})`);
    rg.addColorStop(0.4, `rgba(${r},${gg},${b},${l.a * 0.12})`);
    rg.addColorStop(1, `rgba(${r},${gg},${b},0)`);
    ctx.fillStyle = rg;
    ctx.fillRect(x - gr, l.y - gr, gr * 2, gr * 2);
  }
  ctx.restore();
}

// Shafts of sunlight slanting down from the sun through the haze.
function drawSunShafts(ctx, map, vw) {
  const sx = map.sun.fx * vw - G.cam.x * 0.02, sy = map.sun.y;
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  for (let i = 0; i < 4; i++) {
    const a = 0.75 + i * 0.5 + Math.sin(RT * 0.05 + i) * 0.03, w = 0.12 + (i % 2) * 0.06;
    const len = HORIZON_Y * 1.8;
    const g = ctx.createLinearGradient(sx, sy, sx + Math.cos(a) * len, sy + Math.sin(a) * len);
    g.addColorStop(0, rgba(map.theme.sun, 0.03));
    g.addColorStop(0.15, rgba(map.theme.sun, 0.018));
    g.addColorStop(1, rgba(map.theme.sun, 0));
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.moveTo(sx, sy);
    ctx.lineTo(sx + Math.cos(a - w) * len, sy + Math.sin(a - w) * len);
    ctx.lineTo(sx + Math.cos(a + w) * len, sy + Math.sin(a + w) * len);
    ctx.closePath();
    ctx.fill();
  }
  ctx.restore();
}
