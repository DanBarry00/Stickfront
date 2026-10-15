'use strict';
// Unit data and per-frame behaviour (movement, combat, mining, prayer, panning, building, buffs, garrison).

let NEXT_ID = 1;

class Unit {
  constructor(type, team, x, y, perks) {
    this.id = NEXT_ID++;
    this.type = type;
    this.def = UNIT_TYPES[type];
    this.team = team;
    this.x = x;
    this.y = y;
    this.slotY = y;
    // Perks are fixed at training time; veterans only gain new ones by being refitted.
    this.perks = { ...(perks || {}) };
    this.maxHp = 0;
    applyPerks(this);
    this.hp = this.maxHp;
    this.facing = team === 0 ? 1 : -1;
    this.scale = type === 'giant' ? this.giantScale * rnd(0.97, 1.03) : rnd(0.93, 1.07) * (type === 'spear' ? 1.06 : 1);
    this.speedMul = rnd(0.92, 1.08);
    this.gear = pick(GEAR[type][team]);
    this.seed = rnd(0, 100);
    this.walk = rnd(0, TAU);
    this.moving = false;
    this.stepDist = 0;   // distance walked this frame
    this.pace = 0;       // smoothed share of full speed actually walked (slows the legs in formation)
    this.slow = false;
    this.swing = -1;
    this.swingDur = 1;
    this.swingKind = null;
    this.swingTarget = null;
    this.hitDone = false;
    this.leapSwing = false;
    this.aimFa = 0.2;
    this.atkCd = 0;
    this.flash = 0;
    this.showHp = 0;
    // order types: stance | move | hold | attack | garrison | refit | advance | retreat | manwall
    //              miners: work | mana | pan | build | replenish
    this.order = { type: 'stance' };
    this.ownStance = null;   // per-unit garrison/defend/attack; null follows the team stance
    this.inside = false;
    const gate = team === 0 ? GATE_X : WORLD_W - GATE_X, dir = team === 0 ? 1 : -1;
    this.garX = gate - dir * rnd(40, GATE_X - 40);
    this.garY = rnd(LANE_TOP + 6, LANE_BOT - 30);
    this.dead = false;
    this.deathT = 0;
    this.selected = false;
    this.mine = null;
    this.carry = 0;
    this.manaSlot = -1;
    this.panSlot = -1;
    this.pray = -1;
    this.praying = false;
    this.panning = false;
    this.panT = 0;
    this.panTicks = 0;
    this.slotIdx = 0;
    this.runDist = 0;
    this.stillT = 0;
    this.retaliateT = 0;
    this.lastAttacker = null;
    this.blockedBy = null;
    this.blockT = 0;
    this.shieldWall = false;
    this.onWall = null;
    this.insp = 0;       // inspiration stacks from spearton leaders (0..3)
    this.drillN = 0;     // allies nearby counted by sword military training (0..5)
    this.refitT = 0;
    this.refitting = false;
    this.burnT = 0;
    this.burnSrc = null;
    this.lastStand = 0;
    this.lastStandUsed = false;
    // spell effects on this unit (seconds remaining; shield is hp it can still absorb)
    this.fx = { haste: 0, slow: 0, empower: 0, enfeeble: 0, shield: 0, shieldT: 0 };
    // mages: per-spell cooldowns, global cast delay, auto-cast and a forced cast waiting to happen
    this.cd = {};
    this.gcd = 0;
    this.auto = true;
    this.pendingCast = null;
    this.autoT = rnd(0, 0.4);
    // giants: obedience (chains), their own whims, confusion; anyone can be knocked back and stunned
    this.obey = 0.5;
    this.obeyT = 0;
    this.mindT = rnd(1, 3);
    this.rogue = null;
    this.confusedT = 0;
    this.confuseCd = 0;
    this.stunT = 0;
    this.knockV = 0;
    this.jumpT = 0;
    // ninjas: vanish while running, ambush blow, parry, star/blade mode ('auto' | 'melee' | 'ranged')
    this.stealth = false;
    this.vanishCd = 0;
    this.lastStrikeT = -99;
    this.ambushNext = false;
    this.parryCd = 0;
    this.starMode = 'auto';
    this.starRanged = false;
    this.lastTarget = null;
    this.dropT = 0;      // dropping down off the rampart after training
    // kestrels: height above the lane (eases to FLY_ALT), and whether Feather Fall has grounded it
    this.alt = 0;
    this.grounded = false;
    this.glideT = 0;     // gliding down after being shot out of the sky
  }
}

// Derive combat stats from the unit's perks (called on training and after a refit).
function applyPerks(u) {
  const P = u.perks, d = u.def, frac = u.maxHp ? u.hp / u.maxHp : 1;
  u.maxHp = d.hp;
  u.dmg = d.dmg;
  u.armor = 0;
  u.range = d.range;
  u.atk = d.atkTime;
  u.aggro = d.aggro;
  u.pierce = false;
  u.pierceHalf = false;
  u.fire = false;
  u.carryCap = 35;
  u.goldPerSwing = 7;
  u.mineTime = MINE_SWING_TIME;
  u.manaMul = 1;
  u.panMul = 1;
  u.pierceFrac = 0;    // share of the target's armor this unit's blows ignore
  u.crit = 0;          // chance of a double-damage critical hit
  if (u.type === 'sword') {
    u.dmg = P.greatsword ? 25 : P.blades ? 18 : 12;
    if (P.greatsword) u.atk = d.atkTime * 1.1;   // Great Swords swing slower
    u.armor = P.helm ? 0.25 : 0;
  } else if (u.type === 'miner') {
    u.maxHp += P.defense ? 50 : 0;
    u.dmg = P.defense ? 11 : d.dmg;
    u.carryCap = P.mule ? 100 : P.bag2 ? 80 : P.bag ? 56 : 35;
    u.goldPerSwing = P.diamond ? 17 : P.pick2 ? 14 : P.pick ? 11 : 7;
    u.mineTime = P.diamond ? 0.52 : P.pick2 ? 0.6 : P.pick ? 0.72 : MINE_SWING_TIME;
    u.manaMul = P.devout2 ? 2 : P.devout ? 1.5 : 1;
    u.panMul = P.pan2 ? 1.75 : P.pan1 ? 1.35 : 1;
  } else if (u.type === 'archer') {
    u.range = P.longbow ? 600 : P.bow ? 500 : d.range;
    u.aggro = u.range + 40;
    u.dmg = P.broadheads ? 40 : P.arrows ? 32 : d.dmg;
    u.pierceHalf = !!P.arrows;   // bodkin points punch through a third of any armor
    u.fire = !!P.fire;
    u.atk = P.quiver ? (P.steady ? 0.92 * 0.85 : 0.92) : d.atkTime;
    u.crit = P.eye ? CRIT.upgraded : CRIT.chance;
  } else if (u.type === 'ninja') {
    u.pierceFrac = NINJA_PIERCE[P.serrated ? 1 : 0];
    u.crit = P.vital ? CRIT.upgraded : CRIT.chance;
    setNinjaMode(u, u.starRanged);
  } else if (u.type === 'flyer') {
    if (u.grounded) {
      // shot down: a weak knife fighter on foot
      u.maxHp = GROUNDED.hp;
      u.dmg = GROUNDED.dmg;
      u.range = GROUNDED.range;
      u.atk = GROUNDED.atkTime;
      u.aggro = 220;
    } else {
      u.range = P.scope2 ? 480 : P.scope ? 400 : d.range;
      u.aggro = u.range + 40;
      u.dmg = P.barbs2 ? 26 : P.barbs ? 21 : d.dmg;
      u.atk = P.winch ? d.atkTime * 0.7 : d.atkTime;
      u.crit = P.hawkeye ? CRIT.upgraded : G && G.teams ? clanOf(G.teams[u.team]).kestrelCrit || 0 : 0;   // Sky Clan Kestrels crit
    }
  } else if (u.type === 'ballista') {
    u.range = P.torsion ? 650 : d.range;
    u.aggro = u.range + 40;
    u.dmg = P.ironbolt ? 60 : d.dmg;
    if (P.mantlet) { u.maxHp += 60; u.armor = 0.2; }
  } else if (u.type === 'spear') {
    u.armor = 0.1 + (P.shield ? 0.2 : 0) + (P.shield2 ? 0.1 : 0) + (P.helm ? 0.15 : 0);
    u.maxHp += (P.shield ? 40 : 0) + (P.shield2 ? 40 : 0);
    u.pierce = !!P.halberd;
    u.dmg = P.halberd ? 28 : d.dmg;
    if (P.javelin && u.javelin === undefined) u.javelin = 1;   // one javelin, refilled by garrisoning
  } else if (isMage(u)) {
    u.dmg = P.focus ? 28 : d.dmg;   // heal amount for clerics, bolt damage for warlocks
  } else if (isGiant(u)) {
    // Protein Diet scales everything; the statue's giant is bigger still
    const tier = giantTier(u);
    u.isStatueGiant = !!P.statue;
    u.maxHp = d.hp * (1 + GIANT_TIER_STEP.hp * tier) * (u.isStatueGiant ? STATUE_GIANT_HP_MUL : 1);
    u.dmg = d.dmg * (1 + GIANT_TIER_STEP.dmg * tier);
    u.range = d.range + tier * 6;
    u.giantScale = GIANT_SCALE * (1 + GIANT_TIER_STEP.size * tier);
    if (u.scale) u.scale = u.giantScale;
  }
  // clan health buffs and penalties (e.g. Shadow Clan -15%, Arcane Swordwrath -10%)
  if (G && G.teams) u.maxHp *= clanMul(G.teams[u.team], 'hp', u.type);
  if (u.hp !== undefined) u.hp = u.maxHp * frac;
}

// A ninja switches between its blade and Throwing Stars (stats swap with the mode).
function setNinjaMode(u, ranged) {
  ranged = !!ranged && !!u.perks.stars;
  u.starRanged = ranged;
  u.range = ranged ? STAR.range : u.def.range;
  u.atk = ranged ? STAR.atkTime : u.def.atkTime;
  u.dmg = ranged ? STAR.dmg : u.def.dmg;
  u.aggro = ranged ? STAR.range + 60 : u.def.aggro;
}

// Auto mode: stars for targets the blade can't (or shouldn't) reach, and when badly hurt.
function updateNinjaMode(u) {
  if (!u.perks.stars) return;
  if (u.starMode !== 'auto') return setNinjaMode(u, u.starMode === 'ranged');
  if (u.swing >= 0) return;   // never switch mid-swing
  const t = u.lastTarget;
  const far = t && !t.dead && (isFlying(t) || isGiant(t));
  setNinjaMode(u, far || u.hp < u.maxHp * 0.35);
}

// Javelins: a Spearton hurls its one javelin at the nearest flyer in range, and gets a new one
// whenever it garrisons.
function updateJavelin(u) {
  if (!u.perks.javelin) return;
  if (u.inside) { u.javelin = 1; return; }
  if (!u.javelin || u.stunT > 0) return;
  let best = null, bd = JAVELIN.range;
  for (const e of G.units) {
    if (e.team === u.team || !isFlying(e) || e.dead || e.inside || e.stealth) continue;
    const d = Math.abs(e.x - u.x) + Math.abs(e.y - u.y) * 0.5;
    if (d < bd) { bd = d; best = e; }
  }
  if (!best) return;
  u.javelin = 0;
  u.facing = best.x >= u.x ? 1 : -1;
  fireArrow(u.team, u.x + u.facing * 8, u.y - 56 * u.scale, best, JAVELIN.dmg * dmgMult(u), u, false, { kind: 'javelin' });
}

// Vanish while running; any blow (or stopping) reveals the ninja and starts the cooldown.
function updateStealth(u, dt) {
  u.vanishCd -= dt;
  if (u.stealth && (u.swing >= 0 || u.stillT > 0.3 || u.inside)) {
    u.stealth = false;
    u.vanishCd = clanOf(G.teams[u.team]).vanishCd || NINJA_VANISH_CD;   // Shadow Clan ninjas vanish sooner
  } else if (!u.stealth && u.moving && u.vanishCd <= 0 && u.swing < 0 && !u.inside) {
    u.stealth = true;
  }
}

function isValidTarget(t) {
  return !!t && !t.dead && !t.inside && !t.stealth && (!t.isWall || t.progress >= 1);
}

// Who can hit flying units: ranged attackers (and castle archers, and a ninja that can switch to stars).
const canHitAir = u => !u || u.castle || (isRanged(u) && u.type !== 'ballista') || (u.type === 'ninja' && u.perks.stars && u.starMode === 'auto');

// Can attacker u pick e as a target at all? (Vanished ninjas and, for melee, flyers are out of reach.)
function canTarget(u, e) {
  return !e.dead && !e.inside && !e.stealth && (!isFlying(e) || canHitAir(u));
}

// Lower is better. Taunts (shield walls) pull everyone except focused ninjas; ninjas hunt the
// weakest enemy and go for archers first; flyers get no special priority.
function targetScore(u, e, d) {
  const ninja = u && u.type === 'ninja';
  let s = ninja ? e.hp + d * 0.25 - (e.type === 'archer' ? 300 : 0) : d;
  if (!(ninja && u.perks.focus)) s -= tauntBias(e) * (ninja ? 4 : 1);
  if (u && u.type === 'ballista' && d < BALLISTA.minRange + 20) s += 2000;   // too close to aim at: anything else first
  return s;
}

function inReach(u, t, slack) {
  if (isFlying(t) && !isRanged(u)) return false;   // the blade can't reach the sky
  const bulk = isGiant(t) ? 8 * t.scale : 0;   // giants are wide targets
  const dx = Math.abs(t.x - u.x) - (t.isStructure ? t.halfW : 0) - bulk;
  if (u.type === 'ballista' && !t.isStructure && dx < BALLISTA.minRange) return false;   // too close to aim at
  if (isRanged(u)) return dx <= u.range + slack;
  const dy = t.isStructure ? 0 : Math.abs(t.y - u.y);
  return dx <= u.range + slack && dy <= 16 + slack + (isGiant(t) || isGiant(u) ? 18 : 0);
}

const rageOf = u => (u.lastStand > 0 ? 1 : u.perks.rage ? clamp(1 - u.hp / u.maxHp, 0, 1) : 0);
// War Blessing / Enfeeble and Haste / Hex of Slowness are exact opposites, so they cancel out.
const spellDmg = u => 1 + (u.fx.empower > 0 ? SPELLS.empower.power : 0) - (u.fx.enfeeble > 0 ? SPELLS.enfeeble.power : 0);
const spellSpeed = u => 1 + (u.fx.haste > 0 ? SPELLS.haste.power : 0) - (u.fx.slow > 0 ? SPELLS.slow.power : 0);
const dmgMult = u => (1 + 0.7 * rageOf(u)) * (1 + 0.04 * u.drillN) * (1 + 0.1 * u.insp) * spellDmg(u) * clanMul(G.teams[u.team], 'dmg', u.type);
const atkTimeOf = u => (u.atk * (1 - 0.45 * rageOf(u)) * (1 - 0.08 * u.insp)) / spellSpeed(u);
const wallHeight = w => (w.tier === 2 ? WALL_H[1] : WALL_H[0]);

function armorOf(u, attacker) {
  const pierce = attacker && attacker.pierce;
  let a = pierce ? 0 : attacker && attacker.pierceHalf ? u.armor * (2 / 3) : u.armor;
  if (attacker && attacker.pierceFrac) a *= 1 - attacker.pierceFrac;   // ninja blades slip through
  a += 0.03 * u.drillN;
  if (u.shieldWall) {
    const wall = u.perks.shield2 ? 0.75 : 0.6;
    a += pierce ? wall / 2 : wall;
  }
  return Math.min(0.9, a);
}

// Natural walking speed before any slows, buffs or formation pace.
const baseSpeed = u => (u.grounded ? GROUNDED.speed : u.def.speed) * u.speedMul;

function unitSpeed(u) {
  let s = baseSpeed(u);
  if (u.type === 'miner') s *= 1 - 0.22 * (u.carry / u.carryCap);
  if (u.shieldWall) s *= 0.45;
  if (u.slow) s *= 0.45;
  if (u.jumpT > 0) s *= 1.5;
  s *= spellSpeed(u);
  // marching in formation: keep pace with the group unless catching up
  return u.capSpeed ? Math.min(s, u.capSpeed) : s;
}

// Returns true once the unit has arrived. Enemy walls stop movement.
// A unit that has settled stays put until its target drifts a few pixels away, so idle
// units don't twitch (and flip facing) every frame when nudged by their neighbours.
function moveTo(u, tx, ty, dt) {
  const dx = tx - u.x, dy = ty - u.y;
  const d = Math.hypot(dx, dy);
  if (d < (u.settled ? 10 : 3)) { u.settled = true; return true; }
  u.settled = false;
  const k = Math.min(1, (unitSpeed(u) * dt) / d);
  let nx = u.x + dx * k;
  const ny = u.y + dy * k;
  for (const w of G.walls) {
    if (w.team === u.team || w.dead || w.progress < 1 || isFlying(u)) continue;   // flyers glide over walls
    const lim = w.halfW + 8;
    if (u.x <= w.x - lim + 0.5 && nx > w.x - lim) { nx = w.x - lim; u.blockedBy = w; u.blockT = 0.4; }
    else if (u.x >= w.x + lim - 0.5 && nx < w.x + lim) { nx = w.x + lim; u.blockedBy = w; u.blockT = 0.4; }
  }
  const moved = Math.abs(nx - u.x) + Math.abs(ny - u.y);
  u.x = nx;
  u.y = ny;
  if (moved > 0.01) {
    u.moving = true;
    u.runDist += moved;
    u.stepDist += moved;   // drives the leg animation, so legs match the real pace
  }
  if (Math.abs(dx) > 4) u.facing = dx > 0 ? 1 : -1;
  return false;
}

function targetAimY(t) {
  if (t.isStatue) return LANE_TOP - 80;
  if (t.isWall) return LANE_TOP - 10;
  return t.y - 38 * (isGiant(t) ? t.scale * 0.8 : 1) - (t.onWall ? wallHeight(t.onWall) : 0) - (t.alt || 0);
}

// Roll a critical hit (archers and ninjas): double damage and a little "Crit!" over the target.
function rollCrit(u, amt) {
  if (!u.crit || !chance(u.crit)) return { amt, crit: false };
  return { amt: amt * CRIT.mult, crit: true };
}
function showCrit(t) {
  if (t && !t.isStructure) floatText(t.x, targetAimY(t) - 30, 'Crit!', '#ffd25a');
}

function startSwing(u, kind, target) {
  u.swing = 0;
  u.hitDone = false;
  u.swingKind = kind;
  u.swingTarget = target;
  let dur = u.mineTime;
  if (kind === 'attack' || kind === 'shoot' || kind === 'heal') dur = atkTimeOf(u);
  if (kind === 'cast') {
    // spellcasting: a fixed 0.7s wind-up that doesn't reset the staff attack timer
    u.swingDur = 0.7;
    return;
  }
  u.swingDur = dur * 0.9;
  u.atkCd = dur;
  u.leapSwing = kind === 'attack' && u.perks.leap && u.type === 'sword' && u.runDist > 140;
  if (u.leapSwing) u.runDist = 0;
  if (u.type === 'ninja' && (kind === 'attack' || kind === 'shoot')) {
    // the first blow of a fight, or one struck out of the shadows, is an ambush
    u.ambushNext = kind === 'attack' && (u.stealth || G.time - u.lastStrikeT > NINJA_AMBUSH_GAP);
    u.lastStrikeT = G.time;
  }
  if (kind === 'shoot') {
    const dx = target.x - u.x, dy = targetAimY(target) - (u.y - 46 - (u.alt || 0));
    u.aimFa = Math.atan2(dy, Math.abs(dx)) - 0.3 * (Math.abs(dx) / u.range);
  }
}

function onSwingHit(u) {
  const t = u.swingTarget;
  if (u.swingKind === 'attack') {
    if (isValidTarget(t) && inReach(u, t, 12)) {
      let amt = u.dmg * rnd(0.8, 1.2) * dmgMult(u);
      if (u.leapSwing) {
        amt *= 2;
        spawnBurst(u.x, u.y - 2, 6, { color: shade(G.map.theme.ground[0], 0.1), speed: 80, up: 30, g: 300, life: 0.5, size: 2.5 });
      }
      if (u.type === 'ninja' && u.ambushNext) {
        amt *= NINJA_AMBUSH;
        u.ambushNext = false;
        spawnBurst(t.x, targetAimY(t), 8, { color: '#e8e0d0', speed: 140, up: 20, g: 200, life: 0.35, size: 1.8 });
      }
      const c = rollCrit(u, amt);
      damage(t, c.amt, u);
      if (c.crit) showCrit(t);
      if (isGiant(u)) giantImpact(u, t, amt);
      // a spear thrust runs on into a second enemy lined up behind the first
      if (u.type === 'spear' && !t.isStructure) {
        let next = null, nd = 1e9;
        for (const e of G.units) {
          if (e === t || e.team === u.team || !canTarget(u, e) || Math.abs(e.y - u.y) > 20) continue;
          const d = (e.x - u.x) * u.facing;
          if (d > 0 && d <= u.range + 22 && d < nd) { nd = d; next = e; }
        }
        if (next) damage(next, amt * 0.6, u, true);
      }
    }
  } else if (u.swingKind === 'cast') {
    releaseSpell(u, t);
  } else if (u.swingKind === 'heal') {
    if (t && !t.dead) healUnit(t, u.dmg * rnd(0.85, 1.15) * dmgMult(u), u);
  } else if (u.swingKind === 'shoot' && u.type === 'warlock') {
    if (isValidTarget(t)) fireBolt(u, t, u.dmg * rnd(0.85, 1.15) * dmgMult(u));
  } else if (u.swingKind === 'shoot') {
    if (isValidTarget(t)) {
      const aim = u.facing === 1 ? u.aimFa : Math.PI - u.aimFa;
      const lift = (u.onWall ? wallHeight(u.onWall) : 0) + (u.alt || 0);
      const c = rollCrit(u, u.dmg * dmgMult(u));
      const kind = u.type === 'ninja' ? 'star' : u.type === 'flyer' ? 'bolt' : u.type === 'ballista' ? 'ballista' : 'arrow';
      const muzzle = u.type === 'ballista' ? 26 : 46;   // the ballista fires from its low stock
      fireArrow(u.team, u.x + Math.cos(aim) * 14 * u.scale, u.y - lift - muzzle * u.scale + Math.sin(aim) * 14, t, c.amt, u, u.fire, { kind, crit: c.crit });
    }
  } else if (u.swingKind === 'gold') {
    const m = u.mine;
    if (m && m.gold > 0) {
      const take = Math.min(u.goldPerSwing, m.gold, u.carryCap - u.carry);
      m.gold -= take;
      u.carry += take;
      spawnBurst(u.x + u.facing * 20, u.y - 14, 4, { color: '#c99b2a', speed: 70, up: 90, g: 420, life: 0.6, size: 2 });
      if (m.gold <= 0) depleteMine(m);
    }
  } else if (u.swingKind === 'replenish') {
    const m = t;
    if (m && m.gold < m.max) {
      m.gold = Math.min(m.max, m.gold + u.goldPerSwing * 2);
      for (let i = 0; i < 5; i++) {
        G.particles.push({ kind: 'spark', x: m.x + rnd(-m.size, m.size) * 0.7, y: m.y - rnd(0, m.size), vx: rnd(-10, 10), vy: rnd(-40, -15), life: rnd(0.5, 0.9), max: 0.9, color: '#e8c25a', size: rnd(1.2, 2.2) });
      }
    }
  } else if (u.swingKind === 'build') {
    buildHit(u, t);
  }
}

// One spade-load on a trench: digs a new one, raises its palisade, or repairs a damaged one.
function buildHit(u, w) {
  if (!w || w.dead) return;
  spawnBurst(u.x + u.facing * 18, u.y - 20, 3, { color: w.stone, speed: 60, up: 60, g: 400, life: 0.5, size: 2 });
  if (w.progress < 1) {
    w.progress = Math.min(1, w.progress + WALL_BUILD_PER_HIT);
    w.hp = Math.max(1, w.max * w.progress);
    if (w.progress >= 1) {
      w.hp = w.max;
      if (w.team === 0) toast('Trench complete');
    }
  } else if (w.reinforcing) {
    const step = Math.min(WALL_BUILD_PER_HIT, 1 - w.rprog);
    w.rprog += step;
    w.max += WALL_HP2 * step;
    w.hp += WALL_HP2 * step;
    if (w.rprog >= 1) {
      w.tier = 2;
      w.reinforcing = false;
      if (w.team === 0) toast('Palisade raised');
    }
  } else if (w.hp < w.max) {
    w.hp = Math.min(w.max, w.hp + w.max * WALL_REPAIR);
    if (w.hp >= w.max && w.team === 0) floatText(w.x, LANE_TOP - 50, 'Trench repaired', '#c9b27a');
  }
}

// A trench needs work: unfinished, palisade under way, or damaged.
const trenchNeedsWork = w => !!w && !w.dead && (w.progress < 1 || w.reinforcing || w.hp < w.max);

// Send builders to repair the most damaged of the team's finished trenches. Returns the trench.
function repairTrenches(team, builders) {
  const hurt = G.walls.filter(w => w.team === team.id && !w.dead && w.progress >= 1 && w.hp < w.max);
  if (!hurt.length) return null;
  const w = hurt.sort((a, b) => a.hp / a.max - b.hp / b.max)[0];
  for (const u of builders) setOrder(u, { type: 'build', wall: w });
  return w;
}

// Move into reach of target and attack it (melee swing or bow shot).
function engage(u, t, dt) {
  const ranged = isRanged(u);
  if (!t.isStructure) u.lastTarget = t;
  if (inReach(u, t, 0)) {
    u.facing = t.x >= u.x ? 1 : -1;
    if (u.shieldWall) return; // shield wall: brace, never strike
    if (u.swing < 0 && u.atkCd <= 0) startSwing(u, ranged ? 'shoot' : 'attack', t);
    return;
  }
  const side = t.x >= u.x ? -1 : 1;
  if (u.swing >= 0) {
    // lunge: during the wind-up a melee attacker keeps stepping after a target that is
    // backing away, so the blow still lands on a fleeing unit (otherwise finish the swing first)
    if (!ranged && u.swingKind === 'attack' && u.swingTarget === t && u.swing < 0.5 && !t.isStructure) {
      moveTo(u, t.x + side * u.range * 0.5, clamp(t.y, LANE_TOP, LANE_BOT), dt);
    }
    return;
  }
  if (ranged) {
    moveTo(u, t.x + side * (u.range * 0.85 + (t.isStructure ? t.halfW : 0)), u.slotY, dt);
    return;
  }
  const reach = u.range * (0.55 + (u.id % 3) * 0.15) + (t.isStructure ? t.halfW : 0);
  const ty = t.isStatue ? u.slotY : t.isWall ? u.y : clamp(t.y + ((u.id % 5) - 2) * 6, LANE_TOP, LANE_BOT);
  moveTo(u, t.x + side * reach, ty, dt);
}

// Units pressed against an enemy wall hack at it unless an enemy is right there.
function handleBlocked(u, dt) {
  if (u.blockT <= 0 || !isValidTarget(u.blockedBy) || isFlying(u)) return false;
  if (nearestEnemy(u, u.range + 25)) return false;
  if (inReach(u, u.blockedBy, 4)) u.blockT = 0.4;
  engage(u, u.blockedBy, dt);
  return true;
}

// Shield-walling spearmen draw attention: they count as much closer than they are.
const tauntBias = e => (e.shieldWall ? (e.perks.shield2 ? 220 : 150) : 0);

function nearestEnemy(u, range, fromX) {
  const ox = fromX === undefined ? u.x : fromX;
  let best = null, bs = 1e9;
  for (const e of G.units) {
    if (e.team === u.team || !canTarget(u, e)) continue;
    const d = Math.abs(e.x - ox) + Math.abs(e.y - u.y) * 0.5;
    if (d >= range) continue;
    const s = targetScore(u, e, d);
    if (s < bs) { bs = s; best = e; }
  }
  return best;
}

// Enemies that have crossed (or are close to) the defend line.
function defendTarget(u, team, lineX) {
  let best = null, bs = 1e9;
  const reach = isRanged(u) ? u.range : 600;
  for (const e of G.units) {
    if (e.team === u.team || !canTarget(u, e)) continue;
    if (team.dir * (e.x - lineX) > (isRanged(u) ? u.range - 60 : 230)) continue;
    const d = Math.abs(e.x - u.x) + Math.abs(e.y - u.y) * 0.5;
    if (d > reach + 300) continue;
    const s = targetScore(u, e, d);
    if (s < bs) { bs = s; best = e; }
  }
  return best;
}

// The muster point, when set, is also where the army forms its defensive line.
const defendLine = team => (team.musterX !== null ? team.musterX : team.statue.x + team.dir * DEFEND_OFFSET);

// Walk to this unit's resting spot inside the castle.
function goGarrison(u, dt) {
  if (u.swing >= 0) return;
  if (moveTo(u, u.garX, u.garY, dt)) u.facing = G.teams[u.team].dir;
}

// Upgrades this unit's type has unlocked that the unit itself doesn't have yet.
function missingUpgrades(u) {
  const have = G.teams[u.team].upgrades[u.type];
  return UPGRADES[u.type].filter(d => !d.team && have[d.key] && !u.perks[d.key]).map(d => d.key);
}

// Walk back to the unit's building and take each missing upgrade for a small fee.
function doRefit(u, dt) {
  const team = G.teams[u.team];
  const missing = missingUpgrades(u);
  if (!missing.length) { setOrder(u, { type: 'stance' }); return; }
  if (u.swing >= 0) return;
  // several units can queue at the same door, so "close enough" counts as arrived
  const door = team.edge(DOOR_X[u.type]);
  if (Math.abs(u.x - door) > 16 || u.y > LANE_TOP + 30) {
    moveTo(u, door, LANE_TOP + 4 + (u.id % 3) * 8, dt);
    u.refitT = 0;
    return;
  }
  u.refitting = true;
  u.refitT += dt;
  if (u.refitT < REFIT_TIME) return;
  u.refitT = 0;
  if (team.gold < REFIT_COST) {
    if (u.team === 0) toast('Not enough gold to refit');
    setOrder(u, { type: 'stance' });
    return;
  }
  team.gold -= REFIT_COST;
  u.perks[missing[0]] = true;
  applyPerks(u);
  if (u.team === 0) floatText(u.x, u.y - 84, upgradeDef(u.type, missing[0]).name, '#a7c98a');
}

// ---------------------------------------------------------------- formations

// Rank offsets from the front of a formation: spearton in front, swordwrath behind them,
// archers and mages at the back.
const RANK_OFF = { spear: 22, sword: 0, ninja: -8, flyer: -60, archer: -85, warlock: -95, cleric: -110, ballista: -140 };

// Where the idx-th unit of a type stands: up to six abreast, extra units form more columns.
function rankSlot(type, idx, count, frontX, dir) {
  const row = idx % LANE_ROWS, col = Math.floor(idx / LANE_ROWS);
  const fullCols = Math.floor(count / LANE_ROWS);
  const rowsHere = col < fullCols ? LANE_ROWS : count % LANE_ROWS || LANE_ROWS;
  return { x: frontX + dir * ((RANK_OFF[type] || 0) - col * 26), y: rowY(row, rowsHere) };
}

let NEXT_GROUP = 1;

// Selected soldiers march together: 'attack' (march on the enemy statue, breaking off to fight
// anything close), 'advance' (march in step, fighting only what's in reach) or 'retreat'
// (back off toward the castle in step, still fighting what's in reach).
function formGroup(team, units, mode) {
  units = units.filter(u => !u.dead && u.type !== 'miner' && !isGiant(u));
  if (!units.length) return null;
  const front = units.filter(u => u.type === 'spear' || u.type === 'sword');
  const ref = front.length ? front : units;
  const g = {
    id: NEXT_GROUP++, team: team.id, mode, members: units, speed: 0, done: false,
    anchor: team.dir > 0 ? Math.max(...ref.map(u => u.x)) : Math.min(...ref.map(u => u.x)),
  };
  for (const u of units) {
    setOrder(u, { type: 'group', g });
    u.ownStance = null;
  }
  G.groups.push(g);
  return g;
}

function updateGroups(dt) {
  for (const g of G.groups) {
    g.members = g.members.filter(u => !u.dead && u.order.type === 'group' && u.order.g === g);
    if (!g.members.length) { g.done = true; continue; }
    const team = G.teams[g.team], dir = team.dir;
    const byType = {};
    for (const u of g.members.slice().sort((a, b) => a.id - b.id)) (byType[u.type] = byType[u.type] || []).push(u);
    for (const [type, list] of Object.entries(byType)) list.forEach((u, i) => { u.groupSlot = rankSlot(type, i, list.length, g.anchor, dir); });
    // the formation moves at its slowest member's pace; a raised shield wall slows everyone
    let sp = Math.min(...g.members.map(u => baseSpeed(u) * spellSpeed(u)));
    if (g.members.some(u => u.shieldWall)) sp *= 0.45;
    if (g.mode === 'advance') sp *= 0.75;
    if (g.mode === 'retreat') sp *= 0.7;
    g.speed = sp;
    const es = G.teams[1 - g.team].statue;
    const goal = g.mode === 'retreat' ? team.gateX + dir * 40 : es.x - dir * (es.halfW + 30);
    // halt while the front line is in melee (except when retreating) or while stragglers catch up.
    // Archers, warlocks and Kestrels shooting from the back don't stop the march: they fire and
    // then hurry back into rank, and the line only waits if one falls far behind.
    const fighting = g.mode !== 'retreat' && g.members.some(u => u.grpFighting && !isRanged(u));
    const behind = g.members.some(u => Math.abs(u.x - u.groupSlot.x) > (g.mode === 'retreat' ? 120 : isRanged(u) ? 200 : 70));
    const prev = g.anchor;
    // form up first (spearton to the front, archers to the back), then march
    if (g.forming === undefined) g.forming = g.mode === 'retreat' ? 0 : 4;
    if (g.forming > 0) {
      g.forming -= dt;
      if (g.members.every(u => Math.abs(u.x - u.groupSlot.x) + Math.abs(u.y - u.groupSlot.y) < 28)) g.forming = 0;
    }
    if (!fighting && !behind && g.forming <= 0) {
      const d = goal - g.anchor, step = sp * dt;
      g.anchor = Math.abs(d) <= step ? goal : g.anchor + Math.sign(d) * step;
    }
    g.marching = g.anchor !== prev;
    g.march = Math.sign(g.anchor - prev);   // which way the line is moving (0 when halted)
    if (g.mode === 'retreat' && Math.abs(goal - g.anchor) < 1 && !behind) {
      for (const u of g.members) setOrder(u, { type: 'hold', x: u.groupSlot.x, y: u.groupSlot.y });
      g.done = true;
    }
  }
  G.groups = G.groups.filter(g => !g.done);
}

// One member of a marching formation.
function doGroup(u, dt) {
  const g = u.order.g, slot = u.groupSlot;
  u.grpFighting = false;
  if (!slot) return;
  const reach = isRanged(u) ? u.range : u.range + 10;
  // while the line marches, a shooter that has dropped well behind its rank catches up before firing again
  const lagging = isRanged(u) && g.marching && g.march * (slot.x - u.x) > 90;
  let t = lagging ? null : nearestEnemy(u, reach + 10);
  if (t && !inReach(u, t, 0)) t = null;
  if (!t && g.mode === 'attack' && !lagging) t = nearestEnemy(u, isRanged(u) ? u.range : 140);
  // swordwrath (and ninjas) behind the spear line sprint out and leap over it once the enemy is close
  if (!t && (u.type === 'sword' || u.type === 'ninja') && g.mode !== 'retreat') {
    const near = nearestEnemy(u, 150);
    if (near) {
      if (!u.brokeOut) { u.brokeOut = true; u.jumpT = 0.5; u.runDist = 200; }   // a running jump: Running Jump perks apply
      t = near;
    }
  }
  if (!t) u.brokeOut = false;
  const es = G.teams[1 - u.team].statue;
  if (!t && g.mode !== 'retreat' && !es.dead && inReach(u, es, 0)) t = es;
  if (t) {
    u.grpFighting = true;
    // shooters reload on the move: they only stop for the shot itself
    if (isRanged(u) && g.marching && u.swing < 0 && u.atkCd > 0 && inReach(u, t, 0)) return keepRank(u, g, dt);
    return engage(u, t, dt);
  }
  if (u.swing >= 0) return;
  keepRank(u, g, dt);
}

// Walk with the formation. While the line marches, aim a little ahead of the rank slot so the
// unit never "arrives" and stops, and match the line's pace: a bit faster when behind, slower
// when ahead. Faster units simply walk slower (their legs slow down to match).
function keepRank(u, g, dt) {
  const team = G.teams[u.team], slot = u.groupSlot;
  const off = Math.abs(u.x - slot.x) + Math.abs(u.y - slot.y);
  if (g.marching && off < 120) {
    const lag = g.march * (slot.x - u.x);
    u.capSpeed = g.speed * clamp(1 + lag / 40, 0.6, 1.8);
    u.settled = false;
    moveTo(u, slot.x + g.march * 24, slot.y, dt);
    u.facing = g.mode === 'retreat' ? team.dir : g.march;
    return;
  }
  u.capSpeed = null;   // forming up, halted, or far out of place: full speed to the slot
  if (moveTo(u, slot.x, slot.y, dt) || g.mode === 'retreat') u.facing = team.dir;
}

// Stand on top of one of our walls. Damage taken there is split with the wall.
function doManWall(u, team, dt) {
  const w = u.order.wall;
  if (!w || w.dead || w.progress < 1) {
    setOrder(u, { type: 'hold', x: u.x, y: u.y });
    return;
  }
  const slot = Math.max(0, w.guards.indexOf(u));
  const sx = w.x - team.dir * (3 + (slot - (WALL_SEGS - 1) / 2) * 5), sy = wallSegY(slot) + 1;   // on the crest of this row
  if (!u.onWall) {
    if (u.swing < 0 && moveTo(u, sx, sy, dt)) u.onWall = w;
    return;
  }
  u.x = sx;
  u.y = sy;
  const t = nearestEnemy(u, (isRanged(u) ? u.range : u.range + 30) + 10);
  if (t && inReach(u, t, 4)) {
    u.facing = t.x >= u.x ? 1 : -1;
    if (u.swing < 0 && u.atkCd <= 0) startSwing(u, isRanged(u) ? 'shoot' : 'attack', t);
  } else if (u.swing < 0) u.facing = team.dir;
}

// Shared behaviour for fighters: orders first, then this unit's (or the team's) stance.
function updateFighter(u, dt) {
  const team = G.teams[u.team], o = u.order;
  if (o.type === 'refit') return doRefit(u, dt);
  if (o.type === 'manwall') return doManWall(u, team, dt);
  if (handleBlocked(u, dt)) return;
  if (o.type === 'attack') {
    if (isValidTarget(o.target) && (o.target.isStructure || canTarget(u, o.target))) return engage(u, o.target, dt);
    u.order = { type: 'hold', x: u.x, y: u.y };
    return;
  }
  if (o.type === 'move') {
    if (moveTo(u, o.x, o.y, dt)) u.order = { type: 'hold', x: o.x, y: o.y };
    return;
  }
  if (o.type === 'hold') {
    const t = nearestEnemy(u, isRanged(u) ? u.range : 170, isRanged(u) ? u.x : o.x);
    if (t) return engage(u, t, dt);
    const es = G.teams[1 - u.team].statue;
    if (!es.dead && Math.abs(es.x - u.x) < (isRanged(u) ? u.range : 170) + es.halfW) return engage(u, es, dt);
    if (u.swing < 0) moveTo(u, o.x, o.y, dt);
    return;
  }
  if (o.type === 'group') return doGroup(u, dt);
  const stance = u.ownStance || team.stance;
  if (o.type === 'garrison' || stance === 'garrison') return goGarrison(u, dt);

  if (stance === 'defend') {
    const lineX = defendLine(team);
    const t = defendTarget(u, team, lineX);
    if (t) return engage(u, t, dt);
    // spearton in front, swordwrath on the line, archers and mages behind
    const s = rankSlot(u.type, u.slotIdx, team.slotCount[u.type] || 1, lineX, team.dir);
    if (u.swing < 0 && moveTo(u, s.x, s.y, dt)) u.facing = team.dir;
    return;
  }
  // attack stance: fight anything nearby, otherwise march on the enemy statue
  const t = nearestEnemy(u, u.aggro);
  if (t) {
    if (u.shieldWall && inReach(u, t, 10)) { u.facing = t.x >= u.x ? 1 : -1; return; }
    return engage(u, t, dt);
  }
  const es = G.teams[1 - u.team].statue;
  if (!es.dead) engage(u, es, dt);
  else if (u.swing < 0) moveTo(u, es.x - G.teams[u.team].dir * 60, u.slotY, dt);   // hunt the statue's giant
}

function updateMiner(u, dt) {
  const team = G.teams[u.team], o = u.order;
  u.retaliateT -= dt;
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
  // self-defense: swing back at whoever hit us while they're still close
  const foe = u.lastAttacker;
  if (u.retaliateT > 0 && !u.inside && isValidTarget(foe) && Math.abs(foe.x - u.x) < 110) return engage(u, foe, dt);
  if (o.type === 'hold') return;
  if (o.type === 'build') return doBuild(u, team, dt);
  if (o.type === 'replenish') return doReplenish(u, team, dt);
  // garrisoned miners (whole army, miners-only recall, or their own order) pan the castle stream
  const garrisoned = o.type === 'garrison' || o.type === 'pan' ||
    (o.type !== 'work' && (team.stance === 'garrison' || team.minersIn || u.ownStance === 'garrison'));
  if (garrisoned) return doPan(u, team, dt);
  if (o.type === 'mana') {
    if (!doMana(u, team, dt)) {
      u.order = { type: 'stance' };
      if (u.team === 0) floatText(u.x, u.y - 78, 'The statue is crowded', '#9fd8ec');
    }
    return;
  }

  if (!u.mine || u.mine.gold <= 0) {
    if (u.carry > 0) return deposit(u, team, dt);
    setMine(u, chooseMine(u, team));
    if (!u.mine) {
      moveTo(u, team.statue.x + team.dir * 95, u.slotY, dt);
      return;
    }
  }
  doGold(u, team, dt);
}

function mineSpot(u, m, team) {
  const slot = Math.max(0, m.workers.indexOf(u));
  const k = 0.55 + 0.45 * (m.gold / m.max);
  return [
    m.x - team.dir * (m.size * k * 0.9 + 8 + (slot >= 2 ? 10 : 0)),
    clamp(m.y + [-9, 7, 1, -4][slot % 4], LANE_TOP, LANE_BOT),
  ];
}

function doGold(u, team, dt) {
  const m = u.mine;
  if (u.carry >= u.carryCap) return deposit(u, team, dt);
  if (u.swing >= 0) return;
  const [wx, wy] = mineSpot(u, m, team);
  if (moveTo(u, wx, wy, dt)) {
    u.facing = m.x > u.x ? 1 : -1;
    if (u.atkCd <= 0) startSwing(u, 'gold', m);
  }
}

// Kneel at the castle stream and pan: 1 gold + 1 mana per tick. Extra miners just rest inside.
function doPan(u, team, dt) {
  if (u.panSlot < 0) {
    const i = team.panSlots.indexOf(null);
    if (i < 0) return goGarrison(u, dt);
    team.panSlots[i] = u;
    u.panSlot = i;
    setMine(u, null);
    freeManaSlot(u);
  }
  u.panUsed = true;
  if (u.swing >= 0) return;
  if (!moveTo(u, team.gateX - team.dir * PAN_XS[u.panSlot], LANE_BOT - 1, dt)) return;
  if (u.carry > 0) {
    // gold carried in is stored at the castle
    team.gold += u.carry;
    G.stats[u.team].gold += u.carry;
    u.carry = 0;
  }
  u.facing = u.panSlot % 2 ? -team.dir : team.dir;
  u.panning = true;
  u.panT += (dt * u.panMul) / PAN_TICK;
  while (u.panT >= 1) {
    u.panT -= 1;
    team.gold += 1;
    team.mana = Math.min(MAX_MANA, team.mana + 1);
    G.stats[u.team].gold += 1;
    G.stats[u.team].mana += 1;
    u.panTicks++;
    if (u.panTicks % 4 === 0) {
      spawnBurst(u.x + u.facing * 10, u.y - 6, 3, { color: '#c99b2a', speed: 30, up: 50, g: 300, life: 0.5, size: 1.6 });
      if (u.team === 0) floatText(u.x, u.y - 50, '+4 / +4', '#d8c48a');
    }
  }
}

function freePanSlot(u) {
  if (u.panSlot >= 0) {
    G.teams[u.team].panSlots[u.panSlot] = null;
    u.panSlot = -1;
  }
}

// Tend a deposit to restore its gold (Prospecting). No mining while doing this.
function doReplenish(u, team, dt) {
  const m = u.order.mine;
  if (!m || m.gold >= m.max) {
    if (m && u.team === 0) floatText(m.x, m.y - 50, 'Deposit restored', '#e0bf5a');
    setOrder(u, { type: 'stance' });
    return;
  }
  if (u.carry > 0) return deposit(u, team, dt);
  if (u.swing >= 0) return;
  setMine(u, null);
  const slot = u.id % 3;
  const wx = m.x - team.dir * (m.size + 12 + slot * 6), wy = clamp(m.y + [-8, 6, 14][slot], LANE_TOP, LANE_BOT);
  if (moveTo(u, wx, wy, dt)) {
    u.facing = m.x > u.x ? 1 : -1;
    if (u.atkCd <= 0) startSwing(u, 'replenish', m);
  }
}

function deposit(u, team, dt) {
  if (u.swing >= 0) return;
  if (moveTo(u, team.statue.x + team.dir * 72, clamp(u.slotY, LANE_TOP, LANE_TOP + 50), dt)) {
    team.gold += u.carry;
    G.stats[u.team].gold += u.carry;
    if (u.team === 0) floatText(u.x, u.y - 78, `+${u.carry}`, '#e0bf5a');
    u.carry = 0;
  }
}

const MANA_SPOTS = [[62, 8], [-62, 20], [98, 30], [-98, 42]];

// Kneel before the statue and pray; each bow yields mana. Returns false if no room.
function doMana(u, team, dt) {
  if (u.manaSlot < 0) {
    const i = team.manaSlots.indexOf(null);
    if (i < 0) return false;
    team.manaSlots[i] = u;
    u.manaSlot = i;
    setMine(u, null);
  }
  if (u.carry > 0) { deposit(u, team, dt); return true; }
  if (u.swing >= 0) return true;
  const st = team.statue, spot = MANA_SPOTS[u.manaSlot];
  if (!moveTo(u, st.x + spot[0] * team.dir, LANE_TOP + spot[1], dt)) return true;
  u.facing = st.x > u.x ? 1 : -1;
  u.praying = true;
  if (u.pray < 0) u.pray = 0;
  const prev = u.pray;
  u.pray += dt / PRAY_TIME;
  if (Math.floor(prev + 0.5) < Math.floor(u.pray + 0.5)) {
    const amt = Math.round(MANA_PER_PRAYER * u.manaMul * (clanOf(team).prayer || 1));   // Mercenaries pray poorly, the Arcane Circle well
    team.mana = Math.min(MAX_MANA, team.mana + amt);
    G.stats[u.team].mana += amt;
    st.glow = 1;
    const col = TEAM_STYLE[u.team].crystal;
    for (let i = 0; i < 6; i++) {
      G.particles.push({ kind: 'spark', x: u.x + u.facing * rnd(8, 20), y: u.y - rnd(10, 30), vx: (st.x - u.x) * rnd(0.6, 1), vy: rnd(-40, -15), life: rnd(0.6, 1), max: 1, color: col, size: rnd(1.2, 2.4) });
    }
    if (u.team === 0) floatText(u.x, u.y - 60, `+${amt}`, col);
  }
  return true;
}

function doBuild(u, team, dt) {
  const w = u.order.wall;
  if (!trenchNeedsWork(w)) { setOrder(u, { type: 'stance' }); return; }
  if (u.swing >= 0) return;
  const wx = w.x - team.dir * 22, wy = LANE_TOP + 8 + (u.id % 4) * 24;
  if (moveTo(u, wx, wy, dt)) {
    u.facing = team.dir;
    if (u.atkCd <= 0) startSwing(u, 'build', w);
  }
}

function chooseMine(u, team) {
  let best = null, bs = 1e9;
  for (const m of G.mines) {
    if (m.gold <= 0) continue;
    const n = m.workers.filter(w => w !== u).length;
    const s = Math.abs(m.x - team.statue.x) + n * 200 + (n >= MINE_SLOTS ? 5000 : 0);
    if (s < bs) { bs = s; best = m; }
  }
  return best;
}

function setMine(u, m) {
  if (u.mine === m) return;
  if (u.mine) u.mine.workers = u.mine.workers.filter(w => w !== u);
  u.mine = m;
  if (m) m.workers.push(u);
}

function freeManaSlot(u) {
  if (u.manaSlot >= 0) {
    G.teams[u.team].manaSlots[u.manaSlot] = null;
    u.manaSlot = -1;
  }
}

function leaveWall(u) {
  if (u.order.type === 'manwall' && u.order.wall) u.order.wall.guards = u.order.wall.guards.filter(g => g !== u);
  u.onWall = null;
}

function setOrder(u, order) {
  if (u.type === 'miner' && order.type !== 'mana') freeManaSlot(u);
  if (order.type !== 'manwall' || order.wall !== u.order.wall) leaveWall(u);
  u.slow = false;
  u.capSpeed = null;
  u.settled = false;
  u.refitT = 0;
  u.order = order;
}

function depleteMine(m) {
  m.gold = 0;
  spawnBurst(m.x, m.y - 12, 14, { color: G.map.theme.rock, speed: 140, up: 120, g: 600, life: 0.9, size: 3.5 });
  for (const w of m.workers.slice()) setMine(w, null);
  m.workers = [];
}

function addDecal(x, y, r, a) {
  G.decals.push({ x, y: clamp(y, LANE_TOP - 6, LANE_BOT + 10), r, a, rot: rnd(0, TAU), sq: rnd(0.35, 0.6) });
  if (G.decals.length > 220) G.decals.shift();
}

// aoe: splash, blasts and pools (a Parry can't turn those aside)
function damage(t, amt, src, aoe) {
  amt = Math.max(1, Math.round(amt));
  if (t.isStructure) {
    if (t.dead) return;
    if (src && src.type === 'ballista') amt = Math.round(amt * BALLISTA.structureMul);   // siege bolts wreck trenches and statues
    t.hp -= amt;
    t.flash = 0.15;
    if (src) debugDamage(src, amt, true);
    const y0 = t.isStatue ? LANE_TOP - rnd(10, 120) : LANE_TOP + rnd(-40, 60);
    spawnBurst(t.x + rnd(-1, 1) * (t.isStatue ? 40 : 10), y0, 4, { color: t.stone, speed: 120, up: 60, g: 600, life: 0.8, size: 3 });
    if (t.isStatue && t.team === 0 && G.alertCd <= 0) {
      toast('Your statue is under attack!', 'warn');
      G.alertCd = 12;
    }
    if (t.hp <= 0) {
      if (t.isStatue) destroyStatue(t);
      else destroyWall(t);
    }
    return;
  }
  if (t.lastStand > 0) { t.flash = 0.12; return; }   // already living on borrowed time
  // archers are the giant-killers: extra damage, and a chance to send it into a confused rage
  if (isGiant(t) && src && src.type === 'archer') {
    amt = Math.round(amt * ARCHER_VS_GIANT);
    confuseGiant(t, GIANT_CONFUSE.chance);
  }
  // Parry: a ninja turns aside one blow every few seconds, stunning a melee attacker
  if (t.perks.parry && t.parryCd <= 0 && src && !aoe) {
    t.parryCd = PARRY_CD;
    floatText(t.x, t.y - 70, 'Parry!', '#d8e4f0');
    spawnBurst(t.x + t.facing * 10, t.y - 40, 6, { color: '#e8eef4', speed: 120, up: 20, g: 200, life: 0.3, size: 1.6 });
    if (!src.isStructure && !src.castle && !isRanged(src) && !src.dead) {
      src.stunT = Math.max(src.stunT || 0, PARRY_STUN);
      src.swing = -1;
    }
    return;
  }
  // a Sanctuary shield soaks up damage before anything else
  if (t.fx.shield > 0) {
    const soak = Math.min(t.fx.shield, amt);
    t.fx.shield -= soak;
    amt -= soak;
    G.particles.push({ kind: 'spark', x: t.x + rnd(-10, 10), y: t.y - rnd(20, 60), vx: rnd(-20, 20), vy: rnd(-30, 0), life: 0.4, max: 0.4, color: '#e8e0b0', size: 1.8 });
    if (amt <= 0) return;
  }
  // defenders on a wall share every blow with the stones under them
  if (t.onWall && !t.onWall.dead) {
    const half = Math.max(1, Math.round(amt / 2));
    damage(t.onWall, half, src);
    amt = half;
  }
  const armor = armorOf(t, src);
  if (armor > 0) {
    amt = Math.max(1, Math.round(amt * (1 - armor)));
    spawnBurst(t.x + t.facing * 8, t.y - 50, t.shieldWall ? 5 : 3, { color: '#d8d2c0', speed: 90, up: 30, g: 300, life: 0.25, size: 1.5 });
  }
  t.hp -= amt;
  t.flash = 0.12;
  t.showHp = 3;
  if (src) debugDamage(src, Math.min(amt, amt + t.hp));
  spawnBurst(t.x, t.y - 38, 6, { color: '#5c0d0b', speed: 90, up: 40, g: 500, life: 0.6, size: 2.2 });
  if (chance(0.6)) addDecal(t.x + rnd(-12, 12), t.y + rnd(-3, 4), rnd(1.5, 4), 0.55);
  if (t.type === 'miner' && src && !src.isStructure) {
    t.lastAttacker = src;
    t.retaliateT = 4;
  }
  if (t.hp <= 0) fallUnit(t, src);
}

// A unit's hp ran out: Last Stand swordwrath get a few more seconds, everyone else dies.
function fallUnit(u, src) {
  if (u.perks.rage2 && !u.lastStandUsed) {
    u.lastStandUsed = true;
    u.lastStand = LAST_STAND;
    u.lastStandSrc = src;
    u.hp = 0.01;
    u.burnT = 0;
    if (u.team === 0) floatText(u.x, u.y - 90, 'Last stand!', '#e0503a');
    return;
  }
  // Feather Fall: a Kestrel shot out of the sky glides down and fights on with a knife
  if (u.type === 'flyer' && u.perks.feather && !u.grounded) {
    u.grounded = true;
    u.burnT = 0;
    u.swing = -1;
    applyPerks(u);
    u.hp = u.maxHp;
    spawnBurst(u.x, u.y - u.alt - 40, 10, { color: '#d8cfbc', speed: 90, up: 20, g: 120, life: 1.2, size: 2 });
    if (u.team === 0) floatText(u.x, u.y - u.alt - 70, 'Feather fall!', '#d8cfbc');
    return;
  }
  killUnit(u, src);
}

function killUnit(u, src) {
  u.dead = true;
  u.deathT = 0;
  u.hp = 0;
  u.selected = false;
  u.swing = -1;
  u.shieldWall = false;
  u.lastStand = 0;
  setMine(u, null);
  freeManaSlot(u);
  freePanSlot(u);
  leaveWall(u);
  addDecal(u.x - u.facing * 14, u.y + 1, rnd(6, 10), 0.6);
  if (src) {
    G.stats[src.team].kills++;
    // Mercenary bounty: a share of what the fallen unit cost
    const bounty = clanOf(G.teams[src.team]).bounty;
    if (bounty && src.team !== u.team) {
      const pay = Math.round(unitCost(G.teams[u.team], u.type).gold * bounty);
      G.teams[src.team].gold += pay;
      G.stats[src.team].gold += pay;
      if (src.team === 0) floatText(u.x, u.y - 60, `+${pay}`, '#e0bf5a');
    }
  }
  // victory: the statue is gone and now so is the giant that was sealed inside it
  if (u.isStatueGiant && !G.over) {
    G.over = { winner: 1 - u.team };
    G.overT = 0;
  }
}

function destroyWall(w) {
  w.dead = true;
  w.hp = 0;
  for (let k = 0; k < WALL_SEGS; k++) spawnBurst(w.x, wallSegY(k) - 30, 6, { color: w.stone, speed: 160, up: 120, g: 650, life: 1.1, size: 4 });
  for (const g of w.guards) g.onWall = null;
  if (w.team === 0) toast('A trench has been overrun', 'warn');
}

// Recompute aura buffs: sword Military Training (allies nearby) and spearton inspiration stacks.
function updateBuffs() {
  const alive = G.units.filter(u => !u.dead);
  for (const u of alive) { u.insp = 0; u.drillN = 0; }
  for (const u of alive) {
    if (u.type !== 'sword' || !u.perks.drill || u.inside) continue;
    let n = 0;
    for (const o of alive) if (o !== u && o.team === u.team && Math.abs(o.x - u.x) < 110 && Math.abs(o.y - u.y) < 60) n++;
    u.drillN = Math.min(5, n);
  }
  // Each leader hands one stack to up to 8 allies, least-inspired first, so
  // everyone nearby gets a first stack before anyone gets a second.
  for (const L of alive) {
    if (L.type !== 'spear' || !L.perks.inspire || L.inside) continue;
    const near = alive.filter(o => o !== L && o.team === L.team && o.type !== 'miner' && o.insp < 3 && Math.abs(o.x - L.x) < 160);
    // stable order (distance in coarse steps, then id) so stacks don't hop between units
    near.sort((a, b) => a.insp - b.insp || Math.round(Math.abs(a.x - L.x) / 40) - Math.round(Math.abs(b.x - L.x) / 40) || a.id - b.id);
    for (const o of near.slice(0, 8)) o.insp++;
  }
}

function updateUnit(u, dt) {
  if (u.dead) { u.deathT += dt; return; }
  const team = G.teams[u.team];
  u.flash -= dt;
  u.showHp -= dt;
  u.atkCd -= dt;
  u.blockT -= dt;
  if (u.lastStand > 0) {
    u.lastStand -= dt;
    if (u.lastStand <= 0) { killUnit(u, u.lastStandSrc); return; }
  }
  if (u.burnT > 0) {
    u.burnT -= dt;
    u.hp -= BURN_DPS * dt;
    if (u.burnSrc) debugDamage(u.burnSrc, BURN_DPS * dt);
    if (chance(dt * 10)) G.particles.push({ kind: 'spark', x: u.x + rnd(-6, 6), y: u.y - rnd(20, 55), vx: rnd(-8, 8), vy: rnd(-50, -25), life: 0.5, max: 0.5, color: pick(['#ff9a2e', '#ffcf6a', '#e0502a']), size: rnd(1.2, 2.4) });
    if (u.hp <= 0) {
      fallUnit(u, u.burnSrc && !u.burnSrc.dead ? u.burnSrc : null);
      if (u.dead) return;
    }
  }
  if (u.swing >= 0) {
    u.swing += dt / u.swingDur;
    if (!u.hitDone && u.swing >= (u.swingKind === 'shoot' ? 0.8 : 0.5)) {
      u.hitDone = true;
      onSwingHit(u);
    }
    if (u.swing >= 1) { u.swing = -1; u.leapSwing = false; }
  }
  u.capSpeed = null;
  u.moving = false;
  u.stepDist = 0;
  u.praying = false;
  u.panning = false;
  u.panUsed = false;
  u.refitting = false;
  const fx = u.fx;
  for (const k of ['haste', 'slow', 'empower', 'enfeeble']) if (fx[k] > 0) fx[k] -= dt;
  if (fx.shieldT > 0) { fx.shieldT -= dt; if (fx.shieldT <= 0) fx.shield = 0; }
  if (u.jumpT > 0) u.jumpT -= dt;
  if (u.dropT > 0) u.dropT -= dt;
  if (u.type === 'ninja') {
    u.parryCd -= dt;
    updateNinjaMode(u);
  } else if (u.type === 'flyer') {
    // climb to cruising height (or glide down after Feather Fall)
    const want = isFlying(u) ? FLY_ALT + Math.sin(RT * 1.7 + u.seed) * 4 : 0;
    u.alt += (want - u.alt) * Math.min(1, dt * (u.grounded ? 3 : 2));
    if (u.grounded && u.alt < 0.5) u.alt = 0;
  }
  // knocked back by a giant: slide, then lie stunned
  if (u.knockV) {
    u.x += u.knockV * dt;
    u.knockV *= Math.pow(0.02, dt);
    if (Math.abs(u.knockV) < 6) u.knockV = 0;
  }
  if (u.stunT > 0) u.stunT -= dt;
  if (u.stunT > 0) { /* stunned: no actions */ }
  else if (u.type === 'miner') updateMiner(u, dt);
  else if (isGiant(u)) updateGiant(u, dt);
  else if (isMage(u) && updateMageCasting(u, dt)) { /* busy casting or walking to cast */ }
  else if (u.type === 'cleric') updateCleric(u, dt);
  else updateFighter(u, dt);
  if (!u.praying) u.pray = -1;
  if (u.type === 'miner' && !u.panUsed) freePanSlot(u);
  if (u.type === 'ninja') updateStealth(u, dt);
  if (u.type === 'spear') updateJavelin(u);
  // legs move in step with the distance actually covered, so a fast unit held to a slow
  // formation pace walks slowly instead of sprinting on the spot; sprinters drop to a walk
  const inst = dt > 0 ? Math.min(1.6, u.stepDist / (dt * baseSpeed(u))) : 0;
  u.pace += (inst - u.pace) * Math.min(1, dt * 8);
  if (u.moving) {
    const sprinter = (u.type === 'sword' || u.type === 'ninja') && !u.slow && u.pace > 0.8;
    u.walk += dt * (sprinter ? 13 : u.type === 'miner' ? 7 : 9) * u.speedMul * Math.max(0.35, u.pace);
    u.stillT = 0;
  } else {
    u.stillT += dt;
    if (u.stillT > 0.25) u.runDist = 0;
  }
  u.y = clamp(u.y, LANE_TOP, LANE_BOT);
  u.x = u.team === 0 ? clamp(u.x, 20, WORLD_W - GATE_X - 22) : clamp(u.x, GATE_X + 22, WORLD_W - 20);
  u.inside = team.dir * (u.x - team.gateX) < -4;
  if (u.inside && u.hp < u.maxHp && u.lastStand <= 0) {
    u.hp = Math.min(u.maxHp, u.hp + GARRISON_HEAL * dt);
    if (chance(dt * 2.5)) G.particles.push({ kind: 'spark', x: u.x + rnd(-6, 6), y: u.y - rnd(20, 50), vx: 0, vy: -25, life: 0.8, max: 0.8, color: '#7fd87a', size: 1.6 });
  }
}

// Same-team units gently push apart so they don't stack perfectly.
function separate(dt) {
  const us = G.units.filter(u => !u.dead && !u.onWall && !u.panning && !u.praying && !isGiant(u));
  for (let i = 0; i < us.length; i++) {
    const a = us[i];
    for (let j = i + 1; j < us.length; j++) {
      const b = us[j];
      if (a.team !== b.team || isFlying(a) !== isFlying(b)) continue;   // the air and the ground don't jostle
      const dx = b.x - a.x, dy = b.y - a.y;
      if (Math.abs(dx) < 14 && Math.abs(dy) < 10) {
        const s = dy !== 0 ? Math.sign(dy) : a.id < b.id ? 1 : -1;
        a.y -= s * 26 * dt;
        b.y += s * 26 * dt;
        const sx = dx !== 0 ? Math.sign(dx) : a.id < b.id ? 1 : -1;
        a.x -= sx * 14 * dt;
        b.x += sx * 14 * dt;
      }
    }
  }
  // giants are 3 rows wide: two fit across the lane, and they never stand inside each other
  const gs = G.units.filter(u => !u.dead && isGiant(u));
  for (let i = 0; i < gs.length; i++) {
    for (let j = i + 1; j < gs.length; j++) {
      const a = gs[i], b = gs[j];
      if (a.team !== b.team) continue;
      const dx = b.x - a.x, dy = b.y - a.y, wy = (LANE_BOT - LANE_TOP) * 0.45;
      if (Math.abs(dx) < 50 && Math.abs(dy) < wy) {
        const s = dy !== 0 ? Math.sign(dy) : a.id < b.id ? 1 : -1;
        a.y -= s * 30 * dt;
        b.y += s * 30 * dt;
        if (Math.abs(dy) > wy * 0.8) continue;   // already side by side
        const sx = dx !== 0 ? Math.sign(dx) : a.id < b.id ? 1 : -1;
        a.x -= sx * 20 * dt;
        b.x += sx * 20 * dt;
      }
    }
  }
}

// Formation slot index per unit type, so each type forms its own rank.
function assignDefendSlots() {
  for (const team of G.teams) {
    const idx = {};
    let giants = 0;
    for (const u of G.units) {
      if (u.team !== team.id || u.dead) continue;
      if (isGiant(u)) u.giantIdx = giants++;
      else if (u.type !== 'miner' && u.order.type === 'stance') u.slotIdx = idx[u.type] = (idx[u.type] ?? -1) + 1;
    }
    team.slotCount = Object.fromEntries(Object.entries(idx).map(([k, v]) => [k, v + 1]));
  }
}
