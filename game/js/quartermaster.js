'use strict';
// Quartermasters: the supply men. They never fight and keep clear of enemies (they're as quick as
// a Swordwrath). With the troops they patch up the wounded, refit veterans on the spot for free and
// hand Gladiators a new net and javelin; with the workers they cheer the miners on, restore spent
// gold deposits and bring an Architect materials for a free trap now and then.
//
// Who does what: with two, the first stays with the troops and the second with the workers. A lone
// Quartermaster works with the miners until the troops need him, then stays with them until there's
// nothing left to do. Player orders (move, hold, garrison, replenish) come first.

// The army's to-do list, most urgent first: badly hurt soldiers, Gladiators out of gear, veterans
// missing upgrades, then the lightly hurt. Soldiers in the thick of a fight are left alone.
function troopTasks(team) {
  const tasks = [];
  for (const t of G.units) {
    if (t.team !== team.id || t.dead || t.inside || isWorker(t) || t.type === 'zombie' || t.onTower || t.rampart >= 0) continue;
    if (G.units.some(e => e.team !== team.id && !e.dead && !e.inside && !isWorker(e) && Math.abs(e.x - t.x) < 90 && Math.abs(e.y - t.y) < 60)) continue;   // still fighting
    const f = t.hp / t.maxHp;
    if (f < 0.5) tasks.push({ kind: 'heal', t, p: 0 });
    else if (t.type === 'gladiator' && (!t.javelin || !t.net)) tasks.push({ kind: 'gear', t, p: 1 });
    else if (missingUpgrades(t).length) tasks.push({ kind: 'refit', t, p: 2 });
    else if (f < 0.8) tasks.push({ kind: 'heal', t, p: 3 });
  }
  return tasks;
}

function qmRole(u, team) {
  const qms = G.units.filter(q => q.team === u.team && !q.dead && q.type === 'quartermaster').sort((a, b) => a.id - b.id);
  if (qms.length >= 2) return u === qms[0] ? 'troops' : 'workers';
  if (u.qmRole === 'troops') return troopTasks(team).length ? 'troops' : 'workers';   // stays until the work is done
  return troopTasks(team).some(k => k.p <= 2) ? 'troops' : 'workers';
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
  u.laying = false;   // (kneeling over a patient or a deposit)
  if (u.swing >= 0) return;
  if (o.type === 'refit') return doRefit(u, dt);
  if (handleBlocked(u, dt)) return;
  // stay clear of the fighting: back off toward the castle
  const threat = qmThreat(u);
  if (threat && !u.inside) {
    const home = team.gateX - team.dir * 30;
    moveTo(u, team.dir * (u.x - home) > 0 ? u.x - team.dir * 80 : home, u.y, dt);
    return;
  }
  if (o.type === 'move') { if (moveTo(u, o.x, o.y, dt)) u.order = { type: 'hold', x: o.x, y: o.y }; return; }
  if (o.type === 'hold') return;
  if (o.type === 'replenish') return doReplenish(u, team, dt);
  if (o.type === 'garrison' || team.stance === 'garrison' || u.ownStance === 'garrison') return goGarrison(u, dt);
  u.qmRole = qmRole(u, team);
  if (u.qmRole === 'troops') qmTroops(u, team, dt);
  else qmWorkers(u, team, dt);
}

// ---------------------------------------------------------------- with the troops

function qmTroops(u, team, dt) {
  // keep working on the same patient while it still needs it
  let job = u.qmJob && u.qmJob.role === 'troops' && !u.qmJob.t.dead && !u.qmJob.t.inside ? u.qmJob : null;
  if (job && !qmStillNeeded(job)) job = null;
  if (!job) {
    const tasks = troopTasks(team).filter(k => !G.units.some(q => q !== u && q.type === 'quartermaster' && q.qmJob && q.qmJob.t === k.t));
    tasks.sort((a, b) => a.p - b.p || Math.abs(a.t.x - u.x) - Math.abs(b.t.x - u.x));
    job = tasks[0] ? { role: 'troops', kind: tasks[0].kind, t: tasks[0].t, time: 0 } : null;
    u.qmJob = job;
  }
  if (!job) {
    // nothing to do: wait just behind the army, ready
    const army = G.units.filter(t => t.team === u.team && !t.dead && !t.inside && !isWorker(t) && t.type !== 'zombie');
    const rear = army.length ? (team.dir > 0 ? Math.min(...army.map(t => t.x)) : Math.max(...army.map(t => t.x))) : defendLine(team);
    if (moveTo(u, rear - team.dir * 60, LANE_TOP + 20 + (u.id % 3) * 25, dt)) u.facing = team.dir;
    return;
  }
  const t = job.t;
  if (Math.abs(t.x - u.x) > 34 || Math.abs(t.y - u.y) > 20) { job.time = 0; moveTo(u, t.x - t.facing * 22, t.y, dt); return; }
  u.facing = t.x >= u.x ? 1 : -1;
  u.laying = true;
  job.time += dt;
  if (job.kind === 'heal') {
    if (job.time < QM.healTime) return;
    job.time = 0;
    healUnit(t, team.upgrades.quartermaster.salves ? QM.healSalves : QM.heal, null);
    spawnBurst(t.x, t.y - 40, 4, { color: '#f0ece0', speed: 40, up: 50, g: 100, life: 0.5, size: 1.6 });
  } else if (job.kind === 'refit') {
    if (job.time < QM.refitTime) return;
    const missing = missingUpgrades(t);
    for (const k of missing) t.perks[k] = true;
    applyPerks(t);
    if (t.team === 0 && missing.length) floatText(t.x, t.y - 84, 'Refitted', '#a7c98a');
    u.qmJob = null;
  } else if (job.kind === 'gear') {
    t.javelin = 1;
    t.net = 1;
    if (t.team === 0) floatText(t.x, t.y - 84, 'New net and javelin', '#d8c48a');
    u.qmJob = null;
  }
}

function qmStillNeeded(job) {
  const t = job.t;
  if (job.kind === 'heal') return t.hp < t.maxHp * 0.95;
  if (job.kind === 'gear') return !t.javelin || !t.net;
  return missingUpgrades(t).length > 0;
}

// ---------------------------------------------------------------- with the workers

function qmWorkers(u, team, dt) {
  if (u.qmJob && u.qmJob.role !== 'workers') u.qmJob = null;
  const job = u.qmJob || (u.qmJob = qmWorkerJob(u, team));
  if (!job) {
    // hang about the miners' end of the field
    const miners = G.units.filter(m => m.team === u.team && !m.dead && !m.inside && m.type === 'miner');
    const x = miners.length ? miners.reduce((s, m) => s + m.x, 0) / miners.length : team.statue.x + team.dir * 120;
    moveTo(u, x - team.dir * 30, LANE_BOT - 20 - (u.id % 3) * 15, dt);
    return;
  }
  if (job.kind === 'cheer') {
    const group = G.units.filter(m => m.team === u.team && !m.dead && !m.inside && m.type === 'miner' && Math.abs(m.x - job.x) < QM.cheerR);
    if (!group.length) { u.qmJob = null; return; }
    if (!moveTo(u, job.x, job.y, dt) && Math.abs(u.x - job.x) > 40) return;
    for (const m of group) m.cheerT = QM.cheerTime;
    if (u.team === 0) floatText(u.x, u.y - 80, 'Hurry up, lads!', '#e0c890');
    team.cheerAt = G.time + QM.cheerCd;
    u.qmJob = null;
  } else if (job.kind === 'materials') {
    const a = job.a;
    if (a.dead || a.inside) { u.qmJob = null; return; }
    if (Math.abs(a.x - u.x) > 30 || Math.abs(a.y - u.y) > 20) { moveTo(u, a.x - a.facing * 20, a.y, dt); return; }
    a.materials = (a.materials || 0) + 1;
    if (u.team === 0) floatText(a.x, a.y - 80, 'Materials for a trap', '#c9b27a');
    team.materialsAt = G.time + (team.upgrades.quartermaster.wagon ? QM.materialsWagon : QM.materialsCd);
    u.qmJob = null;
  } else if (job.kind === 'prospect') {
    const m = job.m;
    if (m.gold >= m.max * 0.98 || armyPower(1 - u.team, m.x, 300) > 150) { u.qmJob = null; return; }
    const side = u.x <= m.x ? -1 : 1;
    if (!moveTo(u, m.x + side * (m.size * 0.6 + 12), clamp(m.y + 8, LANE_TOP, LANE_BOT), dt)) return;
    u.facing = -side;
    u.laying = true;
    if (u.atkCd <= 0) startSwing(u, 'replenish', m);
  }
}

// What the worker-side Quartermaster should do next: cheer the miners when it's time, bring materials
// to an Architect when they're ready, otherwise restore the most worked-out deposit on our side.
function qmWorkerJob(u, team) {
  if (G.time >= (team.cheerAt || 0)) {
    const miners = G.units.filter(m => m.team === u.team && !m.dead && !m.inside && m.type === 'miner' && m.mine);
    if (miners.length >= 2) {
      // the spot with the most miners around it
      let best = null, bn = 0;
      for (const m of miners) {
        const n = miners.filter(o => Math.abs(o.x - m.x) < QM.cheerR).length;
        if (n > bn) { bn = n; best = m; }
      }
      if (best) return { role: 'workers', kind: 'cheer', x: best.x, y: best.y };
    }
  }
  if (G.time >= (team.materialsAt || 0) && canTrain(team, 'architect')) {
    const a = G.units.find(q => q.team === u.team && !q.dead && !q.inside && q.type === 'architect' && !(q.materials > 0));
    if (a) return { role: 'workers', kind: 'materials', a };
  }
  const home = m => team.dir * (WORLD_W / 2 - m.x) > 0;
  const spent = G.mines.filter(m => home(m) && m.gold < m.max * 0.6 && armyPower(1 - u.team, m.x, 300) <= 150 &&
    !G.units.some(q => q !== u && q.type === 'quartermaster' && q.qmJob && q.qmJob.m === m))
    .sort((a, b) => a.gold / a.max - b.gold / b.max || Math.abs(a.x - team.statue.x) - Math.abs(b.x - team.statue.x));
  return spent[0] ? { role: 'workers', kind: 'prospect', m: spent[0] } : null;
}
