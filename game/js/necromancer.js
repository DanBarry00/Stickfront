'use strict';
// Necromancers raise zombies from the ground beside them (a little mana each, up to the pack size)
// and lead them: the pack stays around its master and falls on whatever comes near. A zombie's
// victim rises as another zombie, if there's room in the pack (it counts like any other). Every kill
// the pack makes feeds its master a soul: more souls mean a bigger pack, stronger zombies and faster
// raising, so a Necromancer left alone snowballs. Zombies charge ahead once their side attacks, and
// if their master dies they just attack.

const hordeSize = (team, m) => NECRO.max + (team.upgrades.necromancer.horde ? 2 : 0) + (team.upgrades.necromancer.horde2 ? 2 : 0) +
  (m ? Math.min(NECRO.maxExtra, Math.floor((m.souls || 0) / NECRO.soulsPerSlot)) : 0);
const zombiesOf = u => G.units.filter(z => z.type === 'zombie' && !z.dead && z.necro === u);

// One of the pack made a kill: a soul for its master, and the victim rises if there's room.
function zombieKill(m, victim) {
  const before = m.souls || 0;
  m.souls = Math.min(NECRO.souls, before + 1);
  if (m.team !== 0 && m.souls >= 8 && Math.floor(before / 8) < Math.floor(m.souls / 8)) toast(`An enemy Necromancer's horde is growing (${m.souls} souls): burn it with a Healing Pool, or kill the Necromancer!`, 'warn');
  if (isGiant(victim) || victim.type === 'zombie' || victim.inside || isFlying(victim)) return;
  if (zombiesOf(m).length < hordeSize(G.teams[m.team], m)) raiseZombie(m.team, victim.x, victim.y, m);
}

function raiseZombie(teamId, x, y, necro) {
  const team = G.teams[teamId];
  const z = spawnUnit(team, 'zombie', x, clamp(y, LANE_TOP + 6, LANE_BOT - 6));
  z.necro = necro || null;
  z.zi = necro ? zombiesOf(necro).length : 0;   // its place in the pack
  const power = 1 + NECRO.soulPower * (necro ? necro.souls || 0 : 0);   // the master's souls make it stronger
  z.maxHp *= (team.upgrades.necromancer.grave ? NECRO.graveHp : 1) * power;
  z.hp = z.maxHp;
  z.dmg *= power;
  z.riseT = 0.8;   // clawing its way up out of the ground
  spawnBurst(z.x, z.y - 2, 10, { color: shade(G.map.theme.ground[0], 0.05), speed: 70, up: 60, g: 400, life: 0.7, size: 2.4 });
  return z;
}

function updateNecromancer(u, dt) {
  const team = G.teams[u.team], o = u.order;
  // raise the dead while there's room in the pack and mana to spare
  u.summonT = (u.summonT || 0) - dt;
  if (u.summonT <= 0 && !u.inside && zombiesOf(u).length < hordeSize(team, u) && team.mana >= NECRO.mana && u.swing < 0) {
    u.summonT = (team.upgrades.necromancer.rites ? NECRO.rites : NECRO.summonCd) * Math.max(0.5, 1 - NECRO.soulHaste * (u.souls || 0));
    team.mana -= NECRO.mana;
    startSwing(u, 'summon', null);   // (raised staff: drawn like a cast)
    raiseZombie(u.team, u.x + team.dir * rnd(25, 60), u.y + rnd(-25, 25), u);
  }
  if (u.swing >= 0) return;
  if (o.type === 'refit') return doRefit(u, dt);
  if (handleBlocked(u, dt)) return;
  if (o.type === 'move') { if (moveTo(u, o.x, o.y, dt)) u.order = { type: 'hold', x: o.x, y: o.y }; return; }
  if (o.type === 'hold') { if (u.swing < 0) moveTo(u, o.x, o.y, dt); return; }
  if (o.type === 'attack') {
    // point the pack at the target and follow it in
    if (!isValidTarget(o.target)) { u.order = { type: 'hold', x: u.x, y: u.y }; return; }
    moveTo(u, o.target.x - team.dir * 120, u.y, dt);
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
  // attack: march forward just behind the front of the army and its pack, stopping short of the
  // enemy castle archers' reach
  let lead = null;
  for (const a of G.units) {
    if (a.team !== u.team || a.dead || a.inside || isWorker(a) || a.type === 'necromancer' || isRanged(a)) continue;
    if (!lead || team.dir * (a.x - lead.x) > 0) lead = a;
  }
  const enemy = G.teams[1 - u.team], stopX = enemy.edge(castleArcherStats(enemy).reach + 40);
  let tx = lead ? lead.x - team.dir * 90 : u.x + team.dir * 80;
  if (team.dir * (tx - stopX) > 0) tx = stopX;
  if (moveTo(u, tx, u.slotY, dt)) u.facing = team.dir;
}

function necroKeepRank(u, dt) {
  if (u.groupSlot) keepRank(u, u.order.g, dt);
}

// Is the Necromancer's side on the attack (so its pack charges)?
function necroAttacking(m) {
  const team = G.teams[m.team], o = m.order;
  if (o.type === 'attack') return true;
  if (o.type === 'group') return o.g.mode !== 'retreat';
  return o.type === 'stance' && (m.ownStance || team.stance) === 'attack';
}

// A zombie never marches in formation. While its master holds back, it mills about in front of it
// and falls on any enemy that comes near it; once its side attacks (or its master falls) it just
// runs forward, attacking whatever it meets on the way to the enemy statue. On a retreat it comes back.
function updateZombie(u, dt) {
  if (u.riseT > 0) { u.riseT -= dt; return; }
  if (u.swing >= 0) return;
  if (handleBlocked(u, dt)) return;
  const team = G.teams[u.team], es = G.teams[1 - u.team].statue, m = u.necro && !u.necro.dead ? u.necro : null;
  const retreating = m && ((m.order.type === 'group' && m.order.g.mode === 'retreat') || m.order.type === 'garrison' || (m.order.type === 'stance' && (m.ownStance || team.stance) === 'garrison'));
  if (!retreating && (!m || m.zombieCharge || necroAttacking(m))) {
    const ordered = m && m.order.type === 'attack' && isValidTarget(m.order.target) && canTarget(u, m.order.target) ? m.order.target : null;
    const t = ordered || nearestEnemy(u, u.aggro);
    if (t) return engage(u, t, dt);
    if (!es.dead) return engage(u, es, dt);
    return;
  }
  if (!retreating) {
    // holding: anything that comes near this zombie gets clawed (it won't wander off far)
    const t = nearestEnemy(u, u.aggro);
    if (t && team.dir * (t.x - m.x) < 500) return engage(u, t, dt);
    if (!es.dead && Math.abs(es.x - u.x) < u.range + es.halfW + 10) return engage(u, es, dt);
  }
  // mill about in front of the master
  const k = u.zi || 0, ahead = 40 + (k % 3) * 28, row = Math.floor(k / 3);
  const tx = (m.inside ? team.gateX + team.dir * 40 : m.x) + team.dir * ahead + Math.sin(RT * 0.7 + u.seed) * 6;
  const ty = clamp((m.inside ? LANE_TOP + 40 : m.y) + ((row % 2 ? -1 : 1) * (12 + row * 10)), LANE_TOP + 6, LANE_BOT - 6);
  if (moveTo(u, tx, ty, dt)) u.facing = team.dir;
}
