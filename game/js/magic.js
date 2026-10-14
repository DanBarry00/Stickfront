'use strict';
// Mages: spell casting (forced or automatic), pools, fireballs, bolts, healing, and the Cleric's behaviour.

const castableSpells = u => spellsOf(u.type).filter(k => u.perks[SPELLS[k].perk]);

// Spell areas are wide circles squashed to the depth of the battle lane.
const inArea = (o, x, y, r) => Math.abs(o.x - x) <= r && Math.abs(o.y - y) <= 64;

// Order a mage to cast a spell at a spot; it walks into range first, then casts.
function orderCast(u, k, x, y, forced = true) {
  u.pendingCast = { k, x: clamp(x, 0, WORLD_W), y: clamp(y, LANE_TOP, LANE_BOT), forced };
}

// Runs every frame for mages before their normal behaviour.
// Returns true while the mage is busy with a spell (casting, or walking into range for one).
function updateMageCasting(u, dt) {
  u.gcd -= dt;
  for (const k in u.cd) u.cd[k] -= dt;
  if (u.swing >= 0 && u.swingKind === 'cast') return true;
  u.autoT -= dt;
  if (u.auto && !u.pendingCast && u.autoT <= 0 && !u.inside) {
    u.autoT = 0.3;
    autoCast(u);
  }
  const p = u.pendingCast;
  if (!p) return false;
  const S = SPELLS[p.k];
  if (!u.perks[S.perk]) { u.pendingCast = null; return false; }
  if (Math.abs(p.x - u.x) > S.range) {
    if (u.swing >= 0) return true;
    moveTo(u, p.x - Math.sign(p.x - u.x) * S.range * 0.85, u.y, dt);
    return true;
  }
  if (u.swing >= 0 || u.gcd > 0 || u.cd[p.k] > 0) return false;   // finish the staff swing / recharge first
  const team = G.teams[u.team];
  if (team.mana < S.mana) {
    if (u.team === 0 && p.forced) toast(`Not enough mana for ${S.name} (${S.mana})`);
    u.pendingCast = null;
    return false;
  }
  team.mana -= S.mana;
  u.cd[p.k] = S.cd;
  u.gcd = SPELL_GCD;
  u.facing = p.x >= u.x ? 1 : -1;
  startSwing(u, 'cast', { k: p.k, x: p.x, y: p.y });
  u.pendingCast = null;
  return true;
}

// The spell leaves the staff at the top of the cast animation.
function releaseSpell(u, c) {
  const S = SPELLS[c.k], team = u.team;
  const color = u.type === 'cleric' ? '#f2dc8a' : '#b04dff';
  G.spellFx.push({ kind: 'ring', x: c.x, y: c.y, r: S.r, color, t: 0, max: 0.6 });
  floatText(c.x, c.y - 90, S.name, color);
  const allies = G.units.filter(o => o.team === team && !o.dead && inArea(o, c.x, c.y, S.r));
  const foes = G.units.filter(o => o.team !== team && !o.dead && !o.inside && inArea(o, c.x, c.y, S.r));
  switch (c.k) {
    case 'healpool':
    case 'blight':
      G.pools.push({ team, kind: c.k, x: c.x, y: c.y, r: S.r, t: S.dur, dur: S.dur, power: S.power, tick: 0, src: u, seed: rnd(0, 10) });
      break;
    case 'sanctuary':
      for (const o of allies) { o.fx.shield = Math.max(o.fx.shield, S.power); o.fx.shieldT = S.dur; }
      break;
    case 'fireball':
      G.spellShots.push({ kind: 'fireball', team, src: u, x: u.x + u.facing * 12, y: u.y - 74, sx: u.x + u.facing * 12, sy: u.y - 74, tx: c.x, ty: c.y - 20, t: 0, T: 0.9 });
      break;
    case 'haste':
    case 'empower':
      for (const o of allies) o.fx[c.k] = S.dur;
      break;
    case 'slow':
    case 'enfeeble':
      for (const o of foes) o.fx[c.k] = S.dur;
      break;
  }
}

// ---------------------------------------------------------------- auto-casting

// Score every candidate spot for a spell; members inside the area add their weight.
function bestSpot(u, S, centers, members, weight) {
  let best = null;
  for (const c of centers) {
    if (Math.abs(c.x - u.x) > S.range + 60) continue;
    let s = 0;
    for (const m of members) if (inArea(m, c.x, c.y, S.r)) s += weight(m);
    if (c.bonus) s += c.bonus;
    if (!best || s > best.score) best = { x: c.x, y: c.y, score: s };
  }
  return best;
}

// Decide where (and whether) an auto-casting mage should use each spell. Every spell has an
// eye out for its opposite: Healing Pool answers Blight Pool, Sanctuary answers an incoming
// Fireball, Haste answers Hex of Slowness, War Blessing answers Enfeeble — and vice versa.
function planSpell(u, k, S, allies, foes) {
  const near = (m, list) => list.some(f => Math.abs(f.x - m.x) < 75 && Math.abs(f.y - m.y) < 32);
  const enemyPools = kind => G.pools.filter(p => p.team !== u.team && p.kind === kind).map(p => ({ x: p.x, y: p.y, bonus: 1 }));
  switch (k) {
    case 'healpool':
      return bestSpot(u, S, [...allies, ...enemyPools('blight')], allies,
        m => (m.hp / m.maxHp < 0.7 ? 1 : 0) + (G.pools.some(p => p.kind === 'blight' && p.team !== u.team && inArea(m, p.x, p.y, p.r)) ? 0.8 : 0));
    case 'blight':
      return bestSpot(u, S, [...foes, ...enemyPools('healpool')], foes,
        m => 0.7 + (G.pools.some(p => p.kind === 'healpool' && p.team !== u.team && inArea(m, p.x, p.y, p.r)) ? 0.8 : 0));
    case 'sanctuary': {
      const incoming = G.spellShots.filter(s => s.kind === 'fireball' && s.team !== u.team).map(s => ({ x: s.tx, y: s.ty + 20, bonus: 1.5 }));
      const s = bestSpot(u, S, [...allies, ...incoming], allies,
        m => (m.fx.shield > 20 ? 0 : (near(m, foes) ? 0.75 : 0) + (incoming.some(i => inArea(m, i.x, i.y, S.r)) ? 1.2 : 0)));
      return s && s.score >= 3 ? s : null;
    }
    case 'fireball': {
      const s = bestSpot(u, S, foes, foes, m => 0.75 + (m.fx.shield > 0 ? 0.25 : 0));
      return s && s.score >= 3 ? s : null;
    }
    case 'haste':
      return bestSpot(u, S, allies, allies, m => (m.fx.haste > 2 ? 0 : (m.fx.slow > 0 ? 1.2 : 0) + (near(m, foes) ? 0.75 : 0)));
    case 'slow':
      return bestSpot(u, S, foes, foes, m => (m.fx.slow > 2 ? 0 : (m.fx.haste > 0 ? 1.2 : 0) + (near(m, allies) ? 0.75 : 0)));
    case 'empower':
      return bestSpot(u, S, allies, allies, m => (m.fx.empower > 2 || m.type === 'miner' ? 0 : (m.fx.enfeeble > 0 ? 1.2 : 0) + (near(m, foes) ? 0.75 : 0)));
    case 'enfeeble':
      return bestSpot(u, S, foes, foes, m => (m.fx.enfeeble > 2 || m.type === 'miner' ? 0 : (m.fx.empower > 0 ? 1.2 : 0) + (near(m, allies) ? 0.75 : 0)));
  }
  return null;
}

function autoCast(u) {
  if (u.gcd > 0 || u.swing >= 0) return;
  const team = G.teams[u.team];
  const allies = G.units.filter(o => o.team === u.team && !o.dead && !o.inside);
  const foes = G.units.filter(o => o.team !== u.team && !o.dead && !o.inside);
  let best = null;
  for (const k of castableSpells(u)) {
    const S = SPELLS[k];
    if (u.cd[k] > 0 || team.mana < S.mana + SPELL_RESERVE) continue;
    const plan = planSpell(u, k, S, allies, foes);
    if (plan && plan.score >= 2 && (!best || plan.score > best.score)) best = { ...plan, k };
  }
  if (best) orderCast(u, best.k, best.x, best.y, false);
}

// ---------------------------------------------------------------- spell objects in the world

function healUnit(t, amt, src) {
  if (t.dead || t.hp >= t.maxHp) return;
  t.hp = Math.min(t.maxHp, t.hp + amt);
  t.showHp = 2;
  if (src) {
    G.spellFx.push({ kind: 'beam', x1: src.x + src.facing * 10, y1: src.y - 76, x2: t.x, y2: t.y - 40, color: '#f2dc8a', t: 0, max: 0.35 });
  }
  for (let i = 0; i < 4; i++) {
    G.particles.push({ kind: 'spark', x: t.x + rnd(-8, 8), y: t.y - rnd(15, 55), vx: 0, vy: rnd(-35, -15), life: 0.7, max: 0.7, color: '#a8e08a', size: 1.6 });
  }
}

function fireBolt(u, t, dmg) {
  G.spellShots.push({ kind: 'bolt', team: u.team, src: u, x: u.x + u.facing * 10, y: u.y - 76, target: t, dmg, t: 0 });
}

function explodeFireball(s) {
  const S = SPELLS.fireball, src = s.src && !s.src.dead ? s.src : null;
  const x = s.tx, y = s.ty + 20;
  for (const e of G.units.slice()) {
    if (e.team !== s.team && !e.dead && !e.inside && inArea(e, x, y, S.r)) damage(e, S.power, src);
  }
  const enemy = G.teams[1 - s.team];
  if (!enemy.statue.dead && Math.abs(enemy.statue.x - x) < S.r + enemy.statue.halfW) damage(enemy.statue, S.power / 2, src);
  for (const w of G.walls) if (w.team !== s.team && !w.dead && w.progress >= 1 && Math.abs(w.x - x) < S.r) damage(w, S.power / 2, src);
  spawnBurst(x, y - 20, 26, { color: '#ff8a2e', speed: 220, up: 120, g: 400, life: 0.8, size: 3 });
  spawnBurst(x, y - 20, 14, { color: '#3a2a22', speed: 140, up: 160, g: 200, life: 1.2, size: 4 });
  G.spellFx.push({ kind: 'blast', x, y, r: S.r, t: 0, max: 0.5 });
  for (let i = 0; i < 4; i++) addDecal(x + rnd(-S.r, S.r) * 0.6, y + rnd(-20, 20), rnd(6, 12), 0.35);
}

function updateSpellWorld(dt) {
  // pools tick every half second
  for (const p of G.pools) {
    p.t -= dt;
    p.tick += dt;
    if (p.tick < 0.5) continue;
    p.tick -= 0.5;
    const amt = p.power * 0.5, src = p.src && !p.src.dead ? p.src : null;
    for (const o of G.units.slice()) {
      if (o.dead || o.inside || !inArea(o, p.x, p.y, p.r)) continue;
      if (p.kind === 'healpool' && o.team === p.team) healUnit(o, amt, null);
      else if (p.kind === 'blight' && o.team !== p.team) damage(o, amt, src);
    }
  }
  G.pools = G.pools.filter(p => p.t > 0);

  for (const s of G.spellShots) {
    s.t += dt;
    if (s.kind === 'fireball') {
      const k = Math.min(1, s.t / s.T);
      s.x = lerp(s.sx, s.tx, k);
      s.y = lerp(s.sy, s.ty, k) - Math.sin(k * Math.PI) * 70;
      if (chance(0.8)) G.particles.push({ kind: 'spark', x: s.x + rnd(-4, 4), y: s.y + rnd(-4, 4), vx: rnd(-15, 15), vy: rnd(-25, 5), life: 0.5, max: 0.5, color: pick(['#ff9a2e', '#ffcf6a', '#5a4a42']), size: rnd(1.5, 3) });
      if (k >= 1) { explodeFireball(s); s.done = true; }
    } else {
      // homing bolt
      const t = s.target;
      if (!isValidTarget(t)) { s.done = true; continue; }
      const tx = t.x, ty = targetAimY(t);
      const dx = tx - s.x, dy = ty - s.y, d = Math.hypot(dx, dy);
      const step = 430 * dt;
      if (d <= step + 6) {
        damage(t, s.dmg, s.src && !s.src.dead ? s.src : null);
        spawnBurst(tx, ty, 5, { color: '#b04dff', speed: 70, up: 20, g: 100, life: 0.4, size: 2 });
        s.done = true;
      } else {
        s.x += (dx / d) * step;
        s.y += (dy / d) * step;
      }
    }
  }
  G.spellShots = G.spellShots.filter(s => !s.done);

  for (const f of G.spellFx) f.t += dt;
  G.spellFx = G.spellFx.filter(f => f.t < f.max);
}

// ---------------------------------------------------------------- the Cleric

// The most wounded ally within reach of the cleric's staff.
function mostWounded(u) {
  let best = null, bf = 1;
  for (const o of G.units) {
    if (o.team !== u.team || o.dead) continue;
    if (Math.abs(o.x - u.x) > u.range || o.hp >= o.maxHp - 3) continue;
    const f = o.hp / o.maxHp;
    if (f < bf) { bf = f; best = o; }
  }
  return best;
}

// Clerics never strike: they heal whoever is hurt nearby and keep a step behind the fighting.
function updateCleric(u, dt) {
  const team = G.teams[u.team], o = u.order;
  if (o.type === 'refit') return doRefit(u, dt);
  if (o.type === 'manwall' || o.type === 'attack') u.order = { type: 'hold', x: u.x, y: u.y };
  if (u.swing < 0 && u.atkCd <= 0) {
    const p = mostWounded(u);
    if (p) {
      u.facing = p.x >= u.x ? 1 : -1;
      startSwing(u, 'heal', p);
      return;
    }
  }
  if (u.swing >= 0) return;
  if (o.type === 'move') {
    if (moveTo(u, o.x, o.y, dt)) u.order = { type: 'hold', x: o.x, y: o.y };
    return;
  }
  if (o.type === 'hold') { moveTo(u, o.x, o.y, dt); return; }
  if (o.type === 'group') {
    // marching with a formation: stay in the back rank and keep pace
    const g = o.g, slot = u.groupSlot;
    if (!slot) return;
    u.capSpeed = Math.abs(u.x - slot.x) + Math.abs(u.y - slot.y) > 30 ? null : g.speed * 1.1;
    if (g.marching) u.settled = false;
    if (moveTo(u, slot.x, slot.y, dt) || g.mode === 'retreat') u.facing = team.dir;
    return;
  }
  const stance = u.ownStance || team.stance;
  if (o.type === 'garrison' || stance === 'garrison') return goGarrison(u, dt);
  const foes = G.units.filter(e => e.team !== u.team && !e.dead && !e.inside);
  const threat = foes.find(e => Math.abs(e.x - u.x) < 70);
  if (threat) {
    // back away from danger toward the castle
    const home = team.gateX + team.dir * 30;
    if (team.dir * (u.x - home) > 4) moveTo(u, u.x - team.dir * 60, u.y, dt);
    u.facing = team.dir;
    return;
  }
  if (stance === 'defend') {
    const s = rankSlot('cleric', u.slotIdx, team.slotCount.cleric || 1, defendLine(team), team.dir);
    if (moveTo(u, s.x, s.y, dt)) u.facing = team.dir;
    return;
  }
  // attack: shadow the friendly soldier furthest forward
  let lead = null;
  for (const a of G.units) {
    if (a.team !== u.team || a.dead || a.inside || a.type === 'miner' || isMage(a)) continue;
    if (!lead || team.dir * (a.x - lead.x) > 0) lead = a;
  }
  const tx = lead ? lead.x - team.dir * 95 : defendLine(team) - team.dir * 100;
  if (moveTo(u, tx, u.slotY, dt)) u.facing = team.dir;
}
