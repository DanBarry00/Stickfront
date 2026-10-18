'use strict';
// Giants: obedience (shown as chains), their own mind, smashing impacts, and the giant sealed in every statue.

// Protein Diet tier (the statue's giant is one size past the last tier).
const giantTier = u => (u.perks.statue ? STATUE_GIANT_TIER : u.perks.protein3 ? 3 : u.perks.protein2 ? 2 : u.perks.protein ? 1 : 0);

// How well a giant listens: more friendly troops nearby means more control; blinders help a lot.
function giantObedience(u) {
  if (u.isStatueGiant) return 0;
  let n = 0;
  for (const o of G.units) {
    if (o.team !== u.team || o.dead || o.inside || o.type === 'miner' || isGiant(o) || Math.abs(o.x - u.x) >= BEASTMASTER.auraRange) continue;
    n += 1 + (o.type === 'beastmaster' ? (o.perks.lore ? BEASTMASTER.auraLore : BEASTMASTER.aura) : 0);   // beastmasters tame giants
  }
  return clamp(0.25 + 0.09 * Math.min(n, 7) + (u.perks.blinders ? 0.25 : 0), 0.1, 0.97);
}
const giantChains = u => (u.isStatueGiant ? 0 : Math.round(u.obey * 5));

// Giants go for the closest enemy they can reach (they ignore taunts).
function nearestFoe(u, range) {
  let best = null, bd = 1e9;
  for (const e of G.units) {
    if (e.team === u.team || !canTarget(u, e)) continue;
    if (Math.abs(e.x - u.x) > range || Math.abs(e.y - u.y) > 140) continue;
    const d = Math.abs(e.x - u.x) + Math.abs(e.y - u.y) * 0.5;
    if (d < bd) { bd = d; best = e; }
  }
  return best;
}

function updateGiant(u, dt) {
  const team = G.teams[u.team], o = u.order, es = G.teams[1 - u.team].statue;
  u.obeyT -= dt;
  if (u.obeyT <= 0) { u.obeyT = 0.5; u.obey = giantObedience(u); }
  u.confusedT -= dt;
  u.confuseCd -= dt;
  if (u.invulnT > 0) u.invulnT -= dt;
  // pelted hard by arrows and the like: raise an arm across the face for a while
  u.guardT = Math.max(0, (u.guardT || 0) - dt);
  u.arrowHurt = Math.max(0, (u.arrowHurt || 0) - u.maxHp * GIANT_GUARD.decay * dt);
  if (u.arrowHurt > u.maxHp * GIANT_GUARD.trigger) { u.guardT = GIANT_GUARD.time; u.arrowHurt = 0; }
  if (o.type === 'refit' && !u.isStatueGiant) return doRefit(u, dt);
  if (handleBlocked(u, dt)) return;

  // confused by arrows: lash out at whoever is closest, friend or foe
  if (u.confusedT > 0) {
    let near = null, nd = 90;
    for (const e of G.units) {
      if (e === u || isGiant(e) || !canTarget(u, e)) continue;
      const d = Math.abs(e.x - u.x) + Math.abs(e.y - u.y) * 0.5;
      if (d < nd) { nd = d; near = e; }
    }
    if (near) return engage(u, near, dt);
    // stung by the castle archers right under the wall: it lashes out at the statue
    if (!es.dead && Math.abs(es.x - u.x) < u.range + es.halfW + 40) return engage(u, es, dt);
    if (u.swing < 0) moveTo(u, u.x + Math.sin(RT * 1.3 + u.seed) * 40, u.y, dt);
    return;
  }

  // pelted by something it can't reach (Kestrels, for a giant too small to swat them): if no friendly
  // shooter nearby is fighting back, it falls back toward its castle archers instead of standing
  // there taking it
  const pest = u.lastAttacker;
  if (u.retaliateT > 0 && !u.isStatueGiant && isValidTarget(pest) && !pest.isStructure && !canTarget(u, pest)) {
    const covered = G.units.some(f => f.team === u.team && f !== u && !f.dead && !f.inside && canTarget(f, pest) && Math.abs(f.x - pest.x) < (f.range || 0) + 120);
    if (!covered) {
      if (u.swing < 0) moveTo(u, team.gateX + team.dir * 140, giantSlot(u).y, dt);
      return;
    }
  }

  // a mind of its own: every few seconds a poorly chained giant may charge off or refuse to budge
  u.mindT -= dt;
  if (u.mindT <= 0) {
    u.mindT = rnd(3, 5);
    u.rogue = u.isStatueGiant ? 'charge' : chance(1 - u.obey) ? (chance(0.55) ? 'charge' : 'stay') : null;
    // the computer can't call a runaway back the way a player can, so while its army holds the
    // line a restless giant of its sulks in place rather than charging off alone to its death
    if (u.rogue === 'charge' && !u.isStatueGiant && team.aiControl && !armyAttacking(u)) u.rogue = 'stay';
  }
  const t = nearestFoe(u, u.aggro);
  if (u.rogue === 'charge') {
    if (t) return engage(u, t, dt);
    if (!es.dead) return engage(u, es, dt);
    if (u.swing < 0) moveTo(u, G.teams[1 - u.team].gateX + team.dir * 60, u.y, dt);
    return;
  }
  // anything that wanders into arm's reach gets smashed
  if (t && Math.abs(t.x - u.x) < u.range + 60) return engage(u, t, dt);
  // at the enemy's door it keeps pounding the statue (unless steered away with Blinders)
  if (!es.dead && Math.abs(es.x - u.x) < u.aggro + es.halfW && !(u.perks.blinders && o.type === 'move')) return engage(u, es, dt);
  if (u.rogue === 'stay') return;

  // with blinders the player can steer it
  if (u.perks.blinders && (o.type === 'move' || o.type === 'hold')) {
    if (o.type === 'move') { if (moveTo(u, o.x, o.y, dt)) u.order = { type: 'hold', x: o.x, y: o.y }; }
    else if (u.swing < 0) moveTo(u, o.x, o.y, dt);
    return;
  }

  // follow the troops around it, staying at the front of them. A marching formation's front is its
  // spear line, on defence the defend line; otherwise the foremost troops. Beastmasters drive their giants from behind, so they
  // never count as the front: with only them around, the giant leads and they follow it.
  const friends = G.units.filter(f => f.team === u.team && !f.dead && !f.inside && !isWorker(f) && !isGiant(f) && Math.abs(f.x - u.x) < 500);
  if (friends.length) {
    const march = G.groups.find(g => g.team === u.team && g.mode !== 'retreat' && Math.abs(g.anchor - u.x) < 600);
    const line = friends.filter(f => f.type !== 'beastmaster');
    const foremost = list => (team.dir > 0 ? Math.max(...list.map(f => f.x)) : Math.min(...list.map(f => f.x)));
    const front = march ? march.anchor + team.dir * RANK_OFF.spear
      : team.stance === 'defend' ? defendLine(team) + team.dir * RANK_OFF.spear   // holding: on the line with the spears
      : line.length ? foremost(line)
      : foremost(friends) + team.dir * (130 + ((team.giantCols || 1) - 1) * GIANT_COL_GAP);
    const fighting = friends.some(f => f.grpFighting || (f.swing >= 0 && (f.swingKind === 'attack' || f.swingKind === 'shoot')));
    // (a line holding a siege outside the castle archers' reach: only smash what comes into arm's reach)
    if (t && fighting && !(march && march.halt && Math.abs(t.x - u.x) > u.range + 60)) return engage(u, t, dt);
    const s = giantSlot(u);
    if (u.swing < 0 && moveTo(u, front - team.dir * (30 + s.back), s.y, dt)) u.facing = team.dir;
    return;
  }
  // nobody to follow: go by the army's stance
  if (team.stance === 'attack') {
    if (t) return engage(u, t, dt);
    if (!es.dead) return engage(u, es, dt);
  }
  const home = team.stance === 'garrison' ? team.gateX + team.dir * 90 : defendLine(team) + team.dir * 40;
  if (t && team.dir * (t.x - home) < 150) return engage(u, t, dt);
  const s = giantSlot(u);
  if (u.swing < 0 && moveTo(u, home - team.dir * s.back, s.y, dt)) u.facing = team.dir;
}

// Beastmasters drive their giants on: a giant in sling range that's sulking, confused or standing
// idle with enemies about gets a stone in the back (BEASTMASTER.prodDmg), which sets it charging
// at the enemy. Returns true when this beastmaster slung a prod.
function beastmasterProd(u) {
  if (u.swing >= 0 || u.atkCd > 0 || (u.prodCd || 0) > G.time) return false;
  for (const g of G.units) {
    if (g.team !== u.team || !isGiant(g) || g.dead || g.inside || g.isStatueGiant || g.rogue === 'charge') continue;
    if (Math.abs(g.x - u.x) > u.range || Math.abs(g.y - u.y) > 140) continue;
    // an idle giant only gets driven on while the army is attacking (not off a defend line)
    const idle = g.swing < 0 && armyAttacking(g) && nearestFoe(g, g.aggro);
    if (g.rogue !== 'stay' && !(g.confusedT > 0) && !idle) continue;
    u.facing = g.x >= u.x ? 1 : -1;
    u.atkCd = u.atk;
    u.prodCd = G.time + BEASTMASTER.prodCd;
    fireArrow(u.team, u.x + u.facing * 10, u.y - 60 * u.scale, g, BEASTMASTER.prodDmg, u, false, { kind: 'stone', prod: true });
    return true;
  }
  return false;
}

// Is the army around this giant on the attack? The whole army on Attack, or troops nearby marching
// in an attack or advance formation or on an Attack order of their own.
function armyAttacking(g) {
  const team = G.teams[g.team];
  if (team.stance === 'attack') return true;
  return G.units.some(f => f.team === g.team && !f.dead && !f.inside && Math.abs(f.x - g.x) < 500 &&
    ((f.order.type === 'group' && f.order.g.mode !== 'retreat') || (f.order.type === 'stance' && f.ownStance === 'attack')));
}

// The prod lands: a sting, and the giant shakes off its mood and charges for a few seconds.
function prodGiant(g, amt) {
  if (g.dead) return;
  g.hp = Math.max(1, g.hp - amt);
  g.flash = 0.1;
  g.confusedT = 0;
  g.rogue = 'charge';
  g.mindT = BEASTMASTER.prodTime;
  if (g.team === 0) floatText(g.x, g.y - 90 * g.scale, 'Hup!', '#c9b27a');
}

// A giant is 3 formation rows wide, so two stand side by side across the lane (top and bottom
// half) and further giants form columns behind them. giantIdx is assigned in assignDefendSlots.
function giantSlot(u) {
  const i = u.giantIdx || 0;
  return { y: rowY(i % 2 === 0 ? 1 : 4), back: Math.floor(i / 2) * GIANT_COL_GAP };
}

// Archers (and ninja stars) can send a giant into a confused rage. Blinders make it rarer and shorter.
function confuseGiant(t, p) {
  const blind = t.perks.blinders ? BLINDERS_CONFUSE : { chance: 1, time: 1 };
  if (t.isStatueGiant || t.confuseCd > 0 || !chance(p * blind.chance)) return;
  t.confusedT = GIANT_CONFUSE.time * blind.time;
  t.confuseCd = GIANT_CONFUSE.cooldown;
  floatText(t.x, t.y - 80 * t.scale, 'Confused!', '#e0bf5a');
}

// Knock a unit away from the source and stun it. Giants stand firm.
function knock(t, src, dist, stun) {
  if (t.dead || t.isStructure || isGiant(t) || t.onTower) return;   // an archer in a tower is braced behind its parapet
  t.knockV = Math.sign(t.x - src.x || src.facing) * dist * 3.5;
  t.stunT = Math.max(t.stunT || 0, stun);
  t.swing = -1;
}

// What happens when a giant's club lands, beyond the hit on its target.
function giantImpact(u, t, amt) {
  if (t.isStructure) return;
  spawnBurst(t.x, t.y - 4, 10, { color: shade(G.map.theme.ground[0], 0.15), speed: 120, up: 60, g: 400, life: 0.7, size: 3 });
  // a statue giant's first blow is a huge sweep that floors everything around it
  if (u.isStatueGiant && !u.swept) {
    u.swept = true;
    for (const e of G.units.slice()) {
      if (e === t || e.team === u.team || e.dead || e.inside || isFlying(e) || Math.abs(e.x - u.x) > STATUE_SWEEP.r || Math.abs(e.y - u.y) > 110) continue;
      damage(e, amt * 0.6, u, true);
      knock(e, u, STATUE_SWEEP.knock, STATUE_SWEEP.stun);
    }
    knock(t, u, STATUE_SWEEP.knock, STATUE_SWEEP.stun);
    u.range = u.baseRange || u.range;   // back to its normal reach after the opening sweep
    G.spellFx.push({ kind: 'ring', x: u.x, y: u.y, r: STATUE_SWEEP.r, color: '#b8a27a', t: 0, max: 0.7 });
    floatText(u.x, u.y - 40 - 70 * u.scale, 'SWEEP!', '#e0bf5a');
    return;
  }
  if (isGiant(t)) return;   // giant on giant: no splash
  const side = G.units
    .filter(e => e !== t && e.team === t.team && !e.dead && !e.inside && !isFlying(e) && Math.abs(e.x - t.x) < 60 && Math.abs(e.y - t.y) < 40)
    .sort((a, b) => Math.abs(a.x - t.x) + Math.abs(a.y - t.y) - (Math.abs(b.x - t.x) + Math.abs(b.y - t.y)))
    .slice(0, 2);
  for (const e of side) damage(e, amt * GIANT_SPLASH, u, true);
  if (u.perks.stun) knock(t, u, 55, STUN_TIME);
}

// The statue breaks open and the giant sealed inside steps out. It never takes orders.
function releaseStatueGiant(s) {
  const team = G.teams[s.team];
  const perks = Object.fromEntries(UPGRADES.giant.map(d => [d.key, true]));
  perks.statue = true;
  const g = new Unit('giant', s.team, s.x, (LANE_TOP + LANE_BOT) / 2, perks);
  g.hp = g.maxHp;
  g.aggro = 700;
  g.mindT = 0;
  g.invulnT = STATUE_GIANT_IMMUNE;   // it can't be hurt for its first moments
  g.baseRange = g.range;
  g.range += STATUE_SWEEP.reach;     // and its opening sweep reaches further
  team.statueGiant = g;
  G.units.push(g);
  for (let i = 0; i < 4; i++) spawnBurst(s.x + rnd(-40, 40), LANE_TOP - rnd(20, 160), 10, { color: s.stone, speed: 200, up: 140, g: 600, life: 1.4, size: 5 });
  toast(s.team === 0 ? 'Your statue has fallen — the giant within rises to defend you!' : 'The enemy statue has fallen — kill the giant that emerges to win!', 'warn');
}
