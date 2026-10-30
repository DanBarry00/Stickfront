'use strict';
// Tunable numbers and visual themes. Tweak balance here.

const VIEW_H = 720;          // logical view height; width depends on window aspect
const WORLD_W = 5000;
const HORIZON_Y = 418;
const LANE_TOP = 492;        // units walk between LANE_TOP and LANE_BOT (deep enough for 6 abreast)
let LANE_BOT = 616;          // set per map by its lane depth (see LANE_DEPTHS)
const LANE_ROWS = 6;         // formation rows across the lane
const rowY = (row, n = LANE_ROWS) => (LANE_TOP + LANE_BOT) / 2 + (row - (n - 1) / 2) * ((LANE_BOT - LANE_TOP - 16) / (LANE_ROWS - 1));
const WALL_TOP = LANE_TOP - 195;   // castle ceiling / rampart height

const POP_CAP = 30;
const START_GOLD = 500;
const MAX_MANA = 1000;
const STATUE_HP = 2500;
// Defense beats offense, and a lost fight isn't a lost game:
// - home ground: troops take up to homeMax less damage near their own castle (full within the
//   castle archers' reach, fading to nothing at the middle of the map)
// - a statue with no enemy soldier within regenR for regenDelay seconds mends regen hp a second
// - rally: a side whose army has fallen below rallyAt of the enemy's (once the enemy's is worth
//   rallyMin) trains rallyTrain times as fast, earns rallyGold a second and its castle archers
//   shoot rallyArchers times as fast, until it recovers past rallyEnd
const DEFENSE = { homeMax: 0.2, regen: 6, regenR: 900, regenDelay: 15, rallyAt: 0.55, rallyEnd: 0.8, rallyMin: 700, rallyTrain: 1.35, rallyGold: 1.5, rallyArchers: 1.25 };
const STATUE_X = 800;        // distance of each statue from its world edge
const GATE_X = 560;          // castle front wall (gate) distance from world edge
const BUILD_X = { sword: 95, spear: 215, archer: 335, miner: 455 };   // building centers inside the castle
const RAMPART_LINE_XS = [540, 524, 508, 492];   // up to 4 garrisoned archers line up just inside the gate and shoot out of it
const ARCHER_XS = [520, 498, 476, 454];   // castle archer spots on the rampart, shoulder to shoulder from the front (extra ones are castle upgrades; the 4th is for clans with 4 slots)
// Castle archers cover the ground out to just past where an enemy archer with the same bow
// upgrades has to stand to shoot the statue: statue + its half-width + archer range + this margin.
const CASTLE_REACH_PAD = 60;
const TITHE_GOLD = [0, 1, 2.5, 4];   // statue income per second: none / Offerings / Golden Idol / Gilded Statue (Mercenary)
const JAVELIN = { range: 300, dmg: 30 };   // a Gladiator's javelin (one, refilled by garrisoning or a Quartermaster)
// Quartermasters: heal (hp per bandage, every healTime) and refit soldiers and workers (refitTime a
// unit, free; a miner pauses for it); cheer miners within cheerR: for cheerTime they walk cheerSpeed
// times as fast and mine, pan and pray cheerWork times as fast, and a Quartermaster tops them up when
// fewer than cheerTopUp seconds are left; bring an Architect materials for a free trap every
// materialsCd (materialsWagon with Supply Wagon); keep out of reach of enemies within safe.
const QM = { heal: 20, healSalves: 30, healTime: 1, refitTime: 1.2, cheerR: 160, cheerTime: 30, cheerTopUp: 8, cheerSpeed: 1.5, cheerWork: 2, materialsCd: 60, materialsWagon: 35, safe: 140, gearCd: 25 };   // gearCd: seconds before a Quartermaster can re-arm the same Gladiator
// Gladiators: the net pins its target for netTime (it reaches netRange); every kill (up to maxKills: a snowball)
// adds killHp and killDmg; with fewer than aloneN friends within aloneR, alonePer more damage each.
const GLADIATOR = { netRange: 150, netTime: 3, netTimeWeighted: 5, killHp: 15, killDmg: 0.04, maxKills: 25, aloneR: 160, aloneN: 5, alonePer: 0.08, manica: 0.2 };
// Necromancers: up to max zombies (+2 per Horde upgrade), one raised every summonCd seconds (rites:
// Quick Rites) for mana; zombies stay within leash of it, and take rangedMul of projectile damage.
const NECRO = { max: 6, summonCd: 6, rites: 4, mana: 5, leash: 170, rangedMul: 0.5, graveHp: 1.5,
  souls: 25, soulsPerSlot: 4, maxExtra: 5, soulPower: 0.03, soulHaste: 0.02 };   // souls: each kill by its zombies (up to souls) grows the pack by one per soulsPerSlot, and its zombies' power and summoning speed
// Hulks (Hulking Dead): every `every`th zombie a Necromancer raises is a hulking brute: hp and dmg
// multipliers, drawn at `scale`, walking at `speed` of a zombie's pace.
const HULK = { every: 4, hp: 3.2, dmg: 2, scale: 1.25, speed: 0.55 };
// The undead and holy light: an enemy Healing Pool burns zombies for poolMul times its healing, and a
// Cleric with nobody to heal smites the nearest enemy zombie for smiteMul times its heal.
const UNDEAD = { poolMul: 5, smiteMul: 3 };
const LEVY_INTERVAL = 60;    // seconds between free Swordwrath with the Levy castle upgrade
const DEFEND_OFFSET = 250;   // defend line distance in front of statue
const GARRISON_HEAL = 9;     // hp per second inside the castle

const MINE_SWING_TIME = 0.95;
const PRAY_TIME = 2.2;       // seconds per bow while praying for mana
const MANA_PER_PRAYER = 5;   // ~2.3 mana/s per praying miner
const MANA_SLOTS = 4;
const MINE_SLOTS = 3;
const QUEUE_MAX = 5;

// The stream through the castle: garrisoned miners pan it for 1 gold + 1 mana per tick.
// One tick every PAN_TICK seconds = half of praying's mana rate.
const PAN_SLOTS = 5;
const PAN_TICK = (PRAY_TIME / MANA_PER_PRAYER) * 2;
const PAN_XS = [70, 150, 230, 310, 390];    // distance inside the gate for each panning spot
const SIFTER_GOLD = 1.6;   // gold per panning tick with the Sifter (castle upgrade) set in the stream

const WALL_COST = 100;
const WALL_HP = 800;
const WALL_HP2 = 800;        // extra hp when a wall is reinforced (Fortification)
const WALL_MAX = 3;
const WALL_BUILD_PER_HIT = 0.07;
const WALL_SEGS = 5;         // a wall is built from this many stone columns across the lane
const wallSegY = k => LANE_TOP + 4 + k * ((LANE_BOT - LANE_TOP - 8) / (WALL_SEGS - 1));
const WALL_GUARDS = WALL_SEGS; // one row of melee defenders can stand on a wall
const WALL_H = [24, 38];     // height of a trench's earth rampart / with a palisade (where defenders stand)
const WALL_REPAIR = 0.035;   // share of a trench's max hp restored by each spade-load when repairing

// Architects' works. Traps are hidden from the enemy, cost gold and have a cooldown per kind; they
// can't go past the middle of the map; and two traps must be spacing apart unless they share a
// line across the lane (within lineDx), up to lineMax to a line, lineDy apart. Ninjas, saboteurs
// and flyers don't set them off; saboteurs find (within sabSight) and smash enemy traps. Arcane
// Circle traps are magic: the mine hits harder and the tar burns.
const TRAP = {
  tar: { name: 'Tar Pit', cost: 40, cd: 12, poolR: 80, poolTime: 25, slow: 0.5, magicDps: 8, coverR: 30 },   // coverR: the thatched cover, stepped on anywhere
  mine: { name: 'Mine', cost: 60, cd: 18, blastR: 60, dmg: 50, magicMul: 1.5, knock: 45 },
  trigger: 18, spacing: 70, lineDx: 12, lineMax: 3, lineDy: 22, layTime: 1.5, sabSight: 140, trapmaker: { cost: 0.67, cd: 0.5 },
  midClear: 300,   // no traps this close to the middle of the map
};
// Archer towers: an architect raises one (cost, buildHits blows of the hammer); an archer posted in
// it reaches range further and takes projMul of projectile damage. Melee troops that bring it down
// bury the archer in the rubble. Reinforced Towers: hp2 times the health; Watchtowers: range3 more.
// The Monolith's tower holds two archers, and starts manned by two neutral ones (team NEUTRAL) who shoot
// at both sides with neutral.dmg damage and neutral.range more reach than an archer.
const NEUTRAL = 2;
const TOWER = { cost: 150, hp: 500, h: 92, range: 120, projMul: 0.25, buildHits: 14, max: 3, hp2: 1.6, range3: 60,
  mid: { h: 102, hp: 1400, range: 240, projMul: 0.15, rebuild: 120, slots: 2, neutral: { dmg: 16, range: 120 } } };   // mid: the neutral stone tower at the Monolith, stronger than any a side can build
const towerH = tw => (tw.mid ? TOWER.mid.h : TOWER.h);   // how high a posted archer stands
const towerY = () => LANE_TOP + 3;                        // towers stand at the back of the lane, out of the way
// Wrecked trenches and towers leave a ruin in place (it doesn't block or count as a target) that
// architects can rebuild for rebuild of the usual price.
const REBUILD = 0.3;
// Idle architects (or ones in the castle, at garrisonMul the pace) study: every time seconds of
// study knocks step off the price of a random upgrade, down to at most max off.
const ARCH_RESEARCH = { time: 30, step: 0.1, max: 0.4, garrisonMul: 1.5, mana: 0.5 };   // mana: per second, each architect studying at the statue

const BURN_DPS = 4;          // Flaming Arrows damage over time
const BURN_TIME = 3;
const LAST_STAND = 2;        // seconds a Last Stand swordwrath keeps fighting at zero hp

const REFIT_COST = 5;        // gold per upgrade when a veteran goes back to be refitted
const REFIT_TIME = 2.5;      // seconds per upgrade

const UNIT_TYPES = {
  miner: {
    key: 'miner', name: 'Miner', cost: 150, time: 4.5, hp: 90, speed: 50, pop: 1,
    dmg: 4, range: 26, atkTime: 1.1, aggro: 0, hotkey: '1',
    desc: 'Mines gold, prays at the statue for mana, or pans the castle stream for both. Fights back weakly if attacked.',
  },
  architect: {
    key: 'architect', name: 'Architect', cost: 175, time: 5, hp: 80, speed: 70, pop: 1,
    dmg: 6, range: 26, atkTime: 1, aggro: 0, hotkey: '`', code: 'Backquote',
    desc: 'Builds and repairs: digs trenches (with Earthworks), lays hidden traps, raises archer towers, repairs and rebuilds trenches and towers (the Monolith’s too). Left idle (or in the castle) it studies, making random upgrades cheaper, and makes a little mana at the statue. Castle upgrades need one.',
  },
  sword: {
    key: 'sword', name: 'Swordwrath', cost: 125, time: 3.5, hp: 140, speed: 100, pop: 1,
    dmg: 12, range: 30, atkTime: 0.85, aggro: 280, hotkey: '2',
    desc: 'Fast melee infantry. Starts with a club until Forged Blades is researched.',
  },
  archer: {
    key: 'archer', name: 'Archer', cost: 160, time: 4.5, hp: 95, speed: 80, pop: 1,
    dmg: 24, range: 380, atkTime: 1.3, aggro: 420, hotkey: '3',
    desc: 'Shoots from range, even over trenches. Fragile up close; keep them behind your line.',
  },
  spear: {
    key: 'spear', name: 'Spearton', cost: 225, time: 6, hp: 320, speed: 70, pop: 2,
    dmg: 18, range: 44, atkTime: 1.2, aggro: 260, hotkey: '4',
    desc: 'Heavy infantry with long reach and light armor. Each thrust also strikes a second enemy lined up behind the first.',
  },
  // The two mages are exact opposites: same price, same numbers, mirrored effects.
  cleric: {
    key: 'cleric', name: 'Cleric', cost: 175, mana: 60, time: 6, hp: 90, speed: 70, pop: 1,
    dmg: 20, range: 260, atkTime: 1.4, aggro: 320, hotkey: '5', mage: true,
    desc: 'Heals the most wounded ally in reach for 20, and each heal briefly quickens and blesses it (faster and harder-hitting). Researched spells: Healing Pool, Sanctuary. Upgrades: Hope, two staffs.',
  },
  warlock: {
    key: 'warlock', name: 'Warlock', cost: 175, mana: 60, time: 6, hp: 90, speed: 70, pop: 1,
    dmg: 20, range: 260, atkTime: 1.4, aggro: 320, hotkey: '6', mage: true,
    desc: 'Hurls a bolt at an enemy for 20 that briefly slows and weakens it. Researched spells: Blight Pool, Fireball. Upgrades: Fear, two staffs.',
  },
  // Giants can't be ordered around: they follow nearby troops (more troops, more chains, more obedience).
  giant: {
    key: 'giant', name: 'Giant', cost: 450, mana: 120, time: 14, hp: 900, speed: 40, pop: 4,
    dmg: 55, range: 54, atkTime: 2.3, aggro: 300, hotkey: '-', code: 'Minus',
    desc: 'Huge, slow and brutal. Goes for whoever has the most health, ignoring taunts, and each blow splashes the 2 enemies beside its target. Cannot be commanded directly: it follows the troops around it, and may wander off on its own. Archers hurt and confuse giants.',
  },
  // Ninjas strike first and hardest: an ambush blow, then quick cuts. They vanish while running.
  ninja: {
    key: 'ninja', name: 'Ninja', cost: 150, time: 5, hp: 75, speed: 125, pop: 1,
    dmg: 15, range: 28, atkTime: 0.75, aggro: 340, hotkey: '=', code: 'Equal',
    desc: 'Fast, fragile assassin. Its first blow of a fight deals triple damage, its blade cuts through some armor, and it cannot be targeted while running (5s cooldown after it stops or strikes). Hunts the weakest enemy in reach and goes for archers first.',
  },
  // Flyers glide above the battle: only ranged attacks can reach them.
  flyer: {
    key: 'flyer', name: 'Kestrel', cost: 175, time: 6, hp: 70, speed: 95, pop: 1,
    dmg: 15, range: 300, atkTime: 1.15, aggro: 340, hotkey: '[', code: 'BracketLeft',
    desc: 'Glides above the battle with a small crossbow, over trenches and out of reach of melee: only archers, warlocks, castle archers, thrown stars and other Kestrels can hit it. Weaker shots than an archer.',
  },
  // Defense Clan siege engine: out-ranges everything, wrecks trenches and statues, helpless up close.
  ballista: {
    key: 'ballista', name: 'Ballista', cost: 250, mana: 50, time: 10, hp: 160, speed: 40, pop: 2,
    dmg: 45, range: 550, atkTime: 4, aggro: 590, hotkey: ']', code: 'BracketRight', clans: ['defense'], needs: 'architect',
    desc: 'A crewed bolt-thrower. Range 550, one heavy bolt every 4s that punches through into a second unit, double damage to trenches and statues. It cannot hit flyers or anything closer than 120, so it backs away from attackers. Slow.',
  },
  // Arcane Circle construct: a commandable tank. Hunker Down to soak damage and draw attacks.
  golem: {
    key: 'golem', name: 'Spirit Golem', cost: 150, mana: 250, time: 12, hp: 700, speed: 45, pop: 3,
    dmg: 30, range: 40, atkTime: 1.6, aggro: 280, hotkey: '\\', code: 'Backslash', clans: ['arcane'],
    desc: 'A rune-carved stone construct that takes your orders, unlike a giant. 700 hp, hits one target at a time, and takes half damage from Warlock magic. Hunker Down (X): half speed, 60% less damage, enemies prefer to hit it, and it stops attacking.',
  },
  // Beast Clan slinger: the giant-killer (and giant-tamer). Its stones reach flyers too.
  beastmaster: {
    key: 'beastmaster', name: 'Beastmaster', cost: 140, time: 5, hp: 90, speed: 80, pop: 1,
    dmg: 14, range: 260, atkTime: 1.2, aggro: 300, hotkey: "'", code: 'Quote', clans: ['beast'],
    desc: 'A slinger in a beast-hide cloak. Its stones reach flyers and do double damage to enemy giants, and nearby friendly giants obey it as if more troops were around.',
  },
  // Shadow Clan infiltrator: slips past the line unseen to wreck trenches and salt enemy gold.
  saboteur: {
    key: 'saboteur', name: 'Saboteur', cost: 150, mana: 25, time: 6, hp: 60, speed: 135, pop: 1,
    dmg: 6, range: 26, atkTime: 0.9, aggro: 200, hotkey: ';', code: 'Semicolon', clans: ['shadow'],
    desc: 'A cloaked infiltrator, very fast, that vanishes while running like a ninja. Weak in a fight, but does triple damage to trenches, and can Salt a gold deposit (right-click it): for 30s enemy miners get only half the gold they dig there.',
  },
  // Sky Clan bomber: glides over the enemy and drops fire pots on the ground below.
  firebird: {
    key: 'firebird', name: 'Firebird', cost: 200, mana: 50, time: 9, hp: 90, speed: 85, pop: 2,
    dmg: 20, range: 40, atkTime: 3, aggro: 320, hotkey: '/', code: 'Slash', clans: ['sky'],
    desc: 'A rider on a flame-feathered glider. Every 3s it drops a fire pot on the ground units below it: 20 damage to everyone in a small area, and they burn. It cannot hit other flyers. Like a Kestrel, only ranged attacks can reach it.',
  },
};
// Supply and support: heals and refits troops in the field for free, hands Gladiators new nets and
// javelins, cheers miners on, restores spent gold deposits and brings the architects materials.
UNIT_TYPES.quartermaster = {
  key: 'quartermaster', name: 'Quartermaster', cost: 200, time: 6, hp: 100, speed: 100, pop: 1,
  dmg: 5, range: 26, atkTime: 1, aggro: 0, hotkey: ',', code: 'Comma', max: 2,
  desc: 'Keeps your side supplied and stays clear of fights. With the troops: patches up the wounded, refits veterans for free and hands Gladiators a new net and javelin. With the workers: cheers miners on (they hurry for a while), restores spent gold deposits, and now and then brings an Architect materials for a free trap. Two at most: then one stays with the troops and the other with the workers.',
};
// A showman who fights alone: a javelin and a net to throw (once each until resupplied), a short
// sword, and he grows stronger with every kill. He never marches in formation.
UNIT_TYPES.gladiator = {
  key: 'gladiator', name: 'Gladiator', cost: 200, time: 5.5, hp: 170, speed: 105, pop: 1,
  dmg: 16, range: 30, atkTime: 0.8, aggro: 320, hotkey: '9', code: 'Digit9',
  desc: 'Throws his javelin (it reaches flyers) and his net (it pins the target down) once each, until he garrisons or a Quartermaster brings new ones. Every kill makes him tougher and hit harder, and he hits harder the fewer friends are around him. He won\'t march in formation: he runs ahead.',
};
// Raises the dead: keeps a pack of zombies at its side, and anyone the zombies kill gets up as one.
UNIT_TYPES.necromancer = {
  key: 'necromancer', name: 'Necromancer', cost: 175, mana: 75, time: 7, hp: 85, speed: 70, pop: 1,
  dmg: 0, range: 240, atkTime: 1.4, aggro: 300, hotkey: '0', code: 'Digit0',
  desc: 'Raises zombies (up to 6, more with upgrades; they don\'t count toward your population) and leads them. Zombies are fast, weak fodder that take half damage from arrows and other shots, and an enemy a zombie kills rises as another. If the Necromancer falls, its zombies just attack.',
};
UNIT_TYPES.zombie = {
  key: 'zombie', name: 'Zombie', cost: 0, time: 0, hp: 60, speed: 108, pop: 0,
  dmg: 8, range: 28, atkTime: 1.1, aggro: 240, summoned: true,
  desc: 'Raised by a Necromancer. Weak, but it runs at its prey, takes half damage from arrows and other shots, and whoever it kills rises as another zombie.',
};
const UNIT_ORDER = ['miner', 'architect', 'quartermaster', 'sword', 'archer', 'spear', 'gladiator', 'cleric', 'warlock', 'necromancer', 'giant', 'ninja', 'flyer', 'ballista', 'golem', 'beastmaster', 'saboteur', 'firebird'];
// Training groups: each group trains one unit at a time from a shared queue (so a Swordwrath
// waits for the Spearton ahead of it), in one building that also holds all its units' upgrades.
// Colors tint the training bar.
const TRAIN_GROUPS = [
  { key: 'workers', name: 'Workers', building: 'Workers\' Lodge', color: '#c9a23a', types: ['miner', 'architect', 'quartermaster'] },
  { key: 'infantry', name: 'Infantry', building: 'Barracks', color: '#c0503a', types: ['sword', 'spear', 'gladiator', 'ninja', 'saboteur'] },
  { key: 'ranged', name: 'Ranged', building: 'Archery Range', color: '#7aa84a', types: ['archer', 'flyer', 'firebird', 'ballista', 'beastmaster'] },
  { key: 'mages', name: 'Mages', building: 'Mage Tower', color: '#9a62d8', types: ['cleric', 'warlock', 'necromancer'] },
  { key: 'giants', name: 'Giants', building: 'Giant Pit', color: '#8f8a80', types: ['giant', 'golem'] },
];
const groupOf = type => TRAIN_GROUPS.find(g => g.types.includes(type));
for (const g of TRAIN_GROUPS) for (const t of g.types) UNIT_TYPES[t].building = g.building;   // one building per class
const isMage = u => u.type === 'cleric' || u.type === 'warlock';
const isGiant = u => u.type === 'giant';
// Kestrels are airborne until Feather Fall drops them to the ground (then they fight with a knife).
const isFlying = u => (u.type === 'flyer' && !u.grounded) || u.type === 'firebird';
// Ninjas count as ranged while throwing stars (u.starRanged is decided each frame).
// Workers (miners and architects) don't fight: they're left out of armies, formations and army strength.
const isWorker = u => u.type === 'miner' || u.type === 'architect' || u.type === 'quartermaster';
const isRanged = u => u.type === 'medusa' || u.type === 'archer' || u.type === 'warlock' || u.type === 'ballista' || u.type === 'beastmaster' || isFlying(u) || (u.type === 'ninja' && !!u.starRanged);
const trainCode = def => def.code || 'Digit' + def.hotkey;
// One building per class inside the castle (the Giant Pit stands outside the gate). Units walk out
// of their class's building; Kestrels and Firebirds take off from the Range and fly low under the
// castle ceiling until they clear the gate.
const GIANT_PIT_X = 655;
const CLASS_X = { infantry: BUILD_X.sword, mages: BUILD_X.spear, ranged: BUILD_X.archer, workers: BUILD_X.miner, giants: GIANT_PIT_X };
const CASTLE_FLY_ALT = 30;     // flyers skim low inside their own castle, under the ceiling
const DOOR_X = {};
for (const g of TRAIN_GROUPS) for (const t of g.types) DOOR_X[t] = CLASS_X[g.key];
Object.assign(DOOR_X, { ballista: 500, zombie: CLASS_X.mages });   // ballistas roll out by the gate

// Ninjas
const NINJA_AMBUSH = 3;           // damage multiplier of the first blow of a fight (or out of stealth)
const NINJA_AMBUSH_GAP = 2.5;     // seconds without striking before the next blow counts as a first blow
const NINJA_VANISH_CD = 5;        // after striking or stopping, seconds before it can vanish again
const NINJA_PIERCE = [0.3, 0.65]; // share of the target's armor ignored: base / Serrated Blades
const PARRY_CD = 6;               // Parry blocks one attack this often...
const PARRY_STUN = 1.5;           // ...and stuns a melee attacker for this long
const STAR = { range: 230, dmg: 11, atkTime: 0.9, confuse: 0.15 };   // Throwing Stars

// Kestrels (flyers)
const FLY_ALT = 78;               // cruising height above the lane
const GROUNDED = { hp: 45, dmg: 6, range: 26, atkTime: 0.9, speed: 70 };   // after Feather Fall: a knife fighter

// Critical hits (archers and ninjas): double damage
const CRIT = { chance: 0.1, upgraded: 0.2, mult: 2 };

// Ballista (Defense Clan): can't shoot closer than minRange; each bolt also hits the next unit
// behind its target for a share of the damage; structures (trenches, statues) take extra.
const BALLISTA = { minRange: 120, pierce: 0.6, structureMul: 2, drawScale: 1.5 };   // drawScale: the engine is drawn bigger than its crewman

// Spirit Golem (Arcane Circle): bigger than a man, stone armor, shrugs off Warlock magic;
// Mana Core heals it slowly.
const GOLEM = { scale: 1.5, armor: 0.1, spellMul: 0.5, regen: 3, hunkerMana: 1 };   // hunkerMana: mana per second while hunkered down

// Beastmaster (Beast Clan): double damage to giants; within auraRange each one counts as this many
// extra troops for a friendly giant's obedience (more with Beast Lore).
const BEASTMASTER = { giantMul: 2, aura: 2, auraLore: 4, auraRange: 280, prodDmg: 2, prodCd: 5, prodTime: 4 };   // prod: a stone that drives a stalled giant into a charge for prodTime seconds

// Saboteur (Shadow Clan): trench damage multiplier (Sappers) and Salt the Mine: seconds spent salting,
// how long the salt lasts (Brine), and the share of dug gold enemy miners keep from a salted deposit.
// Firebird (Sky Clan): fire pot blast radius and burn time (bigger with Pitch Pots), and the faster
// drop rate with Quick Fuse.
const FIREBIRD = { radius: 45, radiusPitch: 65, burn: 3, burnPitch: 5, fuseAtk: 2.2 };
const SABOTEUR = { trenchMul: 3, trenchMulSappers: 5, saltTime: 2.5, saltDur: 30, saltDurBrine: 50, saltKeep: 0.5 };

// Giants
const GIANT_SCALE = 2.1;          // base size; each Protein Diet tier adds 13%
const GIANT_TIER_STEP = { hp: 0.25, dmg: 0.2, size: 0.13 };
const GIANT_SPLASH = 0.5;         // splash damage to the 2 units beside the target
const ARCHER_VS_GIANT = 1.1;      // archers hit giants a little harder...
// ...and a giant pelted hard by projectiles raises an arm across its face for a while: projectiles
// do less damage (dmgMul) but it attacks slower (atkMul). trigger: share of its max hp taken from
// projectiles in quick succession (the tally drains at decay of max hp per second).
const GIANT_GUARD = { trigger: 0.06, decay: 0.02, time: 4, dmgMul: 0.7, atkMul: 1.35 };
// Mages' auras: allies within r of a Cleric take ward less damage; within r of a Warlock they deal
// fury more. Neither stacks (one mage nearby is as good as three).
const MAGE_AURA = { r: 130, ward: 0.15, fury: 0.15 };
const GIANT_CONFUSE = { chance: 0.12, time: 3, cooldown: 8 };   // ...and can confuse them
const BLINDERS_CONFUSE = { chance: 0.4, time: 0.5 };             // Blinders: confused less often, and not for as long
const GIANT_COL_GAP = 70;         // giants are 3 rows wide, so they stand 2 per column; columns are this far apart
const STUN_TIME = 2;              // Stun Club
const STATUE_GIANT_TIER = 4;      // the giant inside a statue is one size past the last diet tier
const GIANT_AIR_TIER = 3;         // giants this big (Protein Diet III, and statue giants) can hit flyers
const STATUE_GIANT_HP_MUL = 1.3;
const STATUE_GIANT_IMMUNE = 3;    // seconds the statue's giant can't be hurt after it bursts out
// its opening blow: a sweep reaching r all round (its reach is longer until it lands), hurling
// everyone knock back and stunning them for stun seconds
const STATUE_SWEEP = { r: 240, reach: 60, knock: 180, stun: 3 };

// Computer opponent difficulty
const AI_LEVELS = {
  easy: { name: 'Easy', desc: 'Clumsy and distractible.' },
  normal: { name: 'Normal', desc: 'Steady economy, sensible army, basic upgrades. Plays a different strategy each game.' },
  hard: { name: 'Hard', desc: 'Researches everything, fields mages and giants, marches in formations, varies its strategy, and starts with a random boost.' },
  veryhard: { name: 'Very Hard', desc: 'Hard, sharper: tougher troops, a bigger hidden income, three random boosts and a head start.' },
};

// Spells. Each Cleric spell has a Warlock twin with identical cost, cooldown, radius and strength.
const SPELL_GCD = 2.5;      // a mage must wait this long between any two casts
const SPELL_RESERVE = 15;   // auto-cast never spends your last bit of mana
const SPELLS = {
  healpool: { name: 'Healing Pool', owner: 'cleric', perk: 'pool', slot: 0, mana: 40, cd: 12, range: 320, r: 75, dur: 5, power: 10, opp: 'blight', desc: 'A pool of light that heals allies standing in it for 10 hp/s over 5s.' },
  blight: { name: 'Blight Pool', owner: 'warlock', perk: 'pool', slot: 0, mana: 40, cd: 12, range: 320, r: 75, dur: 5, power: 10, opp: 'healpool', desc: 'A pool of rot that hurts enemies standing in it for 10 damage/s over 5s.' },
  sanctuary: { name: 'Sanctuary', owner: 'cleric', perk: 'big', slot: 1, mana: 80, cd: 22, range: 320, r: 95, dur: 8, power: 60, opp: 'fireball', desc: 'Every ally in the area gets a shield that absorbs 60 damage for 8s.' },
  fireball: { name: 'Fireball', owner: 'warlock', perk: 'big', slot: 1, mana: 80, cd: 22, range: 320, r: 95, dur: 0, power: 60, opp: 'sanctuary', desc: 'A blazing ball that bursts for 60 damage on every enemy in the area (half to structures).' },
};
// A Cleric's heal also quickens and blesses whoever it heals (faster and harder-hitting), and a
// Warlock's bolt slows and weakens whoever it hits, each for the mage's own attack time.
const MAGE_TOUCH = { speed: 0.25, dmg: 0.25 };
// Hope (Cleric upgrade): allies within a Cleric's range attack faster and take less damage. Fear
// (Warlock upgrade): enemies within a Warlock's range attack slower and take more damage.
const HOPE = { atk: 0.15, dmg: 0.1 };
const spellsOf = type => Object.keys(SPELLS).filter(k => SPELLS[k].owner === type).sort((a, b) => SPELLS[a].slot - SPELLS[b].slot);
const RESEARCH_TYPES = [...UNIT_ORDER, 'castle'];
// The building a class (group key) or unit type trains and researches in; the Arcane Circle's pit is a Golem Forge.
const buildingName = (key, team) => {
  if (key === 'castle') return 'Castle';
  const g = TRAIN_GROUPS.find(x => x.key === key) || groupOf(key);
  return g.key === 'giants' && team && !canTrain(team, 'giant') && canTrain(team, 'golem') ? 'Golem Forge' : g.building;
};

// Upgrades only apply to units trained after the research finishes (veterans can be refitted).
// `team: true` upgrades affect the whole side immediately. `requires` marks a second tier.
const UPGRADES = {
  sword: [
    { key: 'blades', name: 'Forged Blades', cost: 200, mana: 0, time: 25, desc: 'Swordwrath trade their clubs for iron swords. +50% damage.' },
    { key: 'greatsword', name: 'Great Swords', cost: 250, mana: 75, time: 30, requires: 'blades', clans: ['sword'], desc: 'Heavy two-handed blades: damage 18 → 25, but each swing is 10% slower.' },
    { key: 'helm', name: 'Iron Helmets', cost: 175, mana: 0, time: 20, desc: 'Helmets that absorb 25% of incoming damage.' },
    { key: 'leap', name: 'Running Jump', cost: 150, mana: 50, time: 20, desc: 'After a sprint, the first strike is a leaping blow that deals double damage.' },
    { key: 'rage', name: 'Adrenaline', cost: 150, mana: 75, time: 25, desc: 'The more wounded they are, the faster and harder they hit.' },
    { key: 'rage2', name: 'Last Stand', cost: 175, mana: 100, time: 30, requires: 'rage', desc: `When struck down they keep fighting at full fury for ${LAST_STAND} more seconds, then fall.` },
    { key: 'drill', name: 'Military Training', cost: 175, mana: 50, time: 25, desc: '+4% damage and +3% damage reduction for each nearby ally, up to 5. Also unlocks Defend Trench.' },
  ],
  miner: [
    { key: 'bag', name: 'Bigger Bags', cost: 150, mana: 0, time: 20, desc: 'Carry 35 → 56 gold per trip.' },
    { key: 'bag2', name: 'Ox-hide Sacks', cost: 200, mana: 25, time: 25, requires: 'bag', desc: 'Carry 56 → 80 gold per trip.' },
    { key: 'mule', name: 'Mule Packs', cost: 250, mana: 50, time: 30, requires: 'bag2', clans: ['mercenary'], desc: 'Carry 80 → 100 gold per trip.' },
    { key: 'pick', name: 'Steel Pickaxes', cost: 200, mana: 0, time: 25, desc: 'Swing faster and dig 7 → 11 gold per swing.' },
    { key: 'pick2', name: 'Tempered Picks', cost: 250, mana: 25, time: 30, requires: 'pick', desc: 'Swing faster still and dig 11 → 14 gold per swing.' },
    { key: 'diamond', name: 'Diamond Picks', cost: 300, mana: 50, time: 35, requires: 'pick2', clans: ['mercenary'], desc: 'Swing faster again and dig 14 → 17 gold per swing.' },
    { key: 'devout', name: 'Devout', cost: 100, mana: 25, time: 20, desc: 'Prayers yield 50% more mana.' },
    { key: 'devout2', name: 'Zealous Faith', cost: 175, mana: 50, time: 25, requires: 'devout', desc: 'Prayers yield double mana.' },
    { key: 'pan1', name: 'Iron Pans', cost: 150, mana: 0, time: 20, desc: 'Pan the castle stream 35% faster.' },
    { key: 'pan2', name: 'Sluice Boxes', cost: 225, mana: 50, time: 25, requires: 'pan1', desc: 'Pan the castle stream 75% faster than plain pans.' },
  ],
  architect: [
    { key: 'walls', name: 'Earthworks', cost: 175, mana: 50, time: 25, team: true, desc: `Architects can dig defensive trenches behind an earth rampart (B). ${WALL_COST} gold each, up to ${WALL_MAX}.` },
    { key: 'walls2', name: 'Palisade', cost: 200, mana: 50, time: 25, team: true, requires: 'walls', desc: `Architects can raise a sharpened log palisade on a finished trench (J or right-click it) for ${WALL_COST} gold: taller, +${WALL_HP2} hp.` },
    { key: 'tower2', name: 'Reinforced Towers', cost: 175, mana: 25, time: 25, team: true, desc: 'Archer towers (built after this, and every one standing) get iron bracing: 60% more health.' },
    { key: 'tower3', name: 'Watchtowers', cost: 225, mana: 50, time: 30, team: true, requires: 'tower2', desc: 'Taller towers: an archer posted in one reaches 60 further still.' },
    { key: 'traps2', name: 'Trapmaker', cost: 150, mana: 25, time: 25, team: true, desc: 'Traps cost a third less and are ready again in half the time.' },
  ],
  archer: [
    { key: 'bow', name: 'Recurve Bows', cost: 175, mana: 0, time: 20, desc: 'Range 380 → 500. Castle archers reach just as much further.' },
    { key: 'longbow', name: 'Longbows', cost: 250, mana: 50, time: 30, requires: 'bow', clans: ['archer'], desc: 'Range 500 → 600: out-shoots enemy castle archers. Your castle archers reach further too.' },
    { key: 'arrows', name: 'Bodkin Arrows', cost: 175, mana: 0, time: 20, desc: 'Arrow damage 24 → 32, and the bodkin points ignore a third of the target’s armor.' },
    { key: 'fire', name: 'Flaming Arrows', cost: 225, mana: 75, time: 30, requires: 'arrows', desc: `Arrows set targets alight: ${BURN_DPS} damage per second for ${BURN_TIME}s on top of the hit.` },
    { key: 'broadheads', name: 'Broadheads', cost: 225, mana: 50, time: 25, requires: 'arrows', clans: ['archer'], desc: 'Arrow damage 32 → 40.' },
    { key: 'quiver', name: 'Deep Quivers', cost: 150, mana: 50, time: 20, desc: 'Reload 30% faster.' },
    { key: 'eye', name: 'Eagle Eye', cost: 175, mana: 50, time: 25, desc: `Critical hit chance ${CRIT.chance * 100}% → ${CRIT.upgraded * 100}%. A critical hit does double damage.` },
    { key: 'steady', name: 'Steady Hands', cost: 200, mana: 50, time: 25, requires: 'quiver', clans: ['archer'], desc: 'Reload another 15% faster.' },
  ],
  ninja: [
    { key: 'serrated', name: 'Serrated Blades', cost: 175, mana: 0, time: 20, desc: `Cuts through more armor: ignores ${NINJA_PIERCE[1] * 100}% of it instead of ${NINJA_PIERCE[0] * 100}%.` },
    { key: 'parry', name: 'Parry', cost: 200, mana: 50, time: 25, desc: `Every ${PARRY_CD}s, the ninja blocks one attack completely. A melee attacker it parries is stunned for ${PARRY_STUN}s.` },
    { key: 'focus', name: 'Focus', cost: 150, mana: 50, time: 20, desc: 'Ignores taunts: shield walls no longer draw its attacks.' },
    { key: 'stars', name: 'Throwing Stars', cost: 225, mana: 75, time: 30, desc: `Throws stars from range (${STAR.range}, ${STAR.dmg} damage), which can hit Kestrels and disorient giants. Switch between stars and blade with M, or leave it on Auto.` },
    { key: 'vital', name: 'Vital Points', cost: 175, mana: 50, time: 25, desc: `Critical hit chance ${CRIT.chance * 100}% → ${CRIT.upgraded * 100}%. A critical hit does double damage.` },
  ],
  flyer: [
    { key: 'feather', name: 'Feather Fall', cost: 175, mana: 50, time: 25, desc: `When shot down, the Kestrel glides to the ground and fights on with a knife (${GROUNDED.hp} hp, weak). On the ground anyone can hit it.` },
    { key: 'scope', name: 'Long Sights', cost: 175, mana: 0, time: 20, desc: 'Range 300 → 400.' },
    { key: 'scope2', name: 'Spyglass', cost: 225, mana: 50, time: 25, requires: 'scope', clans: ['archer', 'sky'], desc: 'Range 400 → 480.' },
    { key: 'winch', name: 'Crank Winch', cost: 150, mana: 50, time: 20, desc: 'Reload 30% faster.' },
    { key: 'barbs', name: 'Barbed Bolts', cost: 175, mana: 0, time: 20, desc: 'Bolt damage 15 → 21.' },
    { key: 'barbs2', name: 'Barbed Bolts II', cost: 225, mana: 50, time: 25, requires: 'barbs', clans: ['sky'], desc: 'Bolt damage 21 → 26.' },
    { key: 'hawkeye', name: 'Hawk Eye', cost: 175, mana: 50, time: 25, clans: ['sky'], desc: `Kestrel critical hit chance ${CRIT.chance * 100}% → ${CRIT.upgraded * 100}%.` },
  ],
  ballista: [
    { key: 'torsion', name: 'Torsion Springs', cost: 200, mana: 50, time: 25, desc: 'Range 550 → 650.' },
    { key: 'ironbolt', name: 'Iron-tipped Bolts', cost: 225, mana: 50, time: 25, desc: 'Bolt damage 45 → 60.' },
    { key: 'mantlet', name: 'Mantlet', cost: 175, mana: 25, time: 20, desc: 'A timber shield for the crew: +60 hp and 20% armor.' },
  ],
  golem: [
    { key: 'plating', name: 'Runic Plating', cost: 200, mana: 75, time: 25, desc: 'Rune-etched plates: +20% armor.' },
    { key: 'core', name: 'Mana Core', cost: 175, mana: 100, time: 25, desc: `A glowing core in its chest that slowly mends it: +${GOLEM.regen} hp per second.` },
  ],
  beastmaster: [
    { key: 'stones', name: 'Heavy Stones', cost: 175, mana: 0, time: 20, desc: 'Sling damage 14 → 20.' },
    { key: 'lore', name: 'Beast Lore', cost: 175, mana: 50, time: 25, desc: `Each Beastmaster counts as ${BEASTMASTER.auraLore} extra troops for nearby giants' obedience instead of ${BEASTMASTER.aura}.` },
  ],
  saboteur: [
    { key: 'sappers', name: "Sappers' Picks", cost: 175, mana: 25, time: 20, desc: `Trench damage ${SABOTEUR.trenchMul}× → ${SABOTEUR.trenchMulSappers}×.` },
    { key: 'brine', name: 'Brine', cost: 150, mana: 50, time: 20, desc: `Salted deposits stay spoiled for ${SABOTEUR.saltDurBrine}s instead of ${SABOTEUR.saltDur}s.` },
  ],
  firebird: [
    { key: 'pitch', name: 'Pitch Pots', cost: 200, mana: 75, time: 25, desc: `Fire pots burst wider (radius ${FIREBIRD.radius} → ${FIREBIRD.radiusPitch}) and burn longer (${FIREBIRD.burn}s → ${FIREBIRD.burnPitch}s).` },
    { key: 'fuse', name: 'Quick Fuse', cost: 175, mana: 50, time: 20, desc: `Drops a pot every ${FIREBIRD.fuseAtk}s instead of every 3s.` },
  ],
  spear: [
    { key: 'shield', name: 'Shields', cost: 175, mana: 0, time: 20, desc: '+20% armor and +40 hp, and unlocks Shield Wall (X): they stop attacking, take 60% less damage and draw enemy attacks.' },
    { key: 'shield2', name: 'Tower Shields', cost: 200, mana: 50, time: 25, requires: 'shield', desc: '+10% more armor and +40 hp; Shield Wall blocks 75% and draws attackers even harder.' },
    { key: 'helm', name: 'Crested Helmets', cost: 150, mana: 0, time: 20, desc: '+15% armor.' },
    { key: 'inspire', name: 'Rallying Cry', cost: 200, mana: 100, time: 30, desc: 'Inspires up to 8 nearby allies: +10% damage and 8% faster attacks per stack, up to 3 stacks. Every ally nearby gets one stack before anyone gets a second. Also unlocks Defend Trench.' },
    { key: 'halberd', name: 'Halberds', cost: 200, mana: 50, time: 25, desc: 'Armor piercing: ignores enemy armor and halves shield wall protection. Damage 18 → 28.' },
  ],
  // Castle upgrades are bought from the castle itself (click the rampart/tower or the castle button).
  // Mirrored mage research: each pair costs exactly the same.
  cleric: [
    { key: 'focus', name: 'Blessed Staff', cost: 150, mana: 50, time: 20, desc: 'Staff heals 20 → 28.' },
    { key: 'focus2', name: 'Saint\'s Staff', cost: 225, mana: 75, time: 30, requires: 'focus', desc: 'Staff heals 28 → 36 and reaches 40 further.' },
    { key: 'pool', name: 'Healing Pool', cost: 175, mana: 75, time: 25, desc: 'Unlocks the Healing Pool spell (40 mana). ' + SPELLS.healpool.desc },
    { key: 'big', name: 'Sanctuary', cost: 250, mana: 125, time: 35, desc: 'Unlocks the Sanctuary spell (80 mana). ' + SPELLS.sanctuary.desc },
    { key: 'hope', name: 'Hope', cost: 200, mana: 75, time: 25, desc: `Allies within a Cleric's range attack ${HOPE.atk * 100}% faster and take ${HOPE.dmg * 100}% less damage (one stack).` },
  ],
  warlock: [
    { key: 'focus', name: 'Cursed Staff', cost: 150, mana: 50, time: 20, desc: 'Bolt damage 20 → 28.' },
    { key: 'focus2', name: 'Bone Staff', cost: 225, mana: 75, time: 30, requires: 'focus', desc: 'Bolt damage 28 → 36, and it reaches 40 further.' },
    { key: 'pool', name: 'Blight Pool', cost: 175, mana: 75, time: 25, desc: 'Unlocks the Blight Pool spell (40 mana). ' + SPELLS.blight.desc },
    { key: 'big', name: 'Fireball', cost: 250, mana: 125, time: 35, desc: 'Unlocks the Fireball spell (80 mana). ' + SPELLS.fireball.desc },
    { key: 'fear', name: 'Fear', cost: 200, mana: 75, time: 25, desc: `Enemies within a Warlock's range attack ${HOPE.atk * 100}% slower and take ${HOPE.dmg * 100}% more damage (one stack).` },
  ],
  quartermaster: [
    { key: 'salves', name: 'Healing Salves', cost: 150, mana: 25, time: 20, desc: `Quartermasters' bandages heal ${QM.heal} → ${QM.healSalves}.` },
    { key: 'wagon', name: 'Supply Wagon', cost: 175, mana: 25, time: 25, desc: `Materials for a free trap every ${QM.materialsWagon}s instead of every ${QM.materialsCd}s.` },
  ],
  gladiator: [
    { key: 'manica', name: 'Manica', cost: 150, mana: 25, time: 20, desc: `An armored sleeve and greave: Gladiators take ${GLADIATOR.manica * 100}% less damage.` },
    { key: 'nets', name: 'Weighted Nets', cost: 150, mana: 50, time: 20, desc: `Nets pin their target for ${GLADIATOR.netTimeWeighted}s instead of ${GLADIATOR.netTime}s.` },
    { key: 'fame', name: 'Crowd Favorite', cost: 200, mana: 75, time: 25, desc: 'Each kill counts twice toward a Gladiator\'s growing strength.' },
  ],
  necromancer: [
    { key: 'horde', name: 'Bigger Horde', cost: 200, mana: 75, time: 25, desc: `Each Necromancer keeps up to ${NECRO.max + 2} zombies.` },
    { key: 'horde2', name: 'Endless Horde', cost: 300, mana: 125, time: 35, requires: 'horde', desc: `Each Necromancer keeps up to ${NECRO.max + 4} zombies.` },
    { key: 'grave', name: 'Grave Dirt', cost: 175, mana: 75, time: 25, desc: `Zombies rise with ${Math.round((NECRO.graveHp - 1) * 100)}% more health.` },
    { key: 'rites', name: 'Quick Rites', cost: 175, mana: 75, time: 25, desc: `A zombie rises every ${NECRO.rites}s instead of every ${NECRO.summonCd}s.` },
    { key: 'hulk', name: 'Hulking Dead', cost: 250, mana: 100, time: 35, desc: `Every ${HULK.every}th zombie a Necromancer raises is a Hulk: a huge, slow brute with ${HULK.hp}× health and double damage.` },
  ],
  zombie: [],
  giant: [
    { key: 'blinders', name: 'Blinders', cost: 200, mana: 50, time: 25, desc: 'Leather blinders: giants obey much better, are confused by archers far less often and for less time, and you can select them to give move and hold orders.' },
    { key: 'stun', name: 'Stun Club', cost: 250, mana: 75, time: 30, desc: `When a giant strikes a non-giant, the target is knocked back and stunned for ${STUN_TIME}s.` },
    { key: 'protein', name: 'Protein Diet', cost: 200, mana: 50, time: 25, desc: 'Giants grow bigger: +25% hp, +20% damage, larger reach.' },
    { key: 'protein2', name: 'Protein Diet II', cost: 300, mana: 75, time: 30, requires: 'protein', desc: 'Even bigger: another +25% hp and +20% damage.' },
    { key: 'protein3', name: 'Protein Diet III', cost: 400, mana: 100, time: 35, requires: 'protein2', desc: 'Enormous: another +25% hp and +20% damage.' },
  ],
  castle: [
    { key: 'tithe', name: 'Statue Offerings', cost: 200, mana: 25, time: 25, team: true, desc: `Your statue earns ${TITHE_GOLD[1]} gold per second.` },
    { key: 'tithe2', name: 'Golden Idol', cost: 300, mana: 75, time: 35, team: true, requires: 'tithe', desc: `Statue income rises to ${TITHE_GOLD[2]} gold per second.` },
    { key: 'gilded', name: 'Gilded Statue', cost: 400, mana: 100, time: 40, team: true, requires: 'tithe2', clans: ['mercenary'], desc: `Statue income rises to ${TITHE_GOLD[3]} gold per second.` },
    { key: 'archer2', name: 'Second Castle Archer', cost: 200, mana: 50, time: 25, team: true, desc: 'Posts another archer on the rampart. Castle archers always use your researched archer upgrades.' },
    { key: 'archer3', name: 'Third Castle Archer', cost: 300, mana: 100, time: 30, team: true, requires: 'archer2', desc: 'Posts a third archer on the rampart.' },
    { key: 'archer4', name: 'Fourth Castle Archer', cost: 400, mana: 150, time: 35, team: true, requires: 'archer3', desc: 'Posts a fourth archer on the rampart (clans with 4 castle archer slots only).' },
    { key: 'sifter', name: 'Sifter', cost: 200, mana: 25, time: 25, team: true, desc: `A wooden sluice set in the castle stream: panning miners get ${SIFTER_GOLD} gold a tick instead of 1 (their mana is unchanged).` },
    { key: 'levy', name: 'Levy', cost: 300, mana: 100, time: 35, team: true, desc: `A free Swordwrath marches out of the Barracks every ${LEVY_INTERVAL} seconds (if you have room in your population).` },
    { key: 'levy2', name: 'Levy II', cost: 450, mana: 150, time: 40, team: true, requires: 'levy', clans: ['defense'], desc: `A free Spearton also marches out of the Barracks every ${LEVY_INTERVAL} seconds (if you have room in your population).` },
  ],
};

// Map layouts: besides its looks, each map rolls a lane depth, a gold layout and maybe a shrine.
const LANE_DEPTHS = [
  { key: 'narrow', name: 'Narrow pass', bot: 596, weight: 1 },   // tight ranks: splash and fireballs hit more
  { key: 'normal', name: 'Open road', bot: 616, weight: 2 },
  { key: 'wide', name: 'Broad field', bot: 640, weight: 1 },    // room to spread out
];
// first: distance of the first mine from each world edge; gap: spacing; n: mines per side;
// rich: gold multiplier; center: chance of a rich mine in the middle (never with a shrine)
const MINE_LAYOUTS = {
  classic: { name: 'Scattered gold', first: [1080, 1180], gap: [220, 360], n: [3, 4], rich: 1, center: 0.65, weight: 3 },
  homeland: { name: 'Gold close to home', first: [960, 1020], gap: [150, 210], n: [3, 4], rich: 0.8, center: 0, weight: 1 },
  frontier: { name: 'Contested frontier', first: [1350, 1450], gap: [260, 340], n: [3, 3], rich: 1.25, center: 0.4, weight: 1 },
  scarce: { name: 'Scarce, rich veins', first: [1100, 1200], gap: [380, 480], n: [2, 2], rich: 1.8, center: 1, weight: 1 },
};
// The Shrine stands in the middle of some maps. Hold the ground around it to own it.
// How much gold the deposits hold (chosen in the skirmish setup, or rolled by the seed).
const GOLD_LEVELS = [
  { key: 'scarce', name: 'Scarce gold', mul: 0.6, weight: 1 },
  { key: 'normal', name: 'Normal gold', mul: 1, weight: 2 },
  { key: 'rich', name: 'Rich gold', mul: 1.6, weight: 1 },
];
// The Monolith (called the Shrine in the code) stands in the middle of some maps.
const SHRINE = {
  chance: 0.4, radius: 170, capTime: 8,    // seconds for one uncontested unit (more units capture faster, up to 3x)
  gold: 1.5, mana: 0.75,                    // income per second for the owner
};

const TEAM_STYLE = [
  { name: 'Order', body: '#161514', accent: '#c49a2c', accent2: '#e9d7a0', crystal: '#58c3e8', ui: '#c49a2c', statue: '#b8a27a' },
  { name: 'Chaos', body: '#1c0e0e', accent: '#a82a24', accent2: '#ff5a44', crystal: '#b066e8', ui: '#c0432f', statue: '#686268' },
  { name: 'Neutral', body: '#24221e', accent: '#8a847a', accent2: '#c8c2b4', crystal: '#cfc6b0', ui: '#9a948a', statue: '#8a847a' },   // the Monolith tower's own archers
];

const THEMES = [
  {
    name: 'Amber Dusk', sky: ['#2e2440', '#f2a65a'], sun: '#ffd27a', hills: ['#a0697a', '#6e4a5e', '#463243'],
    haze: '#f2a65a', ground: ['#6a5440', '#3b2e25'], path: '#8a6c4e', grass: '#7a7240', rock: '#7b6e66',
    prop: '#2e2420', weather: 'embers', cloud: '#f7c9a0', shade: 0.3,
  },
  {
    name: 'Sunbaked Desert', sky: ['#6fa8d6', '#f5e2b8'], sun: '#fff6d8', hills: ['#e2c495', '#c99d68', '#a57945'],
    haze: '#f5e2b8', ground: ['#c49660', '#86613a'], path: '#d8b07a', grass: '#a49450', rock: '#a58e74',
    prop: '#4a3826', weather: 'dust', cloud: '#ffffff', shade: 0.12,
  },
  {
    name: 'Grey Highlands', sky: ['#5f6f7d', '#c8d0cc'], sun: '#eef2f0', hills: ['#97a39a', '#71806f', '#4f5d4c'],
    haze: '#c8d0cc', ground: ['#5d6e46', '#34402a'], path: '#7e7656', grass: '#86a05a', rock: '#848a86',
    prop: '#252b22', weather: 'leaves', cloud: '#e6ebe8', shade: 0.24,
  },
  {
    name: 'Ashen Wastes', sky: ['#1f1717', '#b25a3c'], sun: '#ff8a4a', hills: ['#6b3d33', '#4a2b26', '#2e1b19'],
    haze: '#b25a3c', ground: ['#4d3c34', '#231a16'], path: '#6a5246', grass: '#5e4c32', rock: '#5d524e',
    prop: '#1a1312', weather: 'embers', cloud: '#8c5a4a', shade: 0.4,
  },
  {
    name: 'Frostfall', sky: ['#8fb0d4', '#eaf0f6'], sun: '#ffffff', hills: ['#cbd8e6', '#a5b8cc', '#7d92a9'],
    haze: '#eaf0f6', ground: ['#e4ebf1', '#a3b2c2'], path: '#c5ced8', grass: '#9fb0bf', rock: '#8d99a6',
    prop: '#3b4652', weather: 'snow', cloud: '#ffffff', shade: 0.16,
  },
  {
    name: 'Verdant Morning', sky: ['#79b3e0', '#f6e9c6'], sun: '#fff3c4', hills: ['#9cc2a0', '#6f9d77', '#4c7a55'],
    haze: '#f6e9c6', ground: ['#5f8a3e', '#355224'], path: '#9a8558', grass: '#7fb04c', rock: '#8a8a80',
    prop: '#26351d', weather: 'leaves', cloud: '#ffffff', shade: 0.12,
  },
];

const MAP_PRE = ['Bonefield', 'Hollow', 'Crag', 'Ember', "Widow's", 'Kingsfall', 'Rustwind', 'Gloam', 'Sunder', 'Iron', 'Thornback'];
const MAP_SUF = ['Pass', 'Ridge', 'Flats', 'Reach', 'Gorge', 'Vale', 'Steppe', 'Crossing', 'Hollow', 'March'];
