'use strict';
// The campaign: a road of battles across a map against the Horde, a monster faction (the enemy side's
// units drawn as fiends, see MONSTER in draw.js). Each level has its own rules: a plain battle, a
// zombie siege to survive round after round, a fortress to break, a hunkered Colossus to kill before
// time runs out... Winning a level opens the next one on the map. One difficulty for now; the last
// battle is still under construction.
//
// A level runs on the tutorial's machinery (startLesson's clans, the lesson box, the end screen):
// fields as in LESSONS, plus campaign: true, goal ('statue' | 'survive' | 'boss'), pos (on the map),
// theme (map skies), setup(team) (extra pieces placed at the start), status() (the lesson box's
// live line), timer (seconds, for 'boss') and statueGiant.

const CAMP_STORE = 'stickfront.campaign';
const CAMP = (() => {
  try { return { done: [], ...JSON.parse(localStorage.getItem(CAMP_STORE) || '{}') }; } catch (e) { return { done: [] }; }
})();
const saveCamp = () => { try { localStorage.setItem(CAMP_STORE, JSON.stringify(CAMP)); } catch (e) { /* storage unavailable */ } };
const campDone = key => CAMP.done.includes(key);

// What the Horde calls its troops.
const MONSTER_NAMES = {
  miner: 'Grubber', architect: 'Pitwright', quartermaster: 'Scavenger', sword: 'Ghoul', archer: 'Bone Archer', spear: 'Hellguard',
  gladiator: 'Butcher', cleric: 'Blood Priest', warlock: 'Hexer', necromancer: 'Lich', giant: 'Abomination', ninja: 'Shade',
  flyer: 'Bat Rider', golem: 'Colossus', zombie: 'Zombie', medusa: 'Medusa',
};

// The campaign's own skies.
const CAMP_THEMES = {
  plague: {
    name: 'Plague Fog', sky: ['#1a2018', '#6e7a58'], sun: '#c8d8a0', hills: ['#4a5440', '#343c2e', '#22281e'],
    haze: '#8a9870', ground: ['#4a4a36', '#2a2a1e'], path: '#5e5a40', grass: '#4e5a34', rock: '#5a5a4e',
    prop: '#1e1e16', weather: 'leaves', cloud: '#9aa888', shade: 0.4,
  },
  dusk: {
    name: 'Bleeding Dusk', sky: ['#1a0e1e', '#a8443a'], sun: '#ff9a6a', hills: ['#5e3446', '#40243a', '#2a1828'],
    haze: '#c0604a', ground: ['#4e3a34', '#2c201c'], path: '#6a4e40', grass: '#5a4a30', rock: '#64544e',
    prop: '#22181a', weather: 'embers', cloud: '#d8908a', shade: 0.38,
  },
  bloodmoon: {
    name: 'Blood Moon', sky: ['#0c0408', '#5a1014'], sun: '#ff4a32', hills: ['#3a1620', '#2a0e16', '#1a080c'],
    haze: '#8a2018', ground: ['#3a2622', '#1e1210'], path: '#4e322a', grass: '#3e2c1e', rock: '#4a3a36',
    prop: '#140a0a', weather: 'embers', cloud: '#7a3030', shade: 0.5,
  },
};

const ALL_UNITS = () => TRAINABLE.slice();

// Things a level's setup uses.
const campX = (team, x) => team.edge(x);   // a distance from the side's own edge
function campUnit(team, type, x, y, order) {
  const u = spawnUnit(team, type, x, y);
  u.perks = { ...team.upgrades[type] };
  applyPerks(u);
  u.hp = u.maxHp;
  if (isFlying(u)) u.alt = FLY_ALT;
  if (order) setOrder(u, order);
  return u;
}
function campTrench(team, x, palisade) {
  const w = placeWall(team, x, [], true);
  w.progress = 1;
  if (palisade) { w.tier = 2; w.max += WALL_HP2; }
  w.hp = w.max;
  return w;
}

const BOSS_PRIEST_HEAL = 9;    // hp per second each Blood Priest near the Colossus pours into it
const fmtTime = s => `${Math.floor(Math.max(0, s) / 60)}:${String(Math.floor(Math.max(0, s) % 60)).padStart(2, '0')}`;

// ---------------------------------------------------------------- the levels

const CAMPAIGN = [
  {
    key: 'border', name: 'The Border Watch', sub: 'The Horde comes down from the hills', pos: [95, 470],
    brief: [
      'Our watchtowers on the border have gone dark. Something came out of the hills: <b>Ghouls</b> with jagged blades and <b>Bone Archers</b> behind them.',
      'Hold the line, then march on their totem and burn it down.',
    ],
    counters: ['Ghouls are quick but frail: fight them at your statue, under your castle archers', 'Bone Archers die fast to a determined charge'],
    goal: 'statue', theme: CAMP_THEMES.dusk,
    enemyUnits: ['miner', 'sword', 'archer'],
    player: { gold: 500, army: [{ type: 'miner', n: 3 }, { type: 'sword', n: 2 }, { type: 'archer', n: 1 }] },
    enemy: { gold: 200, army: [{ type: 'miner', n: 3 }, { type: 'sword', n: 2 }] },
    ai: { miners: 4, stipend: 0.3, mix: { sword: 2, archer: 1 }, pace: 4.5, attackAt: 5, grow: 2, retreatAt: 0.34, formation: 'charge' },
    tips: [
      { text: 'Build up your miners and army. The Horde will test your line soon.', next: s => s.ai.attacks >= 1 },
      { text: 'Beat back their charge on your defend line, then counterattack before they rebuild.' },
    ],
  },
  {
    key: 'plague', name: 'Plague Village', sub: 'Survive eight rounds of the walking dead', pos: [235, 395],
    brief: [
      'The village of Ashby is lost. Its dead are walking, and every night more of them come running out of the plague fog to the east.',
      'Survive <b>eight rounds</b> of zombies, each bigger than the last. There\'s no castle out there to attack, only the dead to endure.',
    ],
    counters: ['Clerics burn the dead: a Healing Pool scorches zombies, and an idle Cleric smites them', 'Zombies shrug off half of every arrow: meet them with a wall of blades', 'From round 4, Hulks lumber in with the pack: slow, but hard to kill'],
    goal: 'survive', theme: CAMP_THEMES.plague,
    enemyUnits: ['zombie'],
    player: { gold: 650, mana: 100, army: [{ type: 'miner', n: 4 }, { type: 'sword', n: 3 }, { type: 'spear', n: 1 }, { type: 'archer', n: 2 }, { type: 'cleric', n: 1 }] },
    enemy: { gold: 0, army: [] },
    noFoeCastle: true,
    ai: { miners: 0, mix: {}, attackAt: 999, rounds: { n: 8, first: 45, gap: 14, max: 55 } },
    status: ai => ai.roundsWon() ? 'All rounds survived!' : ai.round === 0 ? `Round 1 comes in ${fmtTime(ai.roundT)}` : `Round ${ai.round} of 8 · ${ai.roundLeft()} zombies left${ai.roundLeft() === 0 && ai.round < 8 ? ` · next in ${fmtTime(ai.roundT)}` : ''}`,
    tips: [
      { text: 'Train Clerics (<kbd>5</kbd>) and research <b>Healing Pool</b>: holy light burns the dead. Swordwrath and Spearton hold the front.', next: s => s.ai.round >= 1 },
      { text: 'The dead run in from the east, straight at your statue. Keep your line in front of it.', next: s => s.ai.round >= 3 },
      { text: 'Use the quiet between rounds: more miners, refits, upgrades.', next: s => s.ai.round >= 4 },
      { text: 'Hulks! Huge, slow zombies with a lot of health. Focus them down.' },
    ],
  },
  {
    key: 'bonewall', name: 'The Bone Wall', sub: 'Storm a fortified line', pos: [375, 455],
    brief: [
      'The Horde has dug in across the pass behind two palisaded trenches stacked with bones, with archer towers behind them and traps in the mud before them.',
      'Break through and topple the totem behind the wall.',
    ],
    counters: ['Giants and Fireballs smash trenches; ninjas leap over them', 'Archers out-range the trench guards: whittle them down first', 'Watch for hidden traps in front of the outer trench'],
    goal: 'statue', theme: CAMP_THEMES.dusk,
    enemyUnits: ['miner', 'spear', 'archer'],
    player: { gold: 1000, army: [{ type: 'miner', n: 5 }, { type: 'sword', n: 3 }, { type: 'archer', n: 3 }, { type: 'architect', n: 1 }] },
    enemy: { gold: 200, free: { architect: ['walls', 'walls2'], spear: ['shield', 'inspire'] }, army: [{ type: 'miner', n: 4 }] },
    setup(team) {
      const outer = campTrench(team, campX(team, 1300), true), inner = campTrench(team, campX(team, 1050), true);
      for (const [w, n] of [[outer, 3], [inner, 2]]) manWall(team, Array.from({ length: n }, (_, k) => campUnit(team, 'spear', w.x + team.dir * 30, rowY(k * 2))), w);
      for (const x of [980, 1220]) {
        const tw = orderTower(team, campX(team, x), rowY(0), [], true);
        const a = campUnit(team, 'archer', tw.x, tw.y + 2);
        postArcher(a, tw);
      }
      ['mine', 'tar', 'mine'].forEach((k, i) => freeTrap(team.id, k, campX(team, 1400 + i * 60), rowY(1 + i * 2)));
    },
    ai: { miners: 5, stipend: 1, mix: { spear: 1, archer: 2 }, pace: 4, attackAt: 14, grow: 4, retreatAt: 0.4, formation: 'advance' },
    tips: [
      { text: 'Scout the wall first. Archers can pick off the trench guards from beyond their reach.', secs: 20 },
      { text: 'Trenches stop anyone on foot. Giants batter them down fast, and Warlock Fireballs hit everyone on top.', secs: 20 },
      { text: 'Ninjas leap over trenches onto the archers behind them.' },
    ],
  },
  {
    key: 'nightwings', name: 'Wings of Night', sub: 'Bat Riders darken the sky', pos: [475, 330],
    brief: [
      'At dusk the sky fills with leathery wings. <b>Bat Riders</b> swoop on anything caught in the open, our miners most of all.',
      'Shoot them down and destroy their totem.',
    ],
    counters: ['Only ranged attacks reach flyers: archers, castle archers, mages, Gladiator javelins, ninjas with Throwing Stars', 'Siege mode (Shift+Z) shelters your miners', 'Bat Riders are fragile: massed archers shred them'],
    goal: 'statue', theme: CAMP_THEMES.dusk,
    enemyUnits: ['miner', 'flyer', 'sword', 'archer'],
    player: { gold: 700, army: [{ type: 'miner', n: 5 }, { type: 'sword', n: 2 }, { type: 'archer', n: 3 }] },
    enemy: { gold: 300, hp: { troops: 1.05 }, army: [{ type: 'miner', n: 5 }, { type: 'flyer', n: 3 }, { type: 'sword', n: 2 }] },
    ai: { miners: 5, stipend: 2, mix: { flyer: 3, sword: 1, archer: 1 }, pace: 3.5, attackAt: 9, grow: 3, retreatAt: 0.34, formation: 'charge', raids: { size: 3, every: 28, types: ['flyer'] } },
    tips: [
      { text: 'Bat Riders go for your miners first. Siege mode (<kbd>Shift</kbd>+<kbd>Z</kbd>) sends them into the castle when danger is near.', next: s => s.ai.raids >= 1 },
      { text: 'Archers, archers, archers. Recurve Bows let them shoot the bats before they reach you.' },
    ],
  },
  {
    key: 'colossus', name: 'The Colossus', sub: 'Kill the hunkered giant before time runs out', pos: [625, 385],
    brief: [
      'A <b>Colossus</b> of living stone guards the road, hunkered down behind its arms while <b>Blood Priests</b> pour healing into it. Every hour it stands, the Horde\'s grip on the valley tightens.',
      'You have <b>seven minutes</b> to bring it down. Hunkered, it shrugs off most of every blow, but now and then it rises to smash whoever crowds it, and that\'s when it\'s open.',
    ],
    counters: ['Kill the Blood Priests first, or the Colossus heals as fast as you can hurt it', 'Hit hardest when it stands up to swing', 'Warlocks barely scratch it; Swordwrath, Spearton and Gladiators do the work'],
    goal: 'boss', timer: 420, theme: CAMP_THEMES.dusk,
    enemyUnits: ['golem', 'cleric', 'spear', 'sword'],
    player: { gold: 900, mana: 150, army: [{ type: 'miner', n: 5 }, { type: 'sword', n: 4 }, { type: 'spear', n: 2 }, { type: 'archer', n: 3 }, { type: 'ninja', n: 1 }] },
    enemy: { gold: 0, mana: 400, army: [] },
    sealed: true,
    setup(team) {
      const x = campX(team, 1900), y = (LANE_TOP + LANE_BOT) / 2;
      const boss = campUnit(team, 'golem', x, y, { type: 'hold', x, y });
      boss.boss = true;
      boss.scale = GOLEM.scale * 1.9;
      boss.maxHp = boss.hp = 5500;
      boss.dmg *= 1.6;
      boss.shieldWall = true;
      boss.bossT = 14;
      boss.facing = team.dir;
      G.boss = boss;
      for (let k = 0; k < 3; k++) { const cx = x - team.dir * (170 + k * 25), cy = rowY(k * 1.5 + 1); campUnit(team, 'cleric', cx, cy, { type: 'hold', x: cx, y: cy }); }
      for (let k = 0; k < 2; k++) { const sx = x + team.dir * 60, sy = rowY(k * 3 + 1); campUnit(team, 'spear', sx, sy, { type: 'hold', x: sx, y: sy }); }
    },
    ai: { miners: 0, mix: {}, attackAt: 999, stipendMana: 2.5, boss: true, reinforce: { every: 50, units: { sword: 1, spear: 1, cleric: 1 }, near: true, maxOf: { cleric: 3 } } },
    status: ai => G.boss && !G.boss.dead ? `Colossus ${Math.ceil(G.boss.hp / G.boss.maxHp * 100)}%${G.boss.shieldWall ? ' · hunkered' : ' · <b>EXPOSED</b>'} · ${fmtTime(G.lesson.timer)} left` : 'The Colossus has fallen!',
    tips: [
      { text: 'March on the Colossus with a big army. Target the Blood Priests behind it first: right-click them.', next: s => G.units.filter(u => u.team === 1 && !u.dead && u.type === 'cleric').length === 0 || G.lesson.timer < 300 },
      { text: 'When it stands up to swing (<b>EXPOSED</b>), everything piles in.', secs: 25 },
      { text: 'More Blood Priests and Ghouls arrive every so often. Keep your army topped up.' },
    ],
  },
  {
    key: 'necropolis', name: 'Necropolis', sub: 'Liches and their endless dead', pos: [705, 250],
    brief: [
      'The city of the dead. <b>Liches</b> raise zombie after zombie and send them charging the moment they rise, while <b>Hexers</b> rain curses and fire from behind Hellguard shields.',
      'Cut through the horde, slay the Liches and topple their totem.',
    ],
    counters: ['Kill a Lich and its zombies lose their leader', 'Holy light burns zombies: Clerics and Healing Pools', 'Spread out when a Fireball\'s ring appears'],
    goal: 'statue', theme: CAMP_THEMES.plague,
    enemyUnits: ['miner', 'necromancer', 'spear', 'warlock'],
    player: { gold: 850, mana: 200, army: [{ type: 'miner', n: 5 }, { type: 'sword', n: 3 }, { type: 'spear', n: 1 }, { type: 'archer', n: 2 }, { type: 'cleric', n: 2 }] },
    enemy: { gold: 300, mana: 150, hp: { troops: 1.05 }, army: [{ type: 'miner', n: 5 }, { type: 'necromancer', n: 1 }, { type: 'spear', n: 2 }] },
    ai: { miners: 6, pray: 2, stipend: 1.3, stipendMana: 0.8, mix: { necromancer: 1, spear: 2, warlock: 1 }, pace: 4, attackAt: 7, grow: 2, retreatAt: 0.3, formation: 'advance', zombieCharge: true, maxOf: { necromancer: 3 } },
    tips: [
      { text: 'Clerics and Healing Pools turn the dead to ash. Bring several.', next: s => s.ai.attacks >= 1 },
      { text: 'Find the Liches (the skull badges) and send ninjas or a charge at them.' },
    ],
  },
  {
    key: 'titanfall', name: 'Titanfall', sub: 'Abominations march out every minute', pos: [565, 160],
    brief: [
      'In the Horde\'s breeding pits, <b>Abominations</b> are stitched together faster than we can kill them. A wave lumbers out of their gate every minute, each bigger than the last.',
      'Their totem is warded while the pits are working. Survive <b>six waves</b>; when the pits run dry the ward breaks. Then destroy the totem.',
    ],
    counters: ['Archers kite Abominations: they\'re slow', 'Don\'t clump: a club swing hits several soldiers', 'Save up for the push: the ward breaks after the sixth wave'],
    goal: 'statue', theme: CAMP_THEMES.bloodmoon, sealed: true,
    enemyUnits: ['miner', 'giant', 'sword', 'archer'],
    player: { gold: 900, army: [{ type: 'miner', n: 6 }, { type: 'sword', n: 3 }, { type: 'spear', n: 2 }, { type: 'archer', n: 4 }] },
    enemy: { gold: 300, hp: { troops: 1.1 }, army: [{ type: 'miner', n: 5 }, { type: 'sword', n: 3 }, { type: 'archer', n: 2 }] },
    ai: { miners: 5, stipend: 0.8, mix: { sword: 2, archer: 1 }, pace: 4, attackAt: 8, grow: 3, retreatAt: 0.34, formation: 'advance',
      unsealAfterWaves: true, waves: { first: 50, every: 60, list: [{ giant: 1 }, { giant: 1, sword: 2 }, { giant: 2 }, { giant: 2, archer: 3 }, { giant: 3 }, { giant: 3, sword: 4 }] } },
    status: ai => ai.wave < ai.c.waves.list.length ? `Abomination wave ${ai.wave + 1} of ${ai.c.waves.list.length} in ${fmtTime(ai.waveT === undefined ? ai.c.waves.first : ai.waveT)} · totem warded` : G.teams[1].statue.sealed ? 'The last wave is out: the ward breaks once its Abominations fall' : 'The ward is broken: destroy the totem!',
    tips: [
      { text: 'An Abomination is coming. Mass archers behind your melee and kite it back toward your castle.', next: s => s.ai.wave >= 2 },
      { text: 'Every wave is bigger. Grow your economy and army between them: you\'ll need a big push at the end.', next: s => !G.teams[1].statue.sealed },
      { text: 'The ward is broken! March on the totem.' },
    ],
  },
  {
    key: 'bloodmoon', name: 'Blood Moon', sub: 'The Horde\'s full host, at its strongest', pos: [765, 108],
    brief: [
      'Under the blood moon the Horde marches with everything it has, led by its warlords, and a <b>giant sleeps inside its totem</b>.',
      'It plays like the Hard computer, every unit and upgrade, and its fiends are tougher than ours. Win, and the road to the Abyss lies open.',
    ],
    counters: ['Everything you\'ve learned on this road', 'When the totem falls its giant breaks out: finish it'],
    goal: 'statue', statueGiant: true, smart: 'hard', theme: CAMP_THEMES.bloodmoon,
    enemyUnits: TRAINABLE,
    player: { gold: 600, army: [{ type: 'miner', n: 3 }, { type: 'sword', n: 2 }, { type: 'archer', n: 1 }, { type: 'architect', n: 1 }, { type: 'quartermaster', n: 1 }] },
    enemy: { gold: 600, hp: { troops: 1.1 }, dmg: { troops: 1.05 }, army: [{ type: 'miner', n: 3 }, { type: 'sword', n: 2 }, { type: 'archer', n: 1 }] },
    tips: [
      { text: 'This is the Horde at full strength. Watch what it builds and answer it.', secs: 25 },
      { text: 'When their totem falls, its giant breaks out. Keep your army together and bring it down.' },
    ],
  },
  {
    key: 'abyss', name: 'The Abyss', sub: 'Medusa, queen of the Horde', pos: [915, 66],
    brief: [
      'At the bottom of the Abyss waits the Horde\'s queen: <b>Medusa</b>. Her gaze is slow, but whatever it falls on <b>turns to stone</b>, whatever its health: a miner or a giant alike. Her brood crawls out of the ground around her, and she slithers toward our castle.',
      'Slay her. When she dies, her curse breaks both totems at once and <b>both giants break free</b>. The Horde\'s last reserves pour out to guard theirs. <b>The first side to kill the other\'s giant wins.</b>',
    ],
    counters: ['Her gaze picks the costliest unit in reach: keep giants and Gladiators away from her until she\'s low', 'Swarm her with cheap troops: she can only stone one every few seconds', 'Save an army for the giants\' duel after she falls'],
    goal: 'medusa', statueGiant: true, theme: CAMP_THEMES.bloodmoon, enemyPop: 24,
    enemyUnits: ['miner', 'sword', 'spear', 'archer', 'warlock', 'cleric'],
    player: { gold: 1000, mana: 150, army: [{ type: 'miner', n: 6 }, { type: 'sword', n: 4 }, { type: 'spear', n: 2 }, { type: 'archer', n: 4 }, { type: 'cleric', n: 1 }, { type: 'architect', n: 1 }, { type: 'quartermaster', n: 1 }] },
    enemy: { gold: 300, mana: 200, army: [{ type: 'miner', n: 5 }, { type: 'spear', n: 2 }, { type: 'archer', n: 2 }] },
    sealed: true,
    setup(team) {
      const x = campX(team, 1700), y = (LANE_TOP + LANE_BOT) / 2;
      const q = campUnit(team, 'medusa', x, y, { type: 'hold', x, y });
      q.facing = team.dir;
      q.boss = true;
      q.scale = 2;
      G.boss = q;
      for (let k = 0; k < 3; k++) { const sx = x + team.dir * 70, sy = rowY(k * 2 + 0.5); campUnit(team, 'spear', sx, sy, { type: 'hold', x: sx, y: sy }); }
    },
    ai: { miners: 5, pray: 1, stipend: 0.6, stipendMana: 0.6, mix: { sword: 2, spear: 1, archer: 2, warlock: 1, cleric: 1 }, pace: 4, attackAt: 10, grow: 3, retreatAt: 0.34, formation: 'advance',
      medusa: { creepEvery: 20, creep: 45, broodEvery: 24 },
      reinforce: { every: 30, units: { sword: 1, spear: 1 }, near: true, maxOf: { sword: 8, spear: 6 } } },
    status: ai => G.lesson.finale ? 'Both giants are loose: kill theirs before they kill yours!' : G.boss && !G.boss.dead ? `Medusa ${Math.ceil(G.boss.hp / G.boss.maxHp * 100)}% · ${G.stoned || 0} turned to stone` : '',
    tips: [
      { text: 'Medusa slithers toward your castle, her brood around her. Meet her with a wide swarm of cheap troops: she stones only one unit every few seconds.', next: s => G.boss && G.boss.hp < G.boss.maxHp * 0.85 },
      { text: 'Her gaze always picks the costliest unit in reach. Keep your giants and veterans back until she\'s weak.', next: s => G.boss && (G.boss.dead || G.boss.hp < G.boss.maxHp * 0.4) },
      { text: 'When she falls, both giants break free and the Horde\'s reserves charge. Have an army ready to guard your giant and kill theirs.', next: s => G.lesson.finale },
      { text: 'The giants are loose! Protect yours and bring theirs down.' },
    ],
  },
];

const campIndex = key => CAMPAIGN.findIndex(l => l.key === key);
const campOpen = i => !CAMPAIGN[i].soon && (i === 0 || campDone(CAMPAIGN[i - 1].key));

// ---------------------------------------------------------------- starting a level

function startCampaignLevel(key) {
  const i = campIndex(key), L = CAMPAIGN[i];
  CLANS.camp_p = lessonClan('The Order', L.playerUnits || ALL_UNITS(), L.player, true);
  CLANS.camp_e = lessonClan('The Horde', L.enemyUnits, L.enemy, true);
  CLANS.camp_e.pop = L.enemyPop || 40;
  const keep = { monolith: SETUP.monolith, gold: SETUP.gold, diff: AI_DIFFICULTY };
  SETUP.monolith = 'off';
  SETUP.gold = 'normal';
  AI_DIFFICULTY = L.smart || 'normal';
  newGame(9100 + i * 41, ['camp_p', 'camp_e'], { theme: L.theme });
  SETUP.monolith = keep.monolith;
  SETUP.gold = keep.gold;
  AI_DIFFICULTY = keep.diff;
  G.difficulty = L.smart || 'normal';
  G.monsterTeam = 1;
  G.boss = null;
  const foe = G.teams[1];
  if (L.sealed) foe.statue.sealed = true;
  if (L.noFoeCastle) {   // nothing out there but the dead: no castle, no totem, no castle archers
    foe.noCastle = true;
    foe.statue.dead = true;
    foe.statue.hp = 0;
    foe.archers = [];
  }
  if (L.setup) L.setup(foe);
  if (!L.smart) G.ai = new CampaignAI(L);
  G.lesson = { key, L, campaign: true, tip: 0, tipT: 0, shownT: 0, hidden: false, timer: L.timer || 0, statusT: 0 };
  startBattle();
  buildLessonBox();
}

// ---------------------------------------------------------------- the Horde's commanders

class CampaignAI extends LessonAI {
  constructor(L) {
    super(L);
    this.round = 0;
    this.roundUnits = [];
    this.spawnQ = [];
    this.roundT = L.ai.rounds ? L.ai.rounds.first : 0;
    this.reinforceT = L.ai.reinforce ? L.ai.reinforce.every : 0;
  }

  roundLeft() { return this.roundUnits.filter(u => !u.dead).length + this.spawnQ.length; }
  roundsWon() { const r = this.c.rounds; return !!r && this.round >= r.n && this.roundLeft() === 0; }

  update(dt) {
    super.update(dt);
    const team = G.teams[this.id], c = this.c;
    if (c.stipendMana) team.mana = Math.min(MAX_MANA, team.mana + c.stipendMana * dt);
    if (c.rounds) this.updateRounds(team, dt);
    if (c.boss) this.updateBoss(team, dt);
    if (c.medusa) this.updateMedusaLair(team, dt);
    if (c.reinforce) this.updateReinforce(team, dt);
    // Titanfall: the ward breaks once the last wave is out and its Abominations are down
    if (c.unsealAfterWaves && team.statue.sealed && this.wave >= c.waves.list.length && !this.waveUnits.some(u => !u.dead && isGiant(u))) {
      team.statue.sealed = false;
      toast('The pits are empty and the ward is broken: destroy the totem!', 'warn');
    }
  }

  // Plague Village: each round, zombies claw up out of the far field, a few at a time. The next
  // round comes a short breather after this one is cleared (or at the latest after `max` seconds).
  updateRounds(team, dt) {
    const r = this.c.rounds;
    // the dead, a few per second, running in out of the fog to the east
    this.spawnT = (this.spawnT || 0) - dt;
    if (this.spawnQ.length && this.spawnT <= 0) {
      this.spawnT = 0.35;
      const z = this.spawnQ.shift(), p = G.teams[0];
      const x = p.statue.x + p.dir * rnd(z.near, z.far), y = rnd(LANE_TOP + 8, LANE_BOT - 8);
      const u = raiseZombie(this.id, x, y, null);
      u.riseT = 0;   // (they arrive on foot, not out of the ground)
      u.maxHp = Math.round(u.maxHp * z.hp);
      u.hp = u.maxHp;
      if (z.brute) makeHulk(u);
      setOrder(u, { type: 'stance' });
      u.ownStance = 'attack';
      this.roundUnits.push(u);
    }
    if (this.round >= r.n) return;
    const cleared = this.round > 0 && this.roundLeft() === 0;
    if (cleared && !this.clearedAt) { this.clearedAt = true; this.roundT = Math.min(this.roundT, r.gap); toast(`Round ${this.round} survived!`); }
    this.roundT -= dt;
    if (this.roundT > 0) return;
    this.round++;
    this.clearedAt = false;
    this.roundT = r.max;
    this.roundUnits = this.roundUnits.filter(u => !u.dead);
    const n = this.round, count = 5 + n * 3, brutes = n >= 4 ? n - 2 : 0;
    // off-screen to the east (later rounds start a little closer)
    const far = 3300 - n * 40, near = 2700 - n * 40;
    for (let k = 0; k < count; k++) this.spawnQ.push({ hp: 1 + 0.07 * n, brute: k < brutes, far, near });
    toast(n === r.n ? `The final round! ${count} of the dead are coming.` : `Round ${n}: ${count} of the dead are coming${brutes ? `, ${brutes} Hulk${brutes > 1 ? 's' : ''} among them` : ''}!`, 'warn');
  }

  // The Colossus hunkers down (its arms crossed, most of every blow shrugged off) and every so
  // often stands up to smash whoever crowds it, open to harm until it hunkers down again.
  updateBoss(team, dt) {
    const b = G.boss;
    if (!b || b.dead) return;
    b.bossT -= dt;
    const crowd = G.units.some(e => e.team === 0 && !e.dead && !e.inside && !isRanged(e) && !isWorker(e) && Math.abs(e.x - b.x) < 110);
    if (b.shieldWall && b.bossT <= 0 && crowd) {
      b.shieldWall = false;
      b.bossT = 7;
      floatText(b.x, b.y - 160, 'The Colossus rises!', '#ff8a5a');
    } else if (!b.shieldWall && b.bossT <= 0) {
      b.shieldWall = true;
      b.bossT = 12;
    }
    if (b.shieldWall) b.order = { type: 'hold', x: b.order.x || b.x, y: b.order.y || b.y };
    // each Blood Priest near it channels a steady stream of healing into the stone
    const priests = G.units.filter(u => u.team === this.id && !u.dead && u.type === 'cleric' && Math.abs(u.x - b.x) < 260);
    if (priests.length && b.hp < b.maxHp) {
      b.hp = Math.min(b.maxHp, b.hp + BOSS_PRIEST_HEAL * priests.length * dt);
      if (chance(dt * 3)) { const p = pick(priests); spawnBurst(lerp(p.x, b.x, rnd(0.3, 0.9)), b.y - rnd(40, 90), 2, { color: '#ff7a5a', speed: 30, up: 30, g: -40, life: 0.8, size: 2 }); }
    }
    // its priests stay at its back
    for (const u of G.units) if (u.team === this.id && !u.dead && u.type === 'cleric' && u.order.type !== 'hold') setOrder(u, { type: 'hold', x: b.x - team.dir * rnd(160, 230), y: rnd(LANE_TOP + 10, LANE_BOT - 10) });
  }

  // The Abyss: Medusa slithers a little closer every so often (never past your defend line), and
  // her brood claws up out of the ground around her.
  updateMedusaLair(team, dt) {
    const q = G.boss, m = this.c.medusa;
    if (!q || q.dead) return;
    this.creepT = (this.creepT === undefined ? m.creepEvery : this.creepT) - dt;
    if (this.creepT <= 0) {
      this.creepT = m.creepEvery;
      const stop = defendLine(G.teams[0]) + G.teams[0].dir * 320;
      const x = q.order.x + team.dir * m.creep;
      if (team.dir * (x - stop) > 0) setOrder(q, { type: 'hold', x, y: q.order.y });
    }
    this.broodT = (this.broodT === undefined ? m.broodEvery / 2 : this.broodT) - dt;
    if (this.broodT <= 0) {
      this.broodT = m.broodEvery;
      const risen = G.units.filter(u => u.team === this.id && !u.dead && u.type === 'zombie').length;
      for (let k = 0; k < Math.min(3, 8 - risen); k++) {   // (no more than 8 of the dead about her at once)
        const z = raiseZombie(this.id, q.x + rnd(-120, 120), rnd(LANE_TOP + 8, LANE_BOT - 8), null);
        z.maxHp *= 1.2;
        z.hp = z.maxHp;
      }
    }
  }

  // Fresh troops on a timer (beside the boss when there is one, otherwise out of the gate).
  updateReinforce(team, dt) {
    const r = this.c.reinforce;
    this.reinforceT -= dt;
    if (this.reinforceT > 0) return;
    this.reinforceT = r.every;
    const b = G.boss && !G.boss.dead ? G.boss : null;
    for (const [type, n] of Object.entries(r.units)) {
      for (let k = 0; k < n; k++) {
        if (r.maxOf && r.maxOf[type] && G.units.filter(u => u.team === this.id && !u.dead && u.type === type).length >= r.maxOf[type]) continue;
        const x = b ? b.x - team.dir * rnd(60, 160) : undefined, y = b ? rnd(LANE_TOP + 10, LANE_BOT - 10) : undefined;
        const u = b ? campUnit(team, type, x, y, { type: 'hold', x: b.x + team.dir * rnd(40, 90), y }) : spawnUnit(team, type);
        if (type === 'cleric' && b) setOrder(u, { type: 'hold', x: b.x - team.dir * rnd(160, 230), y });
      }
    }
  }
}

// Each frame of a campaign level: its timer, and whether its goal is met.
function campaignTick(dt) {
  const ls = G.lesson, L = ls.L;
  if (L.goal === 'boss') {
    ls.timer -= dt;
    if (G.boss && G.boss.dead) { G.over = { winner: 0 }; G.overT = 0; }
    else if (ls.timer <= 0) { G.over = { winner: 1 }; G.overT = 0; toast('Time is up: the Colossus still stands', 'warn'); }
  }
  if (L.goal === 'survive' && G.ai.roundsWon && G.ai.roundsWon()) { G.over = { winner: 0 }; G.overT = 0; }
  if (L.goal === 'medusa' && !ls.finale && G.boss && G.boss.dead) medusaFalls();
}

// Medusa is dead: her curse shatters both totems, both giants break free, and the Horde throws its
// last reserves at the field. Whoever kills the other side's giant first wins (see killUnit).
function medusaFalls() {
  G.lesson.finale = true;
  const foe = G.teams[1];
  for (const t of G.teams) {
    t.statue.sealed = false;
    if (!t.statue.dead) destroyStatue(t.statue);
  }
  const wave = { sword: 5, spear: 3, archer: 3, giant: 1 };
  for (const [type, n] of Object.entries(wave)) {
    for (let k = 0; k < n; k++) {
      const u = spawnUnit(foe, type);
      setOrder(u, { type: 'stance' });
      u.ownStance = 'attack';
      G.ai.waveUnits.push(u);
    }
  }
  toast('Medusa is slain! Her curse breaks both totems: kill their giant before they kill yours!', 'warn');
}

// ---------------------------------------------------------------- Medusa herself

UNIT_TYPES.medusa = {
  key: 'medusa', name: 'Medusa', cost: 0, time: 0, hp: 9000, speed: 34, pop: 0,
  dmg: 150, range: 300, atkTime: 3.4, aggro: 340, summoned: true,
  desc: 'Queen of the Horde. Her slow gaze turns whatever it falls on to stone.',
};
UPGRADES.medusa = [];
const PETRIFIED_TIME = 22;   // how long a victim stands as a stone statue before crumbling away

// She holds her ground where her commander sends her, turning to stone the costliest enemy in reach.
function updateMedusa(u, dt) {
  const o = u.order;
  u.armor = 0.25;
  // her wounds never close: no priest's healing can undo what you've done to her
  u.wound = Math.min(u.wound === undefined ? u.maxHp : u.wound, u.hp);
  u.hp = u.wound;
  if (u.swing >= 0) return;
  let best = null, bv = -1;
  for (const e of G.units) {
    if (e.team === u.team || e.dead || e.inside || !canTarget(u, e)) continue;
    if (Math.abs(e.x - u.x) > u.range || Math.abs(e.y - u.y) > 120) continue;
    const c = unitCost(G.teams[e.team] || G.teams[0], e.type), v = c.gold + c.mana * 1.5 + rnd(0, 20);
    if (v > bv) { bv = v; best = e; }
  }
  if (best && u.atkCd <= 0) {
    u.facing = best.x >= u.x ? 1 : -1;
    startSwing(u, 'shoot', best);
    return;
  }
  if (o.type === 'hold' && (Math.abs(u.x - o.x) > 6 || Math.abs(u.y - o.y) > 6)) moveTo(u, o.x, o.y, dt);
  else if (!best) u.facing = G.teams[u.team].dir;
}

// The gaze lands: a beam of green light, and its victim is stone (structures just take a blow).
function medusaGaze(u, t) {
  if (!isValidTarget(t)) return;
  G.particles.push({ kind: 'beam', x: u.x + u.facing * 18 * u.scale, y: u.y - 96 * u.scale, x2: t.x, y2: targetAimY(t), vx: 0, vy: 0, life: 0.5, max: 0.5 });
  if (t.isStructure) { damage(t, u.dmg, u); return; }
  petrify(t, u);
}

function petrify(t, src) {
  t.petrified = true;
  t.burnT = 0;
  t.lastStand = 0;
  G.stoned = (G.stoned || 0) + (t.team === 0 ? 1 : 0);
  spawnBurst(t.x, targetAimY(t), 12, { color: '#b8b2a6', speed: 90, up: 50, g: 300, life: 0.8, size: 2.4 });
  if (t.team === 0) floatText(t.x, t.y - 90 * (t.scale || 1), 'Turned to stone!', '#d8d2c4');
  killUnit(t, src);
}

// The end of a level: record it and say what opened up.
function campaignEnd(won) {
  const L = G.lesson.L, i = CAMPAIGN.indexOf(L);
  if (won && !campDone(L.key)) { CAMP.done.push(L.key); saveCamp(); }
  const next = CAMPAIGN[i + 1];
  const msg = won
    ? `<p class="unlock">${next ? (next.soon ? 'The road to the Abyss is open (still under construction).' : `The road leads on to <b>${next.name}</b>.`) : '<b>Medusa is dead and the Horde is broken. The campaign is won!</b>'}</p>`
    : `<p class="unlock">Try again: ${L.counters[0]}.</p>`;
  return { msg, next: next && !next.soon ? next : null };
}

// ---------------------------------------------------------------- the map

function showCampaignMap() {
  G.lesson = null;
  hideLessonBox();
  document.body.className = 'title';
  $('debug').classList.add('hidden');
  const nodes = CAMPAIGN.map((L, i) => ({ L, i, open: campOpen(i), done: campDone(L.key) }));
  const pts = CAMPAIGN.map(L => L.pos);
  // the road: a gentle curve through each node in turn; walked stretches drawn solid
  const seg = (a, b) => { const mx = (a[0] + b[0]) / 2, my = (a[1] + b[1]) / 2 - 18; return `M${a[0]},${a[1]} Q${mx},${my} ${b[0]},${b[1]}`; };
  const road = pts.slice(1).map((p, k) => `<path d="${seg(pts[k], p)}" class="road ${campDone(CAMPAIGN[k].key) ? 'walked' : ''}"/>`).join('');
  const mountains = [[300, 250], [345, 268], [820, 300], [870, 330], [150, 200], [460, 120], [910, 200], [640, 60]]
    .map(([x, y], k) => `<path d="M${x - 40},${y + 30} L${x},${y - 25 - (k % 3) * 8} L${x + 40},${y + 30} Z" class="mtn"/><path d="M${x - 9},${y - 12 - (k % 3) * 6} L${x},${y - 25 - (k % 3) * 8} L${x + 9},${y - 12 - (k % 3) * 6}" class="snow"/>`).join('');
  const trees = [[180, 470], [200, 455], [520, 450], [545, 470], [300, 380], [690, 470], [720, 455], [420, 230], [440, 250], [600, 290]]
    .map(([x, y]) => `<path d="M${x},${y} L${x},${y - 16} M${x},${y - 10} L${x - 6},${y - 16} M${x},${y - 7} L${x + 6},${y - 14}" class="tree"/>`).join('');
  const node = n => {
    const [x, y] = n.L.pos, cls = n.L.soon ? 'soon' : n.done ? 'done' : n.open ? 'open' : 'locked';
    const label = n.L.soon ? '☠' : n.done ? '✓' : n.i + 1;
    return `<g class="node ${cls}" data-level="${n.L.key}" transform="translate(${x},${y})">
      ${cls === 'open' ? '<circle r="27" class="pulse"/>' : ''}
      <circle r="${n.L.soon ? 24 : 19}" class="disc"/>
      <text class="num" y="6">${label}</text>
      <text class="lname" y="${n.L.pos[1] > 420 ? -30 : 40}">${n.L.name}</text>
      ${n.L.soon ? '<text class="ltag" y="56">Under construction</text>' : ''}
    </g>`;
  };
  $('overlay').innerHTML = `
    <div class="card campaign">
      <h1>CAMPAIGN</h1>
      <p class="sub">The road against the Horde · ${CAMP.done.length} of ${CAMPAIGN.filter(l => !l.soon).length} battles won</p>
      <svg class="cmap" viewBox="0 0 1000 540">
        <defs>
          <radialGradient id="cmBg" cx="35%" cy="70%" r="90%"><stop offset="0" stop-color="#3a2c1e"/><stop offset="0.6" stop-color="#22180f"/><stop offset="1" stop-color="#2a0c0e"/></radialGradient>
          <radialGradient id="cmAbyss" cx="92%" cy="10%" r="35%"><stop offset="0" stop-color="rgba(160,20,20,0.55)"/><stop offset="1" stop-color="rgba(160,20,20,0)"/></radialGradient>
        </defs>
        <rect width="1000" height="540" fill="url(#cmBg)"/>
        <rect width="1000" height="540" fill="url(#cmAbyss)"/>
        <path d="M0,330 C120,300 180,360 260,340 S420,250 520,290 S700,380 780,340 S920,250 1000,270" class="river"/>
        ${mountains}${trees}
        <text x="60" y="525" class="region">THE MARCHES</text><text x="560" y="520" class="region">ROTWOOD</text><text x="770" y="30" class="region evil">THE ABYSS</text>
        ${road}
        ${nodes.map(node).join('')}
      </svg>
      <div class="row"><button id="btnCampBack">Back</button></div>
    </div>`;
  $('overlay').classList.remove('hidden');
  $('overlay').querySelectorAll('.node').forEach(g => {
    const L = CAMPAIGN[campIndex(g.dataset.level)];
    g.addEventListener('click', () => { if (L.soon) toast('The Abyss is still under construction'); else if (campOpen(campIndex(L.key))) showCampaignBriefing(L.key); else toast('Win the battle before it to march here'); });
  });
  $('btnCampBack').onclick = () => showMainMenu();
}

function showCampaignBriefing(key) {
  const i = campIndex(key), L = CAMPAIGN[i];
  hideLessonBox();
  document.body.className = 'title';
  $('overlay').classList.remove('hidden');
  const foes = [...(L.goal === 'medusa' ? ['medusa'] : []), ...L.enemyUnits].filter(t => MONSTER_NAMES[t]).slice(0, 8);
  const goal = { statue: L.statueGiant ? 'Destroy their totem, then the giant that breaks out of it' : 'Destroy their totem', survive: 'Survive every round', boss: `Kill the Colossus within ${fmtTime(L.timer)}`, medusa: 'Slay Medusa, then kill their giant before they kill yours' }[L.goal];
  $('overlay').innerHTML = `
    <div class="card briefing camp">
      <p class="sub">Battle ${i + 1} of ${CAMPAIGN.length}</p>
      <h2>${L.name}</h2>
      ${L.brief.map(p => `<p>${p}</p>`).join('')}
      <p class="goal">Goal: <b>${goal}</b></p>
      <div class="foes"><span>The Horde</span>${foes.map(t => `<i>${MONSTER_NAMES[t]}</i>`).join('')}${L.enemyUnits.length > 8 ? '<i>and every other fiend</i>' : ''}</div>
      <ul class="counters">${L.counters.map(c => `<li>${c}</li>`).join('')}</ul>
      <div class="row"><button id="btnBriefBack">Back</button><button id="btnBriefGo" class="big">March</button></div>
    </div>`;
  $('btnBriefBack').onclick = () => showCampaignMap();
  $('btnBriefGo').onclick = () => startCampaignLevel(key);
}
