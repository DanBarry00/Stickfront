'use strict';
// Giants: obedience (shown as chains), their own mind, smashing impacts, and the giant sealed in every statue.

// Protein Diet tier (the statue's giant is one size past the last tier).
const giantTier = u => (u.perks.statue ? STATUE_GIANT_TIER : u.perks.protein3 ? 3 : u.perks.protein2 ? 2 : u.perks.protein ? 1 : 0);

// How well a giant listens: more friendly troops nearby means more control; blinders help a lot.
function giantObedience(u) {
  if (u.isStatueGiant) return 0;
  let n = 0;
  for (const o of G.units) {
    if (o.team === u.team && !o.dead && !o.inside && o.type !== 'miner' && !isGiant(o) && Math.abs(o.x - u.x) < 280) n++;
  }
  return clamp(0.25 + 0.09 * Math.min(n, 7) + (u.perks.blinders ? 0.25 : 0), 0.1, 0.97);
}
const giantChains = u => (u.isStatueGiant ? 0 : Math.round(u.obey * 5));

// Giants ignore taunts and go for whoever has the most health.
function biggestFoe(u, range) {
  let best = null, bh = -1;
  for (const e of G.units) {
    if (e.team === u.team || e.dead || e.inside) continue;
    if (Math.abs(e.x - u.x) > range || Math.abs(e.y - u.y) > 140) continue;
    if (e.hp > bh) { bh = e.hp; best = e; }
  }
  return best;
}

function updateGiant(u, dt) {
  const team = G.teams[u.team], o = u.order, es = G.teams[1 - u.team].statue;
  u.obeyT -= dt;
  if (u.obeyT <= 0) { u.obeyT = 0.5; u.obey = giantObedience(u); }
  u.confusedT -= dt;
  u.confuseCd -= dt;
  if (o.type === 'refit' && !u.isStatueGiant) return doRefit(u, dt);
  if (handleBlocked(u, dt)) return;

  // confused by arrows: lash out at whoever is closest, friend or foe
  if (u.confusedT > 0) {
    let near = null, nd = 90;
    for (const e of G.units) {
      if (e === u || e.dead || e.inside || isGiant(e)) continue;
      const d = Math.abs(e.x - u.x) + Math.abs(e.y - u.y) * 0.5;
      if (d < nd) { nd = d; near = e; }
    }
    if (near) return engage(u, near, dt);
    if (u.swing < 0) moveTo(u, u.x + Math.sin(RT * 1.3 + u.seed) * 40, u.y, dt);
    return;
  }

  // a mind of its own: every few seconds a poorly chained giant may charge off or refuse to budge
  u.mindT -= dt;
  if (u.mindT <= 0) {
    u.mindT = rnd(3, 5);
    u.rogue = u.isStatueGiant ? 'charge' : chance(1 - u.obey) ? (chance(0.55) ? 'charge' : 'stay') : null;
  }
  const t = biggestFoe(u, u.aggro);
  if (u.rogue === 'charge') {
    if (t) return engage(u, t, dt);
    if (!es.dead) return engage(u, es, dt);
    if (u.swing < 0) moveTo(u, G.teams[1 - u.team].gateX + team.dir * 60, u.y, dt);
    return;
  }
  // anything that wanders into arm's reach gets smashed
  if (t && Math.abs(t.x - u.x) < u.range + 60) return engage(u, t, dt);
  if (u.rogue === 'stay') return;

  // with blinders the player can steer it
  if (u.perks.blinders && (o.type === 'move' || o.type === 'hold')) {
    if (o.type === 'move') { if (moveTo(u, o.x, o.y, dt)) u.order = { type: 'hold', x: o.x, y: o.y }; }
    else if (u.swing < 0) moveTo(u, o.x, o.y, dt);
    return;
  }

  // follow the troops around it, staying near the front of them
  const friends = G.units.filter(f => f.team === u.team && !f.dead && !f.inside && f.type !== 'miner' && !isGiant(f) && Math.abs(f.x - u.x) < 500);
  if (friends.length) {
    const front = team.dir > 0 ? Math.max(...friends.map(f => f.x)) : Math.min(...friends.map(f => f.x));
    const fighting = friends.some(f => f.grpFighting || (f.swing >= 0 && (f.swingKind === 'attack' || f.swingKind === 'shoot')));
    if (t && fighting) return engage(u, t, dt);
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

// A giant is 3 formation rows wide, so two stand side by side across the lane (top and bottom
// half) and further giants form columns behind them. giantIdx is assigned in assignDefendSlots.
function giantSlot(u) {
  const i = u.giantIdx || 0;
  return { y: rowY(i % 2 === 0 ? 1 : 4), back: Math.floor(i / 2) * GIANT_COL_GAP };
}

// Knock a unit away from the source and stun it. Giants stand firm.
function knock(t, src, dist, stun) {
  if (t.dead || t.isStructure || isGiant(t)) return;
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
      if (e === t || e.team === u.team || e.dead || e.inside || Math.abs(e.x - u.x) > 160 || Math.abs(e.y - u.y) > 90) continue;
      damage(e, amt * 0.6, u);
      knock(e, u, 100, 2.5);
    }
    knock(t, u, 100, 2.5);
    G.spellFx.push({ kind: 'ring', x: u.x, y: u.y, r: 160, color: '#b8a27a', t: 0, max: 0.7 });
    floatText(u.x, u.y - 40 - 70 * u.scale, 'SWEEP!', '#e0bf5a');
    return;
  }
  if (isGiant(t)) return;   // giant on giant: no splash
  const side = G.units
    .filter(e => e !== t && e.team === t.team && !e.dead && !e.inside && Math.abs(e.x - t.x) < 60 && Math.abs(e.y - t.y) < 40)
    .sort((a, b) => Math.abs(a.x - t.x) + Math.abs(a.y - t.y) - (Math.abs(b.x - t.x) + Math.abs(b.y - t.y)))
    .slice(0, 2);
  for (const e of side) damage(e, amt * GIANT_SPLASH, u);
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
  team.statueGiant = g;
  G.units.push(g);
  for (let i = 0; i < 4; i++) spawnBurst(s.x + rnd(-40, 40), LANE_TOP - rnd(20, 160), 10, { color: s.stone, speed: 200, up: 140, g: 600, life: 1.4, size: 5 });
  toast(s.team === 0 ? 'Your statue has fallen — the giant within rises to defend you!' : 'The enemy statue has fallen — kill the giant that emerges to win!', 'warn');
}
