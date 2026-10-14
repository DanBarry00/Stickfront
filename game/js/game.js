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
let RT = 0;     // real time in seconds, drives cosmetic animation

const perType = (make, types = UNIT_ORDER) => Object.fromEntries(types.map(t => [t, make(t)]));

function makeCastleArcher(team, i) {
  return { x: team.edge(ARCHER_XS[i]), y: WALL_TOP - 8, phase: 'idle', k: rnd(0, 0.5), fa: 0.4, f: team.dir, seed: i * 3 + team.id };
}

function makeTeam(id, map) {
  const dir = id === 0 ? 1 : -1;
  const edge = x => (id === 0 ? x : WORLD_W - x);
  const style = TEAM_STYLE[id];
  const team = {
    id, dir, edge,
    gold: START_GOLD,
    mana: 0,
    stance: 'defend',
    musterX: null,            // where newly trained soldiers gather; null = follow the stance
    minerDefault: 'mine',     // what newly trained miners go do: 'mine' | 'pray' | 'pan'
    panSlots: new Array(PAN_SLOTS).fill(null),
    queues: perType(() => []),
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
  team.archers = [makeCastleArcher(team, 0)];
  // castle archers shoot as archers (extra damage and confusion against giants, kills credited)
  team.castleSrc = { team: id, type: 'archer', castle: true, isStructure: true, pierceHalf: false };
  return team;
}

function newGame(seed) {
  const map = generateMap(seed);
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
  G.teams = [0, 1].map(id => makeTeam(id, map));
  for (const t of G.teams) {
    for (let i = 0; i < 2; i++) spawnUnit(t, 'miner', t.statue.x + t.dir * rnd(30, 100), rnd(LANE_TOP + 10, LANE_BOT - 10));
    // each side starts with one veteran Swordwrath carrying every sword upgrade
    const vet = spawnUnit(t, 'sword', t.statue.x + t.dir * 150, LANE_TOP + 40);
    for (const d of UPGRADES.sword) vet.perks[d.key] = true;
    applyPerks(vet);
    vet.hp = vet.maxHp;
  }
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
    if (type === 'miner') {
      // the small mine / pray / pan toggle decides where fresh miners head
      if (team.minerDefault === 'pray') u.order = { type: 'mana' };
      else if (team.minerDefault === 'pan') u.order = { type: 'pan' };
    } else if (team.musterX !== null) {
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
  for (const type of UNIT_ORDER) n += team.queues[type].length * UNIT_TYPES[type].pop;
  for (const u of G.units) if (u.team === team.id && !u.dead) n += u.def.pop;
  return n;
}

function queueUnit(team, type) {
  const def = UNIT_TYPES[type], q = team.queues[type];
  const say = msg => { if (team.id === 0) toast(msg); return false; };
  if (G.over) return false;
  if (team.gold < def.cost) return say('Not enough gold');
  if (team.mana < (def.mana || 0)) return say('Not enough mana');
  if (popUsed(team) + def.pop > POP_CAP) return say('Population limit reached');
  if (q.length >= QUEUE_MAX) return say('Training queue is full');
  team.gold -= def.cost;
  team.mana -= def.mana || 0;
  q.push({ t: 0 });
  return true;
}

function dequeueUnit(team, type) {
  const q = team.queues[type];
  if (!q.length) return;
  q.pop();
  team.gold += UNIT_TYPES[type].cost;
  team.mana = Math.min(MAX_MANA, team.mana + (UNIT_TYPES[type].mana || 0));
}

function updateQueues(team, dt) {
  for (const type of UNIT_ORDER) {
    const q = team.queues[type];
    if (!q.length) continue;
    q[0].t += dt;
    if (q[0].t >= UNIT_TYPES[type].time) {
      q.shift();
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
    if ((def.key === 'archer2' || def.key === 'archer3') && team.archers.length < ARCHER_XS.length) team.archers.push(makeCastleArcher(team, team.archers.length));
    if (team.id === 0) {
      toast(def.team ? `${def.name} is ready` : `${def.name} researched — new ${UNIT_TYPES[type].name}s get it; refit veterans (R)`);
      UI.portraitsDirty = true;
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

function placeWall(team, x, builders) {
  const say = msg => { if (team.id === 0) toast(msg); return null; };
  if (G.walls.filter(w => w.team === team.id && !w.dead).length >= WALL_MAX) return say(`Wall limit reached (${WALL_MAX})`);
  if (!wallSpotOk(team, x)) return say('Cannot build a wall there');
  if (team.gold < WALL_COST) return say('Not enough gold');
  team.gold -= WALL_COST;
  const w = {
    isWall: true, isStructure: true, team: team.id, x, y: LANE_BOT, halfW: 12,
    hp: 1, max: WALL_HP, progress: 0, dead: false, flash: 0, stone: team.castle.stone,
    tier: 1, reinforcing: false, rprog: 0, guards: [],
  };
  G.walls.push(w);
  for (const u of builders) setOrder(u, { type: 'build', wall: w });
  return w;
}

// Fortification: build a second tier onto a finished wall.
function reinforceWall(team, w, builders) {
  const say = msg => { if (team.id === 0) toast(msg); return false; };
  if (!w || w.dead || w.team !== team.id || w.progress < 1) return say('Choose one of your finished walls');
  if (w.tier === 2) return say('That wall is already fortified');
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
  if (!canManWalls(team)) return say('Research Military Training (Barracks) or Rallying Cry (Spear Hall) to defend walls');
  const walls = G.walls.filter(w => w.team === team.id && !w.dead && w.progress >= 1);
  if (!walls.length) return say('You need a finished wall');
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
  if (!n) say(`That wall is full (${WALL_GUARDS} defenders max)`);
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
  const up = team.upgrades.castle, tithe = TITHE_GOLD[up.tithe2 ? 2 : up.tithe ? 1 : 0] * dt;
  team.gold += tithe;
  G.stats[team.id].gold += tithe;
  if (!team.upgrades.castle.levy) return;
  team.levyT += dt;
  if (team.levyT < LEVY_INTERVAL) return;
  team.levyT = 0;
  if (popUsed(team) + UNIT_TYPES.sword.pop > POP_CAP) {
    if (team.id === 0) toast('Levy skipped: population limit reached');
    return;
  }
  spawnUnit(team, 'sword');
  if (team.id === 0) toast('Levy: a free Swordwrath has joined your army');
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
      if (s.owner === 0) toast('You have lost the Shrine', 'warn');
      s.owner = -1;
    }
    if (s.owner < 0 && Math.abs(s.cap) >= 1) {
      s.owner = s.cap > 0 ? 0 : 1;
      s.pulse = 1;
      logEvent(s.owner === 0 ? 'You took the Shrine' : 'Enemy took the Shrine', s.owner);
      toast(s.owner === 0 ? `The Shrine is yours: +${SHRINE.gold} gold and +${SHRINE.mana} mana per second` : 'The enemy has taken the Shrine', s.owner === 0 ? '' : 'warn');
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
  return {
    range: ARCHER_RANGE + (up.bow ? 120 : 0),
    dmg: up.arrows ? 16 : 11,
    rate: up.quiver ? 1.35 : 1,
    fire: !!up.fire,
    pierceHalf: !!up.arrows,
  };
}

function updateCastleArcher(team, a, dt, garrisoned) {
  const S = castleArcherStats(team);
  let best = null, bs = 1e9;
  for (const e of G.units) {
    if (e.team === team.id || e.dead || e.inside) continue;
    const d = Math.abs(e.x - a.x);
    if (d >= S.range) continue;
    const s = d - tauntBias(e);
    if (s < bs) { bs = s; best = e; }
  }
  if (best) {
    const dx = best.x - a.x, dy = best.y - 40 - (a.y - 45);
    a.f = dx >= 0 ? 1 : -1;
    const want = Math.atan2(dy, Math.abs(dx)) - 0.35 * (Math.abs(dx) / S.range);
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

function fireArrow(team, x, y, target, dmg, src, fire) {
  // lead a moving target by the arrow's actual flight time
  const v = !target.isStructure && target.moving ? target.facing * unitSpeed(target) : 0;
  let T = 0.6 + Math.abs(target.x - x) / 900;
  T = 0.6 + Math.abs(target.x + v * T - x) / 900;
  const tx = target.x + v * T, ty = targetAimY(target);
  const g = 500;
  G.projectiles.push({ x, y, vx: (tx - x) / T, vy: (ty - y - 0.5 * g * T * T) / T, g, t: 0, T, target, team, dmg, src, fire: !!fire });
}

function updateProjectiles(dt) {
  for (const p of G.projectiles) {
    p.t += dt;
    p.vy += p.g * dt;
    p.x += p.vx * dt;
    p.y += p.vy * dt;
    if (p.t >= p.T) {
      const t = p.target;
      let hit = false;
      if (isValidTarget(t)) {
        hit = t.isStructure ? Math.abs(t.x - p.x) < t.halfW + 24 : Math.abs(t.x - p.x) < 24 && Math.abs(targetAimY(t) - p.y) < 40;
      }
      const src = p.src && !p.src.dead ? p.src : null;
      if (hit) {
        damage(t, p.dmg * rnd(0.85, 1.15), src);
        if (p.fire && !t.isStructure && !t.dead) { t.burnT = BURN_TIME; t.burnSrc = src; }
      }
      else G.particles.push({ kind: 'stuck', x: p.x, y: Math.max(p.y, LANE_TOP), ang: Math.atan2(p.vy, p.vx), life: 6, max: 6 });
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
