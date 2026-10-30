'use strict';
// The tutorial: a ladder of lessons, each a battle against a simple scripted opponent that shows
// off one kind of unit (and what beats it). Winning a lesson unlocks the next, and usually the
// enemy's unit for you. After the basics comes a full game (the only lesson where a giant waits
// inside each statue), then a trial against every clan.
//
// A lesson is played as two made-up clans (CLANS.tut_p for you, CLANS.tut_e for the enemy), so the
// usual clan rules lock the units and upgrades that aren't unlocked yet. Each lesson's opponent is
// a LessonAI: an economy, a unit mix, attack waves and a gimmick of its own.

const TUT_STORE = 'stickfront.tutorial';
const TUT = (() => {
  try { return { done: [], ...JSON.parse(localStorage.getItem(TUT_STORE) || '{}') }; } catch (e) { return { done: [] }; }
})();
const saveTut = () => { try { localStorage.setItem(TUT_STORE, JSON.stringify(TUT)); } catch (e) { /* storage unavailable */ } };
const lessonDone = key => TUT.done.includes(key);

// Units anyone can train (clan-only units stay with their clans; zombies are raised).
const TRAINABLE = UNIT_ORDER.filter(t => !UNIT_TYPES[t].summoned && !UNIT_TYPES[t].clans);
const NO_UPGRADES = () => Object.fromEntries(RESEARCH_TYPES.map(t => [t, UPGRADES[t].map(d => d.key)]));
const TUT_START = ['miner', 'sword'];

// ---------------------------------------------------------------- the lessons
//
// Fields: key, name, sub (one line), brief (paragraphs before the battle), counters (what beats
// what), unlocks (unit types you get for winning), give (types you can train in this lesson only),
// upgrades (you can research), player / enemy ({ army, gold, free, hp, dmg }), enemyUnits, ai
// (LessonAI settings), tips ([{ text, next(s) }]: the lesson box steps through them), smart (the
// regular Normal computer instead of a LessonAI), clan (the enemy's real clan), statueGiant.

const LESSONS = [
  {
    key: 'basics', name: 'First Blood', sub: 'Miners, Swordwrath and your first attack',
    brief: [
      'Gold pays for everything, and miners dig it. Swordwrath are cheap, quick fighters.',
      'Your opponent has exactly what you have. Build your economy, beat back its attack, then march on its statue.',
    ],
    counters: ['More miners early means a bigger army later', 'Fight near your own statue: your castle archers join in'],
    enemyUnits: ['miner', 'sword'],
    player: { gold: 300, army: [{ type: 'miner', n: 2 }, { type: 'sword', n: 2 }] },
    enemy: { gold: 150, army: [{ type: 'miner', n: 2 }, { type: 'sword', n: 1 }], hp: { troops: 0.9 } },
    ai: { miners: 3, mix: { sword: 1 }, pace: 6, attackAt: 4, grow: 2, retreatAt: 0.34, formation: 'charge' },
    tips: [
      { text: 'Miners dig gold on their own. Train two more: click the miner button bottom-left, or press <kbd>1</kbd>.', next: s => s.my('miner') >= 4 },
      { text: 'Now train Swordwrath (<kbd>2</kbd>). New soldiers stand on your <b>defend line</b>, in front of your statue.', next: s => s.my('sword') >= 4 },
      { text: 'Drag a box to select units, then right-click to move them or to attack something. <kbd>Q</kbd> / <kbd>W</kbd> / <kbd>E</kbd> order the whole army to Garrison, Defend or Attack.', secs: 16 },
      { text: 'Keep training. The enemy will attack once it has a few Swordwrath. Hold your line with <kbd>W</kbd>: near your statue, your castle archers fight with you.', next: s => s.ai.attacks >= 1 },
      { text: 'Here they come! Stay on the defend line and let them come to you.', next: s => s.ai.mode === 'hold' && s.ai.attacks >= 1 },
      { text: 'Their attack broke. Counterattack with <kbd>E</kbd>, or select your soldiers and press <kbd>Shift</kbd>+<kbd>C</kbd> to <b>Advance</b> in step, a formation that arrives together.', secs: 20 },
      { text: 'Destroy the enemy statue to win. Hurt soldiers can retreat (<kbd>Q</kbd>): they heal inside the castle.' },
    ],
  },
  {
    key: 'archers', name: 'Arrow Rain', sub: 'Archers, and upgrades',
    brief: [
      'This enemy fields nothing but archers. They form a firing line in front of their statue and shoot anything that comes in range.',
      'Archers hit hard from far away but are helpless up close. You can research <b>upgrades</b> now: the ⚒ on a training button opens them.',
    ],
    counters: ['Swordwrath beat archers up close: close the distance fast', 'Charge together: one soldier at a time gets shot to pieces', 'Iron Helmets and Forged Blades help a lot'],
    unlocks: ['archer'], upgrades: true,
    enemyUnits: ['miner', 'archer'],
    player: { gold: 400, army: [{ type: 'miner', n: 3 }, { type: 'sword', n: 3 }] },
    enemy: { gold: 200, army: [{ type: 'miner', n: 2 }, { type: 'archer', n: 2 }] },
    ai: { miners: 4, mix: { archer: 1 }, pace: 4, attackAt: 7, grow: 2, retreatAt: 0.4, formation: 'advance', line: 0.66 },
    tips: [
      { text: 'Open the Swordwrath upgrades: click the ⚒ on its training button (or press <kbd>U</kbd>). <b>Forged Blades</b> and <b>Iron Helmets</b> are great buys.', next: s => s.researched() >= 1 },
      { text: 'Miners have upgrades too: <b>Bigger Bags</b> and <b>Steel Pickaxes</b> pay for themselves.', secs: 14 },
      { text: 'Their archers stand in a firing line ahead of their statue. Walking at them slowly gets your soldiers shot: gather a group, then send them all at once with <kbd>E</kbd>.', next: s => s.my('sword') >= 6 },
      { text: 'Archers have little health. Once your Swordwrath reach the line, it melts.', secs: 20 },
      { text: 'When they march at you, wait on your defend line: your castle archers pick them off as they come.' },
    ],
  },
  {
    key: 'phalanx', name: 'The Phalanx', sub: 'Spearton shield walls and lone Gladiators',
    brief: [
      'Speartons march in a tight line behind their shields: slow, tough, and deadly up front. Gladiators don\'t keep step: they run ahead alone, throw a net and a javelin, and grow stronger with every kill.',
      'You have archers now. Put them behind your Swordwrath.',
    ],
    counters: ['Gang up on a Gladiator while it\'s alone, before it snowballs', 'Archers behind a line of Swordwrath wear down slow Speartons', 'Advance (Shift+C) ranks melee in front and archers behind'],
    unlocks: ['spear', 'gladiator'], upgrades: true,
    enemyUnits: ['miner', 'spear', 'gladiator'],
    player: { gold: 400, army: [{ type: 'miner', n: 3 }, { type: 'sword', n: 2 }, { type: 'archer', n: 2 }] },
    enemy: { gold: 250, free: { spear: ['shield'] }, army: [{ type: 'miner', n: 3 }, { type: 'spear', n: 2 }] },
    ai: { miners: 4, mix: { spear: 3, gladiator: 1 }, pace: 4, attackAt: 5, grow: 2, retreatAt: 0.34, formation: 'advance', shieldWall: true },
    tips: [
      { text: 'Train archers (<kbd>3</kbd>). They out-range everything the enemy has.', next: s => s.my('archer') >= 4 },
      { text: 'Their Gladiators charge ahead of the Speartons. Focus them: select your army and right-click the Gladiator.', next: s => s.ai.attacks >= 1 },
      { text: 'The spear wall is slow. Let your archers shoot it as it walks in, with your Swordwrath in front of them.', secs: 20 },
      { text: 'To attack, select everyone and press <kbd>Shift</kbd>+<kbd>C</kbd>: your army <b>advances</b> in formation, melee in front and archers behind.', secs: 20 },
      { text: 'Archer upgrades like <b>Bodkin Arrows</b> and <b>Recurve Bows</b> make the difference.' },
    ],
  },
  {
    key: 'siege', name: 'Hold the Line', sub: 'Architects, traps and the Quartermaster',
    brief: [
      'The enemy is sending wave after wave. You can\'t out-fight them in the open, so dig in.',
      'Your <b>Architect</b> digs trenches, lays tar pits and mines, raises archer towers and repairs them. Your <b>Quartermaster</b> patches up the wounded and refits veterans for free.',
      'Survive five waves and their army is spent. Then finish them.',
    ],
    counters: ['Trenches stop enemies on foot until they hack through', 'Tar pits slow, mines blast', 'Archers in a tower reach further and are hard to hit'],
    unlocks: ['architect', 'quartermaster'], give: ['architect', 'quartermaster'], upgrades: true,
    enemyUnits: ['sword', 'spear', 'gladiator', 'archer'],
    player: { gold: 650, free: { architect: ['walls'] }, army: [{ type: 'miner', n: 4 }, { type: 'sword', n: 2 }, { type: 'archer', n: 2 }, { type: 'architect', n: 1 }, { type: 'quartermaster', n: 1 }] },
    enemy: { gold: 0, army: [{ type: 'spear', n: 3 }, { type: 'archer', n: 2 }] },   // a home guard: the waves are what attack
    ai: { miners: 0, mix: {}, pace: 1, attackAt: 99, waves: { first: 70, every: 50, list: [
      { sword: 3 }, { sword: 3, spear: 1 }, { sword: 4, spear: 2 }, { sword: 4, spear: 2, gladiator: 1 }, { sword: 5, spear: 3, gladiator: 1 },
    ] } },
    tips: [
      { text: 'Select your Architect. Press <kbd>B</kbd> and click in front of your army to dig a <b>trench</b>.', next: s => G.walls.some(w => w.team === 0) },
      { text: 'Lay traps ahead of the trench: <b>tar pit</b> (<kbd>Shift</kbd>+<kbd>B</kbd>) and <b>mine</b> (<kbd>Shift</kbd>+<kbd>N</kbd>).', next: s => G.traps.filter(t => t.team === 0).length >= 2 },
      { text: 'Raise an <b>archer tower</b> behind the trench (<kbd>Shift</kbd>+<kbd>Y</kbd>), then right-click it with an archer to post it.', next: s => G.towers.some(t => t.team === 0 && t.progress >= 1) },
      { text: 'Put your melee on the trench: select them and press <kbd>K</kbd> (Defend trench). Enemies have to stop and hack at it.', secs: 18 },
      { text: 'Your <b>Quartermaster</b> works on its own: it bandages the wounded and refits veterans with new upgrades for free.', secs: 16 },
      { text: 'Between waves, the Architect repairs damage (<kbd>Y</kbd>) and rebuilds ruins.', next: s => s.ai.wave >= 5 && s.ai.waveLeft() === 0 },
      { text: 'Their army is spent. Go and destroy the statue!' },
    ],
  },
  {
    key: 'shadows', name: 'Night Raid', sub: 'Ninjas, and protecting your miners',
    brief: [
      'Ninjas vanish while they move and appear only when they strike. This enemy sends them after your miners while its Swordwrath guard home.',
      'Spearton, Gladiators, Architects and the Quartermaster are yours now.',
    ],
    counters: ['Keep soldiers near your miners', 'Siege mode (Shift+Z) pulls miners into the castle when raiders come', 'A ninja that strikes is revealed: hit back at once'],
    unlocks: ['ninja'], upgrades: true,
    enemyUnits: ['miner', 'sword', 'ninja'],
    player: { gold: 450, army: [{ type: 'miner', n: 5 }, { type: 'sword', n: 2 }, { type: 'archer', n: 2 }] },
    enemy: { gold: 300, army: [{ type: 'miner', n: 3 }, { type: 'ninja', n: 2 }, { type: 'sword', n: 2 }] },
    ai: { miners: 4, stipend: 1.5, mix: { ninja: 2, sword: 1 }, pace: 4, attackAt: 8, grow: 2, retreatAt: 0.34, formation: 'charge', raids: { size: 2, every: 35 } },
    tips: [
      { text: 'Their ninjas will come for your miners. Keep a few soldiers standing by the gold: select them and right-click near the miners.', next: s => s.ai.raids >= 1 },
      { text: 'Raiders! Turn on <b>Siege mode</b> (<kbd>Shift</kbd>+<kbd>Z</kbd>): miners take shelter in the castle when enemies they can\'t handle come near, then go back to work.', secs: 18 },
      { text: 'A vanished ninja shows the moment it strikes. Archers and castle archers cut them down fast.', secs: 18 },
      { text: 'Every ninja they send at your miners isn\'t defending their statue. When their raids run dry, attack.' },
    ],
  },
  {
    key: 'mages', name: 'Holy and Unholy', sub: 'Clerics and Warlocks',
    brief: [
      'Clerics heal and shield their side; Warlocks curse, poison and hurl Fireballs. This enemy marches a line of Swordwrath and Speartons with mages close behind.',
      'You have ninjas now: they leap over a line to reach whoever is behind it.',
    ],
    counters: ['Kill the mages first: they\'re fragile', 'Ninjas and archers reach the back line', 'Spread out when a Fireball\'s target ring appears'],
    unlocks: ['cleric', 'warlock'], upgrades: true,
    enemyUnits: ['miner', 'sword', 'spear', 'cleric', 'warlock'],
    player: { gold: 500, army: [{ type: 'miner', n: 5 }, { type: 'sword', n: 2 }, { type: 'archer', n: 2 }, { type: 'ninja', n: 1 }] },
    enemy: { gold: 300, mana: 100, army: [{ type: 'miner', n: 4 }, { type: 'sword', n: 2 }, { type: 'cleric', n: 1 }] },
    ai: { miners: 5, pray: 1, mix: { sword: 2, spear: 2, cleric: 1, warlock: 1 }, pace: 4, attackAt: 7, grow: 2, retreatAt: 0.34, formation: 'advance' },
    tips: [
      { text: 'Train ninjas (<kbd>=</kbd>). In a fight they leap past the enemy line onto the mages behind it.', next: s => s.my('ninja') >= 3 },
      { text: 'When the enemy attacks, right-click their Cleric or Warlock with your ninjas and archers.', next: s => s.ai.attacks >= 1 },
      { text: 'A Fireball\'s target ring shows before it lands. Spread out, or pull back out of it.', secs: 18 },
      { text: 'With their healers gone, their line can\'t hold. Push!' },
    ],
  },
  {
    key: 'horde', name: 'The Horde', sub: 'Necromancers and their zombies',
    brief: [
      'A Necromancer raises zombies and keeps them coming. Anyone a zombie kills gets up as another one, so a horde snowballs.',
      'Clerics and Warlocks are yours now. Holy light burns the undead.',
    ],
    counters: ['Kill the Necromancer and its zombies just wander', 'An enemy Healing Pool burns zombies to ash; a Cleric with nobody to heal smites them', 'Zombies shrug off half of every arrow'],
    unlocks: ['necromancer'], upgrades: true,
    enemyUnits: ['miner', 'necromancer', 'spear'],
    player: { gold: 550, mana: 150, army: [{ type: 'miner', n: 5 }, { type: 'sword', n: 3 }, { type: 'archer', n: 2 }, { type: 'cleric', n: 2 }] },
    enemy: { gold: 200, mana: 100, army: [{ type: 'miner', n: 4 }, { type: 'necromancer', n: 1 }, { type: 'spear', n: 1 }], hp: { zombie: 0.85 } },
    ai: { miners: 5, pray: 2, mix: { necromancer: 1, spear: 2 }, pace: 6, attackAt: 6, grow: 2, retreatAt: 0.3, formation: 'charge', zombieCharge: true, maxOf: { necromancer: 2 } },
    tips: [
      { text: 'Train Clerics (<kbd>5</kbd>). Research <b>Healing Pool</b>: dropped on the horde, it burns zombies instead of healing them.', next: s => s.my('cleric') >= 2 },
      { text: 'Zombies charge as soon as they rise. Hold your line and let them break on it.', next: s => s.ai.attacks >= 1 },
      { text: 'Find the Necromancer behind the horde (the skull badge over it shows its pack) and send ninjas or a charge at it.', secs: 20 },
      { text: 'No Necromancer, no horde. Push to their statue.' },
    ],
  },
  {
    key: 'skies', name: 'Wings', sub: 'Kestrels and fighting flyers',
    brief: [
      'Kestrels fly over everything and shoot crossbow bolts from above. Swords and spears can\'t reach them.',
      'This enemy sends its Kestrels after your miners and archers while a few Swordwrath hold its line.',
    ],
    counters: ['Only ranged attacks hit flyers: archers, castle archers, mages, Gladiator javelins and ninjas with Throwing Stars', 'Kestrels are fragile: massed archers shred them', 'Garrison or shelter miners while the sky is full'],
    unlocks: ['flyer'], upgrades: true,
    enemyUnits: ['miner', 'flyer', 'sword'],
    player: { gold: 550, army: [{ type: 'miner', n: 5 }, { type: 'sword', n: 2 }, { type: 'archer', n: 2 }] },
    enemy: { gold: 350, army: [{ type: 'miner', n: 4 }, { type: 'flyer', n: 3 }, { type: 'sword', n: 2 }] },
    ai: { miners: 5, stipend: 1.5, mix: { flyer: 2, sword: 1 }, pace: 4, attackAt: 8, grow: 2, retreatAt: 0.34, formation: 'charge', raids: { size: 2, every: 30, types: ['flyer'] } },
    tips: [
      { text: 'Train archers (<kbd>3</kbd>): your best answer to anything in the air.', next: s => s.my('archer') >= 5 },
      { text: 'Kestrels are hunting your miners. Turn on Siege mode (<kbd>Shift</kbd>+<kbd>Z</kbd>) and keep archers near the gold.', next: s => s.ai.raids >= 2 },
      { text: 'Gladiators throw their javelin at flyers first, and Throwing Stars let ninjas hit them too.', secs: 18 },
      { text: 'Once their flyers are down, their ground army is small. Attack!' },
    ],
  },
  {
    key: 'titans', name: 'Titans', sub: 'Giants',
    brief: [
      'A giant has more health than a whole squad and its club hits everyone around the target. It\'s slow, and alone it\'s easy to kite.',
      'This enemy saves up for giants and walks them in behind a screen of Swordwrath.',
    ],
    counters: ['Archers kite giants: they\'re slow', 'Don\'t clump: a club swing hits several soldiers', 'Ninja Throwing Stars daze a giant; Kestrels fly over it'],
    unlocks: ['giant'], upgrades: true,
    enemyUnits: ['miner', 'giant', 'sword'],
    player: { gold: 650, army: [{ type: 'miner', n: 5 }, { type: 'sword', n: 2 }, { type: 'archer', n: 3 }] },
    enemy: { gold: 300, army: [{ type: 'miner', n: 5 }, { type: 'giant', n: 1 }, { type: 'sword', n: 2 }] },
    ai: { miners: 6, stipend: 2, mix: { giant: 1, sword: 2 }, pace: 4, attackAt: 3, grow: 3, retreatAt: 0.3, formation: 'charge', maxOf: { giant: 2 }, waitFor: 'giant' },
    tips: [
      { text: 'Mass archers. A giant takes a long time to reach them, and every step costs it.', next: s => s.my('archer') >= 6 },
      { text: 'When the giant comes, pull your archers back toward the castle as it closes in: your castle archers keep shooting too.', next: s => s.ai.attacks >= 1 },
      { text: 'Don\'t let your melee crowd around the giant: one swing hits several of them.', secs: 18 },
      { text: 'Giants are expensive. With theirs down, strike before they afford another.' },
    ],
  },
  {
    key: 'war', name: 'Total War', sub: 'A full game against the Normal computer',
    brief: [
      'Every unit and upgrade, against the regular Normal computer. It plays one of its strategies, so watch what it builds and answer it.',
      'From here on a <b>giant is sealed in each statue</b>. When a statue falls, its giant breaks free, and the battle ends only when the giant dies too.',
    ],
    counters: ['Everything you\'ve learned', 'Castle upgrades need an Architect'],
    smart: true, statueGiant: true, playerClan: 'base', clan: 'base',
    tips: [
      { text: 'This is the real game. Scout what the enemy trains and build what beats it.', secs: 20 },
      { text: 'When their statue falls, its giant breaks out. Keep your army together and bring it down.' },
    ],
  },
];

// One trial per clan, after the full game: you play the Base Clan against it on Normal.
const CLAN_TRIALS = CLAN_ORDER.filter(k => k !== 'base').map(k => ({
  key: `clan:${k}`, clan: k, name: CLANS[k].name, sub: CLANS[k].tagline,
  brief: [CLANS[k].tagline, 'You play the Base Clan against the Normal computer. Read what this clan does well, and what it can\'t do.'],
  counters: [...(CLANS[k].strengths || []).slice(0, 2), ...(CLANS[k].weaknesses || []).slice(0, 2).map(w => `Weakness: ${w}`)],
  smart: true, statueGiant: true, playerClan: 'base', trial: true,
  tips: [{ text: `The ${CLANS[k].name}: ${CLANS[k].tagline}` }],
}));

const lessonUnlocked = i => i === 0 || lessonDone(LESSONS[i - 1].key);
const trialsOpen = () => lessonDone('war');
const lessonByKey = key => LESSONS.find(l => l.key === key) || CLAN_TRIALS.find(l => l.key === key);

// The units you can train in lesson i: the basics, everything unlocked by the lessons before it,
// and anything this lesson hands you.
function lessonUnits(i) {
  const set = new Set(TUT_START);
  for (let k = 0; k < i; k++) for (const t of LESSONS[k].unlocks || []) set.add(t);
  for (const t of LESSONS[i].give || []) set.add(t);
  return TRAINABLE.filter(t => set.has(t));
}

// ---------------------------------------------------------------- starting a lesson

function lessonClan(name, units, side, upgrades) {
  return {
    name, tagline: '',
    gold: side.gold !== undefined ? side.gold : START_GOLD,
    mana: side.mana || 0,
    army: side.army || [],
    free: side.free || {},
    hp: side.hp, dmg: side.dmg,
    lockUnits: TRAINABLE.filter(t => !units.includes(t)),
    lockUpgrades: upgrades ? {} : NO_UPGRADES(),
  };
}

function startLesson(key) {
  const L = lessonByKey(key), i = LESSONS.indexOf(L);
  let clans;
  if (L.smart) clans = [L.playerClan || 'base', L.clan || 'base'];
  else {
    CLANS.tut_p = lessonClan('Your army', lessonUnits(i), L.player, !!L.upgrades);
    CLANS.tut_e = lessonClan(L.name, L.enemyUnits, L.enemy, true);
    clans = ['tut_p', 'tut_e'];
  }
  // a fixed map per lesson (no Monolith), against a Normal opponent whatever the skirmish setting
  const keep = { monolith: SETUP.monolith, gold: SETUP.gold, diff: AI_DIFFICULTY };
  SETUP.monolith = 'off';
  SETUP.gold = 'normal';
  AI_DIFFICULTY = 'normal';
  newGame(4100 + (i >= 0 ? i * 37 : 700 + CLAN_TRIALS.indexOf(L) * 53), clans);
  SETUP.monolith = keep.monolith;
  SETUP.gold = keep.gold;
  AI_DIFFICULTY = keep.diff;
  G.difficulty = 'normal';
  if (!L.smart) G.ai = new LessonAI(L);
  G.lesson = { key, L, tip: 0, tipT: 0, shownT: 0, hidden: false };
  startBattle();
  buildLessonBox();
}

// ---------------------------------------------------------------- the lesson's opponent

class LessonAI {
  constructor(L) {
    this.L = L;
    this.c = L.ai;
    this.id = 1;
    this.t = 2;
    this.mode = 'hold';     // 'hold' (on the defend line) or 'attack'
    this.attacks = 0;       // attacks launched so far
    this.attackAt = this.c.attackAt;
    this.launched = 0;
    this.wave = 0;          // timed waves sent (Hold the Line)
    this.waveUnits = [];
    this.raids = 0;         // raiding parties sent
    this.raiders = [];
    this.raidT = this.c.raids ? this.c.raids.every : 0;
    this.line = null;       // the formation holding a firing line
    this.log = [L.name];
  }

  units() { return G.units.filter(u => u.team === this.id && !u.dead); }
  army() { return this.units().filter(u => !isWorker(u) && u.type !== 'zombie'); }
  waveLeft() { return this.waveUnits.filter(u => !u.dead).length; }

  update(dt) {
    const team = G.teams[this.id], c = this.c;
    if (c.stipend) team.gold += c.stipend * dt;   // a little hidden income, so the lesson's unit shows up
    if (c.waves) this.updateWaves(team, dt);
    if (c.raids) this.raidT -= dt;
    if (this.line && !this.line.done) {
      // a firing line stops at its spot (a share of the way from our statue to theirs)
      const stop = team.statue.x + (G.teams[0].statue.x - team.statue.x) * (1 - c.line);
      this.line.halt = this.mode === 'hold' && team.dir * (this.line.anchor - stop) >= 0;
    }
    this.t -= dt;
    if (this.t > 0) return;
    this.t = c.pace || 3;
    const units = this.units(), army = this.army();
    this.economy(team, units);
    this.train(team, units);
    if (c.zombieCharge) for (const u of units) if (u.type === 'necromancer') u.zombieCharge = true;
    // Speartons raise their shields against arrows, and lower them to fight up close
    if (c.shieldWall) {
      for (const u of army) {
        if (u.type !== 'spear' || !u.perks.shield) continue;
        const shot = G.units.some(e => e.team === 0 && !e.dead && !e.inside && isRanged(e) && Math.abs(e.x - u.x) < 420);
        const close = G.units.some(e => e.team === 0 && !e.dead && !e.inside && !isRanged(e) && !isWorker(e) && Math.abs(e.x - u.x) < 90);
        u.shieldWall = shot && !close;
      }
    }
    if (c.raids) this.raid(team, army);
    if (c.line) this.holdLine(team, army);
    this.attack(team, army);
  }

  economy(team, units) {
    const c = this.c, miners = units.filter(u => u.type === 'miner');
    if (miners.length + queuedCount(team, 'miner') < c.miners && !team.queues.workers.length) queueUnit(team, 'miner');
    // a few miners pray for the mages' mana
    const praying = miners.filter(u => u.order.type === 'mana').length;
    if (c.pray && praying < c.pray && miners.length > c.pray + 1) setOrder(miners.find(u => u.order.type !== 'mana'), { type: 'mana' });
  }

  // Train toward the mix: whichever type is furthest below its share, once its building is free.
  train(team, units) {
    const c = this.c, types = Object.keys(c.mix);
    if (!types.length) return;
    const count = t => units.filter(u => u.type === t).length + queuedCount(team, t);
    const total = types.reduce((n, t) => n + count(t), 0) + 1, weight = types.reduce((n, t) => n + c.mix[t], 0);
    const open = types.filter(t => !(c.maxOf && count(t) >= c.maxOf[t]) && !team.queues[groupOf(t).key].length);
    if (!open.length) return;
    const want = open.sort((a, b) => count(a) / total - c.mix[a] / weight - (count(b) / total - c.mix[b] / weight))[0];
    // saving up for a giant: don't spend the gold on anything else
    if (c.waitFor && want !== c.waitFor && count(c.waitFor) < 1 && team.gold < unitCost(team, c.waitFor).gold + 60) return;
    const cost = unitCost(team, want);
    if (team.gold >= cost.gold && team.mana >= cost.mana) queueUnit(team, want);
  }

  // Attack once the army is big enough; fall back when it's been cut down, and come back bigger.
  attack(team, army) {
    const c = this.c, home = army.filter(u => !this.raiders.includes(u) && !this.waveUnits.includes(u));
    if (this.mode === 'hold') {
      if (home.length < this.attackAt) return;
      if (c.waitFor && !home.some(u => u.type === c.waitFor)) return;
      this.mode = 'attack';
      this.attacks++;
      this.launched = home.length;
      if (c.formation === 'advance') {
        if (this.line && !this.line.done) { this.line.halt = false; this.group = this.line; }
        else this.group = formGroup(team, home, 'advance');
      } else { setStance(team, 'attack'); this.keepWavesAttacking(); }
      if (this.attacks === 1) toast('The enemy is attacking!', 'warn');
      return;
    }
    const field = c.formation === 'advance' ? (this.group && !this.group.done ? this.group.members : []) : home.filter(u => !u.inside);
    if (field.length > Math.max(1, this.launched * c.retreatAt)) {
      // reinforcements join a charge as they're trained (a formation goes on without them)
      if (c.formation !== 'advance' && team.stance !== 'attack') { setStance(team, 'attack'); this.keepWavesAttacking(); }
      return;
    }
    this.mode = 'hold';
    this.attackAt += c.grow || 1;
    this.line = this.group = null;
    setStance(team, 'defend');
    this.keepWavesAttacking();
  }

  // A stance change reaches every unit: the timed waves keep attacking whatever the army does.
  keepWavesAttacking() {
    this.waveUnits = this.waveUnits.filter(u => !u.dead);
    for (const u of this.waveUnits) { if (u.order.type !== 'stance') setOrder(u, { type: 'stance' }); u.ownStance = 'attack'; }
  }

  // Archers form a firing line ahead of the statue and wait there (it marches once it's big enough).
  holdLine(team, army) {
    if (this.mode !== 'hold') return;
    const free = army.filter(u => u.order.type !== 'group' && !u.inside);
    if (this.line && !this.line.done) {
      if (free.length) { for (const u of free) { setOrder(u, { type: 'group', g: this.line }); u.ownStance = null; } this.line.members.push(...free); }
      return;
    }
    if (free.length >= 2) this.line = formGroup(team, free, 'advance');
  }

  // Small parties slip out to hunt the miners furthest from the player's castle.
  raid(team, army) {
    const r = this.c.raids;
    this.raiders = this.raiders.filter(u => !u.dead);
    for (const u of this.raiders) if (u.order.type !== 'attack' || !isValidTarget(u.order.target)) this.huntMiner(u);
    if (this.raidT > 0 || this.raiders.length) return;
    const kinds = r.types || ['ninja'];
    const party = army.filter(u => kinds.includes(u.type) && u.order.type !== 'group').slice(0, r.size);
    if (party.length < Math.min(2, r.size)) return;
    this.raidT = r.every;
    this.raids++;
    this.raiders = party;
    for (const u of party) this.huntMiner(u);
  }

  huntMiner(u) {
    const p = G.teams[0];
    const prey = G.units.filter(e => e.team === 0 && !e.dead && !e.inside && isWorker(e)).sort((a, b) => p.dir * (b.x - a.x))[0];
    if (prey) setOrder(u, { type: 'attack', target: prey });
    else { setOrder(u, { type: 'stance' }); this.raiders = this.raiders.filter(r => r !== u); }
  }

  // Hold the Line: free waves march out of the gate on a timer, each bigger than the last.
  updateWaves(team, dt) {
    const w = this.c.waves;
    if (this.wave >= w.list.length) return;
    this.waveT = (this.waveT === undefined ? w.first : this.waveT) - dt;
    if (this.waveT <= 10 && !this.warned) { this.warned = true; toast(`Wave ${this.wave + 1} of ${w.list.length} is coming!`, 'warn'); }
    if (this.waveT > 0) return;
    const spec = w.list[this.wave++];
    this.waveT = w.every;
    this.warned = false;
    for (const [type, n] of Object.entries(spec)) {
      for (let k = 0; k < n; k++) {
        const u = spawnUnit(team, type);
        setOrder(u, { type: 'stance' });
        u.ownStance = 'attack';
        this.waveUnits.push(u);
      }
    }
    if (this.wave >= w.list.length) toast('The last wave! Survive it and their army is spent.', 'warn');
  }
}

// ---------------------------------------------------------------- the lesson box and the end

// Things the tips ask about.
const lessonState = () => ({
  ai: G.ai,
  my: type => G.units.filter(u => u.team === 0 && !u.dead && u.type === type).length,
  foe: type => G.units.filter(u => u.team === 1 && !u.dead && u.type === type).length,
  researched: () => RESEARCH_TYPES.reduce((n, t) => n + Object.keys(G.teams[0].upgrades[t]).length, 0) - Object.values(clanOf(G.teams[0]).free || {}).reduce((n, k) => n + k.length, 0),
});

function buildLessonBox() {
  let box = $('lessonBox');
  if (!box) {
    box = document.createElement('div');
    box.id = 'lessonBox';
    document.body.appendChild(box);
  }
  box.classList.remove('hidden');
  renderLessonTip();
}

function renderLessonTip() {
  const box = $('lessonBox'), ls = G.lesson;
  if (!box || !ls) return;
  const tips = ls.L.tips, tip = tips[ls.tip];
  box.classList.toggle('min', ls.hidden);
  box.classList.toggle('closed', !!ls.closed);
  if (ls.closed) {
    box.innerHTML = `<button data-lb="open" data-tip="Show the ${ls.campaign ? 'battle' : 'lesson'} box">${ls.L.name} ▾</button>`;
    box.querySelector('button').onclick = e => { e.stopPropagation(); ls.closed = false; renderLessonTip(); };
    return;
  }
  box.innerHTML = `
    <div class="lbhead"><b>${ls.L.name}</b><span>${ls.tip + 1} / ${tips.length}</span>
      <button data-lb="prev" ${ls.tip ? '' : 'disabled'}>‹</button><button data-lb="next" ${ls.tip < tips.length - 1 ? '' : 'disabled'}>›</button><button data-lb="min">${ls.hidden ? '▾' : '▴'}</button><button data-lb="close" data-tip="Close (a small tab stays to reopen it)">✕</button></div>
    ${ls.L.status ? `<div class="lbstat">${ls.L.status(G.ai)}</div>` : ''}
    <p>${tip.text}</p>`;
  box.querySelectorAll('[data-lb]').forEach(b => {
    b.onclick = e => {
      e.stopPropagation();
      const a = b.dataset.lb;
      if (a === 'close') ls.closed = true;
      else if (a === 'min') ls.hidden = !ls.hidden;
      else ls.tip = clamp(ls.tip + (a === 'next' ? 1 : -1), 0, tips.length - 1);
      ls.shownT = 0;
      renderLessonTip();
    };
  });
}

// Steps the lesson box on once its tip is done (shown long enough, or its goal met).
function updateLesson(dt) {
  const ls = G.lesson;
  if (!ls || G.over) return;
  if (ls.campaign) campaignTick(dt);
  // the live line (rounds, timers) refreshes twice a second
  if (ls.L.status && (ls.statusT = (ls.statusT || 0) - dt) <= 0) {
    ls.statusT = 0.5;
    const el = document.querySelector('#lessonBox .lbstat');
    if (el) el.innerHTML = ls.L.status(G.ai);
  }
  ls.shownT += dt;
  const tip = ls.L.tips[ls.tip];
  if (ls.tip >= ls.L.tips.length - 1 || ls.shownT < 5) return;
  const done = tip.next ? tip.next(lessonState()) : ls.shownT >= (tip.secs || 15);
  if (!done) return;
  ls.tip++;
  ls.shownT = 0;
  ls.hidden = false;
  if (!ls.closed) renderLessonTip();
}

const hideLessonBox = () => { const b = $('lessonBox'); if (b) b.classList.add('hidden'); };

// A lesson's end: winning records it and shows what it unlocked.
function lessonEndHTML(won) {
  if (G.lesson.campaign) return campaignEnd(won);
  const L = G.lesson.L, first = won && !lessonDone(L.key);
  if (won && !lessonDone(L.key)) { TUT.done.push(L.key); saveTut(); }
  const unlocked = (L.unlocks || []).map(t => UNIT_TYPES[t].name);
  const next = nextLesson(L);
  const msg = won
    ? (unlocked.length ? `<p class="unlock">${first ? 'Unlocked' : 'Unlocks'}: <b>${unlocked.join(', ')}</b></p>` : L.key === 'war' ? '<p class="unlock">The clan trials are open.</p>' : '')
    : `<p class="unlock">Try again: ${L.counters[0]}.</p>`;
  return { msg, next };
}

function nextLesson(L) {
  const i = LESSONS.indexOf(L);
  if (i >= 0 && i < LESSONS.length - 1) return LESSONS[i + 1];
  if (i === LESSONS.length - 1) return CLAN_TRIALS[0];
  const j = CLAN_TRIALS.indexOf(L);
  return CLAN_TRIALS.slice(j + 1).find(t => !lessonDone(t.key)) || CLAN_TRIALS.find(t => !lessonDone(t.key)) || null;
}

// ---------------------------------------------------------------- menus

function showTutorialMenu() {
  G.lesson = null;
  hideLessonBox();
  document.body.className = 'title';
  $('debug').classList.add('hidden');
  const icons = types => types.map(t => `<canvas class="uicon" width="56" height="56" data-unit="${t}" data-tip="${UNIT_TYPES[t].name}"></canvas>`).join('');
  const row = (L, open, i) => {
    const done = lessonDone(L.key);
    const reward = L.unlocks ? icons(L.unlocks) : '';
    return `<button class="lesson ${done ? 'done' : ''}" data-lesson="${L.key}" ${open ? '' : 'disabled'}>
      <span class="ln">${i === undefined ? '' : i + 1}</span>
      <span class="lt"><b>${L.name}</b><i>${L.sub}</i></span>
      <span class="lr">${reward}</span>
      <span class="ls">${done ? '✓' : open ? '' : '🔒'}</span>
    </button>`;
  };
  const trials = trialsOpen();
  $('overlay').innerHTML = `
    <div class="card tutorial">
      <h1>TUTORIAL</h1>
      <p class="sub">${TUT.done.filter(k => LESSONS.some(l => l.key === k)).length} of ${LESSONS.length} lessons · ${TUT.done.filter(k => k.startsWith('clan:')).length} of ${CLAN_TRIALS.length} clan trials</p>
      <div class="lessons">${LESSONS.map((L, i) => row(L, lessonUnlocked(i), i)).join('')}</div>
      <h3 class="trialhead">Clan trials ${trials ? '' : '<i>(win Total War to open)</i>'}</h3>
      <div class="lessons trials">${CLAN_TRIALS.map(L => row(L, trials)).join('')}</div>
      <div class="row"><button id="btnTutBack">Back</button></div>
    </div>`;
  $('overlay').classList.remove('hidden');
  $('overlay').querySelectorAll('canvas[data-unit]').forEach(c => drawUnitIcon(c, c.dataset.unit));
  $('overlay').querySelectorAll('[data-lesson]').forEach(b => { b.onclick = () => showBriefing(b.dataset.lesson); });
  $('btnTutBack').onclick = () => showMainMenu();
}

function showBriefing(key) {
  const L = lessonByKey(key), i = LESSONS.indexOf(L);
  const icons = types => types.map(t => `<canvas class="uicon" width="56" height="56" data-unit="${t}" data-tip="${UNIT_TYPES[t].name}"></canvas>`).join('');
  hideLessonBox();
  document.body.className = 'title';
  $('overlay').classList.remove('hidden');
  const yours = L.smart ? '<i>every unit</i>' : icons(lessonUnits(i));
  const theirs = L.smart ? `<i>${CLANS[L.clan || 'base'].name}</i>` : icons(L.enemyUnits);
  $('overlay').innerHTML = `
    <div class="card briefing">
      <p class="sub">${i >= 0 ? `Lesson ${i + 1}` : 'Clan trial'}</p>
      <h2>${L.name}</h2>
      ${L.brief.map(p => `<p>${p}</p>`).join('')}
      <div class="sides"><div><span>You</span>${yours}</div><div><span>Enemy</span>${theirs}</div></div>
      <ul class="counters">${L.counters.map(c => `<li>${c}</li>`).join('')}</ul>
      ${L.unlocks ? `<p class="unlock">Win to unlock: ${icons(L.unlocks)}</p>` : ''}
      ${L.upgrades && !LESSONS.slice(0, i).some(l => l.upgrades) ? '<p class="unlock">New: you can research upgrades.</p>' : ''}
      <div class="row"><button id="btnBriefBack">Back</button><button id="btnBriefGo" class="big">Begin</button></div>
    </div>`;
  $('overlay').querySelectorAll('canvas[data-unit]').forEach(c => drawUnitIcon(c, c.dataset.unit));
  $('btnBriefBack').onclick = () => showTutorialMenu();
  $('btnBriefGo').onclick = () => startLesson(key);
}
