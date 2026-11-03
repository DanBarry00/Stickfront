'use strict';
// Battle modes: full battles with a different way to win, on the tutorial's machinery (the lesson
// box shows the score and timers; G.lesson.mode names the mode).
//
//   King of the Hill  a map with the Monolith: hold it for KOTH.hold seconds in all to win (or
//                     destroy the enemy statue and its giant as usual)
//   Siege             one side's castle is a fortress (trenches, towers, a wizard tower, traps and
//                     runes, wards, a doubled statue); the other gets a war chest. Attack: break it
//                     before the timer runs out. Defend: hold until it does.
//   Escort            push a siege wagon to the enemy statue: it moves only while your soldiers are
//                     with it and no enemy blocks it, and when it arrives it blows the statue apart.
//                     Lose it (or your statue) and you lose.

const MODES_STORE = 'stickfront.modes';
const MODES = (() => {
  try { return { best: {}, wins: {}, ...JSON.parse(localStorage.getItem(MODES_STORE) || '{}') }; } catch (e) { return { best: {}, wins: {} }; }
})();
const saveModes = () => { try { localStorage.setItem(MODES_STORE, JSON.stringify(MODES)); } catch (e) { /* storage unavailable */ } };

const KOTH = { hold: 240 };
const SIEGE = { time: 900, chest: { gold: 3500, mana: 500 }, statueMul: 1.6, stipend: 2 };
const ESCORT = { escortR: 240, blockR: 70, hp: 2600 };

// The modes, as the menu lists them (variant: Siege's two sides).
const BATTLE_MODES = [
  { key: 'koth', name: 'King of the Hill', desc: `Hold the Monolith for ${KOTH.hold / 60} minutes in all to win. Its neutral archers have to fall first. Destroying the enemy statue (and its giant) still wins too.` },
  { key: 'siege', variant: 'attack', name: 'Siege: attack', desc: `The enemy castle is a fortress: two palisaded trenches, archer towers, a wizard tower, traps and runes, wards and a much tougher statue. You get a war chest. Break it in ${SIEGE.time / 60} minutes.` },
  { key: 'siege', variant: 'defend', name: 'Siege: defend', desc: `Your castle is the fortress, and the enemy has a war chest and a steady supply. Hold out for ${SIEGE.time / 60} minutes.` },
  { key: 'escort', name: 'Escort', desc: 'Push a siege wagon to the enemy statue. It only rolls while your soldiers are with it and nothing blocks its way, and when it arrives it blows the statue apart. Lose the wagon, or your statue, and you lose.' },
];
const modeKey = (key, variant) => key + (variant ? ':' + variant : '');
const modeDef = (key, variant) => BATTLE_MODES.find(m => m.key === key && (m.variant || null) === (variant || null));

const MODE_L = {
  koth: {
    name: 'King of the Hill', statueGiant: true,
    counters: ['Take the Monolith early and dig in around it: traps, a tower, wards'],
    status: () => {
      const ls = G.lesson, s = G.shrine, h = ls.hold;
      const who = !s ? '' : s.guarded ? 'Its neutral archers still hold it' : s.owner === 0 ? 'You hold it' : s.owner === 1 ? 'The enemy holds it!' : s.contest ? 'Contested' : 'Nobody holds it';
      return `Monolith: you ${fmtTime(h[0])} / ${fmtTime(KOTH.hold)} · enemy ${fmtTime(h[1])} / ${fmtTime(KOTH.hold)}<br><span style="opacity:.8">${who}</span>`;
    },
    tips: [
      { text: `The Monolith in the middle is the prize: whoever holds it for ${KOTH.hold / 60} minutes in all wins. First its two neutral archers have to come down.`, secs: 25 },
      { text: 'Holding it takes more than soldiers: an Architect\'s traps and a tower near it, and the Castle Wizard\'s wards and runes, make it hard to take back.', secs: 25 },
      { text: 'Only soldiers near it count, and nobody can capture it while it\'s contested. Keep yours there and drive theirs off.' },
    ],
  },
  siege: {
    name: 'Siege', statueGiant: false,
    counters: ['A Castle Wizard senses traps and runes near it, so they can be smashed', 'Giants, Fireballs and ballistas wreck trenches; melee troops bring towers down'],
    status: () => {
      const ls = G.lesson, left = Math.max(0, ls.timer);
      return ls.variant === 'attack' ? `Break the fortress: ${fmtTime(left)} left · their statue ${Math.ceil(G.teams[1].statue.hp)} / ${G.teams[1].statue.max}` : `Hold the fortress: ${fmtTime(left)} to go · your statue ${Math.ceil(G.teams[0].statue.hp)} / ${G.teams[0].statue.max}`;
    },
    tips: [
      { text: 'Attacking: scout first. Bring your Castle Wizard up behind your army to reveal their traps and runes, then smash them before you push.', secs: 25 },
      { text: 'Defending: your Architect and Castle Wizard repair, finish and ward on their own between attacks. Keep them alive.', secs: 25 },
      { text: 'Trenches stop anyone on foot until they hack through. Towers fall to melee troops, and whoever is in them goes down too.' },
    ],
  },
  escort: {
    name: 'Escort', statueGiant: false,
    counters: ['The wagon only rolls with your soldiers near it: keep the army around it', 'Clerics heal it, and a Sanctum nearby keeps it going'],
    status: () => {
      const w = G.lesson.wagon, me = G.teams[0], es = G.teams[1].statue;
      if (!w || w.dead) return 'The wagon is lost';
      const p = clamp((w.x - G.lesson.wagonStart) / (es.x - G.lesson.wagonStart), 0, 1);
      return `Wagon ${Math.round(p * 100)}% of the way · ${Math.ceil(w.hp)} / ${Math.round(w.maxHp)} hp · ${w.pushing ? 'rolling' : w.blocked ? 'blocked!' : 'waiting for an escort'}`;
    },
    tips: [
      { text: 'The siege wagon rolls toward their statue only while your soldiers are near it and no enemy stands in its way. Get it there and it blows the statue apart.', secs: 25 },
      { text: 'The enemy will go for the wagon. Clerics can heal it; lose it and the battle is lost.', secs: 25 },
      { text: 'Enemy trenches stop it: break them down. Traps and runes don\'t touch it, but they catch your escort.' },
    ],
  },
};

// Start one of the battle modes with the clans and difficulty chosen on the menu.
function startModeBattle(key, variant) {
  const keep = { monolith: SETUP.monolith };
  SETUP.monolith = key === 'koth' ? 'on' : 'off';
  newGame(randomSeed(), [resolveClan(SETUP.clan), resolveClan(SETUP.enemy)]);
  SETUP.monolith = keep.monolith;
  const L = MODE_L[key];
  G.lesson = { key, L, mode: key, variant: variant || null, tip: 0, tipT: 0, shownT: 0, hidden: false, statusT: 0, timer: SIEGE.time, hold: [0, 0] };
  if (key === 'koth' && G.ai.setPhase) {
    // the computer goes for the Monolith with a smaller army, and doesn't wait for much of an edge
    G.ai.base = { ...G.ai.base, shrineArmy: 3, shrineEdge: 0.6 };
    G.ai.setPhase(G.ai.phaseKey);
  } else if (key === 'siege') {
    const def = G.teams[variant === 'attack' ? 1 : 0], att = G.teams[variant === 'attack' ? 0 : 1];
    fortify(def);
    att.gold += SIEGE.chest.gold;
    att.mana = Math.min(manaCap(att), att.mana + SIEGE.chest.mana);
  } else if (key === 'escort') {
    const me = G.teams[0];
    const w = spawnUnit(me, 'wagon', me.gateX + me.dir * 160, (LANE_TOP + LANE_BOT) / 2);
    w.maxHp = w.hp = ESCORT.hp;
    w.boss = true;   // (too heavy to snare, stun, hex or frighten)
    w.order = { type: 'hold', x: w.x, y: w.y };
    G.lesson.wagon = w;
    G.lesson.wagonStart = w.x;
  }
  startBattle();
  buildLessonBox();
}

// A Siege's fortress: two palisaded trenches with Spearton on them, archer towers (one of them a
// wizard tower with a Cleric), traps and runes in front (some enchanted, some reinforced), wards,
// more castle archers, a doubled statue, and an Architect and Castle Wizard to keep it all up.
function fortify(team) {
  const st = team.statue;
  st.max = st.hp = STATUE_HP * SIEGE.statueMul;
  for (const k of ['walls', 'walls2', 'tower2']) team.upgrades.architect[k] = true;
  team.upgrades.spear.inspire = true;   // (so its Spearton can stand on the trenches)
  for (let i = 2; i <= (clanOf(team).castleArchers || 3); i++) {
    if (!team.upgrades.castle['archer' + i]) { team.upgrades.castle['archer' + i] = true; team.archers.push(makeCastleArcher(team, team.archers.length)); }
  }
  const outer = campTrench(team, team.edge(1300), true), inner = campTrench(team, team.edge(1080), true);
  for (const [w, n] of [[outer, 3], [inner, 2]]) manWall(team, Array.from({ length: n }, (_, k) => campUnit(team, 'spear', w.x - team.dir * 30, rowY(k * 2))), w);
  const t1 = orderTower(team, team.edge(1000), rowY(0), [], true), t2 = orderTower(team, team.edge(1200), rowY(0), [], true);
  postArcher(campUnit(team, 'archer', t2.x, t2.y + 2), t2);
  t1.wizard = true;
  postMage(campUnit(team, 'cleric', t1.x, t1.y + 2), t1);
  for (let k = 0; k < 3; k++) campUnit(team, 'archer', team.edge(950) - team.dir * k * 20, rowY(k + 1));
  [['spikes', 1400, 1], ['hex', 1450, 4], ['caltrops', 1520, 2], ['bind', 1580, 5], ['mine', 1640, 0], ['dread', 1700, 3], ['snare', 1760, 1], ['tar', 1830, 4]]
    .forEach(([k, x, row], i) => { const t = freeTrap(team.id, k, team.edge(x), rowY(row)); if (i % 2 === 0 && !isRune(k)) t.magic = true; if (i % 2 && isRune(k)) t.reinforced = true; });
  for (const type of ['architect', 'wizard']) if (!G.units.some(u => u.team === team.id && !u.dead && u.type === type)) campUnit(team, type, st.x - team.dir * 60, rowY(type === 'wizard' ? 4 : 1));
  for (const s of [st, outer, inner, t1, t2]) s.ward = wardMax(team, s);
}

// The siege wagon: rolls toward the enemy statue while its escort is near and nothing blocks it.
function updateWagon(u, dt) {
  const team = G.teams[u.team], es = G.teams[1 - u.team].statue;
  const escorted = G.units.some(o => o !== u && o.team === u.team && !o.dead && !o.inside && !isWorker(o) && o.type !== 'zombie' && Math.abs(o.x - u.x) < ESCORT.escortR);
  u.blocked = G.units.some(e => e.team !== u.team && !e.dead && !e.inside && !isFlying(e) && Math.abs(e.x - u.x) < ESCORT.blockR && team.dir * (e.x - u.x) > -10);
  u.pushing = escorted && !u.blocked && !es.dead;
  if (!u.pushing) return;
  u.facing = team.dir;
  moveTo(u, es.x, u.y, dt);
}

// Each frame of a battle mode: its goal and timers.
function modeTick(dt) {
  const ls = G.lesson;
  if (G.over) return;
  const win = w => { G.over = { winner: w }; G.overT = 0; };
  if (ls.mode === 'koth') {
    const s = G.shrine;
    if (s && s.owner >= 0) {
      ls.hold[s.owner] += dt;
      if (ls.hold[s.owner] >= KOTH.hold) { toast(s.owner === 0 ? 'The Monolith is yours for good!' : 'The enemy has held the Monolith long enough', s.owner === 0 ? '' : 'warn'); win(s.owner); }
    }
  } else if (ls.mode === 'siege') {
    ls.timer -= dt;
    if (ls.variant === 'defend') G.teams[1].gold += SIEGE.stipend * dt;   // (the besiegers' supply train)
    if (ls.timer <= 0) win(ls.variant === 'attack' ? 1 : 0);
  } else if (ls.mode === 'escort') {
    const w = ls.wagon, es = G.teams[1].statue;
    if (w.dead) { toast('The siege wagon is destroyed', 'warn'); win(1); return; }
    if (!es.dead && Math.abs(w.x - es.x) < es.halfW + 20) {
      spawnBurst(es.x, LANE_TOP - 60, 40, { color: '#ff9a3a', speed: 260, up: 200, g: 450, life: 1.1, size: 3.5 });
      G.spellFx.push({ kind: 'blast', x: es.x, y: LANE_TOP, r: 160, t: 0, max: 0.7 });
      w.hp = 0;
      killUnit(w, null);
      destroyStatue(es);
      if (!G.over) win(0);
    }
  }
}

// The end of a battle mode: records wins and best times.
function modeEnd(won) {
  const ls = G.lesson, k = modeKey(ls.mode, ls.variant), t = G.time;
  if (won) MODES.wins[k] = (MODES.wins[k] || 0) + 1;
  const timed = won && (ls.mode === 'escort' || (ls.mode === 'siege' && ls.variant === 'attack') || ls.mode === 'koth');
  const best = timed && (!MODES.best[k] || t < MODES.best[k]);
  if (best) MODES.best[k] = t;
  saveModes();
  const msg = won
    ? `<p class="unlock">${best ? `A new best time: <b>${fmtTime(t)}</b>` : timed ? `Best time ${fmtTime(MODES.best[k])}` : 'The fortress held!'} · ${MODES.wins[k]} win${MODES.wins[k] === 1 ? '' : 's'}</p>`
    : `<p class="unlock">${ls.L.counters[0]}.</p>`;
  return { msg, next: null };
}

function showModesMenu() {
  if (!G || G.state === 'play') newGame(randomSeed());
  document.body.className = 'title';
  UI.modePick = UI.modePick || 'koth';
  const clanSide = (field, title) => `
    <div class="side">
      <h3>${title}</h3>
      <div class="clanGrid">${['random', ...CLAN_ORDER].map(k => `<button data-clan="${field}" data-val="${k}" class="${SETUP[field] === k ? 'on' : ''}">${clanShort(k)}</button>`).join('')}</div>
    </div>`;
  const cards = BATTLE_MODES.map(m => {
    const k = modeKey(m.key, m.variant), rec = [MODES.wins[k] ? `${MODES.wins[k]} win${MODES.wins[k] > 1 ? 's' : ''}` : '', MODES.best[k] ? `best ${fmtTime(MODES.best[k])}` : ''].filter(Boolean).join(' · ');
    return `<button class="mode ${UI.modePick === k ? 'play' : ''}" data-mode="${k}"><b>${m.name}</b><span>${m.desc}${rec ? `<br><i class="rec">${rec}</i>` : ''}</span></button>`;
  }).join('');
  $('overlay').innerHTML = `
    <div class="card setup">
      <h1>BATTLE MODES</h1>
      <p class="sub">a full battle with a different way to win</p>
      <div class="modes two">${cards}</div>
      <div class="clanPick">${clanSide('clan', 'Your clan')}${clanSide('enemy', 'Enemy clan')}</div>
      <div class="opts"><div class="opt"><span>Opponent</span>${Object.entries(AI_LEVELS).filter(([k]) => k !== 'easy').map(([k, l]) => `<button data-diff="${k}" class="${k === AI_DIFFICULTY ? 'on' : ''}" data-tip="${l.desc}">${l.name}</button>`).join('')}</div></div>
      <div class="row"><button id="btnMenu">Back</button><button id="btnStart" class="big">Begin</button></div>
    </div>`;
  $('overlay').classList.remove('hidden');
  const ov = $('overlay');
  ov.querySelectorAll('[data-mode]').forEach(b => { b.onclick = () => { UI.modePick = b.dataset.mode; showModesMenu(); }; });
  ov.querySelectorAll('[data-clan]').forEach(b => { b.onclick = () => { SETUP[b.dataset.clan] = b.dataset.val; saveSetup(); showModesMenu(); }; });
  ov.querySelectorAll('[data-diff]').forEach(b => { b.onclick = () => { setDifficulty(b.dataset.diff); showModesMenu(); }; });
  if (AI_DIFFICULTY === 'easy') setDifficulty('normal');   // (the Easy computer doesn't play these modes)
  $('btnStart').onclick = () => { const [key, variant] = UI.modePick.split(':'); startModeBattle(key, variant); };
  $('btnMenu').onclick = () => showMainMenu();
}
