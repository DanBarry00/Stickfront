'use strict';
// Architects and their works: hidden traps (tar pits and mines), archer towers, repairs, and the
// study that makes upgrades cheaper. Loads after game.js (uses its walls and research helpers).
//
// G.traps: { id, team (-1 = neutral), kind: 'tar' | 'mine', x, y, magic, armed, prog, layer,
//            isTrap, isStructure, hp, halfW, spotted: [bool, bool] }
// G.towers: { isTower, isStructure, team (-1 = neutral), x, y, halfW, hp, max, progress, archer }
// G.tarPools: { team, x, y, r, t, dur, magic }

let NEXT_TRAP = 1;

// ---------------------------------------------------------------- traps

const magicTraps = team => !!team && team.clanKey === 'arcane';   // the Arcane Circle lays magic traps
const trapCost = (team, kind) => Math.round(TRAP[kind].cost * (team.upgrades.architect.traps2 ? TRAP.trapmaker.cost : 1));
const trapCd = (team, kind) => TRAP[kind].cd * (team.upgrades.architect.traps2 ? TRAP.trapmaker.cd : 1);

// Can team lay a trap at x, y? Returns null if so, or the reason it can't.
function trapSpotProblem(team, x, y) {
  if (y < LANE_TOP + 4 || y > LANE_BOT - 4) return 'Traps go in the lane';
  if (team.dir * (x - WORLD_W / 2) > 0) return 'Traps can\'t go past the middle of the map';
  if (team.dir * (x - team.gateX) < 40) return 'Too close to the castle';
  if (Math.abs(x - WORLD_W / 2) < TRAP.midClear) return 'No traps in the middle of the map';
  let line = 0;
  for (const o of G.traps) {
    if (o.dead || (o.team !== team.id && o.team !== -1)) continue;
    const dx = Math.abs(o.x - x);
    if (dx <= TRAP.lineDx) {
      // the same line across the lane: up to lineMax, spread out
      line++;
      if (Math.abs(o.y - y) < TRAP.lineDy) return 'Too close to another trap';
    } else if (dx < TRAP.spacing) return 'Too close to another trap';
  }
  if (line >= TRAP.lineMax) return `Only ${TRAP.lineMax} traps to a line`;
  return null;
}

// Order a trap laid at x, y by the nearest of the builders. Gold and the cooldown are spent now.
// free: materials from a Quartermaster (no cost, no cooldown).
function orderTrap(team, kind, x, y, builders, free) {
  const say = msg => { if (team.id === 0) toast(msg); return null; };
  if (!builders.length) return say('Select architects to lay traps');
  team.trapCd = team.trapCd || {};
  if (!free && (team.trapCd[kind] || 0) > G.time) return say(`${TRAP[kind].name} ready in ${Math.ceil(team.trapCd[kind] - G.time)}s`);
  const problem = trapSpotProblem(team, x, y);
  if (problem) return say(problem);
  if (!free) {
    const cost = trapCost(team, kind);
    if (team.gold < cost) return say('Not enough gold');
    team.gold -= cost;
    team.trapCd[kind] = G.time + trapCd(team, kind);
  }
  const trap = addTrap(team.id, kind, x, y, false, magicTraps(team));
  const u = builders.slice().sort((a, b) => Math.abs(a.x - x) - Math.abs(b.x - x))[0];
  trap.layer = u;
  setOrder(u, { type: 'trap', trap });
  return trap;
}


// A free trap from a Quartermaster's materials: a random kind, somewhere ahead of the defend line
// where the spacing rules allow. Returns false when there's nowhere to put it.
function layFreeTrap(u, team) {
  const kind = chance(0.5) ? 'tar' : 'mine', line = defendLine(team);
  for (let tries = 0; tries < 10; tries++) {
    const x = line + team.dir * rnd(60, 300), y = rowY(rndi(0, LANE_ROWS - 1));
    if (!trapSpotProblem(team, x, y)) return !!orderTrap(team, kind, x, y, [u], true);
  }
  return false;
}
function addTrap(teamId, kind, x, y, armed, magic) {
  const trap = { id: NEXT_TRAP++, team: teamId, kind, x, y, magic: !!magic, armed, prog: armed ? 1 : 0, layer: null, isTrap: true, isStructure: true, hp: 20, max: 20, halfW: 8, dead: false, flash: 0, stone: '#4a3a2a', spotted: [false, false] };
  G.traps.push(trap);
  return trap;
}

// The architect walks to the spot and works the trap into the ground.
function doLayTrap(u, team, dt) {
  const trap = u.order.trap;
  if (!trap || trap.dead || trap.armed) { setOrder(u, { type: 'stance' }); return; }
  if (u.swing >= 0) return;
  if (!moveTo(u, trap.x - team.dir * 14, trap.y, dt)) return;
  u.facing = team.dir;
  u.laying = true;
  trap.prog += dt / TRAP.layTime;
  if (trap.prog >= 1) {
    trap.armed = true;
    trap.layer = null;
    u.laying = false;
    if (team.id === 0) floatText(trap.x, trap.y - 30, `${TRAP[trap.kind].name} set`, '#c9b27a');
    setOrder(u, { type: 'stance' });
  }
}

// Who sets traps off: soldiers and miners on foot. Ninjas and saboteurs step lightly; flyers soar over.
const triggersTraps = u => !u.dead && !u.inside && !isFlying(u) && u.type !== 'ninja' && u.type !== 'saboteur' && u.type !== 'flyer' && u.type !== 'firebird';
const trapFoe = (trap, u) => trap.team === -1 || u.team !== trap.team;

function updateTraps(dt) {
  for (const trap of G.traps) {
    if (trap.dead) continue;
    // a trap whose layer gave up (died or was sent elsewhere) is lost
    if (!trap.armed) {
      if (!trap.layer || trap.layer.dead || trap.layer.order.trap !== trap) trap.dead = true;
      continue;
    }
    const reach = trap.kind === 'tar' ? TRAP.tar.coverR : TRAP.trigger;   // anywhere on the tar pit's thatch gives way
    const victim = G.units.find(u => triggersTraps(u) && trapFoe(trap, u) && Math.abs(u.x - trap.x) < reach && Math.abs(u.y - trap.y) < (trap.kind === 'tar' ? 16 : 14));
    if (victim) springTrap(trap);
  }
  G.traps = G.traps.filter(t => !t.dead);
  // tar pools: slow (and, magic, burn) whoever wades through
  for (const p of G.tarPools) {
    p.t += dt;
    p.burnT = (p.burnT || 0) + dt;
    const burn = p.magic && p.burnT >= 0.5;
    if (burn) p.burnT = 0;
    for (const u of G.units) {
      if (u.dead || u.inside || isFlying(u) || !trapFoe(p, u)) continue;
      if (((u.x - p.x) / p.r) ** 2 + ((u.y - p.y) / (p.r * 0.45)) ** 2 > 1) continue;
      u.tarT = 0.25;
      if (burn) damage(u, TRAP.tar.magicDps * 0.5, trapSource(p), true);
    }
  }
  G.tarPools = G.tarPools.filter(p => p.t < p.dur);
}

// Kills by a trap are credited to its side (neutral traps credit nobody).
function trapSource(trap) {
  return trap.team < 0 ? null : { team: trap.team, type: trap.kind === 'mine' ? 'mine' : 'tar', isStructure: true, x: trap.x, y: trap.y };
}

function springTrap(trap) {
  trap.dead = true;
  if (trap.kind === 'tar') {
    G.tarPools.push({ team: trap.team, x: trap.x, y: trap.y, r: TRAP.tar.poolR, t: 0, dur: TRAP.tar.poolTime, magic: trap.magic });
    spawnBurst(trap.x, trap.y - 4, 12, { color: '#1a1410', speed: 90, up: 70, g: 500, life: 0.7, size: 3 });
    if (trap.magic) spawnBurst(trap.x, trap.y - 6, 8, { color: '#b066e8', speed: 70, up: 60, g: 200, life: 0.6, size: 2 });
    return;
  }
  // the mine: a blast that throws everyone near it about
  const dmg = TRAP.mine.dmg * (trap.magic ? TRAP.mine.magicMul : 1), src = trapSource(trap);
  for (const u of G.units.slice()) {
    if (u.dead || u.inside || isFlying(u) || !trapFoe(trap, u)) continue;
    const d = Math.abs(u.x - trap.x) + Math.abs(u.y - trap.y) * 0.6;
    if (d > TRAP.mine.blastR) continue;
    damage(u, dmg * (1 - 0.5 * d / TRAP.mine.blastR), src, true);
    if (!u.dead) knock(u, { x: trap.x, facing: 1 }, TRAP.mine.knock, 0.5);
  }
  spawnBurst(trap.x, trap.y - 6, 22, { color: trap.magic ? '#c08cff' : '#ff9a3a', speed: 190, up: 140, g: 450, life: 0.7, size: 2.6 });
  spawnBurst(trap.x, trap.y - 6, 12, { color: '#3a2e26', speed: 120, up: 160, g: 400, life: 1, size: 3.5 });
  G.spellFx.push({ kind: 'blast', x: trap.x, y: trap.y, r: TRAP.mine.blastR, t: 0, max: 0.45 });
  addDecal(trap.x, trap.y + 2, 14, 0.5);
}

function destroyTrap(trap) {
  trap.dead = true;
  spawnBurst(trap.x, trap.y - 4, 8, { color: '#6a5a44', speed: 80, up: 60, g: 400, life: 0.5, size: 2 });
}

// Saboteurs sniff out enemy traps nearby, show them to their side, and smash them.
function saboteurHunt(u) {
  if (u.order.type === 'attack' || u.order.type === 'salt' || u.order.type === 'refit' || u.inside) return;
  let best = null, bd = TRAP.sabSight;
  for (const trap of G.traps) {
    if (trap.dead || !trap.armed || trap.team === u.team) continue;
    const d = Math.abs(trap.x - u.x) + Math.abs(trap.y - u.y) * 0.5;
    if (d < TRAP.sabSight) trap.spotted[u.team] = true;
    if (d < bd) { bd = d; best = trap; }
  }
  if (best) setOrder(u, { type: 'attack', target: best });
}

// ---------------------------------------------------------------- archer towers

const towerRange = team => TOWER.range + (team && team.upgrades.architect.tower3 ? TOWER.range3 : 0);
const towerMaxHp = team => Math.round(TOWER.hp * (team && team.upgrades.architect.tower2 ? TOWER.hp2 : 1));

function towerSpotProblem(team, x, y) {
  if (y < LANE_TOP + 4 || y > LANE_BOT - 4) return 'Towers go in the lane';
  if (team.dir * (x - WORLD_W / 2) > 0) return 'Towers can\'t go past the middle of the map';
  if (team.dir * (x - team.gateX) < 60) return 'Too close to the castle';
  if (G.towers.filter(t => (!t.dead || t.ruin) && t.team === team.id).length >= TOWER.max) return `Tower limit reached (${TOWER.max}): rebuild a ruined one instead`;
  if (G.towers.some(t => (!t.dead || t.ruin) && Math.abs(t.x - x) < 70)) return 'Too close to another tower';
  if (G.walls.some(w => !w.dead && Math.abs(w.x - x) < 50)) return 'Too close to a trench';
  return null;
}

// Order a tower raised at x, y. free: a clan's starting tower (no checks, no cost, already standing).
function orderTower(team, x, y, builders, free) {
  const say = msg => { if (team.id === 0) toast(msg); return null; };
  if (!free) {
    if (!builders.length) return say('Select architects to build a tower');
    const problem = towerSpotProblem(team, x, y);
    if (problem) return say(problem);
    if (team.gold < TOWER.cost) return say('Not enough gold');
    team.gold -= TOWER.cost;
  }
  const t = addTower(team.id, x, y, free, team);
  for (const u of builders) setOrder(u, { type: 'build', wall: t });
  return t;
}

function addTower(teamId, x, y, built, team) {
  y = towerY();   // always at the back of the lane, so it never hides the fighting
  const max = towerMaxHp(team);
  const t = { isTower: true, isStructure: true, team: teamId, x, y, halfW: 20, hp: built ? max : 1, max, progress: built ? 1 : 0, dead: false, flash: 0, stone: '#6a4a2c', archers: [null] };
  G.towers.push(t);
  return t;
}

// Who's in a tower: tw.archers holds one slot (two for the Monolith's), each an archer or null.
const towerSlots = tw => (tw.mid ? TOWER.mid.slots : 1);
const towerCrew = tw => tw.archers.filter(a => a && !a.dead);
const towerHolder = tw => { const c = towerCrew(tw); return c.length ? c[0].team : -1; };   // a side, NEUTRAL, or -1 when empty
const towerSlotDx = (tw, i) => (tw.mid ? (i ? 30 : -30) : 0);   // the Monolith's archers stand on either pier
// Room for u: a free slot, and nobody else in it but its own side.
const towerHasRoom = (tw, u) => { const c = towerCrew(tw).filter(a => a !== u); return c.length < towerSlots(tw) && c.every(a => a.team === u.team); };

// An archer climbs into a tower (its own side's, or the Monolith's once nobody else holds it) and shoots from it.
function postArcher(u, tower) {
  if (!tower || tower.dead || tower.progress < 1) return false;
  if (tower.team !== -1 && tower.team !== u.team) return false;
  if (!towerHasRoom(tower, u)) return false;
  setOrder(u, { type: 'tower', tower });
  return true;
}

function doTower(u, team, dt) {
  const tw = u.order.tower;
  if (!tw || tw.dead || (u.onTower !== tw && !towerHasRoom(tw, u))) { setOrder(u, { type: 'stance' }); return; }
  if (u.onTower !== tw) {
    const i = tw.archers.findIndex(a => !a || a.dead);
    if (!moveTo(u, tw.x + towerSlotDx(tw, i), tw.y + 2, dt)) return;
    // climb up: the tower's reach is added to the archer's own
    u.onTower = tw;
    u.towerSlot = i;
    tw.archers[i] = u;
    u.towerBonus = tw.mid ? TOWER.mid.range : towerRange(team);   // the Monolith's stone tower reaches furthest
    u.range += u.towerBonus;
    u.aggro = Math.max(u.aggro, u.range + 40);
  }
  u.x = tw.x + towerSlotDx(tw, u.towerSlot);
  u.y = tw.y + 2;
  const t = nearestEnemy(u, u.range + 10);
  if (t && inReach(u, t, 0)) return engage(u, t, dt);
  const es = G.teams[1 - u.team].statue;
  if (!es.dead && inReach(u, es, 0)) engage(u, es, dt);
}

function leaveTower(u) {
  const tw = u.onTower;
  if (!tw) return;
  u.range -= u.towerBonus || 0;
  u.towerBonus = 0;
  u.onTower = null;
  if (tw.archers[u.towerSlot] === u) tw.archers[u.towerSlot] = null;
}

// The Monolith tower's own two archers, at the start of a game: they shoot at anyone in reach.
function manNeutralTower(tw) {
  for (let i = 0; i < towerSlots(tw); i++) {
    const a = new Unit('archer', NEUTRAL, tw.x + towerSlotDx(tw, i), tw.y + 2, {});
    a.dmg = TOWER.mid.neutral.dmg;
    a.towerBonus = TOWER.mid.neutral.range;
    a.range += a.towerBonus;
    a.aggro = a.range + 40;
    a.onTower = tw;
    a.towerSlot = i;
    a.order = { type: 'neutral' };
    tw.archers[i] = a;
    G.units.push(a);
  }
}

// A neutral archer just stands its ground on the tower and shoots the nearest soldier of either side.
function updateNeutralArcher(u) {
  const tw = u.onTower;
  if (!tw || tw.dead) { killUnit(u, null); return; }
  u.x = tw.x + towerSlotDx(tw, u.towerSlot);
  u.y = tw.y + 2;
  if (u.swing >= 0 || u.atkCd > 0 || u.stunT > 0) return;
  const t = nearestEnemy(u, u.range);
  if (t && inReach(u, t, 0)) {
    u.facing = t.x >= u.x ? 1 : -1;
    startSwing(u, 'shoot', t);
  }
}

// A tower falls. Brought down by melee troops, the archers inside go down with it (the Monolith's
// neutral archers fall with their tower however it comes down).
function destroyTower(tw, src) {
  tw.dead = true;
  tw.ruin = true;   // the wreck stays, to be rebuilt cheaply
  tw.hp = 0;
  for (let k = 0; k < 4; k++) spawnBurst(tw.x + rnd(-12, 12), tw.y - rnd(10, 50), 8, { color: '#6a4a2c', speed: 150, up: 120, g: 600, life: 1, size: 3.5 });
  for (const a of towerCrew(tw)) {
    leaveTower(a);
    if (a.team === NEUTRAL || (src && !src.isStructure && !src.castle && !isRanged(src))) {
      if (a.team === 0) floatText(a.x, a.y - 70, 'Crushed!', '#e0503a');
      a.hp = 0;
      killUnit(a, a.team === NEUTRAL ? null : src);
    } else setOrder(a, { type: 'stance' });
  }
  if (tw.team === 0) toast('An archer tower has fallen', 'warn');
}

// The neutral stone tower at the Monolith: tougher than any tower a side can raise, and an archer
// posted in it reaches further and is better covered. Either side can post an archer in it, and
// either side's architects can rebuild it when it's wrecked.
function makeMidTower(t) {
  t.mid = true;
  t.max = t.hp = TOWER.mid.hp;
  t.stone = '#7a746a';
  t.halfW = 32;
  t.archers = new Array(TOWER.mid.slots).fill(null);   // room for two, one on each pier beside the Monolith's tip
  return t;
}

// The price of rebuilding a ruin: a fraction of building it new (the Monolith's tower has its own).
const rebuildCost = s => (s.mid ? TOWER.mid.rebuild : Math.round((s.isTower ? TOWER.cost : WALL_COST) * REBUILD));

// Architects clear a ruin and raise it again, for much less than a new one. Your own ruins, or
// the Monolith's tower (anyone's to rebuild).
function rebuildStructure(team, s, builders) {
  const say = msg => { if (team.id === 0) toast(msg); return null; };
  if (!s || !s.ruin) return null;
  if (s.team !== team.id && !(s.mid && s.team === -1)) return say('That ruin isn\'t yours to rebuild');
  if (!builders.length) return say('Select architects to rebuild it');
  const cost = rebuildCost(s);
  if (team.gold < cost) return say(`Rebuilding costs ${cost} gold`);
  team.gold -= cost;
  s.dead = false;
  s.ruin = false;
  s.progress = 0;
  s.hp = 1;
  s.flash = 0;
  if (s.isTower) {
    s.max = s.mid ? TOWER.mid.hp : towerMaxHp(team);
    s.archer = null;
  } else {
    s.max = WALL_HP;
    s.tier = 1;
    s.reinforcing = false;
    s.rprog = 0;
    s.guards = [];
  }
  for (const u of builders) setOrder(u, { type: 'build', wall: s });
  if (team.id === 0) toast(`Rebuilding (${cost} gold)`);
  return s;
}

// Send builders to the most damaged of the team's finished structures (trenches and towers).
function repairStructures(team, builders) {
  const hurt = [...G.walls, ...G.towers].filter(w => w.team === team.id && !w.dead && w.progress >= 1 && w.hp < w.max);
  if (!hurt.length) return null;
  const w = hurt.sort((a, b) => a.hp / a.max - b.hp / b.max)[0];
  for (const u of builders) setOrder(u, { type: 'build', wall: w });
  return w;
}

// ---------------------------------------------------------------- the architect

function updateArchitect(u, dt) {
  const team = G.teams[u.team], o = u.order;
  u.retaliateT -= dt;
  u.laying = false;
  if (o.type === 'refit') return doRefit(u, dt);
  if (handleBlocked(u, dt)) return;
  if (o.type === 'attack') {
    if (isValidTarget(o.target)) return engage(u, o.target, dt);
    u.order = { type: 'stance' };
    return;
  }
  if (o.type === 'move') {
    if (moveTo(u, o.x, o.y, dt)) u.order = { type: 'hold', x: o.x, y: o.y };
    return;
  }
  // swings back at whoever hits it while they're close
  const foe = u.lastAttacker;
  if (u.retaliateT > 0 && !u.inside && isValidTarget(foe) && Math.abs(foe.x - u.x) < 110) return engage(u, foe, dt);
  if (o.type === 'hold') return;
  if (o.type === 'build') return doBuild(u, team, dt);
  if (o.type === 'trap') return doLayTrap(u, team, dt);
  if (o.type === 'garrison' || team.stance === 'garrison' || team.minersIn || u.ownStance === 'garrison') return goGarrison(u, dt);
  // materials from a Quartermaster: lay a free trap of a random kind ahead of the line
  if (u.materials > 0 && layFreeTrap(u, team)) { u.materials--; return; }
  // nothing to do: wait behind the statue, studying
  if (u.swing < 0) moveTo(u, team.statue.x - team.dir * (34 + (u.id % 3) * 14), LANE_TOP + 10 + (u.id % 4) * 9, dt);
}

// ---------------------------------------------------------------- study: cheaper upgrades

// The price of an upgrade after the architects' discount (team.discount['type:key'] = 0..max).
function upgradePrice(team, type, def) {
  const d = (team.discount && team.discount[`${type}:${def.key}`]) || 0;
  return { gold: Math.round(def.cost * (1 - d)), mana: Math.round((def.mana || 0) * (1 - d)), off: d };
}

// Idle architects (standing by with nothing to build, or in the castle) slowly find savings.
function updateStudy(team, dt) {
  let rate = 0;
  for (const u of G.units) {
    if (u.team !== team.id || u.dead || u.type !== 'architect') continue;
    if (u.inside) rate += ARCH_RESEARCH.garrisonMul;
    else if ((u.order.type === 'stance' || u.order.type === 'hold') && !u.moving) rate += 1;
  }
  if (!rate) return;
  team.studyT = (team.studyT || 0) + rate * dt;
  if (team.studyT < ARCH_RESEARCH.time) return;
  team.studyT -= ARCH_RESEARCH.time;
  if (!studyFocused(team)) discountRandomUpgrade(team, ARCH_RESEARCH.step, true);
}

// The upgrade the player set the architects to study (the book on its button), if it's still worth
// studying: not researched yet and not already as cheap as study can make it.
function studyFocusOk(team) {
  const f = team.studyFocus;
  if (!f) return false;
  const [type, key] = f.split(':');
  return !team.upgrades[type][key] && !(team.research[type] && team.research[type].key === key) && ((team.discount || {})[f] || 0) < ARCH_RESEARCH.max - 1e-6;
}

// Studying a chosen upgrade knocks its price down; once it's as cheap as it gets, study goes back to
// random upgrades.
function studyFocused(team) {
  if (!studyFocusOk(team)) { team.studyFocus = null; return false; }
  const f = team.studyFocus, [type, key] = f.split(':'), def = upgradeDef(type, key);
  team.discount = team.discount || {};
  team.discount[f] = Math.min(ARCH_RESEARCH.max, (team.discount[f] || 0) + ARCH_RESEARCH.step);
  if (team.id === 0) toast(`Your architects' study: ${def.name} is now ${Math.round(team.discount[f] * 100)}% cheaper`);
  if (!studyFocusOk(team)) team.studyFocus = null;
  return true;
}

// Set (or clear, clicking the same one again) the upgrade the architects study.
function setStudyFocus(team, type, key) {
  const f = `${type}:${key}`;
  if (team.studyFocus === f) { team.studyFocus = null; if (team.id === 0) toast('Architects: back to studying anything that helps'); return; }
  team.studyFocus = f;
  if (!studyFocusOk(team)) { team.studyFocus = null; if (team.id === 0) toast(team.upgrades[type][key] ? 'Already researched' : 'Study can\'t make that any cheaper'); return; }
  if (team.id === 0) toast(`Architects will study ${upgradeDef(type, key).name} (up to ${Math.round(ARCH_RESEARCH.max * 100)}% off)`);
}

function discountRandomUpgrade(team, step, announce) {
  team.discount = team.discount || {};
  const options = [];
  for (const type of RESEARCH_TYPES) {
    if (type !== 'castle' && !canTrain(team, type)) continue;
    for (const def of UPGRADES[type]) {
      const k = `${type}:${def.key}`;
      if (team.upgrades[type][def.key] || upgradeLocked(team, type, def.key) || (team.discount[k] || 0) >= ARCH_RESEARCH.max - 1e-6) continue;
      options.push([k, def]);
    }
  }
  if (!options.length) return null;
  const [k, def] = pick(options);
  team.discount[k] = Math.min(ARCH_RESEARCH.max, (team.discount[k] || 0) + step);
  if (announce && team.id === 0) toast(`Your architects found savings: ${def.name} is now ${Math.round(team.discount[k] * 100)}% cheaper`);
  return def;
}

// ---------------------------------------------------------------- setup

// Lay a trap straight away (a clan's or a map's starting traps).
function freeTrap(teamId, kind, x, y) {
  return addTrap(teamId, kind, x, y, true, teamId >= 0 && magicTraps(G.teams[teamId]));
}

// Neutral works from the map: hidden traps either side can set off, and an archer tower by the
// Monolith that whichever side posts an archer in it first can use.
function spawnNeutralWorks(map) {
  for (const t of map.traps || []) freeTrap(-1, t.kind, t.x, t.y);
  if (G.shrine) manNeutralTower(makeMidTower(addTower(-1, G.shrine.x, LANE_BOT - 6, true, null)));   // manned by two neutral archers to start
}

// Very Hard's head start: its architects have been busy before the battle (a quarter off four
// random upgrades) and three traps already lie in front of its line.
function veryHardHeadStart(team) {
  for (let i = 0; i < 4; i++) discountRandomUpgrade(team, 0.25, false);
  [[1150, 1], [1240, 4], [1330, 2]].forEach(([x, row]) => freeTrap(team.id, pick(['tar', 'mine']), team.edge(x), rowY(row)));
}
