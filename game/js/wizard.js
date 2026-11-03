'use strict';
// The Castle Wizard, the Architect's magical partner: runes (laid like traps, see build.js),
// wards on your works, enchanting the Architect's traps, wizard towers and the mages who man them,
// and what the runes do to those caught by them (hexed and terrified units). Loads after build.js.
//
// A structure's ward: s.ward (shield hp, soaked before the structure's own in damage()).
// A wizard tower: tw.converting (with tw.cprog 0..1) while the Castle Wizard rebuilds it, then
// tw.wizard; its one slot (tw.archers[0]) holds a mage.

// ---------------------------------------------------------------- wards

const wardMax = (team, s) => Math.round((s.isStatue ? WARD.statueMax : s.max * WARD.share) * (team.upgrades.wizard.aegis ? WARD.aegis : 1));
const wardRate = team => WARD.rate * (team.upgrades.wizard.aegis ? WARD.aegis : 1);
// Where a ward's light lands on a structure (for the beam).
const wardAimY = s => (s.isStatue ? LANE_TOP - 110 : s.isTower ? s.y - 62 : LANE_TOP + 16);

// What a side's Castle Wizard could work on, each with the kind of work:
//   ward     a statue, trench or tower whose ward isn't full
//   convert  a wizard tower left half-made (free to finish)
//   finish   a rune left half-laid
//   enchant  one of the Architect's traps (costs mana)
function wizJobs(team) {
  const jobs = [];
  for (const s of [team.statue, ...G.walls, ...G.towers]) {
    if (s.dead || s.ruin) continue;
    if (s.isStatue ? s.team !== team.id || team.noCastle : !canMend(team, s) || s.progress < 1) continue;
    if (s.isTower && s.converting) jobs.push({ kind: 'convert', s });
    if ((s.ward || 0) < wardMax(team, s) - 1) jobs.push({ kind: 'ward', s });
  }
  for (const t of G.traps) {
    if (t.dead || t.team !== team.id) continue;
    if (!t.armed && isRune(t.kind)) jobs.push({ kind: 'finish', s: t });
    else if (!isRune(t.kind) && !t.magic) jobs.push({ kind: 'enchant', s: t });
  }
  return jobs;
}

function startWizJob(team, j, wizards, auto) {
  const u = wizards.slice().sort((a, b) => Math.abs(a.x - j.s.x) - Math.abs(b.x - j.s.x))[0];
  if (!u) return null;
  if (j.kind === 'enchant') return enchantTrap(team, j.s, wizards);
  if (j.kind === 'convert') return convertTower(team, j.s, wizards);
  if (j.kind === 'finish') { j.s.layer = u; setOrder(u, { type: 'trap', trap: j.s, auto }); return j.s; }
  setOrder(u, { type: 'ward', s: j.s, auto });
  return j.s;
}

// The job an idle Castle Wizard takes up on its own: finishing runes and a wizard tower, then
// topping up the thinnest ward (the statue's first), never where a fight is going on. Enchanting
// costs mana, so it waits for your order.
function wizAutoJob(u, team) {
  let best = null, bs = 1e9;
  for (const j of wizJobs(team)) {
    if (j.kind === 'enchant') continue;
    const s = j.s;
    if (j.kind === 'ward' && (s.ward || 0) > wardMax(team, s) * 0.85) continue;   // nearly full can wait
    if (s.isTrap && s.layer && s.layer !== u && !s.layer.dead && s.layer.order.trap === s) continue;
    if (workDanger(team, s.x)) continue;
    if (!s.mid && !s.isStatue && team.dir * (s.x - WORLD_W / 2) > 0) continue;
    const score = (j.kind === 'finish' ? 0 : j.kind === 'convert' ? 100 : 300 + 600 * ((s.ward || 0) / wardMax(team, s)) - (s.isStatue ? 150 : 0)) + Math.abs(s.x - u.x) * 0.5;
    if (score < bs) { bs = score; best = j; }
  }
  return best;
}

// Channel a ward onto a structure from a little way behind it.
function doWard(u, team, dt) {
  const s = u.order.s;
  if (!s || s.dead || s.ruin || (s.ward || 0) >= wardMax(team, s) - 0.5) { setOrder(u, { type: 'stance' }); return; }
  if (u.order.auto && workDanger(team, s.x)) { setOrder(u, { type: 'stance' }); return; }
  if (u.swing >= 0) return;
  const sx = s.isStatue ? s.x - team.dir * (s.halfW + 40) : s.x - team.dir * 80;
  if (Math.abs(u.x - sx) > 40) { moveTo(u, sx, clamp(u.y, LANE_TOP + 10, LANE_BOT - 10), dt); return; }
  u.facing = s.x >= u.x ? 1 : -1;
  u.channeling = true;
  s.ward = Math.min(wardMax(team, s), (s.ward || 0) + wardRate(team) * dt);
  wizBeam(u, s.x, wardAimY(s), '#9fd0ff', dt);
}

// A thread of light from the staff to what it works on (every so often, not every frame).
function wizBeam(u, x, y, color, dt) {
  u.beamT = (u.beamT || 0) - dt;
  if (u.beamT > 0) return;
  u.beamT = 0.22;
  G.spellFx.push({ kind: 'beam', x1: u.x + u.facing * 10, y1: u.y - 76, x2: x + rnd(-8, 8), y2: y + rnd(-10, 10), color, t: 0, max: 0.3 });
}

// ---------------------------------------------------------------- enchanting

const enchantCost = team => Math.round(RUNE.enchant * (team.clanKey === 'arcane' ? 0.5 : 1));

// The Castle Wizard enchants one of the Architect's traps (mana).
function enchantTrap(team, trap, wizards) {
  const say = msg => { if (team.id === 0) toast(msg); return null; };
  wizards = wizards.filter(u => u.type === 'wizard');
  if (!trap || trap.dead || isRune(trap.kind) || trap.team !== team.id) return null;
  if (trap.magic) return say('That trap is already enchanted');
  if (!wizards.length) return say('Select your Castle Wizard to enchant traps');
  const cost = enchantCost(team);
  if (team.mana < cost) return say(`Enchanting costs ${cost} mana`);
  team.mana -= cost;
  setOrder(wizards[0], { type: 'rework', trap, t: 0 });
  return trap;
}

// ---------------------------------------------------------------- wizard towers

const wizardTowerOf = team => G.towers.find(t => t.team === team.id && !t.dead && (t.wizard || t.converting));

// Can the Castle Wizard make this tower a wizard tower? null if so, or the reason.
function convertProblem(team, tw) {
  if (!tw || tw.dead || tw.team !== team.id || tw.mid) return 'Choose one of your own archer towers';
  if (tw.progress < 1) return 'Finish building the tower first';
  if (tw.wizard) return 'That is already a wizard tower';
  const other = wizardTowerOf(team);
  if (other && other !== tw) return 'You can only have one wizard tower';
  return null;
}

// Order a wizard tower: pay, clear out the archer and start the work (or resume a half-made one, free).
function convertTower(team, tw, wizards) {
  const say = msg => { if (team.id === 0) toast(msg); return null; };
  wizards = wizards.filter(u => u.type === 'wizard');
  if (!wizards.length) return say('Select your Castle Wizard to raise a wizard tower');
  const problem = convertProblem(team, tw);
  if (problem) return say(problem);
  if (!tw.converting) {
    if (team.gold < WTOWER.gold || team.mana < WTOWER.mana) return say(`A wizard tower costs ${WTOWER.gold} gold and ${WTOWER.mana} mana`);
    team.gold -= WTOWER.gold;
    team.mana -= WTOWER.mana;
    tw.converting = true;
    tw.cprog = 0;
    for (const a of towerCrew(tw)) setOrder(a, { type: 'stance' });   // the archer climbs down
  }
  setOrder(wizards[0], { type: 'convert', tower: tw });
  return tw;
}

function doConvert(u, team, dt) {
  const tw = u.order.tower;
  if (!tw || tw.dead || !tw.converting) { setOrder(u, { type: 'stance' }); return; }
  if (u.swing >= 0) return;
  const sx = tw.x - team.dir * 60;
  if (Math.abs(u.x - sx) > 30 || Math.abs(u.y - (tw.y + 14)) > 30) { moveTo(u, sx, tw.y + 14, dt); return; }
  u.facing = team.dir;
  u.channeling = true;
  tw.cprog = Math.min(1, (tw.cprog || 0) + dt / WTOWER.work);
  wizBeam(u, tw.x, tw.y - TOWER.h + 10, '#c8a8f0', dt);
  if (tw.cprog < 1) return;
  tw.converting = false;
  tw.wizard = true;
  spawnBurst(tw.x, tw.y - TOWER.h, 20, { color: '#c8a8f0', speed: 120, up: 80, g: 100, life: 0.9, size: 2.4 });
  if (team.id === 0) toast('Wizard tower raised: right-click it with a Necromancer, Cleric or Warlock to post them up there');
  setOrder(u, { type: 'stance' });
}

// What a wizard tower becomes with its mage.
const wizardTowerKind = tw => { const m = towerCrew(tw)[0]; return !m ? null : { necromancer: 'graveyard', cleric: 'sanctum', warlock: 'spire' }[m.type]; };
const WTOWER_NAMES = { graveyard: 'Graveyard', sanctum: 'Sanctum', spire: 'Spire' };

// A mage climbs into its side's wizard tower.
function postMage(u, tw) {
  if (!tw || tw.dead || !tw.wizard || tw.team !== u.team || !TOWER_MAGES.includes(u.type)) return false;
  if (towerCrew(tw).some(a => a !== u)) return false;
  setOrder(u, { type: 'tower', tower: tw });
  return true;
}

// A mage's power up a wizard tower (healing and bolts), folded into dmgMult.
const towerMageMul = u => (!u.onTower || !u.onTower.wizard ? 1 : u.type === 'cleric' ? WTOWER.healMul : u.type === 'warlock' ? WTOWER.spireMul : 1);
// Spells cast from a wizard tower cost nothing.
const castsFree = u => !!(u.onTower && u.onTower.wizard);

// A mage up a wizard tower: climbs up, then heals (Sanctum), shoots bolts (Spire) or raises an endless
// stream of zombies that march on the enemy (Graveyard). Spells are free up there.
function updateTowerMage(u, dt) {
  const team = G.teams[u.team], tw = u.order.tower;
  if (!tw || tw.dead || !tw.wizard || (u.onTower !== tw && towerCrew(tw).some(a => a !== u))) { setOrder(u, { type: 'stance' }); return; }
  if (u.onTower !== tw) {
    if (!moveTo(u, tw.x, tw.y + 2, dt)) return;
    u.onTower = tw;
    u.towerSlot = 0;
    tw.archers[0] = u;
    u.towerBonus = towerRange(team) + WTOWER.mageRange + (u.type === 'warlock' ? WTOWER.spireRange : 0);
    u.range += u.towerBonus;
    u.aggro = Math.max(u.aggro, u.range + 40);
    if (team.id === 0) toast(`Your wizard tower is now a ${WTOWER_NAMES[wizardTowerKind(tw)]}`);
  }
  u.x = tw.x;
  u.y = tw.y + 2;
  if (isMage(u) && updateMageCasting(u, dt)) return;
  if (u.swing >= 0) return;
  if (u.type === 'necromancer') {
    // the Graveyard: the dead rise round the tower's foot, without end, and march
    u.summonT = (u.summonT || 0) - dt;
    if (u.summonT <= 0) {
      u.summonT = team.upgrades.necromancer.rites ? WTOWER.graveRites : WTOWER.grave;
      startSwing(u, 'summon', null);
      const z = raiseZombie(u.team, tw.x + team.dir * rnd(10, 50), rnd(LANE_TOP + 8, LANE_BOT - 8), null);
      z.graveyard = true;
    }
    return;
  }
  if (u.type === 'cleric') {
    if (u.atkCd > 0) return;
    const p = mostWounded(u) || nearestZombie(u);
    if (p) { u.facing = p.x >= u.x ? 1 : -1; startSwing(u, 'heal', p); }
    return;
  }
  // the Spire
  const t = nearestEnemy(u, u.range + 10);
  if (t && inReach(u, t, 0)) return engage(u, t, dt);
  const es = G.teams[1 - u.team].statue;
  if (!es.dead && inReach(u, es, 0)) engage(u, es, dt);
}

// ---------------------------------------------------------------- the Castle Wizard

function updateWizard(u, dt) {
  const team = G.teams[u.team], o = u.order;
  u.retaliateT -= dt;
  u.laying = false;
  u.channeling = false;

  if ((u.senseT = (u.senseT || 0) - dt) <= 0) { u.senseT = 0.5; senseTraps(u); }
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
  const foe = u.lastAttacker;
  if (u.retaliateT > 0 && !u.inside && isValidTarget(foe) && Math.abs(foe.x - u.x) < 110) return engage(u, foe, dt);
  if (o.type === 'hold') return;
  if (o.type === 'trap') return doLayTrap(u, team, dt);
  if (o.type === 'rework') return doRework(u, team, dt);
  if (o.type === 'ward') return doWard(u, team, dt);
  if (o.type === 'convert') return doConvert(u, team, dt);
  if (o.type === 'garrison' || team.stance === 'garrison' || team.minersIn || u.ownStance === 'garrison') return goGarrison(u, dt);
  // nobody needs it: finish runes, ward your works, lay a free rune with a Quartermaster's
  // reagents, or else study at the statue
  u.jobT = (u.jobT || 0) - dt;
  if (u.jobT <= 0 && u.swing < 0) {
    u.jobT = 1;
    const j = wizAutoJob(u, team);
    if (j) { startWizJob(team, j, [u], true); return; }
    if (u.reagents > 0 && layFreeTrap(u, team)) { u.reagents--; return; }
  }
  if (u.swing < 0) moveTo(u, team.statue.x - team.dir * (88 + (u.id % 2) * 14), LANE_TOP + 30 + (u.id % 3) * 12, dt);
}

// A Castle Wizard senses the enemy's runes and traps near it, showing them to its side (who can then
// smash them, the way a saboteur finds them).
function senseTraps(u) {
  if (u.inside) return;
  for (const t of G.traps) {
    if (t.dead || t.team === u.team || t.spotted[u.team]) continue;
    if (Math.abs(t.x - u.x) < WARD.sense && Math.abs(t.y - u.y) < 120) {
      t.spotted[u.team] = true;
      if (u.team === 0) floatText(t.x, t.y - 22, `${trapDef(t.kind).name}!`, '#e0806a');
    }
  }
}

// ---------------------------------------------------------------- hexed and terrified

// Hexed: it turns on its own side, attacking the nearest friend it can reach, and staggers about
// when there's nobody. (Archers in towers and the like stay put but shoot their friends.)
function actHexed(u, dt) {
  if (u.swing >= 0) return;
  if (isWorker(u) && u.type !== 'miner') return;   // (the support staff just stand there dazed)
  let best = null, bd = (isRanged(u) ? u.range : 0) + 160;
  for (const o of G.units) {
    if (o === u || o.team !== u.team || o.dead || o.inside || o.stealth || o.riseT > 0) continue;
    if (isFlying(o) && !canHitAir(u)) continue;
    const d = Math.abs(o.x - u.x) + Math.abs(o.y - u.y) * 0.5;
    if (d < bd) { bd = d; best = o; }
  }
  if (best) {
    if (u.onTower || u.onWall) { if (inReach(u, best, 0)) engage(u, best, dt); return; }
    return engage(u, best, dt);
  }
  if (u.onTower || u.onWall) return;
  moveTo(u, u.x + Math.sin(RT * 1.3 + u.seed) * 50, clamp(u.y + Math.cos(RT * 0.9 + u.seed) * 30, LANE_TOP, LANE_BOT), dt);
}

// Terrified: it drops everything and runs for its own castle (those on a tower or rampart cower).
function fleeInTerror(u, dt) {
  u.swing = -1;
  if (u.onTower || u.onWall) return;
  const team = G.teams[u.team];
  moveTo(u, team.gateX - team.dir * 60, u.y, dt);
}

// ---------------------------------------------------------------- the Founding Stone

// The Architect and the Castle Wizard are entombed in the castle walls: they walk into the light.
function entomb(u) {
  spawnBurst(u.x, u.y - 40, 18, { color: '#f0dc9a', speed: 70, up: 90, g: -40, life: 1.2, size: 2.4 });
  G.spellFx.push({ kind: 'beam', x1: u.x, y1: u.y, x2: u.x, y2: u.y - 220, color: '#f6e6b0', t: 0, max: 0.9 });
  u.entombed = true;
  u.hp = 0;
  killUnit(u, null);
}
