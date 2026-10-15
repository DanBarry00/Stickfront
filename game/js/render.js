'use strict';
// Draws one frame of the world. Screen-space layers first, then world-space.

function drawSky(ctx, map, vw) {
  const th = map.theme;
  const g = ctx.createLinearGradient(0, 0, 0, HORIZON_Y + 40);
  g.addColorStop(0, th.sky[0]);
  g.addColorStop(1, th.sky[1]);
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, vw, VIEW_H);
  const sx = map.sun.fx * vw - G.cam.x * 0.02, sy = map.sun.y, r = map.sun.r;
  const glow = ctx.createRadialGradient(sx, sy, r * 0.5, sx, sy, r * 4);
  glow.addColorStop(0, rgba(th.sun, 0.4));
  glow.addColorStop(1, rgba(th.sun, 0));
  ctx.fillStyle = glow;
  ctx.fillRect(sx - r * 4, sy - r * 4, r * 8, r * 8);
  ctx.fillStyle = th.sun;
  ctx.globalAlpha = 0.9;
  ctx.beginPath();
  ctx.arc(sx, sy, r, 0, TAU);
  ctx.fill();
  ctx.globalAlpha = 1;
}

function drawClouds(ctx, map, vw) {
  const span = vw + 700;
  ctx.fillStyle = rgba(map.theme.cloud, 0.42);
  for (const c of map.clouds) {
    const x = (((c.x - G.cam.x * 0.06 + RT * c.spd) % span) + span) % span - 350;
    ctx.beginPath();
    for (const p of c.puffs) {
      const px = x + p.dx * c.s, py = c.y + p.dy * c.s, pr = p.r * c.s;
      ctx.moveTo(px + pr, py);
      ctx.arc(px, py, pr, 0, TAU);
    }
    ctx.fill();
  }
}

function drawHills(ctx, layer, vw) {
  const off = G.cam.x * layer.par, pts = layer.pts;
  let i0 = 0;
  while (i0 < pts.length - 2 && pts[i0 + 1].x - off < -60) i0++;
  let i1 = i0;
  while (i1 < pts.length - 1 && pts[i1].x - off < vw + 60) i1++;
  ctx.fillStyle = layer.color;
  ctx.beginPath();
  ctx.moveTo(pts[i0].x - off, VIEW_H);
  ctx.lineTo(pts[i0].x - off, pts[i0].y);
  for (let i = i0; i < i1; i++) {
    const a = pts[i], b = pts[i + 1];
    if (layer.smooth) ctx.quadraticCurveTo(a.x - off, a.y, (a.x + b.x) / 2 - off, (a.y + b.y) / 2);
    else ctx.lineTo(b.x - off, b.y);
  }
  ctx.lineTo(pts[i1].x - off, pts[i1].y);
  ctx.lineTo(pts[i1].x - off, VIEW_H);
  ctx.closePath();
  ctx.fill();
  const dc = shade(layer.color, -0.06);
  for (const d of layer.deco) {
    const x = d.x - off;
    if (x > -100 && x < vw + 100) drawHillDeco(ctx, d, x, dc);
  }
}

// Smoke rising from distant fires, on the mid hill layer.
function drawSmoke(ctx, map, vw) {
  const off = G.cam.x * map.layers[1].par;
  for (const s of map.smoke) {
    const x = s.x - off;
    if (x < -200 || x > vw + 200) continue;
    const base = layerY(map.layers[1].pts, s.x);
    for (let i = 0; i < 12; i++) {
      const k = ((RT * 0.05 + i / 12 + s.seed) % 1);
      const px = x + Math.sin(k * 5 + s.seed) * 10 + k * 70 * s.s;
      const py = base - k * 220 * s.s;
      const r = (6 + k * 34) * s.s;
      ctx.fillStyle = `rgba(30,26,24,${0.3 * (1 - k)})`;
      ctx.beginPath();
      ctx.arc(px, py, r, 0, TAU);
      ctx.fill();
    }
  }
}

function drawHaze(ctx, map, vw, top, alpha) {
  const g = ctx.createLinearGradient(0, top, 0, HORIZON_Y + 10);
  g.addColorStop(0, rgba(map.theme.haze, 0));
  g.addColorStop(1, rgba(map.theme.haze, alpha));
  ctx.fillStyle = g;
  ctx.fillRect(0, top, vw, HORIZON_Y + 10 - top);
}

function drawGround(ctx, map, x0, x1) {
  const th = map.theme;
  const g = ctx.createLinearGradient(0, HORIZON_Y, 0, VIEW_H);
  g.addColorStop(0, th.ground[0]);
  g.addColorStop(1, th.ground[1]);
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.moveTo(x0 - 60, VIEW_H);
  for (const p of map.edge) if (p.x >= x0 - 80 && p.x <= x1 + 80) ctx.lineTo(p.x, p.y);
  ctx.lineTo(x1 + 60, VIEW_H);
  ctx.closePath();
  ctx.fill();
  ctx.save();
  ctx.clip();
  ctx.fillStyle = texPattern(ctx, 'speck');
  ctx.fillRect(x0 - 60, HORIZON_Y - 10, x1 - x0 + 120, VIEW_H - HORIZON_Y + 10);
  ctx.restore();
  ctx.strokeStyle = rgba(shade(th.ground[0], 0.2), 0.5);
  ctx.lineWidth = 2;
  ctx.beginPath();
  let first = true;
  for (const p of map.edge) {
    if (p.x < x0 - 80 || p.x > x1 + 80) continue;
    if (first) { ctx.moveTo(p.x, p.y); first = false; } else ctx.lineTo(p.x, p.y);
  }
  ctx.stroke();

  // trampled battle path
  const vis = map.pathEdge.filter(p => p.x >= x0 - 100 && p.x <= x1 + 100);
  if (vis.length > 1) {
    ctx.fillStyle = rgba(th.path, 0.35);
    ctx.beginPath();
    ctx.moveTo(vis[0].x, vis[0].t);
    for (const p of vis) ctx.lineTo(p.x, p.t);
    for (let i = vis.length - 1; i >= 0; i--) ctx.lineTo(vis[i].x, vis[i].b);
    ctx.closePath();
    ctx.fill();
  }
  ctx.strokeStyle = 'rgba(0,0,0,0.13)';
  ctx.lineWidth = 2.5;
  ctx.beginPath();
  for (const r of map.ruts) {
    if (r.x + r.len < x0 || r.x > x1) continue;
    ctx.moveTo(r.x, r.y);
    ctx.quadraticCurveTo(r.x + r.len / 2, r.y + 3, r.x + r.len, r.y + 1);
    ctx.moveTo(r.x + 6, r.y + 9);
    ctx.quadraticCurveTo(r.x + r.len / 2, r.y + 12, r.x + r.len - 4, r.y + 10);
  }
  ctx.stroke();

  for (const p of map.pebbles) {
    if (p.x < x0 - 10 || p.x > x1 + 10) continue;
    ctx.fillStyle = p.col;
    ellipse(ctx, p.x, p.y, p.rx, p.rx * 0.6);
    ctx.fill();
  }
  ctx.strokeStyle = th.grass;
  ctx.lineWidth = 1.3;
  ctx.lineCap = 'round';
  ctx.beginPath();
  for (const t of map.tufts) {
    if (t.x < x0 - 10 || t.x > x1 + 10) continue;
    for (let k = -1; k <= 1; k++) {
      ctx.moveTo(t.x + k * 2, t.y);
      ctx.lineTo(t.x + k * 3 + t.lean, t.y - t.h * (k ? 0.75 : 1));
    }
  }
  ctx.stroke();
}

function drawDecals(ctx, x0, x1) {
  for (const d of G.decals) {
    if (d.x < x0 - 20 || d.x > x1 + 20) continue;
    ctx.save();
    ctx.translate(d.x, d.y);
    ctx.rotate(d.rot * 0.2);
    ctx.fillStyle = `rgba(58,8,6,${Math.min(0.6, d.a)})`;
    ellipse(ctx, 0, 0, d.r * 1.6, d.r * d.sq * 1.6);
    ctx.fill();
    ctx.restore();
  }
}

// Units standing on a wall are drawn lifted onto its top.
function drawUnit(ctx, u) {
  const lift = u.onWall && !u.dead ? wallHeight(u.onWall) : 0;
  if (!lift) return drawUnitBody(ctx, u);
  ctx.save();
  ctx.translate(0, -lift);
  drawUnitBody(ctx, u);
  ctx.restore();
}

function drawUnitBody(ctx, u) {
  const dying = u.dead;
  const fall = dying ? Math.min(1, u.deathT / 0.35) : 0;
  const alpha = dying ? clamp(1 - (u.deathT - 6) / 3, 0, 1) : 1;
  ctx.fillStyle = `rgba(0,0,0,${0.28 * alpha})`;
  ellipse(ctx, u.x, u.y + 1, 12 * u.scale, 3.5);
  ctx.fill();
  if (u.selected) {
    ctx.strokeStyle = 'rgba(150,230,120,0.9)';
    ctx.lineWidth = 1.8;
    ellipse(ctx, u.x, u.y + 1, 16 * u.scale, 5.5);
    ctx.stroke();
  }
  if (!dying) drawBuffsUnder(ctx, u);
  const leapLift = !dying && u.leapSwing && u.swing >= 0 && u.swing < 0.6 ? Math.sin((u.swing / 0.6) * Math.PI) * 16 : 0;
  const jumpLift = !dying && u.jumpT > 0 ? Math.sin((1 - u.jumpT / 0.5) * Math.PI) * 26 : 0;   // leaping out over the spear line
  const dropLift = !dying && u.dropT > 0 ? (u.dropT / 0.5) ** 2 * (LANE_TOP - WALL_TOP) : 0;    // ninja dropping off the rampart
  const lift = Math.max(leapLift, jumpLift, dropLift);
  // flyers: everything from here on (body, buffs, health bar) is drawn up in the air
  const alt = dying ? u.alt * Math.max(0, 1 - u.deathT / 0.6) : u.alt;
  ctx.save();
  if (alt) ctx.translate(0, -alt);
  drawUnitInAir(ctx, u, dying, fall, alpha, lift);
  ctx.restore();
}

function drawUnitInAir(ctx, u, dying, fall, alpha, lift) {
  // a vanished ninja is a faint shimmer (your own are a little easier to see)
  if (u.stealth && !dying) alpha *= u.team === 0 ? 0.35 : 0.18;
  drawStickman(ctx, {
    x: u.x, y: u.y, facing: u.facing, scale: u.scale, team: u.team, type: u.type,
    walk: u.walk, moving: u.moving && !dying, swing: dying ? -1 : u.swing, carry: u.carry, carryCap: u.carryCap,
    gear: u.gear, flash: u.flash, seed: u.seed, fall, alpha, perks: u.perks, lift,
    pray: u.praying && !dying ? u.pray % 1 : -1, rage: dying ? 0 : rageOf(u), panning: u.panning && !dying,
    flash: u.lastStand > 0 ? (Math.sin(RT * 30) > 0 ? 1 : 0) : u.flash,
    wall: u.shieldWall, arch: u.type === 'archer' ? archPose(u, dying) : null, cast: u.swingKind === 'cast',
    chains: isGiant(u) ? giantChains(u) : 0, stone: u.isStatueGiant ? G.teams[u.team].statue.stone : null,
    starRanged: u.starRanged, grounded: u.grounded, aimFa: u.aimFa, pace: u.pace, salting: u.salting, javelin: !!(u.perks.javelin && u.javelin),
  });
  if (dying) return;
  drawBuffsOver(ctx, u);
  const barY = u.y - 82 * u.scale;
  if (u.selected || u.showHp > 0 || u.hp < u.maxHp) {
    const w = 26, f = u.hp / u.maxHp;
    ctx.fillStyle = 'rgba(0,0,0,0.65)';
    ctx.fillRect(u.x - w / 2 - 1, barY - 1, w + 2, 5);
    ctx.fillStyle = f > 0.5 ? '#6aa84f' : f > 0.25 ? '#c9a23a' : '#b5402f';
    ctx.fillRect(u.x - w / 2, barY, w * f, 3);
  }
  if (u.refitting) {
    const w = 26;
    ctx.fillStyle = 'rgba(0,0,0,0.65)';
    ctx.fillRect(u.x - w / 2 - 1, barY - 8, w + 2, 5);
    ctx.fillStyle = '#a7c98a';
    ctx.fillRect(u.x - w / 2, barY - 7, w * Math.min(1, u.refitT / REFIT_TIME), 3);
  }
}

// Map an archer's shot (swing 0..1) onto nock → draw → aim → release.
function archPose(u, dying) {
  const s = dying ? -1 : u.swing, fa = u.aimFa;
  if (s < 0) return { phase: 'idle', k: 0, fa };
  if (s < 0.25) return { phase: 'nock', k: s / 0.25, fa };
  if (s < 0.6) return { phase: 'draw', k: (s - 0.25) / 0.35, fa };
  if (s < 0.8) return { phase: 'aim', k: (s - 0.6) / 0.2, fa };
  return { phase: 'release', k: (s - 0.8) / 0.2, fa };
}

// Ground-level buff markers: drill ring (sword military training), inspiration glow, taunt ring.
function drawBuffsUnder(ctx, u) {
  drawSpellEffectsUnder(ctx, u);
  const s = u.scale;
  if (u.drillN > 0) {
    ctx.strokeStyle = `rgba(150,175,205,${0.25 + 0.1 * u.drillN})`;
    ctx.lineWidth = 1 + u.drillN * 0.5;
    ellipse(ctx, u.x, u.y + 1, 19 * s, 6.5);
    ctx.stroke();
  }
  if (u.insp > 0) {
    const g = ctx.createRadialGradient(u.x, u.y - 34 * s, 2, u.x, u.y - 34 * s, 30 * s);
    g.addColorStop(0, `rgba(226,186,80,${0.1 * u.insp})`);
    g.addColorStop(1, 'rgba(226,186,80,0)');
    ctx.fillStyle = g;
    ctx.fillRect(u.x - 30 * s, u.y - 64 * s, 60 * s, 60 * s);
  }
  if (u.shieldWall) {
    const p = 0.5 + 0.5 * Math.sin(RT * 4 + u.seed);
    ctx.strokeStyle = `rgba(200,70,50,${0.35 + 0.3 * p})`;
    ctx.lineWidth = 1.6;
    ellipse(ctx, u.x, u.y + 1, (22 + p * 4) * s, 7 + p);
    ctx.stroke();
  }
}

// Overhead buff markers: gold chevrons per inspiration stack, steel pips per drilled ally.
function drawBuffsOver(ctx, u) {
  drawStatusOver(ctx, u);
  drawSpellEffectsOver(ctx, u);
  const top = u.y - 92 * u.scale;
  if (u.burnT > 0) {
    // licking flames on a burning unit
    for (let i = 0; i < 3; i++) {
      const fx = u.x + (i - 1) * 5, fy = u.y - 30 - i * 8, fl = 4 + Math.sin(RT * 20 + i * 2 + u.seed) * 1.5;
      ctx.fillStyle = i === 1 ? 'rgba(255,200,90,0.8)' : 'rgba(255,120,30,0.7)';
      ellipse(ctx, fx, fy, fl * 0.6, fl);
      ctx.fill();
    }
  }
  if (u.lastStand > 0) {
    ctx.fillStyle = '#e0503a';
    ctx.font = '700 11px "Segoe UI", sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(u.lastStand.toFixed(1), u.x, top - 6);
  }
  if (u.insp > 0) {
    ctx.strokeStyle = '#e2c25a';
    ctx.lineWidth = 1.8;
    ctx.beginPath();
    for (let i = 0; i < u.insp; i++) {
      const y = top - i * 4;
      ctx.moveTo(u.x - 5, y + 3);
      ctx.lineTo(u.x, y);
      ctx.lineTo(u.x + 5, y + 3);
    }
    ctx.stroke();
  }
  if (u.drillN > 0) {
    ctx.fillStyle = '#9fb4cc';
    for (let i = 0; i < u.drillN; i++) ctx.fillRect(u.x - 11 + i * 5, top + 7, 3, 2);
  }
}

function drawDefendFlag(ctx, team) {
  if (team.musterX === null) return;
  const x = team.musterX, y = LANE_TOP - 6, st = TEAM_STYLE[team.id];
  ctx.strokeStyle = '#2a1e14';
  ctx.lineWidth = 2.5;
  ctx.beginPath();
  ctx.moveTo(x, y);
  ctx.lineTo(x, y - 62);
  ctx.stroke();
  const w = Math.sin(RT * 3) * 3;
  ctx.fillStyle = shade(st.accent, -0.2);
  ctx.beginPath();
  ctx.moveTo(x, y - 60);
  ctx.quadraticCurveTo(x + 12 * team.dir, y - 58 + w, x + 24 * team.dir, y - 54 + w);
  ctx.lineTo(x + 14 * team.dir, y - 48);
  ctx.lineTo(x + 22 * team.dir, y - 40 + w);
  ctx.quadraticCurveTo(x + 10 * team.dir, y - 42, x, y - 42);
  ctx.closePath();
  ctx.fill();
  if (team.stance === 'defend') {
    ctx.strokeStyle = rgba(st.accent, 0.18);
    ctx.setLineDash([6, 8]);
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(x, LANE_TOP);
    ctx.lineTo(x, LANE_BOT + 8);
    ctx.stroke();
    ctx.setLineDash([]);
  }
}

// The Shrine: a stone obelisk whose crystal takes the colour of whoever holds it, with a ring
// on the ground showing the capture area and a bar showing which way it is leaning.
function drawShrine(ctx, s) {
  const x = s.x, base = s.y, th = G.map.theme;
  const col = s.owner < 0 ? '#cfc6b0' : TEAM_STYLE[s.owner].crystal;
  const lean = s.cap > 0 ? TEAM_STYLE[0].ui : TEAM_STYLE[1].ui;
  // capture area
  ctx.strokeStyle = s.contest ? 'rgba(230,120,80,0.35)' : rgba(s.owner < 0 ? '#cfc6b0' : col, 0.18);
  ctx.setLineDash([10, 10]);
  ctx.lineWidth = 2;
  ellipse(ctx, x, (LANE_TOP + LANE_BOT) / 2, SHRINE.radius, (LANE_BOT - LANE_TOP) / 2 + 10);
  ctx.stroke();
  ctx.setLineDash([]);
  // plinth and obelisk
  const stone = shade(th.rock, -0.05), dark = shade(th.rock, -0.45);
  ctx.fillStyle = dark;
  ctx.fillRect(x - 30, base - 12, 60, 14);
  ctx.fillStyle = stone;
  ctx.fillRect(x - 26, base - 18, 52, 8);
  ctx.beginPath();
  ctx.moveTo(x - 14, base - 18);
  ctx.lineTo(x - 9, base - 120);
  ctx.lineTo(x + 9, base - 120);
  ctx.lineTo(x + 14, base - 18);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = dark;
  ctx.lineWidth = 1.5;
  ctx.stroke();
  for (let i = 0; i < 4; i++) {   // carved runes
    ctx.fillStyle = rgba(col, 0.35 + 0.25 * Math.sin(RT * 2 + i));
    ctx.fillRect(x - 3, base - 40 - i * 18, 6, 8);
  }
  // floating crystal
  const cy = base - 140 + Math.sin(RT * 1.6) * 4, glow = 0.35 + 0.2 * Math.sin(RT * 3) + s.pulse * 0.6;
  const g = ctx.createRadialGradient(x, cy, 2, x, cy, 40);
  g.addColorStop(0, rgba(col, Math.min(0.9, glow)));
  g.addColorStop(1, rgba(col, 0));
  ctx.fillStyle = g;
  ctx.fillRect(x - 40, cy - 40, 80, 80);
  ctx.fillStyle = col;
  ctx.beginPath();
  ctx.moveTo(x, cy - 14);
  ctx.lineTo(x + 8, cy);
  ctx.lineTo(x, cy + 14);
  ctx.lineTo(x - 8, cy);
  ctx.closePath();
  ctx.fill();
  // allegiance bar: fills toward the side it leans to
  if ((s.cap !== 0 && Math.abs(s.cap) < 1) || s.contest) {
    const w = 80, y = base - 170;
    ctx.fillStyle = 'rgba(0,0,0,0.65)';
    ctx.fillRect(x - w / 2 - 2, y - 2, w + 4, 8);
    ctx.fillStyle = lean;
    const f = Math.abs(s.cap) * (w / 2);
    ctx.fillRect(s.cap > 0 ? x - f : x, y, f, 4);
    ctx.fillStyle = '#e6d6aa';
    ctx.fillRect(x - 0.5, y - 2, 1, 8);
  }
}

function drawStatueBar(ctx, s) {
  if (s.dead || s.hp >= s.max) return;
  const w = 120, y = LANE_TOP - 300, f = s.hp / s.max;
  ctx.fillStyle = 'rgba(0,0,0,0.65)';
  ctx.fillRect(s.x - w / 2 - 2, y - 2, w + 4, 9);
  ctx.fillStyle = s.team === 0 ? '#b8932a' : '#a3382a';
  ctx.fillRect(s.x - w / 2, y, w * f, 5);
}

function drawParticles(ctx) {
  for (const p of G.particles) {
    const a = clamp(p.life / p.max, 0, 1);
    if (p.kind === 'dot') {
      ctx.fillStyle = p.color;
      ctx.globalAlpha = a;
      ctx.fillRect(p.x - p.size / 2, p.y - p.size / 2, p.size, p.size);
    } else if (p.kind === 'spark') {
      ctx.globalAlpha = a;
      ctx.fillStyle = p.color;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size, 0, TAU);
      ctx.fill();
    } else if (p.kind === 'stuck') {
      ctx.globalAlpha = Math.min(1, p.life);
      ctx.strokeStyle = '#3a2a1a';
      ctx.lineWidth = 1.6;
      ctx.beginPath();
      ctx.moveTo(p.x, p.y);
      ctx.lineTo(p.x - Math.cos(p.ang) * 14, p.y - Math.sin(p.ang) * 14);
      ctx.stroke();
    } else if (p.kind === 'text') {
      ctx.globalAlpha = a;
      ctx.font = '600 14px "Segoe UI", sans-serif';
      ctx.textAlign = 'center';
      ctx.lineWidth = 3;
      ctx.strokeStyle = 'rgba(0,0,0,0.75)';
      ctx.strokeText(p.text, p.x, p.y);
      ctx.fillStyle = p.color;
      ctx.fillText(p.text, p.x, p.y);
    }
  }
  ctx.globalAlpha = 1;
}

function drawProjectiles(ctx) {
  ctx.lineCap = 'round';
  for (const p of G.projectiles) {
    const a = Math.atan2(p.vy, p.vx), c = Math.cos(a), s = Math.sin(a);
    if (p.kind === 'star') { drawStar(ctx, p.x, p.y, 4, p.t * 25); continue; }
    if (p.kind === 'pot') {
      ctx.fillStyle = '#7a4a2a';
      ctx.beginPath();
      ctx.arc(p.x, p.y, 4, 0, TAU);
      ctx.fill();
      ctx.fillStyle = Math.sin(RT * 30) > 0 ? '#ffd25a' : '#ff8a2e';
      ctx.beginPath();
      ctx.arc(p.x + 2, p.y - 4, 1.8, 0, TAU);
      ctx.fill();
      if (chance(0.5)) G.particles.push({ kind: 'spark', x: p.x, y: p.y - 4, vx: rnd(-8, 8), vy: rnd(-20, -5), life: 0.3, max: 0.3, color: '#ff9a2e', size: 1.4 });
      continue;
    }
    if (p.kind === 'stone') {
      ctx.fillStyle = '#7d7870';
      ctx.beginPath();
      ctx.arc(p.x, p.y, 2.6, 0, TAU);
      ctx.fill();
      continue;
    }
    if (p.kind === 'ballista') {
      // a heavy siege bolt with leather fletching
      ctx.strokeStyle = '#3a2a1a';
      ctx.lineWidth = 3.4;
      ctx.beginPath();
      ctx.moveTo(p.x, p.y);
      ctx.lineTo(p.x - c * 26, p.y - s * 26);
      ctx.stroke();
      ctx.strokeStyle = '#8a6a44';
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.moveTo(p.x - c * 20, p.y - s * 20);
      ctx.lineTo(p.x - c * 26, p.y - s * 26);
      ctx.stroke();
      ctx.fillStyle = '#9aa0a6';
      ctx.beginPath();
      ctx.moveTo(p.x + c * 6, p.y + s * 6);
      ctx.lineTo(p.x - s * 3.5, p.y + c * 3.5);
      ctx.lineTo(p.x + s * 3.5, p.y - c * 3.5);
      ctx.closePath();
      ctx.fill();
      continue;
    }
    if (p.kind === 'javelin') {
      // a long throwing spear
      ctx.strokeStyle = '#6a4a2a';
      ctx.lineWidth = 2.2;
      ctx.beginPath();
      ctx.moveTo(p.x, p.y);
      ctx.lineTo(p.x - c * 28, p.y - s * 28);
      ctx.stroke();
      ctx.fillStyle = '#a9b0b6';
      ctx.beginPath();
      ctx.moveTo(p.x + c * 5, p.y + s * 5);
      ctx.lineTo(p.x - s * 2.5, p.y + c * 2.5);
      ctx.lineTo(p.x + s * 2.5, p.y - c * 2.5);
      ctx.closePath();
      ctx.fill();
      continue;
    }
    if (p.kind === 'bolt') {
      // a short, heavy crossbow bolt
      ctx.strokeStyle = '#3a2a1a';
      ctx.lineWidth = 2.4;
      ctx.beginPath();
      ctx.moveTo(p.x, p.y);
      ctx.lineTo(p.x - c * 12, p.y - s * 12);
      ctx.stroke();
      ctx.fillStyle = '#9aa0a6';
      ctx.beginPath();
      ctx.arc(p.x, p.y, 1.6, 0, TAU);
      ctx.fill();
      continue;
    }
    ctx.strokeStyle = '#2b1d10';
    ctx.lineWidth = 1.8;
    ctx.beginPath();
    ctx.moveTo(p.x, p.y);
    ctx.lineTo(p.x - c * 20, p.y - s * 20);
    ctx.stroke();
    ctx.strokeStyle = '#b8ad96';
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.moveTo(p.x - c * 16, p.y - s * 16);
    ctx.lineTo(p.x - c * 20, p.y - s * 20);
    ctx.stroke();
    if (p.fire) {
      // a ball of flame at the head and a short smoky trail
      ctx.fillStyle = 'rgba(255,140,40,0.35)';
      ctx.beginPath();
      ctx.arc(p.x - c * 2, p.y - s * 2, 6, 0, TAU);
      ctx.fill();
      ctx.fillStyle = '#ffb347';
      ctx.beginPath();
      ctx.arc(p.x - c * 2, p.y - s * 2, 2.6, 0, TAU);
      ctx.fill();
      if (chance(0.4)) G.particles.push({ kind: 'spark', x: p.x, y: p.y, vx: rnd(-10, 10), vy: rnd(-20, 0), life: 0.4, max: 0.4, color: pick(['#ff9a2e', '#7a6a5a']), size: 1.5 });
    }
  }
}

function drawWeather(ctx) {
  const kind = G.map.weather;
  if (kind === 'none') return;
  for (const w of G.weather) {
    if (kind === 'snow') {
      ctx.fillStyle = 'rgba(235,238,240,0.8)';
      ctx.beginPath();
      ctx.arc(w.x, w.y, 1.6 * w.s, 0, TAU);
      ctx.fill();
    } else if (kind === 'embers') {
      ctx.fillStyle = `rgba(255,${120 + Math.floor(60 * Math.sin(w.ph * 3))},50,${0.45 + 0.4 * Math.sin(w.ph * 4)})`;
      ctx.fillRect(w.x, w.y, 2 * w.s, 2 * w.s);
    } else if (kind === 'dust') {
      ctx.fillStyle = 'rgba(210,190,150,0.3)';
      ctx.fillRect(w.x, w.y, 3 * w.s, 1.2);
    } else if (kind === 'leaves') {
      ctx.save();
      ctx.translate(w.x, w.y);
      ctx.rotate(w.ph * 2);
      ctx.fillStyle = shade(G.map.theme.grass, -0.15);
      ellipse(ctx, 0, 0, 3.5 * w.s, 1.6 * w.s);
      ctx.fill();
      ctx.restore();
    }
  }
}

function drawPlacing(ctx) {
  const me = G.teams[0], [x, y] = UI.mouseWorld;
  ctx.font = '600 13px "Segoe UI", sans-serif';
  ctx.textAlign = 'center';
  if (UI.placing === 'wall') return drawWallGhost(ctx);
  if (UI.placing.startsWith('spell:')) return drawSpellTarget(ctx, UI.placing.slice(6), x, y);
  if (UI.placing === 'flag') {
    const fx = musterClamp(me, x);
    ctx.globalAlpha = 0.6;
    drawDefendFlag(ctx, { musterX: fx, dir: 1, id: 0, stance: '' });
    ctx.globalAlpha = 1;
    ctx.fillStyle = '#e6d6aa';
    ctx.fillText('Set muster point — new troops gather here', fx, LANE_TOP - 80);
  } else if (UI.placing === 'reinforce') {
    const w = wallAt(x, y);
    const ok = w && w.team === 0 && w.progress >= 1 && w.tier !== 2;
    ctx.fillStyle = ok ? '#d8f0c8' : '#9c8f76';
    ctx.fillText(ok ? `Raise a palisade here (${w.reinforcing ? 'resume' : WALL_COST + ' gold'})` : 'Click one of your finished trenches', x, y - 24);
  } else if (UI.placing === 'salt') {
    const m = mineAt(x, y, false);
    ctx.fillStyle = m ? '#f0eee8' : '#9c8f76';
    ctx.fillText(m ? 'Salt this deposit' : 'Click a gold deposit to salt', x, y - 24);
  } else if (UI.placing === 'replenish') {
    const m = mineAt(x, y, true);
    ctx.fillStyle = m ? '#e0bf5a' : '#9c8f76';
    ctx.fillText(m ? `Replenish (${Math.ceil(m.gold)}/${m.max})` : 'Click a gold deposit to replenish', x, y - 24);
  }
}

function drawWallGhost(ctx) {
  const me = G.teams[0], x = UI.mouseWorld[0];
  const ok = wallSpotOk(me, x) && me.gold >= WALL_COST;
  ctx.globalAlpha = 0.45;
  for (let k = 0; k < WALL_SEGS; k++) {
    const y = wallSegY(k), wx = x + (k - (WALL_SEGS - 1) / 2) * -5;
    ctx.fillStyle = ok ? '#8fbf6a' : '#b5402f';
    ctx.beginPath(); ctx.moveTo(wx - 36, y); ctx.lineTo(wx - 10, y - WALL_H[0]); ctx.lineTo(wx + 3, y - WALL_H[0]); ctx.lineTo(wx + 12, y); ctx.closePath(); ctx.fill();
    ctx.fillRect(wx + 12, y - 2, 19, 5);
  }
  ctx.globalAlpha = 1;
  ctx.font = '600 13px "Segoe UI", sans-serif';
  ctx.textAlign = 'center';
  ctx.fillStyle = ok ? '#d8f0c8' : '#ffb3a8';
  ctx.fillText(ok ? `Dig a trench here (${WALL_COST} gold)` : me.gold < WALL_COST ? 'Not enough gold' : 'Cannot dig here', x, LANE_TOP - 80);
}

function render(ctx) {
  const map = G.map, vw = VIEW.w, camX = G.cam.x;
  const sc = VIEW.cssScale * VIEW.dpr;
  ctx.setTransform(sc, 0, 0, sc, 0, 0);

  drawSky(ctx, map, vw);
  drawClouds(ctx, map, vw);
  drawHills(ctx, map.layers[0], vw);
  drawHaze(ctx, map, vw, HORIZON_Y - 200, 0.45);
  drawSmoke(ctx, map, vw);
  drawHills(ctx, map.layers[1], vw);
  drawHaze(ctx, map, vw, HORIZON_Y - 120, 0.25);
  drawHills(ctx, map.layers[2], vw);

  ctx.save();
  ctx.translate(-camX, 0);
  const x0 = camX, x1 = camX + vw;
  const inView = (x, pad = 150) => x > x0 - pad && x < x1 + pad;

  drawGround(ctx, map, x0, x1);
  for (const p of map.props) if (!p.front && inView(p.x)) drawProp(ctx, p, map.theme);
  for (const t of G.teams) {
    if (inView(t.gateX, 500)) drawCastle(ctx, t, t.id === 0 ? UI.hoverBuilding : null);
  }
  drawDecals(ctx, x0, x1);
  drawPools(ctx, x0, x1);
  for (const t of G.teams) if (inView(t.statue.x, 200)) drawStatue(ctx, t.statue);
  if (G.shrine && inView(G.shrine.x, 200)) drawShrine(ctx, G.shrine);

  // depth-sorted mines, wall segments and units
  const ents = [];
  drawDefendFlag(ctx, G.teams[0]);
  for (const m of G.mines) if (inView(m.x)) ents.push({ y: m.gold > 0 ? m.y : m.y - 30, m });
  for (const w of G.walls) if (inView(w.x)) for (let k = 0; k < WALL_SEGS; k++) ents.push({ y: wallSegY(k), w, k });
  for (const u of G.units) if (inView(u.x)) ents.push({ y: u.y + (u.onWall ? 0.5 : 0), u });
  ents.sort((a, b) => a.y - b.y);
  for (const e of ents) {
    if (e.m) drawMine(ctx, e.m, UI.hoverMine === e.m);
    else if (e.w) drawWallSeg(ctx, e.w, e.k);
    else drawUnit(ctx, e.u);
  }

  for (const t of G.teams) {
    drawStatueBar(ctx, t.statue);
    if (t.statue.dead) continue;
    for (const a of t.archers) {
      if (!inView(a.x)) continue;
      drawStickman(ctx, {
        x: a.x, y: a.y, facing: a.f, scale: 0.88, team: t.id, type: 'archer',
        walk: 0, moving: false, swing: -1, gear: t.id ? 'horns' : 'wrap', flash: 0, seed: a.seed, arch: a, perks: t.upgrades.archer,
      });
    }
  }
  drawProjectiles(ctx);
  drawSpellShots(ctx);
  drawParticles(ctx);
  for (const p of map.props) if (p.front && inView(p.x)) drawProp(ctx, p, map.theme);

  for (const m of G.markers) {
    const k = m.t / 0.6;
    ctx.strokeStyle = m.color;
    ctx.globalAlpha = 1 - k;
    ctx.lineWidth = 2;
    ellipse(ctx, m.x, m.y, 6 + k * 14, 2 + k * 5);
    ctx.stroke();
  }
  ctx.globalAlpha = 1;

  if (UI.hoverBuilding && G.state === 'play') {
    const type = UI.hoverBuilding, hall = RAMPART_HALL_X[type];
    const bx = type === 'castle' ? 250 : hall || BUILD_X[type] || GIANT_PIT_X;
    const ly = type === 'castle' ? WALL_TOP - 40 : hall ? WALL_TOP - 115 : LANE_TOP - 135;
    ctx.font = '600 13px "Segoe UI", sans-serif';
    ctx.textAlign = 'center';
    ctx.fillStyle = 'rgba(0,0,0,0.7)';
    ctx.fillRect(bx - 80, ly - 15, 160, 20);
    ctx.fillStyle = '#e6d6aa';
    ctx.fillText(`${buildingName(type)} — click for upgrades`, bx, ly);
  }
  if (UI.placing) drawPlacing(ctx);

  if (UI.drag && UI.drag.active) {
    const d = UI.drag;
    ctx.fillStyle = 'rgba(150,230,120,0.1)';
    ctx.strokeStyle = 'rgba(150,230,120,0.75)';
    ctx.lineWidth = 1.5;
    ctx.fillRect(Math.min(d.x0, d.x1), Math.min(d.y0, d.y1), Math.abs(d.x1 - d.x0), Math.abs(d.y1 - d.y0));
    ctx.strokeRect(Math.min(d.x0, d.x1), Math.min(d.y0, d.y1), Math.abs(d.x1 - d.x0), Math.abs(d.y1 - d.y0));
  }
  ctx.restore();

  drawWeather(ctx);

  // color grade, film grain and a heavy vignette for a grittier image
  ctx.save();
  ctx.globalCompositeOperation = 'multiply';
  ctx.fillStyle = 'rgba(120,100,80,0.18)';
  ctx.fillRect(0, 0, vw, VIEW_H);
  ctx.globalCompositeOperation = 'overlay';
  ctx.globalAlpha = 0.07;
  ctx.translate(Math.floor(rnd(0, 192)), Math.floor(rnd(0, 192)));
  ctx.fillStyle = texPattern(ctx, 'grain');
  ctx.fillRect(-192, -192, vw + 384, VIEW_H + 384);
  ctx.restore();
  ctx.drawImage(vignette(vw), 0, 0, vw, VIEW_H);
}

// The vignette only changes with window size, so it's rendered once into a small cached canvas.
let VIG = null;
function vignette(vw) {
  if (VIG && VIG.vw === vw) return VIG.c;
  const c = document.createElement('canvas');
  c.width = Math.ceil(vw / 2);
  c.height = VIEW_H / 2;
  const g = c.getContext('2d'), w = c.width, h = c.height;
  const vg = g.createRadialGradient(w / 2, h * 0.55, h * 0.4, w / 2, h * 0.55, Math.max(w, h) * 0.75);
  vg.addColorStop(0, 'rgba(0,0,0,0)');
  vg.addColorStop(1, 'rgba(0,0,0,0.55)');
  g.fillStyle = vg;
  g.fillRect(0, 0, w, h);
  VIG = { vw, c };
  return c;
}
