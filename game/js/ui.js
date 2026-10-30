'use strict';
// Input handling, camera, HUD (training bar, command card, minimap) and menu overlays.

const VIEW = { w: 1280, cssScale: 1, dpr: 1 };
const UI = {
  keys: {}, mouse: { x: 0, y: 0, in: false }, mouseWorld: [0, 0], drag: null,
  hoverMine: null, hoverBuilding: null, placing: null, panel: null,
  last: {}, toastT: 0, cardMode: '',
};
const $ = id => document.getElementById(id);

function resize() {
  const cv = $('cv');
  const w = Math.max(1, window.innerWidth), h = Math.max(1, window.innerHeight);
  VIEW.dpr = Math.min(1.25, window.devicePixelRatio || 1);   // capped: high-DPI full-screen canvases are costly on laptops
  VIEW.cssScale = h / VIEW_H;
  VIEW.w = w / VIEW.cssScale;
  cv.width = Math.round(w * VIEW.dpr);
  cv.height = Math.round(h * VIEW.dpr);
  clampCam();
}

function clampCam() {
  if (!G) return;
  if (!Number.isFinite(G.cam.x)) G.cam.x = 0;
  G.cam.x = clamp(G.cam.x, 0, Math.max(0, WORLD_W - VIEW.w));
}

function toWorld(cx, cy) {
  return [G.cam.x + cx / VIEW.cssScale, cy / VIEW.cssScale];
}

function toast(msg, kind) {
  // while an AI plays your side, its routine "not enough gold" chatter stays quiet
  if (G && G.autopilot && !kind) return;
  if (kind === 'warn') sfx('horn');
  const el = $('toast');
  el.textContent = msg;
  el.className = 'show ' + (kind || '');
  UI.toastT = 2.4;
}

// ---------------------------------------------------------------- picking

function unitAt(wx, wy, team) {
  let best = null, bd = 1e9;
  for (const u of G.units) {
    if (u.dead || (team !== undefined && u.team !== team)) continue;
    if ((u.inside || u.stealth) && u.team !== 0) continue;   // vanished ninjas can't be clicked on
    if (team === 0 && !selectable(u)) continue;   // giants can't be picked without blinders
    const s = u.scale, uy = u.y - unitLift(u) - u.alt;
    const hw = u.type === 'ballista' ? 27 * BALLISTA.drawScale : 14;   // the ballista is a wide engine, crewman included
    if (Math.abs(wx - u.x) < hw * s && wy < uy + 8 && wy > uy - 74 * s) {
      const d = Math.abs(wx - u.x) + Math.abs(wy - (uy - 35)) * 0.3;
      if (d < bd) { bd = d; best = u; }
    }
  }
  return best;
}

function mineAt(wx, wy, includeExhausted) {
  for (const m of G.mines) {
    if (m.gold <= 0 && !includeExhausted) continue;
    const h = m.gold > 0 ? m.size * 1.7 : 30;
    if (Math.abs(wx - m.x) < m.size * 1.2 && wy < m.y + 12 && wy > m.y - h) return m;
  }
  return null;
}

function statueAt(wx, wy) {
  for (const t of G.teams) {
    const s = t.statue;
    if (!s.dead && Math.abs(wx - s.x) < 78 && wy > LANE_TOP - 270 && wy < LANE_TOP + 4) return s;
  }
  return null;
}

function wallAt(wx, wy) {
  return G.walls.find(w => !w.dead && Math.abs(wx - w.x) < 20 && wy > LANE_TOP - 90 && wy < LANE_BOT + 6) || null;
}
function towerAt(wx, wy) {
  return G.towers.find(t => !t.dead && Math.abs(wx - t.x) < (t.mid ? 46 : 28) && wy > t.y - towerH(t) - 20 && wy < t.y + 8) || null;
}

// The player's buildings: one per class of unit (key: its training group), each opening the
// upgrades of every unit it trains. The rampart and tower open the castle's upgrades.
function buildingAt(wx, wy) {
  if (wx < GATE_X + 14 && wy > WALL_TOP - 240 && wy < WALL_TOP + 16) return 'castle';
  // the pit outside the gate: the Giant Pit (the Golem Forge for the Arcane Circle)
  if (Math.abs(wx - GIANT_PIT_X) < 52 && wy > LANE_TOP - 100 && wy < LANE_TOP + 2) return 'giants';
  if (wy < LANE_TOP - 160 || wy > LANE_TOP) return null;
  for (const key of ['infantry', 'mages', 'ranged', 'workers']) if (Math.abs(wx - CLASS_X[key]) < 52) return key;
  return null;
}

function select(units, add) {
  if (!add) G.selection = [];
  for (const u of units) if (!G.selection.includes(u)) G.selection.push(u);
  for (const u of G.units) u.selected = G.selection.includes(u);
  if (G.selection.length) UI.panel = null;   // the command card switches to the selection
}

function selectType(type) {
  select(G.units.filter(u => u.team === 0 && !u.dead && u.type === type && selectable(u)), false);
}

// ---------------------------------------------------------------- commands

const liveSel = () => G.selection.filter(u => !u.dead);
const milSel = () => liveSel().filter(u => !isWorker(u) && !isGiant(u));
// Giants obey nobody directly: only those with Blinders can be selected (for move / hold).
const selectable = u => u.type !== 'zombie' && (!isGiant(u) || (!u.isStatueGiant && !!u.perks.blinders));   // (zombies follow their Necromancer)
const meleeSel = () => liveSel().filter(u => u.type === 'sword' || u.type === 'spear');
const minerSel = () => liveSel().filter(u => u.type === 'miner');
const mageSel = () => liveSel().filter(u => isMage(u));
const archSel = () => liveSel().filter(u => u.type === 'architect');
const builderSelection = () => (G.teams[0].upgrades.architect.walls ? archSel() : []);     // Earthworks: trenches
const fortifierSelection = () => (G.teams[0].upgrades.architect.walls2 ? archSel() : []);  // Palisade
const prospectorSelection = () => liveSel().filter(u => u.type === 'quartermaster');   // (Quartermasters restore deposits)
// Units that can brace: Spearton with Shields (Shield Wall) and Spirit Golems (Hunker Down).
const shieldSelection = () => liveSel().filter(u => (u.type === 'spear' && u.perks.shield) || u.type === 'golem');
const refitSelection = () => liveSel().filter(u => missingUpgrades(u).length);
const starSelection = () => liveSel().filter(u => u.type === 'ninja' && u.perks.stars);

// Ninjas with Throwing Stars: Auto (they pick) → Blade only → Stars only → Auto.
const STAR_MODES = ['auto', 'melee', 'ranged'];
const STAR_MODE_NAMES = { auto: 'Auto', melee: 'Blade', ranged: 'Stars' };
function cycleStarMode() {
  const sel = starSelection();
  if (!sel.length) return;
  const next = STAR_MODES[(STAR_MODES.indexOf(sel[0].starMode) + 1) % STAR_MODES.length];
  for (const u of sel) u.starMode = next;
  toast(`Ninja weapon: ${STAR_MODE_NAMES[next]}${next === 'auto' ? ' (stars for flyers, giants and when wounded)' : ''}`);
}

function issueCommand(wx, wy) {
  const sel = liveSel();
  if (!sel.length) return;
  const me = G.teams[0];
  const marker = (x, y, color) => G.markers.push({ x, y, t: 0, color });

  const foe = unitAt(wx, wy, 1);
  const st = statueAt(wx, wy);
  // a ruin: architects rebuild it cheaply (ours, or the Monolith's tower)
  const ruin = [...G.towers, ...G.walls].find(s => s.ruin && Math.abs(s.x - wx) < (s.isTower ? (s.mid ? 50 : 36) : 22) && (s.isTower ? wy > s.y - 50 && wy < s.y + 10 : wy > LANE_TOP - 30 && wy < LANE_BOT + 6));
  const rebuilders = sel.filter(u => u.type === 'architect');
  if (ruin && rebuilders.length && !foe) {
    if (rebuildStructure(me, ruin, rebuilders)) marker(ruin.x, ruin.isTower ? ruin.y : LANE_BOT, '#c9b27a');
    return;
  }
  // a tower: archers climb into ours (or a free neutral one), architects finish or mend ours,
  // anyone can attack the enemy's
  const tw = towerAt(wx, wy);
  if (tw && !foe) {
    const archers = sel.filter(u => u.type === 'archer'), archs = sel.filter(u => u.type === 'architect');
    const free = tw.team === -1 && towerCrew(tw).every(a => a.team === 0);   // the Monolith's, once nobody else holds it
    if ((tw.team === 0 || free) && archers.length && tw.progress >= 1) {
      const a = archers.sort((p, q) => Math.abs(p.x - tw.x) - Math.abs(q.x - tw.x))[0];
      if (postArcher(a, tw)) marker(tw.x, tw.y, '#9fb4cc');
      else if (me.id === 0) toast(towerCrew(tw).length >= towerSlots(tw) ? 'That tower is full' : 'Clear the tower first');
      return;
    }
    if (canMend(me, tw) && archs.length && (tw.progress < 1 || tw.hp < tw.max)) {
      for (const u of archs) setOrder(u, { type: 'build', wall: tw });
      marker(tw.x, tw.y, '#c9b27a');
      return;
    }
    if (tw.team === 1 || (tw.mid && ![-1, 0].includes(towerHolder(tw)))) {   // the enemy's, or the Monolith's while someone else holds it
      for (const u of sel) setOrder(u, { type: 'attack', target: tw });
      marker(tw.x, tw.y, '#c9533e');
      return;
    }
  }
  // an enemy trap your saboteurs have found
  const trap = G.traps.find(t => t.team === 1 && t.armed && t.spotted[0] && Math.abs(t.x - wx) < 14 && Math.abs(t.y - wy) < 10);
  if (trap && !foe) {
    for (const u of sel) setOrder(u, { type: 'attack', target: trap });
    marker(trap.x, trap.y, '#c9533e');
    return;
  }
  const wall = wallAt(wx, wy);
  const enemyWall = wall && wall.team === 1 && wall.progress >= 1 ? wall : null;
  if (foe || (st && st.team === 1) || enemyWall) {
    const target = foe || enemyWall || st;
    for (const u of sel) setOrder(u, { type: 'attack', target });
    marker(target.x, foe ? foe.y : LANE_TOP + 10, '#c9533e');
    return;
  }
  if (wall && wall.team === 0) {
    // our wall: builders finish or fortify it, soldiers climb up to defend it
    const builders = sel.filter(u => u.type === 'architect');   // architects finish and mend trenches
    if (wall.progress < 1 && builders.length) {
      for (const u of builders) setOrder(u, { type: 'build', wall });
      marker(wall.x, LANE_BOT, '#c9b27a');
      return;
    }
    if (wall.progress >= 1 && wall.hp < wall.max && builders.length) {
      // damaged: builders shovel the earth back up
      for (const u of builders) setOrder(u, { type: 'build', wall });
      marker(wall.x, LANE_BOT, '#c9b27a');
      return;
    }
    const fort = me.upgrades.architect.walls2 ? sel.filter(u => u.type === 'architect') : [];
    if (wall.progress >= 1 && fort.length && wall.tier !== 2) {
      if (reinforceWall(me, wall, fort)) marker(wall.x, LANE_BOT, '#c9b27a');
      return;
    }
    const melee = sel.filter(u => u.type === 'sword' || u.type === 'spear');
    if (wall.progress >= 1 && melee.length && canManWalls(me)) {
      if (manWall(me, melee, wall)) marker(wall.x, LANE_TOP, '#9fb4cc');
      return;
    }
  }
  const mine = mineAt(wx, wy, true);
  if (mine) {
    // saboteurs go and salt it
    const sabs = sel.filter(u => u.type === 'saboteur');
    if (sabs.length && mine.gold > 0) {
      for (const u of sabs) setOrder(u, { type: 'salt', mine });
      marker(mine.x, mine.y, '#f0eee8');
      if (sabs.length === sel.length) return;
    }
    const prospectors = sel.filter(u => u.type === 'quartermaster');
    if (mine.gold < mine.max && prospectors.length) {
      for (const u of prospectors) setOrder(u, { type: 'replenish', mine });
      marker(mine.x, mine.y, '#e8c25a');
      return;
    }
    if (mine.gold > 0) {
      for (const u of sel) {
        if (u.type === 'saboteur') continue;   // already off to salt it
        if (u.type === 'miner') { setMine(u, mine); setOrder(u, { type: 'work' }); }
        else setOrder(u, moveOrder(u, mine.x - me.dir * 40, clamp(u.y, LANE_TOP, LANE_BOT)));
      }
      marker(mine.x, mine.y, '#c99b2a');
      return;
    }
  }
  if (st && st.team === 0) {
    for (const u of sel) {
      if (u.type === 'miner') setOrder(u, { type: 'mana' });
      else setOrder(u, moveOrder(u, st.x + me.dir * 90, clamp(u.y, LANE_TOP, LANE_BOT)));
    }
    marker(st.x, LANE_TOP - 30, TEAM_STYLE[0].crystal);
    return;
  }
  if (wx < GATE_X + 20 && wy > WALL_TOP - 20 && wy < LANE_BOT + 16) {
    for (const u of sel) if (!isGiant(u)) setOrder(u, u.type === 'miner' ? { type: 'pan' } : { type: 'garrison' });   // giants don't fit
    marker(GATE_X - 40, LANE_TOP + 14, '#8fb0c8');
    return;
  }
  // move (attack-move for most units), spread into a small block
  const ty = clamp(wy, LANE_TOP, LANE_BOT);
  sel.forEach((u, i) => {
    const x = wx - me.dir * Math.floor(i / LANE_ROWS) * 24;
    const y = clamp(ty + ((i % LANE_ROWS) - (LANE_ROWS - 1) / 2) * 18, LANE_TOP, LANE_BOT);
    setOrder(u, moveOrder(u, x, y));
  });
  marker(wx, ty, '#96e078');
}

// Move orders are attack-moves: troops fight anything in range on the way and then carry on.
// Ninjas and saboteurs move straight there, since they're meant to slip past and pick their targets.
const PLAIN_MOVERS = ['ninja', 'saboteur'];
const moveOrder = (u, x, y) => ({ type: 'move', x, y, attackMove: !PLAIN_MOVERS.includes(u.type) });

function stopSelected() {
  for (const u of liveSel()) setOrder(u, { type: 'hold', x: u.x, y: u.y });
}

function startPlacing(mode) {
  const me = G.teams[0];
  const need = (list, key, name) => {
    if (list().length) return true;
    if (key === 'prospect') toast('Select a Quartermaster: they restore gold deposits');
    else toast(me.upgrades.architect[key] ? 'Select architects' : `Research ${name} first (⚒ on the Architect button)`);
    return false;
  };
  if (mode === 'wall' && !need(builderSelection, 'walls', 'Earthworks')) return;
  if (mode === 'reinforce' && !need(fortifierSelection, 'walls2', 'Palisade')) return;
  if (mode === 'replenish' && !need(prospectorSelection, 'prospect', 'Prospecting')) return;
  if ((mode === 'tar' || mode === 'mine' || mode === 'tower') && !archSel().length) return toast('Select architects');
  if (mode === 'tar' || mode === 'mine') {
    const cd = (me.trapCd || {})[mode] || 0;
    if (cd > G.time) return toast(`${TRAP[mode].name} ready in ${Math.ceil(cd - G.time)}s`);
  }
  UI.placing = mode;
}

function toggleShieldWall() {
  const s = shieldSelection();
  if (!s.length) {
    if (canTrain(G.teams[0], 'golem')) return toast('Select Spirit Golems or Spearton with Shields');
    return toast(G.teams[0].upgrades.spear.shield ? 'Select Spearton with Shields (refit older ones with R)' : 'Research Shields at the Barracks first');
  }
  const on = !s.every(u => u.shieldWall);
  const broke = on && G.teams[0].mana < GOLEM.hunkerMana;   // golems need mana to hunker down
  if (broke && s.some(u => u.type === 'golem')) toast(`Hunkering down costs ${GOLEM.hunkerMana} mana per second: not enough mana`);
  for (const u of s) {
    if (broke && u.type === 'golem') continue;
    u.shieldWall = on;
    if (on && u.swing >= 0) u.swing = -1;
  }
}

function refitSelected() {
  const s = refitSelection();
  if (!s.length) return toast('Selected units already have every researched upgrade');
  for (const u of s) setOrder(u, { type: 'refit' });
  const n = s.reduce((a, u) => a + missingUpgrades(u).length, 0);
  toast(`Refitting ${s.length} unit${s.length > 1 ? 's' : ''}: ${n} upgrade${n > 1 ? 's' : ''}, ${n * REFIT_COST} gold`);
}

function toggleMinerRecall() {
  const me = G.teams[0];
  me.siege = false;   // taking manual control ends siege mode
  setMinerGarrison(me, !me.minersIn);
  toast(me.minersIn ? 'Miners are retreating into the castle to pan the stream' : 'Miners are back to work');
}

// Siege mode: miners shelter in the castle on their own whenever enemies threaten them.
function toggleSiegeMode() {
  const me = G.teams[0];
  me.siege = !me.siege;
  me.siegeT = 0;
  toast(me.siege ? 'Siege mode on: miners shelter in the castle whenever enemies threaten them' : 'Siege mode off');
}

const MINER_DEFAULTS = ['mine', 'pray', 'pan'];
function cycleMinerDefault() {
  const me = G.teams[0];
  me.minerDefault = MINER_DEFAULTS[(MINER_DEFAULTS.indexOf(me.minerDefault) + 1) % 3];
  toast({ mine: 'New miners will mine gold', pray: 'New miners will pray at the statue', pan: 'New miners will pan the castle stream' }[me.minerDefault]);
}

// ---------------------------------------------------------------- spells

// Necromancers: zombies charge as soon as they rise (on), or guard their master until the attack (off).
function toggleZombieCharge() {
  const necros = liveSel().filter(u => u.type === 'necromancer');
  const on = !necros.every(u => u.zombieCharge);
  for (const u of necros) u.zombieCharge = on;
  toast(on ? 'Zombies will charge the enemy as soon as they rise' : 'Zombies will guard the Necromancer until you attack');
}

function toggleAutoCast() {
  const m = mageSel();
  if (!m.length) return;
  const on = !m.every(u => u.auto);
  for (const u of m) u.auto = on;
  toast(on ? 'Auto-cast on: mages cast and counter enemy spells on their own' : 'Auto-cast off: mages only cast when you tell them to');
}

// Shortest remaining cooldown among selected mages that know a spell (0 = one is ready).
function spellCooldown(k) {
  const S = SPELLS[k];
  const casters = mageSel().filter(u => u.type === S.owner && u.perks[S.perk]);
  if (!casters.length) return null;
  return Math.max(0, Math.min(...casters.map(u => Math.max(u.cd[k] || 0, 0))));
}

function startSpellTarget(k) {
  const S = SPELLS[k], cd = spellCooldown(k);
  if (cd === null) return toast(`Select a ${UNIT_TYPES[S.owner].name} that knows ${S.name}`);
  if (cd > 0) return toast(`${S.name} is recharging (${Math.ceil(cd)}s)`);
  if (G.teams[0].mana < S.mana) return toast(`Not enough mana for ${S.name} (${S.mana})`);
  UI.placing = 'spell:' + k;
}

// Force a cast at a spot: the nearest ready mage that knows the spell takes it, even with auto on.
function castAt(k, wx, wy) {
  const S = SPELLS[k];
  const ready = mageSel().filter(u => u.type === S.owner && u.perks[S.perk] && !(u.cd[k] > 0));
  if (!ready.length) { toast(`${S.name} is recharging`); return false; }
  if (G.teams[0].mana < S.mana) { toast(`Not enough mana for ${S.name} (${S.mana})`); return false; }
  ready.sort((a, b) => Math.abs(a.x - wx) - Math.abs(b.x - wx));
  orderCast(ready[0], k, wx, wy, true);
  G.markers.push({ x: wx, y: clamp(wy, LANE_TOP, LANE_BOT), t: 0, color: S.owner === 'cleric' ? '#f2dc8a' : '#c070ff' });
  return true;
}

// 7 and 8 cast spell slots 1 and 2. With both mage types selected, Shift picks the Warlock's spells.
function spellHotkey(code, shift) {
  const slot = ['Digit7', 'Digit8'].indexOf(code);
  const types = [...new Set(mageSel().map(u => u.type))];
  if (!types.length) return;
  const owner = types.length === 1 ? types[0] : shift ? 'warlock' : 'cleric';
  const k = spellsOf(owner)[slot];
  if (k) startSpellTarget(k);
}

// Commands shown on the card for the current selection. `show` decides visibility,
// `on` optionally highlights the button as active.
const ICONS = {
  attack: '<path d="M3.5 3.5L15 15M20.5 3.5L9 15" stroke-width="2.3"/><path d="M12.6 17.4l4.8-4.8M6.6 12.6l4.8 4.8" stroke-width="2.2"/><path d="M16.6 16.6l3.4 3.4M7.4 16.6L4 20" stroke-width="3"/>',
  defend: '<path d="M12 2l8 3v6c0 5.4-3.6 9.5-8 11-4.4-1.5-8-5.6-8-11V5z" fill="currentColor" stroke="none"/>',
  garrison: '<path d="M2 22V7h3v3h3V7h3v3h2V7h3v3h3V7h3v15z" fill="currentColor" stroke="none"/><path d="M8.5 22v-6a3.5 3.5 0 0 1 7 0v6z" fill="#120d0a" stroke="none"/>',
  advance: '<path d="M5 6l6 6-6 6M12 6l6 6-6 6" stroke-width="2.4"/>',
  retreat: '<path d="M19 6l-6 6 6 6M12 6l-6 6 6 6" stroke-width="2.4"/>',
  hold: '<path d="M8 3h8l5 5v8l-5 5H8l-5-5V8z" fill="currentColor" stroke="none"/><path d="M8 12h8" stroke="#120d0a" stroke-width="2.4"/>',
  manwall: '<path d="M2 22V12h3v2h3v-2h3v2h2v-2h3v2h3v-2h3v10z" fill="currentColor" stroke="none"/><circle cx="12" cy="4" r="2" fill="currentColor" stroke="none"/><path d="M12 6v4M9 8h6" stroke-width="1.6"/>',
  shield: '<rect x="7" y="2" width="10" height="20" rx="1.5" fill="currentColor" stroke="none"/><circle cx="12" cy="12" r="2" fill="#120d0a" stroke="none"/>',
  mine: '<path d="M4 8c4-5 11-5 16 0" stroke-width="2.4"/><path d="M12 5L6 21" stroke-width="2"/>',
  pray: '<path d="M12 2l6 9-6 11-6-11z" fill="currentColor" stroke="none"/>',
  pan: '<ellipse cx="12" cy="13" rx="9" ry="4" fill="currentColor" stroke="none"/><path d="M2 20c3-2 5 2 8 0s5 2 8 0 3-1 4 0" stroke-width="1.6"/>',
  wall: '<path d="M2 20h5l3-9h5l3 9h4" stroke-width="1.8"/><path d="M15 15l6-4M13 12l5-4" stroke-width="1.6"/><path d="M3 20l2 2h0" stroke-width="1.4"/>',
  reinforce: '<path d="M6 21V9l2-3 2 3v12M11 21V8l2-3 2 3v13M16 21V9l2-3 2 3v12" stroke-width="1.6"/><path d="M4 15h18" stroke-width="1.4"/>',
  repair: '<path d="M14 3l-8 14" stroke-width="2"/><path d="M4 15l4 3-2 4-4-3z" fill="currentColor" stroke="none"/><path d="M13 21h9l-3-6h-4z" stroke-width="1.6"/>',
  tar: '<ellipse cx="12" cy="16" rx="9" ry="4" fill="currentColor" stroke="none"/><circle cx="9" cy="10" r="1.6" stroke-width="1.4"/><circle cx="15" cy="7" r="1.2" stroke-width="1.4"/>',
  landmine: '<ellipse cx="11" cy="17" rx="7" ry="3.5" fill="currentColor" stroke="none"/><path d="M13 15q3-6 7-5" stroke-width="1.6"/><path d="M20 4v3M18.5 5.5h3" stroke-width="1.4"/>',
  tower: '<path d="M7 22l2-14h6l2 14M9 8h6M6 8h12v-3h-2v2h-2v-2h-4v2H8V5H6z" stroke-width="1.6"/><path d="M9 15h6" stroke-width="1.4"/>',
  salt: '<path d="M8 4h8l2 5H6z" fill="currentColor" stroke="none"/><path d="M6 9h12v6a6 6 0 0 1-12 0z" stroke-width="1.8"/><path d="M9 21h1M13 22h1M16 20h1" stroke-width="2"/>',
  replenish: '<path d="M4 21l4-7h8l4 7z" fill="currentColor" stroke="none"/><path d="M12 11V3M8 7l4-4 4 4" stroke-width="2"/>',
  refit: '<path d="M4 18h16M7 18v-4h10v4M9 14V9h6v5M12 9V4" stroke-width="2"/>',
  stars: '<path d="M12 2l2.2 7.8L22 12l-7.8 2.2L12 22l-2.2-7.8L2 12l7.8-2.2z" fill="currentColor" stroke="none"/><circle cx="12" cy="12" r="2" fill="#120d0a" stroke="none"/>',
  auto: '<circle cx="12" cy="12" r="8" stroke-width="2"/><path d="M12 7v5l3 3" stroke-width="2"/><path d="M19 4l-2 3M5 4l2 3" stroke-width="1.6"/>',
  zcharge: '<circle cx="9" cy="9" r="5" stroke-width="1.8"/><path d="M7 14v3h4v-3" stroke-width="1.6"/><path d="M14 12h7M18 9l3 3-3 3" stroke-width="2"/>',
};

const COMMANDS = [
  { id: 'attack', label: 'Attack', key: '⇧E', show: s => s.mil, run: () => formGroup(G.teams[0], milSel(), 'attack'), on: () => inGroup('attack') },
  { id: 'defend', label: 'Defend', key: '⇧W', show: s => s.mil, run: () => milSel().forEach(u => setUnitStance(u, 'defend')), on: () => milSel().every(u => u.ownStance === 'defend' && u.order.type === 'stance') },
  { id: 'garrison', label: s => (s.minersOnly ? 'Garrison & pan' : 'Garrison'), key: '⇧Q', show: s => s.canGarrison, run: () => liveSel().forEach(u => setUnitStance(u, 'garrison')) },
  { id: 'advance', label: 'Advance', key: 'C', show: s => s.mil, run: () => formGroup(G.teams[0], milSel(), 'advance'), on: () => inGroup('advance') },
  { id: 'retreat', label: 'Retreat', key: '⇧C', show: s => s.mil, run: () => formGroup(G.teams[0], milSel(), 'retreat'), on: () => inGroup('retreat') },
  { id: 'hold', label: 'Hold', key: 'S', show: () => true, run: stopSelected },
  { id: 'manwall', label: 'Defend trench', key: 'K', show: s => s.melee && s.canWall, run: () => manWall(G.teams[0], meleeSel(), null), on: () => meleeSel().every(u => u.order.type === 'manwall') },
  { id: 'shield', label: s => (s.golemOnly ? 'Hunker down' : 'Shield wall'), key: 'X', show: s => s.shield, run: toggleShieldWall, on: () => shieldSelection().every(u => u.shieldWall) },
  { id: 'mine', label: 'Mine', key: 'I', show: s => s.miner, run: () => minerSel().forEach(u => setOrder(u, { type: 'stance' })) },
  { id: 'pray', label: 'Pray', key: 'O', show: s => s.miner, run: () => minerSel().forEach(u => setOrder(u, { type: 'mana' })) },
  { id: 'pan', label: 'Pan', key: '⇧Q', show: s => s.miner && s.mil, run: () => minerSel().forEach(u => setOrder(u, { type: 'pan' })) },
  { id: 'wall', label: 'Dig trench', key: 'B', show: s => s.build, run: () => startPlacing('wall') },
  { id: 'reinforce', label: 'Palisade', key: 'J', show: s => s.fort, run: () => startPlacing('reinforce') },
  { id: 'repair', label: 'Repair', key: 'Y', show: s => s.arch, run: () => { const w = repairStructures(G.teams[0], archSel(), true); if (w) G.markers.push({ x: w.x, y: w.isTower ? w.y : LANE_BOT, t: 0, color: '#c9b27a' }); else toast('Nothing to repair or rebuild'); } },
  { id: 'tar', label: s => `Tar pit (${trapCost(G.teams[0], 'tar')})`, key: '⇧B', show: s => s.arch, run: () => startPlacing('tar'), cd: 'tar' },
  { id: 'landmine', label: s => `Mine (${trapCost(G.teams[0], 'mine')})`, key: '⇧N', show: s => s.arch, run: () => startPlacing('mine'), cd: 'mine' },
  { id: 'tower', label: `Archer tower (${TOWER.cost})`, key: '⇧Y', show: s => s.arch, run: () => startPlacing('tower') },
  { id: 'replenish', label: 'Replenish', key: 'N', show: s => s.prosp, run: () => startPlacing('replenish') },
  { id: 'salt', label: 'Salt mine', key: 'RMB', show: s => s.sab, run: () => { UI.placing = 'salt'; } },
  { id: 'refit', label: 'Refit', key: 'R', show: () => true, run: refitSelected },
  { id: 'auto', label: 'Auto-cast', key: 'L', show: s => s.mage, run: toggleAutoCast, on: () => mageSel().every(u => u.auto) },
  { id: 'zcharge', label: 'Zombies charge', key: 'L', show: s => s.necro, run: toggleZombieCharge, on: () => liveSel().filter(u => u.type === 'necromancer').every(u => u.zombieCharge) },
  { id: 'stars', label: s => `Weapon: ${STAR_MODE_NAMES[s.stars]}`, key: 'M', show: s => !!s.stars, run: cycleStarMode, on: () => starSelection().every(u => u.starMode === 'ranged') },
];

// Are all selected soldiers marching in a formation with this mode?
const inGroup = mode => milSel().length > 0 && milSel().every(u => u.order.type === 'group' && u.order.g.mode === mode);

// Triple-click: everyone currently on the attack (charging, marching or ordered onto a target).
function isAttacking(u) {
  if (u.dead || u.type === 'miner' || isGiant(u)) return false;
  const o = u.order;
  if (o.type === 'attack') return true;
  if (o.type === 'group') return o.g.mode !== 'retreat';
  if (o.type === 'stance') return (u.ownStance || G.teams[u.team].stance) === 'attack';
  return false;
}

function selectionCaps() {
  const me = G.teams[0];
  return {
    mil: milSel().length > 0,
    melee: meleeSel().length > 0,
    miner: minerSel().length > 0,
    canWall: canManWalls(me),
    shield: shieldSelection().length > 0,
    golemOnly: shieldSelection().length > 0 && shieldSelection().every(u => u.type === 'golem'),
    build: builderSelection().length > 0,
    arch: archSel().length > 0,
    fort: fortifierSelection().length > 0,
    prosp: prospectorSelection().length > 0,
    mage: mageSel().length > 0,
    stars: starSelection().length ? starSelection()[0].starMode : null,
    sab: liveSel().some(u => u.type === 'saboteur'),
    necro: liveSel().some(u => u.type === 'necromancer'),
    canGarrison: liveSel().some(u => !isGiant(u)),   // giants are too big for the castle
    minersOnly: liveSel().length > 0 && liveSel().every(u => u.type === 'miner'),
    spells: Object.keys(SPELLS).filter(k => mageSel().some(u => u.type === SPELLS[k].owner && u.perks[SPELLS[k].perk])),
  };
}

function runCommand(id) {
  if (id.startsWith('spell:')) {
    if (liveSel().length) startSpellTarget(id.slice(6));
    return;
  }
  const c = COMMANDS.find(c => c.id === id);
  if (c && liveSel().length) c.run();
}

// ---------------------------------------------------------------- input

function placeAt(wx, wy, keep) {
  const me = G.teams[0];
  if (UI.placing === 'wall') {
    if (placeWall(me, wx, builderSelection()) && !keep) UI.placing = null;
  } else if (UI.placing === 'tar' || UI.placing === 'mine') {
    const t = orderTrap(me, UI.placing, wx, clamp(wy, LANE_TOP + 4, LANE_BOT - 4), archSel());
    if (t) { G.markers.push({ x: t.x, y: t.y, t: 0, color: '#c9b27a' }); UI.placing = null; }
  } else if (UI.placing === 'tower') {
    const t = orderTower(me, wx, clamp(wy, LANE_TOP + 4, LANE_BOT - 4), archSel());
    if (t) { G.markers.push({ x: t.x, y: t.y, t: 0, color: '#c9b27a' }); UI.placing = null; }
  } else if (UI.placing === 'flag') {
    setMuster(me, wx);
    toast('Muster point set: newly trained soldiers gather here');
    UI.placing = null;
  } else if (UI.placing.startsWith('spell:')) {
    if (castAt(UI.placing.slice(6), wx, wy)) UI.placing = null;
  } else if (UI.placing === 'reinforce') {
    if (reinforceWall(me, wallAt(wx, wy), fortifierSelection())) UI.placing = null;
  } else if (UI.placing === 'salt') {
    const m = mineAt(wx, wy, false);
    if (!m) return toast('Click a gold deposit');
    for (const u of liveSel().filter(u => u.type === 'saboteur')) setOrder(u, { type: 'salt', mine: m });
    G.markers.push({ x: m.x, y: m.y, t: 0, color: '#f0eee8' });
    UI.placing = null;
  } else if (UI.placing === 'replenish') {
    const m = mineAt(wx, wy, true);
    if (!m) return toast('Click a gold deposit');
    if (m.gold >= m.max) return toast('That deposit is already full');
    for (const u of prospectorSelection()) setOrder(u, { type: 'replenish', mine: m });
    G.markers.push({ x: m.x, y: m.y, t: 0, color: '#e8c25a' });
    UI.placing = null;
  }
}

function initInput() {
  const cv = $('cv');
  cv.addEventListener('contextmenu', e => e.preventDefault());
  cv.addEventListener('mousedown', e => {
    if (G.state !== 'play') return;
    const [wx, wy] = toWorld(e.clientX, e.clientY);
    if (UI.placing) {
      if (e.button === 0) placeAt(wx, wy, e.shiftKey);
      else if (e.button === 2) UI.placing = null;
      return;
    }
    if (e.button === 0) UI.drag = { x0: wx, y0: wy, x1: wx, y1: wy, sx: e.clientX, sy: e.clientY, active: false, shift: e.shiftKey };
    else if (e.button === 2) issueCommand(wx, wy);
  });
  window.addEventListener('mousemove', e => {
    UI.mouse.x = e.clientX;
    UI.mouse.y = e.clientY;
    UI.mouse.in = true;
    if (UI.drag && Math.abs(e.clientX - UI.drag.sx) + Math.abs(e.clientY - UI.drag.sy) > 6) UI.drag.active = true;
  });
  document.addEventListener('mouseleave', () => { UI.mouse.in = false; });
  window.addEventListener('mouseup', e => {
    if (e.button !== 0 || !UI.drag) return;
    const d = UI.drag;
    UI.drag = null;
    if (G.state !== 'play') return;
    if (d.active) {
      const xa = Math.min(d.x0, d.x1), xb = Math.max(d.x0, d.x1), ya = Math.min(d.y0, d.y1), yb = Math.max(d.y0, d.y1);
      const hit = G.units.filter(u => {
        if (u.team !== 0 || u.dead || !selectable(u)) return false;
        const uy = u.y - (u.onWall ? wallHeight(u.onWall) : 0) - u.alt;
        return u.x >= xa && u.x <= xb && uy >= ya && uy - 30 <= yb;
      });
      select(hit, d.shift);
    } else {
      const u = unitAt(d.x0, d.y0, 0);
      if (u) {
        if (d.shift && G.selection.includes(u)) select(G.selection.filter(s => s !== u), false);
        else select([u], d.shift);
      } else {
        const b = buildingAt(d.x0, d.y0);
        if (b) openPanel(b);
        else if (!d.shift) select([], false);
      }
    }
  });
  cv.addEventListener('click', e => {
    if (G.state !== 'play' || e.detail < 3) return;
    const att = G.units.filter(u => u.team === 0 && isAttacking(u));
    select(att, false);
    toast(att.length ? `Selected ${att.length} attacking unit${att.length > 1 ? 's' : ''}` : 'No units are attacking');
  });
  cv.addEventListener('dblclick', e => {
    if (G.state !== 'play') return;
    const [wx, wy] = toWorld(e.clientX, e.clientY);
    const u = unitAt(wx, wy, 0);
    if (!u) return;
    select(G.units.filter(o => o.team === 0 && !o.dead && selectable(o) && o.type === u.type && o.x > G.cam.x && o.x < G.cam.x + VIEW.w), false);
  });
  cv.addEventListener('wheel', e => {
    G.cam.x += (Math.abs(e.deltaX) > Math.abs(e.deltaY) ? e.deltaX : e.deltaY) * 1.2;
    clampCam();
    e.preventDefault();
  }, { passive: false });

  window.addEventListener('keydown', e => {
    UI.keys[e.code] = true;
    if (e.code === 'Tab') e.preventDefault();
    if (G.state !== 'play') return;
    const me = G.teams[0];
    const trainKey = UNIT_ORDER.find(t => trainCode(UNIT_TYPES[t]) === e.code);
    if (trainKey) { queueUnit(me, trainKey); return; }
    // Shift + Q/W/E give the order to the selected units only; plain Q/W/E command the whole army.
    if (e.shiftKey && e.code === 'KeyZ') { toggleSiegeMode(); return; }
    if (e.shiftKey && e.code === 'KeyB') { startPlacing('tar'); return; }     // architects: tar pit
    if (e.shiftKey && e.code === 'KeyN') { startPlacing('mine'); return; }    // mine
    if (e.shiftKey && e.code === 'KeyY') { startPlacing('tower'); return; }   // archer tower
    if (e.shiftKey && ['KeyQ', 'KeyW', 'KeyE', 'KeyC'].includes(e.code)) {
      runCommand({ KeyQ: 'garrison', KeyW: 'defend', KeyE: 'attack', KeyC: 'retreat' }[e.code]);
      return;
    }
    switch (e.code) {
      case 'KeyQ': setStance(me, 'garrison'); break;
      case 'KeyW': setStance(me, 'defend'); break;
      case 'KeyE': setStance(me, 'attack'); break;
      case 'KeyZ': toggleMinerRecall(); break;
      case 'KeyG': UI.placing = 'flag'; break;
      case 'KeyC': runCommand('advance'); break;
      case 'KeyK': runCommand('manwall'); break;
      case 'KeyL': runCommand(mageSel().length ? 'auto' : 'zcharge'); break;
      case 'KeyM': runCommand('stars'); break;
      case 'Digit7': case 'Digit8': spellHotkey(e.code, e.shiftKey); break;
      case 'KeyI': runCommand('mine'); break;
      case 'KeyO': runCommand('pray'); break;
      case 'KeyF': selectType('sword'); break;
      case 'KeyV': selectType('miner'); break;
      case 'KeyS': stopSelected(); break;
      case 'KeyB': startPlacing('wall'); break;
      case 'KeyJ': startPlacing('reinforce'); break;
      case 'KeyY': runCommand('repair'); break;
      case 'KeyN': startPlacing('replenish'); break;
      case 'KeyX': toggleShieldWall(); break;
      case 'KeyR': refitSelected(); break;
      case 'KeyU': {
        // cycle through the buildings this clan can use (and the castle)
        const open = [...TRAIN_GROUPS.filter(g => g.types.some(t => canTrain(G.teams[0], t))).map(g => g.key), 'castle'], i = open.indexOf(UI.panel);
        openPanel(open[(i + 1) % open.length]);
        break;
      }
      case 'KeyP': togglePause(); break;
      case 'KeyT': cycleSpeed(); break;
      case 'KeyH': toggleHelp(); break;
      case 'F3': e.preventDefault(); toggleDebug(); break;
      case 'F4': e.preventDefault(); if (G.dbg.on) cycleAutopilot(); break;
      case 'Escape':
        if (UI.placing) UI.placing = null;
        else if (!$('help').classList.contains('hidden')) toggleHelp();
        else if (G.paused) togglePause();
        else if (UI.panel) closePanel();
        else if (G.selection.length) select([], false);
        else togglePause();
        break;
      case 'Space': {
        e.preventDefault();
        const sel = G.selection;
        const x = sel.length ? sel.reduce((a, u) => a + u.x, 0) / sel.length : me.statue.x;
        G.cam.x = x - VIEW.w / 2;
        clampCam();
        break;
      }
      case 'KeyA':
        if (e.ctrlKey) { e.preventDefault(); select(G.units.filter(u => u.team === 0 && !u.dead && selectable(u)), false); }
        break;
    }
  });
  window.addEventListener('keyup', e => { UI.keys[e.code] = false; });
  window.addEventListener('blur', () => { UI.keys = {}; UI.mouse.in = false; });

  const mm = $('minimap');
  const mmJump = e => {
    const r = mm.getBoundingClientRect();
    G.cam.x = ((e.clientX - r.left) / r.width) * WORLD_W - VIEW.w / 2;
    clampCam();
  };
  mm.addEventListener('mousedown', e => {
    mmJump(e);
    const move = ev => mmJump(ev);
    const up = () => { window.removeEventListener('mousemove', move); window.removeEventListener('mouseup', up); };
    window.addEventListener('mousemove', move);
    window.addEventListener('mouseup', up);
  });

  // tooltips for anything with data-tip
  document.addEventListener('mouseover', e => {
    const el = e.target.closest && e.target.closest('[data-tip]');
    if (el) showTip(el); else hideTip();
  });
}

function updateCamera(dt) {
  if (G.state === 'title') {
    G.cam.x = (Math.sin(RT * 0.07) * 0.5 + 0.5) * Math.max(0, WORLD_W - VIEW.w);
    return;
  }
  let v = 0;
  if (UI.keys.ArrowLeft || UI.keys.KeyA) v -= 1;
  if (UI.keys.ArrowRight || UI.keys.KeyD) v += 1;
  if (UI.mouse.in && !UI.drag) {
    if (UI.mouse.x < 10) v -= 1;
    else if (UI.mouse.x > window.innerWidth - 10) v += 1;
  }
  G.cam.x += v * 950 * dt;
  clampCam();
  const [mx, my] = toWorld(UI.mouse.x, UI.mouse.y);
  UI.mouseWorld = [mx, my];
  if (UI.drag) {
    UI.drag.x1 = mx;
    UI.drag.y1 = my;
  }
  const overCanvas = UI.mouse.in && document.elementFromPoint(UI.mouse.x, UI.mouse.y) === $('cv');
  UI.hoverMine = overCanvas ? mineAt(mx, my, true) : null;
  UI.hoverBuilding = overCanvas && !UI.placing && !unitAt(mx, my, 0) ? buildingAt(mx, my) : null;
  $('cv').style.cursor = UI.hoverBuilding ? 'pointer' : UI.placing ? 'crosshair' : 'default';
}

// ---------------------------------------------------------------- tooltips

const CMD_TIPS = {
  attack: 'These units march on the enemy statue together: spearton in front, swordwrath behind, archers and mages at the back, at the pace of the slowest (slower still behind a shield wall). They break ranks to fight anything close. (The army-wide Attack button sends everyone at full speed instead.)',
  defend: 'These units hold the defend line at your muster point (or in front of your statue).',
  garrison: s => (s.minersOnly ? 'These miners go into the castle and pan the stream (up to 5): 1 gold + 1 mana per tick.' : s.miner ? 'These units go into the castle: soldiers heal there, and miners pan the stream (up to 5) for 1 gold + 1 mana per tick.' : 'These units go into the castle and heal.'),
  advance: 'March forward together in formation, holding ranks and fighting only what is in reach. The line halts while it fights.',
  retreat: 'Fall back toward the castle together, facing the enemy and still fighting anything in reach.',
  hold: 'Stop and hold this spot, fighting anything that comes close.',
  manwall: `Melee troops climb onto the rampart of your nearest finished trench (one row, ${WALL_GUARDS} per trench). Blows against them are split half to the rampart.`,
  shield: 'Spearton brace behind their shields, Spirit Golems hunker down: no attacks, half speed, big damage reduction, and enemies prefer to hit them.',
  mine: 'Go back to mining gold.',
  pray: 'Kneel at the statue and pray for mana (4 at a time).',
  pan: 'Go into the castle and pan the stream for gold and mana (5 at a time).',
  wall: `Mark out a trench (${WALL_COST} gold). Architects (with Earthworks) dig it and pile up an earth rampart behind it.`,
  tar: `Lay a hidden tar pit: the first enemy on foot to step on it springs a pool of tar that slows everyone wading through it for ${TRAP.tar.poolTime}s. Arcane Circle tar burns too. Not past the middle; ${TRAP.lineMax} to a line across the lane.`,
  landmine: `Bury a hidden mine: the first enemy on foot to step on it blows up everyone nearby (${TRAP.mine.dmg} damage at the centre, more for the Arcane Circle). Ninjas, saboteurs and flyers don't set traps off.`,
  tower: `Raise an archer tower (${TOWER.cost} gold). Right-click it with an archer to post them: +${TOWER.range} range, and arrows hurt them less. If melee troops wreck it, the archer dies in the collapse.`,
  repair: 'Send the selected architects to mend your most damaged trench or tower (the Monolith’s tower too, while no one else holds it). With nothing damaged, they rebuild the nearest ruin (right-click a ruin to pick one).',
  reinforce: `Raise a sharpened log palisade on a finished trench (${WALL_COST} gold, +${WALL_HP2} hp).`,
  replenish: 'Quartermasters: restore a gold deposit, even an exhausted one (they do it on their own too).',
  refit: `Walk back to their building and take every upgrade they're missing (${REFIT_COST} gold and ${REFIT_TIME}s each).`,
  zcharge: 'When on, this Necromancer’s zombies charge the enemy as soon as they rise, attacking whatever they meet on the way to the enemy statue. When off, they guard the Necromancer and only charge once your side attacks.',
  auto: `When on, mages cast their spells on their own and answer enemy spells with the opposite one. They keep ${SPELL_RESERVE} mana in reserve. You can still force any spell yourself.`,
  salt: `Click a gold deposit (or right-click it): the saboteurs sneak over and salt it. For ${SABOTEUR.saltDur}s enemy miners keep only half the gold they dig there.`,
  stars: 'Switch the selected ninjas between Auto (stars against Kestrels and giants, or when badly wounded; blade otherwise), Blade only and Stars only. The ambush blow only works with the blade.',
};

function tipHTML(el) {
  const me = G.teams[0];
  if (el.dataset.unit) {
    const d = UNIT_TYPES[el.dataset.unit], c = unitCost(me, d.key);
    return `<b>${d.name}</b><span class="cost"><i class="ico gold"></i>${c.gold}${c.mana ? ` <i class="ico mana"></i>${c.mana}` : ''} · pop ${unitPop(me, d.key)} · key ${d.hotkey}</span><p>${d.desc}</p><em>Trained at the ${d.building} (${groupOf(d.key).name}: one unit at a time). Click to train · right-click cancels · ⚒ upgrades</em>`;
  }
  if (el.dataset.upg) {
    const [type, key] = el.dataset.upg.split(':');
    const d = upgradeDef(type, key);
    const r = me.research[type];
    const locked = d.requires && !me.upgrades[type][d.requires] ? `Requires ${upgradeDef(type, d.requires).name}` : '';
    const state = me.upgrades[type][key] ? 'Researched' : r && r.key === key ? 'Researching… (right-click to cancel)' : locked;
    const note = d.team ? 'Takes effect immediately.' : `Only units trained after research get this. Veterans can refit (R) for ${REFIT_COST} gold.`;
    const p = upgradePrice(me, type, d), save = p.off ? ` <i class="save">(-${Math.round(p.off * 100)}%)</i>` : '';   // architects' savings
    return `<b>${d.name}</b><span class="cost"><i class="ico gold"></i>${p.gold}${p.mana ? ` <i class="ico mana"></i>${p.mana}` : ''}${save} · ${d.time}s</span><p>${d.desc}</p><em>${state || note}</em>`;
  }
  if (el.dataset.cmd && el.dataset.cmd.startsWith('spell:')) {
    const k = el.dataset.cmd.slice(6), S = SPELLS[k], cd = spellCooldown(k);
    return `<b>${S.name}</b><span class="cost"><i class="ico mana"></i>${S.mana} · cooldown ${S.cd}s · range ${S.range}</span><p>${S.desc}</p><em>Opposite: ${SPELLS[S.opp].name}. ${cd > 0 ? `Recharging (${Math.ceil(cd)}s).` : 'Click, then click where to cast.'}</em>`;
  }
  if (el.dataset.cmd) {
    const c = COMMANDS.find(c => c.id === el.dataset.cmd);
    const caps = selectionCaps(), tip = typeof CMD_TIPS[c.id] === 'function' ? CMD_TIPS[c.id](caps) : CMD_TIPS[c.id];
    return tip ? `<b>${typeof c.label === 'function' ? c.label(caps) : c.label}</b><p>${tip}</p><em>Key: ${c.key}</em>` : '';
  }
  return el.dataset.tip;
}

function showTip(el) {
  const html = tipHTML(el);
  if (!html) return hideTip();
  const tip = $('tip');
  tip.innerHTML = html;
  tip.classList.remove('hidden');
  const r = el.getBoundingClientRect(), tr = tip.getBoundingClientRect();
  tip.style.left = clamp(r.left + r.width / 2 - tr.width / 2, 8, window.innerWidth - tr.width - 8) + 'px';
  tip.style.top = Math.max(8, r.top - tr.height - 8) + 'px';
}
function hideTip() { $('tip').classList.add('hidden'); }

// ---------------------------------------------------------------- HUD

// Training bar for the player's clan: one color-coded block per training group (groups the clan
// can't use at all are left out), its unit buttons staggered over two rows. Each group trains one
// unit at a time. Click to train, right-click to cancel one, the small ⚒ opens that unit's upgrades.
function buildTrainBar() {
  const me = G.teams[0];
  const bar = $('train');
  bar.innerHTML = '';
  const BTN = 42, STEP = 24, ROW = BTN + 3;
  for (const g of TRAIN_GROUPS) {
    const types = g.types.filter(t => canTrain(me, t));
    if (!types.length) continue;
    const grp = document.createElement('div');
    grp.className = 'tgrp';
    grp.style.setProperty('--gc', g.color);
    grp.style.width = BTN + (types.length - 1) * STEP + 'px';
    grp.dataset.tip = `<b>${g.name}</b><p>Trains one unit at a time, in the order you queue them.</p>`;
    types.forEach((type, i) => {
      const def = UNIT_TYPES[type], cost = unitCost(me, type);
      const b = document.createElement('div');
      b.className = 'tb';
      b.dataset.type = type;
      b.dataset.unit = type;
      b.dataset.tip = '';
      b.style.left = i * STEP + 'px';
      b.style.top = (types.length === 1 ? ROW / 2 : (i % 2) * ROW) + 'px';
      b.innerHTML = `
        <canvas width="84" height="84"></canvas>
        <kbd>${def.hotkey}</kbd><span class="badge"></span>
        <button class="ub" data-tip="${buildingName(type, G.teams[0])}: upgrades (U)">⚒</button>
        <div class="prog"><i></i></div>
        <span class="cost">${cost.gold}${cost.mana ? `<i class="ico mana"></i>${cost.mana}` : ''}</span>`;
      drawUnitIcon(b.querySelector('canvas'), type);
      b.addEventListener('click', e => {
        if (e.target.closest('.ub')) return UI.panel === groupOf(type).key ? closePanel() : openPanel(groupOf(type).key);
        queueUnit(G.teams[0], type);
      });
      b.addEventListener('contextmenu', e => { e.preventDefault(); dequeueUnit(G.teams[0], type); });
      grp.appendChild(b);
    });
    bar.appendChild(grp);
  }
  const cb = document.createElement('button');
  cb.className = 'upgbtn castlebtn';
  cb.dataset.tip = 'Castle upgrades (U): statue income, extra castle archers, free Swordwrath levy. You can also click your rampart or tower.';
  cb.innerHTML = '<svg viewBox="0 0 24 24"><path d="M3 22V9h3V6h3v3h2V3h2v6h2V6h3v3h3v13h-6v-5a2 2 0 0 0-4 0v5z"/></svg>';
  cb.addEventListener('click', () => (UI.panel === 'castle' ? closePanel() : openPanel('castle')));
  bar.appendChild(cb);
}

function buildHUD() {
  buildTrainBar();

  document.querySelectorAll('#stances button[data-stance]').forEach(b => {
    b.addEventListener('click', () => setStance(G.teams[0], b.dataset.stance));
  });
  $('btnFlag').addEventListener('click', () => { UI.placing = UI.placing === 'flag' ? null : 'flag'; });
  $('btnFlag').addEventListener('contextmenu', e => {
    e.preventDefault();
    G.teams[0].musterX = null;
    toast('Muster point cleared: new troops follow the army stance');
  });
  $('btnMiners').addEventListener('click', toggleMinerRecall);
  $('btnSiege').addEventListener('click', toggleSiegeMode);
  $('prio').addEventListener('click', cycleMinerDefault);
  $('card').addEventListener('click', e => {
    const c = e.target.closest('[data-cmd]');
    if (c && !c.classList.contains('off')) runCommand(c.dataset.cmd);
  });
  $('btnSpeed').addEventListener('click', cycleSpeed);
  $('btnPause').addEventListener('click', togglePause);
  $('btnHelp').addEventListener('click', toggleHelp);
  $('btnFull').addEventListener('click', () => {
    if (document.fullscreenElement) document.exitFullscreen();
    else document.documentElement.requestFullscreen().catch(() => {});
  });
  $('helpClose').addEventListener('click', toggleHelp);
  initPauseMenu();
}

// Group a building's upgrades into chains: a first tier followed by the tiers that require it.
// Tiers the player's clan can't research are left out (a chain with none left disappears).
function upgradeChains(type) {
  // A tier that branches off one already in a chain (e.g. Broadheads and Flaming Arrows both build
  // on Bodkin Arrows) gets a button of its own.
  const me = G.teams[0], list = UPGRADES[type].filter(d => !upgradeLocked(me, type, d.key));
  const used = new Set(), chains = [];
  for (const d of list) {
    if (used.has(d.key)) continue;
    const chain = [d];
    used.add(d.key);
    for (let next; (next = list.find(x => x.requires === chain[chain.length - 1].key && !used.has(x.key)));) {
      chain.push(next);
      used.add(next.key);
    }
    chains.push(chain);
  }
  return chains;
}

// The unit types whose upgrades a building's panel lists: the castle's own, or every unit of the
// class this clan can train (and that has something to research).
function panelTypes(key) {
  if (key === 'castle') return ['castle'];
  const g = TRAIN_GROUPS.find(x => x.key === key);
  return g ? g.types.filter(t => canTrain(G.teams[0], t) && upgradeChains(t).length) : [];
}

// key: a class (training group) or 'castle'. A unit type opens its class's building.
function openPanel(key) {
  if (key !== 'castle' && !TRAIN_GROUPS.some(g => g.key === key)) key = groupOf(key).key;
  if (!panelTypes(key).length) {
    toast(`The ${clanOf(G.teams[0]).name} doesn't use the ${buildingName(key, G.teams[0])}`);
    return;
  }
  UI.panel = key;
  UI.cardMode = '';   // force the card to rebuild
}

function closePanel() {
  UI.panel = null;
  UI.cardMode = '';
}

// The bottom-right card: building upgrades, or orders for the selected units.
function buildCard(mode) {
  const card = $('card');
  UI.cardMode = mode;
  UI.last.cardInfo = null;
  if (mode.startsWith('upg:')) {
    const key = mode.slice(4), types = panelTypes(key);
    card.innerHTML = `<div class="uhead"><b>${buildingName(key, G.teams[0])}</b><span class="rs"></span><button class="x" data-tip="Close (Esc)">✕</button></div><div class="ulist"></div>`;
    card.querySelector('.x').addEventListener('click', closePanel);
    const list = card.querySelector('.ulist');
    // a row per unit the building trains; one button per upgrade chain, showing the next tier once
    // the previous one is done. The book in the corner sets the architects studying it.
    for (const type of types) {
      if (types.length > 1) {
        const h = document.createElement('div');
        h.className = 'usec';
        h.textContent = UNIT_TYPES[type].name;
        list.appendChild(h);
      }
      for (const chain of upgradeChains(type)) {
        const b = document.createElement('button');
        b.className = 'ubtn';
        b.dataset.type = type;
        b.dataset.chain = chain.map(d => d.key).join(',');
        b.dataset.tip = '';
        b.innerHTML = `<canvas width="80" height="80"></canvas><span class="uc"></span><div class="prog"><i></i></div>` +
          (chain.length > 1 ? `<span class="pips">${chain.map(() => '<i></i>').join('')}</span>` : '') +
          `<i class="study" data-tip="Architects: study this to make it cheaper (click again to stop)"><svg viewBox="0 0 16 16"><path d="M2 3.5C4 2.6 6 2.7 8 4c2-1.3 4-1.4 6-.5v9c-2-.9-4-.8-6 .5-2-1.3-4-1.4-6-.5z" fill="currentColor"/><path d="M8 4v9" stroke="#1a140e" stroke-width="1"/></svg></i>`;
        b.addEventListener('click', e => {
          const k = b.dataset.upg.split(':')[1];
          if (e.target.closest('.study')) return setStudyFocus(G.teams[0], type, k);
          startResearch(G.teams[0], type, k);
        });
        b.addEventListener('contextmenu', e => {
          e.preventDefault();
          const r = G.teams[0].research[type];
          if (r && r.key === b.dataset.upg.split(':')[1]) cancelResearch(G.teams[0], type);
        });
        list.appendChild(b);
      }
    }
  } else if (mode.startsWith('sel:')) {
    const caps = selectionCaps();
    const btns = COMMANDS.filter(c => c.show(caps)).map(c => {
      const label = typeof c.label === 'function' ? c.label(caps) : c.label;
      return `<button class="cmd" data-cmd="${c.id}" data-tip=""><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round">${ICONS[c.id]}</svg><span>${label}</span><kbd>${c.key}</kbd></button>`;
    });
    // spell buttons, with the spell's mana cost and a cooldown shade
    const mixed = new Set(mageSel().map(u => u.type)).size > 1;
    const spellBtns = caps.spells.map(k => {
      const S = SPELLS[k];
      const key = (mixed && S.owner === 'warlock' ? '⇧' : '') + ['7', '8'][S.slot];
      return `<button class="cmd spell ${S.owner}" data-cmd="spell:${k}" data-tip=""><canvas width="40" height="40" data-icon="${S.owner}:${S.perk}"></canvas><span>${S.name}</span><kbd>${key}</kbd><i class="cdshade"></i><b class="mc">${S.mana}</b></button>`;
    });
    card.innerHTML = `<div id="cardInfo" class="cinfo"></div><div class="cmds">${btns.join('')}${spellBtns.join('')}</div>`;
    card.querySelectorAll('canvas[data-icon]').forEach(c => {
      const [type, perk] = c.dataset.icon.split(':');
      drawUpgradeIcon(c, type, perk);
    });
  } else {
    card.innerHTML = `<div id="cardInfo" class="cinfo"></div>`;
  }
}

function setText(id, v) {
  if (UI.last[id] !== v) {
    UI.last[id] = v;
    $(id).textContent = v;
  }
}

function setHTML(id, v) {
  const el = $(id);
  if (el && UI.last[id] !== v) {
    UI.last[id] = v;
    el.innerHTML = v;
  }
}

function unitJob(u, me) {
  if (u.refitting) return 'Refitting';
  if (u.lastStand > 0) return 'Last stand!';
  if (u.swingKind === 'cast' && u.swing >= 0) return `Casting ${SPELLS[u.swingTarget.k].name}`;
  if (u.pendingCast) return `Moving to cast ${SPELLS[u.pendingCast.k].name}`;
  if (u.type === 'miner') {
    if (u.panning) return 'Panning the stream';
    return ({ mana: 'Praying for mana', pan: 'Going to pan', build: 'Working on a trench', replenish: 'Replenishing a deposit', refit: 'Going to refit', garrison: 'Garrisoned', move: 'Moving', hold: 'Holding', attack: 'Fighting' }[u.order.type]
      || (u.retaliateT > 0 ? 'Defending itself' : u.praying ? 'Praying for mana' : u.carry >= u.carryCap ? 'Returning gold' : u.mine ? 'Mining gold' : 'Idle'));
  }
  if (u.type === 'architect') {
    if (u.order.type === 'build') return u.order.wall.isTower ? (u.order.wall.progress < 1 ? 'Building a tower' : 'Repairing a tower') : 'Working on a trench';
    if (u.order.type === 'trap') return u.laying ? `Laying a ${TRAP[u.order.trap.kind].name.toLowerCase()}` : 'Going to lay a trap';
    if (u.inside) return 'Studying in the castle';
    if (u.order.type === 'stance' && !u.moving) return 'Studying (cheaper upgrades)';
  }
  if (u.type === 'quartermaster' && (u.order.type === 'stance' || u.order.type === 'replenish')) {
    if (u.order.type === 'replenish' || (u.qmJob && u.qmJob.kind === 'prospect')) return 'Restoring a gold deposit';
    const j = u.qmJob;
    if (j) return { heal: 'Patching up a soldier', refit: j.t && isWorker(j.t) ? 'Refitting a worker' : 'Refitting a veteran', gear: 'Bringing a new net and javelin', cheer: 'Cheering on the miners', materials: 'Bringing an Architect materials' }[j.kind];
    return { troops: 'Making the rounds (troops)', workers: 'Making the rounds (workers)' }[u.qmRole] || 'Making the rounds';
  }
  if (u.type === 'necromancer' && u.order.type === 'stance') return `Leading ${zombiesOf(u).length}/${hordeSize(me, u)} zombies (${u.souls || 0} souls)`;
  if (u.rampart >= 0) return 'Shooting from the gate';
  if (u.netT > 0) return 'Caught in a net!';
  if (u.order.type === 'tower') return u.onTower ? 'Posted in a tower' : 'Climbing into a tower';
  if (u.shieldWall) return u.type === 'golem' ? 'Hunkered down' : 'Shield wall';
  if (u.order.type === 'stance') {
    const s = u.ownStance || me.stance;
    return { garrison: 'Garrisoned', defend: 'Defending', attack: 'Attacking' }[s] + (u.ownStance ? ' (own order)' : '');
  }
  if (u.order.type === 'group') return { attack: 'Attacking together', advance: 'Advancing together', retreat: 'Retreating together' }[u.order.g.mode];
  return { salt: u.salting ? 'Salting a deposit' : 'Sneaking to a deposit', move: 'Moving', hold: 'Holding', attack: 'Attacking a target', garrison: 'Garrisoned', refit: 'Going to refit', manwall: u.onWall ? 'Defending the trench' : 'Climbing the rampart' }[u.order.type] || '';
}

function selectionInfoHTML(me) {
  const sel = G.selection;
  if (sel.length === 1) {
    const u = sel[0];
    const perks = UPGRADES[u.type].filter(d => u.perks[d.key]).map(d => d.name);
    const buffs = [];
    if (u.insp) buffs.push(`Inspired ×${u.insp}`);
    if (u.type === 'gladiator') buffs.push(`Glory ×${u.kills || 0}${u.javelin ? ' · javelin' : ''}${u.net ? ' · net' : ''}`);
    if (u.cheerT > 0) buffs.push('Cheered on');
    if (u.drillN) buffs.push(`Drilled +${u.drillN}`);
    if (rageOf(u) > 0.2) buffs.push('Adrenaline');
    if (u.burnT > 0) buffs.push('Burning');
    if (u.onWall) buffs.push('On the rampart');
    if (u.fx.shield > 0) buffs.push(`Shielded (${Math.ceil(u.fx.shield)})`);
    if (u.fx.haste > 0) buffs.push('Quickened');
    if (u.fx.slow > 0) buffs.push('Slowed');
    if (u.fx.empower > 0) buffs.push('Blessed');
    if (u.fx.enfeeble > 0) buffs.push('Weakened');
    if (u.hope) buffs.push('Hope');
    if (u.fear) buffs.push('Fear');
    if (u.inside && u.hp < u.maxHp) buffs.push('Healing');
    if (isMage(u)) buffs.push(u.auto ? 'Auto-cast on' : 'Auto-cast off');
    if (u.type === 'ninja') {
      buffs.push(u.stealth ? 'Vanished' : u.vanishCd > 0 ? `Can vanish in ${Math.ceil(u.vanishCd)}s` : 'Can vanish');
      if (u.perks.parry) buffs.push(u.parryCd > 0 ? `Parry in ${Math.ceil(u.parryCd)}s` : 'Parry ready');
      if (u.perks.stars) buffs.push(`Weapon: ${STAR_MODE_NAMES[u.starMode]}${u.starMode === 'auto' ? ` (${u.starRanged ? 'stars' : 'blade'})` : ''}`);
    }
    if (u.crit) buffs.push(`${Math.round(u.crit * 100)}% crit`);
    const club = u.type === 'sword' && !u.perks.blades ? ' (club)' : u.grounded ? ' (grounded)' : '';
    return `<b>${u.def.name}${club}</b><span>HP ${Math.ceil(Math.max(0, u.hp))}/${Math.round(u.maxHp)} · ${unitJob(u, me)}</span>` +
      (perks.length ? `<span class="perks">${perks.join(' · ')}</span>` : '') +
      (buffs.length ? `<span class="buffs">${buffs.join(' · ')}</span>` : '');
  }
  if (sel.length) {
    const counts = UNIT_ORDER.map(t => [t, sel.filter(u => u.type === t).length]).filter(c => c[1]);
    const refit = refitSelection().reduce((a, u) => a + missingUpgrades(u).length, 0);
    return `<b>${sel.length} selected</b><span>${counts.map(([t, n]) => `${n} ${UNIT_TYPES[t].name}${n > 1 ? 's' : ''}`).join(' · ')}</span>` +
      (refit ? `<span class="perks">${refit} upgrade${refit > 1 ? 's' : ''} to refit (${refit * REFIT_COST} gold)</span>` : '');
  }
  const inside = G.units.filter(u => u.team === 0 && u.inside && !u.dead).length;
  const pans = me.panSlots.filter(Boolean).length;
  return `<b>Orders</b><span class="dim">Select units to give them orders, or click a castle building for upgrades.</span>` +
    `<span>${inside} in the castle · ${pans}/${PAN_SLOTS} panning · ${me.manaSlots.filter(Boolean).length}/${MANA_SLOTS} praying</span>`;
}

function updateHUD(dt) {
  const me = G.teams[0];
  setText('goldTxt', String(Math.floor(me.gold)));
  setText('manaTxt', String(Math.floor(me.mana)));
  setText('popTxt', `${popUsed(me)}/${popCap(me)}`);
  setHTML('prio', { mine: '⛏ Mine', pray: '◆ Pray', pan: '≈ Pan' }[me.minerDefault]);
  document.querySelectorAll('#train .tb').forEach(b => {
    const type = b.dataset.type, def = UNIT_TYPES[type], q = me.queues[groupOf(type).key];
    const n = queuedCount(me, type), training = q.length > 0 && q[0].type === type;
    const cost = unitCost(me, type);
    b.classList.toggle('poor', me.gold < cost.gold || me.mana < cost.mana);
    b.classList.toggle('queued', n > 0);
    b.classList.toggle('training', training);
    b.querySelector('.badge').textContent = n ? n : '';
    b.querySelector('.prog i').style.width = training ? ((q[0].t / def.time) * 100).toFixed(1) + '%' : '0%';
    const ub = b.querySelector('.ub');
    ub.classList.toggle('busy', !!me.research[type]);
    ub.classList.toggle('on', UI.panel === groupOf(type).key);
  });
  const cb = document.querySelector('#train .castlebtn');
  cb.classList.toggle('busy', !!me.research.castle);
  cb.classList.toggle('on', UI.panel === 'castle');
  document.querySelectorAll('#stances button[data-stance]').forEach(b => b.classList.toggle('on', b.dataset.stance === me.stance));
  $('btnFlag').classList.toggle('on', UI.placing === 'flag' || me.musterX !== null);
  $('btnMiners').classList.toggle('on', me.minersIn);
  $('btnSiege').classList.toggle('on', me.siege);

  // command card: rebuild only when what it should show changes
  const sel = liveSel();
  let mode = 'none';
  if (UI.panel) mode = 'upg:' + UI.panel;
  else if (sel.length) mode = 'sel:' + JSON.stringify(selectionCaps());
  if (mode !== UI.cardMode) buildCard(mode);
  if (UI.panel) {
    const card = $('card'), active = panelTypes(UI.panel).filter(t => me.research[t]).map(t => upgradeDef(t, me.research[t].key).name);
    const studying = canTrain(me, 'architect') && G.units.some(u => u.team === 0 && !u.dead && u.type === 'architect');
    const noArch = panelTypes(UI.panel).includes('castle') && !hasArchitect(me);
    card.querySelector('.rs').textContent = noArch ? (me.research.castle ? `${upgradeDef('castle', me.research.castle.key).name} waits for an Architect` : 'Castle upgrades need an Architect') : active.length ? `Researching ${active.join(', ')}` : 'Idle';
    card.querySelectorAll('.ubtn').forEach(b => {
      const type = b.dataset.type, r = me.research[type];
      const chain = b.dataset.chain.split(',').map(k => upgradeDef(type, k));
      const d = chain.find(c => !me.upgrades[type][c.key]) || chain[chain.length - 1];
      const key = d.key;
      if (b.dataset.upg !== `${type}:${key}`) {
        // moved on to the next tier: swap the icon
        b.dataset.upg = `${type}:${key}`;
        drawUpgradeIcon(b.querySelector('canvas'), type, key);
      }
      const p = upgradePrice(me, type, d), priceKey = `${key}:${p.gold}:${p.mana}`;   // the price (after the architects' savings)
      if (b.dataset.price !== priceKey) {
        b.dataset.price = priceKey;
        b.querySelector('.uc').innerHTML = `${p.gold}${p.mana ? `<i class="ico mana"></i>${p.mana}` : ''}`;
        b.classList.toggle('saved', p.off > 0);
      }
      b.querySelectorAll('.pips i').forEach((p, i) => p.classList.toggle('on', !!me.upgrades[type][chain[i].key]));
      const done = !!me.upgrades[type][key], active = r && r.key === key;
      b.classList.toggle('done', done);
      b.classList.toggle('active', !!active);
      b.classList.toggle('poor', !done && !active && (me.gold < p.gold || me.mana < p.mana));
      b.classList.toggle('blocked', !done && !active && (!!r || (d.requires && !me.upgrades[type][d.requires]) || (type === 'castle' && !hasArchitect(me))));
      b.querySelector('.prog i').style.width = active ? ((r.t / d.time) * 100).toFixed(1) + '%' : '0%';
      // the architects' study book: shown while you have an Architect, lit on the upgrade they study
      const book = b.querySelector('.study');
      book.style.display = studying && !done && !active ? '' : 'none';
      book.classList.toggle('on', me.studyFocus === `${type}:${key}`);
    });
  } else {
    setHTML('cardInfo', selectionInfoHTML(me));
    $('card').querySelectorAll('.cmd').forEach(b => {
      const id = b.dataset.cmd;
      if (id.startsWith('spell:')) {
        const k = id.slice(6), S = SPELLS[k], cd = spellCooldown(k) || 0;
        b.querySelector('.cdshade').style.height = cd > 0 ? ((cd / S.cd) * 100).toFixed(0) + '%' : '0';
        b.classList.toggle('poor', me.mana < S.mana);
        b.classList.toggle('on', UI.placing === id);
        return;
      }
      const c = COMMANDS.find(c => c.id === id);
      b.classList.toggle('on', !!(c.on && c.on()));
      if (c.id === 'refit') b.classList.toggle('off', !refitSelection().length);
    });
  }

  if (UI.toastT > 0) {
    UI.toastT -= dt;
    if (UI.toastT <= 0) $('toast').className = '';
  }
  drawMinimap();
}

function drawMinimap() {
  const mm = $('minimap'), c = mm.getContext('2d'), w = mm.width, h = mm.height, k = w / WORLD_W;
  const th = G.map.theme;
  const g = c.createLinearGradient(0, 0, 0, h);
  g.addColorStop(0, th.sky[0]);
  g.addColorStop(0.55, th.sky[1]);
  g.addColorStop(0.56, th.ground[0]);
  g.addColorStop(1, th.ground[1]);
  c.fillStyle = g;
  c.fillRect(0, 0, w, h);
  const gy = h * 0.6, lh = h * 0.32;
  for (const t of G.teams) {
    if (t.noCastle) continue;   // (a campaign field with no castle on that side)
    const col = TEAM_STYLE[t.id].ui;
    c.fillStyle = shade(t.castle.stone, -0.3);
    c.fillRect(t.id === 0 ? 0 : w - (GATE_X + 14) * k, gy - 16, (GATE_X + 14) * k + 1, 16);
    c.fillStyle = t.statue.dead ? '#444' : col;
    c.fillRect(t.statue.x * k - 3, gy - 20, 6, 20);
    c.fillStyle = 'rgba(0,0,0,0.6)';
    c.fillRect(t.statue.x * k - 10, gy + lh + 6, 20, 3);
    c.fillStyle = col;
    c.fillRect(t.statue.x * k - 10, gy + lh + 6, 20 * Math.max(0, t.statue.hp / t.statue.max), 3);
  }
  const me = G.teams[0];
  if (me.musterX !== null) {
    c.fillStyle = TEAM_STYLE[0].ui;
    c.fillRect(me.musterX * k, gy - 14, 1.5, 14);
    c.fillRect(me.musterX * k, gy - 14, 6, 4);
  }
  if (G.shrine) {
    const s = G.shrine;
    c.fillStyle = s.owner < 0 ? '#cfc6b0' : TEAM_STYLE[s.owner].crystal;
    c.fillRect(s.x * k - 1.5, gy - 18, 3, 18);
    c.fillRect(s.x * k - 3, gy - 22, 6, 5);
  }
  for (const m of G.mines) {
    c.fillStyle = m.gold > 0 ? '#c99b2a' : '#5d5650';
    c.beginPath();
    c.arc(m.x * k, gy + ((m.y - LANE_TOP) / (LANE_BOT - LANE_TOP)) * lh, 1.5 + 2 * (m.gold / m.max), 0, TAU);
    c.fill();
  }
  for (const wl of G.walls) {
    c.fillStyle = wl.ruin ? '#4a4038' : wl.progress >= 1 ? '#bdb5a2' : '#7a7266';
    c.fillRect(wl.x * k - 1, gy - 6, 3, lh + 6);
  }
  for (const p of G.pools) {
    c.fillStyle = p.kind === 'healpool' ? 'rgba(220,230,140,0.6)' : 'rgba(160,80,200,0.6)';
    c.fillRect((p.x - p.r) * k, gy + lh * 0.3, p.r * 2 * k, 3);
  }
  for (const u of G.units) {
    if (u.dead) continue;
    c.fillStyle = u.team === 0 ? (u.selected ? '#96e078' : '#e9d7a0') : '#d0503a';
    const s = u.type === 'spear' ? 3.5 : 2.5;
    c.fillRect(u.x * k - 1, gy + ((u.y - LANE_TOP) / (LANE_BOT - LANE_TOP)) * lh - 1, s, s);
  }
  c.strokeStyle = 'rgba(235,225,200,0.9)';
  c.lineWidth = 1.5;
  c.strokeRect(G.cam.x * k + 0.5, 1, VIEW.w * k, h - 2);
}

// ---------------------------------------------------------------- overlays

// 1×, 2×, 4× normally; the debug overlay adds 8× for fast AI-vs-AI tests.
function cycleSpeed() {
  const speeds = G.dbg && G.dbg.on ? DEBUG_SPEEDS : DEBUG_SPEEDS.slice(0, 3);
  setSpeed(speeds[(speeds.indexOf(G.speed) + 1) % speeds.length]);
}
function setSpeed(s) {
  G.speed = s;
  $('btnSpeed').textContent = G.speed + '×';
}

// Pause menu: resume, restart this map, start a new game, or read the controls.
function togglePause() {
  if (G.state !== 'play') return;
  G.paused = !G.paused;
  $('pauseMenu').classList.toggle('hidden', !G.paused);
  if (G.paused) $('pmMap').textContent = `${clanOf(G.teams[0]).name} vs ${clanOf(G.teams[1]).name} · ${G.map.name} · ${mapLayoutText()} · ${AI_LEVELS[G.difficulty].name} opponent · ${Math.floor(G.time / 60)}:${String(Math.floor(G.time % 60)).padStart(2, '0')}`;
}

function initPauseMenu() {
  $('pmResume').onclick = togglePause;
  $('pmRestart').onclick = () => { $('pauseMenu').classList.add('hidden'); if (G.lesson) return G.lesson.campaign ? startCampaignLevel(G.lesson.key) : startLesson(G.lesson.key); newGame(G.seed, G.clans); startBattle(); };
  $('pmNew').onclick = () => { $('pauseMenu').classList.add('hidden'); if (G.lesson) { const camp = G.lesson.campaign; G.paused = false; newGame(randomSeed()); return camp ? showCampaignMap() : showTutorialMenu(); } newGame(randomSeed()); showTitle(); };
  $('pmHelp').onclick = toggleHelp;
  $('pmVol').innerHTML = volumeHTML();
  wireVolume($('pmVol'));
}

function toggleHelp() {
  $('help').classList.toggle('hidden');
}

const mapLayoutText = () => [G.map.lane.name, G.map.mineLayout.name, G.map.goldLevel.name, G.shrine ? 'Monolith' : null].filter(Boolean).join(' · ');
const clanShort = key => (key === 'random' ? 'Random' : CLANS[key].name.replace(/ (Clan|Circle)$/, ''));

// What a clan brings, for the setup screen.
function clanInfoHTML(key) {
  if (key === 'random') return '<p class="tag">A random clan, revealed when the battle begins. Both sides can end up with the same clan.</p>';
  const c = CLANS[key], li = (cls, list) => (list || []).map(t => `<li class="${cls}">${t}</li>`).join('');
  return `<p class="tag">${c.tagline}</p><ul>${li('plus', c.strengths)}${li('minus', c.weaknesses)}${li('soon', (c.coming || []).map(t => `Coming soon: ${t}`))}</ul>`;
}

// The skirmish setup: both clans (or random), opponent difficulty, map options and the seed.
// The map in the background is a live preview of the chosen seed and options.
// The main menu: Tutorial and Campaign are still being built; Skirmish opens the battle setup.
function showMainMenu() {
  G.lesson = null;
  hideLessonBox();
  document.body.className = 'title';
  $('debug').classList.add('hidden');
  $('overlay').innerHTML = `
    <div class="card menu">
      <h1>STICKFRONT</h1>
      <p class="sub">a stick war</p>
      <div class="modes">
        <button id="btnTutorial" class="mode"><b>Tutorial</b><span>Learn each unit in battles of its own, unlocking your army as you go</span></button>
        <button id="btnCampaign" class="mode"><b>Campaign</b><span>March against the Horde, a monster army, battle by battle across the map</span></button>
        <button id="btnSkirmish" class="mode play"><b>Skirmish</b><span>One battle against the computer, your clans and map</span></button>
      </div>
      <div class="menuvol">${volumeHTML()}</div>
    </div>`;
  $('overlay').classList.remove('hidden');
  $('btnSkirmish').onclick = () => showTitle();
  wireVolume($('overlay'));
  $('btnTutorial').onclick = () => showTutorialMenu();
  $('btnCampaign').onclick = () => showCampaignMap();
}

function showTitle() {
  G.lesson = null;
  hideLessonBox();
  document.body.className = 'title';
  $('debug').classList.add('hidden');
  const th = G.map.theme;
  const choice = (field, opts) => opts.map(([k, label, tip]) => `<button data-opt="${field}" data-val="${k}" class="${SETUP[field] === k ? 'on' : ''}"${tip ? ` data-tip="${tip}"` : ''}>${label}</button>`).join('');
  const clanSide = (field, title) => `
    <div class="side">
      <h3>${title}</h3>
      <div class="clanGrid">${['random', ...CLAN_ORDER].map(k => `<button data-clan="${field}" data-val="${k}" class="${SETUP[field] === k ? 'on' : ''}">${clanShort(k)}</button>`).join('')}</div>
      <div class="clanInfo"><b>${SETUP[field] === 'random' ? 'Random clan' : CLANS[SETUP[field]].name}</b>${clanInfoHTML(SETUP[field])}</div>
    </div>`;
  $('overlay').innerHTML = `
    <div class="card setup">
      <h1>STICKFRONT</h1>
      <p class="sub">skirmish</p>
      <div class="clanPick">${clanSide('clan', 'Your clan')}${clanSide('enemy', 'Enemy clan')}</div>
      <div class="opts">
        <div class="opt"><span>Opponent</span>${Object.entries(AI_LEVELS).map(([k, l]) => `<button data-diff="${k}" class="${k === AI_DIFFICULTY ? 'on' : ''}" data-tip="${l.desc}">${l.name}</button>`).join('')}</div>
        <div class="opt"><span>Monolith</span>${choice('monolith', [['off', 'Off'], ['on', 'On', `Hold the ground around it for +${SHRINE.gold} gold and +${SHRINE.mana} mana per second`], ['random', 'Random']])}</div>
        <div class="opt"><span>Gold</span>${choice('gold', [['scarce', 'Scarce', 'Deposits hold 40% less gold'], ['normal', 'Normal'], ['rich', 'Rich', 'Deposits hold 60% more gold'], ['random', 'Random']])}</div>
        <div class="opt"><span>Seed</span><input id="seedIn" type="text" inputmode="numeric" value="${G.seed}" data-tip="The same seed and options always make the same map"><button id="btnReroll" data-tip="Roll a new seed">New map</button></div>
      </div>
      <div class="mapinfo">
        <div class="mapname">${G.map.name}</div>
        <div class="maptheme">${th.name} · ${G.mines.length} gold deposits</div>
        <div class="maplayout">${mapLayoutText()}</div>
      </div>
      <div class="row"><button id="btnMenu" data-tip="Back to the main menu">Back</button><button id="btnStart" class="big">Begin Battle</button></div>
      <p class="hint">Destroy the enemy statue, then kill the giant that bursts out of it, to win. Press <kbd>H</kbd> in game for controls.</p>
    </div>`;
  $('overlay').classList.remove('hidden');
  const ov = $('overlay');
  const refresh = (seed = G.seed) => { saveSetup(); newGame(seed); showTitle(); };
  ov.querySelectorAll('[data-clan]').forEach(b => { b.onclick = () => { SETUP[b.dataset.clan] = b.dataset.val; refresh(); }; });
  ov.querySelectorAll('[data-opt]').forEach(b => { b.onclick = () => { SETUP[b.dataset.opt] = b.dataset.val; refresh(); }; });
  ov.querySelectorAll('[data-diff]').forEach(b => { b.onclick = () => { setDifficulty(b.dataset.diff); refresh(); }; });
  $('btnReroll').onclick = () => refresh(randomSeed());
  $('seedIn').onchange = e => {
    const s = parseInt(e.target.value, 10);
    if (Number.isFinite(s) && s > 0) refresh(s);
    else e.target.value = G.seed;
  };
  // the battle uses fresh clans: random picks are decided now
  $('btnStart').onclick = () => { newGame(G.seed); startBattle(); };
  $('btnMenu').onclick = () => showMainMenu();
}

function startBattle() {
  G.state = 'play';
  G.cam.x = 0;
  document.body.className = '';
  $('overlay').classList.add('hidden');
  $('pauseMenu').classList.add('hidden');
  G.paused = false;
  $('btnSpeed').textContent = '1×';
  $('debug').classList.toggle('hidden', !G.dbg.on);
  UI.last = {};
  UI.placing = null;
  UI.panel = null;
  UI.cardMode = '';
  buildTrainBar();
  toast(`${clanOf(G.teams[0]).name} vs ${clanOf(G.teams[1]).name} · Battle of ${G.map.name}`);
}

function showEnd() {
  const won = G.over.winner === 0;
  const mins = Math.floor(G.time / 60), secs = String(Math.floor(G.time % 60)).padStart(2, '0');
  G.state = 'over';
  UI.placing = null;
  $('debug').classList.add('hidden');
  if (G.lesson) return showLessonEnd(won, `${mins}:${secs}`);
  $('overlay').innerHTML = `
    <div class="card wide ${won ? 'win' : 'lose'}">
      <h1>${won ? 'VICTORY' : 'DEFEAT'}</h1>
      <p class="sub">${won ? 'The enemy statue and the giant within it have fallen.' : 'Your statue lies in ruins and its giant is slain.'} · ${mins}:${secs} · ${clanOf(G.teams[0]).name} vs ${clanOf(G.teams[1]).name}</p>
      ${endScreenHTML(won)}
      <div class="row">
        <button id="btnAgain" class="big">Rematch</button>
        <button id="btnNew">New Map</button>
      </div>
    </div>`;
  $('overlay').classList.remove('hidden');
  wireEndCharts();
  $('btnAgain').onclick = () => { newGame(G.seed, G.clans); startBattle(); };
  $('btnNew').onclick = () => { newGame(randomSeed()); showTitle(); };
}

// The end of a tutorial lesson: what it unlocked, and on to the next one (or try again).
function showLessonEnd(won, time) {
  hideLessonBox();
  const L = G.lesson.L, { msg, next } = lessonEndHTML(won);
  const giant = L.statueGiant;
  $('overlay').innerHTML = `
    <div class="card wide ${won ? 'win' : 'lose'}">
      <h1>${won ? 'VICTORY' : 'DEFEAT'}</h1>
      <p class="sub">${L.name} · ${won ? (giant ? 'The enemy statue and the giant within it have fallen.' : 'The enemy statue has fallen.') : (giant ? 'Your statue lies in ruins and its giant is slain.' : 'Your statue has fallen.')} · ${time}</p>
      ${msg}
      ${endScreenHTML(won)}
      <div class="row">
        ${won && next ? `<button id="btnNextLesson" class="big">Next: ${next.name}</button>` : ''}
        <button id="btnRetry" class="${won ? '' : 'big'}">${won ? 'Play again' : 'Try again'}</button>
        <button id="btnTutMenu">Tutorial menu</button>
      </div>
    </div>`;
  $('overlay').classList.remove('hidden');
  wireEndCharts();
  const key = G.lesson.key, camp = G.lesson.campaign;
  if (camp) $('btnTutMenu').textContent = 'Campaign map';
  if ($('btnNextLesson')) $('btnNextLesson').onclick = () => (camp ? showCampaignBriefing(next.key) : showBriefing(next.key));
  $('btnRetry').onclick = () => (camp ? startCampaignLevel(key) : startLesson(key));
  $('btnTutMenu').onclick = () => { newGame(randomSeed()); camp ? showCampaignMap() : showTutorialMenu(); };
}

function randomSeed() {
  return Math.floor(Math.random() * 999999) + 1;
}
