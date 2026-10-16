'use strict';
// Procedural map generation. Everything random about the layout and style
// comes from the seed, so the same seed always gives the same battlefield.

function layerY(pts, x) {
  for (let i = 0; i < pts.length - 1; i++) {
    if (pts[i + 1].x >= x) {
      const a = pts[i], b = pts[i + 1];
      return lerp(a.y, b.y, (x - a.x) / (b.x - a.x));
    }
  }
  return pts[pts.length - 1].y;
}

function genBranches(r, x, y, ang, len, depth, out) {
  const x2 = x + Math.cos(ang) * len, y2 = y + Math.sin(ang) * len;
  out.push([x, y, x2, y2, depth]);
  if (depth <= 0) return;
  const n = r.int(1, 3);
  for (let i = 0; i < n; i++) {
    genBranches(r, x2, y2, ang + r.range(-0.75, 0.75), len * r.range(0.55, 0.8), depth - 1, out);
  }
}

function rockPoly(r, cx, cy, rad, squash = 0.85) {
  const pts = [], nv = r.int(6, 8);
  for (let v = 0; v < nv; v++) {
    const a = (v / nv) * TAU + r.range(-0.2, 0.2);
    const rr = rad * r.range(0.75, 1.1);
    pts.push([cx + Math.cos(a) * rr, cy + Math.sin(a) * rr * squash]);
  }
  return pts;
}

function makeProp(r, kind, x, y, theme, front) {
  const p = { kind, x, y, s: r.range(0.7, 1.3), front, flip: r.chance(0.5) ? 1 : -1 };
  switch (kind) {
    case 'rock':
      p.poly = rockPoly(r, 0, -8 * p.s, r.range(8, 16) * p.s, 0.7);
      p.col = shade(theme.rock, r.range(-0.2, 0.1));
      p.edge = shade(theme.rock, -0.45);
      break;
    case 'deadtree':
      p.segs = [];
      genBranches(r, 0, 0, -Math.PI / 2 + r.range(-0.15, 0.15), r.range(28, 46), r.int(3, 4), p.segs);
      break;
    case 'tree':
      p.h = r.range(40, 70);
      p.blobs = [];
      for (let i = 0; i < r.int(3, 5); i++) p.blobs.push([r.range(-16, 16), -p.h + r.range(-12, 10), r.range(12, 20)]);
      break;
    case 'sword': p.tilt = r.range(-0.35, 0.35); break;
    case 'banner': p.tilt = r.range(-0.12, 0.12); p.col = r.pick(['#7a3b2e', '#40506a', '#5d5a2e', '#4d2f4f']); break;
    case 'ruin': p.h = r.range(30, 70); p.cut = r.range(-10, 10); break;
    case 'bush':
      p.blobs = [];
      for (let i = 0; i < r.int(3, 5); i++) p.blobs.push([r.range(-12, 12), r.range(-10, -4), r.range(6, 11)]);
      break;
  }
  return p;
}

function makeMine(r, x, y, theme, rich = 1, gold = null) {
  const size = r.range(24, 34) * (rich > 1 ? 1.25 : 1);
  const rocks = [];
  rocks.push({ cy: -size * 0.3, poly: rockPoly(r, 0, -size * 0.35, size * 0.75) });
  for (let i = 0, n = r.int(5, 8); i < n; i++) {
    const cx = r.range(-size, size) * 0.85;
    const cy = -r.range(0, size * 0.9) * (1 - (Math.abs(cx) / size) * 0.6);
    rocks.push({ cy, poly: rockPoly(r, cx, cy, (r.range(9, 16) * size) / 30) });
  }
  rocks.sort((a, b) => a.cy - b.cy);
  for (const rk of rocks) {
    const s = r.range(-0.18, 0.12);
    rk.col = shade(theme.rock, s);
    rk.edge = shade(theme.rock, -0.5);
    rk.hi = shade(theme.rock, 0.3);
  }
  const nuggets = [];
  for (let i = 0, n = r.int(7, 12); i < n; i++) {
    const nx = r.range(-size * 0.8, size * 0.8), ny = -r.range(4, size * 1.05), nr = r.range(2.5, 5.5);
    const pts = [], nv = r.int(4, 6), rot = r.range(0, TAU);
    for (let v = 0; v < nv; v++) {
      const a = rot + (v / nv) * TAU;
      pts.push([nx + Math.cos(a) * nr * r.range(0.8, 1.1), ny + Math.sin(a) * nr * r.range(0.8, 1.1)]);
    }
    nuggets.push({ x: nx, y: ny, pts });
  }
  gold = gold || Math.round(r.range(1600, 2400) * rich);
  return { x, y, size, rocks, nuggets, gold, max: gold, workers: [], rich, seed: r.range(0, 10) };
}

function genCracks(r) {
  const tiers = [[0, -20, 150], [-20, -48, 124], [-48, -64, 100]];
  const out = [];
  for (let i = 0; i < 14; i++) {
    const [y0, y1, w] = r.pick(tiers);
    let x = r.range(-w * 0.42, w * 0.42), y = r.range(y1 + 2, y0 - 2);
    const line = [[x, y]];
    for (let k = 0, n = r.int(2, 4); k < n; k++) {
      x += r.range(-9, 9);
      y = clamp(y + r.range(-4, 8), y1 + 1, y0 - 1);
      line.push([x, y]);
    }
    out.push(line);
  }
  return out;
}

// Desaturate/darken every color in a theme for a grittier look.
function gritTheme(t) {
  const out = {};
  for (const [k, v] of Object.entries(t)) {
    if (typeof v === 'string' && v[0] === '#') out[k] = grit(v);
    else if (Array.isArray(v)) out[k] = v.map(c => grit(c));
    else out[k] = v;
  }
  out.sun = grit(t.sun, 0.15, 0);
  return out;
}

function weightedPick(r, items) {
  let k = r.range(0, items.reduce((s, it) => s + it.weight, 0));
  for (const it of items) if ((k -= it.weight) < 0) return it;
  return items[items.length - 1];
}

// opts (from the skirmish setup): monolith 'off' | 'on' | 'random', gold 'scarce' | 'normal' | 'rich' | 'random'.
// 'random' is decided by the seed, so a seed always gives the same map for the same options.
function generateMap(seed, opts = {}) {
  const r = makeRng(seed);
  const theme = gritTheme(r.pick(THEMES));
  const map = { seed, theme, name: `${r.pick(MAP_PRE)} ${r.pick(MAP_SUF)}` };

  // Layout comes from its own stream so it doesn't disturb the scenery a seed produces.
  // The lane depth must be set first: the path, grass and walls are laid out from it.
  const lr = makeRng(seed * 31 + 7);
  map.lane = weightedPick(lr, LANE_DEPTHS);
  LANE_BOT = map.lane.bot;
  map.mineLayout = weightedPick(lr, Object.entries(MINE_LAYOUTS).map(([key, l]) => ({ key, ...l })));
  const rolledMonolith = lr.chance(SHRINE.chance);
  const monolith = opts.monolith === 'on' ? true : opts.monolith === 'off' ? false : rolledMonolith;
  map.shrine = monolith ? { x: WORLD_W / 2, y: LANE_TOP - 6, owner: -1, cap: 0, contest: false, pulse: 0 } : null;
  const rolledGold = weightedPick(lr, GOLD_LEVELS);
  map.goldLevel = GOLD_LEVELS.find(g => g.key === opts.gold) || rolledGold;
  map.weather = r.chance(0.7) ? theme.weather : 'none';
  map.sun = { fx: r.range(0.12, 0.88), y: r.range(70, 210), r: r.range(26, 58) };

  // Parallax hill layers: far, mid, near. Ridge style varies per map.
  const ridgeStyle = r.chance(0.5) ? 'peaks' : 'rolling';
  const pars = [0.12, 0.28, 0.5];
  map.layers = pars.map((par, i) => {
    const smooth = i === 0 ? ridgeStyle === 'rolling' : r.chance(0.7);
    const base = HORIZON_Y - [130, 78, 28][i];
    const amp = [110, 70, 40][i] * r.range(0.7, 1.35);
    const f1 = r.range(0.002, 0.005), f2 = r.range(0.007, 0.015);
    const p1 = r.range(0, TAU), p2 = r.range(0, TAU);
    const end = WORLD_W * par + 3400;
    const pts = [];
    for (let x = -500; x <= end; x += r.range(50, 130) * (smooth ? 1 : 1.7)) {
      const y = base - amp * (0.5 + 0.35 * Math.sin(x * f1 + p1) + 0.2 * Math.sin(x * f2 + p2)) + r.range(-1, 1) * amp * (smooth ? 0.1 : 0.25);
      pts.push({ x, y });
    }
    const deco = [];
    const kinds = ['pine', 'pine', 'deadtree', 'tower', 'windmill', 'pine', 'spire'];
    for (let k = 0, n = r.int(4, 16); k < n; k++) {
      const x = r.range(0, end);
      const d = { x, y: layerY(pts, x) + 4, kind: r.pick(kinds), s: r.range(0.6, 1.3) * (0.45 + i * 0.3) };
      if (d.kind === 'deadtree') { d.segs = []; genBranches(r, 0, 0, -Math.PI / 2, 30, 3, d.segs); }
      deco.push(d);
    }
    return { par, smooth, pts, deco, color: theme.hills[i] };
  });

  map.clouds = [];
  for (let i = 0, n = r.int(5, 12); i < n; i++) {
    const c = { x: r.range(0, 3200), y: r.range(40, 230), s: r.range(0.6, 1.5), spd: r.range(3, 12), puffs: [] };
    for (let k = 0, m = r.int(3, 6); k < m; k++) c.puffs.push({ dx: r.range(-50, 50), dy: r.range(-12, 6), r: r.range(16, 34) });
    map.clouds.push(c);
  }

  map.edge = [];
  for (let x = -100; x <= WORLD_W + 100; x += 40) map.edge.push({ x, y: HORIZON_Y + r.range(-5, 4) });
  map.pathEdge = [];
  for (let x = -100; x <= WORLD_W + 100; x += 50) map.pathEdge.push({ x, t: LANE_TOP - 10 + r.range(-4, 4), b: LANE_BOT + 12 + r.range(-6, 6) });

  map.tufts = [];
  for (let x = 0; x < WORLD_W; x += r.range(8, 28)) {
    const y = r.chance(0.55) ? r.range(HORIZON_Y + 6, LANE_TOP - 12) : r.range(LANE_BOT + 14, VIEW_H);
    map.tufts.push({ x, y, h: r.range(4, 11) * (y > LANE_BOT ? 1.3 : 1), lean: r.range(-3, 3) });
  }
  map.pebbles = [];
  for (let x = 0; x < WORLD_W; x += r.range(14, 40)) {
    map.pebbles.push({ x, y: r.range(HORIZON_Y + 10, VIEW_H), rx: r.range(1.5, 4), col: shade(theme.rock, r.range(-0.3, 0.1)) });
  }

  // Scenery props. Big ones stay out of the castle/statue areas.
  map.props = [];
  const backKinds = ['rock', 'rock', 'deadtree', 'tree', 'bones', 'sword', 'grave', 'ruin', 'bush', 'banner', 'skull'];
  for (let x = 950; x < WORLD_W - 950; x += r.range(70, 230)) {
    map.props.push(makeProp(r, r.pick(backKinds), x, r.range(HORIZON_Y + 14, LANE_TOP - 8), theme, false));
  }
  for (let x = 620; x < WORLD_W - 620; x += r.range(160, 420)) {
    map.props.push(makeProp(r, r.pick(['rock', 'bush', 'skull', 'rock', 'sword']), x, r.range(LANE_BOT + 24, VIEW_H - 8), theme, true));
  }
  map.props.sort((a, b) => a.y - b.y);

  // Gold mines: the layout sets how many, how far out and how rich. Both sides get the same
  // distances (mirrored) so neither is favoured; only the rocks' shapes differ.
  map.mines = [];
  const ml = map.mineLayout, spots = [];
  let mx = lr.range(...ml.first);
  for (let i = 0, n = lr.int(...ml.n); i < n; i++) {
    spots.push([mx, lr.range(LANE_TOP + 12, LANE_BOT - 22), Math.round(lr.range(1600, 2400) * ml.rich * map.goldLevel.mul)]);
    mx += lr.range(...ml.gap);
    if (mx > WORLD_W / 2 - 260) break;
  }
  for (const team of [0, 1]) {
    for (const [x, y, gold] of spots) map.mines.push(makeMine(r, team === 0 ? x : WORLD_W - x, y, theme, ml.rich, gold));
  }
  // a rich vein in the middle (the Monolith takes that spot when there is one)
  if (!map.shrine && lr.chance(ml.center)) map.mines.push(makeMine(r, WORLD_W / 2 + lr.range(-120, 120), lr.range(LANE_TOP + 15, LANE_BOT - 20), theme, 1.6 * Math.max(1, ml.rich), Math.round(lr.range(1600, 2400) * 1.6 * Math.max(1, ml.rich) * map.goldLevel.mul)));

  // distant smoke from old battles, drawn on the mid hill layer
  map.smoke = [];
  for (let i = 0, n = r.int(1, 3); i < n; i++) map.smoke.push({ x: r.range(300, WORLD_W * 0.28 + 1200), s: r.range(0.7, 1.3), seed: r.range(0, 10) });
  // cart ruts along the battle path
  map.ruts = [];
  for (let x = 0; x < WORLD_W; x += r.range(120, 300)) {
    map.ruts.push({ x, len: r.range(80, 260), y: r.range(LANE_TOP + 5, LANE_BOT + 5), a: r.range(0.06, 0.16) });
  }

  map.castles = [0, 1].map(() => {
    return {
      towerH: r.range(105, 140),
      roof: r.pick(['spire', 'flat', 'dome']),
      banner: r.pick(['stripe', 'chevron', 'emblem', 'plain']),
      torches: true,   // the lighting relies on them
      stone: shade(theme.rock, r.range(-0.12, 0.15)),
    };
  });
  map.statues = [0, 1].map(() => ({ pose: r.pick(['sword', 'spear', 'crown', 'fist']), cracks: genCracks(r) }));
  return map;
}
