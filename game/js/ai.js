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

// A competent opponent for Normal and Hard. Normal: steady economy, sensible army mix, tier-1
// research, attacks when it has the edge and falls back when losing. Hard: researches everything,
// gathers mana, fields mages and giants, refits veterans, and attacks and retreats in formations.
const SMART = {
  normal: { think: [2, 3.5], miners: 7, praying: 1, panning: 0, research: 'basic', mages: true, giants: false, formations: false, perThink: 1, attackPower: 900, edge: 1.1, saveAt: 7, bigArmy: 10, reserve: 250, saveBias: 0.7, armyPerUpgrade: 0.8, researchGap: 90, prayAt: 4, panAt: 99, manaCap: 300, ninjas: 0.1, flyers: 0.06 },
  hard: { think: [1, 1.8], miners: 8, praying: 1, panning: 1, research: 'all', mages: true, giants: true, formations: true, perThink: 2, attackPower: 1000, edge: 1.0, saveAt: 7, bigArmy: 9, reserve: 250, saveBias: 0.6, armyPerUpgrade: 0.35, researchGap: 70, prayAt: 5, panAt: 8, manaCap: 700, ninjas: 0.14, flyers: 0.1 },
};

// Research order: what a sensible commander buys first.
const AI_RESEARCH = [
  ['sword', 'blades'], ['miner', 'pick'], ['spear', 'shield'], ['archer', 'arrows'], ['sword', 'helm'],
  ['miner', 'bag'], ['archer', 'bow'], ['castle', 'tithe'], ['spear', 'helm'], ['sword', 'drill'],
  ['miner', 'devout'], ['cleric', 'pool'], ['warlock', 'big'], ['spear', 'inspire'], ['archer', 'quiver'],
  ['castle', 'archer2'], ['sword', 'rage'], ['giant', 'protein'], ['giant', 'blinders'], ['spear', 'halberd'],
  ['cleric', 'focus'], ['warlock', 'focus'], ['miner', 'defense'],
  ['ninja', 'serrated'], ['flyer', 'barbs'], ['archer', 'eye'], ['ninja', 'stars'], ['flyer', 'scope'],
  ['ninja', 'parry'], ['ninja', 'vital'], ['flyer', 'winch'], ['ninja', 'focus'], ['flyer', 'feather'],
  ['sword', 'greatsword'], ['archer', 'longbow'], ['archer', 'broadheads'], ['flyer', 'hawkeye'], ['flyer', 'scope2'],
  ['flyer', 'barbs2'], ['archer', 'steady'], ['castle', 'levy2'], ['spear', 'javelin'],
  ['ballista', 'torsion'], ['ballista', 'ironbolt'], ['ballista', 'mantlet'], ['golem', 'plating'], ['golem', 'core'], ['beastmaster', 'stones'], ['beastmaster', 'lore'], ['saboteur', 'sappers'], ['saboteur', 'brine'],
  ['cleric', 'big'], ['warlock', 'pool'], ['cleric', 'speed'], ['warlock', 'speed'], ['cleric', 'might'],
  ['warlock', 'might'], ['miner', 'pick2'], ['miner', 'bag2'], ['spear', 'shield2'], ['archer', 'fire'],
  ['sword', 'leap'], ['sword', 'rage2'], ['giant', 'stun'], ['giant', 'protein2'], ['castle', 'tithe2'],
  ['castle', 'archer3'], ['castle', 'archer4'], ['miner', 'devout2'], ['miner', 'pan1'], ['miner', 'pan2'], ['giant', 'protein3'], ['castle', 'levy'],
  ['miner', 'mule'], ['miner', 'diamond'], ['castle', 'gilded'],
];
// Never researched by the AI because it doesn't use them: Earthworks, Palisade, Prospecting.

// Rough fighting value of a side's army (cost weighted by remaining health). The whole-army
// figure counts troops hiding in the castle too; a local figure (nearX) only counts those outside.
function armyPower(teamId, nearX, radius) {
  let p = 0;
  for (const u of G.units) {
    if (u.team !== teamId || u.dead || u.type === 'miner') continue;
    if (nearX !== undefined && (u.inside || Math.abs(u.x - nearX) > radius)) continue;
    p += (u.def.cost + (u.def.mana || 0)) * Math.max(0.2, u.hp / u.maxHp);
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
  }

  pickUnit(team) {
    const c = this.cfg;
    const army = G.units.filter(u => u.team === this.id && !u.dead && u.type !== 'miner');
    const count = t => army.filter(u => u.type === t).length + queuedCount(team, t);
    const can = t => canTrain(team, t);
    const extra = clanOf(team).ai || {};   // the clan's favourite units get a bigger share
    const share = (t, base) => base + (extra[t] || 0);
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
    const shooter = can('archer') ? 'archer' : can('flyer') ? 'flyer' : can('beastmaster') ? 'beastmaster' : can('warlock') ? 'warlock' : null;
    if (shooter && (shooter !== 'warlock' || team.mana > mageMana('warlock')) && count(shooter) < n * share(shooter, shooter === 'archer' ? 0.28 : 0.12) + enemyFlyers * 0.6) return shooter;
    const front = can('spear') ? 'spear' : null;
    if (front && count(front) < n * share('spear', 0.2)) return front;
    if (can('flyer') && count('flyer') < Math.floor(n * share('flyer', c.flyers)) + (enemyFlyers ? 1 : 0)) return 'flyer';
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
    const order = flyers && spears ? [['spear', 'javelin'], ...AI_RESEARCH] : AI_RESEARCH;
    for (const [type, key] of order) {
      if (team.upgrades[type][key] || upgradeLocked(team, type, key)) continue;
      const d = upgradeDef(type, key);
      if (this.cfg.research === 'basic' && (d.requires || ['giant', 'cleric', 'warlock', 'castle'].includes(type))) continue;
      if (d.requires && !team.upgrades[type][d.requires]) continue;
      if (team.research[type]) continue;
      // no point researching for ninjas, Kestrels or ballistas it hasn't built
      if (['ninja', 'flyer', 'ballista', 'golem', 'beastmaster', 'saboteur'].includes(type) && !G.units.some(u => u.team === this.id && !u.dead && u.type === type)) continue;
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
    else if (miners.length >= c.prayAt && praying < Math.max(c.praying, clanOf(team).aiPray || 0) && free.length) setOrder(free[0], { type: 'mana' });
    else if (miners.length >= c.panAt && panning < c.panning && free.length) setOrder(free[0], { type: 'pan' });
    this.protectMiners(team, miners);
  }

  // Pull the miners into the castle (where they pan the stream) while an enemy force our troops
  // can't handle is near them, and send them back out once it has gone.
  protectMiners(team, miners) {
    const foe = 1 - this.id;
    // where the miners are working, or (while hiding) the deposits on our half they'd go back to
    const spots = team.minersIn
      ? G.mines.filter(m => m.gold > 0 && team.dir * (WORLD_W / 2 - m.x) > 0).map(m => m.x)
      : miners.filter(m => !m.inside).map(m => m.x);
    const raiders = G.units.filter(e => e.team === foe && !e.dead && !e.inside && e.type !== 'miner' && spots.some(x => Math.abs(e.x - x) < 450));
    const x = raiders.length ? raiders.reduce((s, e) => s + e.x, 0) / raiders.length : 0;
    // go in when clearly outmatched there; come back out once it's roughly even again
    const danger = raiders.length > 0 && armyPower(foe, x, 400) > armyPower(this.id, x, 400) * (team.minersIn ? 0.8 : 1.3) + 100;
    if (danger !== team.minersIn) setMinerGarrison(team, danger);
  }

  // Where to hold the line (via the muster point): in front of the miners' furthest deposit,
  // at the shrine when strong enough to claim it, or back by the statue when outmatched.
  guardLine(team, army, ours, theirs) {
    const hard = this.level === 'hard', dir = team.dir;
    let spot = null;
    // cover the miners: stand just beyond the furthest deposit being worked
    const worked = G.mines.filter(m => m.gold > 0 && m.workers.some(w => w.team === this.id)).map(m => m.x);
    if (worked.length && army.length >= 3) spot = (dir > 0 ? Math.max(...worked) : Math.min(...worked)) + dir * 70;
    // claim the shrine when strong enough
    const strong = army.length >= (hard ? 5 : 7) && ours >= theirs * (hard ? 0.9 : 1.1);
    if (G.shrine && strong) spot = G.shrine.x - dir * 40;
    // outmatched: fall back under the castle archers
    if (ours < theirs * 0.8) spot = null;
    if (spot === null) { team.musterX = null; return; }
    spot = musterClamp(team, spot);
    if (team.musterX === null || Math.abs(team.musterX - spot) > 40) setMuster(team, spot);
  }

  update(dt) {
    const team = G.teams[this.id], foe = 1 - this.id, c = this.cfg;
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

    // also push out once the game has gone on a while and the armies are roughly even
    // attacking means walking into the enemy's castle archers, so they count as defenders
    const fort = G.teams[foe].statue.dead ? 0 : G.teams[foe].archers.length * 150;
    const late = G.time > 210 && army.length >= 6 && ours > (theirs + fort) * 0.9;
    const readyToAttack = (ours >= c.attackPower && ours > (theirs + fort) * c.edge) || (army.length >= c.bigArmy && ours > theirs) || late;
    if (this.mode !== 'attack' && readyToAttack) {
      this.mode = 'attack';
      if (c.formations) formGroup(team, army, 'attack');
      else setStance(team, 'attack');
    } else if (this.mode === 'attack' && ours < theirs * 0.65) {
      // losing the push: fall back together and regroup
      this.mode = 'fallback';
      if (c.formations) formGroup(team, army, 'retreat');
      else setStance(team, 'defend');
    } else if (this.mode !== 'attack' && threat > near * 1.6 && threat > 600) {
      setStance(team, 'defend');
      this.mode = 'build';
    } else if (this.mode === 'fallback' && army.every(u => u.order.type !== 'group')) {
      setStance(team, 'defend');
      this.mode = 'build';
    } else if (this.mode === 'attack' && c.formations) {
      // reinforcements join the march
      const fresh = army.filter(u => u.order.type !== 'group' && u.order.type !== 'refit');
      if (fresh.length >= 3) formGroup(team, fresh, 'attack');
    }

    if (this.mode !== 'attack') this.guardLine(team, army, ours, theirs);

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
