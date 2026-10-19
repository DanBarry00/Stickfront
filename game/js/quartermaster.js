'use strict';
// Quartermasters: the supply men. They never fight and keep clear of enemies (they're as quick as
// a Swordwrath), and they're always busy. In order of priority:
//   1. restock Gladiators with a new net and javelin
//   2. refit veterans for free, soldiers and workers alike (a miner pauses for it)
//   3. patch up the wounded
//   4. restore worked-out gold deposits on our half
//   5. bring an Architect materials for a free trap
//   6. cheer the miners on (they walk faster and work twice as fast), topping them up before it wears off
// With two, the first looks after the troops (1–3) and the second the workers (2, 4–6); each lends a
// hand with the other's work when it has nothing of its own. Player orders (move, hold, garrison,
// replenish) come first. One job at a time, re-thinking every second in case something more urgent
// comes up.

const QM_TROOP_JOBS = ['gear', 'refit', 'heal'];
const QM_WORK_JOBS = ['refit', 'prospect', 'materials', 'cheer'];
const QM_PRIORITY = { gear: 0, refit: 1, heal: 2, prospect: 3, materials: 4, cheer: 5 };

// A unit too deep in a fight to tend to.
const inMelee = t => G.units.some(e => e.team !== t.team && !e.dead && !e.inside && !isWorker(e) && Math.abs(e.x - t.x) < 90 && Math.abs(e.y - t.y) < 60);
const home = (team, m) => team.dir * (WORLD_W / 2 - m.x) > 0;

// Everything there is to do for this side right now, with its kind and target.
function qmJobs(team) {
  const jobs = [];
  for (const t of G.units) {
    if (t.team !== team.id || t.dead || t.inside || t.type === 'zombie' || t.type === 'quartermaster' || t.onTower || t.rampart >= 0) continue;
    if (inMelee(t)) continue;
    if (t.type === 'gladiator' && (!t.javelin || !t.net)) jobs.push({ kind: 'gear', t, troops: true });
    if (missingUpgrades(t).length) jobs.push({ kind: 'refit', t, troops: !isWorker(t) });
    if (!isWorker(t) && t.hp < t.maxHp * 0.85) jobs.push({ kind: 'heal', t, troops: true });
  }
  for (const m of G.mines) {
    if (home(team, m) && m.gold < m.max * 0.6 && armyPower(1 - team.id, m.x, 300) <= 150) jobs.push({ kind: 'prospect', m, x: m.x });
  }
  if (G.time >= (team.materialsAt || 0) && canTrain(team, 'architect')) {
    const a = G.units.find(q => q.team === team.id && !q.dead && !q.inside && q.type === 'architect' && !(q.materials > 0));
    if (a) jobs.push({ kind: 'materials', t: a });
  }
  // miners at work whose cheer is running out (or never started)
  for (const m of G.units) {
    if (m.team !== team.id || m.dead || m.inside || m.type !== 'miner' || (m.cheerT || 0) > QM.cheerTopUp) continue;
    if (m.mine || m.praying || m.order.type === 'mana') jobs.push({ kind: 'cheer', t: m });
  }
  return jobs;
}

function qmRole(u) {
  const qms = G.units.filter(q => q.team === u.team && !q.dead && q.type === 'quartermaster').sort((a, b) => a.id - b.id);
  return qms.length < 2 ? 'both' : u === qms[0] ? 'troops' : 'workers';
}

// The best job for this Quartermaster: its own kind of work first (by priority, then distance),
// then anything else; never one another Quartermaster is already on.
function qmPick(u, team) {
  const role = qmRole(u);
  const mine = k => role === 'both' || (role === 'troops' ? QM_TROOP_JOBS.includes(k.kind) && (k.kind !== 'refit' || k.troops) : QM_WORK_JOBS.includes(k.kind) && (k.kind !== 'refit' || !k.troops));
  const taken = k => G.units.some(q => q !== u && q.type === 'quartermaster' && !q.dead && q.qmJob && q.qmJob.kind === k.kind && (q.qmJob.t || q.qmJob.m) === (k.t || k.m));
  const dist = k => Math.abs((k.t ? k.t.x : k.x) - u.x);
  const jobs = qmJobs(team).filter(k => !taken(k));
  jobs.sort((a, b) => (mine(b) - mine(a)) || QM_PRIORITY[a.kind] - QM_PRIORITY[b.kind] || dist(a) - dist(b));
  u.qmRole = role;
  return jobs[0] ? { ...jobs[0], time: 0, p: QM_PRIORITY[jobs[0].kind], own: mine(jobs[0]) } : null;
}

// The nearest enemy fighter close enough to worry about.
function qmThreat(u) {
  let best = null, bd = QM.safe;
  for (const e of G.units) {
    if (e.team === u.team || e.dead || e.inside || isWorker(e) || e.stealth) continue;
    const d = Math.abs(e.x - u.x) + Math.abs(e.y - u.y) * 0.5;
    if (d < bd) { bd = d; best = e; }
  }
  return best;
}

function updateQuartermaster(u, dt) {
  const team = G.teams[u.team], o = u.order;
  u.laying = false;   // (kneeling over a patient, a miner's kit or a deposit)
  if (u.swing >= 0) return;
  if (o.type === 'refit') return doRefit(u, dt);
  if (handleBlocked(u, dt)) return;
  // stay clear of the fighting: back off toward the castle
  if (qmThreat(u) && !u.inside) {
    const homeX = team.gateX - team.dir * 30;
    moveTo(u, team.dir * (u.x - homeX) > 0 ? u.x - team.dir * 80 : homeX, u.y, dt);
    return;
  }
  if (o.type === 'move') { if (moveTo(u, o.x, o.y, dt)) u.order = { type: 'hold', x: o.x, y: o.y }; return; }
  if (o.type === 'hold') return;
  if (o.type === 'replenish') return doReplenish(u, team, dt);
  if (o.type === 'garrison' || team.stance === 'garrison' || u.ownStance === 'garrison') return goGarrison(u, dt);
  // re-think every second: a more urgent job (or the end of this one) changes plans
  u.qmThink = (u.qmThink || 0) - dt;
  if (!u.qmJob || !qmStillNeeded(u.qmJob) || u.qmThink <= 0) {
    u.qmThink = 1;
    const best = qmPick(u, team);
    if (!u.qmJob || !qmStillNeeded(u.qmJob) || (best && (best.own && !u.qmJob.own || best.own === u.qmJob.own && best.p < u.qmJob.p))) u.qmJob = best;
  }
  const j = u.qmJob;
  if (!j) return qmIdle(u, team, dt);
  if (j.kind === 'prospect') return qmProspect(u, j, dt);
  const t = j.t;
  if (Math.abs(t.x - u.x) > 34 || Math.abs(t.y - u.y) > 20) {
    j.time = 0;
    moveTo(u, t.x - (t.facing || team.dir) * 22, t.y, dt);
    return;
  }
  u.facing = t.x >= u.x ? 1 : -1;
  j.time += dt;
  if (j.kind === 'gear') {
    t.javelin = 1;
    t.net = 1;
    if (t.team === 0) floatText(t.x, t.y - 84, 'New net and javelin', '#d8c48a');
    u.qmJob = null;
  } else if (j.kind === 'refit') {
    u.laying = true;
    if (isWorker(t)) t.qmHoldT = 0.3;   // a miner stops what it's doing while it's kitted out
    if (j.time < QM.refitTime) return;
    const missing = missingUpgrades(t);
    for (const k of missing) t.perks[k] = true;
    applyPerks(t);
    if (t.team === 0 && missing.length) floatText(t.x, t.y - 84, 'Refitted', '#a7c98a');
    u.qmJob = null;
  } else if (j.kind === 'heal') {
    u.laying = true;
    if (j.time < QM.healTime) return;
    j.time = 0;
    healUnit(t, team.upgrades.quartermaster.salves ? QM.healSalves : QM.heal, null);
    spawnBurst(t.x, t.y - 40, 4, { color: '#f0ece0', speed: 40, up: 50, g: 100, life: 0.5, size: 1.6 });
  } else if (j.kind === 'materials') {
    t.materials = (t.materials || 0) + 1;
    if (t.team === 0) floatText(t.x, t.y - 80, 'Materials for a trap', '#c9b27a');
    team.materialsAt = G.time + (team.upgrades.quartermaster.wagon ? QM.materialsWagon : QM.materialsCd);
    u.qmJob = null;
  } else if (j.kind === 'cheer') {
    // every miner within earshot gets fired up, not just the one he walked over to
    for (const m of G.units) if (m.team === u.team && !m.dead && !m.inside && m.type === 'miner' && Math.abs(m.x - u.x) < QM.cheerR) m.cheerT = QM.cheerTime;
    if (u.team === 0) floatText(u.x, u.y - 80, 'Hurry up, lads!', '#e0c890');
    u.qmJob = null;
  }
}

function qmStillNeeded(j) {
  if (j.kind === 'prospect') return j.m.gold < j.m.max * 0.98;   // (danger there is checked while it works)
  const t = j.t;
  if (t.dead || t.inside) return false;
  if (j.kind === 'gear') return !t.javelin || !t.net;
  if (j.kind === 'refit') return missingUpgrades(t).length > 0;
  if (j.kind === 'heal') return t.hp < t.maxHp * 0.95;
  if (j.kind === 'cheer') return (t.cheerT || 0) <= QM.cheerTopUp;
  return true;   // materials
}

// Restoring a deposit: kneel beside it and work it back up.
function qmProspect(u, j, dt) {
  const m = j.m;
  if (armyPower(1 - u.team, m.x, 300) > 150) { u.qmJob = null; return; }
  const side = u.x <= m.x ? -1 : 1;
  if (!moveTo(u, m.x + side * (m.size * 0.6 + 12), clamp(m.y + 8, LANE_TOP, LANE_BOT), dt)) return;
  u.facing = -side;
  u.laying = true;
  if (u.atkCd <= 0) startSwing(u, 'replenish', m);
}

// Nothing to do: make the rounds between the miners and the back of the army, ready for the next job.
function qmIdle(u, team, dt) {
  u.roundT = (u.roundT || 0) - dt;
  if (u.roundT <= 0 || u.roundX === undefined) {
    u.roundT = rnd(5, 8);
    const army = G.units.filter(t => t.team === u.team && !t.dead && !t.inside && !isWorker(t) && t.type !== 'zombie');
    const miners = G.units.filter(m => m.team === u.team && !m.dead && !m.inside && m.type === 'miner');
    const rear = army.length ? (team.dir > 0 ? Math.min(...army.map(t => t.x)) : Math.max(...army.map(t => t.x))) - team.dir * 60 : defendLine(team) - team.dir * 120;
    const pit = miners.length ? miners.reduce((s, m) => s + m.x, 0) / miners.length : team.statue.x + team.dir * 120;
    u.roundX = u.roundX === rear ? pit : chance(0.5) ? rear : pit;
    u.roundY = rnd(LANE_TOP + 15, LANE_BOT - 15);
  }
  moveTo(u, u.roundX, u.roundY, dt);
}
