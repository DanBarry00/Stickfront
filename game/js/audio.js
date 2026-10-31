'use strict';
// Sound: everything is synthesized with the Web Audio API (no sound files). Unit and action sounds
// are placed by where they happen: quieter off-screen and panned left or right of the camera, and
// each kind is rate-limited so a big fight stays readable. Ambience (birds, a breeze) drifts in now
// and then, and war drums beat while either side attacks (slower while a line advances).
// Browsers only allow sound after the player clicks or presses a key, so the engine starts then.

const SND = {
  ctx: null, master: null, bus: {}, noiseBuf: null,
  vol: (() => { try { const v = parseFloat(localStorage.getItem('stickfront.volume')); return Number.isFinite(v) ? clamp(v, 0, 1) : 0.6; } catch (e) { return 0.6; } })(),
  last: {}, voices: 0,
  ambT: 6, drumMode: null, nextStep: 0, step: 0,
};

// Minimum seconds between two of the same sound, and how loud each kind is.
const SFX_GAP = { clang: 0.06, hit: 0.07, thud: 0.12, chop: 0.1, bow: 0.07, xbow: 0.09, star: 0.08, sling: 0.15, zap: 0.1, arrowHit: 0.05,
  heal: 0.25, cast: 0.2, boom: 0.15, splash: 0.3, death: 0.09, stone: 0.2, gaze: 0.5, crumble: 0.5, statueFall: 1, pick: 0.11, coin: 0.12,
  build: 0.12, trained: 0.15, horn: 4 };

function audioInit() {
  if (SND.ctx) return;
  const AC = window.AudioContext || window.webkitAudioContext;
  if (!AC) return;
  const ctx = SND.ctx = new AC();
  const comp = ctx.createDynamicsCompressor();   // keeps a big battle from clipping
  comp.threshold.value = -16;
  comp.ratio.value = 6;
  comp.connect(ctx.destination);
  SND.master = ctx.createGain();
  SND.master.connect(comp);
  for (const [k, v] of Object.entries({ sfx: 0.85, amb: 0.55, drums: 0 })) {
    const g = ctx.createGain();
    g.gain.value = v;
    g.connect(SND.master);
    SND.bus[k] = g;
  }
  const buf = ctx.createBuffer(1, ctx.sampleRate * 2, ctx.sampleRate), d = buf.getChannelData(0);
  for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
  SND.noiseBuf = buf;
  setVolume(SND.vol, false);
}
// (the first click or key press anywhere starts the sound engine)
for (const ev of ['pointerdown', 'keydown']) {
  window.addEventListener(ev, () => { audioInit(); if (SND.ctx && SND.ctx.state !== 'running') SND.ctx.resume(); }, true);
}

// Master volume, 0..1 (heard on a curve, so the low end of the slider is usable).
function setVolume(v, save = true) {
  SND.vol = clamp(v, 0, 1);
  if (SND.master) SND.master.gain.setTargetAtTime(SND.vol * SND.vol, SND.ctx.currentTime, 0.03);
  if (save) { try { localStorage.setItem('stickfront.volume', String(SND.vol)); } catch (e) { /* storage unavailable */ } }
}

const soundOn = () => SND.ctx && SND.ctx.state === 'running' && SND.vol > 0 && G && G.state === 'play' && !G.paused;

// ---------------------------------------------------------------- building blocks

// A tone: an oscillator gliding from f0 to f1 over dur, with a quick attack and an exponential fade.
function sTone(out, t, type, f0, f1, dur, peak, attack = 0.004) {
  const ctx = SND.ctx, o = ctx.createOscillator(), g = ctx.createGain();
  o.type = type;
  o.frequency.setValueAtTime(f0, t);
  o.frequency.exponentialRampToValueAtTime(Math.max(1, f1), t + dur);
  g.gain.setValueAtTime(0.0001, t);
  g.gain.linearRampToValueAtTime(peak, t + attack);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  o.connect(g).connect(out);
  o.start(t);
  o.stop(t + dur + 0.02);
}

// A burst of filtered noise (filter 'lowpass' | 'highpass' | 'bandpass'), its cutoff gliding f0 to f1.
function sNoise(out, t, dur, peak, filter, f0, f1 = f0, q = 1, attack = 0.003) {
  const ctx = SND.ctx, src = ctx.createBufferSource(), bq = ctx.createBiquadFilter(), g = ctx.createGain();
  src.buffer = SND.noiseBuf;
  bq.type = filter;
  bq.Q.value = q;
  bq.frequency.setValueAtTime(f0, t);
  bq.frequency.exponentialRampToValueAtTime(Math.max(20, f1), t + dur);
  g.gain.setValueAtTime(0.0001, t);
  g.gain.linearRampToValueAtTime(peak, t + attack);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  src.connect(bq).connect(g).connect(out);
  src.start(t, Math.random() * 1.5);
  src.stop(t + dur + 0.02);
}

const jit = (f, k = 0.08) => f * (1 + (Math.random() * 2 - 1) * k);   // a little pitch variety

// ---------------------------------------------------------------- the sounds

const SOUNDS = {
  // blades meeting: a scrape of noise and two ringing, slightly out-of-tune partials
  clang(o, t) { const f = jit(1250); sNoise(o, t, 0.05, 0.35, 'highpass', 2500); sTone(o, t, 'sine', f, f * 0.93, 0.22, 0.09); sTone(o, t, 'sine', f * 2.37, f * 2.2, 0.14, 0.045); },
  // a claw or knife landing on flesh
  hit(o, t) { sNoise(o, t, 0.08, 0.4, 'lowpass', 1400, 500); sTone(o, t, 'sine', jit(180), 90, 0.08, 0.2); },
  // something huge landing: a giant's club, a golem's fist, a Hulk
  thud(o, t) { sTone(o, t, 'sine', jit(95), 38, 0.35, 0.8); sNoise(o, t, 0.28, 0.5, 'lowpass', 500, 120); },
  // a blade biting into wood and earth (trenches, towers, statues)
  chop(o, t) { sNoise(o, t, 0.07, 0.4, 'bandpass', jit(900), 500, 2); sTone(o, t, 'triangle', jit(240), 150, 0.07, 0.15); },
  // a bowstring: a short pluck and the arrow's hiss
  bow(o, t) { sTone(o, t, 'triangle', jit(230), 170, 0.11, 0.16); sNoise(o, t, 0.18, 0.1, 'bandpass', 2600, 1200, 1.5, 0.02); },
  xbow(o, t) { sTone(o, t, 'square', jit(320), 110, 0.05, 0.08); sNoise(o, t, 0.04, 0.2, 'highpass', 3000); },
  star(o, t) { sNoise(o, t, 0.13, 0.13, 'bandpass', jit(4200), 2000, 4, 0.01); },
  sling(o, t) { sNoise(o, t, 0.22, 0.1, 'bandpass', 700, 1300, 3, 0.05); },
  // a warlock's bolt crackling away
  zap(o, t) { sTone(o, t, 'sawtooth', jit(500), 1400, 0.14, 0.05); sTone(o, t, 'sine', 900, 300, 0.18, 0.06); },
  arrowHit(o, t) { sNoise(o, t, 0.06, 0.3, 'lowpass', 1100, 500); sTone(o, t, 'sine', jit(170), 95, 0.06, 0.15); },
  // a Cleric's healing: a soft bright chime
  heal(o, t) { sTone(o, t, 'sine', 880, 880, 0.35, 0.05, 0.02); sTone(o, t + 0.06, 'sine', 1320, 1320, 0.4, 0.04, 0.02); },
  // a spell going off: a rising sweep with a shimmer of air
  cast(o, t) { sTone(o, t, 'sine', 300, 900, 0.35, 0.1, 0.03); sNoise(o, t, 0.35, 0.06, 'bandpass', 1500, 3500, 2, 0.05); },
  // blasts: mines, Fireballs, fire pots
  boom(o, t) { sTone(o, t, 'sine', 75, 32, 0.6, 0.85); sNoise(o, t, 0.75, 0.8, 'lowpass', 1100, 150); },
  splash(o, t) { sNoise(o, t, 0.35, 0.4, 'lowpass', 700, 200, 1, 0.02); sTone(o, t, 'sine', 130, 60, 0.22, 0.25); },
  // a soldier falling: a short grunt and the body hitting the ground
  death(o, t) { sTone(o, t, 'triangle', jit(170, 0.2), 80, 0.16, 0.08); sNoise(o, t + 0.12, 0.12, 0.25, 'lowpass', 400, 150); },
  // turned to stone: a crackle hardening into a dull knock
  stone(o, t) { sNoise(o, t, 0.35, 0.35, 'highpass', 1800, 900, 1, 0.01); sTone(o, t + 0.25, 'sine', 300, 80, 0.3, 0.2); },
  // Medusa's gaze: an eerie rising whine
  gaze(o, t) { sTone(o, t, 'sine', 260, 1100, 0.5, 0.09, 0.08); sTone(o, t, 'sine', 265, 1130, 0.5, 0.06, 0.08); },
  // a trench or tower coming down
  crumble(o, t) { sNoise(o, t, 1.2, 0.6, 'lowpass', 700, 120, 1, 0.02); for (let i = 0; i < 4; i++) sTone(o, t + i * 0.18 + Math.random() * 0.08, 'sine', jit(110, 0.3), 45, 0.25, 0.4); },
  statueFall(o, t) { SOUNDS.boom(o, t); sNoise(o, t + 0.1, 2.2, 0.7, 'lowpass', 600, 80, 1, 0.1); for (let i = 0; i < 6; i++) sTone(o, t + 0.2 + i * 0.25, 'sine', jit(90, 0.3), 35, 0.3, 0.4); },
  // a pick striking rock
  pick(o, t) { sTone(o, t, 'square', jit(1900, 0.12), 1500, 0.035, 0.035); sNoise(o, t, 0.04, 0.12, 'highpass', 3500); },
  // gold handed in at the statue
  coin(o, t) { sTone(o, t, 'sine', 2093, 2093, 0.1, 0.05); sTone(o, t + 0.06, 'sine', 2794, 2794, 0.16, 0.045); },
  // an architect's mallet
  build(o, t) { sTone(o, t, 'triangle', jit(320), 200, 0.06, 0.14); sNoise(o, t, 0.05, 0.12, 'bandpass', 1200, 900, 2); },
  // a new unit out of the door (yours only): two soft notes
  trained(o, t) { sTone(o, t, 'triangle', 523, 523, 0.12, 0.05, 0.01); sTone(o, t + 0.09, 'triangle', 784, 784, 0.18, 0.05, 0.01); },
  // a warning horn (your statue under attack, enemies at the miners...)
  horn(o, t) { const ctx = SND.ctx, lp = ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 900; lp.connect(o); sTone(lp, t, 'sawtooth', 147, 140, 0.9, 0.12, 0.12); sTone(lp, t, 'sawtooth', 220, 210, 0.9, 0.06, 0.12); },
};

// Where a sound plays from: louder near the middle of the screen, fading out past its edges, and
// panned toward its side. x = null: no place (interface sounds, at full volume in the middle).
function spot(x, vol) {
  const ctx = SND.ctx, g = ctx.createGain();
  let gain = vol, pan = 0;
  if (x !== null && x !== undefined) {
    const half = VIEW.w / 2, c = G.cam.x + half, d = Math.abs(x - c);
    if (d > half + 600) return null;
    gain *= d < half ? 1 : 1 - (d - half) / 600;
    pan = clamp((x - c) / half, -1, 1) * 0.6;
  }
  if (gain < 0.02) return null;
  g.gain.value = gain;
  if (ctx.createStereoPanner) {
    const p = ctx.createStereoPanner();
    p.pan.value = pan;
    g.connect(p).connect(SND.bus.sfx);
  } else g.connect(SND.bus.sfx);
  return g;
}

// An interface sound's output (no position, played even in the menus).
function spotUI() { const g = SND.ctx.createGain(); g.connect(SND.bus.sfx); return g; }

// Play a sound at world position x (null: interface sound).
function sfx(name, x = null, vol = 1) {
  if (!soundOn()) return;
  const t = SND.ctx.currentTime;
  if (t - (SND.last[name] || -9) < (SFX_GAP[name] || 0.05)) return;
  if (SND.voices > 26) return;
  const out = spot(x, vol);
  if (!out) return;
  SND.last[name] = t;
  SND.voices++;
  setTimeout(() => SND.voices--, 450);
  SOUNDS[name](out, t);
}

// The right sounds for a unit's own blow, and for its shot.
function sfxMelee(u, t) {
  if (t && t.isStructure) return sfx('chop', t.x);
  if (isGiant(u) || u.type === 'golem' || u.brute) return sfx('thud', u.x);
  if (u.type === 'zombie' || u.type === 'flyer' || isWorker(u)) return sfx('hit', u.x);
  sfx('clang', u.x);
}
function sfxShot(u, kind) {
  sfx({ arrow: 'bow', star: 'star', bolt: 'xbow', stone: 'sling', ballista: 'xbow' }[kind] || 'bow', u.x, kind === 'ballista' ? 1.4 : 1);
}

// ---------------------------------------------------------------- ambience and drums (every frame)

function audioTick(dt) {
  if (!soundOn()) {
    if (SND.ctx && SND.bus.drums) SND.bus.drums.gain.setTargetAtTime(0, SND.ctx.currentTime, 0.3);
    SND.drumMode = null;
    return;
  }
  // now and then: birds, or a breeze
  SND.ambT -= dt;
  if (SND.ambT <= 0) {
    SND.ambT = rnd(9, 20);
    const w = G.map.theme.weather;
    if (w === 'snow' || w === 'embers' || chance(0.4)) breeze();
    else birds();
  }
  drumTick();
}

// A gust: soft noise swelling and fading, its pitch drifting.
function breeze() {
  const ctx = SND.ctx, t = ctx.currentTime, dur = rnd(4, 7);
  const src = ctx.createBufferSource(), bq = ctx.createBiquadFilter(), g = ctx.createGain(), p = ctx.createStereoPanner ? ctx.createStereoPanner() : null;
  src.buffer = SND.noiseBuf;
  src.loop = true;
  bq.type = 'bandpass';
  bq.Q.value = 0.6;
  bq.frequency.setValueAtTime(rnd(350, 500), t);
  bq.frequency.linearRampToValueAtTime(rnd(600, 900), t + dur * 0.5);
  bq.frequency.linearRampToValueAtTime(rnd(300, 450), t + dur);
  g.gain.setValueAtTime(0.0001, t);
  g.gain.linearRampToValueAtTime(rnd(0.07, 0.12), t + dur * 0.4);
  g.gain.linearRampToValueAtTime(0.0001, t + dur);
  src.connect(bq).connect(g);
  if (p) { p.pan.setValueAtTime(rnd(-0.6, 0), t); p.pan.linearRampToValueAtTime(rnd(0, 0.6), t + dur); g.connect(p).connect(SND.bus.amb); } else g.connect(SND.bus.amb);
  src.start(t);
  src.stop(t + dur + 0.1);
}

// A bird or two: quick rising chirps in little phrases.
function birds() {
  const ctx = SND.ctx, t0 = ctx.currentTime;
  for (let b = 0; b < (chance(0.5) ? 2 : 1); b++) {
    const base = rnd(2200, 3600), g = ctx.createGain(), p = ctx.createStereoPanner ? ctx.createStereoPanner() : null;
    g.gain.value = rnd(0.25, 0.45);
    if (p) { p.pan.value = rnd(-0.8, 0.8); g.connect(p).connect(SND.bus.amb); } else g.connect(SND.bus.amb);
    let t = t0 + b * rnd(0.6, 1.4);
    for (let ph = 0; ph < rndi(1, 3); ph++) {
      for (let i = 0; i < rndi(2, 5); i++) {
        sTone(g, t, 'sine', base * rnd(0.9, 1.05), base * rnd(1.25, 1.5), rnd(0.05, 0.09), 0.08, 0.005);
        t += rnd(0.08, 0.14);
      }
      t += rnd(0.3, 0.7);
    }
  }
}

// War drums: a quick beat while either side attacks, a slow one while a line advances.
const DRUMS = {
  attack: { step: 60 / 140 / 2, pattern: 'B.T.BBT.' },   // eighth notes at 140 bpm
  advance: { step: 60 / 76, pattern: 'B.BT' },          // quarter notes at 76 bpm
};
function drumMode() {
  let adv = false;
  for (const g of G.groups) {
    if (g.done || !g.members.length) continue;
    if (g.mode === 'attack') return 'attack';
    if (g.mode === 'advance' && g.marching) adv = true;
  }
  for (const t of G.teams) {
    if (t.stance === 'attack' && G.units.some(u => u.team === t.id && !u.dead && !u.inside && !isWorker(u) && u.type !== 'zombie')) return 'attack';
  }
  return adv ? 'advance' : null;
}
function drumTick() {
  const ctx = SND.ctx, now = ctx.currentTime, mode = drumMode();
  if (mode !== SND.drumMode) {
    SND.drumMode = mode;
    SND.bus.drums.gain.setTargetAtTime(mode ? 0.7 : 0, now, mode ? 0.15 : 0.6);
    if (mode && SND.nextStep < now) { SND.nextStep = now + 0.05; SND.step = 0; }
  }
  if (!mode) return;
  const D = DRUMS[mode];
  while (SND.nextStep < now + 0.15) {
    const hit = D.pattern[SND.step % D.pattern.length], t = SND.nextStep;
    if (hit === 'B') { sTone(SND.bus.drums, t, 'sine', 110, 46, 0.4, 0.75); sNoise(SND.bus.drums, t, 0.03, 0.15, 'lowpass', 300); }
    else if (hit === 'T') { sTone(SND.bus.drums, t, 'sine', 210, 150, 0.14, 0.35); sNoise(SND.bus.drums, t, 0.05, 0.18, 'bandpass', 1400, 900, 1.5); }
    SND.nextStep += D.step;
    SND.step++;
  }
}

// ---------------------------------------------------------------- the volume slider (menus)

function volumeHTML() {
  return `<label class="volctl" data-tip="Sound volume">🔊<input type="range" min="0" max="100" step="1" value="${Math.round(SND.vol * 100)}"><span>${Math.round(SND.vol * 100)}%</span></label>`;
}
function wireVolume(root) {
  root.querySelectorAll('.volctl input').forEach(inp => {
    inp.oninput = () => {
      setVolume(inp.value / 100);
      document.querySelectorAll('.volctl').forEach(l => { l.querySelector('input').value = inp.value; l.querySelector('span').textContent = `${inp.value}%`; });
    };
    inp.onchange = () => {   // a little sample at the new level
      audioInit();
      if (!SND.ctx) return;
      SND.ctx.resume().then(() => { if (SND.vol > 0) SOUNDS.coin(spotUI(), SND.ctx.currentTime + 0.02); });
    };
  });
}
