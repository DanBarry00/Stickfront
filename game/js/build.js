'use strict';
// Architects and their works: hidden traps, archer towers, repairs, and the study that makes
// upgrades cheaper. The Castle Wizard's runes are traps too (laid, sprung and found the same way);
// its other work is in wizard.js. Loads after game.js (uses its walls and research helpers).
//
// G.traps: { id, team (-1 = neutral), kind (ARCH_TRAPS or WIZ_RUNES), x, y, magic (enchanted),
//            reinforced (a rune an Architect has reinforced), armed, prog, layer, sprung (a spike pit
//            waiting to be re-armed), isTrap, isStructure, hp, halfW, spotted: [bool, bool] }
// G.towers: { isTower, isStructure, team (-1 = neutral), x, y, halfW, hp, max, progress, archers,
//            ward, wizard / converting (wizard.js) }
// G.tarPools: { team, kind: 'tar' | 'caltrops', x, y, r, t, dur, magic }

let NEXT_TRAP = 1;

// ---------------------------------------------------------------- traps

// Architects' traps cost gold, runes mana; Trapmaker and Runecraft make them cheaper and quicker.
const trapCost = (team, kind) => isRune(kind)
  ? Math.round(RUNE[kind].mana * (team.upgrades.wizard.runecraft ? TRAP.trapmaker.cost : 1))
  : Math.round(TRAP[kind].cost * (team.upgrades.architect.traps2 ? TRAP.trapmaker.cost : 1));
const trapCd = (team, kind) => trapDef(kind).cd * ((isRune(kind) ? team.upgrades.wizard.runecraft : team.upgrades.architect.traps2) ? TRAP.trapmaker.cd : 1);
const trapCount = team => G.traps.filter(t => !t.dead && t.team === team.id).length;
// Who works a trap: the Architect lays traps, the Castle Wizard runes.
const trapLayerType = kind => (isRune(kind) ? 'wizard' : 'architect');
// The Arcane Circle's runes reach further and last longer.
const runeMul = teamId => (teamId >= 0 && G.teams[teamId].clanKey === 'arcane' ? RUNE.arcane : 1);

// Can team lay a trap at x, y? Returns null if so, or the reason it can't.
function trapSpotProblem(team, x, y) {
  if (y < LANE_TOP + 4 || y > LANE_BOT - 4) return 'Traps go in the lane';
  if (team.dir * (x - WORLD_W / 2) > 0) return 'Traps can\'t go past the middle of the map';
  if (team.dir * (x - team.gateX) < 40) return 'Too close to the castle';
  if (Math.abs(x - WORLD_W / 2) < TRAP.midClear) return 'No traps in the middle of the map';
  if (trapCount(team) >= trapMax(team)) return `Trap limit reached (${trapMax(team)} traps and runes)`;
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

// Order a trap (or rune) laid at x, y by the nearest of the builders that can lay it. Its price and
// the cooldown are spent now. free: materials or reagents from a Quartermaster (no cost, no cooldown).
function orderTrap(team, kind, x, y, builders, free) {
  const say = msg => { if (team.id === 0) toast(msg); return null; };
  const who = trapLayerType(kind), def = trapDef(kind);
  builders = builders.filter(u => u.type === who);
  if (!builders.length) return say(who === 'wizard' ? 'Select your Castle Wizard to lay runes' : 'Select your Architect to lay traps');
  team.trapCd = team.trapCd || {};
  if (!free && (team.trapCd[kind] || 0) > G.time) return say(`${def.name} ready in ${Math.ceil(team.trapCd[kind] - G.time)}s`);
  const problem = trapSpotProblem(team, x, y);
  if (problem) return say(problem);
  if (!free) {
    const cost = trapCost(team, kind);
    if (isRune(kind) ? team.mana < cost : team.gold < cost) return say(isRune(kind) ? 'Not enough mana' : 'Not enough gold');
    if (isRune(kind)) team.mana -= cost; else team.gold -= cost;
    team.trapCd[kind] = G.time + trapCd(team, kind);
  }
  const trap = addTrap(team.id, kind, x, y, false, false);
  const u = builders.slice().sort((a, b) => Math.abs(a.x - x) - Math.abs(b.x - x))[0];
  trap.layer = u;
  setOrder(u, { type: 'trap', trap });
  return trap;
}

// A free trap from a Quartermaster's materials (or a free rune from reagents): a random kind,
// somewhere ahead of the defend line where the spacing rules allow. False when there's nowhere.
function layFreeTrap(u, team) {
  const kind = pick(u.type === 'wizard' ? WIZ_RUNES : ARCH_TRAPS), line = defendLine(team);
  for (let tries = 0; tries < 10; tries++) {
    const x = line + team.dir * rnd(60, 300), y = rowY(rndi(0, LANE_ROWS - 1));
    if (!trapSpotProblem(team, x, y)) return !!orderTrap(team, kind, x, y, [u], true);
  }
  return false;
}
function addTrap(teamId, kind, x, y, armed, magic) {
  const trap = { id: NEXT_TRAP++, team: teamId, kind, x, y, magic: !!magic, reinforced: false, sprung: false, armed, prog: armed ? 1 : 0, layer: null, isTrap: true, isStructure: true, hp: 20, max: 20, halfW: 8, dead: false, flash: 0, stone: isRune(kind) ? '#5a4a6a' : '#4a3a2a', spotted: [false, false] };
  G.traps.push(trap);
  return trap;
}

// The builder walks to the spot and works the trap into the ground (or re-arms a sprung spike pit).
// A trap left half-laid stays where it is, to be finished later.
function doLayTrap(u, team, dt) {
  const trap = u.order.trap;
  if (!trap || trap.dead || trap.armed) { setOrder(u, { type: 'stance' }); return; }
  if (u.order.auto && workDanger(team, trap.x)) { setOrder(u, { type: 'stance' }); return; }   // (its own idea: not into a fight)
  if (u.swing >= 0) return;
  if (!moveTo(u, trap.x - team.dir * 14, trap.y, dt)) return;
  trap.layer = u;
  u.facing = team.dir;
  u.laying = true;
  trap.prog += dt / TRAP.layTime;
  if (trap.prog >= 1) {
    trap.armed = true;
    trap.layer = null;
    u.laying = false;
    if (team.id === 0) floatText(trap.x, trap.y - 30, trap.sprung ? `${trapDef(trap.kind).name} re-armed` : `${trapDef(trap.kind).name} set`, isRune(trap.kind) ? '#c8a8f0' : '#c9b27a');
    trap.sprung = false;
    trap.spotted = [false, false];
    setOrder(u, { type: 'stance' });
  }
}

// Who sets traps off: soldiers and miners on foot. Ninjas and saboteurs step lightly; flyers soar over.
const triggersTraps = u => !u.dead && !u.inside && !isFlying(u) && u.type !== 'ninja' && u.type !== 'saboteur' && u.type !== 'flyer' && u.type !== 'firebird';
const trapFoe = (trap, u) => trap.team === -1 || u.team !== trap.team;

function updateTraps(dt) {
  for (const trap of G.traps) {
    if (trap.dead || !trap.armed) continue;   // (one being laid, or waiting to be finished or re-armed, is harmless)
    const reach = trap.kind === 'tar' ? TRAP.tar.coverR : TRAP.trigger;   // anywhere on the tar pit's thatch gives way
    const victim = G.units.find(u => triggersTraps(u) && trapFoe(trap, u) && Math.abs(u.x - trap.x) < reach && Math.abs(u.y - trap.y) < (trap.kind === 'tar' ? 16 : 14));
    if (victim) springTrap(trap, victim);
  }
  G.traps = G.traps.filter(t => !t.dead);
  // tar pools slow (and, enchanted, burn) whoever wades through; caltrops slow and cut (poisoned, worse)
  for (const p of G.tarPools) {
    p.t += dt;
    p.burnT = (p.burnT || 0) + dt;
    const tick = p.burnT >= 0.5;
    if (tick) p.burnT = 0;
    const dps = p.kind === 'caltrops' ? (p.magic ? TRAP.caltrops.magicDps : TRAP.caltrops.dps) : p.magic ? TRAP.tar.magicDps : 0;
    for (const u of G.units) {
      if (u.dead || u.inside || isFlying(u) || !trapFoe(p, u)) continue;
      if (((u.x - p.x) / p.r) ** 2 + ((u.y - p.y) / (p.r * 0.45)) ** 2 > 1) continue;
      u.tarT = 0.25;
      if (tick && dps) damage(u, dps * 0.5, trapSource(p), true);
    }
  }
  G.tarPools = G.tarPools.filter(p => p.t < p.dur);
}

// Kills by a trap are credited to its side (neutral traps credit nobody).
function trapSource(trap) {
  return trap.team < 0 ? null : { team: trap.team, type: trap.kind || 'tar', isStructure: true, x: trap.x, y: trap.y };
}

// Enemies (of the trap) on the ground within r of it.
const trapVictims = (trap, r) => G.units.filter(u => !u.dead && !u.inside && !isFlying(u) && trapFoe(trap, u) && Math.abs(u.x - trap.x) + Math.abs(u.y - trap.y) * 0.6 <= r);
const shrugsOffMagic = u => isGiant(u) || !!u.boss;   // giants and bosses are too big (or too strange) for hexes and terror

function springTrap(trap, victim) {
  trap.dead = true;
  const x = trap.x, y = trap.y, src = trapSource(trap), mul = runeMul(trap.team);
  if (trap.team !== -1) trap.spotted[1 - trap.team] = true;
  switch (trap.kind) {
    case 'tar':
      sfx('splash', x);
      G.tarPools.push({ team: trap.team, kind: 'tar', x, y, r: TRAP.tar.poolR, t: 0, dur: TRAP.tar.poolTime, magic: trap.magic });
      spawnBurst(x, y - 4, 12, { color: '#1a1410', speed: 90, up: 70, g: 500, life: 0.7, size: 3 });
      if (trap.magic) spawnBurst(x, y - 6, 8, { color: '#b066e8', speed: 70, up: 60, g: 200, life: 0.6, size: 2 });
      return;
    case 'mine': {
      // a blast that throws everyone near it about
      sfx('boom', x);
      const dmg = TRAP.mine.dmg * (trap.magic ? TRAP.mine.magicMul : 1);
      for (const u of G.units.slice()) {
        if (u.dead || u.inside || isFlying(u) || !trapFoe(trap, u)) continue;
        const d = Math.abs(u.x - x) + Math.abs(u.y - y) * 0.6;
        if (d > TRAP.mine.blastR) continue;
        damage(u, dmg * (1 - 0.5 * d / TRAP.mine.blastR), src, true);
        if (!u.dead) knock(u, { x, facing: 1 }, TRAP.mine.knock, 0.5);
      }
      spawnBurst(x, y - 6, 22, { color: trap.magic ? '#c08cff' : '#ff9a3a', speed: 190, up: 140, g: 450, life: 0.7, size: 2.6 });
      spawnBurst(x, y - 6, 12, { color: '#3a2e26', speed: 120, up: 160, g: 400, life: 1, size: 3.5 });
      G.spellFx.push({ kind: 'blast', x, y, r: TRAP.mine.blastR, t: 0, max: 0.45 });
      addDecal(x, y + 2, 14, 0.5);
      return;
    }
    case 'spikes': {
      // the floor gives way under one victim onto sharpened stakes; enchanted, the screams terrify
      // those around. The pit stays, open, until an Architect re-arms it.
      sfx('thud', x);
      damage(victim, TRAP.spikes.dmg, src, true);
      if (!victim.dead && !isGiant(victim)) victim.stunT = Math.max(victim.stunT, 0.8);
      if (trap.magic) for (const u of trapVictims(trap, TRAP.spikes.curseR)) if (!shrugsOffMagic(u)) scare(u, TRAP.spikes.curseTime);
      spawnBurst(x, y - 6, 10, { color: '#5c0d0b', speed: 80, up: 70, g: 500, life: 0.6, size: 2.4 });
      spawnBurst(x, y - 2, 8, { color: '#6a5034', speed: 70, up: 50, g: 500, life: 0.6, size: 2.6 });
      trap.dead = false;
      trap.armed = false;
      trap.sprung = true;
      trap.prog = 0;
      return;
    }
    case 'caltrops':
      sfx('chop', x, 0.6);
      G.tarPools.push({ team: trap.team, kind: 'caltrops', x, y, r: TRAP.caltrops.r, t: 0, dur: TRAP.caltrops.time, magic: trap.magic, seed: rnd(0, 100) });
      spawnBurst(x, y - 4, 10, { color: '#8a8c90', speed: 120, up: 40, g: 500, life: 0.5, size: 1.8 });
      return;
    case 'snare': {
      // a noose snaps tight round one victim's legs; enchanted, the binding catches everyone near it
      sfx('thud', x, 0.6);
      const caught = trap.magic ? trapVictims(trap, TRAP.snare.magicR) : [victim];
      for (const u of caught) {
        if (u.boss) continue;
        u.netT = Math.max(u.netT || 0, isGiant(u) ? 1 : u === victim ? TRAP.snare.time : TRAP.snare.magicTime);
        u.swing = -1;
        u.snared = true;
      }
      if (trap.magic) G.spellFx.push({ kind: 'ring', x, y, r: TRAP.snare.magicR, color: '#b066e8', t: 0, max: 0.5 });
      spawnBurst(x, y - 8, 6, { color: '#8a7448', speed: 60, up: 40, g: 300, life: 0.5, size: 1.8 });
      return;
    }
    case 'bind': {
      sfx('cast', x);
      const r = RUNE.bind.r * mul;
      for (const u of trapVictims(trap, r)) {
        if (u.boss) continue;
        u.stunT = Math.max(u.stunT, (isGiant(u) ? RUNE.bind.giantStun : RUNE.bind.stun) * mul);
        u.swing = -1;
        if (trap.reinforced) damage(u, RUNE.bind.spikeDmg, src, true);
      }
      G.spellFx.push({ kind: 'ring', x, y, r, color: '#7fc8ff', t: 0, max: 0.7 });
      spawnBurst(x, y - 10, 16, { color: '#9fd8ff', speed: 110, up: 80, g: 150, life: 0.7, size: 2 });
      return;
    }
    case 'hex': {
      sfx('gaze', x, 0.6);
      const r = RUNE.hex.r * mul;
      for (const u of trapVictims(trap, r)) {
        if (shrugsOffMagic(u)) continue;
        u.hexT = Math.max(u.hexT || 0, RUNE.hex.time * mul);
        if (trap.reinforced) u.curseT = u.hexT;
        u.swing = -1;
        setOrder(u, u.order.type === 'tower' ? u.order : { type: 'stance' });
      }
      G.spellFx.push({ kind: 'ring', x, y, r, color: '#d05ae0', t: 0, max: 0.7 });
      spawnBurst(x, y - 10, 16, { color: '#d070f0', speed: 100, up: 70, g: 120, life: 0.8, size: 2 });
      return;
    }
    case 'dread': {
      sfx('horn', x, 0.5);
      const r = RUNE.dread.r * mul;
      for (const u of trapVictims(trap, r)) {
        if (shrugsOffMagic(u)) continue;
        if (trap.reinforced) damage(u, RUNE.dread.pitDmg, src, true);
        if (!u.dead) scare(u, (trap.reinforced ? RUNE.dread.pitTime : RUNE.dread.time) * mul);
      }
      G.spellFx.push({ kind: 'ring', x, y, r, color: '#e8e4d8', t: 0, max: 0.7 });
      spawnBurst(x, y - 10, 14, { color: '#2a2228', speed: 90, up: 90, g: 100, life: 0.9, size: 3 });
      return;
    }
  }
}

// Terror: the unit drops everything and runs for its own castle for a while.
function scare(u, time) {
  if (u.dead || u.boss || isGiant(u)) return;
  u.scaredT = Math.max(u.scaredT || 0, time);
  u.swing = -1;
  u.shieldWall = false;
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
    if (trap.dead || trap.team === u.team) continue;
    const d = Math.abs(trap.x - u.x) + Math.abs(trap.y - u.y) * 0.5;
    if (d < TRAP.sabSight) trap.spotted[u.team] = true;
    if (d < bd) { bd = d; best = trap; }
  }
  if (best) setOrder(u, { type: 'attack', target: best });
}

// ---------------------------------------------------------------- repairs and finishing

// A side's Architect mends its own trenches and towers, and the Monolith's tower while no one
// else (enemy or neutral archers) holds it.
const canMend = (team, s) => s.team === team.id || (s.mid && [-1, team.id].includes(towerHolder(s)));

// Is there a fight near x that a worker shouldn't wander into on its own?
const workDanger = (team, x) => armyPower(1 - team.id, x, 350) > 90;

// What a side's Architect could work on, each with the kind of work:
//   finish    a work left half-built (a trench, a palisade, a tower), or a trap half-laid or sprung
//   repair    a damaged trench, tower or statue
//   rebuild   a ruin (costs gold)
//   reinforce one of the Castle Wizard's runes (costs gold)
function archJobs(team) {
  const jobs = [];
  for (const s of [...G.walls, ...G.towers]) {
    if (!canMend(team, s)) continue;
    if (s.ruin) jobs.push({ kind: 'rebuild', s });
    else if (s.dead) continue;
    else if (s.progress < 1 || s.reinforcing) jobs.push({ kind: 'finish', s });
    else if (s.hp < s.max) jobs.push({ kind: 'repair', s });
  }
  for (const t of G.traps) {
    if (t.dead || t.team !== team.id) continue;
    if (!t.armed && !isRune(t.kind)) jobs.push({ kind: 'finish', s: t });
    else if (t.armed && isRune(t.kind) && !t.reinforced) jobs.push({ kind: 'reinforce', s: t });
  }
  const st = team.statue;
  if (!st.dead && st.hp < st.max && !team.noCastle) jobs.push({ kind: 'repair', s: st });
  return jobs;
}

// Put a builder to work on a job (finishing a trap re-lays it; anything else is a mallet job).
function startArchJob(team, j, builders, auto) {
  if (j.kind === 'rebuild') return rebuildStructure(team, j.s, builders);
  if (j.kind === 'reinforce') return reinforceRune(team, j.s, builders);
  if (j.s.isTrap) {
    const u = builders.slice().sort((a, b) => Math.abs(a.x - j.s.x) - Math.abs(b.x - j.s.x))[0];
    j.s.layer = u;
    setOrder(u, { type: 'trap', trap: j.s, auto });
    return j.s;
  }
  for (const u of builders) setOrder(u, { type: 'build', wall: j.s, auto });
  return j.s;
}

// The Repair order (Y): finish whatever was left half-built (nearest first), else mend the most
// damaged work or the statue, else rebuild the nearest ruin. Returns what they went to.
function repairStructures(team, builders, rebuild) {
  builders = builders.filter(u => u.type === 'architect');
  if (!builders.length) return null;
  const jobs = archJobs(team), x = builders[0].x, near = (a, b) => Math.abs(a.s.x - x) - Math.abs(b.s.x - x);
  const finish = jobs.filter(j => j.kind === 'finish').sort(near)[0];
  if (finish) return startArchJob(team, finish, builders);
  const hurt = jobs.filter(j => j.kind === 'repair').sort((a, b) => a.s.hp / a.s.max - b.s.hp / b.s.max)[0];
  if (hurt) return startArchJob(team, hurt, builders);
  if (!rebuild) return null;
  const ruin = jobs.filter(j => j.kind === 'rebuild').sort(near)[0];
  return ruin ? startArchJob(team, ruin, builders) : null;
}

// The job an idle Architect takes up on its own: finishing and re-arming (free) before repairs,
// most urgent first, and never where a fight is going on. Ruins and runes cost gold, so they wait
// for your order.
function archAutoJob(u, team) {
  let best = null, bs = 1e9;
  for (const j of archJobs(team)) {
    if (j.kind !== 'finish' && j.kind !== 'repair') continue;
    const s = j.s;
    if (j.kind === 'repair' && s.hp > s.max * (s.isStatue ? 0.98 : 0.95)) continue;   // a scratch can wait
    if (s.isTrap && s.layer && s.layer !== u && !s.layer.dead && s.layer.order.trap === s) continue;
    if (workDanger(team, s.x)) continue;
    if (!s.mid && team.dir * (s.x - WORLD_W / 2) > 0) continue;   // (our half)
    const score = (j.kind === 'finish' ? 0 : 400 + 600 * (s.hp / s.max)) + Math.abs(s.x - u.x) * 0.5;
    if (score < bs) { bs = score; best = j; }
  }
  return best;
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
  builders = builders.filter(u => u.type === 'architect');
  if (!free) {
    if (!builders.length) return say('Select your Architect to build a tower');
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
  const t = { isTower: true, isStructure: true, team: teamId, x, y, halfW: 20, hp: built ? max : 1, max, progress: built ? 1 : 0, dead: false, flash: 0, stone: '#6a4a2c', archers: [null], ward: 0 };
  G.towers.push(t);
  return t;
}

// Who's in a tower: tw.archers holds one slot (two for the Monolith's), each an archer (a mage in
// a wizard tower) or null.
const towerSlots = tw => (tw.mid ? TOWER.mid.slots : 1);
const towerCrew = tw => tw.archers.filter(a => a && !a.dead);
const towerHolder = tw => { const c = towerCrew(tw); return c.length ? c[0].team : -1; };   // a side, NEUTRAL, or -1 when empty
const towerSlotDx = (tw, i) => (tw.mid ? (i ? 30 : -30) : 0);   // the Monolith's archers stand on either pier
// Room for u: a free slot, and nobody else in it but its own side.
const towerHasRoom = (tw, u) => { const c = towerCrew(tw).filter(a => a !== u); return c.length < towerSlots(tw) && c.every(a => a.team === u.team); };

// An archer climbs into a tower (its own side's, or the Monolith's once nobody else holds it) and
// shoots from it. A wizard tower takes a mage instead (wizard.js).
function postArcher(u, tower) {
  if (!tower || tower.dead || tower.progress < 1) return false;
  if (tower.wizard || tower.converting) return false;
  if (tower.team !== -1 && tower.team !== u.team) return false;
  if (!towerHasRoom(tower, u)) return false;
  setOrder(u, { type: 'tower', tower });
  return true;
}

function doTower(u, team, dt) {
  const tw = u.order.tower;
  if (!tw || tw.dead || tw.wizard || tw.converting || (u.onTower !== tw && !towerHasRoom(tw, u))) { setOrder(u, { type: 'stance' }); return; }
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

// A tower falls. Brought down by melee troops, whoever is inside goes down with it (the Monolith's
// neutral archers fall with their tower however it comes down). A wizard tower's magic is lost.
function destroyTower(tw, src) {
  sfx('crumble', tw.x);
  tw.dead = true;
  tw.ruin = true;   // the wreck stays, to be rebuilt cheaply
  tw.hp = 0;
  tw.ward = 0;
  const wasWizard = tw.wizard;
  tw.wizard = false;
  tw.converting = false;
  for (let k = 0; k < 4; k++) spawnBurst(tw.x + rnd(-12, 12), tw.y - rnd(10, 50), 8, { color: '#6a4a2c', speed: 150, up: 120, g: 600, life: 1, size: 3.5 });
  for (const a of towerCrew(tw)) {
    leaveTower(a);
    if (a.team === NEUTRAL || (src && !src.isStructure && !src.castle && !isRanged(src))) {
      if (a.team === 0) floatText(a.x, a.y - 70, 'Crushed!', '#e0503a');
      a.hp = 0;
      killUnit(a, a.team === NEUTRAL ? null : src);
    } else setOrder(a, { type: 'stance' });
  }
  if (tw.team === 0) toast(wasWizard ? 'Your wizard tower has fallen' : 'An archer tower has fallen', 'warn');
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

// The Architect clears a ruin and raises it again, for much less than a new one. Your own ruins,
// or the Monolith's tower (anyone's to rebuild). A wizard tower comes back as a plain archer tower.
function rebuildStructure(team, s, builders) {
  const say = msg => { if (team.id === 0) toast(msg); return null; };
  builders = builders.filter(u => u.type === 'architect');
  if (!s || !s.ruin) return null;
  if (!canMend(team, s)) return say('That ruin isn\'t yours to rebuild');
  if (!builders.length) return say('Select your Architect to rebuild it');
  const cost = rebuildCost(s);
  if (team.gold < cost) return say(`Rebuilding costs ${cost} gold`);
  team.gold -= cost;
  s.dead = false;
  s.ruin = false;
  s.progress = 0;
  s.hp = 1;
  s.flash = 0;
  s.ward = 0;
  if (s.isTower) {
    s.max = s.mid ? TOWER.mid.hp : towerMaxHp(team);
    s.wizard = false;
    s.converting = false;
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

// The Architect reinforces one of the Castle Wizard's runes with iron and a hidden pit (gold).
function reinforceRune(team, trap, builders) {
  const say = msg => { if (team.id === 0) toast(msg); return null; };
  builders = builders.filter(u => u.type === 'architect');
  if (!trap || trap.dead || !isRune(trap.kind) || trap.team !== team.id) return null;
  if (trap.reinforced) return say('That rune is already reinforced');
  if (!builders.length) return say('Select your Architect to reinforce runes');
  if (!trap.armed) return say('The Castle Wizard has to finish that rune first');
  if (team.gold < RUNE.reinforce) return say(`Reinforcing costs ${RUNE.reinforce} gold`);
  team.gold -= RUNE.reinforce;
  const u = builders.slice().sort((a, b) => Math.abs(a.x - trap.x) - Math.abs(b.x - trap.x))[0];
  setOrder(u, { type: 'rework', trap, t: 0 });
  return trap;
}

// Working on another's trap (the Architect reinforcing a rune, the Castle Wizard enchanting a trap):
// walk over and kneel at it for a moment.
function doRework(u, team, dt) {
  const o = u.order, trap = o.trap;
  const done = !trap || trap.dead || (u.type === 'architect' ? trap.reinforced : trap.magic);
  if (done) { setOrder(u, { type: 'stance' }); return; }
  if (u.swing >= 0) return;
  if (!moveTo(u, trap.x - team.dir * 14, trap.y, dt)) return;
  u.facing = team.dir;
  u.laying = true;
  o.t += dt;
  if (o.t < RUNE.workTime) return;
  u.laying = false;
  if (u.type === 'architect') trap.reinforced = true; else trap.magic = true;
  if (team.id === 0) floatText(trap.x, trap.y - 30, u.type === 'architect' ? `${trapDef(trap.kind).name} reinforced` : `${trapDef(trap.kind).name} enchanted`, u.type === 'architect' ? '#c9b27a' : '#c8a8f0');
  spawnBurst(trap.x, trap.y - 6, 8, { color: u.type === 'architect' ? '#b0a080' : '#b066e8', speed: 60, up: 50, g: 200, life: 0.6, size: 2 });
  setOrder(u, { type: 'stance' });
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
  if (o.type === 'rework') return doRework(u, team, dt);
  if (o.type === 'garrison' || team.stance === 'garrison' || team.minersIn || u.ownStance === 'garrison') return goGarrison(u, dt);
  // nobody needs it: finish, re-arm and mend on its own, lay a free trap with a Quartermaster's
  // materials, or else study at the statue
  u.jobT = (u.jobT || 0) - dt;
  if (u.jobT <= 0 && u.swing < 0) {
    u.jobT = 1;
    const j = archAutoJob(u, team);
    if (j) { startArchJob(team, j, [u], true); return; }
    if (u.materials > 0 && layFreeTrap(u, team)) { u.materials--; return; }
  }
  if (u.swing < 0) moveTo(u, team.statue.x - team.dir * (34 + (u.id % 3) * 14), LANE_TOP + 10 + (u.id % 4) * 9, dt);
}

// ---------------------------------------------------------------- study: cheaper upgrades

// The price of an upgrade after the Architect's and Castle Wizard's study (team.discount and
// team.manaDiscount['type:key'] = 0..max). Founding Stones cost more each time.
function upgradePrice(team, type, def) {
  const k = `${type}:${def.key}`, d = (team.discount && team.discount[k]) || 0, dm = (team.manaDiscount && team.manaDiscount[k]) || 0;
  const n = def.key === 'found' ? team.foundN || 0 : 0;
  const gold = def.cost + n * FOUNDING.goldStep, mana = (def.mana || 0) + n * FOUNDING.manaStep;
  return { gold: Math.round(gold * (1 - d)), mana: Math.round(mana * (1 - dm)), off: d, offMana: dm };
}

// Idle study: the Architect (standing by with nothing to build, or in the castle) slowly finds
// savings in gold, the Castle Wizard in mana. Out at the statue they also bring in a little of each.
function updateStudy(team, dt) {
  for (const [type, res] of [['architect', 'gold'], ['wizard', 'mana']]) {
    let rate = 0, atStatue = 0;
    for (const u of G.units) {
      if (u.team !== team.id || u.dead || u.type !== type) continue;
      u.studying = u.inside || ((u.order.type === 'stance' || u.order.type === 'hold') && !u.moving && u.swing < 0);
      if (!u.studying) continue;
      rate += u.inside ? ARCH_RESEARCH.garrisonMul : 1;
      if (!u.inside && Math.abs(u.x - team.statue.x) < 120) atStatue++;
    }
    if (atStatue && !team.statue.dead) {
      if (res === 'gold') {
        const g = atStatue * ARCH_RESEARCH.gold * dt;
        team.gold += g;
        G.stats[team.id].gold += g;
      } else {
        const m = Math.min(atStatue * ARCH_RESEARCH.mana * dt, manaCap(team) - team.mana);
        if (m > 0) { team.mana += m; G.stats[team.id].mana += m; }
      }
    }
    if (!rate) continue;
    const key = res === 'gold' ? 'studyT' : 'studyMT';
    team[key] = (team[key] || 0) + rate * dt;
    if (team[key] < ARCH_RESEARCH.time) continue;
    team[key] -= ARCH_RESEARCH.time;
    if (!studyFocused(team, res)) discountRandomUpgrade(team, ARCH_RESEARCH.step, true, res);
  }
}

const discountsOf = (team, res) => (res === 'mana' ? (team.manaDiscount = team.manaDiscount || {}) : (team.discount = team.discount || {}));
const studyName = res => (res === 'mana' ? 'Castle Wizard' : 'Architect');

// The upgrade the player set to be studied (the book on its button), if it's still worth studying
// for this resource: not researched yet, it costs some, and study can still make it cheaper.
function studyFocusOk(team, res) {
  const f = team.studyFocus;
  if (!f) return false;
  const [type, key] = f.split(':'), def = upgradeDef(type, key);
  if (!def || (res === 'mana' && !def.mana)) return false;
  return !team.upgrades[type][key] && !(team.research[type] && team.research[type].key === key) && (discountsOf(team, res)[f] || 0) < ARCH_RESEARCH.max - 1e-6;
}
const studyFocusAny = team => studyFocusOk(team, 'gold') || studyFocusOk(team, 'mana');

// Studying a chosen upgrade knocks its price down; once it's as cheap as it gets, study goes back to
// random upgrades.
function studyFocused(team, res) {
  if (!studyFocusOk(team, res)) { if (!studyFocusAny(team)) team.studyFocus = null; return false; }
  const f = team.studyFocus, [type, key] = f.split(':'), def = upgradeDef(type, key), disc = discountsOf(team, res);
  disc[f] = Math.min(ARCH_RESEARCH.max, (disc[f] || 0) + ARCH_RESEARCH.step);
  if (team.id === 0) toast(`Your ${studyName(res)}'s study: ${def.name} costs ${Math.round(disc[f] * 100)}% less ${res}`);
  if (!studyFocusAny(team)) team.studyFocus = null;
  return true;
}

// Set (or clear, clicking the same one again) the upgrade to study.
function setStudyFocus(team, type, key) {
  const f = `${type}:${key}`;
  if (team.studyFocus === f) { team.studyFocus = null; if (team.id === 0) toast('Study: back to anything that helps'); return; }
  team.studyFocus = f;
  if (!studyFocusAny(team)) { team.studyFocus = null; if (team.id === 0) toast(team.upgrades[type][key] ? 'Already researched' : 'Study can\'t make that any cheaper'); return; }
  if (team.id === 0) toast(`Your Architect and Castle Wizard will study ${upgradeDef(type, key).name} (up to ${Math.round(ARCH_RESEARCH.max * 100)}% off)`);
}

function discountRandomUpgrade(team, step, announce, res = 'gold') {
  const disc = discountsOf(team, res), options = [];
  for (const type of RESEARCH_TYPES) {
    if (type !== 'castle' && !canTrain(team, type)) continue;
    for (const def of UPGRADES[type]) {
      const k = `${type}:${def.key}`;
      if (res === 'mana' && !def.mana) continue;
      if (team.upgrades[type][def.key] || upgradeLocked(team, type, def.key) || (disc[k] || 0) >= ARCH_RESEARCH.max - 1e-6) continue;
      options.push([k, def]);
    }
  }
  if (!options.length) return null;
  const [k, def] = pick(options);
  disc[k] = Math.min(ARCH_RESEARCH.max, (disc[k] || 0) + step);
  if (announce && team.id === 0) toast(`Your ${studyName(res)} found savings: ${def.name} costs ${Math.round(disc[k] * 100)}% less ${res}`);
  return def;
}

// ---------------------------------------------------------------- setup

// Lay a trap straight away (a clan's or a map's starting traps).
function freeTrap(teamId, kind, x, y) {
  return addTrap(teamId, kind, x, y, true, false);
}

// Neutral works from the map: hidden traps either side can set off, and an archer tower by the
// Monolith that whichever side posts an archer in it first can use.
function spawnNeutralWorks(map) {
  for (const t of map.traps || []) freeTrap(-1, t.kind, t.x, t.y);
  if (G.shrine) manNeutralTower(makeMidTower(addTower(-1, G.shrine.x, LANE_BOT - 6, true, null)));   // manned by two neutral archers to start
}

// Very Hard's head start: its Architect has been busy before the battle (a quarter off four
// random upgrades) and three traps already lie in front of its line.
function veryHardHeadStart(team) {
  for (let i = 0; i < 4; i++) discountRandomUpgrade(team, 0.25, false);
  [[1150, 1], [1240, 4], [1330, 2]].forEach(([x, row]) => freeTrap(team.id, pick(ARCH_TRAPS), team.edge(x), rowY(row)));
}
