'use strict';
// Game state, teams, training, research, walls, castle archers, projectiles, particles.

let G = null;   // current game

// Chosen on the title screen and remembered between sessions.
let AI_DIFFICULTY = (() => {
  try { return localStorage.getItem('stickfront.difficulty') || 'normal'; } catch (e) { return 'normal'; }
})();
function setDifficulty(d) {
  AI_DIFFICULTY = d;
  try { localStorage.setItem('stickfront.difficulty', d); } catch (e) { /* storage unavailable */ }
}
// Skirmish setup from the title screen, remembered between sessions. Clans may be 'random';
// they are decided when the battle begins. monolith: off | on | random; gold: scarce | normal | rich | random.
let SETUP = (() => {
  const def = { clan: 'base', enemy: 'random', monolith: 'random', gold: 'random' };
  try { return { ...def, ...JSON.parse(localStorage.getItem('stickfront.setup') || '{}') }; } catch (e) { return def; }
})();
function saveSetup() {
  try { localStorage.setItem('stickfront.setup', JSON.stringify(SETUP)); } catch (e) { /* storage unavailable */ }
}
let RT = 0;     // real time in seconds, drives cosmetic animation

const perType = (make, types = UNIT_ORDER) => Object.fromEntries(types.map(t => [t, make(t)]));

function makeCastleArcher(team, i) {
  return { x: team.edge(ARCHER_XS[i]), y: WALL_TOP - 8, phase: 'idle', k: rnd(0, 0.5), fa: 0.4, f: team.dir, seed: i * 3 + team.id };
}

function makeTeam(id, map, clanKey) {
  const dir = id === 0 ? 1 : -1;
  const edge = x => (id === 0 ? x : WORLD_W - x);
  const style = TEAM_STYLE[id], clan = CLANS[clanKey];
  const team = {
    id, dir, edge, clanKey,
    gold: clan.gold !== undefined ? clan.gold : START_GOLD,
    mana: clan.mana || 0,
    stance: 'defend',
    musterX: null,            // where newly trained soldiers gather; null = follow the stance
    minerDefault: 'mine',     // what newly trained miners go do: 'mine' | 'pray' | 'pan'
    panSlots: new Array(PAN_SLOTS).fill(null),
    queues: Object.fromEntries(TRAIN_GROUPS.map(g => [g.key, []])),   // per training group: [{ type, t }]
    upgrades: perType(() => ({}), RESEARCH_TYPES),
    research: perType(() => null, RESEARCH_TYPES),
    minersIn: false,          // miners-only garrison recall
    levyT: 0,
    manaSlots: new Array(MANA_SLOTS).fill(null),
    gateX: edge(GATE_X),
    castle: map.castles[id],
    statue: {
      team: id, isStatue: true, isStructure: true, x: edge(STATUE_X), hp: STATUE_HP, max: STATUE_HP, halfW: 62,
      flash: 0, glow: 0, dead: false, style: map.statues[id],
      stone: mixHex(grit(style.statue), map.theme.rock, 0.25),
    },
  };
  // the clan's head start: upgrades already researched (extra castle archers are posted at once)
  for (const [type, keys] of Object.entries(clan.free || {})) for (const k of keys) team.upgrades[type][k] = true;
  team.archers = [];
  for (let i = 0; i < ARCHER_XS.length; i++) if (i === 0 || team.upgrades.castle['archer' + (i + 1)]) team.archers.push(makeCastleArcher(team, i));
  // castle archers shoot as archers (extra damage and confusion against giants, kills credited)
  team.castleSrc = { team: id, type: 'archer', castle: true, isStructure: true, pierceHalf: false };
  return team;
}

// The clan's starting army beside the statue (and its trench, for the Defense Clan). Starting
// units carry the clan's researched upgrades; 'all' gives every upgrade of that unit.
function spawnClanArmy(t) {
  const clan = clanOf(t);
  const trench = clan.trench ? placeWall(t, t.edge(1000), [], true) : null;
  if (trench) { trench.progress = 1; trench.hp = trench.max; }
  let k = 0;
  for (const g of clan.army || []) {
    for (let n = 0; n < g.n; n++) {
      const miner = g.type === 'miner';
      const x = t.statue.x + t.dir * (miner ? rnd(30, 100) : 150 + (k % 3) * 25), y = miner ? rnd(LANE_TOP + 10, LANE_BOT - 10) : LANE_TOP + 30 + (k++ % 4) * 22;
      const u = spawnUnit(t, g.type, x, y);
      u.perks = g.perks === 'all' ? Object.fromEntries(UPGRADES[g.type].map(d => [d.key, true])) : { ...t.upgrades[g.type] };
      applyPerks(u);
      u.hp = u.maxHp;
      if (isFlying(u)) u.alt = FLY_ALT;
      if (g.at === 'trench' && trench) {
        if (u.type === 'sword' || u.type === 'spear') manWall(t, [u], trench);
        else setOrder(u, { type: 'hold', x: trench.x - t.dir * 60, y: rowY(2 + n) });
      }
    }
  }
}

// clans: [player, enemy] clan keys; by default taken from the setup (random ones decided now).
function newGame(seed, clans) {
  const map = generateMap(seed, { monolith: SETUP.monolith, gold: SETUP.gold });
  clans = clans || [resolveClan(SETUP.clan), resolveClan(SETUP.enemy)];
  G = {
    map, seed,
    state: 'title', paused: false, speed: 1, time: 0,
    over: null, overT: 0, alertCd: 0,
    units: [], projectiles: [], particles: [], markers: [], selection: [], walls: [], decals: [],
    pools: [], spellShots: [], spellFx: [], groups: [], buffT: 0,
    mines: map.mines,
    shrine: map.shrine,
    cam: { x: 0 },
    stats: [0, 1].map(() => ({ trained: 0, gold: 0, mana: 0, kills: 0 })),
    weather: [],
  };
  G.clans = clans;
  G.teams = [0, 1].map(id => makeTeam(id, map, clans[id]));
  for (const t of G.teams) spawnClanArmy(t);
  G.difficulty = AI_DIFFICULTY;
  G.ai = AI_DIFFICULTY === 'easy' ? new PoorAI(1) : new SmartAI(1, AI_DIFFICULTY);
  initWeather();
  initStats();
}

// Without x, units walk out of their building's door inside the castle.
function spawnUnit(team, type, x, y) {
  const fromDoor = x === undefined;
  if (fromDoor) {
    x = team.edge(DOOR_X[type]);
    y = LANE_TOP + rnd(2, 16);
  }
  const u = new Unit(type, team.id, x, y === undefined ? rnd(LANE_TOP + 10, LANE_BOT - 10) : y, fromDoor ? team.upgrades[type] : null);
  if (fromDoor) {
    u.slotY = rnd(LANE_TOP + 10, LANE_BOT - 10);
    // ninjas drop off the rampart by the Dojo; Kestrels launch from the Aerie and glide down
    if (type === 'ninja') u.dropT = 0.5;
    if (type === 'flyer' || type === 'firebird') u.alt = LANE_TOP - WALL_TOP + 20;
    if (type === 'miner') {
      // the small mine / pray / pan toggle decides where fresh miners head
      if (team.minerDefault === 'pray') u.order = { type: 'mana' };
      else if (team.minerDefault === 'pan') u.order = { type: 'pan' };
    } else if (team.musterX !== null && type !== 'giant') {   // giants follow the army instead (with Blinders a muster order would park them there)
      // new soldiers gather at the muster point, ranked by type
      const off = type === 'spear' ? 22 : type === 'archer' ? -80 : 0;
      u.order = { type: 'move', x: team.musterX + team.dir * off + rnd(-12, 12), y: u.slotY };
    }
  }
  G.units.push(u);
  return u;
}

function popUsed(team) {
  let n = 0;
  for (const g of TRAIN_GROUPS) for (const item of team.queues[g.key]) n += unitPop(team, item.type);
  for (const u of G.units) if (u.team === team.id && !u.dead) n += unitPop(team, u.type);
  return n;
}

// How many of this unit type are waiting in (or at the head of) its group's queue.
const queuedCount = (team, type) => team.queues[groupOf(type).key].filter(item => item.type === type).length;

function queueUnit(team, type) {
  const def = UNIT_TYPES[type], q = team.queues[groupOf(type).key], cost = unitCost(team, type);
  const say = msg => { if (team.id === 0) toast(msg); return false; };
  if (G.over) return false;
  if (!canTrain(team, type)) return say(`The ${clanOf(team).name} can't train ${def.name}s`);
  if (team.gold < cost.gold) return say('Not enough gold');
  if (team.mana < cost.mana) return say('Not enough mana');
  if (popUsed(team) + unitPop(team, type) > popCap(team)) return say('Population limit reached');
  if (q.length >= QUEUE_MAX) return say(`The ${groupOf(type).name} queue is full`);
  team.gold -= cost.gold;
  team.mana -= cost.mana;
  q.push({ type, t: 0, cost });   // remember the price paid, for refunds
  return true;
}

// Cancel the most recently queued unit of this type (refunds it, even if it was in training).
function dequeueUnit(team, type) {
  const q = team.queues[groupOf(type).key];
  const i = q.map(item => item.type).lastIndexOf(type);
  if (i < 0) return;
  const [item] = q.splice(i, 1);
  team.gold += item.cost.gold;
  team.mana = Math.min(MAX_MANA, team.mana + item.cost.mana);
}

// Each group trains the unit at the head of its queue; the rest wait their turn.
function updateQueues(team, dt) {
  for (const g of TRAIN_GROUPS) {
    const q = team.queues[g.key];
    if (!q.length) continue;
    q[0].t += dt;
    if (q[0].t >= UNIT_TYPES[q[0].type].time) {
      const { type } = q.shift();
      spawnUnit(team, type);
      G.stats[team.id].trained++;
    }
  }
}

// ---------------------------------------------------------------- research

function upgradeDef(type, key) {
  return UPGRADES[type].find(u => u.key === key);
}

function startResearch(team, type, key) {
  const def = upgradeDef(type, key);
  const say = msg => { if (team.id === 0) toast(msg); return false; };
  if (G.over || team.upgrades[type][key]) return false;
  if (upgradeLocked(team, type, key)) return say(`The ${clanOf(team).name} can't research ${def.name}`);
  if (def.requires && !team.upgrades[type][def.requires]) return say(`Requires ${upgradeDef(type, def.requires).name}`);
  if (team.research[type]) return say(`The ${buildingName(type)} is already researching`);
  if (team.gold < def.cost) return say('Not enough gold');
  if (team.mana < (def.mana || 0)) return say('Not enough mana');
  team.gold -= def.cost;
  team.mana -= def.mana || 0;
  team.research[type] = { key, t: 0 };
  return true;
}

function cancelResearch(team, type) {
  const r = team.research[type];
  if (!r) return;
  const def = upgradeDef(type, r.key);
  team.gold += def.cost;
  team.mana = Math.min(MAX_MANA, team.mana + (def.mana || 0));
  team.research[type] = null;
}

function updateResearch(team, dt) {
  for (const type of RESEARCH_TYPES) {
    const r = team.research[type];
    if (!r) continue;
    r.t += dt;
    const def = upgradeDef(type, r.key);
    if (r.t < def.time) continue;
    team.upgrades[type][r.key] = true;
    team.research[type] = null;
    if (/^archer\d$/.test(def.key) && team.archers.length < ARCHER_XS.length) team.archers.push(makeCastleArcher(team, team.archers.length));
    if (team.id === 0) {
      toast(def.team ? `${def.name} is ready` : `${def.name} researched — new ${UNIT_TYPES[type].name}s get it; refit veterans (R)`);
    }
  }
}

// ---------------------------------------------------------------- walls

function wallSpotOk(team, x) {
  const lo = team.statue.x + team.dir * 130, hi = WORLD_W / 2 - team.dir * 100;
  if (x < Math.min(lo, hi) || x > Math.max(lo, hi)) return false;
  if (G.walls.filter(w => w.team === team.id && !w.dead).length >= WALL_MAX) return false;
  return !G.walls.some(w => !w.dead && Math.abs(w.x - x) < 70);
}

// free: a clan's starting trench (no checks, no cost)
function placeWall(team, x, builders, free) {
  const say = msg => { if (team.id === 0) toast(msg); return null; };
  if (!free) {
    if (G.walls.filter(w => w.team === team.id && !w.dead).length >= WALL_MAX) return say(`Trench limit reached (${WALL_MAX})`);
    if (!wallSpotOk(team, x)) return say('Cannot dig a trench there');
    if (team.gold < WALL_COST) return say('Not enough gold');
    team.gold -= WALL_COST;
  }
  const w = {
    isWall: true, isStructure: true, team: team.id, x, y: LANE_BOT, halfW: 12,
    hp: 1, max: WALL_HP, progress: 0, dead: false, flash: 0, stone: mixHex('#6b5338', G.map.theme.ground[0], 0.3),   // earth (for dirt sprays)
    tier: 1, reinforcing: false, rprog: 0, guards: [],
  };
  G.walls.push(w);
  for (const u of builders) setOrder(u, { type: 'build', wall: w });
  return w;
}

// Fortification: build a second tier onto a finished wall.
function reinforceWall(team, w, builders) {
  const say = msg => { if (team.id === 0) toast(msg); return false; };
  if (!w || w.dead || w.team !== team.id || w.progress < 1) return say('Choose one of your finished trenches');
  if (w.tier === 2) return say('That trench already has a palisade');
  if (!w.reinforcing) {
    if (team.gold < WALL_COST) return say('Not enough gold');
    team.gold -= WALL_COST;
    w.reinforcing = true;
    w.rprog = 0;
  }
  for (const u of builders) setOrder(u, { type: 'build', wall: w });
  return true;
}

// Defend Wall: up to one row of melee troops can stand on a wall. Needs Military Training or Rallying Cry.
const canManWalls = team => !!(team.upgrades.sword.drill || team.upgrades.spear.inspire);
function manWall(team, units, wall) {
  const say = msg => { if (team.id === 0) toast(msg); return 0; };
  if (!canManWalls(team)) return say('Research Military Training (Barracks) or Rallying Cry (Spear Hall) to defend trenches');
  const walls = G.walls.filter(w => w.team === team.id && !w.dead && w.progress >= 1);
  if (!walls.length) return say('You need a finished trench');
  let n = 0;
  for (const u of units) {
    if (u.type !== 'sword' && u.type !== 'spear') continue;
    const w = wall || walls.slice().sort((a, b) => Math.abs(a.x - u.x) - Math.abs(b.x - u.x))[0];
    w.guards = w.guards.filter(g => !g.dead && g.order.wall === w);
    if (w.guards.includes(u)) { n++; continue; }
    if (w.guards.length >= WALL_GUARDS) continue;
    setOrder(u, { type: 'manwall', wall: w });
    w.guards.push(u);
    n++;
  }
  if (!n) say(`That trench is full (${WALL_GUARDS} defenders max)`);
  return n;
}

// Team-wide stance: overrides every individual order and personal stance.
function setStance(team, s) {
  team.stance = s;
  for (const u of G.units) {
    if (u.team !== team.id || u.dead) continue;
    u.ownStance = null;
    if (u.type === 'miner' && ['mana', 'stance', 'build', 'replenish', 'pan'].includes(u.order.type)) continue;
    if (u.order.type === 'refit') continue;
    setOrder(u, { type: 'stance' });
  }
}

// Per-unit stance from the command card.
function setUnitStance(u, s) {
  if (u.type === 'miner') {
    setOrder(u, s === 'garrison' ? { type: 'pan' } : { type: 'stance' });
    return;
  }
  u.ownStance = s;
  setOrder(u, { type: 'stance' });
}

// Recall only the miners into the castle (or send them back to work).
function setMinerGarrison(team, on) {
  team.minersIn = on;
  for (const u of G.units) {
    if (u.team !== team.id || u.dead || u.type !== 'miner') continue;
    if (['work', 'move', 'hold', 'garrison', 'attack'].includes(u.order.type)) setOrder(u, { type: 'stance' });
  }
}

// Passive statue income and the Levy's free Swordwrath.
function updateCastle(team, dt) {
  if (team.statue.dead || G.over) return;
  const up = team.upgrades.castle, tithe = TITHE_GOLD[up.gilded ? 3 : up.tithe2 ? 2 : up.tithe ? 1 : 0] * dt;
  team.gold += tithe;
  G.stats[team.id].gold += tithe;
  if (!up.levy) return;
  team.levyT += dt;
  if (team.levyT < LEVY_INTERVAL) return;
  team.levyT = 0;
  // Levy: a free Swordwrath; Levy II (Defense Clan) adds a free Spearton at the same time
  for (const type of up.levy2 ? ['sword', 'spear'] : ['sword']) {
    if (popUsed(team) + unitPop(team, type) > popCap(team)) {
      if (team.id === 0) toast(`Levy skipped: no room for a ${UNIT_TYPES[type].name}`);
      continue;
    }
    spawnUnit(team, type);
    if (team.id === 0) toast(`Levy: a free ${UNIT_TYPES[type].name} has joined your army`);
  }
}

// The Shrine: soldiers near it (miners don't count) pull its allegiance their way while no enemy
// soldier contests it. A captured shrine first has to be neutralised before it can change hands.
const shrineHolders = (s, team) => G.units.filter(u => u.team === team && !u.dead && !u.inside && u.type !== 'miner' && Math.abs(u.x - s.x) < SHRINE.radius).length;
function updateShrine(dt) {
  const s = G.shrine;
  if (!s || G.over) return;
  s.pulse = Math.max(0, s.pulse - dt);
  const n0 = shrineHolders(s, 0), n1 = shrineHolders(s, 1);
  s.contest = n0 > 0 && n1 > 0;
  if (!s.contest && (n0 || n1)) {
    const dir = n0 ? 1 : -1, n = Math.max(n0, n1);
    const before = s.cap;
    s.cap = clamp(s.cap + (dir * Math.min(3, n)) / SHRINE.capTime * dt, -1, 1);
    // crossing the middle neutralises it; reaching the end claims it
    if (s.owner >= 0 && Math.sign(before) !== Math.sign(s.cap)) {
      if (s.owner === 0) toast('You have lost the Monolith', 'warn');
      s.owner = -1;
    }
    if (s.owner < 0 && Math.abs(s.cap) >= 1) {
      s.owner = s.cap > 0 ? 0 : 1;
      s.pulse = 1;
      logEvent(s.owner === 0 ? 'You took the Monolith' : 'Enemy took the Monolith', s.owner);
      toast(s.owner === 0 ? `The Monolith is yours: +${SHRINE.gold} gold and +${SHRINE.mana} mana per second` : 'The enemy has taken the Monolith', s.owner === 0 ? '' : 'warn');
    }
  }
  if (s.owner >= 0) {
    const t = G.teams[s.owner];
    t.gold += SHRINE.gold * dt;
    t.mana = Math.min(MAX_MANA, t.mana + SHRINE.mana * dt);
    G.stats[s.owner].gold += SHRINE.gold * dt;
    G.stats[s.owner].mana += SHRINE.mana * dt;
  }
}

const MUSTER_MIN = 150;   // closest the muster point can be to the statue
function musterClamp(team, x) {
  const lo = team.statue.x + team.dir * MUSTER_MIN, hi = team.id === 0 ? WORLD_W * 0.7 : WORLD_W * 0.3;
  return clamp(x, Math.min(lo, hi), Math.max(lo, hi));
}
function setMuster(team, x) {
  team.musterX = musterClamp(team, x);
}

// ---------------------------------------------------------------- castle archers
// Each shot plays out: nock an arrow, draw the bow, aim, release.

const ARCHER_PHASES = { idle: 0.45, nock: 0.4, draw: 0.5, aim: 0.3, release: 0.35 };

// Castle archers automatically benefit from whatever archer upgrades the team has researched.
function castleArcherStats(team) {
  const up = team.upgrades.archer;
  const archerRange = up.longbow ? 600 : up.bow ? 500 : UNIT_TYPES.archer.range;   // same as a trained archer's
  return {
    reach: STATUE_X + team.statue.halfW + archerRange + CASTLE_REACH_PAD,   // distance from our edge of the world
    dmg: up.broadheads ? 20 : up.arrows ? 16 : 11,
    rate: up.quiver ? (up.steady ? 1.55 : 1.35) : 1,
    fire: !!up.fire,
    pierceHalf: !!up.arrows,
  };
}

function updateCastleArcher(team, a, dt, garrisoned) {
  const S = castleArcherStats(team);
  const line = team.edge(S.reach), range = Math.abs(line - a.x);   // farther-back archers need a longer shot
  let best = null, bs = 1e9;
  for (const e of G.units) {
    if (e.team === team.id || !canTarget(team.castleSrc, e)) continue;
    if (team.dir * (e.x - line) > 0) continue;   // beyond the line the rampart covers
    const d = Math.abs(e.x - a.x);
    const s = targetScore(team.castleSrc, e, d);
    if (s < bs) { bs = s; best = e; }
  }
  if (best) {
    const dx = best.x - a.x, dy = targetAimY(best) - (a.y - 45);
    a.f = dx >= 0 ? 1 : -1;
    const want = Math.atan2(dy, Math.abs(dx)) - 0.35 * Math.min(1, Math.abs(dx) / range);
    a.fa += (want - a.fa) * Math.min(1, dt * 8);
    a.target = best;
  } else {
    a.target = null;
    if (a.phase !== 'release') { a.phase = 'idle'; a.k = 0; }
  }
  a.k += (dt * (garrisoned ? 1.5 : 1) * S.rate) / ARCHER_PHASES[a.phase];
  if (a.k < 1) return;
  a.k = 0;
  if (a.phase === 'idle') { if (best) a.phase = 'nock'; }
  else if (a.phase === 'nock') a.phase = 'draw';
  else if (a.phase === 'draw') a.phase = 'aim';
  else if (a.phase === 'aim') {
    if (isValidTarget(a.target)) {
      const aim = a.f === 1 ? a.fa : Math.PI - a.fa;
      team.castleSrc.pierceHalf = S.pierceHalf;
      fireArrow(team.id, a.x + Math.cos(aim) * 14, a.y - 48 + Math.sin(aim) * 14, a.target, S.dmg, team.castleSrc, S.fire);
    }
    a.phase = 'release';
  } else a.phase = 'idle';
}

function updateArchers(team, dt) {
  if (team.statue.dead) return;
  const garrisoned = G.units.some(u => u.team === team.id && u.inside && !u.dead);
  for (const a of team.archers) updateCastleArcher(team, a, dt, garrisoned);
}

// A Firebird's fire pot bursts where it lands: every enemy on the ground nearby takes the hit and
// starts burning; trenches and the statue take half.
function potBlast(p) {
  const src = p.src && !p.src.dead ? p.src : null, r = p.radius || FIREBIRD.radius;
  const x = p.x, y = p.target && !p.target.isStructure ? p.target.y : (LANE_TOP + LANE_BOT) / 2;   // ground level where it lands
  for (const e of G.units.slice()) {
    if (e.team === p.team || e.dead || e.inside || isFlying(e) || Math.abs(e.x - x) > r || Math.abs(e.y - y) > 32) continue;
    damage(e, p.dmg * rnd(0.9, 1.1), src, true);
    if (!e.dead) { e.burnT = Math.max(e.burnT, p.burn || FIREBIRD.burn); e.burnSrc = src; }
  }
  const enemy = G.teams[1 - p.team];
  if (!enemy.statue.dead && Math.abs(enemy.statue.x - x) < r + enemy.statue.halfW) damage(enemy.statue, p.dmg / 2, src);
  for (const w of G.walls) if (w.team !== p.team && !w.dead && w.progress >= 1 && Math.abs(w.x - x) < r) damage(w, p.dmg / 2, src);
  spawnBurst(x, y - 8, 16, { color: '#ff8a2e', speed: 150, up: 90, g: 400, life: 0.6, size: 2.6 });
  spawnBurst(x, y - 8, 8, { color: '#3a2a22', speed: 90, up: 110, g: 200, life: 0.9, size: 3 });
  G.spellFx.push({ kind: 'blast', x, y, r, t: 0, max: 0.4 });
  addDecal(x, y + 2, rnd(8, 12), 0.3);
}

// A ballista bolt punches through its target into the next ground unit behind it.
function ballistaPierce(p, t, src) {
  const dir = Math.sign(p.vx) || 1;
  let next = null, nd = 1e9;
  for (const e of G.units) {
    if (e === t || e.team === p.team || e.dead || e.inside || e.stealth || isFlying(e) || Math.abs(e.y - t.y) > 25) continue;
    const d = (e.x - t.x) * dir;
    if (d >= 0 && d < 70 && d < nd) { nd = d; next = e; }
  }
  if (next) damage(next, p.dmg * BALLISTA.pierce, src, true);
}

// opts.kind: 'arrow' | 'star' (ninja) | 'bolt' (kestrel crossbow) | 'javelin' | 'ballista'; opts.crit marks a critical hit
function fireArrow(team, x, y, target, dmg, src, fire, opts = {}) {
  // lead a moving target by the arrow's actual flight time
  const v = !target.isStructure && target.moving ? target.facing * unitSpeed(target) : 0;
  let T = 0.6 + Math.abs(target.x - x) / 900;
  T = 0.6 + Math.abs(target.x + v * T - x) / 900;
  const tx = target.x + v * T, ty = targetAimY(target);
  const g = 500;
  G.projectiles.push({ x, y, vx: (tx - x) / T, vy: (ty - y - 0.5 * g * T * T) / T, g, t: 0, T, target, team, dmg, src, fire: !!fire, kind: opts.kind || 'arrow', crit: !!opts.crit, radius: opts.radius, burn: opts.burn });
}

function updateProjectiles(dt) {
  for (const p of G.projectiles) {
    p.t += dt;
    p.vy += p.g * dt;
    p.x += p.vx * dt;
    p.y += p.vy * dt;
    if (p.t >= p.T && p.kind === 'pot') { potBlast(p); p.done = true; continue; }   // fire pots burst wherever they land
    if (p.t >= p.T) {
      const t = p.target;
      let hit = false;
      if (isValidTarget(t)) {
        hit = t.isStructure ? Math.abs(t.x - p.x) < t.halfW + 24 : Math.abs(t.x - p.x) < 24 && Math.abs(targetAimY(t) - p.y) < 40;
      }
      const src = p.src && !p.src.dead ? p.src : null;
      if (hit) {
        damage(t, p.dmg * rnd(0.85, 1.15), src);
        if (p.crit) showCrit(t);
        if (p.fire && !t.isStructure && !t.dead) { t.burnT = BURN_TIME; t.burnSrc = src; }
        if (p.kind === 'star' && isGiant(t) && !t.dead) confuseGiant(t, STAR.confuse);   // stars disorient giants
        if (p.kind === 'ballista' && !t.isStructure) ballistaPierce(p, t, src);
      }
      else if (p.kind !== 'star' && p.kind !== 'stone') G.particles.push({ kind: 'stuck', x: p.x, y: Math.max(p.y, LANE_TOP), ang: Math.atan2(p.vy, p.vx), life: 6, max: 6 });
      p.done = true;
    }
  }
  G.projectiles = G.projectiles.filter(p => !p.done);
}

// ---------------------------------------------------------------- particles

function spawnBurst(x, y, n, o) {
  for (let i = 0; i < n; i++) {
    const a = rnd(0, TAU), s = rnd(0.3, 1) * o.speed;
    G.particles.push({
      kind: 'dot', x, y,
      vx: Math.cos(a) * s, vy: Math.sin(a) * s * 0.6 - (o.up || 0),
      g: o.g || 0, life: o.life * rnd(0.6, 1), max: o.life, color: o.color, size: o.size * rnd(0.6, 1.2),
    });
  }
}

function floatText(x, y, text, color) {
  G.particles.push({ kind: 'text', x, y, vy: -28, life: 1.3, max: 1.3, text, color });
}

function updateParticles(dt) {
  for (const p of G.particles) {
    p.life -= dt;
    if (p.kind === 'dot') {
      p.vy += p.g * dt;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      if (p.y > LANE_BOT + 8 && p.vy > 0) { p.vy *= -0.25; p.vx *= 0.5; }
    } else if (p.kind === 'spark') {
      p.x += p.vx * dt;
      p.y += p.vy * dt;
    } else if (p.kind === 'text') {
      p.y += p.vy * dt;
    }
  }
  G.particles = G.particles.filter(p => p.life > 0);
  for (const m of G.markers) m.t += dt;
  G.markers = G.markers.filter(m => m.t < 0.6);
  for (const d of G.decals) d.a -= dt * 0.006;
  G.decals = G.decals.filter(d => d.a > 0.02);
}

function destroyStatue(s) {
  s.hp = 0;
  s.dead = true;
  for (let i = 0; i < 6; i++) {
    spawnBurst(s.x + rnd(-50, 50), LANE_TOP - rnd(20, 220), 8, { color: s.stone, speed: 220, up: 160, g: 700, life: 1.6, size: 5 });
  }
  // the battle isn't over yet: the giant sealed inside the statue breaks free
  logEvent(s.team === 0 ? 'Your statue fell' : 'Enemy statue destroyed', 1 - s.team);
  if (!G.over) releaseStatueGiant(s);
}

// ---------------------------------------------------------------- weather

function initWeather() {
  G.weather = [];
  const kind = G.map.weather;
  if (kind === 'none') return;
  const n = kind === 'snow' ? 90 : 50;
  for (let i = 0; i < n; i++) G.weather.push({ x: rnd(0, 2400), y: rnd(0, VIEW_H), s: rnd(0.5, 1.4), ph: rnd(0, TAU) });
}

function updateWeather(dt, vw) {
  const kind = G.map.weather;
  for (const w of G.weather) {
    w.ph += dt;
    if (kind === 'snow') { w.y += 35 * w.s * dt; w.x += Math.sin(w.ph) * 12 * dt - 6 * dt; }
    else if (kind === 'embers') { w.y -= 22 * w.s * dt; w.x += Math.sin(w.ph * 1.7) * 18 * dt; }
    else if (kind === 'dust') { w.x += 70 * w.s * dt; w.y += Math.sin(w.ph) * 6 * dt; }
    else if (kind === 'leaves') { w.y += 28 * w.s * dt; w.x += (Math.sin(w.ph * 1.3) * 30 + 15) * dt; }
    if (w.y > VIEW_H + 10) w.y = -10;
    if (w.y < -10) w.y = VIEW_H + 10;
    if (w.x > vw + 10) w.x = -10;
    if (w.x < -10) w.x = vw + 10;
  }
}

// ---------------------------------------------------------------- main update

function update(dt) {
  G.time += dt;
  for (const team of G.teams) {
    updateQueues(team, dt);
    updateResearch(team, dt);
    updateCastle(team, dt);
  }
  if (!G.over) {
    G.ai.update(dt);
    if (G.autopilot) G.autopilot.update(dt);
  }
  updateShrine(dt);
  for (const m of G.mines) if (m.saltT > 0) m.saltT -= dt;   // salt wears off
  recordHistory();
  assignDefendSlots();
  updateGroups(dt);
  G.buffT -= dt;
  if (G.buffT <= 0) { G.buffT = 0.25; updateBuffs(); }   // steady auras, no per-frame reshuffling
  for (const u of G.units) updateUnit(u, dt);
  separate(dt);
  for (const team of G.teams) {
    updateArchers(team, dt);
    team.statue.flash -= dt;
    team.statue.glow = Math.max(0, team.statue.glow - dt * 1.5);
  }
  updateProjectiles(dt);
  updateSpellWorld(dt);
  updateParticles(dt);
  G.units = G.units.filter(u => !(u.dead && u.deathT > 9));
  G.walls = G.walls.filter(w => !w.dead);
  G.selection = G.selection.filter(u => !u.dead);
  for (const u of G.units) u.selected = G.selection.includes(u);
  if (G.over) G.overT += dt;
  G.alertCd -= dt;
}
