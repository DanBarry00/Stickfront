'use strict';
// Necromancers raise zombies from the ground beside them (a little mana each, up to the horde size)
// and lead them: the pack stays around its master and falls on whatever comes near. A zombie's
// victim rises as another zombie. If the Necromancer dies, its zombies just attack.

const hordeSize = team => NECRO.max + (team.upgrades.necromancer.horde ? 2 : 0) + (team.upgrades.necromancer.horde2 ? 2 : 0);
const zombiesOf = u => G.units.filter(z => z.type === 'zombie' && !z.dead && z.necro === u);

function raiseZombie(teamId, x, y, necro) {
  const team = G.teams[teamId];
  const z = spawnUnit(team, 'zombie', x, clamp(y, LANE_TOP + 6, LANE_BOT - 6));
  z.necro = necro || null;
  z.zi = necro ? zombiesOf(necro).length : 0;   // its place in the pack
  if (team.upgrades.necromancer.grave) { z.maxHp *= NECRO.graveHp; z.hp = z.maxHp; }
  z.riseT = 0.8;   // clawing its way up out of the ground
  spawnBurst(z.x, z.y - 2, 10, { color: shade(G.map.theme.ground[0], 0.05), speed: 70, up: 60, g: 400, life: 0.7, size: 2.4 });
  return z;
}

function updateNecromancer(u, dt) {
  const team = G.teams[u.team], o = u.order;
  // raise the dead while there's room in the pack and mana to spare
  u.summonT = (u.summonT || 0) - dt;
  if (u.summonT <= 0 && !u.inside && zombiesOf(u).length < hordeSize(team) && team.mana >= NECRO.mana && u.swing < 0) {
    u.summonT = team.upgrades.necromancer.rites ? NECRO.rites : NECRO.summonCd;
    team.mana -= NECRO.mana;
    startSwing(u, 'summon', null);   // (raised staff: drawn like a cast)
    raiseZombie(u.team, u.x + team.dir * rnd(25, 60), u.y + rnd(-25, 25), u);
  }
  if (u.swing >= 0) return;
  if (o.type === 'refit') return doRefit(u, dt);
  if (handleBlocked(u, dt)) return;
  // keep out of reach: back away from anything that gets close
  const foe = G.units.find(e => e.team !== u.team && !e.dead && !e.inside && !isWorker(e) && Math.abs(e.x - u.x) < 80 && Math.abs(e.y - u.y) < 60);
  if (foe && !u.inside) { moveTo(u, u.x - team.dir * 60, u.y, dt); return; }
  if (o.type === 'move') { if (moveTo(u, o.x, o.y, dt)) u.order = { type: 'hold', x: o.x, y: o.y }; return; }
  if (o.type === 'hold') { if (u.swing < 0) moveTo(u, o.x, o.y, dt); return; }
  if (o.type === 'attack') {
    // point the pack at the target, from a safe distance behind it
    if (!isValidTarget(o.target)) { u.order = { type: 'hold', x: u.x, y: u.y }; return; }
    moveTo(u, o.target.x - team.dir * 160, u.y, dt);
    return;
  }
  if (o.type === 'group') return necroKeepRank(u, dt);
  const stance = u.ownStance || team.stance;
  if (o.type === 'garrison' || stance === 'garrison') return goGarrison(u, dt);
  if (stance === 'defend') {
    const s = rankSlot('necromancer', u.slotIdx, team.slotCount.necromancer || 1, defendLine(team), team.dir, team);
    if (moveTo(u, s.x, s.y, dt)) u.facing = team.dir;
    return;
  }
  // attack: follow the army a little behind its front (or creep toward the enemy behind the pack)
  let lead = null;
  for (const a of G.units) {
    if (a.team !== u.team || a.dead || a.inside || isWorker(a) || a.type === 'necromancer' || a.type === 'zombie' || isRanged(a)) continue;
    if (!lead || team.dir * (a.x - lead.x) > 0) lead = a;
  }
  const front = lead ? lead.x : u.x + team.dir * 60;
  const es = G.teams[1 - u.team].statue;
  const stop = es.dead ? Infinity : team.dir * (es.x - front);
  moveTo(u, stop < 200 ? u.x : front - team.dir * 110, u.slotY, dt);
}

function necroKeepRank(u, dt) {
  if (u.groupSlot) keepRank(u, u.order.g, dt);
}

// A zombie: shamble along with its master and fall on anything that comes near the pack; with its
// master gone, lurch off toward the enemy statue, attacking whatever it meets.
function updateZombie(u, dt) {
  if (u.riseT > 0) { u.riseT -= dt; return; }
  if (u.swing >= 0) return;
  if (handleBlocked(u, dt)) return;
  const team = G.teams[u.team], es = G.teams[1 - u.team].statue, m = u.necro;
  if (!m || m.dead) {
    const t = nearestEnemy(u, u.aggro);
    if (t) return engage(u, t, dt);
    if (!es.dead) return engage(u, es, dt);
    return;
  }
  // the master's chosen target, else whatever threatens the pack
  const ordered = m.order.type === 'attack' && isValidTarget(m.order.target) ? m.order.target : null;
  if (ordered && canTarget(u, ordered)) return engage(u, ordered, dt);
  let best = null, bd = 1e9;
  for (const e of G.units) {
    if (e.team === u.team || !canTarget(u, e) || isFlying(e)) continue;
    if (Math.abs(e.x - m.x) > NECRO.leash + 90) continue;
    const d = Math.abs(e.x - u.x) + Math.abs(e.y - u.y) * 0.5;
    if (d < bd) { bd = d; best = e; }
  }
  if (best) return engage(u, best, dt);
  if (!es.dead && Math.abs(es.x - u.x) < u.range + es.halfW + 10) return engage(u, es, dt);
  // mill about in front of the master
  const k = u.zi || 0, ahead = 40 + (k % 3) * 28, row = Math.floor(k / 3);
  const tx = (m.inside ? team.gateX + team.dir * 40 : m.x) + team.dir * ahead + Math.sin(RT * 0.7 + u.seed) * 6;
  const ty = clamp((m.inside ? LANE_TOP + 40 : m.y) + ((row % 2 ? -1 : 1) * (12 + row * 10)), LANE_TOP + 6, LANE_BOT - 6);
  if (moveTo(u, tx, ty, dt)) u.facing = team.dir;
}
