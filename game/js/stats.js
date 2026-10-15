'use strict';
// Match statistics: a timeline for the end screen, and the balance/debug overlay (F3) with
// autopilot (F4: let an AI play your side, so you can watch AI vs AI at high speed).

const HISTORY_STEP = 5;     // seconds of game time between timeline samples
const DPS_WINDOW = 10;      // seconds the overlay's damage-per-second figures average over
const INCOME_WINDOW = 30;   // seconds the overlay's gold/mana-per-second figures average over
const DEBUG_SPEEDS = [1, 2, 4, 8];
const AUTOPILOTS = [null, 'easy', 'normal', 'hard'];

function initStats() {
  G.history = [];
  G.events = [];
  G.nextSample = 0;
  G.dbg = {
    on: UI_DEBUG.on,
    dmg: [{}, {}],          // cumulative damage dealt, by team and attacker kind
    samples: [],            // one snapshot per second for the rolling averages
    nextSample: 0,
    autopilotLevel: null,
    refreshT: 0,
  };
  G.autopilot = null;
}

// The overlay stays on across rematches once you've opened it.
const UI_DEBUG = { on: false };

// Damage dealt by a unit (or a castle archer) for the DPS table.
function debugDamage(src, amt, structure) {
  if (!G.dbg || src.team === undefined || amt <= 0) return;
  const key = src.castle ? 'castle' : src.type || 'other';
  const d = G.dbg.dmg[src.team];
  d[key] = (d[key] || 0) + amt;
  if (structure) d._structures = (d._structures || 0) + amt;
}

// Something worth marking on the end-screen timeline.
function logEvent(text, team) {
  if (G.events) G.events.push({ t: G.time, text, team });
}

function teamSnapshot(id) {
  const units = G.units.filter(u => u.team === id && !u.dead);
  const t = G.teams[id];
  return {
    gold: G.stats[id].gold,
    mana: G.stats[id].mana,
    kills: G.stats[id].kills,
    army: Math.round(armyPower(id)),
    soldiers: units.filter(u => u.type !== 'miner').length,
    miners: units.filter(u => u.type === 'miner').length,
    upgrades: RESEARCH_TYPES.reduce((n, type) => n + Object.keys(t.upgrades[type]).length, 0),
    statue: t.statue.dead ? 0 : t.statue.hp,
  };
}

// Called every update: timeline every HISTORY_STEP seconds, overlay samples every second.
function recordHistory() {
  if (G.time >= G.nextSample) {
    G.nextSample += HISTORY_STEP;
    G.history.push({ t: G.time, teams: [teamSnapshot(0), teamSnapshot(1)] });
  }
  const d = G.dbg;
  if (G.time >= d.nextSample) {
    d.nextSample += 1;
    d.samples.push({ t: G.time, dmg: d.dmg.map(x => ({ ...x })), gold: G.stats.map(s => s.gold), mana: G.stats.map(s => s.mana) });
    const keep = Math.max(DPS_WINDOW, INCOME_WINDOW) + 2;
    if (d.samples.length > keep) d.samples.shift();
  }
}

// ---------------------------------------------------------------- debug overlay

function toggleDebug() {
  UI_DEBUG.on = G.dbg.on = !G.dbg.on;
  $('debug').classList.toggle('hidden', !G.dbg.on);
  if (!G.dbg.on && !DEBUG_SPEEDS.slice(0, 3).includes(G.speed)) setSpeed(4);
  toast(G.dbg.on ? 'Debug overlay on — F4 autopilot, T now goes up to 8×' : 'Debug overlay off', 'debug');
  refreshDebug();
}

// F4 cycles who plays your side: you, then the Easy, Normal and Hard AI.
function cycleAutopilot() {
  const d = G.dbg, i = AUTOPILOTS.indexOf(d.autopilotLevel);
  d.autopilotLevel = AUTOPILOTS[(i + 1) % AUTOPILOTS.length];
  G.autopilot = d.autopilotLevel === null ? null : d.autopilotLevel === 'easy' ? new PoorAI(0) : new SmartAI(0, d.autopilotLevel);
  toast(d.autopilotLevel ? `Autopilot: ${AI_LEVELS[d.autopilotLevel].name} AI is playing your side` : 'Autopilot off — you have control', 'debug');
  refreshDebug();
}

// Per-second rate of a cumulative value over the last `win` seconds of samples.
function rate(samples, win, get) {
  if (samples.length < 2) return 0;
  const last = samples[samples.length - 1];
  let first = samples[0];
  for (const s of samples) if (last.t - s.t <= win) { first = s; break; }
  const dt = last.t - first.t;
  return dt > 0 ? (get(last) - get(first)) / dt : 0;
}

const DBG_KINDS = ['miner', 'sword', 'archer', 'spear', 'cleric', 'warlock', 'giant', 'golem', 'ninja', 'flyer', 'ballista', 'castle'];
const fmt = (v, p = 0) => (Math.abs(v) < 0.05 && p ? '–' : v.toFixed(p));

function debugTeamHTML(id) {
  const d = G.dbg, S = d.samples, team = G.teams[id];
  const units = G.units.filter(u => u.team === id && !u.dead);
  const goldRate = rate(S, INCOME_WINDOW, s => s.gold[id]);
  const manaRate = rate(S, INCOME_WINDOW, s => s.mana[id]);
  const ai = id === 1 ? G.ai : G.autopilot;
  const who = (id === 1 ? `${AI_LEVELS[G.difficulty].name} AI` : G.autopilot ? `${AI_LEVELS[d.autopilotLevel].name} AI (autopilot)` : 'You') + ` · ${clanOf(team).name}`;
  const rows = DBG_KINDS.map(k => {
    const n = k === 'castle' ? (team.statue.dead ? 0 : team.archers.length) : units.filter(u => u.type === k).length;
    const dps = rate(S, DPS_WINDOW, s => s.dmg[id][k] || 0);
    const total = d.dmg[id][k] || 0;
    if (!n && !total) return '';
    return `<tr><td>${k === 'castle' ? 'Castle archer' : UNIT_TYPES[k].name}</td><td>${n}</td><td>${fmt(dps, 1)}</td><td>${n ? fmt(dps / n, 1) : '–'}</td><td>${Math.round(total)}</td></tr>`;
  }).join('');
  const research = RESEARCH_TYPES.map(t => team.research[t] && upgradeDef(t, team.research[t].key).name).filter(Boolean);
  return `
    <div class="dteam t${id}">
      <h3>${who}</h3>
      <div class="dline"><span>Gold/s</span><b>${goldRate.toFixed(1)}</b><span>Mana/s</span><b>${manaRate.toFixed(1)}</b></div>
      <div class="dline"><span>Bank</span><b>${Math.floor(team.gold)} / ${Math.floor(team.mana)}</b><span>Pop</span><b>${popUsed(team)}/${popCap(team)}</b></div>
      <div class="dline"><span>Army value</span><b>${Math.round(armyPower(id))}</b><span>Kills</span><b>${G.stats[id].kills}</b></div>
      <div class="dline"><span>Stance</span><b>${team.stance}${ai && ai.mode ? ' · ' + ai.mode : ''}</b><span>Upgrades</span><b>${RESEARCH_TYPES.reduce((n, t) => n + Object.keys(team.upgrades[t]).length, 0)}</b></div>
      <table><tr><th>Unit</th><th>#</th><th>DPS</th><th>each</th><th>total</th></tr>${rows}</table>
      <div class="dsmall">Researching: ${research.length ? research.join(', ') : 'nothing'}</div>
    </div>`;
}

function refreshDebug() {
  if (!G.dbg.on) return;
  const s = G.shrine;
  const shrine = s ? `Monolith: ${s.owner < 0 ? 'neutral' : s.owner === 0 ? 'yours' : 'enemy'} (${Math.round(s.cap * 100)}%${s.contest ? ', contested' : ''})` : 'No Monolith';
  $('debug').innerHTML = `
    <div class="dhead">
      <b>Balance / debug</b>
      <span>${Math.floor(G.time / 60)}:${String(Math.floor(G.time % 60)).padStart(2, '0')} · ${G.speed}× · ${G.map.lane.name} · ${G.map.mineLayout.name} · ${shrine}</span>
    </div>
    <div class="dcols">${debugTeamHTML(0)}${debugTeamHTML(1)}</div>
    <div class="dsmall">DPS over the last ${DPS_WINDOW}s, income over ${INCOME_WINDOW}s. F3 hide · F4 autopilot (${G.dbg.autopilotLevel || 'off'}) · T speed up to 8×</div>`;
}

function updateDebug(dt) {
  if (!G.dbg || !G.dbg.on) return;
  G.dbg.refreshT -= dt;
  if (G.dbg.refreshT > 0) return;
  G.dbg.refreshT = 0.5;
  refreshDebug();
}

// ---------------------------------------------------------------- headless balance test
// From the browser console (F12): runBalanceTest('hard', 'normal', 6) plays 6 maps twice (each AI
// gets both sides) as fast as the computer can, and reports who won. Useful after tuning config.js.

// clans: [left, right] clan keys (default: both Base Clan, so AI-vs-AI tests compare AIs fairly)
function playHeadless(seed, left, right, maxTime, clans = ['base', 'base']) {
  setDifficulty(right);
  newGame(seed, clans);
  G.state = 'sim';
  G.autopilot = left === 'easy' ? new PoorAI(0) : new SmartAI(0, left);
  while (!G.over && G.time < maxTime) update(1 / 30);
  return { seed, clans: clans.join(' vs '), winner: G.over ? G.over.winner : 'draw', time: Math.round(G.time), map: `${G.map.lane.key}/${G.map.mineLayout.key}${G.shrine ? '/monolith' : ''}` };
}

// Restores the player's settings and shows the title screen after a test.
function endTest(keep) {
  setDifficulty(keep);
  newGame(randomSeed());
  showTitle();
}

function runBalanceTest(a, b, maps = 6, maxTime = 1500) {
  const keep = AI_DIFFICULTY, games = [], wins = { [a]: 0, [b]: 0, draw: 0 };
  for (let i = 0; i < maps; i++) {
    const seed = randomSeed();
    for (const [l, r] of [[a, b], [b, a]]) {
      const g = playHeadless(seed, l, r, maxTime);
      wins[g.winner === 'draw' ? 'draw' : g.winner === 0 ? l : r]++;
      games.push(g);
    }
  }
  endTest(keep);
  console.table(games);
  return wins;
}

// Clan against clan, both played by the same AI level, each clan on both sides of every map.
// From the console: runClanTest('sword', 'archer', 6) or runClanTest('sword', 'archer', 6, 'normal').
function runClanTest(clanA, clanB, maps = 6, level = 'hard', maxTime = 1500) {
  const keep = AI_DIFFICULTY, games = [], wins = { [clanA]: 0, [clanB]: 0, draw: 0 };
  for (let i = 0; i < maps; i++) {
    const seed = randomSeed();
    for (const clans of [[clanA, clanB], [clanB, clanA]]) {
      const g = playHeadless(seed, level, level, maxTime, clans);
      wins[g.winner === 'draw' ? 'draw' : clans[g.winner]]++;
      games.push(g);
    }
  }
  endTest(keep);
  console.table(games);
  return wins;
}

// ---------------------------------------------------------------- end-screen charts

const CHARTS = [
  { key: 'army', name: 'Army strength', tip: 'Fighting value of each army (cost weighted by remaining health)' },
  { key: 'gold', name: 'Gold gathered', tip: 'Total gold earned so far' },
  { key: 'miners', name: 'Miners', tip: 'Workers alive' },
  { key: 'upgrades', name: 'Upgrades', tip: 'Research completed' },
  { key: 'kills', name: 'Kills', tip: 'Enemy units killed' },
];

function drawChart(canvas, key) {
  const dpr = window.devicePixelRatio || 1;
  const W = canvas.clientWidth || 520, H = canvas.clientHeight || 200;
  canvas.width = W * dpr;
  canvas.height = H * dpr;
  const c = canvas.getContext('2d');
  c.setTransform(dpr, 0, 0, dpr, 0, 0);
  c.clearRect(0, 0, W, H);
  const hist = G.history.concat([{ t: G.time, teams: [teamSnapshot(0), teamSnapshot(1)] }]);
  const pad = { l: 44, r: 12, t: 12, b: 22 };
  const pw = W - pad.l - pad.r, ph = H - pad.t - pad.b;
  const tMax = Math.max(1, G.time);
  const vMax = Math.max(1, ...hist.flatMap(h => h.teams.map(t => t[key]))) * 1.08;
  const X = t => pad.l + (t / tMax) * pw, Y = v => pad.t + ph - (v / vMax) * ph;

  // grid and axis labels
  c.font = '11px "Segoe UI", sans-serif';
  c.fillStyle = 'rgba(230,214,170,0.55)';
  c.strokeStyle = 'rgba(230,214,170,0.12)';
  c.lineWidth = 1;
  c.textAlign = 'right';
  for (let i = 0; i <= 4; i++) {
    const v = (vMax / 4) * i, y = Y(v);
    c.beginPath();
    c.moveTo(pad.l, y);
    c.lineTo(W - pad.r, y);
    c.stroke();
    c.fillText(v >= 1000 ? (v / 1000).toFixed(1) + 'k' : Math.round(v), pad.l - 6, y + 4);
  }
  c.textAlign = 'center';
  const stepMin = Math.max(1, Math.ceil(tMax / 60 / 6));
  for (let m = 0; m * 60 <= tMax; m += stepMin) c.fillText(`${m}m`, X(m * 60), H - 6);

  // key moments
  for (const e of G.events) {
    const x = X(e.t);
    c.strokeStyle = e.team === 0 ? 'rgba(201,160,60,0.45)' : 'rgba(200,70,50,0.45)';
    c.setLineDash([3, 4]);
    c.beginPath();
    c.moveTo(x, pad.t);
    c.lineTo(x, pad.t + ph);
    c.stroke();
    c.setLineDash([]);
  }

  // one line per side: you in gold, the enemy in red
  for (const id of [1, 0]) {
    c.strokeStyle = id === 0 ? '#d9b04a' : '#d0503a';
    c.lineWidth = 2.5;
    c.lineJoin = 'round';
    c.beginPath();
    hist.forEach((h, i) => (i ? c.lineTo(X(h.t), Y(h.teams[id][key])) : c.moveTo(X(h.t), Y(h.teams[id][key]))));
    c.stroke();
  }
}

// A few plain-language observations about why the battle went the way it did.
function battleInsights(won) {
  const out = [], hist = G.history;
  if (hist.length < 2) return out;
  const me = 0, foe = 1, end = teamSnapshot(me), endFoe = teamSnapshot(foe);
  const peak = (id, k) => Math.max(...hist.map(h => h.teams[id][k]));
  const at = t => hist.reduce((best, h) => (Math.abs(h.t - t) < Math.abs(best.t - t) ? h : best), hist[0]);
  const early = at(Math.min(180, G.time / 2));
  if (early.teams[me].miners < early.teams[foe].miners - 1) out.push(`Economy: at ${Math.round(early.t / 60)} min you had ${early.teams[me].miners} miners to the enemy's ${early.teams[foe].miners}. More miners early means a bigger army later.`);
  if (G.stats[me].gold < G.stats[foe].gold * 0.85) out.push(`You gathered ${Math.round(G.stats[me].gold)} gold, the enemy ${Math.round(G.stats[foe].gold)}.`);
  if (peak(me, 'army') < peak(foe, 'army') * 0.8) out.push(`Your strongest army was worth ${peak(me, 'army')}; the enemy's peaked at ${peak(foe, 'army')}.`);
  if (end.upgrades < endFoe.upgrades - 3) out.push(`Research: you finished ${end.upgrades} upgrades, the enemy ${endFoe.upgrades}.`);
  if (G.stats[me].kills < G.stats[foe].kills * 0.7) out.push(`Trades: you killed ${G.stats[me].kills} units and lost about ${G.stats[foe].kills}. Fight near your castle archers, or in formation behind a spear line.`);
  const sh = G.events.find(e => e.text.includes('Monolith') && e.team === foe);
  if (sh) out.push(`The enemy held the Monolith from ${Math.floor(sh.t / 60)}:${String(Math.floor(sh.t % 60)).padStart(2, '0')}, which pays ${SHRINE.gold} gold and ${SHRINE.mana} mana every second.`);
  if (won && !out.length) out.push('A clean win: you matched or beat the enemy in economy, army and research.');
  return out.slice(0, 4);
}

function endScreenHTML(won) {
  const rows = [
    ['Units trained', s => s.trained],
    ['Gold gathered', s => Math.floor(s.gold)],
    ['Mana gathered', s => Math.floor(s.mana)],
    ['Kills', s => s.kills],
  ];
  const peak = id => Math.max(0, ...G.history.map(h => h.teams[id].army));
  const up = id => RESEARCH_TYPES.reduce((n, t) => n + Object.keys(G.teams[id].upgrades[t]).length, 0);
  const insights = battleInsights(won);
  return `
    <table class="cmp">
      <tr><th></th><th class="you">You</th><th class="foe">Enemy</th></tr>
      ${rows.map(([name, f]) => `<tr><td>${name}</td><td>${f(G.stats[0])}</td><td>${f(G.stats[1])}</td></tr>`).join('')}
      <tr><td>Peak army value</td><td>${peak(0)}</td><td>${peak(1)}</td></tr>
      <tr><td>Upgrades researched</td><td>${up(0)}</td><td>${up(1)}</td></tr>
    </table>
    <div class="chartTabs">${CHARTS.map((ch, i) => `<button data-chart="${ch.key}" class="${i ? '' : 'on'}" data-tip="${ch.tip}">${ch.name}</button>`).join('')}</div>
    <canvas id="endChart"></canvas>
    <div class="legend"><span class="you">— You</span><span class="foe">— Enemy</span><span class="ev">┆ key moments</span></div>
    ${insights.length ? `<ul class="insights">${insights.map(i => `<li>${i}</li>`).join('')}</ul>` : ''}`;
}

function wireEndCharts() {
  const cv = $('endChart');
  if (!cv) return;
  const show = key => {
    document.querySelectorAll('.chartTabs button').forEach(b => b.classList.toggle('on', b.dataset.chart === key));
    drawChart(cv, key);
  };
  document.querySelectorAll('.chartTabs button').forEach(b => { b.onclick = () => show(b.dataset.chart); });
  show(CHARTS[0].key);
}
