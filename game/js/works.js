'use strict';
// Drawing the Architect's and Castle Wizard's works: traps and runes, caltrop fields, wards on
// structures, wizard towers, and the marks showing what a selected builder can work on.

// Rune colours: binding ice-blue, hex violet, dread bone-white.
const RUNE_COL = { bind: '#8fd0ff', hex: '#d870f0', dread: '#ece6d6' };

// Traps are hidden from the enemy: drawn for their owner (and for neutral traps), or once one of
// your saboteurs has sniffed it out (or it has gone off). A trap being laid, or left half-laid, is
// drawn faint.
function drawTrap(ctx, trap) {
  if (trap.team === 1 && !trap.spotted[0]) return;
  ctx.save();
  ctx.globalAlpha = trap.armed ? (trap.team === -1 ? 0.8 : 0.95) : trap.sprung ? 0.95 : 0.35 + 0.3 * trap.prog;
  const x = trap.x, y = trap.y, k = trap.kind;
  if (k === 'tar') drawThatchCover(ctx, x, y, TRAP.tar.coverR, trap.magic);
  else if (k === 'mine') { ctx.save(); ctx.translate(x, y); ctx.scale(1.4, 1.4); drawPlateMine(ctx, 0, 0, trap.magic); ctx.restore(); }
  else if (k === 'spikes') drawSpikePit(ctx, x, y, trap.sprung, trap.magic);
  else if (k === 'caltrops') drawCaltropSack(ctx, x, y, trap.magic);
  else if (k === 'snare') drawSnare(ctx, x, y, trap.magic);
  else drawRuneStone(ctx, x, y, k, trap.reinforced, trap.armed);
  // an enchanted trap shimmers violet
  if (trap.magic && k !== 'tar' && k !== 'mine') {
    ctx.strokeStyle = `rgba(190,120,255,${0.35 + 0.2 * Math.sin(RT * 3 + x)})`;
    ctx.lineWidth = 1.2;
    ellipse(ctx, x, y, 17, 5.5);
    ctx.stroke();
  }
  if (trap.team === 1) {   // an enemy trap your saboteur found: marked in red
    const r = k === 'tar' ? 12 : 8;
    ctx.globalAlpha = 1;
    ctx.strokeStyle = 'rgba(230,80,60,0.85)';
    ctx.lineWidth = 1.8;
    ctx.beginPath(); ctx.moveTo(x - r, y - r); ctx.lineTo(x + r, y + r * 0.5); ctx.moveTo(x + r, y - r); ctx.lineTo(x - r, y + r * 0.5); ctx.stroke();
  }
  ctx.restore();
}

// A spike pit: brushwood and turf laid over a hole. Sprung, the cover is gone and the sharpened
// stakes in the dark pit show (stained, enchanted ones glowing faintly).
function drawSpikePit(ctx, x, y, open, magic) {
  const rx = 20, ry = 6;
  if (open) {
    ctx.fillStyle = '#0d0907';
    ellipse(ctx, x, y, rx, ry);
    ctx.fill();
    ctx.strokeStyle = '#4a3420';
    ctx.lineWidth = 1.6;
    ctx.beginPath();
    for (let i = 0; i < 6; i++) {
      const sx = x - rx * 0.7 + i * rx * 0.28, h = 7 + hrand(x, i) * 5;
      ctx.moveTo(sx, y + 2); ctx.lineTo(sx + (hrand(x, i + 9) - 0.5) * 3, y + 2 - h);
    }
    ctx.stroke();
    ctx.fillStyle = '#5c0d0b';
    for (let i = 0; i < 3; i++) ctx.fillRect(x - 10 + i * 9, y - 7 + hrand(x, i + 4) * 3, 2, 2);
    if (magic) { ctx.fillStyle = `rgba(190,120,255,${0.25 + 0.15 * Math.sin(RT * 3)})`; ellipse(ctx, x, y, rx * 0.7, ry * 0.6); ctx.fill(); }
    ctx.strokeStyle = '#3a2a1a';
    ctx.lineWidth = 1.2;
    ellipse(ctx, x, y, rx, ry);
    ctx.stroke();
    return;
  }
  ctx.fillStyle = 'rgba(0,0,0,0.3)';
  ellipse(ctx, x, y + 1.5, rx + 2, ry + 1.5);
  ctx.fill();
  ctx.fillStyle = '#4e4026';
  ellipse(ctx, x, y, rx, ry);
  ctx.fill();
  ctx.strokeStyle = '#2e2214';
  ctx.lineWidth = 1.3;
  ctx.beginPath();
  for (let i = 0; i < 5; i++) {
    const a = (hrand(x, i) - 0.5) * 0.6;
    ctx.moveTo(x - rx * 0.9, y - ry * 0.6 + i * ry * 0.3 + a * 4);
    ctx.lineTo(x + rx * 0.9, y - ry * 0.5 + i * ry * 0.3 - a * 4);
  }
  ctx.stroke();
  ctx.fillStyle = '#5e6a30';   // turf
  for (let i = 0; i < 6; i++) ellipse(ctx, x - rx * 0.6 + hrand(x, i + 20) * rx * 1.2, y - ry * 0.3 + hrand(x, i + 30) * ry * 0.6, 3, 1.4), ctx.fill();
}

// Caltrops, waiting in a half-buried sack: whoever treads on it scatters them everywhere.
function drawCaltropSack(ctx, x, y, magic) {
  ctx.fillStyle = 'rgba(0,0,0,0.3)';
  ellipse(ctx, x, y + 1.5, 11, 3.5);
  ctx.fill();
  ctx.fillStyle = '#7a6440';
  ctx.strokeStyle = '#3a2c18';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(x - 9, y + 1); ctx.quadraticCurveTo(x - 10, y - 8, x - 2, y - 9); ctx.lineTo(x + 2, y - 11); ctx.lineTo(x + 3, y - 8);
  ctx.quadraticCurveTo(x + 10, y - 7, x + 9, y + 1); ctx.closePath();
  ctx.fill(); ctx.stroke();
  ctx.strokeStyle = '#9aa0a6';
  ctx.lineWidth = 1.2;
  ctx.beginPath();
  for (const [cx, cy] of [[x - 5, y - 6], [x + 5, y - 5], [x, y - 3]]) { ctx.moveTo(cx - 2.5, cy); ctx.lineTo(cx + 2.5, cy); ctx.moveTo(cx, cy - 2.5); ctx.lineTo(cx, cy + 2.5); }
  ctx.stroke();
  if (magic) { ctx.fillStyle = 'rgba(120,220,90,0.7)'; ellipse(ctx, x + 6, y - 1, 1.6, 2.4); ctx.fill(); }   // poison seeping out
}

// A snare: a noose of rope laid in the grass, its end tied to a bent stake.
function drawSnare(ctx, x, y, magic) {
  ctx.strokeStyle = '#2e2214';
  ctx.lineWidth = 2.2;
  ctx.beginPath(); ctx.moveTo(x + 14, y + 1); ctx.quadraticCurveTo(x + 16, y - 12, x + 9, y - 16); ctx.stroke();
  ctx.strokeStyle = magic ? '#b48ad8' : '#a08a5a';
  ctx.lineWidth = 1.3;
  ctx.beginPath();
  ctx.ellipse(x - 2, y, 9, 3, 0, 0, TAU);
  ctx.moveTo(x + 7, y); ctx.quadraticCurveTo(x + 11, y - 9, x + 9, y - 16);
  ctx.stroke();
  ctx.strokeStyle = '#4e5a2c';   // grass hiding it
  ctx.lineWidth = 1;
  ctx.beginPath();
  for (let i = 0; i < 5; i++) { const gx = x - 10 + i * 5; ctx.moveTo(gx, y + 2); ctx.lineTo(gx + 1.5, y - 4); }
  ctx.stroke();
}

// A rune: a flat stone set into the ground with a glyph cut into it, glowing faintly. Reinforced,
// it's ringed with iron spikes.
function drawRuneStone(ctx, x, y, kind, reinforced, armed) {
  const col = RUNE_COL[kind];
  ctx.fillStyle = 'rgba(0,0,0,0.32)';
  ellipse(ctx, x, y + 1.5, 15, 5);
  ctx.fill();
  ctx.fillStyle = '#4a4650';
  ellipse(ctx, x, y, 13, 4.4);
  ctx.fill();
  ctx.strokeStyle = '#26232a';
  ctx.lineWidth = 1;
  ctx.stroke();
  const glow = armed ? 0.55 + 0.25 * Math.sin(RT * 2.4 + x) : 0.2;
  ctx.strokeStyle = rgba(col, glow);
  ctx.lineWidth = 1.4;
  ctx.beginPath();
  if (kind === 'bind') { ctx.ellipse(x, y, 7, 2.4, 0, 0, TAU); ctx.moveTo(x - 9, y); ctx.lineTo(x + 9, y); }
  else if (kind === 'hex') { ctx.moveTo(x - 6, y - 1.8); ctx.lineTo(x, y + 2.2); ctx.lineTo(x + 6, y - 1.8); ctx.moveTo(x - 6, y + 1.8); ctx.lineTo(x + 6, y + 1.8); }
  else { ctx.moveTo(x - 4, y - 2); ctx.lineTo(x + 4, y + 2); ctx.moveTo(x + 4, y - 2); ctx.lineTo(x - 4, y + 2); ctx.ellipse(x, y, 8, 2.8, 0, 0, TAU); }
  ctx.stroke();
  if (armed) {
    const g = ctx.createRadialGradient(x, y, 1, x, y, 16);
    g.addColorStop(0, rgba(col, 0.22 * glow));
    g.addColorStop(1, rgba(col, 0));
    ctx.fillStyle = g;
    ellipse(ctx, x, y, 16, 6);
    ctx.fill();
  }
  if (reinforced) {
    ctx.strokeStyle = '#7a7e84';
    ctx.lineWidth = 1.4;
    ctx.beginPath();
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * TAU, sx = x + Math.cos(a) * 15, sy = y + Math.sin(a) * 5;
      ctx.moveTo(sx, sy); ctx.lineTo(sx, sy - 5);
    }
    ctx.stroke();
  }
}

// Scattered caltrops: iron spikes all over the ground (poisoned ones with a green sheen).
function drawCaltropField(ctx, p) {
  const fade = Math.min(1, (p.dur - p.t) / 3, p.t / 0.2);
  ctx.save();
  ctx.globalAlpha = 0.9 * fade;
  ctx.strokeStyle = p.magic ? '#8ab878' : '#8c9096';
  ctx.lineWidth = 1.1;
  ctx.beginPath();
  for (let i = 0; i < 34; i++) {
    const a = hrand(p.x + (p.seed || 0), i) * TAU, d = Math.sqrt(hrand(p.x, i + 40)), cx = p.x + Math.cos(a) * p.r * d, cy = p.y + Math.sin(a) * p.r * 0.42 * d;
    const r = 2.2 + hrand(p.x, i + 80);
    ctx.moveTo(cx - r, cy); ctx.lineTo(cx + r, cy);
    ctx.moveTo(cx, cy - r * 0.6); ctx.lineTo(cx, cy + r * 0.6);
  }
  ctx.stroke();
  if (p.magic) {
    ctx.fillStyle = `rgba(110,200,80,${0.12 + 0.05 * Math.sin(RT * 2)})`;
    ellipse(ctx, p.x, p.y, p.r, p.r * 0.42);
    ctx.fill();
  }
  ctx.restore();
}

// ---------------------------------------------------------------- wards

// A structure's ward: a pale shimmering shell, brighter the more it holds, flaring when struck.
function drawWard(ctx, s) {
  if (!(s.ward > 0) || s.dead) return;
  const team = s.team >= 0 ? G.teams[s.team] : null;
  const max = team ? wardMax(team, s) : s.ward, k = clamp(s.ward / max, 0, 1);
  const flare = (s.wardFlash || 0) > 0 ? 0.35 : 0;
  let cx, cy, rx, ry;
  if (s.isStatue) { cx = s.x; cy = LANE_TOP - 95; rx = s.halfW + 26; ry = 150; }
  else if (s.isTower) { cx = s.x; cy = s.y - TOWER.h / 2 - 12; rx = 36; ry = TOWER.h / 2 + 34; }
  else { cx = s.x; cy = (LANE_TOP + LANE_BOT) / 2 - 18; rx = 26; ry = (LANE_BOT - LANE_TOP) / 2 + 36; }
  ctx.save();
  const g = ctx.createRadialGradient(cx, cy, Math.min(rx, ry) * 0.4, cx, cy, Math.max(rx, ry));
  g.addColorStop(0, 'rgba(160,215,255,0)');
  g.addColorStop(0.85, `rgba(160,215,255,${0.1 + 0.14 * k + flare * 0.3})`);
  g.addColorStop(1, 'rgba(160,215,255,0)');
  ctx.fillStyle = g;
  ellipse(ctx, cx, cy, rx, ry);
  ctx.fill();
  ctx.strokeStyle = `rgba(175,225,255,${0.35 + 0.4 * k + flare})`;
  ctx.lineWidth = 1.6;
  ctx.setLineDash([6, 5]);
  ctx.lineDashOffset = -RT * 14;
  ellipse(ctx, cx, cy, rx, ry);
  ctx.stroke();
  ctx.setLineDash([]);
  // how much it holds: a thin blue bar over the top
  const w = Math.min(60, rx * 1.4), by = cy - ry - 8;
  ctx.fillStyle = 'rgba(0,0,0,0.6)';
  ctx.fillRect(cx - w / 2 - 1, by, w + 2, 4);
  ctx.fillStyle = '#8fd0ff';
  ctx.fillRect(cx - w / 2, by + 1, w * k, 2);
  ctx.restore();
}
function updateWardFlash(dt) {
  for (const s of [...G.walls, ...G.towers, ...G.teams.map(t => t.statue)]) if (s.wardFlash > 0) s.wardFlash -= dt;
}

// ---------------------------------------------------------------- wizard towers

const WTOWER_COL = { graveyard: '#7dff8a', sanctum: '#ffe8a0', spire: '#c070ff' };

// Over a wizard tower's roof: a tall slate spire with a glowing finial, coloured by its mage (and
// a Graveyard's headstones, a Sanctum's halo, a Spire's crackling sparks). While the Castle Wizard
// works on it, runes circle its foot and a violet bar fills.
function drawWizardTowerTop(ctx, tw) {
  const x = tw.x, top = tw.y - TOWER.h, eave = top - 42;
  if (tw.converting) {
    for (let i = 0; i < 6; i++) {
      const a = RT * 0.8 + (i / 6) * TAU;
      ctx.fillStyle = `rgba(200,168,240,${0.4 + 0.3 * Math.sin(RT * 3 + i)})`;
      ctx.fillRect(x + Math.cos(a) * 34 - 1.5, tw.y - 4 + Math.sin(a) * 6 - 3, 3, 6);
    }
    const w = 40;
    ctx.fillStyle = 'rgba(0,0,0,0.65)';
    ctx.fillRect(x - w / 2 - 1, eave - 44, w + 2, 5);
    ctx.fillStyle = '#c8a8f0';
    ctx.fillRect(x - w / 2, eave - 43, w * (tw.cprog || 0), 3);
    return;
  }
  if (!tw.wizard) return;
  const kind = wizardTowerKind(tw), col = WTOWER_COL[kind] || '#a8dcff';
  ctx.save();
  // the slate spire over the old roof
  ctx.fillStyle = '#2c2e3a';
  ctx.strokeStyle = '#121218';
  ctx.lineWidth = 1.4;
  ctx.beginPath();
  ctx.moveTo(x - 22, eave + 2); ctx.lineTo(x, eave - 58); ctx.lineTo(x + 22, eave + 2); ctx.closePath();
  ctx.fill(); ctx.stroke();
  ctx.strokeStyle = 'rgba(255,255,255,0.08)';
  ctx.beginPath();
  for (let r = 1; r < 5; r++) { const yy = eave + 2 - r * 12, hw = 22 * (1 - r * 12 / 60); ctx.moveTo(x - hw, yy); ctx.lineTo(x + hw, yy); }
  ctx.stroke();
  // the finial
  const fy = eave - 64, pulse = 0.6 + 0.3 * Math.sin(RT * 2.6 + tw.x);
  const g = ctx.createRadialGradient(x, fy, 1, x, fy, 26);
  g.addColorStop(0, rgba(col, 0.55 * pulse));
  g.addColorStop(1, rgba(col, 0));
  ctx.fillStyle = g;
  ctx.fillRect(x - 26, fy - 26, 52, 52);
  ctx.fillStyle = col;
  ctx.beginPath(); ctx.moveTo(x, fy - 8); ctx.lineTo(x + 4, fy); ctx.lineTo(x, fy + 6); ctx.lineTo(x - 4, fy); ctx.closePath(); ctx.fill();
  if (kind === 'graveyard') {
    // headstones and a green mist round its foot
    for (const [dx, h] of [[-30, 12], [26, 10], [38, 8]]) {
      ctx.fillStyle = '#5a5a58';
      ctx.beginPath(); ctx.moveTo(x + dx - 4, tw.y + 4); ctx.lineTo(x + dx - 4, tw.y + 4 - h); ctx.arc(x + dx, tw.y + 4 - h, 4, Math.PI, 0); ctx.lineTo(x + dx + 4, tw.y + 4); ctx.closePath(); ctx.fill();
    }
    ctx.fillStyle = `rgba(110,230,120,${0.08 + 0.04 * Math.sin(RT * 1.5)})`;
    ellipse(ctx, x, tw.y + 2, 54, 9);
    ctx.fill();
  } else if (kind === 'sanctum') {
    ctx.strokeStyle = `rgba(255,236,170,${0.35 + 0.2 * Math.sin(RT * 2)})`;
    ctx.lineWidth = 2;
    ellipse(ctx, x, fy - 12, 12, 3.5);
    ctx.stroke();
  } else if (kind === 'spire' && chance(0.08)) {
    G.particles.push({ kind: 'spark', x: x + rnd(-6, 6), y: fy + rnd(-6, 6), vx: rnd(-30, 30), vy: rnd(-40, 10), life: 0.4, max: 0.4, color: '#d090ff', size: 1.6 });
  }
  ctx.restore();
}

// ---------------------------------------------------------------- work marks

// With your Architect or Castle Wizard selected, everything it could work on is marked: what's
// unfinished, damaged or waiting to be warded, and what its gold or mana would buy.
function drawWorkMarks(ctx) {
  const me = G.teams[0], sel = G.selection.filter(u => !u.dead && u.team === 0);
  const arch = sel.some(u => u.type === 'architect'), wiz = sel.some(u => u.type === 'wizard');
  if (!arch && !wiz) return;
  const marks = [];
  if (arch) {
    for (const j of archJobs(me)) {
      if (j.kind === 'rebuild') continue;   // (ruins show their price themselves)
      const s = j.s;
      const label = j.kind === 'finish' ? (s.isTrap ? (s.sprung ? 'Re-arm' : 'Finish') : 'Finish') : j.kind === 'repair' ? 'Repair' : `Reinforce ${RUNE.reinforce}`;
      marks.push({ s, label, col: '#e0c070', icon: j.kind === 'reinforce' ? 'gold' : null });
    }
  }
  if (wiz) {
    for (const j of wizJobs(me)) {
      const s = j.s;
      const label = j.kind === 'ward' ? 'Ward' : j.kind === 'convert' ? 'Finish tower' : j.kind === 'finish' ? 'Finish' : `Enchant ${enchantCost(me)}`;
      marks.push({ s, label, col: '#a8d8ff', icon: j.kind === 'enchant' ? 'mana' : null });
    }
    if (!wizardTowerOf(me)) for (const tw of G.towers) if (!convertProblem(me, tw)) marks.push({ s: tw, label: `Wizard tower ${WTOWER.gold}g ${WTOWER.mana}m`, col: '#c8a8f0', small: true });
  }
  ctx.save();
  ctx.font = '600 10px "Segoe UI", sans-serif';
  ctx.textAlign = 'center';
  const seen = new Map();
  for (const m of marks) {
    const s = m.s;
    let cx, cy, rx, ry, ly;
    if (s.isTrap) { cx = s.x; cy = s.y; rx = 18; ry = 6; ly = s.y - 14; }
    else if (s.isStatue) { cx = s.x; cy = LANE_TOP - 6; rx = s.halfW + 14; ry = 12; ly = LANE_TOP - 250; }
    else if (s.isTower) { cx = s.x; cy = s.y + 2; rx = 32; ry = 8; ly = s.y - TOWER.h - 92; }
    else { cx = s.x; cy = LANE_BOT + 2; rx = 26; ry = 8; ly = LANE_TOP - 40; }
    const n = seen.get(s) || 0;   // two marks on one thing (repair and ward): stack the labels
    seen.set(s, n + 1);
    const a = 0.55 + 0.3 * Math.sin(RT * 4);
    if (!n) {
      ctx.strokeStyle = rgba(m.col, a);
      ctx.lineWidth = 1.6;
      ctx.setLineDash([4, 3]);
      ellipse(ctx, cx, cy, rx, ry);
      ctx.stroke();
      ctx.setLineDash([]);
    }
    if (s.isTrap && !m.icon && m.label !== 'Finish' && m.label !== 'Re-arm') continue;   // keep trap labels to the ones that matter
    const ty = ly - n * 12;
    const w = ctx.measureText(m.label).width + 8;
    ctx.fillStyle = 'rgba(14,11,9,0.75)';
    ctx.fillRect(cx - w / 2, ty - 9, w, 12);
    ctx.fillStyle = m.col;
    ctx.fillText(m.label, cx, ty);
  }
  ctx.restore();
}

// ---------------------------------------------------------------- the siege wagon

// Escort's siege wagon: a heavy timber cart on two spoked wheels, loaded with powder kegs under a
// tarpaulin, a sharpened ram out front and a banner in the side's colour. The wheels turn as it rolls.
function drawWagon(ctx, o) {
  const st = TEAM_STYLE[o.team], f = o.facing;
  ctx.save();
  ctx.translate(o.x, o.y);
  if (o.alpha !== undefined) ctx.globalAlpha *= o.alpha;
  if (o.fall) ctx.rotate(-f * o.fall * 0.4);
  const wood = o.flash > 0 ? '#7a3a2a' : '#5e4128', dark = '#24180d';
  // the bed
  ctx.fillStyle = wood;
  ctx.strokeStyle = dark;
  ctx.lineWidth = 1.4;
  ctx.fillRect(-34, -30, 68, 12);
  ctx.strokeRect(-34, -30, 68, 12);
  ctx.beginPath();
  for (let x = -26; x < 34; x += 12) { ctx.moveTo(x, -30); ctx.lineTo(x, -18); }
  ctx.stroke();
  // the ram
  ctx.fillStyle = '#4a3420';
  ctx.beginPath(); ctx.moveTo(f * 34, -26); ctx.lineTo(f * 52, -23); ctx.lineTo(f * 34, -20); ctx.closePath(); ctx.fill(); ctx.stroke();
  ctx.fillStyle = '#8a8c90';
  ctx.beginPath(); ctx.moveTo(f * 48, -25); ctx.lineTo(f * 56, -23); ctx.lineTo(f * 48, -21); ctx.closePath(); ctx.fill();
  // the kegs, under a lashed tarpaulin
  for (const [kx, kr] of [[-14, 11], [8, 12]]) {
    ctx.fillStyle = '#3a2614';
    ctx.beginPath(); ctx.ellipse(kx, -42, kr * 0.8, kr, 0, 0, TAU); ctx.fill(); ctx.stroke();
    ctx.strokeStyle = '#6a6c70';
    ctx.lineWidth = 1.6;
    ctx.beginPath(); ctx.moveTo(kx - kr * 0.75, -47); ctx.lineTo(kx + kr * 0.75, -47); ctx.moveTo(kx - kr * 0.75, -37); ctx.lineTo(kx + kr * 0.75, -37); ctx.stroke();
    ctx.strokeStyle = dark;
    ctx.lineWidth = 1.4;
  }
  ctx.fillStyle = 'rgba(110,96,70,0.85)';
  ctx.beginPath(); ctx.moveTo(-28, -30); ctx.quadraticCurveTo(-6, -64, 22, -30); ctx.closePath(); ctx.fill();
  ctx.strokeStyle = '#3a2c18';
  ctx.beginPath(); ctx.moveTo(-20, -30); ctx.lineTo(-4, -56); ctx.moveTo(12, -30); ctx.lineTo(-2, -56); ctx.stroke();
  // a fuse, smouldering
  ctx.strokeStyle = '#2a2018';
  ctx.beginPath(); ctx.moveTo(10, -54); ctx.quadraticCurveTo(16, -62, 12, -66); ctx.stroke();
  ctx.fillStyle = `rgba(255,${150 + 60 * Math.sin(RT * 14)},60,0.9)`;
  ctx.beginPath(); ctx.arc(12, -66, 1.8, 0, TAU); ctx.fill();
  // the banner
  ctx.strokeStyle = dark;
  ctx.lineWidth = 2;
  ctx.beginPath(); ctx.moveTo(-f * 30, -30); ctx.lineTo(-f * 30, -84); ctx.stroke();
  ctx.fillStyle = shade(st.accent, -0.1);
  const flap = Math.sin(RT * 3 + o.seed) * 2;
  ctx.beginPath(); ctx.moveTo(-f * 30, -84); ctx.lineTo(-f * 30 + f * 16, -79 + flap); ctx.lineTo(-f * 30, -72); ctx.closePath(); ctx.fill();
  // wheels, turning with the distance rolled
  const turn = (o.x / 12) * f;
  for (const wx of [-20, 20]) {
    ctx.fillStyle = '#2e2014';
    ctx.beginPath(); ctx.arc(wx, -12, 12, 0, TAU); ctx.fill();
    ctx.strokeStyle = '#6a4a2c';
    ctx.lineWidth = 1.6;
    ctx.beginPath(); ctx.arc(wx, -12, 10, 0, TAU); ctx.stroke();
    ctx.beginPath();
    for (let k = 0; k < 6; k++) { const a = turn + (k * Math.PI) / 3; ctx.moveTo(wx, -12); ctx.lineTo(wx + Math.cos(a) * 10, -12 + Math.sin(a) * 10); }
    ctx.stroke();
    ctx.fillStyle = '#6a6c70';
    ctx.beginPath(); ctx.arc(wx, -12, 2.2, 0, TAU); ctx.fill();
  }
  ctx.restore();
}
