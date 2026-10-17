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
    const army = mine.filter(u => u.type !== 'miner');

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
// research, attacks when it has the edge and falls back when losing. Hard: researches everything,
// gathers mana, fields mages and giants, refits veterans, and attacks and retreats in formations.
// Very Hard: Hard, but quicker to decide, quicker to strike and better paid.
const SMART = {
  normal: { think: [2, 3.5], miners: 7, praying: 1, panning: 0, research: 'basic', mages: true, giants: false, formations: false, perThink: 1, attackPower: 800, edge: 1.05, saveAt: 7, bigArmy: 9, reserve: 250, saveBias: 0.7, armyPerUpgrade: 0.8, researchGap: 90, prayAt: 4, panAt: 99, manaCap: 300, ninjas: 0.1, flyers: 0.06,
    wave: [140, 180], waveEdge: 0.95, raid: [90, 130], raidSize: 2, shrineArmy: 5, shrineEdge: 0.9, stipend: 0, stipendMana: 0 },
  hard: { think: [1, 1.8], miners: 8, praying: 1, panning: 1, research: 'all', mages: true, giants: true, formations: true, perThink: 2, attackPower: 1000, edge: 1.0, saveAt: 7, bigArmy: 9, reserve: 250, saveBias: 0.6, armyPerUpgrade: 0.35, researchGap: 70, prayAt: 5, panAt: 8, manaCap: 700, ninjas: 0.14, flyers: 0.1,
    wave: [80, 110], waveEdge: 0.85, raid: [45, 70], raidSize: 3, shrineArmy: 3, shrineEdge: 0.6, stipend: 1.5, stipendMana: 0.4 },
  veryhard: { think: [0.6, 1.2], miners: 9, praying: 1, panning: 1, research: 'all', mages: true, giants: true, formations: true, perThink: 3, attackPower: 950, edge: 0.95, saveAt: 7, bigArmy: 8, reserve: 200, saveBias: 0.5, armyPerUpgrade: 0.3, researchGap: 60, prayAt: 5, panAt: 8, manaCap: 800, ninjas: 0.14, flyers: 0.1,
    wave: [65, 90], waveEdge: 0.8, raid: [35, 55], raidSize: 4, shrineArmy: 3, shrineEdge: 0.55, stipend: 3, stipendMana: 0.8 },
};
// Keeping the player busy: besides its big attacks, the AI sends a wave on a timer (wave, in seconds
// after the last push ends) once its army is at least waveEdge of the enemy's (plus half its castle
// archers' worth), and small raiding parties (up to raidSize units every raid seconds) at miners
// working away from their army. It goes for the Monolith with shrineArmy soldiers at shrineEdge of
// the enemy army. Hard also gets a small income on top of its mining (stipend gold and stipendMana
// mana per second) to pay for all that.

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
  ['flyer', 'barbs2'], ['archer', 'steady'], ['castle', 'levy2'], ['spear', 'javelin'],
  ['ballista', 'torsion'], ['ballista', 'ironbolt'], ['ballista', 'mantlet'], ['golem', 'plating'], ['golem', 'core'], ['beastmaster', 'stones'], ['beastmaster', 'lore'], ['saboteur', 'sappers'], ['saboteur', 'brine'], ['firebird', 'pitch'], ['firebird', 'fuse'],
  ['cleric', 'big'], ['warlock', 'pool'], ['cleric', 'speed'], ['warlock', 'speed'], ['cleric', 'might'],
  ['warlock', 'might'], ['miner', 'pick2'], ['miner', 'bag2'], ['spear', 'shield2'], ['archer', 'fire'],
  ['sword', 'leap'], ['sword', 'rage2'], ['giant', 'stun'], ['giant', 'protein2'], ['castle', 'tithe2'],
  ['castle', 'archer3'], ['castle', 'archer4'], ['miner', 'devout2'], ['miner', 'pan1'], ['miner', 'pan2'], ['giant', 'protein3'], ['castle', 'levy'],
  ['miner', 'mule'], ['miner', 'diamond'], ['castle', 'gilded'],
];
// Never researched by the AI because it doesn't use them: Earthworks and Palisade. Prospecting only
// once the gold on its half of the map runs low.

// Rough fighting value of a side's army (cost weighted by remaining health). The whole-army
// figure counts troops hiding in the castle too; a local figure (nearX) only counts those outside.
function armyPower(teamId, nearX, radius) {
  let p = 0;
  for (const u of G.units) {
    if (u.team !== teamId || u.dead || u.type === 'miner') continue;
    if (nearX !== undefined && (u.inside || Math.abs(u.x - nearX) > radius)) continue;
    // what the unit cost this clan; giants count for less (archers shred them and they wander)
    const c = unitCost(G.teams[u.team], u.type);
    p += (c.gold + c.mana) * (isGiant(u) ? 0.6 : 1) * Math.max(0.2, u.hp / u.maxHp);
  }
  return p;
}

class SmartAI {
  constructor(teamId, level) {
    this.id = teamId;
    this.cfg = SMART[level];
    this.level = level;
    this.timer = 3;
    this.mode = 'build';      // build | attack | fallback
    this.refitT = 60;
    this.lastResearch = 0;
    this.dry = false;         // the gold on our half is (nearly) gone: pan and prospect
    this.nextWave = rnd(this.cfg.wave[0], this.cfg.wave[1]);
    this.nextRaid = rnd(this.cfg.raid[0], this.cfg.raid[1]) + 20;
    this.raid = [];           // units out raiding enemy miners
  }

  pickUnit(team) {
    const c = this.cfg;
    const army = G.units.filter(u => u.team === this.id && !u.dead && u.type !== 'miner');
    const count = t => army.filter(u => u.type === t).length + queuedCount(team, t);
    const can = t => canTrain(team, t);
    const extra = clanOf(team).ai || {};   // the clan's favourite units get a bigger share
    // counter what the enemy fields: spears against blades (and, with shields, against arrows),
    // shooters against spears and giants, ninjas against archers and mages
    const foes = G.units.filter(u => u.team !== this.id && !u.dead && u.type !== 'miner');
    const fc = (...ts) => foes.filter(u => ts.includes(u.type)).length;
    const k4 = n => Math.min(1, n / 4);
    const counter = {
      spear: 0.12 * k4(fc('sword', 'ninja')) + (team.upgrades.spear.shield ? 0.1 * k4(fc('archer')) : 0),
      archer: 0.12 * k4(fc('spear') + 2 * fc('giant')),
      flyer: 0.06 * k4(fc('spear') + 2 * fc('giant')),
      beastmaster: 0.12 * k4(fc('spear') + 2 * fc('giant')),
      ninja: 0.08 * k4(fc('archer', 'warlock', 'cleric')),
    };
    const share = (t, base) => base + (extra[t] || 0) + (counter[t] || 0);
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
    if (can('ninja') && count('ninja') < Math.floor(n * share('ninja', c.ninjas))) return 'ninja';
    // a ballista or two once the army has a line to stand behind
    if (can('ballista') && n >= 5 && count('ballista') < Math.floor(n * share('ballista', 0)) && team.mana >= unitCost(team, 'ballista').mana) return 'ballista';
    return 'sword';
  }

  // The next upgrade this AI wants (null when nothing is left or its building is busy).
  nextResearch(team) {
    // enemy flyers about and Spearton in the army: Javelins jump the queue
    const flyers = G.units.some(u => u.team !== this.id && !u.dead && isFlying(u));
    const spears = G.units.some(u => u.team === this.id && !u.dead && u.type === 'spear');
    let order = flyers && spears ? [['spear', 'javelin'], ...AI_RESEARCH] : AI_RESEARCH;
    // our gold is running out: Prospecting comes first, to restore the exhausted deposits
    if (this.dry) order = [['miner', 'prospect'], ...order];
    for (const [type, key] of order) {
      if (team.upgrades[type][key] || upgradeLocked(team, type, key)) continue;
      const d = upgradeDef(type, key);
      if (this.cfg.research === 'basic' && (d.requires || ['giant', 'cleric', 'warlock', 'castle'].includes(type))) continue;
      if (d.requires && !team.upgrades[type][d.requires]) continue;
      if (team.research[type]) continue;
      // no point researching for ninjas, Kestrels or ballistas it hasn't built
      if (['ninja', 'flyer', 'ballista', 'golem', 'beastmaster', 'saboteur', 'firebird'].includes(type) && !G.units.some(u => u.team === this.id && !u.dead && u.type === type)) continue;
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
    if (team.gold >= next.d.cost + reserve && team.mana >= (next.d.mana || 0) + (next.d.mana ? giantMana : 0)) {
      startResearch(team, next.type, next.d.key);
      this.lastResearch = G.time;
      return false;
    }
    if (behind) return false;   // never stop building troops while the enemy army is bigger
    return core && (starved || chance(this.cfg.saveBias));
  }

  economy(team, miners, armySize) {
    const c = this.cfg;
    const goal = armySize >= 4 ? c.miners : Math.min(c.miners, 6);   // a few soldiers before the full workforce
    if (miners.length + queuedCount(team, 'miner') < goal) queueUnit(team, 'miner');
    const praying = miners.filter(u => u.order.type === 'mana').length;
    const panning = miners.filter(u => u.order.type === 'pan').length;
    const free = miners.filter(u => u.order.type === 'stance' || u.order.type === 'work');
    // pray only while mana is short; with plenty banked, the worshipper goes back to digging gold
    if (team.mana > c.manaCap) { for (const u of miners) if (u.order.type === 'mana') setOrder(u, { type: 'stance' }); }
    else if (miners.length >= c.prayAt && praying < Math.max(c.praying, clanOf(team).aiPray || 0) && free.length) setOrder(free.shift(), { type: 'mana' });
    else if (!this.dry && miners.length >= c.panAt && panning < c.panning && free.length) setOrder(free.shift(), { type: 'pan' });
    this.outOfGold(team, miners, free, panning);
    this.protectMiners(team);
  }

  // When the deposits on our half run dry, miners don't wander over to the enemy's: they pan the
  // castle stream (every slot) and, once Prospecting is in, restore the exhausted deposits nearest
  // home. When there's gold again the extra panners go back to mining.
  outOfGold(team, miners, free, panning) {
    const home = m => team.dir * (WORLD_W / 2 - m.x) > 0;
    const left = G.mines.filter(m => home(m)).reduce((s, m) => s + Math.max(0, m.gold), 0);
    if (!this.dry && left < 500) this.dry = true;
    else if (this.dry && left > 1500) {
      this.dry = false;
      let extra = panning - this.cfg.panning;
      for (const u of miners) if (extra > 0 && u.order.type === 'pan') { setOrder(u, { type: 'stance' }); extra--; }
    }
    if (!this.dry || team.minersIn) return;
    // miners still digging a home deposit carry on; the rest are reassigned
    free = free.filter(u => !(u.mine && u.mine.gold > 0 && home(u.mine)));
    // fill the castle stream first
    while (panning < PAN_SLOTS && free.length) { setOrder(free.shift(), { type: 'pan' }); panning++; }
    if (!team.upgrades.miner.prospect) return;
    // then restore the deposits nearest the statue, three miners to a deposit
    const tending = m => miners.filter(u => u.order.type === 'replenish' && u.order.mine === m).length;
    const spent = G.mines.filter(m => home(m) && m.gold < m.max * 0.5).sort((a, b) => Math.abs(a.x - team.statue.x) - Math.abs(b.x - team.statue.x));
    for (const m of spent) while (free.length && tending(m) < 3) setOrder(free.shift(), { type: 'replenish', mine: m });
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
    const quick = army.filter(u => ['flyer', 'ninja', 'sword'].includes(u.type) && u.order.type !== 'refit' && u.hp > u.maxHp * 0.7)
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

    const mine = G.units.filter(u => u.team === this.id && !u.dead);
    const miners = mine.filter(u => u.type === 'miner');
    const army = mine.filter(u => u.type !== 'miner' && !isGiant(u));
    this.economy(team, miners, army.length);
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

    // also push out once the game has gone on a while and the armies are roughly even
    // attacking means walking into the enemy's castle archers, so they count as defenders
    const fort = G.teams[foe].archers.length * 300;   // long reach, faster when garrisoned
    const late = G.time > 210 && army.length >= 6 && ours > (theirs + fort) * 0.9;
    // never march with just a giant and a handful of troops: a lone giant charges off on its own
    // a wave goes out on a timer as long as the armies are close, so there's never a long standoff
    const wave = G.time >= this.nextWave && army.length >= 5 && ours >= (theirs + fort * 0.5) * c.waveEdge;
    const readyToAttack = army.length >= 5 && ((ours >= c.attackPower && ours > (theirs + fort) * c.edge) || (army.length >= c.bigArmy && ours > theirs) || late || wave);
    if (this.mode !== 'attack' && readyToAttack) {
      this.mode = 'attack';
      this.raid = [];   // raiders join the push
      team.musterX = null;   // new troops follow the attack instead of waiting at the old muster point
      if (c.formations) formGroup(team, army.filter(u => !u.aiHealing), 'attack');   // the wounded stay in to heal
      else setStance(team, 'attack');
    } else if (this.mode === 'attack' && ours < theirs * 0.65) {
      // losing the push: fall back together and regroup, and try again after a while
      this.mode = 'fallback';
      this.nextWave = G.time + rnd(c.wave[0], c.wave[1]);
      if (c.formations) formGroup(team, army, 'retreat');
      else setStance(team, 'defend');
    } else if (this.mode !== 'attack' && this.mode !== 'turtle' && G.time > (this.turtleCd || 0) && threat > 400 && threat > (near + homeFort) * 1.25) {
      // outmatched at home: hold the castle (troops heal inside, the castle archers shoot faster)
      this.mode = 'turtle';
      this.raid = [];
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
    } else if (this.mode === 'attack' && c.formations) {
      // reinforcements join the march
      const fresh = army.filter(u => u.order.type !== 'group' && u.order.type !== 'refit');
      if (fresh.length >= 3) formGroup(team, fresh, 'attack');
    } else if (this.mode === 'attack') {
      // no formations: anyone left standing on an order joins the push
      for (const u of army) if (u.order.type === 'hold' || u.order.type === 'move') setOrder(u, { type: 'stance' });
    }

    if (this.mode === 'build' || this.mode === 'fallback') {
      this.guardLine(team, army, ours, theirs);
      this.raidMiners(team, army);
    }
    if (this.mode !== 'attack') this.healWounded(team, army, foe);
    this.unitTactics(team, mine, army, foe);
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
      u.shieldWall = close >= 3 || (close >= 1 && u.hp < u.maxHp * 0.4);
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
