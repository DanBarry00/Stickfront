'use strict';
// Two extra ways to play.
//
// Survival: your castle against endless rounds of the Horde coming in from off-screen, each bigger
// and nastier than the last, with a boss every fifth round. You will be overrun in the end: the
// score is how many rounds you held out. It runs on the tutorial's machinery (the lesson box, the
// end screen), with G.lesson.survival set.
//
// Clash: no castles, no economy, one battle. Both sides spend the same budget on troops and their
// upgrades without seeing what the other bought, then both armies appear on an open field and
// fight it out. Unspent mana is left for spells. Afterwards both armies are revealed side by side.

// ================================================================ Survival

const SURV_STORE = 'stickfront.survival';
const SURV = (() => {
  try { return { best: 0, byClan: {}, ...JSON.parse(localStorage.getItem(SURV_STORE) || '{}') }; } catch (e) { return { best: 0, byClan: {} }; }
})();
const saveSurv = () => { try { localStorage.setItem(SURV_STORE, JSON.stringify(SURV)); } catch (e) { /* storage unavailable */ } };

// What the Horde sends, by the round each kind first appears; every fifth round brings a boss.
// Rounds grow in budget (gold's worth of troops) and the fiends get tougher as they go.
const SURVIVAL = {
  first: 60, gap: 25, giveUp: 170,   // seconds to the first round, the breather after one is cleared, and the most a round lasts
  budget: n => 200 + n * 120 + n * n * 10,
  tough: n => 1 + 0.03 * n + (n > 12 ? 0.03 * (n - 12) : 0),   // hp and damage multiplier
  reward: n => 80 + n * 15,          // gold for surviving a round
  pool: [[1, 'sword', 3], [2, 'archer', 2], [3, 'spear', 2], [5, 'warlock', 1], [6, 'cleric', 0.6], [7, 'flyer', 1], [8, 'ninja', 1], [9, 'necromancer', 0.5], [11, 'gladiator', 0.8], [13, 'giant', 0.35]],
};

// The Horde's side: every unit, no economy (it never trains: its rounds simply arrive).
function survivalClans(clanKey) {
  CLANS.surv_e = lessonClan('The Horde', TRAINABLE, { gold: 0, army: [] }, true);
  CLANS.surv_e.pop = 999;
  return [clanKey, 'surv_e'];
}

const SURVIVAL_L = {
  key: 'survival', name: 'Survival', statueGiant: false,
  counters: ['Traps, runes, wards and a wizard tower make every round cheaper to hold'],
  status: ai => ai.status(),
  tips: [
    { text: 'The Horde comes in rounds from the east, bigger each time, with a boss every fifth round. Build your economy while you can: the first round is a minute away.', secs: 25 },
    { text: 'You can\'t win, only hold out. Your Architect\'s traps and your Castle Wizard\'s runes and wards pay for themselves round after round.', secs: 25 },
    { text: 'Every round you survive pays out a little gold. When your population is full, Founding Stones (castle upgrade) raise it.', secs: 25 },
    { text: 'Watch the next round\'s preview in this box, and get ready for what\'s coming.' },
  ],
};

function startSurvival(clanKey) {
  clanKey = resolveClan(clanKey || 'base');
  const keep = { monolith: SETUP.monolith, gold: SETUP.gold };
  SETUP.monolith = 'off';
  SETUP.gold = 'normal';
  newGame(randomSeed(), survivalClans(clanKey));
  SETUP.monolith = keep.monolith;
  SETUP.gold = keep.gold;
  G.monsterTeam = 1;
  G.boss = null;
  const foe = G.teams[1];
  foe.noCastle = true;
  foe.statue.dead = true;
  foe.statue.hp = 0;
  foe.archers = [];
  foe.stance = 'attack';
  G.ai = new SurvivalAI();
  G.lesson = { key: 'survival', L: SURVIVAL_L, survival: true, clanKey, tip: 0, tipT: 0, shownT: 0, hidden: false, statusT: 0 };
  startBattle();
  buildLessonBox();
}

class SurvivalAI {
  constructor() {
    this.id = 1;
    this.round = 0;
    this.roundT = SURVIVAL.first;
    this.roundUnits = [];
    this.spawnQ = [];
    this.next = this.plan(1);
    this.log = ['Survival'];
  }

  left() { return this.roundUnits.filter(u => !u.dead).length + this.spawnQ.length; }
  survived() { return Math.max(0, this.round - (this.left() > 0 ? 1 : 0)); }

  // A round's troops: the boss (every fifth round) and then whatever the budget buys from the
  // kinds unlocked so far, weighted.
  plan(n) {
    const list = [], pool = SURVIVAL.pool.filter(p => p[0] <= n);
    if (n % 5 === 0) {
      const k = (n / 5 - 1) % 4, lap = Math.floor((n / 5 - 1) / 4);
      const boss = [['zombie', 3 + lap, 'brute'], ['giant', 1 + lap], ['giant', 2 + lap], ['golem', 1 + lap, 'colossus']][k];
      for (let i = 0; i < boss[1]; i++) list.push({ type: boss[0], boss: boss[2] || 'boss' });
    }
    let budget = SURVIVAL.budget(n) * (n % 5 === 0 ? 0.6 : 1);
    const total = pool.reduce((s, p) => s + p[2], 0);
    while (budget > 100) {
      let r = Math.random() * total, type = pool[0][1];
      for (const p of pool) if ((r -= p[2]) < 0) { type = p[1]; break; }
      list.push({ type });
      budget -= UNIT_TYPES[type].cost + (UNIT_TYPES[type].mana || 0) * 0.6;
    }
    return list;
  }

  // The preview line: "Ghouls ×6, Bone Archers ×3".
  preview(list) {
    const counts = {};
    for (const p of list) { const name = p.boss === 'colossus' ? 'Colossus' : p.boss === 'brute' ? 'Hulk' : MONSTER_NAMES[p.type] || UNIT_TYPES[p.type].name; counts[name] = (counts[name] || 0) + 1; }
    return Object.entries(counts).map(([k, v]) => `${k} ×${v}`).join(', ');
  }

  status() {
    if (this.round === 0 || (this.left() === 0)) return `Round ${this.round + 1} in ${fmtTime(this.roundT)}${this.round ? ` · ${this.round} survived` : ''}<br><span style="opacity:.8">${this.preview(this.next)}</span>`;
    return `Round ${this.round} · ${this.left()} left · best ${SURV.best}`;
  }

  update(dt) {
    const team = G.teams[this.id];
    team.mana = 600;   // (the fiends' priests and hexers never run dry)
    team.gold = 0;
    // a few at a time, coming in off-screen to the east
    this.spawnT = (this.spawnT || 0) - dt;
    if (this.spawnQ.length && this.spawnT <= 0) {
      this.spawnT = 0.45;
      this.spawn(team, this.spawnQ.shift());
    }
    const cleared = this.round > 0 && this.left() === 0;
    if (cleared && !this.clearedAt) {
      this.clearedAt = true;
      this.roundT = SURVIVAL.gap;
      const pay = SURVIVAL.reward(this.round), me = G.teams[0];
      me.gold += pay;
      G.stats[0].gold += pay;
      toast(`Round ${this.round} survived! +${pay} gold`);
      logEvent(`Round ${this.round} survived`, 0);
    }
    this.roundT -= dt;
    if (this.roundT > 0) return;
    // the next round
    this.round++;
    this.clearedAt = false;
    this.roundT = SURVIVAL.giveUp;
    this.roundUnits = this.roundUnits.filter(u => !u.dead);
    this.upgrade(team, this.round);
    for (const p of this.next) this.spawnQ.push(p);
    const n = this.round, bossy = n % 5 === 0;
    toast(bossy ? `Round ${n}: a boss is coming! ${this.preview(this.next)}` : `Round ${n}: ${this.preview(this.next)}`, 'warn');
    this.next = this.plan(n + 1);
  }

  // The Horde learns as it goes: a couple more of its upgrades every round.
  upgrade(team, n) {
    for (let k = 0; k < 2; k++) {
      const options = [];
      for (const [r, type] of SURVIVAL.pool) {
        if (r > n) continue;
        for (const d of UPGRADES[type]) if (!team.upgrades[type][d.key] && !d.clans && (!d.requires || team.upgrades[type][d.requires])) options.push([type, d.key]);
      }
      if (!options.length) return;
      const [type, key] = pick(options);
      team.upgrades[type][key] = true;
    }
  }

  spawn(team, p) {
    const me = G.teams[0], tough = SURVIVAL.tough(this.round);
    const x = WORLD_W - GATE_X - rnd(30, 220), y = rnd(LANE_TOP + 8, LANE_BOT - 8);   // (just outside where the Horde's gate would be: inside it they'd count as garrisoned)
    let u;
    if (p.type === 'zombie') {
      u = raiseZombie(this.id, x, y, null);
      u.riseT = 0;
      if (p.boss === 'brute') makeHulk(u);
    } else u = campUnit(team, p.type, x, y);
    u.maxHp = Math.round(u.maxHp * tough * (p.boss === 'boss' ? 1.4 : p.boss === 'colossus' ? 5 : 1));
    u.hp = u.maxHp;
    u.dmg *= tough * (p.boss === 'colossus' ? 1.6 : 1);
    if (p.boss === 'colossus') u.scale = GOLEM.scale * 1.5;
    setOrder(u, { type: 'stance' });
    u.ownStance = 'attack';
    if (isGiant(u)) u.obey = 1;
    this.roundUnits.push(u);
    if (p.boss) toast(`${p.boss === 'colossus' ? 'A Colossus' : p.boss === 'brute' ? 'A Hulk' : 'An Abomination'} lumbers out of the east!`, 'warn');
  }
}

// The end of a Survival run: the score, and the best.
function survivalEnd() {
  const n = G.ai.survived(), ck = G.lesson.clanKey;
  const best = n > SURV.best, bestClan = n > (SURV.byClan[ck] || 0);
  if (best) SURV.best = n;
  if (bestClan) SURV.byClan[ck] = n;
  saveSurv();
  const msg = `<p class="unlock">You held out for <b>${n} round${n === 1 ? '' : 's'}</b>${best ? ' · a new best!' : ` · best ${SURV.best}`}${bestClan && !best ? ` · best with the ${CLANS[ck].name}` : ''}</p>`;
  return { msg, next: null };
}

function showSurvivalMenu() {
  document.body.className = 'title';
  const pick = SETUP.clan;
  $('overlay').innerHTML = `
    <div class="card setup surv">
      <h1>SURVIVAL</h1>
      <p class="sub">endless rounds of the Horde · best ${SURV.best}</p>
      <div class="clanPick"><div class="side">
        <h3>Your clan</h3>
        <div class="clanGrid">${['random', ...CLAN_ORDER].map(k => `<button data-clan="${k}" class="${pick === k ? 'on' : ''}">${clanShort(k)}${SURV.byClan[k] ? ` <i class="best">${SURV.byClan[k]}</i>` : ''}</button>`).join('')}</div>
        <div class="clanInfo"><b>${pick === 'random' ? 'Random clan' : CLANS[pick].name}</b>${clanInfoHTML(pick)}</div>
      </div></div>
      <p class="hint">No enemy castle: the Horde comes in rounds from the east, bigger each time, with a boss every fifth round. You will fall in the end. Hold out as long as you can.</p>
      <div class="row"><button id="btnMenu">Back</button><button id="btnStart" class="big">Begin</button></div>
    </div>`;
  $('overlay').classList.remove('hidden');
  const ov = $('overlay');
  ov.querySelectorAll('[data-clan]').forEach(b => { b.onclick = () => { SETUP.clan = b.dataset.clan; saveSetup(); showSurvivalMenu(); }; });
  $('btnStart').onclick = () => startSurvival(SETUP.clan);
  $('btnMenu').onclick = () => showMainMenu();
}

// ================================================================ Clash

// Who can fight in a Clash: troops only (no workers, no clan units), and the unit upgrades of each.
const CLASH = { gold: 2500, mana: 1000, pop: POP_CAP, units: ['sword', 'spear', 'archer', 'gladiator', 'ninja', 'cleric', 'warlock', 'necromancer', 'flyer', 'giant'], gap: 1600 };
const clashUpgrades = type => UPGRADES[type].filter(d => !d.clans && !d.team);

// The computer's ways of spending its budget: unit weights and the upgrades it reaches for.
const CLASH_STYLES = {
  balanced: { name: 'a balanced army', units: { sword: 3, spear: 2, archer: 3, cleric: 1 }, upg: [['sword', 'blades'], ['spear', 'shield'], ['archer', 'arrows'], ['sword', 'helm'], ['cleric', 'pool']] },
  ranged: { name: 'massed ranged', units: { archer: 5, spear: 2, warlock: 1 }, upg: [['archer', 'arrows'], ['archer', 'bow'], ['spear', 'shield'], ['archer', 'quiver'], ['warlock', 'big']] },
  rush: { name: 'a blade rush', units: { sword: 5, gladiator: 2, ninja: 2 }, upg: [['sword', 'blades'], ['sword', 'helm'], ['sword', 'rage'], ['ninja', 'serrated'], ['gladiator', 'manica']] },
  arcane: { name: 'a mage host', units: { spear: 3, cleric: 2, warlock: 2, necromancer: 1 }, upg: [['spear', 'shield'], ['cleric', 'pool'], ['warlock', 'big'], ['warlock', 'pool'], ['necromancer', 'horde']] },
  titan: { name: 'a giant and its escort', units: { giant: 1, archer: 2, spear: 2, cleric: 1 }, upg: [['giant', 'protein'], ['giant', 'blinders'], ['archer', 'arrows'], ['giant', 'stun']], giant: 1 },
  sky: { name: 'Kestrels and spears', units: { flyer: 3, spear: 3, archer: 1 }, upg: [['flyer', 'barbs'], ['flyer', 'scope'], ['spear', 'shield'], ['flyer', 'winch']] },
};

// A purchase: { units: { type: n }, upg: { type: [keys] } } and what it costs.
function clashCost(buy) {
  const team = G.teams[0];
  let gold = 0, mana = 0, pop = 0;
  for (const [type, n] of Object.entries(buy.units)) { const c = unitCost(team, type); gold += c.gold * n; mana += c.mana * n; pop += unitPop(team, type) * n; }
  for (const [type, keys] of Object.entries(buy.upg)) for (const k of keys) { const d = upgradeDef(type, k); gold += d.cost; mana += d.mana || 0; }
  return { gold, mana, pop };
}
const clashFits = buy => { const c = clashCost(buy); return c.gold <= CLASH.gold && c.mana <= CLASH.mana && c.pop <= CLASH.pop; };

// The computer spends its budget in the style's way: upgrades first (up to about a third), then
// troops by weight until gold or population runs out.
function clashAIPick(styleKey) {
  const S = CLASH_STYLES[styleKey], buy = { units: {}, upg: {} };
  for (const [type, key] of S.upg) {
    const d = upgradeDef(type, key);
    if (d.requires && !(buy.upg[type] || []).includes(d.requires)) continue;
    buy.upg[type] = [...(buy.upg[type] || []), key];
    if (clashCost(buy).gold > CLASH.gold * 0.35 || !clashFits(buy)) buy.upg[type].pop();
  }
  if (S.giant) buy.units.giant = S.giant;
  const types = Object.keys(S.units).filter(t => t !== 'giant'), total = types.reduce((s, t) => s + S.units[t], 0);
  for (let guard = 0; guard < 200; guard++) {
    let r = Math.random() * total, type = types[0];
    for (const t of types) if ((r -= S.units[t]) < 0) { type = t; break; }
    buy.units[type] = (buy.units[type] || 0) + 1;
    if (!clashFits(buy)) {
      buy.units[type]--;
      if (!types.some(t => { buy.units[t] = (buy.units[t] || 0) + 1; const ok = clashFits(buy); buy.units[t]--; return ok; })) break;
    }
  }
  for (const t of Object.keys(buy.units)) if (!buy.units[t]) delete buy.units[t];
  return buy;
}

// The planner: your purchase so far (kept between clashes).
let CLASH_BUY = { units: { sword: 4, archer: 3 }, upg: {} };

function showClashMenu() {
  if (!G || G.state === 'play') newGame(randomSeed());
  document.body.className = 'title';
  const team = G.teams[0], cost = clashCost(CLASH_BUY);
  const row = type => {
    const d = UNIT_TYPES[type], c = unitCost(team, type), n = CLASH_BUY.units[type] || 0;
    const upgs = clashUpgrades(type).map(u => {
      const on = (CLASH_BUY.upg[type] || []).includes(u.key), locked = u.requires && !(CLASH_BUY.upg[type] || []).includes(u.requires);
      return `<button class="cu ${on ? 'on' : ''}" data-upg="${type}:${u.key}" ${locked ? 'disabled' : ''} data-tip="<b>${u.name}</b><span class='cost'>${u.cost} gold${u.mana ? ` · ${u.mana} mana` : ''}</span><p>${u.desc}</p>">${u.name}</button>`;
    }).join('');
    return `<div class="crow ${n ? 'some' : ''}">
      <canvas width="64" height="64" data-icon="${type}"></canvas>
      <div class="cname"><b>${d.name}</b><span>${c.gold}${c.mana ? ` · ${c.mana}m` : ''} · pop ${unitPop(team, type)}</span></div>
      <div class="cnum"><button data-dec="${type}">−</button><b>${n}</b><button data-inc="${type}">+</button></div>
      <div class="cupgs">${n ? upgs : '<i>buy one to see its upgrades</i>'}</div>
    </div>`;
  };
  const over = (v, max) => (v > max ? ' class="over"' : '');
  $('overlay').innerHTML = `
    <div class="card clash">
      <h1>CLASH</h1>
      <p class="sub">one battle, no castles · spend your budget, then both armies meet</p>
      <div class="cbudget"><span${over(cost.gold, CLASH.gold)}><i class="ico gold"></i>${CLASH.gold - cost.gold} left</span><span${over(cost.mana, CLASH.mana)}><i class="ico mana"></i>${CLASH.mana - cost.mana} left (spare mana pays for spells)</span><span${over(cost.pop, CLASH.pop)}><i class="ico pop"></i>${cost.pop}/${CLASH.pop}</span></div>
      <div class="clist">${CLASH.units.map(row).join('')}</div>
      <p class="hint">The computer buys its army in secret. Neither side sees the other's until the battle. No castles, castle upgrades or workers.</p>
      <div class="row"><button id="btnMenu">Back</button><button id="btnClear">Clear</button><button id="btnStart" class="big" ${clashFits(CLASH_BUY) && cost.pop ? '' : 'disabled'}>Ready</button></div>
    </div>`;
  $('overlay').classList.remove('hidden');
  const ov = $('overlay');
  ov.querySelectorAll('canvas[data-icon]').forEach(c => drawUnitIcon(c, c.dataset.icon));
  const change = fn => { fn(); showClashMenu(); };
  ov.querySelectorAll('[data-inc]').forEach(b => { b.onclick = () => change(() => {
    const t = b.dataset.inc;
    CLASH_BUY.units[t] = (CLASH_BUY.units[t] || 0) + 1;
    if (!clashFits(CLASH_BUY)) { CLASH_BUY.units[t]--; toast('Not enough budget or population'); }
  }); });
  ov.querySelectorAll('[data-dec]').forEach(b => { b.onclick = () => change(() => {
    const t = b.dataset.dec;
    CLASH_BUY.units[t] = Math.max(0, (CLASH_BUY.units[t] || 0) - 1);
    if (!CLASH_BUY.units[t]) { delete CLASH_BUY.units[t]; delete CLASH_BUY.upg[t]; }
  }); });
  ov.querySelectorAll('[data-upg]').forEach(b => { b.onclick = () => change(() => {
    const [t, k] = b.dataset.upg.split(':'), list = CLASH_BUY.upg[t] = CLASH_BUY.upg[t] || [];
    if (list.includes(k)) { CLASH_BUY.upg[t] = list.filter(x => x !== k && upgradeDef(t, x).requires !== k); return; }
    list.push(k);
    if (!clashFits(CLASH_BUY)) { list.pop(); toast('Not enough budget'); }
  }); });
  $('btnClear').onclick = () => change(() => { CLASH_BUY = { units: {}, upg: {} }; });
  $('btnMenu').onclick = () => showMainMenu();
  $('btnStart').onclick = () => startClash(JSON.parse(JSON.stringify(CLASH_BUY)));
}

// Both armies on an open field, the gap apart, facing each other. replay: the same enemy again.
function startClash(buy, replay) {
  const styleKey = replay ? replay.styleKey : pick(Object.keys(CLASH_STYLES));
  const foeBuy = replay ? replay.foeBuy : clashAIPick(styleKey);
  CLANS.clash_p = lessonClan('Your army', [], { gold: 0, army: [] }, true);
  CLANS.clash_e = lessonClan('The enemy', [], { gold: 0, army: [] }, true);
  const keep = { monolith: SETUP.monolith, gold: SETUP.gold };
  SETUP.monolith = 'off';
  newGame(replay ? replay.seed : randomSeed(), ['clash_p', 'clash_e']);
  SETUP.monolith = keep.monolith;
  SETUP.gold = keep.gold;
  // nothing but the two armies: no castles, statues, miners or traps
  G.units = [];
  G.traps = [];
  G.towers = [];
  G.walls = [];
  const cost = [clashCost(buy), clashCost(foeBuy)];
  [buy, foeBuy].forEach((b, id) => {
    const team = G.teams[id];
    team.noCastle = true;
    team.statue.dead = true;
    team.statue.hp = 0;
    team.archers = [];
    team.gold = 0;
    team.mana = CLASH.mana - cost[id].mana;   // what's left over is for spells
    team.stance = 'defend';
    for (const [type, keys] of Object.entries(b.upg)) for (const k of keys) team.upgrades[type][k] = true;
    const front = WORLD_W / 2 - team.dir * CLASH.gap / 2;
    setMuster(team, front);
    let k = 0;
    for (const type of CLASH.units) {
      for (let i = 0; i < (b.units[type] || 0); i++, k++) {
        const x = front + team.dir * ((RANK_OFF[type] || 0) - Math.floor(i / LANE_ROWS) * 26) + rnd(-8, 8);   // spearton in front, archers and mages behind
        const u = campUnit(team, type, x, rowY(i % LANE_ROWS));
        u.slotY = u.y;
        if (isGiant(u)) u.obey = 1;
      }
    }
  });
  G.clash = { buy, foeBuy, styleKey, seed: G.seed, cost, start: G.time };
  G.ai = new ClashAI(styleKey);
  G.lesson = null;
  startBattle();
  document.body.classList.add('clash');
  G.cam.x = WORLD_W / 2 - CLASH.gap / 2 - 400;
  clampCam();
  toast(`Clash! The enemy fields ${CLASH_STYLES[styleKey].name}. Hold here, or attack (E) when you're ready`);
}

// The enemy commander in a Clash: holds its ground for a moment, then sends everyone in (a mage
// host and massed ranged hold back until you come closer).
class ClashAI {
  constructor(styleKey) {
    this.id = 1;
    this.styleKey = styleKey;
    this.waitT = styleKey === 'ranged' || styleKey === 'arcane' ? 25 : rnd(4, 9);
    this.log = ['Clash: ' + CLASH_STYLES[styleKey].name];
  }
  update(dt) {
    const team = G.teams[this.id];
    team.aiControl = true;
    this.waitT -= dt;
    const mine = G.units.filter(u => u.team === this.id && !u.dead && u.type !== 'zombie');
    const theirs = G.units.filter(u => u.team === 0 && !u.dead);
    const near = theirs.some(e => mine.some(u => Math.abs(u.x - e.x) < 520));
    if (team.stance !== 'attack' && (this.waitT <= 0 || near)) setStance(team, 'attack');
    // with no statue to march on, the attack goes after whoever is left, wherever they are
    if (team.stance !== 'attack' || (this.huntT = (this.huntT || 0) - dt) > 0) return;
    this.huntT = 1.5;
    for (const u of mine) {
      if (u.onTower || (u.order.type === 'attack' && isValidTarget(u.order.target)) || nearestEnemy(u, u.aggro + 60)) continue;
      const t = theirs.filter(e => !e.inside && canTarget(u, e)).sort((a, b) => Math.abs(a.x - u.x) - Math.abs(b.x - u.x))[0];
      if (t) setOrder(u, { type: 'attack', target: t });
    }
  }
}

// The battle ends when one side has nobody left but the dead it raised.
function clashTick() {
  if (!G.clash || G.over) return;
  const alive = id => G.units.some(u => u.team === id && !u.dead && u.type !== 'zombie');
  const a = alive(0), b = alive(1);
  if (a && b) return;
  for (const u of G.units) if (u.type === 'zombie' && !u.dead) { u.hp = 0; killUnit(u, null); }
  G.over = { winner: a ? 0 : 1 };
  G.overT = 0;
}

// After a Clash: both armies side by side, what each lost, and who dealt the damage.
function showClashEnd() {
  const won = G.over.winner === 0, c = G.clash;
  const side = (id, buy) => {
    const team = G.teams[id], dmg = G.dbg.dmg[id];
    const units = Object.entries(buy.units).map(([t, n]) => {
      const left = G.units.filter(u => u.team === id && !u.dead && u.type === t).length;
      return `<tr><td>${UNIT_TYPES[t].name}</td><td>${n}</td><td>${left}</td><td>${Math.round(dmg[t] || 0)}</td></tr>`;
    }).join('');
    const upg = Object.entries(buy.upg).flatMap(([t, ks]) => ks.map(k => upgradeDef(t, k).name));
    const cost = c.cost[id];
    return `<div class="cside"><h3>${id === 0 ? 'Your army' : `Enemy: ${CLASH_STYLES[c.styleKey].name}`}</h3>
      <table><tr><th>Unit</th><th>Fielded</th><th>Left</th><th>Damage</th></tr>${units}</table>
      <p class="cupglist">${upg.length ? upg.join(' · ') : 'No upgrades'}</p>
      <p class="dim">${cost.gold} gold · ${cost.mana} mana spent · ${Math.round(CLASH.mana - cost.mana - team.mana)} mana on spells</p></div>`;
  };
  const time = fmtTime(G.time - c.start);
  G.state = 'over';
  document.body.classList.remove('clash');
  $('overlay').innerHTML = `
    <div class="card wide ${won ? 'win' : 'lose'}">
      <h1>${won ? 'VICTORY' : 'DEFEAT'}</h1>
      <p class="sub">Clash · ${won ? 'the enemy army is destroyed' : 'your army is destroyed'} · ${time}</p>
      <div class="creveal">${side(0, c.buy)}${side(1, c.foeBuy)}</div>
      <div class="row">
        <button id="btnSame" data-tip="The same two armies again">Same armies</button>
        <button id="btnRebuy" class="big">Change my army</button>
        <button id="btnMenuEnd">Main menu</button>
      </div>
    </div>`;
  $('overlay').classList.remove('hidden');
  $('btnSame').onclick = () => startClash(c.buy, c);
  $('btnRebuy').onclick = () => showClashMenu();
  $('btnMenuEnd').onclick = () => { newGame(randomSeed()); showMainMenu(); };
}
