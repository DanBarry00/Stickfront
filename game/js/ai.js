'use strict';
// A deliberately bad computer opponent: slow, distractible and indecisive.

class PoorAI {
  constructor(teamId) {
    this.id = teamId;
    this.timer = 4;
    this.minerGoal = rndi(3, 5);
    this.attackAt = rndi(3, 6);
  }

  update(dt) {
    const team = G.teams[this.id];
    this.timer -= dt;
    if (this.timer > 0) return;
    this.timer = rnd(3, 7);
    if (chance(0.25)) return; // daydreaming

    const mine = G.units.filter(u => u.team === this.id && !u.dead);
    const miners = mine.filter(u => u.type === 'miner');
    const army = mine.filter(u => !isWorker(u));

    // Economy: wants a few miners, then buys a random mix of soldiers.
    if (miners.length + queuedCount(team, 'miner') < this.minerGoal) {
      if (chance(0.75)) queueUnit(team, 'miner');
    } else if (chance(0.65)) {
      const r = Math.random();
      const want = r < 0.4 ? 'sword' : r < 0.58 ? 'archer' : r < 0.72 ? 'spear' : r < 0.8 ? 'ninja' : r < 0.86 ? 'flyer' : r < 0.93 ? 'cleric' : 'warlock';
      queueUnit(team, canTrain(team, want) ? want : 'sword');   // its clan may not have that unit
    } else if (chance(0.15)) queueUnit(team, 'miner');

    // Now and then wanders into a random upgrade when it has spare gold.
    if (team.gold > 320 && chance(0.2)) {
      const type = pick(RESEARCH_TYPES);
      const options = UPGRADES[type].filter(u => !team.upgrades[type][u.key] && !upgradeLocked(team, type, u.key) && !['walls', 'prospect'].includes(u.key) && (!u.requires || team.upgrades[type][u.requires]));
      if (options.length && !team.research[type]) startResearch(team, type, pick(options).key);
    }

    // Occasionally puts a miner to prayer, even though it rarely spends mana well.
    if (miners.length >= 3 && !miners.some(u => u.order.type === 'mana') && chance(0.3)) {
      setOrder(pick(miners), { type: 'mana' });
    }

    const statue = team.statue;
    const threatened = G.units.some(u => u.team !== this.id && !u.dead && !u.inside && Math.abs(u.x - statue.x) < 700);

    if (threatened) {
      if (chance(0.5)) setStance(team, 'defend');
      else if (chance(0.3)) setStance(team, 'garrison'); // panics
    } else if (team.stance === 'garrison') {
      if (chance(0.5)) setStance(team, 'defend');
    } else if (team.stance === 'attack') {
      if (army.length < 2 && chance(0.6)) setStance(team, 'defend');
      else if (chance(0.12)) setStance(team, 'defend'); // loses its nerve mid-push
    } else if (army.length >= this.attackAt && chance(0.5)) {
      setStance(team, 'attack');
      this.attackAt = rndi(3, 7);
    } else if (army.length && chance(0.1)) {
      // sends a lone hero to their doom
      setOrder(pick(army), { type: 'move', x: WORLD_W / 2 + rnd(-300, 300), y: rnd(LANE_TOP + 10, LANE_BOT - 10) });
    }
  }
}

// A competent opponent for Normal, Hard and Very Hard. Normal: steady economy, sensible army mix, tier-1
// research, attacks in step (Advance) when it has the edge and falls back when losing. Hard: researches everything,
// gathers mana, fields mages and giants, refits veterans, and attacks and retreats in formations.
// Very Hard: Hard, but quicker to decide, quicker to strike and better paid.
const SMART = {
  normal: { think: [2, 3.5], miners: 7, praying: 1, panning: 0, research: 'basic', mages: true, giants: false, formations: false, advance: true, perThink: 1, attackPower: 800, edge: 1.05, saveAt: 7, bigArmy: 9, reserve: 250, saveBias: 0.7, armyPerUpgrade: 0.8, researchGap: 90, prayAt: 4, panAt: 99, manaCap: 300, ninjas: 0.1, flyers: 0.06,
    wave: [140, 180], waveEdge: 0.95, raid: [90, 130], raidSize: 2, shrineArmy: 5, shrineEdge: 0.9, stipend: 0, stipendMana: 0, architects: 1, towers: 0, traps: 1 },
  hard: { think: [1, 1.8], miners: 8, praying: 1, panning: 1, research: 'all', mages: true, giants: true, formations: true, perThink: 2, attackPower: 1000, edge: 1.0, saveAt: 7, bigArmy: 9, reserve: 250, saveBias: 0.6, armyPerUpgrade: 0.35, researchGap: 70, prayAt: 5, panAt: 8, manaCap: 700, ninjas: 0.14, flyers: 0.1,
    wave: [80, 110], waveEdge: 0.95, raid: [45, 70], raidSize: 3, shrineArmy: 3, shrineEdge: 0.6, stipend: 3, stipendMana: 0.6, architects: 1, towers: 1, traps: 2 },
  veryhard: { think: [0.6, 1.2], miners: 9, praying: 1, panning: 1, research: 'all', mages: true, giants: true, formations: true, perThink: 3, attackPower: 950, edge: 0.95, saveAt: 7, bigArmy: 8, reserve: 200, saveBias: 0.5, armyPerUpgrade: 0.3, researchGap: 60, prayAt: 5, panAt: 8, manaCap: 800, ninjas: 0.14, flyers: 0.1,
    wave: [65, 90], waveEdge: 0.9, raid: [35, 55], raidSize: 4, shrineArmy: 3, shrineEdge: 0.55, stipend: 5.5, stipendMana: 1.3, architects: 2, towers: 2, traps: 4, aiEdge: { hp: 1.12, dmg: 1.08 } },
};
// Keeping the player busy: besides its big attacks, the AI sends a wave on a timer (wave, in seconds
// after the last push ends) once its army is at least waveEdge of the enemy's (plus half its castle
// archers' worth), and small raiding parties (up to raidSize units every raid seconds) at miners
// working away from their army. It goes for the Monolith with shrineArmy soldiers at shrineEdge of
// the enemy army. Hard also gets a small income on top of its mining (stipend gold and stipendMana
// mana per second) to pay for all that. architects / towers / traps: how many it keeps of each.

// Research order: what a sensible commander buys first.
const AI_RESEARCH = [
  ['sword', 'blades'], ['miner', 'pick'], ['spear', 'shield'], ['archer', 'arrows'], ['sword', 'helm'],
  ['miner', 'bag'], ['archer', 'bow'], ['castle', 'tithe'], ['spear', 'helm'], ['sword', 'drill'],
  ['miner', 'devout'], ['cleric', 'pool'], ['warlock', 'big'], ['spear', 'inspire'], ['archer', 'quiver'],
  ['castle', 'archer2'], ['sword', 'rage'], ['giant', 'protein'], ['giant', 'blinders'], ['spear', 'halberd'],
  ['cleric', 'focus'], ['warlock', 'focus'],
  ['ninja', 'serrated'], ['flyer', 'barbs'], ['archer', 'eye'], ['ninja', 'stars'], ['flyer', 'scope'],
  ['ninja', 'parry'], ['ninja', 'vital'], ['flyer', 'winch'], ['ninja', 'focus'], ['flyer', 'feather'],
  ['sword', 'greatsword'], ['archer', 'longbow'], ['archer', 'broadheads'], ['flyer', 'hawkeye'], ['flyer', 'scope2'],
  ['flyer', 'barbs2'], ['archer', 'steady'], ['castle', 'levy2'],
  ['quartermaster', 'salves'], ['gladiator', 'manica'], ['necromancer', 'horde'], ['necromancer', 'rites'], ['gladiator', 'nets'], ['quartermaster', 'wagon'], ['necromancer', 'grave'], ['gladiator', 'fame'], ['necromancer', 'horde2'],
  ['architect', 'traps2'], ['architect', 'tower2'], ['architect', 'tower3'],
  ['ballista', 'torsion'], ['ballista', 'ironbolt'], ['ballista', 'mantlet'], ['golem', 'plating'], ['golem', 'core'], ['beastmaster', 'stones'], ['beastmaster', 'lore'], ['saboteur', 'sappers'], ['saboteur', 'brine'], ['firebird', 'pitch'], ['firebird', 'fuse'],
  ['cleric', 'big'], ['warlock', 'pool'], ['cleric', 'hope'], ['warlock', 'fear'], ['cleric', 'focus2'],
  ['warlock', 'focus2'], ['miner', 'pick2'], ['miner', 'bag2'], ['spear', 'shield2'], ['archer', 'fire'],
  ['sword', 'leap'], ['sword', 'rage2'], ['giant', 'stun'], ['giant', 'protein2'], ['castle', 'tithe2'],
  ['castle', 'archer3'], ['castle', 'archer4'], ['miner', 'devout2'], ['miner', 'pan1'], ['castle', 'sifter'], ['miner', 'pan2'], ['giant', 'protein3'], ['castle', 'levy'],
  ['miner', 'mule'], ['miner', 'diamond'], ['castle', 'gilded'],
];
// Never researched by the AI because it doesn't use them: Earthworks and Palisade. Prospecting only
// once the gold on its half of the map runs low.

// Play styles. Each game the computer picks one at random (never the one it played last game, when it
// can help it, and leaning toward what suits its clan), with its own random timings, so no two games
// go the same way. A style runs in phases. Each phase adjusts the settings above (cfg, given the
// level's own) and says how the AI attacks:
//   'normal' push when it has the edge, plus waves on a timer
//   'all'    throw the army in as soon as it has a few troops, and come straight back after a setback
//   'probe'  hold the line and keep sending small pushes with part of the army
//   'never'  hold the line and build up (it still defends, raids and turtles)
// next(ai, s) names the phase to move on to (s: the AI's view of the game; see phaseState).
// clans: weight multipliers for clans that suit the style. A style's plan() rolls its timings.
const AI_STYLES = {
  rush: {
    name: 'Early rush', weight: 1, normalWeight: 0.5, clans: { sword: 2, shadow: 1.5, beast: 0.3, mercenary: 0.5, defense: 0.6 },
    plan: () => ({ rushEnd: rnd(240, 330), assaultSize: rndi(13, 17), regroupMax: rnd(240, 330) }),
    start: 'rush',
    phases: {
      rush: { label: 'an early rush', attack: 'all',
        cfg: c => ({ miners: 5, saveAt: 99, perThink: c.perThink + 1, minArmy: 4, allEdge: 0.55, giants: false, mages: false, architects: 0, mix: { spear: -0.1, archer: -0.1 }, storm: 0.9 }),
        next: (ai, s) => (s.failedPushes >= 2 || s.t > ai.plan.rushEnd) && 'regroup' },
      regroup: { label: 'falling back to build up for an assault', attack: 'never',
        cfg: c => ({ miners: c.miners + 2, towers: c.towers + 1, traps: c.traps + 2 }),
        next: (ai, s) => (s.army >= ai.plan.assaultSize || (s.army >= 9 && s.ours > s.theirs * 1.6) || s.inPhase > ai.plan.regroupMax) && 'assault' },
      assault: { label: 'an all-out assault', attack: 'all', cfg: () => ({ allEdge: 0.85, storm: 0.85, lose: 0.45 }),
        next: (ai, s) => s.pushEnded && 'regroup' },
    },
  },
  boom: {
    name: 'Economy first', weight: 1, clans: { mercenary: 2, base: 1.2 },
    plan: () => ({ boomEnd: rnd(190, 270), assaultAt: rndi(17, 21), probeEvery: [rnd(28, 36), rnd(42, 55)], probeSize: rndi(4, 6) }),
    start: 'boom',
    phases: {
      boom: { label: 'building its economy', attack: 'never',
        cfg: c => ({ miners: c.miners + 3, raidSize: 0, saveAt: 3, armyPerUpgrade: 0.2, researchFirst: [['miner', 'pick'], ['miner', 'bag'], ['castle', 'tithe'], ['miner', 'devout'], ['miner', 'pick2']] }),
        next: (ai, s) => (s.t > ai.plan.boomEnd || s.ours > s.theirs * 2) && 'pressure' },
      pressure: { label: 'many small pushes', attack: 'probe',
        cfg: c => ({ miners: c.miners + 3, edge: c.edge + 0.35, raid: [30, 45], raidSize: Math.max(3, c.raidSize) }),
        next: (ai, s) => (s.army >= ai.plan.assaultAt || s.inPhase > 330) && 'assault' },
      assault: { label: 'a big push', attack: 'all', cfg: c => ({ miners: c.miners + 3, allEdge: 0.9, storm: 0.9 }),
        next: (ai, s) => s.pushEnded && 'pressure' },
    },
  },
  fortress: {
    name: 'Fortress', weight: 1, clans: { defense: 2.2, arcane: 1.3, beast: 0.6, archer: 1.2 },
    plan: () => ({ ballSize: rndi(15, 19), ballUpgrades: rndi(9, 13), ballBy: rnd(480, 600) }),
    start: 'fortify',
    phases: {
      fortify: { label: 'fortifying and teching up', attack: 'never',
        cfg: c => ({ towers: TOWER.max, traps: c.traps + 3, architects: Math.max(2, c.architects), saveAt: 5, armyPerUpgrade: 0.3, saveBias: 0.75,
          researchFirst: [['castle', 'archer2'], ['spear', 'shield'], ['archer', 'arrows'], ['castle', 'archer3'], ['architect', 'tower2']] }),
        next: (ai, s) => ((s.army >= ai.plan.ballSize && s.upgrades >= ai.plan.ballUpgrades) || s.inPhase > ai.plan.ballBy || (s.army >= 10 && s.ours > s.theirs * 1.8)) && 'deathball' },
      deathball: { label: 'one overwhelming push', attack: 'all', cfg: () => ({ allEdge: 0.9, storm: 0.85, lose: 0.45 }),
        next: (ai, s) => s.pushEnded && 'fortify' },
    },
  },
  raider: {
    name: 'Raider', weight: 1, clans: { shadow: 2, sky: 2, sword: 1.3 },
    plan: () => ({ harassEnd: rnd(360, 480) }),
    start: 'harass',
    phases: {
      harass: { label: 'raiding your miners', attack: 'normal',
        cfg: c => ({ raid: [16, 28], raidSize: c.raidSize + 2, mix: { ninja: 0.15, flyer: 0.12, saboteur: 0.05 } }),
        next: (ai, s) => s.inPhase > ai.plan.harassEnd && 'assault' },
      assault: { label: 'an all-out assault', attack: 'all', cfg: c => ({ allEdge: 0.85, raid: [16, 28], raidSize: c.raidSize + 2, mix: { ninja: 0.15, flyer: 0.12 } }),
        next: (ai, s) => s.pushEnded && 'harass' },
    },
  },
  contain: {
    name: 'Forward line', weight: 1, clans: { archer: 1.8, defense: 1.3, arcane: 1.1, beast: 0.7 },
    plan: () => ({}),
    start: 'contain',
    phases: {
      contain: { label: 'holding the middle and starving you out', attack: 'normal',
        cfg: c => ({ forward: true, towers: c.towers + 1, traps: c.traps + 1, storm: 1.2, shrineArmy: Math.min(c.shrineArmy, 3), shrineEdge: Math.min(c.shrineEdge, 0.6) }),
        next: () => null },
    },
  },
  timing: {
    name: 'Tech timing', weight: 1, clans: { arcane: 1.6, beast: 1.3, base: 1.1 },
    plan: () => ({ milestone: rndi(5, 7), step: rndi(3, 5), strikeArmy: rndi(8, 11) }),
    start: 'tech',
    phases: {
      tech: { label: 'teching up for a timing push', attack: 'never',
        cfg: c => ({ armyPerUpgrade: Math.max(0.25, c.armyPerUpgrade - 0.1), researchGap: 40, researchFirst: [['sword', 'blades'], ['spear', 'shield'], ['archer', 'arrows'], ['sword', 'helm'], ['archer', 'bow'], ['spear', 'helm']] }),
        next: (ai, s) => ((s.upgrades >= ai.plan.milestone && s.army >= ai.plan.strikeArmy) || s.inPhase > 300 || (s.army >= 8 && s.ours > s.theirs * 2)) && 'strike' },
      strike: { label: 'a timing push', attack: 'all', cfg: () => ({ allEdge: 0.8, storm: 0.9 }),
        next: (ai, s) => { if (!s.pushEnded) return null; ai.plan.milestone = s.upgrades + ai.plan.step; return 'tech'; } },
    },
  },
};
AI_STYLES.balanced = {
  name: 'Balanced', weight: 0.8, clans: { beast: 1.6, base: 1.1 },
  plan: () => ({}),
  start: 'steady',
  phases: {
    steady: { label: 'an even, all-round game', attack: 'normal', next: () => null },
  },
};
let LAST_AI_STYLE = null;
try { LAST_AI_STYLE = localStorage.getItem('stickfront.aiStyle'); } catch (e) { /* storage blocked */ }

// Hard and Very Hard start each game with a random edge or two (Very Hard on top of its head start).
// Each boost returns false when it doesn't suit this team (a unit or upgrade its clan can't use).
const AI_BOOSTS = {
  squad: { name: 'a veteran squad', give(team, style) {
    const types = (style === 'rush' ? ['sword', 'sword', 'spear'] : ['sword', 'archer', 'spear']).filter(t => canTrain(team, t));
    if (!types.length) return false;
    for (const t of types) spawnUnit(team, t);
    return true;
  } },
  drilled: { name: 'two upgrades already researched', give(team) {
    const picks = AI_RESEARCH.slice(0, 12).filter(([type, key]) => !team.upgrades[type][key] && !upgradeLocked(team, type, key) && !upgradeDef(type, key).requires);
    if (picks.length < 2) return false;
    for (const [type, key] of picks.sort(() => Math.random() - 0.5).slice(0, 2)) {
      team.upgrades[type][key] = true;
      for (const u of G.units) if (u.team === team.id && u.type === type) { u.perks[key] = true; applyPerks(u); }
    }
    return true;
  } },
  miners: { name: 'two extra miners', give(team) { spawnUnit(team, 'miner'); spawnUnit(team, 'miner'); return true; } },
  traps: { name: 'traps laid in front of its castle', give(team) {
    if (!canTrain(team, 'architect')) return false;
    [[1180, 0], [1260, 3], [1340, 5]].forEach(([x, row]) => freeTrap(team.id, pick(['tar', 'mine']), team.edge(x), rowY(row)));
    return true;
  } },
  tower: { name: 'an archer tower', give(team) {
    if (!canTrain(team, 'architect') || !canTrain(team, 'archer') || G.towers.some(t => t.team === team.id)) return false;
    const tw = orderTower(team, team.edge(1000), towerY(), [], true);
    if (!tw) return false;
    postArcher(spawnUnit(team, 'archer', tw.x - team.dir * 30, LANE_TOP + 10), tw);
    return true;
  } },
  chest: { name: 'a war chest', give(team) { team.gold += 300; team.mana = Math.min(MAX_MANA, team.mana + 120); return true; } },
  scholars: { name: 'cheaper research', give(team) { for (let i = 0; i < 3; i++) discountRandomUpgrade(team, 0.25, false); return true; } },
};
const AI_BOOST_COUNT = { normal: 0, hard: 1, veryhard: 3 };
const SIEGE_PATIENCE = 40;   // seconds a siege line waits outside the castle archers' reach before storming or giving up

// One unit's fighting value: what it cost this clan, weighted by its remaining health (giants count
// for less: archers shred them and they wander).
function unitPower(u) {
  const c = u.type === 'zombie' ? { gold: 45, mana: 0 } : unitCost(G.teams[u.team], u.type);   // (zombies are free, but they still fight)
  return (c.gold + c.mana) * (isGiant(u) ? 0.6 : 1) * Math.max(0.2, u.hp / u.maxHp);
}

// Rough fighting value of a side's army (cost weighted by remaining health). The whole-army
// figure counts troops hiding in the castle too; a local figure (nearX) only counts those outside.
function armyPower(teamId, nearX, radius) {
  let p = 0;
  for (const u of G.units) {
    if (u.team !== teamId || u.dead || isWorker(u)) continue;
    if (nearX !== undefined && (u.inside || Math.abs(u.x - nearX) > radius)) continue;
    p += unitPower(u);
  }
  return p;
}

class SmartAI {
  // style: force a play style (for tests); otherwise one is picked at random.
  constructor(teamId, level, style) {
    this.id = teamId;
    this.base = SMART[level];
    this.level = level;
    this.timer = 3;
    this.mode = 'build';      // build | attack | fallback | turtle | lure
    this.refitT = 60;
    this.lastResearch = 0;
    this.dry = false;         // the gold on our half is (nearly) gone: pan and prospect
    this.raid = [];           // units out raiding enemy miners
    this.probe = null;        // a small push out on its own (probe phases)
    this.failedPushes = 0;    // pushes this phase that ended in a fallback
    this.pushEnded = false;   // a push has just ended (phases move on from it)
    this.log = [];            // the style and phases played, for the end screen
    this.styleKey = style || this.pickStyle();
    this.style = AI_STYLES[this.styleKey];
    this.plan = this.style.plan();
    this.setPhase(this.style.start);
    this.nextWave = rnd(this.cfg.wave[0], this.cfg.wave[1]);
    this.nextRaid = rnd(this.cfg.raid[0], this.cfg.raid[1]) + 20;
    this.nextProbe = 0;
    if (G.time < 1) this.giveBoosts();   // a fresh game (not the autopilot taking over mid-game)
  }

  // A random style, weighted toward what suits the clan and never the one played last game.
  pickStyle() {
    const clan = G.teams[this.id].clanKey;
    const keys = Object.keys(AI_STYLES).filter(k => k !== LAST_AI_STYLE);
    const w = k => { const s = AI_STYLES[k]; return (this.level === 'normal' && s.normalWeight !== undefined ? s.normalWeight : s.weight) * ((s.clans || {})[clan] || 1); };
    let r = Math.random() * keys.reduce((n, k) => n + w(k), 0);
    const key = keys.find(k => (r -= w(k)) < 0) || keys[0];
    if (this.id === 1) {
      LAST_AI_STYLE = key;
      try { localStorage.setItem('stickfront.aiStyle', key); } catch (e) { /* storage blocked */ }
    }
    return key;
  }

  // Enter a phase of the style: its settings layered over the level's.
  setPhase(key) {
    const ph = this.style.phases[key];
    this.phaseKey = key;
    this.phase = ph;
    this.phaseT = G.time;
    this.failedPushes = 0;
    this.pushEnded = false;
    const base = this.base;
    this.cfg = { minArmy: 5, allEdge: 0.75, storm: 1.0, lose: 0.65, mix: {}, ...base, ...(ph.cfg ? ph.cfg(base) : {}) };
    this.cfg.towers = Math.min(TOWER.max, this.cfg.towers);
    if (!this.log.length) this.log.push(this.style.name);
    this.log.push(ph.label);
  }

  // Hard and Very Hard: a random edge or two to start with.
  giveBoosts() {
    const team = G.teams[this.id], edge = this.base.aiEdge;
    if (edge) {   // Very Hard's soldiers are tougher and hit harder (the ones already out too)
      team.aiEdge = edge;
      for (const u of G.units) if (u.team === this.id && !isWorker(u)) { u.maxHp *= edge.hp; u.hp = u.maxHp; }
    }
    let n = AI_BOOST_COUNT[this.level] || 0;
    this.boosts = [];
    for (const key of Object.keys(AI_BOOSTS).sort(() => Math.random() - 0.5)) {
      if (n <= 0) break;
      if (AI_BOOSTS[key].give(team, this.styleKey)) { this.boosts.push(AI_BOOSTS[key].name); n--; }
    }
  }

  // What the phase rules look at.
  phaseState(size, ours, theirs) {
    const team = G.teams[this.id];
    return {
      t: G.time, inPhase: G.time - this.phaseT, army: size, ours, theirs,
      failedPushes: this.failedPushes, pushEnded: this.pushEnded,
      upgrades: RESEARCH_TYPES.reduce((n, t) => n + Object.keys(team.upgrades[t]).length, 0),
    };
  }

  pickUnit(team) {
    const c = this.cfg;
    const army = G.units.filter(u => u.team === this.id && !u.dead && !isWorker(u));
    const count = t => army.filter(u => u.type === t).length + queuedCount(team, t);
    const can = t => canTrain(team, t);
    const extra = clanOf(team).ai || {};   // the clan's favourite units get a bigger share
    // counter what the enemy fields: spears against blades (and, with shields, against arrows),
    // shooters against spears and giants, ninjas against archers and mages
    const foes = G.units.filter(u => u.team !== this.id && !u.dead && !isWorker(u));
    const fc = (...ts) => foes.filter(u => ts.includes(u.type)).length;
    const k4 = n => Math.min(1, n / 4);
    const counter = {
      spear: 0.12 * k4(fc('sword', 'ninja')) + (team.upgrades.spear.shield ? 0.1 * k4(fc('archer')) : 0),
      archer: 0.12 * k4(fc('spear') + 2 * fc('giant')),
      flyer: 0.06 * k4(fc('spear') + 2 * fc('giant')),
      beastmaster: 0.12 * k4(fc('spear') + 2 * fc('giant')),
      ninja: 0.08 * k4(fc('archer', 'warlock', 'cleric')),
      gladiator: 0.08 * k4(fc('flyer', 'firebird')),
    };
    const share = (t, base) => base + (extra[t] || 0) + (counter[t] || 0) + (c.mix[t] || 0);   // (mix: the play style's leanings)
    // aim for a mixed army: a spear wall, plenty of swords, archers behind, some magic and a giant
    const n = army.length + 1;
    const giantCost = unitCost(team, 'giant');
    if ((c.giants || extra.giant) && can('giant') && n >= 6 && count('giant') < 1 + Math.floor(n * share('giant', 1 / 14)) && team.mana > giantCost.mana + 80 && team.gold >= giantCost.gold) return 'giant';
    // a giant clan saves its gold for the giant once a small escort is out and the mana is ready
    // (returning 'giant' while short of gold means nothing else gets bought this round)
    if (extra.giant && can('giant') && n >= 3 && count('giant') < 1 + Math.floor(n * share('giant', 1 / 14)) && team.mana >= giantCost.mana) return 'giant';
    // the Arcane Circle's Spirit Golems hold the front instead
    const golemCost = unitCost(team, 'golem');
    if (can('golem') && n >= 4 && count('golem') < 1 + Math.floor(n * share('golem', 0)) && team.mana > golemCost.mana + 40 && team.gold >= golemCost.gold) return 'golem';
    const mageMana = t => unitCost(team, t).mana + 60;
    if ((c.mages || extra.cleric) && can('cleric') && count('cleric') < Math.floor(n * share('cleric', 1 / 7)) && team.mana > mageMana('cleric')) return 'cleric';
    if ((c.mages || extra.warlock) && can('warlock') && count('warlock') < Math.floor(n * share('warlock', 1 / 7)) && team.mana > mageMana('warlock')) return 'warlock';
    // enemy Kestrels can only be answered from range: more archers (or whatever shoots for this clan)
    const enemyFlyers = G.units.filter(u => u.team !== this.id && !u.dead && isFlying(u)).length;
    // the main ranged unit is the clan's favourite one (Kestrels for the Sky Clan, Beastmasters for the
    // Beast Clan), otherwise archers; warlocks only when nothing else can shoot
    const shooters = ['archer', 'flyer', 'beastmaster'].filter(can).sort((a, b) => (extra[b] || 0) - (extra[a] || 0));
    const shooter = shooters[0] || (can('warlock') ? 'warlock' : null);
    if (shooter && (shooter !== 'warlock' || team.mana > mageMana('warlock')) && count(shooter) < n * share(shooter, shooter === 'warlock' ? 0.12 : 0.28) + enemyFlyers * 0.6) return shooter;
    const front = can('spear') ? 'spear' : null;
    if (front && count(front) < n * share('spear', 0.2)) return front;
    if (can('flyer') && count('flyer') < Math.floor(n * share('flyer', c.flyers)) + (enemyFlyers ? 1 : 0)) return 'flyer';
    if (can('firebird') && n >= 5 && count('firebird') < Math.floor(n * share('firebird', 0)) && team.mana >= unitCost(team, 'firebird').mana) return 'firebird';
    if (can('saboteur') && n >= 4 && count('saboteur') < 1 + Math.floor(n * share('saboteur', 0))) return 'saboteur';
    // a Necromancer or two once there's mana to spare, and Gladiators (their javelins answer flyers too)
    if (can('necromancer') && n >= 5 && count('necromancer') < Math.round(n * share('necromancer', 1 / 11)) && team.mana > unitCost(team, 'necromancer').mana + 50) return 'necromancer';
    if (can('gladiator') && n >= 3 && count('gladiator') < Math.round(n * share('gladiator', 0.09))) return 'gladiator';
    if (can('ninja') && count('ninja') < Math.floor(n * share('ninja', c.ninjas))) return 'ninja';
    // a ballista or two once the army has a line to stand behind
    if (can('ballista') && G.units.some(u => u.team === this.id && !u.dead && u.type === 'architect') && n >= 5 && count('ballista') < Math.floor(n * share('ballista', 0)) && team.mana >= unitCost(team, 'ballista').mana) return 'ballista';
    return 'sword';
  }

  // The next upgrade this AI wants (null when nothing is left or its building is busy).
  nextResearch(team) {
    const order = [...(this.cfg.researchFirst || []), ...AI_RESEARCH];   // the play style's priorities first
    for (const [type, key] of order) {
      if (team.upgrades[type][key] || upgradeLocked(team, type, key)) continue;
      const d = upgradeDef(type, key);
      if (this.cfg.research === 'basic' && (d.requires || ['giant', 'cleric', 'warlock', 'castle'].includes(type))) continue;
      if (d.requires && !team.upgrades[type][d.requires]) continue;
      if (team.research[type]) continue;
      // no point researching for ninjas, Kestrels or ballistas it hasn't built
      if (['ninja', 'flyer', 'ballista', 'golem', 'beastmaster', 'saboteur', 'firebird', 'architect', 'quartermaster', 'gladiator', 'necromancer'].includes(type) && !G.units.some(u => u.team === this.id && !u.dead && u.type === type)) continue;
      return { type, d };
    }
    return null;
  }

  // Research when affordable. Returns true while saving up for it (so unit production pauses).
  research(team, armySize, behind) {
    const next = this.nextResearch(team);
    if (!next) return false;
    // with a small army, research only out of spare gold; once the army is decent, save up for it
    const owned = RESEARCH_TYPES.reduce((n, t) => n + Object.keys(team.upgrades[t]).length, 0);
    // on a poor map the army may never get big enough to start saving, so after too long
    // without any research it saves up anyway (as long as it has the mana)
    const starved = G.time > 120 && G.time - this.lastResearch > this.cfg.researchGap && team.mana >= (next.d.mana || 0);
    const core = starved || armySize >= this.cfg.saveAt + owned * this.cfg.armyPerUpgrade;   // grow army and upgrades together
    const reserve = core ? 50 : this.cfg.reserve;
    // a giant clan keeps its mana for its first giants rather than spending it on research
    const giantMana = clanOf(team).ai && clanOf(team).ai.giant && canTrain(team, 'giant') && !G.units.some(u => u.team === this.id && !u.dead && isGiant(u)) ? unitCost(team, 'giant').mana : 0;
    const price = upgradePrice(team, next.type, next.d);   // after its architects' savings
    if (team.gold >= price.gold + reserve && team.mana >= price.mana + (price.mana ? giantMana : 0)) {
      startResearch(team, next.type, next.d.key);
      this.lastResearch = G.time;
      return false;
    }
    if (behind) return false;   // never stop building troops while the enemy army is bigger
    return core && (starved || chance(this.cfg.saveBias));
  }

  economy(team, miners, armySize) {
    const c = this.cfg;
    let goal = armySize >= 4 ? c.miners : Math.min(c.miners, 6);   // a few soldiers before the full workforce
    // with the gold on our half gone, more miners only means more mouths: just the stream and the restorers
    if (this.dry) goal = Math.min(goal, Math.max(PAN_SLOTS, miners.length));
    if (miners.length + queuedCount(team, 'miner') < goal) queueUnit(team, 'miner');
    // a Quartermaster once there's an army to look after (two on Hard and up once it's big), or
    // straight away when the gold on our half runs low (they restore spent deposits)
    const qms = G.units.filter(u => u.team === this.id && !u.dead && u.type === 'quartermaster').length + queuedCount(team, 'quartermaster');
    const wantQm = this.dry ? 1 : armySize >= 4 ? (this.level !== 'normal' && armySize >= 10 ? 2 : 1) : 0;
    if (canTrain(team, 'quartermaster') && qms < wantQm && team.gold > 260) queueUnit(team, 'quartermaster');
    const praying = miners.filter(u => u.order.type === 'mana').length;
    const panning = miners.filter(u => u.order.type === 'pan').length;
    const free = miners.filter(u => u.order.type === 'stance' || u.order.type === 'work');
    // pray only while mana is short; with plenty banked, the worshipper goes back to digging gold
    if (team.mana > c.manaCap) { for (const u of miners) if (u.order.type === 'mana') setOrder(u, { type: 'stance' }); }
    else if (miners.length >= c.prayAt && praying < Math.max(c.praying, clanOf(team).aiPray || 0) && free.length) setOrder(free.shift(), { type: 'mana' });
    else if (!this.dry && miners.length >= c.panAt && panning < c.panning && free.length) setOrder(free.shift(), { type: 'pan' });
    this.manageMiners(team, miners, free, panning, praying);
    this.protectMiners(team);
  }

  // Keep every miner earning, and never send them to dig on the enemy's half. A deposit is worth
  // working if it's on our half (raids are protectMiners' business). A miner with
  // nothing safe to dig (no deposit, an empty one, or one across the middle) goes to pan the castle
  // stream first; with every pan taken it restores an exhausted deposit near home (Prospecting,
  // which the AI researches as soon as miners stand idle), and failing that it prays. When the gold
  // on our half runs low (dry) the extra miners stop being trained; when it's back, the extra
  // panners go back to mining.
  manageMiners(team, miners, free, panning, praying) {
    const foe = 1 - this.id;
    const home = m => team.dir * (WORLD_W / 2 - m.x) > 0;
    const safe = m => m.gold > 0 && home(m);   // (danger is handled by protectMiners, which pulls everyone in)
    const left = G.mines.filter(m => home(m) && m.gold > 0).reduce((s, m) => s + m.gold, 0);
    if (!this.dry && left < 500) this.dry = true;
    else if (this.dry && left > 1500) {
      this.dry = false;
      let extra = panning - this.cfg.panning;
      for (const u of miners) if (extra > 0 && u.order.type === 'pan') { setOrder(u, { type: 'stance' }); extra--; panning--; }
    }
    if (team.minersIn) return;
    // miners digging (or heading for) a safe deposit, or carrying gold home, carry on
    const hasRoom = G.mines.some(m => safe(m) && m.workers.length < MINE_SLOTS);
    const idle = free.filter(u => !(u.carry > 0) && (u.mine ? !safe(u.mine) : !hasRoom));
    this.idleMiners = idle.length;
    // the castle stream first
    while (panning < PAN_SLOTS && idle.length) { setOrder(idle.shift(), { type: 'pan' }); panning++; }
    // nothing else to do: pray (or, with the statue crowded, rest inside by the stream)
    for (const u of idle) setOrder(u, praying++ < MANA_SLOTS ? { type: 'mana' } : { type: 'pan' });
  }

  // Pull the miners into the castle (where they pan the stream) while an enemy force our troops
  // can't handle is near them, and send them back out once it has gone.
  protectMiners(team) {
    const danger = minersInDanger(team);
    if (danger !== team.minersIn) setMinerGarrison(team, danger);
  }

  // Where to hold the line (via the muster point): in front of the miners' furthest deposit,
  // at the shrine when strong enough to claim it, or back by the statue when outmatched.
  guardLine(team, army, ours, theirs) {
    const hard = this.level !== 'normal', dir = team.dir;   // Hard and Very Hard
    let spot = null;
    // cover the miners: stand just beyond the furthest deposit being worked
    const worked = G.mines.filter(m => m.gold > 0 && m.workers.some(w => w.team === this.id)).map(m => m.x);
    if (worked.length && army.length >= 3) spot = (dir > 0 ? Math.max(...worked) : Math.min(...worked)) + dir * 70;
    // the Monolith comes first: claim it (or take it back) as soon as the army can contest it,
    // standing on it rather than in front of it so the capture runs
    const c = this.cfg, s = G.shrine;
    const claim = s && army.length >= c.shrineArmy && ours >= theirs * c.shrineEdge * (s.owner === 1 - this.id ? 0.9 : 1);
    // a forward-line style holds the middle of the map as soon as it can contest it
    if (c.forward && army.length >= 4 && ours >= theirs * 0.8) spot = WORLD_W / 2 - dir * 70;
    if (claim) spot = s.x - dir * (hard ? 10 : 40);
    // outmatched: fall back under the castle archers
    if (!claim && ours < theirs * 0.8) spot = null;
    if (spot !== null) spot = musterClamp(team, spot);
    const moved = spot === null ? team.musterX !== null : team.musterX === null || Math.abs(team.musterX - spot) > 40;
    if (!moved) return;
    team.musterX = spot;
    // new troops waiting at the old muster point move up (or back) with the line
    for (const u of army) if (u.order.type === 'hold' || u.order.type === 'move') setOrder(u, { type: 'stance' });
  }

  // Raids: every so often a small, quick party slips out to hunt enemy miners working away from
  // their army. It hunts from miner to miner and comes home when hurt, outmatched or out of prey.
  raidMiners(team, army) {
    const foe = 1 - this.id, c = this.cfg;
    const prey = (x, reach) => G.units.filter(e => e.team === foe && !e.dead && !e.inside && e.type === 'miner' && Math.abs(e.x - x) < reach)
      .sort((a, b) => Math.abs(a.x - x) - Math.abs(b.x - x))[0];
    this.raid = this.raid.filter(u => !u.dead && army.includes(u));
    if (this.raid.length) {
      const x = this.raid.reduce((s, u) => s + u.x, 0) / this.raid.length;
      const ours = armyPower(this.id, x, 350), theirs = armyPower(foe, x, 350);
      const hurt = this.raid.reduce((s, u) => s + u.hp, 0) < this.raid.reduce((s, u) => s + u.maxHp, 0) * 0.45;
      const target = prey(x, 700);
      if (hurt || theirs > ours * 1.3 || !target) {
        for (const u of this.raid) setOrder(u, { type: 'stance' });
        this.raid = [];
        return;
      }
      for (const u of this.raid) if (u.order.type !== 'attack' || !isValidTarget(u.order.target)) setOrder(u, { type: 'attack', target: prey(u.x, 700) || target });
      return;
    }
    const soon = this.nextWave - G.time;
    if (G.time < this.nextRaid || (soon > 0 && soon < 25)) return;   // not just before a wave
    this.nextRaid = G.time + 10;   // nothing worth hitting: look again shortly
    // raid with the quick ones (Kestrels, ninjas, Swordwrath), at least two, keeping two soldiers home
    const quick = army.filter(u => ['flyer', 'ninja', 'sword'].includes(u.type) && u.order.type !== 'refit' && u.order.type !== 'group' && u.hp > u.maxHp * 0.7)
      .sort((a, b) => ['flyer', 'ninja', 'sword'].indexOf(a.type) - ['flyer', 'ninja', 'sword'].indexOf(b.type));
    const party = quick.slice(0, Math.min(c.raidSize, army.length - 2));
    if (party.length < 2) return;
    const power = party.reduce((s, u) => s + unitCost(team, u.type).gold, 0);
    // a miner whose army isn't close enough to cover it
    const targets = G.units.filter(e => e.team === foe && !e.dead && !e.inside && e.type === 'miner' && armyPower(foe, e.x, 350) < power * 0.6);
    if (!targets.length) return;
    const t = targets.sort((a, b) => Math.abs(a.x - team.statue.x) - Math.abs(b.x - team.statue.x))[0];
    for (const u of party) setOrder(u, { type: 'attack', target: t });
    this.raid = party;
    this.nextRaid = G.time + rnd(c.raid[0], c.raid[1]);
  }

  update(dt) {
    const team = G.teams[this.id], foe = 1 - this.id, c = this.cfg;
    // Hard's extra income (it cheats a little to keep the pressure on)
    if (c.stipend && !team.statue.dead && !G.over) {
      team.gold += c.stipend * dt;
      team.mana = Math.min(MAX_MANA, team.mana + c.stipendMana * dt);
    }
    this.timer -= dt;
    this.refitT -= dt;
    if (this.timer > 0) return;
    this.timer = rnd(c.think[0], c.think[1]);
    team.aiControl = true;   // (the computer runs this side: see updateGiant)

    const mine = G.units.filter(u => u.team === this.id && !u.dead);
    const miners = mine.filter(u => u.type === 'miner');
    const army = mine.filter(u => !isWorker(u) && !isGiant(u) && u.type !== 'zombie' && u.order.type !== 'tower');   // archers posted in towers stay there; zombies follow their master
    this.economy(team, miners, army.length);
    this.architects(team, army);
    const threatNow = armyPower(foe, team.statue.x, 900) > 300;
    const saving = this.research(team, army.length, armyPower(this.id) < armyPower(foe) * 0.85) && !threatNow;
    if (!saving) for (let i = 0; i < c.perThink; i++) if (miners.length >= 3) queueUnit(team, this.pickUnit(team));

    // veterans go back for the upgrades they missed
    if (c.research === 'all' && this.refitT <= 0 && team.gold > 500) {
      this.refitT = 45;
      for (const u of army) if (missingUpgrades(u).length && Math.abs(u.x - team.statue.x) < 700) setOrder(u, { type: 'refit' });
    }

    const ours = armyPower(this.id), theirs = armyPower(foe);
    const threat = armyPower(foe, team.statue.x, 900);
    const near = armyPower(this.id, team.statue.x, 900);
    // at home our castle archers fight for us
    const homeFort = team.archers.length * 300;
    const statueHit = this.lastStatueHp !== undefined && team.statue.hp < this.lastStatueHp - 1;
    this.lastStatueHp = team.statue.hp;

    // the enemy statue is down and its giant is loose: lure it out from under the castle archers
    const sg = G.teams[foe].statueGiant;
    if (sg && !sg.dead) {
      this.lureGiant(team, foe, army, sg);
      this.unitTactics(team, mine, army, foe);
      return;
    }

    // what a push is up against: the castle archers and archers posted in towers (long reach, and
    // faster with the castle garrisoned)
    const fort = G.teams[foe].archers.length * 300 + G.towers.filter(tw => !tw.dead && tw.archer && !tw.archer.dead && tw.archer.team === foe).length * 300;
    // the play style moves on to its next phase when the moment comes
    // how big the army is for deciding when to attack: a giant counts as two soldiers
    const size = army.length + 2 * mine.filter(u => isGiant(u) && !u.isStatueGiant).length;
    const nextKey = this.phase.next(this, this.phaseState(size, ours, theirs));
    if (nextKey && nextKey !== this.phaseKey) this.setPhase(nextKey);
    const cc = this.cfg, how = this.phase.attack;
    let readyToAttack = false;
    if (how === 'all') {
      // all in: go as soon as there's a handful of troops and the odds aren't hopeless
      readyToAttack = size >= cc.minArmy && ours >= theirs * cc.allEdge && G.time >= (this.retryAt || 0);
    } else if (how === 'never') {
      // building up, but not blind to an opening: far ahead, it attacks anyway
      readyToAttack = size >= 8 && ours > (theirs + fort) * 1.8;
    } else {
      // push out when ahead, or once the game has gone on a while and the armies are roughly even;
      // never march with just a giant and a handful of troops (a lone giant charges off on its own).
      // A wave goes out on a timer as long as the armies are close, so there's never a long standoff
      // (probing styles send their small pushes instead).
      const late = G.time > 210 && size >= 6 && ours > (theirs + fort) * 0.9;
      const wave = how === 'normal' && G.time >= this.nextWave && size >= 6 && ours >= (theirs + fort * 0.5) * cc.waveEdge;
      readyToAttack = size >= cc.minArmy && ((ours >= cc.attackPower && ours > (theirs + fort) * cc.edge) || (size >= cc.bigArmy && ours > theirs * cc.edge) || late || wave);
    }
    if (this.mode !== 'attack' && this.mode !== 'turtle' && readyToAttack) {
      this.mode = 'attack';
      this.raid = [];   // raiders join the push
      this.probe = null;   // and so does a probe that's out
      team.musterX = null;   // new troops follow the attack instead of waiting at the old muster point
      // march out in step (Advance) and stay in it: the line fights what reaches it and keeps its shape
      if (cc.formations || cc.advance) formGroup(team, army.filter(u => !u.aiHealing), 'advance');   // the wounded stay in to heal
      else setStance(team, 'attack');
    } else if (this.mode === 'attack' && (ours < theirs * cc.lose || this.pushBroken(team, foe, fort))) {
      // losing the push: fall back together and regroup, and try again after a while (an all-in
      // style comes straight back once it has regrouped)
      this.mode = 'fallback';
      this.failedPushes++;
      this.pushEnded = true;
      this.nextWave = G.time + rnd(cc.wave[0], cc.wave[1]);
      this.retryAt = G.time + rnd(20, 35);
      if (cc.formations) formGroup(team, army, 'retreat');
      else setStance(team, 'defend');
    } else if (this.mode !== 'attack' && this.mode !== 'turtle' && G.time > (this.turtleCd || 0) && threat > 400 && threat > (near + homeFort) * 1.25) {
      // outmatched at home: hold the castle (troops heal inside, the castle archers shoot faster)
      this.mode = 'turtle';
      this.raid = [];
      this.probe = null;
      team.musterX = null;
      setStance(team, 'garrison');
    } else if (this.mode === 'turtle' && (statueHit || threat < (near + homeFort) * 0.9 || threat < 200)) {
      // they've come for the statue (or the odds have turned): everyone out to meet them, and no
      // ducking back in for a while (running in and out wastes the army)
      this.mode = 'build';
      this.turtleCd = G.time + 25;
      setStance(team, 'defend');
    } else if (this.mode === 'fallback' && army.every(u => u.order.type !== 'group')) {
      setStance(team, 'defend');
      this.mode = 'build';
    } else if (this.mode === 'attack' && (cc.formations || cc.advance)) {
      // reinforcements join the march
      const fresh = army.filter(u => u.order.type !== 'group' && u.order.type !== 'refit');
      if (fresh.length >= 3) formGroup(team, fresh, 'advance');
    } else if (this.mode === 'attack') {
      // no formations: anyone left standing on an order joins the push
      for (const u of army) if (u.order.type === 'hold' || u.order.type === 'move') setOrder(u, { type: 'stance' });
    }

    if (this.mode === 'attack' || this.probe) this.siege(team, foe, fort);
    if (how === 'probe') this.probes(team, army, foe, fort);
    if (this.mode === 'build' || this.mode === 'fallback') {
      this.guardLine(team, army, ours, theirs);
      this.raidMiners(team, army);
    }
    if (this.mode !== 'attack') this.healWounded(team, army, foe);
    this.unitTactics(team, mine, army, foe);
  }

  // The enemy's strength around x: troops outside, plus (near their castle) the castle archers,
  // posted tower archers and whoever is sheltering inside, who come out to fight.
  defenceAt(foe, x, fort) {
    const enemy = G.teams[foe];
    let p = armyPower(foe, x, 600);
    if (Math.abs(x - enemy.gateX) < castleArcherStats(enemy).reach + 200) {
      p += fort;
      for (const u of G.units) if (u.team === foe && !u.dead && u.inside && !isWorker(u)) p += unitPower(u);
    }
    return p;
  }

  // Our marching lines (not retreating).
  lines() {
    return G.groups.filter(g => g.team === this.id && !g.done && g.mode !== 'retreat' && g.members.length);
  }

  // Our giants marching with a line (they never join the formation itself, but fight with it).
  giantsNear(x) {
    let p = 0;
    for (const u of G.units) if (u.team === this.id && isGiant(u) && !u.dead && !u.inside && Math.abs(u.x - x) < 400) p += unitPower(u);
    return p;
  }

  // A push is broken when its lines are badly outmatched where they stand.
  pushBroken(team, foe, fort) {
    const lines = this.lines();
    if (!lines.length) return false;
    const lead = lines.reduce((a, b) => (team.dir * (b.anchor - a.anchor) > 0 ? b : a));
    const ours = lines.reduce((s, g) => s + g.members.reduce((n, u) => n + unitPower(u), 0), 0) + this.giantsNear(lead.anchor);
    return lines.some(g => g.giveUp) || ours < this.defenceAt(foe, lead.anchor, fort) * 0.6;
  }

  // Siege: a line that reaches the edge of the enemy castle archers' reach halts there (fighting
  // whatever comes out to it, picking off miners) until it's strong enough to storm the statue,
  // instead of walking into the arrows and throwing the army away. A badly hurt statue gets stormed
  // sooner. It won't sit there for ever while the enemy builds up behind its walls: after
  // SIEGE_PATIENCE seconds it storms if the odds are close, and otherwise gives up and falls back.
  siege(team, foe, fort) {
    const enemy = G.teams[foe], es = enemy.statue;
    const edge = enemy.edge(castleArcherStats(enemy).reach + 30);
    const lines = this.lines();
    const power = g => g.members.reduce((n, u) => n + unitPower(u), 0);
    for (const g of lines) {
      if (g.storming || team.dir * (g.anchor - edge) < -10) { g.halt = false; continue; }
      // (giants are the castle-breakers: they soak the arrows while they pound the statue)
      const ours = lines.filter(o => Math.abs(o.anchor - g.anchor) < 300).reduce((s, o) => s + power(o), 0) + this.giantsNear(g.anchor) * 1.6;
      const odds = ours / Math.max(1, this.defenceAt(foe, g.anchor, fort));
      const storm = es.hp < es.max * 0.3 ? 0.8 : this.cfg.storm;
      g.halt = odds < storm;
      if (!g.halt) { g.haltSince = null; continue; }
      if (g.haltSince == null) g.haltSince = G.time;
      if (G.time - g.haltSince > SIEGE_PATIENCE) {
        if (odds >= 0.7) { g.storming = true; g.halt = false; }   // close enough: go in
        else g.giveUp = true;   // (pushBroken sees it and the push falls back)
      }
    }
  }

  // Probing styles: while the main army holds the line, a small party marches out in step to hit
  // the enemy line or miners, and comes home when outmatched, cut down to half, or after a while.
  probes(team, army, foe, fort) {
    const p = this.probe;
    if (p) {
      const left = p.members.filter(u => !u.dead && u.order.type === 'group' && u.order.g === p);
      const ours = left.reduce((n, u) => n + unitPower(u), 0) + this.giantsNear(p.anchor);
      if (p.done || left.length <= p.startN / 2 || G.time > p.until || ours < this.defenceAt(foe, p.anchor, fort) * 0.9) {
        for (const u of left) setOrder(u, { type: 'stance' });   // back to the line
        if (left.length <= p.startN / 2) this.failedPushes++;
        this.probe = null;
        const every = this.plan.probeEvery || [30, 50];
        this.nextProbe = G.time + rnd(every[0], every[1]);
      }
      return;
    }
    if (this.mode !== 'build' || G.time < this.nextProbe) return;
    const kinds = ['sword', 'spear', 'ninja', 'flyer', 'archer', 'golem'];   // (beastmasters stay with their giants)
    const party = army.filter(u => kinds.includes(u.type) && (u.order.type === 'stance' || u.order.type === 'hold') && !u.aiHealing && u.hp > u.maxHp * 0.7 && !this.raid.includes(u))
      .sort((a, b) => kinds.indexOf(a.type) - kinds.indexOf(b.type))
      .slice(0, Math.min(this.plan.probeSize || 5, army.length - 3));
    if (party.length < 3) { this.nextProbe = G.time + 8; return; }
    this.probe = formGroup(team, party, 'advance');
    this.probe.startN = party.length;
    this.probe.until = G.time + rnd(40, 60);
  }

  // The enemy statue has fallen and its giant is loose. Fighting it under the castle archers throws
  // the army away, so hold a line just out of their reach until it comes out, then fall on it.
  lureGiant(team, foe, army, sg) {
    const enemy = G.teams[foe];
    const line = enemy.edge(castleArcherStats(enemy).reach + 90);
    const out = team.dir * (sg.x - line) < 0 || !enemy.archers.length;   // it's in the open
    if (this.mode !== 'lure') { this.mode = 'lure'; this.raid = []; }
    if (out) { if (team.stance !== 'attack') setStance(team, 'attack'); return; }
    const spot = musterClamp(team, line - team.dir * 30);
    if (team.stance !== 'defend' || team.musterX === null || Math.abs(team.musterX - spot) > 20) {
      setStance(team, 'defend');
      team.musterX = spot;
    }
  }

  // Architects: one or two once the army is under way. They mend damaged trenches and towers, keep
  // an archer tower (or two) just behind the line and traps ahead of it, and study the rest of the
  // time (that happens by itself). Empty towers, ours or the Monolith's, get an archer posted.
  architects(team, army) {
    const c = this.cfg, foe = 1 - this.id;
    if (!c.architects || !canTrain(team, 'architect')) return;
    const archs = G.units.filter(u => u.team === this.id && !u.dead && u.type === 'architect');
    if (archs.length + queuedCount(team, 'architect') < c.architects && army.length >= 6 && team.gold > 300) queueUnit(team, 'architect');
    this.postArchers(team, army, foe);
    const idle = archs.filter(u => u.order.type === 'stance' || u.order.type === 'hold');
    if (!idle.length || this.mode === 'turtle' || team.minersIn) return;
    // mend what's damaged first
    if ([...G.walls, ...G.towers].some(w => w.team === this.id && !w.dead && w.progress >= 1 && w.hp < w.max * 0.7)) {
      repairStructures(team, [idle.shift()]);
      if (!idle.length) return;
    }
    // rebuild our ruins (cheap), and the Monolith's tower while our army holds the ground there
    const ruin = [...G.towers, ...G.walls].find(s => s.ruin && team.gold >= rebuildCost(s) + 40 &&
      (s.team === this.id || (s.mid && armyPower(this.id, s.x, 400) > armyPower(foe, s.x, 400) + 100)));
    if (ruin) {
      rebuildStructure(team, ruin, [idle.shift()]);
      if (!idle.length) return;
    }
    const line = defendLine(team);
    // a tower just behind the line
    const towers = G.towers.filter(t => t.team === this.id && !t.dead);
    // (only when we're not clearly ahead: static defence is no use to an army that's winning)
    if (towers.length < c.towers && army.length >= 5 + towers.length * 2 && team.gold >= TOWER.cost + 20 && armyPower(this.id) < armyPower(foe) * 1.1) {   // (troops first: a tower per few soldiers)
      const x = line - team.dir * 40, y = rowY(towers.length % 2 ? 4 : 1);
      if (!towerSpotProblem(team, x, y)) { orderTower(team, x, y, [idle.shift()]); if (!idle.length) return; }
    }
    // traps ahead of it
    if (c.traps && team.gold > 200 && army.length >= 4 && G.traps.filter(t => t.team === this.id).length < c.traps) {
      const kind = chance(0.5) ? 'tar' : 'mine';
      if (((team.trapCd || {})[kind] || 0) <= G.time) {
        for (let tries = 0; tries < 8; tries++) {
          const x = line + team.dir * rnd(90, 280), y = rowY(rndi(0, 5));
          if (!trapSpotProblem(team, x, y)) { orderTrap(team, kind, x, y, [idle.shift()]); break; }
        }
      }
    }
  }

  // Empty towers get an archer: our own, and the Monolith's neutral one when our army holds the ground.
  postArchers(team, army, foe) {
    for (const tw of G.towers) {
      if (tw.dead || tw.progress < 1 || (tw.archer && !tw.archer.dead)) continue;
      if (tw.team !== this.id && !(tw.team === -1 && armyPower(this.id, tw.x, 400) > armyPower(foe, tw.x, 400) + 100)) continue;
      const a = army.filter(u => u.type === 'archer' && (u.order.type === 'stance' || u.order.type === 'hold') && Math.abs(u.x - tw.x) < 1400)
        .sort((p, q) => Math.abs(p.x - tw.x) - Math.abs(q.x - tw.x))[0];
      if (a) postArcher(a, tw);
    }
  }

  // Badly hurt soldiers slip back into the castle to heal between fights, and rejoin when mended.
  healWounded(team, army, foe) {
    for (const u of army) {
      if (u.aiHealing) {
        if (u.hp >= u.maxHp * 0.9 || u.order.type !== 'garrison') {
          u.aiHealing = false;
          if (u.order.type === 'garrison') setOrder(u, { type: 'stance' });
        }
        continue;
      }
      if (u.hp > u.maxHp * 0.35 || u.order.type === 'group' || u.order.type === 'refit' || u.order.type === 'attack') continue;
      if (Math.abs(u.x - team.statue.x) > 1400) continue;   // too far from home to make it back
      if (G.units.some(e => e.team === foe && !e.dead && !e.inside && Math.abs(e.x - u.x) < 160)) continue;   // still fighting
      setOrder(u, { type: 'garrison' });
      u.aiHealing = true;
    }
  }

  // Per-unit tricks: saboteurs, golems and shield walls.
  unitTactics(team, mine, army, foe) {
    const c = this.cfg;
    // saboteurs: salt a deposit enemy miners are working (one saboteur per deposit), or undermine an enemy trench
    for (const u of mine) {
      if (u.type !== 'saboteur' || u.order.type === 'salt' || u.order.type === 'refit') continue;
      const busy = m => mine.some(o => o !== u && o.order.type === 'salt' && o.order.mine === m);
      const target = G.mines.filter(m => m.gold > 0 && !(m.saltT > 3 && m.saltTeam === this.id) && !busy(m) && m.workers.some(w => w.team === foe))
        .sort((a, b) => Math.abs(a.x - u.x) - Math.abs(b.x - u.x))[0];
      if (target) { setOrder(u, { type: 'salt', mine: target }); continue; }
      const trench = G.walls.find(w => w.team === foe && !w.dead && w.progress >= 1);
      if (trench && u.order.type !== 'attack') setOrder(u, { type: 'attack', target: trench });
    }

    // golems hunker down when swarmed or badly hurt in a fight, and stand up again once it eases
    for (const u of mine) {
      if (u.type !== 'golem') continue;
      const close = G.units.filter(e => e.team === foe && !e.dead && !e.inside && Math.abs(e.x - u.x) < 120 && Math.abs(e.y - u.y) < 60).length;
      u.shieldWall = team.mana > 10 && (close >= 3 || (close >= 1 && u.hp < u.maxHp * 0.4));   // it costs mana
    }

    // hard: brace the spear line when enemy archers are firing on it
    if (c.formations) {
      for (const u of army) {
        if (u.type !== 'spear' || !u.perks.shield) continue;
        const archers = G.units.some(e => e.team === foe && !e.dead && e.type === 'archer' && Math.abs(e.x - u.x) < 420);
        const melee = G.units.some(e => e.team === foe && !e.dead && !isRanged(e) && e.type !== 'miner' && Math.abs(e.x - u.x) < 60);
        u.shieldWall = archers && !melee;
      }
    }
  }
}
