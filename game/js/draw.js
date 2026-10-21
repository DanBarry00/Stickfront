'use strict';
// Drawing routines for stick figures, statues, castles, walls, mines, props and icons.
// Limb angles are in a "facing right" frame; `f` (+1/-1) mirrors x.

const NO_PERKS = {};
const CLOTH = ['#3a2e22', '#3a1512', '#3a3a34'];   // (the third: the Monolith tower's neutral archers)

function polar(x, y, ang, len, f) {
  return [x + Math.cos(ang) * len * f, y + Math.sin(ang) * len];
}
const lerp2 = (a, b, t) => [lerp(a[0], b[0], t), lerp(a[1], b[1], t)];

// Overhead swing: wind up, fast strike, recover. s runs 0..1.
function swingAngle(s, rest) {
  const up = -2.3, down = 0.95;
  if (s < 0.45) return lerp(rest, up, easeOut(s / 0.45));
  if (s < 0.6) return lerp(up, down, (s - 0.45) / 0.15);
  return lerp(down, rest, (s - 0.6) / 0.4);
}

// o: x y facing scale team type walk moving swing carry carryCap gear flash seed
//    fall alpha perks pray(-1 | 0..1) lift rage(0..1) arch{phase,k,fa}
// Robed mage: hooded, staff in hand. Raises the staff overhead to cast, thrusts it to heal/strike.
function drawMage(ctx, o) {
  const st = TEAM_STYLE[o.team], f = o.facing, P = o.perks || NO_PERKS, cleric = o.type === 'cleric', necro = o.type === 'necromancer';
  ctx.save();
  ctx.translate(o.x, o.y - (o.lift || 0));
  if (o.fall) ctx.rotate(-f * o.fall * 1.5);
  if (o.alpha !== undefined) ctx.globalAlpha *= o.alpha;
  ctx.scale(o.scale, o.scale);
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  const col = o.flash > 0 ? '#6e1510' : st.body;
  const robe = o.flash > 0 ? '#6e1510' : cleric ? '#a39a80' : necro ? '#1e2219' : '#2a1c2c';
  const robeDark = cleric ? '#766d58' : necro ? '#0b0d09' : '#150c16';
  const trim = cleric ? shade(st.accent, -0.1) : necro ? shade(st.accent, -0.45) : o.team === 0 ? '#6a4a8a' : '#8a2030';
  const orbCol = cleric ? '#fff0b8' : necro ? '#7dff8a' : '#b04dff';
  const t = RT + o.seed, ph = o.walk, mv = o.moving, s = o.swing;
  const casting = o.cast && s >= 0;
  const hipY = -27 - (mv ? Math.abs(Math.cos(ph)) * 1.4 : Math.sin(t * 2) * 0.4);
  const sx = 1 * f, sy = hipY - 23, hx = sx + 1.5 * f, hy = sy - 9;

  let th;
  if (casting) th = s < 0.5 ? lerp(0.5, -1.55, easeOut(s / 0.5)) : lerp(-1.55, 0.35, (s - 0.5) / 0.5);
  else if (s >= 0) th = s < 0.5 ? lerp(0.5, -0.3, s / 0.5) : lerp(-0.3, 0.5, (s - 0.5) / 0.5);
  else th = 0.5 + (mv ? Math.sin(ph + Math.PI) * 0.15 : Math.sin(t * 2) * 0.04);
  const [ex, ey] = polar(sx, sy + 1, th + 0.3, 8, f);
  const [hx2, hy2] = polar(ex, ey, th - 0.15, 8, f);
  const staffAng = casting ? th - 0.1 : -1.45 + (th - 0.5) * 0.6;

  // shins and feet peek out under the robe
  ctx.strokeStyle = col;
  ctx.lineWidth = 3.2;
  ctx.beginPath();
  for (let i = 0; i < 2; i++) {
    const p = ph + i * Math.PI;
    const fx = (mv ? Math.sin(p) * 9 : i ? -4 : 5) * f, fy = mv ? -Math.max(0, Math.cos(p)) * 4 : 0;
    ctx.moveTo(fx * 0.6, -11);
    ctx.lineTo(fx, fy);
  }
  // back arm: raised with the staff while casting, otherwise hanging in the sleeve
  const ba = casting ? th + 0.5 : Math.PI / 2 + (mv ? Math.sin(ph) * 0.5 : 0.15);
  const [bx, by] = polar(sx, sy + 1, ba, 14, f);
  ctx.moveTo(sx, sy + 1);
  ctx.lineTo(bx, by);
  ctx.stroke();

  // robe: flared from the shoulders to just below the knees
  const sway = mv ? Math.sin(ph * 2) * 1.5 : Math.sin(t * 1.5) * 0.6;
  ctx.fillStyle = robe;
  ctx.strokeStyle = robeDark;
  ctx.lineWidth = 1.2;
  ctx.beginPath();
  ctx.moveTo(sx - 5, sy);
  ctx.lineTo(sx + 5, sy);
  ctx.lineTo(13 + sway, -9);
  if (cleric) ctx.lineTo(-13 + sway, -9);
  else for (let i = 0; i <= 6; i++) ctx.lineTo(13 + sway - i * (26 / 6), -9 + (i % 2 ? -3 : 1));   // ragged hem
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  ctx.strokeStyle = trim;
  ctx.lineWidth = 1.8;
  ctx.beginPath();
  ctx.moveTo(-12 + sway, -10);
  ctx.lineTo(12 + sway, -10);
  ctx.moveTo(sx, sy + 2);
  ctx.lineTo(sway * 0.5, -10);
  ctx.stroke();
  ctx.strokeStyle = robeDark;
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(sx - 2 * f, sy + 6);
  ctx.lineTo(-7 + sway, -11);
  ctx.moveTo(sx + 3 * f, sy + 8);
  ctx.lineTo(7 + sway, -11);
  ctx.stroke();

  // head in a deep hood (the warlock's ends in a point)
  ctx.fillStyle = col;
  ctx.beginPath();
  ctx.arc(hx, hy, 6.5, 0, TAU);
  ctx.fill();
  ctx.fillStyle = robe;
  ctx.strokeStyle = robeDark;
  ctx.lineWidth = 1.2;
  ctx.beginPath();
  ctx.arc(hx - 1 * f, hy - 0.5, 8.6, Math.PI * 0.9, Math.PI * 2.1);
  if (!cleric) ctx.lineTo(hx - 13 * f, hy - 2);
  ctx.lineTo(hx - 7 * f, hy + 8);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = cleric ? 'rgba(255,240,190,0.5)' : necro ? 'rgba(125,255,138,0.8)' : 'rgba(200,80,255,0.75)';
  ctx.beginPath();
  ctx.arc(hx + 3 * f, hy - 0.5, 1.2, 0, TAU);
  ctx.fill();

  // staff with its orb
  const [tx, ty] = polar(hx2, hy2, staffAng, P.focus ? 32 : 30, f);
  const [lx, ly] = polar(hx2, hy2, staffAng + Math.PI, 17, f);
  ctx.strokeStyle = cleric ? '#7d5e34' : necro ? '#3a3226' : '#2a1c14';
  ctx.lineWidth = 2.6;
  ctx.beginPath();
  ctx.moveTo(lx, ly);
  ctx.lineTo(tx, ty);
  ctx.stroke();
  if (necro) {
    // a skull lashed to the top of the staff
    ctx.fillStyle = '#d8d0bc';
    ctx.beginPath(); ctx.arc(tx, ty - 3, 4, 0, TAU); ctx.fill();
    ctx.fillRect(tx - 2.4, ty - 1, 4.8, 3.4);
    ctx.fillStyle = '#103a14';
    ctx.fillRect(tx - 2.2 + f * 0.6, ty - 4, 1.6, 1.8);
    ctx.fillRect(tx + 0.6 + f * 0.6, ty - 4, 1.6, 1.8);
  } else if (!cleric) {
    // gnarled crook
    ctx.beginPath();
    ctx.moveTo(tx, ty);
    ctx.quadraticCurveTo(tx + 6 * f, ty - 4, tx + 3 * f, ty + 4);
    ctx.stroke();
  } else {
    ctx.strokeStyle = shade(st.accent, -0.1);
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(tx - 4, ty + 2);
    ctx.lineTo(tx + 4, ty + 2);
    ctx.stroke();
  }
  const glow = (casting ? 0.6 + Math.sin(Math.min(1, s * 2) * Math.PI / 2) * 0.8 : 0.45) + Math.sin(t * 3) * 0.08;
  const R = (P.focus ? 13 : 10) * (0.8 + glow * 0.6);
  const g = ctx.createRadialGradient(tx, ty - 2, 0, tx, ty - 2, R);
  g.addColorStop(0, rgba(orbCol, Math.min(0.9, glow)));
  g.addColorStop(1, rgba(orbCol, 0));
  ctx.fillStyle = g;
  ctx.fillRect(tx - R, ty - 2 - R, 2 * R, 2 * R);
  ctx.fillStyle = necro ? 'rgba(0,0,0,0)' : orbCol;   // (the Necromancer's skull glows instead of an orb)
  ctx.beginPath();
  ctx.arc(tx, ty - 2, P.focus ? 3.4 : 2.8, 0, TAU);
  ctx.fill();

  // front arm in its sleeve, over the staff
  ctx.strokeStyle = robe;
  ctx.lineWidth = 5;
  ctx.beginPath();
  ctx.moveTo(sx, sy + 1);
  ctx.lineTo(ex, ey);
  ctx.stroke();
  ctx.strokeStyle = col;
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(ex, ey);
  ctx.lineTo(hx2, hy2);
  ctx.stroke();
  ctx.restore();
}

// A giant: a huge, thick-limbed stick man with a slight hunch. On the march it drags its club
// behind it, the head scraping a furrow in the dirt, its feet keeping pace with the ground it
// covers; standing, it rests the club on the ground; to attack it heaves the club overhead and
// smashes it down. Pelted by arrows it raises its free forearm across its face (o.guard). Dark
// iron shackles and chains hang off it: more chains = more obedient.
const GIANT_STRIDE = 18;   // ground covered per step, before scaling (see updateUnit)
function drawGiant(ctx, o) {
  const st = TEAM_STYLE[o.team], f = o.facing, P = o.perks || NO_PERKS;
  const stone = o.stone;   // the statue's giant is made of the statue's stone
  ctx.save();
  ctx.translate(o.x, o.y - (o.lift || 0));
  if (o.fall) ctx.rotate(-f * o.fall * 1.5);
  if (o.alpha !== undefined) ctx.globalAlpha *= o.alpha;
  ctx.scale(o.scale, o.scale);
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  const skin = o.flash > 0 ? '#6e1510' : stone || st.body;
  const ol = stone ? shade(stone, -0.6) : null;
  const t = RT + o.seed, ph = o.walk, mv = o.moving, s = o.swing;
  const drag = mv && s < 0;
  // a heavy, rolling gait: the body sinks on each footfall
  const hipY = -28 + (mv ? Math.abs(Math.sin(ph)) * 2 - 1 : Math.sin(t * 1.4) * 0.5);
  const lean = drag ? 7 : mv ? 5 : 4;   // hunched, more so hauling the club
  const sx = lean * f, sy = hipY - 23;
  const hx = sx + 6 * f, hy = sy - 8;
  if (o.invuln) {
    // just risen from the statue: wrapped in a pale glow that nothing can get through
    const g = ctx.createRadialGradient(sx * 0.5, hipY - 10, 4, sx * 0.5, hipY - 10, 46);
    g.addColorStop(0, rgba(st.crystal, 0.4 + 0.15 * Math.sin(RT * 12)));
    g.addColorStop(1, rgba(st.crystal, 0));
    ctx.fillStyle = g;
    ctx.fillRect(sx * 0.5 - 46, hipY - 56, 92, 92);
  }

  // ---- legs: long strides on plain stick legs
  const feet = [], knees = [];
  for (let i = 0; i < 2; i++) {
    const p = ph + i * Math.PI;
    const fx = (mv ? Math.sin(p) * GIANT_STRIDE / 2 : i ? -7 : 8) * f, fy = mv ? -Math.max(0, Math.cos(p)) * 3.5 : 0;
    feet.push([fx, fy]);
    knees.push([fx * 0.5 + 5 * f, hipY * 0.5 + (mv ? fy * 0.4 : 0)]);
  }

  // ---- the club arm and the club
  let hand, clubAng, elbow;
  if (s >= 0) {
    // heave overhead (from wherever it was), then smash down in front
    const th = s < 0.55 ? lerp(1.9, -2.3, easeOut(s / 0.55)) : s < 0.7 ? lerp(-2.3, 1.3, (s - 0.55) / 0.15) : lerp(1.3, 1.6, (s - 0.7) / 0.3);
    elbow = polar(sx, sy + 1, th + 0.3, 12, f);
    hand = polar(elbow[0], elbow[1], th - 0.1, 12, f);
    clubAng = th - 0.4;
  } else if (drag) {
    // arm hanging back, the club trailing behind with its head on the ground
    hand = [(-4 + Math.sin(ph) * 2) * f, hipY + 10];
    elbow = [(sx + hand[0]) / 2 - 3 * f, (sy + hand[1]) / 2 + 1];
    const tip = [-38 * f, -2 - Math.max(0, Math.sin(ph * 2)) * 1.2];   // bumps along the ground
    clubAng = Math.atan2(tip[1] - hand[1], (tip[0] - hand[0]) * f);
  } else {
    // standing: the club's head rests on the ground at its side, hand on the haft
    hand = [sx + 11 * f, sy + 19 + Math.sin(t * 1.4) * 0.4];
    elbow = [sx + 9 * f, sy + 9];
    clubAng = Math.atan2(-2 - hand[1], (28 * f - hand[0]) * f);
  }
  // the free arm: hanging and swinging with the stride, or raised across the face against arrows
  let be, bh;
  if (o.guard) {
    be = [sx + 9 * f, sy + 3];
    bh = [hx + 5 * f, hy - 3];
  } else {
    const ba = Math.PI / 2 + 0.15 + (mv ? Math.sin(ph) * 0.35 : 0);
    be = polar(sx, sy + 1, ba, 12, f);
    bh = polar(be[0], be[1], ba - 0.25, 12, f);
  }

  // dust kicked up by the dragged club
  if (drag && chance(0.08) && G.particles) {
    const k = o.scale;
    G.particles.push({ kind: 'dot', x: o.x - 38 * f * k, y: o.y - 2, vx: -f * rnd(10, 30), vy: rnd(-25, -8), life: 0.7, max: 0.7, color: shade(G.map.theme.ground[0], 0.15), size: rnd(2, 3.5) });
  }

  const line = (pts, w, col) => {
    ctx.strokeStyle = col;
    ctx.lineWidth = w;
    ctx.beginPath();
    pts.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)));
    ctx.stroke();
  };
  // the stick body: legs, spine (a little hunched), and the free arm when it hangs behind
  const spine = [[0, hipY], [sx * 0.5 - 1 * f, (hipY + sy) / 2 - 1], [sx, sy]];
  if (!o.guard) {
    if (ol) line([[sx, sy + 1], be, bh], 8, ol);
    line([[sx, sy + 1], be, bh], 6, skin);
  }
  for (let i = 0; i < 2; i++) {
    if (ol) line([[0, hipY], knees[i], feet[i]], 9, ol);
    line([[0, hipY], knees[i], feet[i]], 7, skin);   // plain stick legs, no feet
  }
  if (ol) line(spine, 11, ol);
  line(spine, 9, skin);
  if (stone) {
    // cracked stone hide and the statue's crystal heart
    ctx.strokeStyle = rgba(ol, 0.8);
    ctx.lineWidth = 0.8;
    ctx.beginPath();
    ctx.moveTo(2 * f, hipY - 6); ctx.lineTo(4 * f, hipY - 11); ctx.lineTo(2.5 * f, hipY - 15);
    ctx.stroke();
    const g = ctx.createRadialGradient(sx * 0.5, hipY - 12, 0, sx * 0.5, hipY - 12, 8);
    g.addColorStop(0, rgba(st.crystal, 0.9));
    g.addColorStop(1, rgba(st.crystal, 0));
    ctx.fillStyle = g;
    ctx.fillRect(sx * 0.5 - 8, hipY - 20, 16, 16);
  }

  // ---- head: round, a heavy brow over one pale eye
  if (ol) { ctx.fillStyle = ol; ctx.beginPath(); ctx.arc(hx, hy, 8.3, 0, TAU); ctx.fill(); }
  ctx.fillStyle = skin;
  ctx.beginPath();
  ctx.arc(hx, hy, 7, 0, TAU);
  ctx.fill();
  ctx.fillStyle = 'rgba(0,0,0,0.55)';   // brow ridge
  ctx.beginPath();
  ctx.moveTo(hx - 2 * f, hy - 4.5);
  ctx.lineTo(hx + 7.5 * f, hy - 2.6);
  ctx.lineTo(hx + 6.5 * f, hy - 0.8);
  ctx.lineTo(hx - 1 * f, hy - 2.2);
  ctx.closePath();
  ctx.fill();
  if (o.team === 1) {   // the red side's giants wear horns
    ctx.strokeStyle = '#b8ad94';
    ctx.lineWidth = 1.8;
    ctx.beginPath();
    ctx.moveTo(hx - 3.5, hy - 5);
    ctx.quadraticCurveTo(hx - 8, hy - 9, hx - 5, hy - 14);
    ctx.moveTo(hx + 3.5, hy - 5);
    ctx.quadraticCurveTo(hx + 8, hy - 9, hx + 5, hy - 14);
    ctx.stroke();
  }
  ctx.fillStyle = stone ? st.crystal : o.team === 1 ? st.accent2 : '#e8dcc0';
  ctx.fillRect(hx + 3 * f - 0.8, hy - 1.4, 1.7, 1.2);   // a pale, beady eye under the brow
  if (P.blinders && !stone) {
    ctx.fillStyle = '#3a2a1a';
    ctx.fillRect(hx + 4.5 * f - (f > 0 ? 0 : 2.5), hy - 4.5, 2.5, 5.5);
    ctx.strokeStyle = '#1e140c';
    ctx.lineWidth = 0.8;
    ctx.beginPath();
    ctx.moveTo(hx - 6 * f, hy - 2);
    ctx.lineTo(hx + 5 * f, hy - 2);
    ctx.stroke();
  }

  // ---- the club: a knotted haft swelling into a heavy head
  const c0 = polar(hand[0], hand[1], clubAng + Math.PI, 4, f);
  const c1 = polar(hand[0], hand[1], clubAng, 14, f);
  const c2 = polar(hand[0], hand[1], clubAng, 33, f);
  line([c0, c1], 5.4, '#1e140c');
  line([c1, c2], 11.5, '#1e140c');
  line([c0, c1], 3.2, '#4a3420');
  line([c1, c2], 8.5, '#4a3420');
  ctx.fillStyle = '#2e2014';
  for (const dd of [19, 26]) { const [kx, ky] = polar(hand[0], hand[1], clubAng, dd, f); ctx.beginPath(); ctx.arc(kx, ky, 1.6, 0, TAU); ctx.fill(); }
  if (P.stun) {
    ctx.fillStyle = '#7a7d80';   // iron studs on the Stun Club
    for (const dd of [18, 24, 30]) {
      const [px, py] = polar(hand[0], hand[1], clubAng, dd, f);
      for (const side of [-1, 1]) {
        const [qx, qy] = polar(px, py, clubAng + side * Math.PI / 2, 5, f);
        ctx.beginPath(); ctx.arc(qx, qy, 1.3, 0, TAU); ctx.fill();
      }
    }
  }
  if (drag) line([[c2[0], 0], [c2[0] - 22 * f, 1]], 2, 'rgba(0,0,0,0.25)');   // the furrow it leaves

  // ---- the club arm over the haft, and the guarding arm across the face
  if (ol) line([[sx, sy + 1], elbow, hand], 8.5, ol);
  line([[sx, sy + 1], elbow, hand], 6.5, skin);
  ctx.fillStyle = skin;
  ctx.beginPath();
  ctx.arc(hand[0], hand[1], 3.4, 0, TAU);
  ctx.fill();
  if (o.guard) {
    if (ol) line([[sx, sy + 1], be, bh], 8.5, ol);
    line([[sx, sy + 1], be, bh], 6.5, skin);
    ctx.fillStyle = skin;
    ctx.beginPath();
    ctx.arc(bh[0], bh[1], 3.6, 0, TAU);
    ctx.fill();
  }

  // ---- dark iron shackles and chains: free wrist, club wrist, back ankle, front ankle, neck
  const cuffs = [bh, hand, feet[1], feet[0], [hx - 4 * f, hy + 8]];
  for (let i = 0; i < Math.min(5, o.chains || 0); i++) {
    const [cx, cy] = cuffs[i];
    const ankle = i >= 2 && i < 4;
    ctx.fillStyle = '#2b2d30';
    ctx.strokeStyle = '#151618';
    ctx.lineWidth = 0.8;
    ctx.fillRect(cx - 2.6, cy - 2.4 + (ankle ? -3 : 0), 5.2, 3.4);
    ctx.strokeRect(cx - 2.6, cy - 2.4 + (ankle ? -3 : 0), 5.2, 3.4);
    ctx.strokeStyle = '#38393b';
    ctx.lineWidth = 1;
    for (let k = 0; k < 5; k++) {
      const sway = Math.sin(t * 2 + i + k * 0.6) * k * 0.7 - (mv ? f * k * 0.6 : 0);   // trailing as it walks
      const lx = cx - f * (i === 4 ? k * 2.5 : 0) + sway, ly = cy + 1.5 + k * 2.5 + (ankle ? -3 : 0);
      if (ly > 0) break;   // links lie on the ground, not under it
      ctx.beginPath();
      if (k % 2) ctx.ellipse(lx, ly, 0.9, 1.6, 0, 0, TAU);
      else ctx.ellipse(lx, ly, 1.6, 0.9, 0, 0, TAU);
      ctx.stroke();
    }
  }
  ctx.restore();
}

// A da Vinci ornithopter wing, built like a bat's: a jointed wooden arm (shoulder, elbow, wrist)
// with long finger spars fanning back from the wrist, and grimy linen stretched between them in
// scalloped panels down to the pilot's back. flap (-1..1) swings the arm up and down; far draws
// the far wing behind the pilot, smaller and darker.
function drawDaVinciWing(ctx, rx, ry, f, flap, span, far, o, P, st, t) {
  const fire = o.type === 'firebird', k = span * (far ? 0.82 : 1);
  const A = -2.5 - flap * 0.32;                     // the arm: reaching back and up, raised on the upstroke
  const E = polar(rx, ry, A + 0.45, 19 * k, f);     // elbow
  const W = polar(E[0], E[1], A - 0.2, 24 * k, f);  // wrist
  const FING = [[A + 1.45, 40], [A + 0.85, 48], [A + 0.3, 46], [A - 0.25, 38], [A - 0.7, 28]];
  const tips = FING.map(([a, L]) => polar(W[0], W[1], a + flap * 0.12, L * k, f));
  const B = polar(rx, ry, -3.1 + flap * 0.1, 18 * k, f);    // where the trailing edge meets the back
  const scallop = (a, b, sag = 0.3) => {
    // linen sags toward the wrist between two fingers
    const cx = lerp((a[0] + b[0]) / 2, W[0], sag), cy = lerp((a[1] + b[1]) / 2, W[1], sag);
    ctx.quadraticCurveTo(cx, cy, b[0], b[1]);
  };
  // the membrane
  let fill;
  if (fire) {
    fill = ctx.createLinearGradient(rx, ry - 60, rx - 40 * f, ry);
    fill.addColorStop(0, far ? '#c0803a' : '#ffc35a');
    fill.addColorStop(0.45, far ? '#a0401c' : '#e0602a');
    fill.addColorStop(1, far ? '#4a120a' : '#7a1a10');
  } else {
    fill = ctx.createLinearGradient(rx, ry - 60, rx - 30 * f, ry + 5);
    fill.addColorStop(0, far ? '#8a7c62' : '#ddd0ae');
    fill.addColorStop(1, far ? '#4e4636' : '#8e7e5e');
  }
  ctx.fillStyle = fill;
  ctx.strokeStyle = '#2a2016';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(rx, ry);
  ctx.lineTo(E[0], E[1]);
  ctx.lineTo(W[0], W[1]);
  ctx.lineTo(tips[0][0], tips[0][1]);
  for (let i = 1; i < tips.length; i++) scallop(tips[i - 1], tips[i]);
  // the last panel sweeps from the outermost finger back to the pilot's back
  const m = [lerp((tips[tips.length - 1][0] + B[0]) / 2, rx, 0.25), lerp((tips[tips.length - 1][1] + B[1]) / 2, ry, 0.25)];
  ctx.quadraticCurveTo(m[0], m[1], B[0], B[1]);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  if (!fire) {
    // the team's painted panel at the leading edge, and stitched seams
    ctx.fillStyle = rgba(st.accent, far ? 0.22 : 0.42);
    ctx.beginPath();
    ctx.moveTo(E[0], E[1]);
    ctx.lineTo(W[0], W[1]);
    ctx.lineTo(tips[0][0], tips[0][1]);
    scallop(tips[0], tips[1]);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = 'rgba(40,30,20,0.3)';
    ctx.lineWidth = 0.6;
    ctx.beginPath();
    for (const p of [tips[1], tips[2], tips[3]]) { ctx.moveTo(lerp(rx, W[0], 0.35), lerp(ry, W[1], 0.35)); ctx.lineTo(lerp(W[0], p[0], 0.5), lerp(W[1], p[1], 0.5)); }
    ctx.stroke();
  }
  // the wooden arm and fingers, with iron pins at the joints
  const wood = far ? '#2e2216' : '#4a3420';
  ctx.strokeStyle = wood;
  ctx.lineWidth = 3.2 * (far ? 0.8 : 1);
  ctx.beginPath();
  ctx.moveTo(rx, ry); ctx.lineTo(E[0], E[1]); ctx.lineTo(W[0], W[1]);
  ctx.stroke();
  ctx.lineWidth = 1.7 * (far ? 0.8 : 1);
  ctx.beginPath();
  for (const p of tips) { ctx.moveTo(W[0], W[1]); ctx.lineTo(p[0], p[1]); }
  ctx.moveTo(rx, ry); ctx.lineTo(B[0], B[1]);
  ctx.stroke();
  if (!far) {
    // a pull cord from the wrist down to the pilot's hand bar
    ctx.strokeStyle = 'rgba(200,190,160,0.6)';
    ctx.lineWidth = 0.6;
    ctx.beginPath();
    ctx.moveTo(E[0], E[1]);
    ctx.lineTo(rx + 6 * f, ry + 14);
    ctx.stroke();
    ctx.fillStyle = '#6a6c70';
    for (const p of [E, W]) { ctx.beginPath(); ctx.arc(p[0], p[1], 1.4, 0, TAU); ctx.fill(); }
  }
  // Feather Fall: feathers lashed along the fingers
  if (P.feather && !fire) {
    ctx.strokeStyle = far ? '#7a7060' : '#ece4d0';
    ctx.lineWidth = 1.3;
    ctx.beginPath();
    for (const p of tips) for (let j = 0; j < 3; j++) { const q = lerp2(W, p, 0.55 + j * 0.2); ctx.moveTo(q[0], q[1]); ctx.lineTo(q[0] - 4 * f, q[1] + 4); }
    ctx.stroke();
  }
  // Firebird: flames licking off the finger tips
  if (fire && !far) {
    for (let i = 0; i < tips.length; i++) {
      const [x, y] = tips[i], fl = 3.5 + Math.sin(t * 18 + i * 1.7) * 1.8;
      ctx.fillStyle = i % 2 ? 'rgba(255,200,90,0.85)' : 'rgba(255,120,30,0.8)';
      ellipse(ctx, x, y - fl * 0.5, fl * 0.45, fl);
      ctx.fill();
    }
  }
  // the shoulder hub
  ctx.fillStyle = far ? '#2a2b2d' : '#4a4c50';
  ctx.beginPath();
  ctx.arc(rx, ry, far ? 2.2 : 3, 0, TAU);
  ctx.fill();
}

// Kestrel in flight: hanging under a pair of da Vinci wings, legs trailing, small crossbow aimed with the
// front arm. Feather Fall lashes feathers along the wings.
function drawFlyer(ctx, o) {
  const st = TEAM_STYLE[o.team], f = o.facing, P = o.perks || NO_PERKS;
  ctx.save();
  ctx.translate(o.x, o.y - (o.lift || 0));
  if (o.fall) ctx.rotate(-f * o.fall * 1.5);
  if (o.alpha !== undefined) ctx.globalAlpha *= o.alpha;
  ctx.scale(o.scale, o.scale);
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  const col = o.flash > 0 ? '#6e1510' : st.body, t = RT + o.seed, fire = o.type === 'firebird';
  const sway = Math.sin(t * 2.2) * 1.5;

  // da Vinci wings, beating slowly: the far one behind, the near one over the pilot
  const flap = Math.sin(t * (fire ? 3.2 : 3.8));
  const wy = -62 + sway * 0.5 - flap * 2, span = fire ? 1.15 : 1;   // the Firebird's wings are bigger
  const top = [-2 * f, wy];
  drawDaVinciWing(ctx, top[0] + 3 * f, wy - 2, -f, Math.sin(t * (fire ? 3.2 : 3.8) - 0.6), span * 0.9, true, o, P, st, t);   // the far wing, reaching forward
  drawDaVinciWing(ctx, top[0], wy, f, flap, span, false, o, P, st, t);

  // body hangs from the wing bar, leaning into the glide
  const hip = [-3 * f, -26 + sway], sh = [4 * f, -45 + sway];
  const head = [8 * f, -54 + sway];
  const legSway = Math.sin(t * 3) * 3;
  ctx.strokeStyle = col;
  ctx.fillStyle = col;
  ctx.lineWidth = 3.3;
  ctx.beginPath();
  // legs trailing behind
  ctx.moveTo(hip[0], hip[1]);
  ctx.lineTo(hip[0] - 7 * f, hip[1] + 10 + legSway);
  ctx.lineTo(hip[0] - 15 * f, hip[1] + 17 + legSway);
  ctx.moveTo(hip[0], hip[1]);
  ctx.lineTo(hip[0] - 3 * f, hip[1] + 12 - legSway);
  ctx.lineTo(hip[0] - 11 * f, hip[1] + 21 - legSway);
  // spine
  ctx.moveTo(hip[0], hip[1]);
  ctx.lineTo(sh[0], sh[1]);
  // back arm up to the wing bar
  ctx.moveTo(sh[0], sh[1]);
  ctx.lineTo(-2 * f, wy + 8);
  ctx.stroke();
  // harness straps
  ctx.strokeStyle = '#3a2a1a';
  ctx.lineWidth = 1.4;
  ctx.beginPath();
  ctx.moveTo(sh[0], sh[1]);
  ctx.lineTo(top[0], wy + 2);
  ctx.moveTo(hip[0], hip[1]);
  ctx.lineTo(top[0] - 2 * f, wy + 4);
  ctx.stroke();
  // head and goggles
  ctx.fillStyle = col;
  ctx.beginPath();
  ctx.arc(head[0], head[1], 7, 0, TAU);
  ctx.fill();
  drawGear(ctx, 'goggles', head[0], head[1], f, st, t, o.team);

  // crossbow in the front hand, aimed down at the target
  const shooting = o.swing >= 0;
  const aim = shooting ? clamp(o.aimFa || 0.6, -0.3, 1.3) : 0.55 + Math.sin(t * 2) * 0.05;
  const [ex, ey] = polar(sh[0], sh[1] + 1, aim + 0.4, 8, f);
  const [hx, hy] = polar(ex, ey, aim, 8, f);
  if (fire) {
    // a clay fire pot with a sputtering wick, until it is dropped
    if (!shooting || o.swing < 0.8) {
      ctx.fillStyle = P.pitch ? '#3a2418' : '#7a4a2a';
      ctx.beginPath();
      ctx.arc(hx, hy + 5, P.pitch ? 5.5 : 4.5, 0, TAU);
      ctx.fill();
      ctx.fillStyle = Math.sin(t * 25) > 0 ? '#ffd25a' : '#ff8a2e';
      ctx.beginPath();
      ctx.arc(hx + 2 * f, hy - 1, P.fuse ? 2.2 : 1.6, 0, TAU);
      ctx.fill();
    }
  } else {
    drawCrossbow(ctx, hx, hy, aim, f, P, !shooting || o.swing < 0.8);
  }
  ctx.strokeStyle = col;
  ctx.lineWidth = 3.3;
  ctx.beginPath();
  ctx.moveTo(sh[0], sh[1] + 1);
  ctx.lineTo(ex, ey);
  ctx.lineTo(hx, hy);
  ctx.stroke();
  ctx.restore();
}

function drawCrossbow(ctx, x, y, ang, f, P, loaded) {
  const [tx, ty] = polar(x, y, ang, 13, f);
  const [bx, by] = polar(x, y, ang + Math.PI, 5, f);
  ctx.strokeStyle = '#4a3220';
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(bx, by);
  ctx.lineTo(tx, ty);
  ctx.stroke();
  // limbs across the front of the stock (Crank Winch adds a small crank)
  const [l1x, l1y] = polar(tx, ty, ang + Math.PI / 2 + 0.35, 8, f);
  const [l2x, l2y] = polar(tx, ty, ang - Math.PI / 2 - 0.35, 8, f);
  ctx.strokeStyle = '#2a1c10';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(l1x, l1y);
  ctx.quadraticCurveTo(tx, ty, l2x, l2y);
  ctx.stroke();
  const [sx, sy] = polar(x, y, ang, loaded ? 4 : 9, f);
  ctx.strokeStyle = '#d8cfbc';
  ctx.lineWidth = 0.8;
  ctx.beginPath();
  ctx.moveTo(l1x, l1y);
  ctx.lineTo(sx, sy);
  ctx.lineTo(l2x, l2y);
  ctx.stroke();
  if (loaded) {
    const [hx, hy] = polar(sx, sy, ang, 14, f);
    ctx.strokeStyle = P.barbs ? '#8a9096' : '#6a5a44';
    ctx.lineWidth = 1.6;
    ctx.beginPath();
    ctx.moveTo(sx, sy);
    ctx.lineTo(hx, hy);
    ctx.stroke();
  }
  if (P.winch) {
    ctx.fillStyle = '#8a9096';
    ctx.beginPath();
    ctx.arc(bx, by, 2, 0, TAU);
    ctx.fill();
  }
}

// Spirit Golem: rune-bound stone in the shape of a great gorilla, all one piece: a massive humped
// chest and shoulders over narrow hips, a heavy head hung low and forward, short bowed legs and
// long thick arms it knuckle-walks on. It rocks with each slow stride (its legs and knuckles keep
// pace with the ground it actually covers). Hunkered down (o.wall) it crouches behind both
// forearms and the runes flare. Runic Plating straps etched metal over its shoulders; Mana Core
// glows in its chest.
const GOLEM_STRIDE = 12;   // ground covered per step, before scaling (see updateUnit)
function drawGolem(ctx, o) {
  const st = TEAM_STYLE[o.team], f = o.facing, P = o.perks || NO_PERKS;
  ctx.save();
  ctx.translate(o.x, o.y - (o.lift || 0));
  if (o.fall) ctx.rotate(-f * o.fall * 1.2);
  if (o.alpha !== undefined) ctx.globalAlpha *= o.alpha;
  ctx.scale(o.scale * 1.2, o.scale * 1.2);   // a big brute of a thing
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  const stone = o.flash > 0 ? '#7a3a30' : o.team === 0 ? '#8c8678' : '#6c6268';
  const dark = shade(stone, -0.55), light = shade(stone, 0.2), rune = st.crystal, t = RT + o.seed;
  const hunker = !!o.wall, walking = o.moving && !hunker, ph = o.walk || 0;
  const glow = hunker ? 0.95 : 0.55 + 0.15 * Math.sin(t * 2.5);
  const X = x => x * f;
  const limb = (pts, w0, w1) => {
    // a thick stone limb, outlined, tapering from root to end
    for (const [col, extra] of [[dark, 2.4], [stone, 0]]) {
      for (let i = 0; i < pts.length - 1; i++) {
        ctx.strokeStyle = col;
        ctx.lineWidth = lerp(w0, w1, i / Math.max(1, pts.length - 2)) + extra;
        ctx.beginPath();
        ctx.moveTo(pts[i][0], pts[i][1]);
        ctx.lineTo(pts[i + 1][0], pts[i + 1][1]);
        ctx.stroke();
      }
    }
  };
  const fist = (x, y, r = 4.6) => {
    ctx.fillStyle = stone;
    ctx.strokeStyle = dark;
    ctx.lineWidth = 1.4;
    ctx.beginPath();
    ctx.ellipse(x, y, r * 1.15, r * 0.9, 0, 0, TAU);
    ctx.fill();
    ctx.stroke();
  };

  // a heavy, rocking gait: the body sinks on each footfall
  const step = walking ? Math.sin(ph) : 0;
  const bob = walking ? Math.abs(step) * 1.6 - 0.8 : Math.sin(t * 1.3) * 0.4;
  const hipY = (hunker ? -10 : -13) + bob;   // short, bowed legs under a long body
  const roll = walking ? step * 0.05 : 0;
  // knuckles swing opposite the legs
  const knuckle = (i, back) => {
    const p = ph + i * Math.PI + Math.PI;
    const kx = walking ? Math.sin(p) * GOLEM_STRIDE / 2 : 0;
    return [X((back ? -3 : 19) + kx), walking ? -2 - Math.max(0, Math.cos(p)) * 3 : -2];
  };

  // ---- the far arm and leg, behind the body
  const sh = [X(10), hipY - 20], shB = [X(-3), hipY - 21];
  if (!hunker) limb([shB, [X(-6), hipY - 8], knuckle(1, true)], 10, 7.5);
  for (let i = 0; i < 2; i++) {
    const p = ph + i * Math.PI;
    const fx = walking ? Math.sin(p) * GOLEM_STRIDE / 2 : (i ? -6 : 5), fy = walking ? -Math.max(0, Math.cos(p)) * 2.5 : 0;
    const kx = hunker ? (i ? -10 : 9) : fx * 0.5 + (i ? -4 : 4);   // bowed out at the knee
    limb([[X(i ? -5 : 1), hipY + 1], [X(kx), (hipY + fy) * 0.45], [X(fx), fy]], 8, 7);
  }

  ctx.save();
  ctx.translate(0, hipY);
  ctx.rotate(roll * f);
  // ---- the body: one mass of stone, a humped back rising to huge shoulders over narrow hips
  const hy = hunker ? -12 : -15;   // head height relative to the hips: hung below the hump
  ctx.fillStyle = stone;
  ctx.strokeStyle = dark;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(X(-7), 2);
  ctx.quadraticCurveTo(X(-13), -10, X(-9), -22);       // the back, curving up
  ctx.quadraticCurveTo(X(-4), -31, X(5), -29);          // the hump over the shoulders
  ctx.quadraticCurveTo(X(15), -27, X(17), -18);         // front of the shoulders
  ctx.quadraticCurveTo(X(16), -9, X(9), -5);            // the deep chest
  ctx.quadraticCurveTo(X(5), -1, X(4), 3);              // tucking in to the hips
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  texFill(ctx, -16, -31, 34, 34, 0.4);
  // lit ridge along the back and hump, cracks and seams in the stone
  ctx.strokeStyle = rgba(light, 0.55);
  ctx.lineWidth = 1.4;
  ctx.beginPath();
  ctx.moveTo(X(-11), -10);
  ctx.quadraticCurveTo(X(-11), -21, X(-8), -23);
  ctx.quadraticCurveTo(X(-3), -29, X(5), -27.5);
  ctx.stroke();
  ctx.strokeStyle = rgba(dark, 0.7);
  ctx.lineWidth = 0.9;
  ctx.beginPath();
  ctx.moveTo(X(-2), -26); ctx.lineTo(X(1), -20); ctx.lineTo(X(-1), -14);
  ctx.moveTo(X(9), -24); ctx.lineTo(X(7), -19);
  ctx.moveTo(X(-8), -6); ctx.lineTo(X(-5), -2);
  ctx.stroke();
  // runes down the chest
  ctx.strokeStyle = rgba(rune, glow);
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(X(10), -22); ctx.lineTo(X(13), -17); ctx.lineTo(X(10), -12);
  ctx.moveTo(X(3), -16); ctx.lineTo(X(6), -11);
  ctx.moveTo(X(-6), -18); ctx.quadraticCurveTo(X(-8), -13, X(-5), -9);
  ctx.stroke();
  if (P.plating) {
    ctx.strokeStyle = '#5a5e64';
    ctx.lineWidth = 3.2;
    ctx.beginPath();
    ctx.moveTo(X(-6), -27); ctx.quadraticCurveTo(X(6), -31, X(15), -22);
    ctx.stroke();
    ctx.strokeStyle = rgba(rune, 0.6);
    ctx.lineWidth = 0.8;
    ctx.stroke();
  }
  if (P.core) {
    const g = ctx.createRadialGradient(X(8), -15, 0, X(8), -15, 10);
    g.addColorStop(0, rgba('#9fe0ff', 0.9));
    g.addColorStop(1, rgba('#9fe0ff', 0));
    ctx.fillStyle = g;
    ctx.fillRect(X(8) - 10, -25, 20, 20);
  }
  // ---- the head: hung low and forward of the shoulders, a heavy brow over glowing eyes
  const hx = X(19);
  ctx.fillStyle = stone;
  ctx.strokeStyle = dark;
  ctx.lineWidth = 1.6;
  ctx.beginPath();
  ctx.moveTo(hx - X(5), hy - 4);
  ctx.quadraticCurveTo(hx, hy - 9, hx + X(6), hy - 4);
  ctx.lineTo(hx + X(6.5), hy + 3);
  ctx.quadraticCurveTo(hx + X(2), hy + 6, hx - X(4), hy + 4);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  // a jutting stone muzzle below the eyes
  ctx.fillStyle = light;
  ctx.strokeStyle = dark;
  ctx.lineWidth = 1.2;
  ctx.beginPath();
  ctx.ellipse(hx + X(4), hy + 2.5, 4.2, 3, 0, 0, TAU);
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = dark;
  ctx.beginPath();   // the heavy brow, overhanging the eyes
  ctx.moveTo(hx - X(4), hy - 4.5);
  ctx.quadraticCurveTo(hx + X(2), hy - 6, hx + X(7.5), hy - 3.5);
  ctx.lineTo(hx + X(6.5), hy - 2);
  ctx.quadraticCurveTo(hx + X(2), hy - 3.5, hx - X(3.5), hy - 2.5);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = rgba(rune, Math.min(1, glow + 0.25));   // eyes glowing deep under the brow
  ctx.beginPath();
  ctx.arc(hx + X(1.8), hy - 1, 1.1, 0, TAU);
  ctx.arc(hx + X(5), hy - 1, 1, 0, TAU);
  ctx.fill();
  ctx.restore();

  // ---- the near arm: knuckle-walking, a slam, or crossed in front when hunkered
  const shN = [sh[0], sh[1] + 1];
  if (hunker) {
    limb([shB, [X(4), hipY - 10], [X(17), hipY - 16]], 8, 7);
    fist(X(17), hipY - 16);
    limb([shN, [X(18), hipY - 6], [X(5), hipY - 13]], 8.5, 7.5);
    fist(X(5), hipY - 13);
    ctx.strokeStyle = rgba(rune, 0.35 + 0.15 * Math.sin(t * 6));   // a shimmer of warding magic
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(X(10), hipY - 10, 26, -1.2, 1.2);
    ctx.stroke();
  } else if (o.swing >= 0) {
    const th = swingAngle(o.swing, 1.4);
    const e = polar(shN[0], shN[1], th + 0.3, 13, f), h = polar(e[0], e[1], th - 0.1, 13, f);
    limb([shN, e, h], 11, 8);
    fist(h[0], h[1], 5.2);
  } else {
    const k = knuckle(0, false);
    const e = [lerp(shN[0], k[0], 0.5) + X(3), lerp(shN[1], k[1], 0.5)];
    limb([shN, e, k], 11, 8);
    fist(k[0], k[1] - 1);
  }
  ctx.restore();
}

// One of the ballista's crew: a stick figure standing at x whose hands reach for the given points
// (world units, relative to the ballista). lean tips the shoulders forward; crouch lowers the hips.
function drawCrew(ctx, x, hands, o) {
  const { f, col, st, t, moving, ph, lean = 3, crouch = 0, gear, team } = o;
  const hipY = -27 + crouch - (moving ? Math.abs(Math.cos(ph)) * 1.2 : 0);
  const sx = x + lean * f, sy = hipY - 21 + crouch * 0.2;
  const hx = sx + 4 * f + lean * 0.25 * f, hy = sy - 8;
  ctx.strokeStyle = col;
  ctx.lineWidth = 3.3;
  ctx.beginPath();
  // legs: walking (pushing) or braced
  for (let i = 0; i < 2; i++) {
    const p = ph + i * Math.PI;
    const fx = moving ? Math.sin(p) * 10 : (i ? -6 : 6), fy = moving ? -Math.max(0, Math.cos(p)) * 4 : 0;
    ctx.moveTo(x, hipY);
    ctx.lineTo(x + (fx * 0.5 + 4 - crouch * 0.3) * f, (hipY + fy) / 2 - crouch * 0.2);
    ctx.lineTo(x + fx * f, fy);
  }
  ctx.moveTo(x, hipY);
  ctx.lineTo(sx, sy);
  // arms: elbows bend down and out toward each hand
  for (const [tx, ty] of hands) {
    const mx = (sx + tx) / 2, my = (sy + 1 + ty) / 2 + 4;
    ctx.moveTo(sx, sy + 1);
    ctx.lineTo(mx, my);
    ctx.lineTo(tx, ty);
  }
  ctx.stroke();
  // a rough work apron over the hips
  ctx.fillStyle = '#4a3a2a';
  ctx.beginPath();
  ctx.moveTo(x - 3 * f, hipY - 4);
  ctx.lineTo(x + 4 * f, hipY - 4);
  ctx.lineTo(x + 5 * f, hipY + 8);
  ctx.lineTo(x - 2 * f, hipY + 8);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = col;
  ctx.beginPath();
  ctx.arc(hx, hy, 7, 0, TAU);
  ctx.fill();
  drawGear(ctx, gear, hx, hy, f, st, t, team);
}

// Ballista: a heavy, wheeled bolt-thrower worked by two crewmen. The winder at the back turns the
// windlass to haul the string back over most of the reload; the gunner beside it takes a bolt from
// the rack, lays it in the groove, sights along the stock and yanks the trigger at the release
// (swing 0.8). On the march both lean in and push. Torsion Springs bind iron around the rope
// skeins, Iron-tipped Bolts darken the heads in the rack, and the Mantlet adds a timber shield.
function drawBallista(ctx, o) {
  const st = TEAM_STYLE[o.team], f = o.facing, P = o.perks || NO_PERKS;
  ctx.save();
  ctx.translate(o.x, o.y - (o.lift || 0));
  if (o.fall) ctx.rotate(-f * o.fall * 0.5);
  if (o.alpha !== undefined) ctx.globalAlpha *= o.alpha;
  ctx.scale(o.scale, o.scale);
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  const k = BALLISTA.drawScale;
  const wood = o.flash > 0 ? '#7a2a20' : '#5e4128', woodLt = '#7a5a38', dark = '#24180e', iron = '#4a4c50', ironLt = '#7c8086';
  const t = RT + o.seed, s = o.swing, moving = !!o.moving, ph = o.walk || 0;
  const pull = s < 0 ? 1 : s < 0.8 ? Math.min(1, s / 0.6) : 0;   // how far the string is wound back
  const cranking = s >= 0 && s < 0.6;
  const loaded = s < 0 || (s >= 0.55 && s < 0.8);
  const col = o.flash > 0 ? '#6e1510' : st.body;
  const gear = unitGear('ballista', o.team, P);
  const E = (x, y) => [x * k * f, y * k];   // engine coordinates to the crew's (man-sized) space

  // ---- the winder, behind the engine, turning the crank (or pushing on the march)
  const wl = E(-19, -24);   // the windlass hub
  const ca = cranking ? t * 7 : 1.2;
  const handle = [wl[0] + Math.cos(ca) * 6 * f, wl[1] + Math.sin(ca) * 6];
  const winderX = wl[0] - 15 * f;
  drawCrew(ctx, winderX, moving ? [E(-23, -15), E(-22, -19)] : [handle, [handle[0] - 2 * f, handle[1] + 2]],
    { f, col, st, t, moving, ph, lean: moving ? 9 : 5, crouch: moving ? 3 : 1, gear, team: o.team });

  // ---- the engine
  ctx.save();
  ctx.scale(k, k);
  // the trail and carriage
  ctx.strokeStyle = dark;
  ctx.lineWidth = 5.6;
  ctx.beginPath();
  ctx.moveTo(-24 * f, -11); ctx.lineTo(20 * f, -12);
  ctx.moveTo(-5 * f, -12); ctx.lineTo(-2 * f, -26);
  ctx.moveTo(8 * f, -12); ctx.lineTo(5 * f, -27);
  ctx.stroke();
  ctx.strokeStyle = wood;
  ctx.lineWidth = 4;
  ctx.stroke();
  // iron straps on the carriage
  ctx.fillStyle = iron;
  for (const x of [-16, -3, 10]) ctx.fillRect(x * f - 1, -14, 2, 4);
  // the bolt rack on the near side of the carriage, holding spare bolts
  const spare = loaded ? 3 : s >= 0 && s < 0.3 ? 3 : 2;
  for (let i = 0; i < spare; i++) {
    ctx.strokeStyle = '#3e2a1a';
    ctx.lineWidth = 1.6;
    ctx.beginPath();
    ctx.moveTo(-14 * f, -15 - i * 2); ctx.lineTo(6 * f, -16 - i * 2);
    ctx.stroke();
    ctx.fillStyle = P.ironbolt ? '#6a7076' : '#a9b0b6';
    ctx.beginPath();
    ctx.moveTo(9 * f, -16 - i * 2); ctx.lineTo(6 * f, -17.5 - i * 2); ctx.lineTo(6 * f, -14.5 - i * 2);
    ctx.closePath();
    ctx.fill();
  }
  // wheels: spoked, iron-rimmed, turning as it rolls
  for (const wx of [-14, 12]) {
    const x = wx * f;
    ctx.fillStyle = dark;
    ctx.beginPath(); ctx.arc(x, -7.5, 7.5, 0, TAU); ctx.fill();
    ctx.strokeStyle = iron; ctx.lineWidth = 1.4;
    ctx.beginPath(); ctx.arc(x, -7.5, 7, 0, TAU); ctx.stroke();
    ctx.strokeStyle = woodLt; ctx.lineWidth = 1.1;
    ctx.beginPath();
    for (let i = 0; i < 4; i++) {
      const a = ph * 0.6 * f + (i / 4) * Math.PI;
      ctx.moveTo(x - Math.cos(a) * 6, -7.5 - Math.sin(a) * 6);
      ctx.lineTo(x + Math.cos(a) * 6, -7.5 + Math.sin(a) * 6);
    }
    ctx.stroke();
    ctx.fillStyle = ironLt;
    ctx.beginPath(); ctx.arc(x, -7.5, 1.6, 0, TAU); ctx.fill();
  }
  // the stock, tilted up a little, with its groove
  ctx.strokeStyle = dark;
  ctx.lineWidth = 6;
  ctx.beginPath(); ctx.moveTo(-21 * f, -24); ctx.lineTo(23 * f, -30); ctx.stroke();
  ctx.strokeStyle = wood;
  ctx.lineWidth = 4.4;
  ctx.stroke();
  ctx.strokeStyle = 'rgba(0,0,0,0.4)';
  ctx.lineWidth = 0.8;
  ctx.beginPath(); ctx.moveTo(-18 * f, -25.8); ctx.lineTo(20 * f, -30.8); ctx.stroke();
  // the windlass drum and its crank
  ctx.fillStyle = iron;
  ctx.beginPath(); ctx.arc(-19 * f, -24, 3.4, 0, TAU); ctx.fill();
  ctx.strokeStyle = ironLt;
  ctx.lineWidth = 1.2;
  ctx.beginPath(); ctx.moveTo(-19 * f, -24); ctx.lineTo(-19 * f + Math.cos(ca) * 4 * f, -24 + Math.sin(ca) * 4); ctx.stroke();
  // the trigger lever under the back of the stock
  const fired = s >= 0.8 && s < 0.95;
  ctx.strokeStyle = iron;
  ctx.lineWidth = 1.4;
  ctx.beginPath(); ctx.moveTo(-11 * f, -25); ctx.lineTo((fired ? -15 : -12) * f, -19); ctx.stroke();
  // the bow: twisted rope skeins at its root (bound in iron with Torsion Springs), arms bent back as it's wound
  const fx = 20 * f, fy = -29.5, bend = 6 * pull;
  ctx.fillStyle = P.torsion ? '#8a7650' : '#b8a070';
  ctx.fillRect(fx - 4 * f - 2.5, fy - 8, 5, 16);
  ctx.strokeStyle = '#5a4428';
  ctx.lineWidth = 0.8;
  ctx.beginPath();
  for (let i = -7; i < 8; i += 2.5) { ctx.moveTo(fx - 4 * f - 2.5, fy + i); ctx.lineTo(fx - 4 * f + 2.5, fy + i + 1.5); }
  ctx.stroke();
  if (P.torsion) {
    ctx.fillStyle = iron;
    ctx.fillRect(fx - 4 * f - 3, fy - 9, 6, 2);
    ctx.fillRect(fx - 4 * f - 3, fy + 7, 6, 2);
  }
  const top = [fx - bend * f, fy - 17], bot = [fx - bend * f, fy + 15];
  ctx.strokeStyle = dark;
  ctx.lineWidth = 3.4;
  ctx.beginPath();
  ctx.moveTo(...top); ctx.quadraticCurveTo(fx + 5 * f, fy - 6, fx, fy); ctx.quadraticCurveTo(fx + 5 * f, fy + 6, ...bot);
  ctx.stroke();
  ctx.fillStyle = iron;
  for (const p of [top, bot]) { ctx.beginPath(); ctx.arc(p[0], p[1], 1.3, 0, TAU); ctx.fill(); }
  // string to the nock, and the bolt lying in the groove once loaded
  const nx = fx - (4 + 30 * pull) * f, ny = fy + 4.5 * pull;
  ctx.strokeStyle = '#d8cfbc';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(...top); ctx.lineTo(nx, ny); ctx.lineTo(...bot);
  ctx.stroke();
  if (loaded && pull > 0.3) {
    ctx.strokeStyle = '#4a3220';
    ctx.lineWidth = 2.2;
    ctx.beginPath(); ctx.moveTo(nx, ny - 1); ctx.lineTo(fx + 8 * f, fy - 2); ctx.stroke();
    ctx.fillStyle = P.ironbolt ? '#6a7076' : '#a9b0b6';
    ctx.beginPath();
    ctx.moveTo(fx + 13 * f, fy - 2.5); ctx.lineTo(fx + 7 * f, fy - 5); ctx.lineTo(fx + 7 * f, fy + 0.5);
    ctx.closePath();
    ctx.fill();
  }
  // Mantlet: a timber shield across the front of the carriage
  if (P.mantlet) {
    ctx.fillStyle = '#4e3620';
    ctx.strokeStyle = dark;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(24 * f, -2); ctx.lineTo(24 * f, -22); ctx.lineTo(30 * f, -24); ctx.lineTo(30 * f, -2);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    ctx.strokeStyle = 'rgba(0,0,0,0.35)';
    ctx.beginPath();
    for (const y of [-8, -15]) { ctx.moveTo(24 * f, y); ctx.lineTo(30 * f, y - 1); }
    ctx.stroke();
    ctx.fillStyle = shade(st.accent, -0.2);
    ctx.fillRect(Math.min(24 * f, 30 * f) + 1, -14, 4, 3);
  }
  ctx.restore();

  // ---- the gunner, beside the engine on the near side
  ctx.save();
  ctx.translate(0, 4);   // standing a step nearer the camera than the engine
  const rack = E(-4, -16), groove = E(4, -31), stockBack = E(-12, -27), lever = E(fired ? -15 : -12, -19);
  let hands, lean = 6, crouch = 2;
  if (moving) { hands = [E(-2, -14), E(4, -15)]; lean = 9; crouch = 3; }
  else if (s >= 0.25 && s < 0.6) {
    // carrying a bolt from the rack to the groove
    const k2 = easeOut((s - 0.25) / 0.35), bh = lerp2(rack, groove, k2);
    hands = [bh, [bh[0] - 9 * f, bh[1] + 2]];
    ctx.strokeStyle = '#4a3220';
    ctx.lineWidth = 2.8;
    ctx.beginPath(); ctx.moveTo(bh[0] - 16 * f, bh[1] + 3); ctx.lineTo(bh[0] + 14 * f, bh[1] - 2); ctx.stroke();
    ctx.fillStyle = P.ironbolt ? '#6a7076' : '#a9b0b6';
    ctx.beginPath(); ctx.moveTo(bh[0] + 20 * f, bh[1] - 3); ctx.lineTo(bh[0] + 13 * f, bh[1] - 6); ctx.lineTo(bh[0] + 13 * f, bh[1]); ctx.closePath(); ctx.fill();
    lean = 8;
  } else {
    // sighting along the stock, a hand on the trigger lever
    hands = [stockBack, lever];   // crouched at the back of the stock
    lean = 4; crouch = 6;
  }
  drawCrew(ctx, -15 * f, hands, { f, col, st, t, moving, ph: ph + 1.4, lean, crouch, gear, team: o.team });
  ctx.restore();
  ctx.restore();
}

// A slim, slightly curved ninja blade with a round guard and a wrapped grip.
function drawKatana(ctx, x, y, ang, f, P, swing) {
  swingTrail(ctx, x, y, ang, 26, f, swing);
  const [mx, my] = polar(x, y, ang + 0.06, 14, f);
  const [tx, ty] = polar(x, y, ang + 0.14, 27, f);
  const [px, py] = polar(x, y, ang + Math.PI, 7, f);
  ctx.strokeStyle = '#1a1414';
  ctx.lineWidth = 2.8;
  ctx.beginPath();
  ctx.moveTo(px, py);
  ctx.lineTo(x, y);
  ctx.stroke();
  ctx.strokeStyle = P.serrated ? '#c8ccd0' : '#a9b0b6';
  ctx.lineWidth = 1.8;
  ctx.beginPath();
  ctx.moveTo(x, y);
  ctx.quadraticCurveTo(mx, my, tx, ty);
  ctx.stroke();
  if (P.serrated) {
    ctx.strokeStyle = '#7a8086';
    ctx.lineWidth = 1;
    ctx.beginPath();
    for (let k = 0.35; k < 0.95; k += 0.15) {
      const [sx, sy] = polar(x, y, ang + 0.1, 27 * k, f);
      const [nx, ny] = polar(sx, sy, ang + 0.1 + Math.PI / 2, 2, f);
      ctx.moveTo(sx, sy);
      ctx.lineTo(nx, ny);
    }
    ctx.stroke();
  }
  ctx.fillStyle = '#6a5a3a';
  ctx.beginPath();
  ctx.arc(x, y, 2.2, 0, TAU);
  ctx.fill();
}

// A four-pointed throwing star, spinning.
function drawStar(ctx, x, y, r, spin) {
  ctx.fillStyle = '#b8bec4';
  ctx.strokeStyle = '#2a2a2e';
  ctx.lineWidth = 0.8;
  ctx.beginPath();
  for (let i = 0; i < 8; i++) {
    const a = spin + (i / 8) * TAU, rr = i % 2 ? r * 0.35 : r;
    ctx.lineTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr);
  }
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
}

function drawStickman(ctx, o) {
  if (o.type === 'giant') return drawGiant(ctx, o);
  if (o.type === 'cleric' || o.type === 'warlock' || o.type === 'necromancer') return drawMage(ctx, o);
  if ((o.type === 'flyer' && !o.grounded) || o.type === 'firebird') return drawFlyer(ctx, o);
  if (o.type === 'ballista') return drawBallista(ctx, o);
  if (o.type === 'golem') return drawGolem(ctx, o);
  const st = TEAM_STYLE[o.team], f = o.facing, P = o.perks || NO_PERKS;
  const isZom = o.type === 'zombie';
  ctx.save();
  ctx.translate(o.x, o.y - (o.lift || 0));
  if (isZom && o.rise > 0) {
    // clawing its way up out of the ground: cut off below the surface, rising as it goes
    ctx.beginPath();
    ctx.rect(-60, -140, 120, 141);
    ctx.clip();
    ctx.translate(0, o.rise * 52);
  }
  if (o.fall) ctx.rotate(-f * o.fall * 1.5);
  if (o.alpha !== undefined) ctx.globalAlpha *= o.alpha;
  ctx.scale(o.scale, o.scale);
  const col = o.flash > 0 ? '#6e1510' : isZom ? mixHex(st.body, '#5e6e52', 0.5) : st.body;   // zombies have a sickly grey-green cast
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';

  const t = RT + o.seed, ph = o.walk;
  const isMiner = o.type === 'miner', isArcher = o.type === 'archer', isSword = o.type === 'sword', isSpear = o.type === 'spear';
  const isNinja = o.type === 'ninja', isKnife = o.type === 'flyer';   // a grounded Kestrel fights with a knife
  const isArch = o.type === 'architect', isQm = o.type === 'quartermaster', isGlad = o.type === 'gladiator';
  const isSling = o.type === 'beastmaster', isSab = o.type === 'saboteur';
  const praying = o.pray !== undefined && o.pray >= 0;
  const panning = !!o.panning || (isSab && !!o.salting) || ((isArch || isQm) && !!o.laying);   // hunched over: a saboteur salting a deposit, an architect laying a trap, a quartermaster tending someone
  const kneel = praying || panning;
  const wall = isSpear && o.wall;
  const run = (isSword || isNinja || isSab || isGlad || isQm) && o.moving && !(o.pace < 0.8);   // in a slow formation they walk
  const walk = o.moving && !run;

  // ---- hips and legs
  let hipY;
  const knees = [], feet = [];
  if (kneel) {
    hipY = -15;
    knees.push([9 * f, -15], [-2 * f, -1]);
    feet.push([11 * f, 0], [-15 * f, -2]);
  } else if (wall && !o.moving) {
    // braced crouch behind the shield
    hipY = -21;
    knees.push([11 * f, -12], [-5 * f, -11]);
    feet.push([12 * f, 0], [-12 * f, 0]);
  } else if (run) {
    hipY = -26 - Math.abs(Math.sin(ph)) * 2.5;
    for (let i = 0; i < 2; i++) {
      const p = ph + i * Math.PI;
      const fx = Math.sin(p) * 15, fy = -Math.max(0, Math.cos(p - 0.7)) * 12;
      const drive = Math.max(0, Math.cos(p)) * 7;
      feet.push([fx * f, fy]);
      knees.push([(fx * 0.45 + 4 + drive) * f, (hipY + fy) / 2 - drive * 0.6]);
    }
  } else if (walk) {
    const stride = isMiner ? 7 : 11, lift = isMiner ? 3 : 5;
    hipY = (isMiner ? -24 : -27) - Math.abs(Math.cos(ph)) * 1.4;
    for (let i = 0; i < 2; i++) {
      const p = ph + i * Math.PI;
      const fx = Math.sin(p) * stride, fy = -Math.max(0, Math.cos(p)) * lift;
      feet.push([fx * f, fy]);
      knees.push([(fx * 0.5 + (isMiner ? 6 : 3.5)) * f, (hipY + fy) / 2]);
    }
  } else {
    hipY = (isMiner ? -24 : -27) - Math.sin(t * 2) * 0.4;
    feet.push([6 * f, 0], [-5 * f, 0]);
    knees.push([(isMiner ? 8.5 : 6.5) * f, hipY / 2], [(isMiner ? 2 : -1) * f, hipY / 2]);
  }

  // ---- spine, shoulders, head
  let sx, sy, bow = 0;
  if (praying) {
    bow = (1 - Math.cos(o.pray * TAU)) / 2;
    const a = 0.15 + bow * 1.15;
    sx = Math.sin(a) * 22 * f;
    sy = hipY - Math.cos(a) * 22;
  } else if (panning) {
    // hunched low over the stream, swaying with the pan
    const a = 0.8 + Math.sin(t * 1.6) * 0.06;
    sx = Math.sin(a) * 21 * f;
    sy = hipY - Math.cos(a) * 21;
  } else if (isMiner) {
    const up = o.swing >= 0 ? Math.sin(Math.min(1, o.swing) * Math.PI) * 5 : 0;
    sx = (10 - up) * f;
    sy = hipY - 19 - up * 0.4;
  } else {
    const lean = isZom ? 9 : run ? 8 : wall ? 4 : o.swing > 0.4 && o.swing < 0.75 ? 4 : isArcher ? 0.5 : isSpear ? 2 : 1;   // (zombies hunch forward)
    sx = lean * f;
    sy = hipY - (isZom ? 19 : run ? 21 : 23);
  }
  const sdx = sx, sdy = sy - hipY, sl = Math.hypot(sdx, sdy);
  let hx = sx + (sdx / sl) * 9 + 1.5 * f, hy = sy + (sdy / sl) * 9;
  if (isMiner && !praying) { hx = sx + 6 * f; hy = sy - 6; }

  // ---- front (weapon) arm angle
  let th;
  if (isArcher) {
    const a = o.arch;
    th = a.phase === 'idle' ? 1.15 : a.phase === 'nock' ? lerp(1.15, a.fa, easeOut(a.k)) : a.fa;
  } else if (praying) th = lerp(-1.9, 1.1, bow);
  else if (panning) th = 1.05 + Math.sin(t * 5) * 0.18;
  else if (isSpear) {
    if (wall) th = -0.25;
    else if (o.swing >= 0) th = 0.1;
    else th = 0.55 + (walk ? Math.sin(ph + Math.PI) * 0.12 : Math.sin(t * 2) * 0.04);
  } else if (isSling) {
    // arm up to whirl the sling, a snap forward at the release, hanging at the side otherwise
    const s = o.swing;
    th = s < 0 ? 0.9 + Math.sin(t * 2) * 0.05 : s < 0.8 ? -1.45 : lerp(-1.45, 0.3, Math.min(1, (s - 0.8) / 0.12));
  } else if (isNinja && o.starRanged && o.swing >= 0) {
    // throwing a star: draw the arm back, then whip it forward (release at 0.8)
    const s = o.swing;
    th = s < 0.65 ? lerp(0.5, -2.3, easeOut(s / 0.65)) : lerp(-2.3, 0.4, Math.min(1, (s - 0.65) / 0.2));
  } else if (isZom) {
    // arms out in front, groping; a clumsy claw when it strikes
    th = o.swing >= 0 ? swingAngle(o.swing, 0.15) : -0.05 + Math.sin(t * 1.4) * 0.1;
  } else if (isSword || isNinja || isKnife || isGlad || (isSab && !panning)) {
    if (o.swing >= 0) th = swingAngle(o.swing, 0.45);
    else if (run) th = 1.75 + Math.sin(ph + Math.PI) * 0.45;
    else th = 0.45 + Math.sin(t * 2) * 0.05;
  } else {
    if (o.swing >= 0) th = swingAngle(o.swing, 0.75);
    else if (walk) th = 0.25 + Math.sin(ph) * 0.1;
    else th = 0.75 + Math.sin(t * 2) * 0.05;
  }
  let [ex, ey] = polar(sx, sy + 1, th + (isArcher ? 0.12 : 0.35), 8, f);
  let [hx2, hy2] = polar(ex, ey, isArcher ? th : th - 0.2, 8, f);
  // spear thrust: pull back, lunge forward, recover
  let spearAng = wall ? -0.3 : o.swing >= 0 ? 0.03 : -1.1;
  if (isSpear && o.swing >= 0) {
    const s = o.swing;
    const ext = s < 0.4 ? -7 * easeOut(s / 0.4) : s < 0.55 ? lerp(-7, 13, (s - 0.4) / 0.15) : lerp(13, 0, (s - 0.55) / 0.45);
    hx2 += ext * f;
    ex += ext * 0.5 * f;
  }
  const shieldAt = isSpear && (P.shield || wall) ? (wall ? [sx + 12 * f, sy + 16] : [sx + 6 * f, sy + 13]) : null;

  // ---- archer back hand / string / arrow
  let backHand = null, stringPt = null, arrow = null;
  if (isArcher) {
    const a = o.arch, k = a.k;
    const hang = polar(sx, sy + 1, Math.PI / 2 + 0.25, 14, f);
    const quiver = [sx - 7 * f, sy - 12];
    const rest = polar(hx2, hy2, th + Math.PI, 5, f);
    const full = polar(hx2, hy2, th + Math.PI, 35, f);
    if (a.phase === 'idle') backHand = hang;
    else if (a.phase === 'nock') backHand = k < 0.5 ? lerp2(hang, quiver, easeOut(k * 2)) : lerp2(quiver, rest, easeOut((k - 0.5) * 2));
    else if (a.phase === 'draw') backHand = polar(hx2, hy2, th + Math.PI, 5 + easeOut(k) * 30, f);
    else if (a.phase === 'aim') backHand = [full[0], full[1] + Math.sin(t * 40) * 0.3];
    else backHand = lerp2(full, polar(sx, sy + 1, th + Math.PI + 0.35, 16, f), easeOut(Math.min(1, k * 3)));
    stringPt = a.phase === 'draw' || a.phase === 'aim' ? backHand : [rest[0] + (a.phase === 'release' ? Math.sin(k * 60) * 2 * (1 - k) : 0), rest[1]];
    if (a.phase === 'nock' && k >= 0.5) arrow = [backHand, th];
    else if (a.phase === 'draw' || a.phase === 'aim') arrow = [stringPt, th];
    // quiver on the back (Deep Quivers: bigger and fuller)
    const qx = sx - (P.quiver ? 10 : 9) * f, qy = sy - (P.quiver ? 15 : 12);
    ctx.strokeStyle = P.quiver ? '#4a2e16' : '#3d2a18';
    ctx.lineWidth = P.quiver ? 6.5 : 5;
    ctx.beginPath();
    ctx.moveTo(sx - 3 * f, sy + 7);
    ctx.lineTo(qx, qy);
    ctx.stroke();
    ctx.strokeStyle = '#b8ad96';
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    for (let i = P.quiver ? -2 : -1; i <= (P.quiver ? 2 : 1); i++) {
      ctx.moveTo(qx + i * 1.4, qy);
      ctx.lineTo(qx - 2 * f + i * 2, qy - 5);
    }
    ctx.stroke();
  }

  // miner's pickaxe is slung on the back while praying
  if (isMiner && kneel) drawPick(ctx, sx - 4 * f, sy + 14, -1.25, f, P.pick, P.pick2);

  ctx.strokeStyle = col;
  ctx.fillStyle = col;
  ctx.lineWidth = 3.3;
  ctx.beginPath();
  // back arm
  if (isArcher) {
    ctx.moveTo(sx, sy + 1);
    ctx.lineTo(backHand[0], backHand[1]);
  } else if (kneel) {
    const [e2x, e2y] = polar(sx, sy + 1, th + 0.5, 8, f);
    const [h3x, h3y] = polar(e2x, e2y, th + 0.15, 8, f);
    ctx.moveTo(sx, sy + 1);
    ctx.lineTo(e2x, e2y);
    ctx.lineTo(h3x, h3y);
  } else if (shieldAt) {
    ctx.moveTo(sx, sy + 1);
    ctx.lineTo((sx + shieldAt[0]) / 2 - 3 * f, (sy + shieldAt[1]) / 2 + 4);
    ctx.lineTo(shieldAt[0], shieldAt[1]);
  } else if (isSpear) {
    const [gx, gy] = polar(hx2, hy2, spearAng + Math.PI, 12, f);
    ctx.moveTo(sx, sy + 1);
    ctx.lineTo((sx + gx) / 2 - 2 * f, (sy + gy) / 2 + 4);
    ctx.lineTo(gx, gy);
  } else if (isMiner) {
    const [gx, gy] = polar(hx2, hy2, th - 0.5 + Math.PI, 6, f);
    ctx.moveTo(sx, sy + 1);
    ctx.lineTo((sx + gx) / 2 - 2 * f, (sy + gy) / 2 + 3);
    ctx.lineTo(gx, gy);
  } else if (isZom) {
    // the other arm reaching out too, a little lower
    const [bex, bey] = polar(sx, sy + 1, th + 0.35 + Math.sin(t * 1.7) * 0.1, 8, f);
    const [bhx, bhy] = polar(bex, bey, th + 0.2, 8, f);
    ctx.moveTo(sx, sy + 1);
    ctx.lineTo(bex, bey);
    ctx.lineTo(bhx, bhy);
  } else if (run) {
    const a = Math.PI / 2 + Math.sin(ph) * 1.1;
    const [bex, bey] = polar(sx, sy + 1, a, 7, f);
    const [bhx, bhy] = polar(bex, bey, a - 1.4, 7, f);
    ctx.moveTo(sx, sy + 1);
    ctx.lineTo(bex, bey);
    ctx.lineTo(bhx, bhy);
  } else {
    const [ax, ay] = polar(sx, sy + 1, Math.PI / 2 + 0.1, 14, f);
    ctx.moveTo(sx, sy + 1);
    ctx.lineTo(ax, ay);
  }
  // legs
  for (let i = 0; i < 2; i++) {
    ctx.moveTo(0, hipY);
    ctx.lineTo(knees[i][0], knees[i][1]);
    ctx.lineTo(feet[i][0], feet[i][1]);
  }
  // spine (miners have a hunched, curved back)
  ctx.moveTo(0, hipY);
  if (isMiner && !praying) ctx.quadraticCurveTo(2 * f, sy, sx, sy);
  else ctx.lineTo(sx, sy);
  ctx.stroke();

  // ragged waist cloth on fighters
  if (isSword || isArcher || isSpear || isNinja || isKnife || isSling || isSab || isGlad || isZom) {
    const wave = Math.sin(t * (run ? 14 : 4)) * (run ? 3 : 1.2);
    ctx.strokeStyle = CLOTH[o.team];
    ctx.lineWidth = 2.2;
    ctx.beginPath();
    ctx.moveTo(-1 * f, hipY + 1);
    ctx.quadraticCurveTo(-7 * f, hipY + 5 + wave, -(11 + (run ? 5 : 0)) * f, hipY + 9 + wave);
    ctx.moveTo(1 * f, hipY + 1);
    ctx.lineTo(3 * f, hipY + 8 + wave * 0.5);
    ctx.stroke();
  }

  // miner extras: sack of gold, devout amulet, mason's hammer
  if (isMiner) {
    if (P.walls) {
      ctx.strokeStyle = '#4a3420';
      ctx.lineWidth = 1.8;
      ctx.beginPath();
      ctx.moveTo(-2 * f, hipY + 1);
      ctx.lineTo(-3 * f, hipY + 10);
      ctx.stroke();
      ctx.fillStyle = '#6a6e74';
      ctx.fillRect(-3 * f - 3, hipY + 9, 6, 3);
    }
    const cap = o.carryCap || 35;
    const full = Math.min(1, (o.carry || 0) / cap);
    const big = P.bag2 ? 3.2 : P.bag ? 1.8 : 0;
    const bx = sx - 6 * f, by = sy + 3, br = 5 + big + full * (3 + big);
    ctx.strokeStyle = col;
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(sx + 1 * f, sy);
    ctx.lineTo(bx, by - br * 0.8);
    ctx.stroke();
    ctx.fillStyle = '#6b5032';
    ctx.strokeStyle = '#2e2010';
    ellipse(ctx, bx, by, br * 1.05, br);
    ctx.fill();
    ctx.stroke();
    ctx.strokeStyle = 'rgba(0,0,0,0.3)';
    ctx.beginPath();
    ctx.moveTo(bx - br * 0.5, by - br * 0.2);
    ctx.lineTo(bx + br * 0.3, by + br * 0.5);
    ctx.stroke();
    if (o.carry > 0) {
      ctx.fillStyle = '#d8ac2c';
      ctx.beginPath();
      ctx.arc(bx - 1.5, by - br + 1.5, 1.8, 0, TAU);
      ctx.arc(bx + 2, by - br + 2, 1.6, 0, TAU);
      if (full > 0.6) ctx.arc(bx + 0.5, by - br + 0.5, 1.5, 0, TAU);
      ctx.fill();
    }
  }

  // head
  if (o.rage > 0.05) {
    const g = ctx.createRadialGradient(hx, hy, 2, hx, hy, 16);
    g.addColorStop(0, `rgba(200,30,20,${0.45 * o.rage})`);
    g.addColorStop(1, 'rgba(200,30,20,0)');
    ctx.fillStyle = g;
    ctx.fillRect(hx - 16, hy - 16, 32, 32);
  }
  ctx.fillStyle = col;
  ctx.beginPath();
  ctx.arc(hx, hy, 7, 0, TAU);
  ctx.fill();
  const gear = unitGear(o.type, o.team, P);
  if ((isSword || isSpear) && P.helm) drawHelmet(ctx, hx, hy, f, o.team === 1, isSpear ? shade(st.accent, -0.2) : null);
  else drawGear(ctx, gear, hx, hy, f, st, t, o.team);
  if (isSword && P.rage) {   // Adrenaline: red war paint across the eyes
    ctx.strokeStyle = '#a3241a';
    ctx.lineWidth = 1.6;
    ctx.beginPath();
    ctx.moveTo(hx - 1 * f, hy - 2.5);
    ctx.lineTo(hx + 6.5 * f, hy + 0.5);
    ctx.stroke();
  }
  if (o.team === 1 || o.rage > 0.3) {
    ctx.fillStyle = o.rage > 0.3 ? '#ff3a22' : st.accent2;
    ctx.beginPath();
    ctx.arc(hx + 3.5 * f, hy - 1, 1.3, 0, TAU);
    ctx.fill();
  }
  if (isMiner && P.devout) {
    if (P.devout2) {
      const g = ctx.createRadialGradient(sx + 2 * f, sy + 5, 0, sx + 2 * f, sy + 5, 7);
      g.addColorStop(0, rgba(st.crystal, 0.6));
      g.addColorStop(1, rgba(st.crystal, 0));
      ctx.fillStyle = g;
      ctx.fillRect(sx + 2 * f - 7, sy - 2, 14, 14);
    }
    ctx.fillStyle = st.crystal;
    ctx.beginPath();
    ctx.arc(sx + 2 * f, sy + 5, P.devout2 ? 2.4 : 1.8, 0, TAU);
    ctx.fill();
  }

  // weapon, then the front arm over it
  if (isSab) {
    // a satchel of salt on the hip and a short dagger
    ctx.fillStyle = '#d8d2c0';
    ctx.strokeStyle = '#3a2e22';
    ctx.lineWidth = 1;
    ellipse(ctx, -3 * f, hipY - 3, 4.5, 4);
    ctx.fill();
    ctx.stroke();
    if (!panning) {
      const [kx, ky] = polar(hx2, hy2, th - 1.0, 10, f);
      ctx.strokeStyle = '#a9b0b6';
      ctx.lineWidth = 1.6;
      ctx.beginPath();
      ctx.moveTo(hx2, hy2);
      ctx.lineTo(kx, ky);
      ctx.stroke();
    }
  } else if (isSling) {
    // the sling: whirled overhead while winding up, let go at the release, hanging loose otherwise
    const s = o.swing, spin = s * TAU * 3;
    let sx2 = hx2, sy2 = hy2 + 10, stone = true;
    if (s >= 0 && s < 0.8) { sx2 = hx2 + Math.cos(spin) * 11 * f; sy2 = hy2 + Math.sin(spin) * 5 - 3; }
    else if (s >= 0.8) { sx2 = hx2 + 9 * f; sy2 = hy2 + 3 + Math.sin(t * 30) * 2; stone = false; }
    ctx.strokeStyle = '#8a6a44';
    ctx.lineWidth = 1.1;
    ctx.beginPath();
    ctx.moveTo(hx2, hy2);
    ctx.lineTo(sx2, sy2);
    ctx.stroke();
    if (stone) {
      ctx.fillStyle = P.stones ? '#6a6d70' : '#8f8a80';
      ctx.beginPath();
      ctx.arc(sx2, sy2, P.stones ? 2.6 : 2, 0, TAU);
      ctx.fill();
    }
  } else if (isNinja) {
    if (o.starRanged) {
      // blade sheathed across the back, a star in the throwing hand until it flies
      drawKatana(ctx, sx - 8 * f, sy - 6, 2.3, f, P, -1);
      if (o.swing < 0 || o.swing < 0.8) drawStar(ctx, hx2, hy2, 4, t * (o.swing >= 0 ? 0 : 2));
    } else {
      drawKatana(ctx, hx2, hy2, run && o.swing < 0 ? th + 0.8 : th - 1.0, f, P, o.swing);
    }
  } else if (isKnife) {
    // the wings folded up on the back (broken spars, torn linen), and a short knife
    ctx.fillStyle = '#9c8c6a';
    ctx.beginPath();
    ctx.moveTo(sx - 2 * f, sy + 2);
    ctx.lineTo(sx - 9 * f, sy - 22);
    ctx.lineTo(sx - 14 * f, sy - 14);
    ctx.lineTo(sx - 12 * f, sy - 4);
    ctx.lineTo(sx - 17 * f, sy + 6);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = '#4a3420';
    ctx.lineWidth = 1.6;
    ctx.beginPath();
    for (const [dx, dy] of [[-9, -22], [-14, -14], [-17, 6]]) { ctx.moveTo(sx - 2 * f, sy + 2); ctx.lineTo(sx + dx * f, sy + dy); }
    ctx.stroke();
    const [kx, ky] = polar(hx2, hy2, th - 1.0, 11, f);
    ctx.strokeStyle = '#a9b0b6';
    ctx.lineWidth = 1.8;
    ctx.beginPath();
    ctx.moveTo(hx2, hy2);
    ctx.lineTo(kx, ky);
    ctx.stroke();
  } else if (isSword) {
    const bladeAng = run && o.swing < 0 ? th + 0.6 : th - 1.0;
    if (P.blades) drawSword(ctx, hx2, hy2, bladeAng, f, st, o.swing, P.greatsword);
    else drawClub(ctx, hx2, hy2, bladeAng, f, o.swing);
  } else if (isGlad) {
    // a short gladius in hand; the net bundled at the hip and the javelin across the back, while he has them
    if (o.net) {
      const nx = -5 * f, ny = hipY + 6;
      ctx.fillStyle = '#8a7c5c';
      ctx.beginPath(); ctx.ellipse(nx, ny, 5, 4, 0, 0, TAU); ctx.fill();
      ctx.strokeStyle = '#4a3e2a';
      ctx.lineWidth = 0.8;
      ctx.beginPath();
      for (let i = -1; i <= 1; i++) { ctx.moveTo(nx - 5, ny + i * 2); ctx.lineTo(nx + 5, ny + i * 2); ctx.moveTo(nx + i * 2.5, ny - 4); ctx.lineTo(nx + i * 2.5, ny + 4); }
      ctx.stroke();
    }
    if (o.javelin) {
      ctx.strokeStyle = '#6a4a2a';
      ctx.lineWidth = 1.8;
      ctx.beginPath(); ctx.moveTo(sx - 12 * f, sy + 14); ctx.lineTo(sx + 6 * f, sy - 20); ctx.stroke();
      ctx.fillStyle = '#a9b0b6';
      ctx.fillRect(sx + 5 * f - 1.5, sy - 23, 3, 4);
    }
    drawSword(ctx, hx2, hy2, run && o.swing < 0 ? th + 0.6 : th - 1.0, f, st, o.swing, false);
  } else if (isQm) {
    // a big pack with a bedroll on the back, and a bandage roll at the belt
    ctx.fillStyle = '#6a5636';
    ctx.strokeStyle = '#2a2014';
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.moveTo(sx - 3 * f, sy - 2); ctx.lineTo(sx - 13 * f, sy); ctx.lineTo(sx - 12 * f, sy + 16); ctx.lineTo(sx - 3 * f, sy + 15);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = '#8a3a2a';
    ctx.beginPath(); ctx.ellipse(sx - 8 * f, sy - 3, 6, 2.6, 0, 0, TAU); ctx.fill(); ctx.stroke();
    ctx.fillStyle = '#e8e0cc';
    ctx.beginPath(); ctx.arc(4 * f, hipY + 3, 2.6, 0, TAU); ctx.fill();
  } else if (isArch) {
    // plans rolled up in a tube on the back, and a mason's hammer in hand
    ctx.strokeStyle = '#c9b88a';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(sx - 4 * f, sy + 10);
    ctx.lineTo(sx - 9 * f, sy - 8);
    ctx.stroke();
    const [mx, my] = polar(hx2, hy2, th - 0.6, 11, f);
    ctx.strokeStyle = '#5a3e24';
    ctx.lineWidth = 1.8;
    ctx.beginPath();
    ctx.moveTo(hx2, hy2);
    ctx.lineTo(mx, my);
    ctx.stroke();
    const [ax, ay] = polar(mx, my, th - 0.6 + Math.PI / 2, 3.5, f), [bx, by] = polar(mx, my, th - 0.6 - Math.PI / 2, 3.5, f);
    ctx.strokeStyle = '#8a8d90';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(ax, ay);
    ctx.lineTo(bx, by);
    ctx.stroke();
  } else if (isMiner && panning) drawPan(ctx, hx2, hy2, th, f, t, P);
  else if (isMiner && !kneel) drawPick(ctx, hx2, hy2, th - 0.5, f, P.pick, P.pick2);
  else if (isArcher) {
    drawBow(ctx, hx2, hy2, th, f, stringPt, P.bow, st);
    if (arrow) drawNockedArrow(ctx, arrow[0], arrow[1], f, P.arrows);
  } else if (isSpear) {
    if (shieldAt) drawShield(ctx, shieldAt[0], shieldAt[1], f, st, wall, P.shield2);
    if (o.javelin) {
      // the javelin carried across the back
      ctx.strokeStyle = '#6a4a2a';
      ctx.lineWidth = 1.8;
      ctx.beginPath();
      ctx.moveTo(sx - 12 * f, sy + 14);
      ctx.lineTo(sx + 6 * f, sy - 20);
      ctx.stroke();
      ctx.fillStyle = '#a9b0b6';
      ctx.fillRect(sx + 5 * f - 1.5, sy - 23, 3, 4);
    }
    drawSpear(ctx, hx2, hy2, spearAng, f, P, st, t);
  }
  ctx.strokeStyle = col;
  ctx.lineWidth = 3.3;
  ctx.beginPath();
  ctx.moveTo(sx, sy + 1);
  ctx.lineTo(ex, ey);
  ctx.lineTo(hx2, hy2);
  ctx.stroke();
  ctx.restore();
}

// Tower Shields (tier 2) are drawn larger with a heavier iron rim.
function drawShield(ctx, x, y, f, st, tower, big) {
  ctx.save();
  if (big) {
    ctx.translate(x, y);
    ctx.scale(1.22, 1.18);
    ctx.translate(-x, -y);
  }
  drawShieldBody(ctx, x, y, f, st, tower);
  ctx.restore();
}

function drawShieldBody(ctx, x, y, f, st, tower) {
  ctx.strokeStyle = '#2a2622';
  ctx.lineWidth = 1.6;
  if (tower) {
    // tall shield-wall shield, rim catches the light
    ctx.fillStyle = '#4e3c28';
    ctx.beginPath();
    ctx.moveTo(x - 6, y - 26);
    ctx.lineTo(x + 6, y - 26);
    ctx.lineTo(x + 6.5, y + 20);
    ctx.lineTo(x - 6.5, y + 20);
    ctx.closePath();
    ctx.fill();
    texFill(ctx, x - 7, y - 26, 14, 46, 0.7);
    ctx.stroke();
    ctx.strokeStyle = '#7d8288';
    ctx.lineWidth = 1.8;
    ctx.strokeRect(x - 5, y - 25, 10, 44);
    ctx.fillStyle = shade(st.accent, -0.3);
    ctx.beginPath();
    ctx.arc(x, y - 3, 3.2, 0, TAU);
    ctx.fill();
    ctx.strokeStyle = `rgba(220,230,240,${0.25 + 0.2 * Math.sin(RT * 5)})`;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(x + 4 * f, y - 24);
    ctx.lineTo(x + 4 * f, y + 18);
    ctx.stroke();
    return;
  }
  ctx.fillStyle = '#4e3c28';
  ctx.beginPath();
  ctx.ellipse(x, y, 6.5, 10, 0, 0, TAU);
  ctx.fill();
  ctx.stroke();
  ctx.strokeStyle = '#7d8288';
  ctx.lineWidth = 1.4;
  ctx.beginPath();
  ctx.ellipse(x, y, 5.2, 8.6, 0, 0, TAU);
  ctx.stroke();
  ctx.fillStyle = shade(st.accent, -0.3);
  ctx.beginPath();
  ctx.arc(x, y, 2.4, 0, TAU);
  ctx.fill();
}

function drawSpear(ctx, x, y, ang, f, P, st, t) {
  const [bx, by] = polar(x, y, ang + Math.PI, 20, f);
  const [tx, ty] = polar(x, y, ang, 34, f);
  ctx.lineCap = 'round';
  ctx.strokeStyle = '#1e140c';
  ctx.lineWidth = 3.6;
  ctx.beginPath();
  ctx.moveTo(bx, by);
  ctx.lineTo(tx, ty);
  ctx.stroke();
  ctx.strokeStyle = '#5a3c22';
  ctx.lineWidth = 2.2;
  ctx.stroke();
  // leaf-shaped head
  const [p1x, p1y] = polar(tx, ty, ang, 9, f);
  const [s1x, s1y] = polar(tx, ty, ang + Math.PI / 2, 2.6, f);
  const [s2x, s2y] = polar(tx, ty, ang - Math.PI / 2, 2.6, f);
  ctx.fillStyle = '#9aa1a8';
  ctx.strokeStyle = '#26282b';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(s1x, s1y);
  ctx.lineTo(p1x, p1y);
  ctx.lineTo(s2x, s2y);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  if (P.halberd) {
    // axe blade and back hook below the point
    const [a0x, a0y] = polar(x, y, ang, 26, f);
    const [a1x, a1y] = polar(a0x, a0y, ang - Math.PI / 2, 8, f);
    const [a2x, a2y] = polar(tx, ty, ang - Math.PI / 2, 9, f);
    const [hkx, hky] = polar(a0x, a0y, ang + Math.PI / 2 + 0.4, 6, f);
    ctx.fillStyle = '#868d94';
    ctx.beginPath();
    ctx.moveTo(a0x, a0y);
    ctx.lineTo(a1x, a1y);
    ctx.quadraticCurveTo((a1x + a2x) / 2, (a1y + a2y) / 2, a2x, a2y);
    ctx.lineTo(tx, ty);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    ctx.strokeStyle = '#868d94';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(a0x, a0y);
    ctx.lineTo(hkx, hky);
    ctx.stroke();
  }
  if (P.inspire) {
    // leader's pennant streaming behind the spear head
    const [n1x, n1y] = polar(x, y, ang, 30, f);
    const [n2x, n2y] = polar(x, y, ang, 21, f);
    const wave = Math.sin(t * 6) * 2.5;
    ctx.fillStyle = shade(st.accent, -0.15);
    ctx.beginPath();
    ctx.moveTo(n1x, n1y);
    ctx.quadraticCurveTo(n1x - 8 * f, n1y + wave, n1x - 17 * f, n1y + 3 + wave);
    ctx.lineTo(n2x, n2y);
    ctx.closePath();
    ctx.fill();
  }
}

function drawHelmet(ctx, hx, hy, f, horns, crest) {
  if (crest) {
    // horsehair crest running front to back
    ctx.strokeStyle = crest;
    ctx.lineWidth = 3.2;
    ctx.beginPath();
    ctx.arc(hx - 1 * f, hy - 2, 9.5, Math.PI * 1.1, Math.PI * 1.9);
    ctx.stroke();
    ctx.lineWidth = 1.4;
    ctx.beginPath();
    ctx.moveTo(hx - 9 * f, hy - 5);
    ctx.lineTo(hx - 13 * f, hy + 2);
    ctx.stroke();
  }
  ctx.fillStyle = '#585c62';
  ctx.strokeStyle = '#25272a';
  ctx.lineWidth = 1.2;
  ctx.beginPath();
  ctx.arc(hx, hy - 0.5, 8.3, Math.PI * 1.02, Math.PI * 1.98);
  ctx.lineTo(hx + 8.3, hy + 1.5);
  ctx.lineTo(hx - 8.3, hy + 1.5);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  // cheek guard + nasal bar on the facing side
  ctx.fillRect(hx - (f > 0 ? 7.5 : 1.5), hy + 1, 9, 2);
  ctx.fillStyle = '#585c62';
  ctx.beginPath();
  ctx.moveTo(hx - 6 * f, hy + 1);
  ctx.lineTo(hx - 7.5 * f, hy + 6);
  ctx.lineTo(hx - 3 * f, hy + 4);
  ctx.closePath();
  ctx.fill();
  ctx.fillRect(hx + 4.5 * f - 1, hy - 1, 2, 6.5);
  ctx.strokeStyle = 'rgba(200,205,210,0.45)';
  ctx.lineWidth = 1.2;
  ctx.beginPath();
  ctx.arc(hx, hy - 0.5, 6.4, Math.PI * 1.25, Math.PI * 1.55);
  ctx.stroke();
  if (horns) {
    ctx.strokeStyle = '#c9bfa6';
    ctx.lineWidth = 2.2;
    ctx.beginPath();
    ctx.moveTo(hx - 6, hy - 5);
    ctx.quadraticCurveTo(hx - 12, hy - 8, hx - 9, hy - 15);
    ctx.moveTo(hx + 6, hy - 5);
    ctx.quadraticCurveTo(hx + 12, hy - 8, hx + 9, hy - 15);
    ctx.stroke();
  }
}

// Headgear comes from the unit's type and the upgrades it carries, never from chance, so a glance
// tells you what a soldier has: picks bring a cap lamp, Devout a pilgrim's hood, Military Training
// a headband, Forged Blades a cloth wrap, Shields a wrap, better bows a hood. The red side wears
// horns where the gold side wears a band. (Helmets are drawn separately, from the helm perk.)
function unitGear(type, team, P) {
  switch (type) {
    case 'miner': return P.devout ? 'hood' : P.pick || P.pick2 || P.diamond ? 'lamp' : 'none';
    case 'sword': return P.drill ? (team ? 'horns' : 'band') : P.blades ? 'wrap' : 'none';
    case 'spear': return P.shield ? 'wrap' : 'none';
    case 'archer': return P.bow || P.longbow ? 'hood' : 'none';
    case 'giant': return team ? 'horns' : 'none';
    case 'ninja': return 'ninja';
    case 'flyer': case 'firebird': return 'goggles';
    case 'ballista': return team ? 'horns' : 'band';
    case 'beastmaster': return 'pelt';
    case 'saboteur': return 'cowl';
    case 'architect': return 'hardhat';
    case 'quartermaster': return 'brim';
    case 'gladiator': return 'galea';
    default: return 'none';
  }
}

function drawGear(ctx, g, hx, hy, f, st, t, team) {
  switch (g) {
    case 'brim': {
      // a quartermaster's wide-brimmed felt hat
      ctx.fillStyle = '#4e3e26';
      ctx.strokeStyle = '#1e160c';
      ctx.lineWidth = 1;
      ctx.beginPath(); ctx.ellipse(hx, hy - 3.5, 11, 2.6, 0, 0, TAU); ctx.fill(); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(hx - 6, hy - 4); ctx.quadraticCurveTo(hx - 5, hy - 12, hx, hy - 12); ctx.quadraticCurveTo(hx + 5, hy - 12, hx + 6, hy - 4); ctx.closePath(); ctx.fill(); ctx.stroke();
      ctx.strokeStyle = shade(st.accent, -0.3);
      ctx.lineWidth = 1.6;
      ctx.beginPath(); ctx.moveTo(hx - 5.6, hy - 5.5); ctx.lineTo(hx + 5.6, hy - 5.5); ctx.stroke();
      break;
    }
    case 'galea': {
      // a gladiator's helmet: bowl, wide brim, grilled face and a crest in the side's colour
      ctx.fillStyle = '#7e848a';
      ctx.strokeStyle = '#26282b';
      ctx.lineWidth = 1.2;
      ctx.beginPath(); ctx.arc(hx, hy, 7.6, Math.PI * 1.05, Math.PI * 1.95); ctx.lineTo(hx + 10 * f, hy + 1); ctx.lineTo(hx - 10 * f, hy + 1); ctx.closePath(); ctx.fill(); ctx.stroke();
      ctx.strokeStyle = '#26282b';
      ctx.lineWidth = 0.9;
      ctx.beginPath();
      for (let i = 0; i < 3; i++) { ctx.moveTo(hx + (2 + i * 1.8) * f, hy - 1); ctx.lineTo(hx + (2 + i * 1.8) * f, hy + 5); }
      ctx.stroke();
      ctx.fillStyle = shade(st.accent, -0.15);
      ctx.beginPath(); ctx.moveTo(hx - 7 * f, hy - 5); ctx.quadraticCurveTo(hx - 2 * f, hy - 15, hx + 6 * f, hy - 8); ctx.quadraticCurveTo(hx, hy - 10, hx - 7 * f, hy - 5); ctx.fill();
      break;
    }
    case 'band':
    case 'wrap': {
      const c = g === 'band' ? shade(st.accent, -0.25) : '#5a4a38';
      ctx.strokeStyle = c;
      ctx.lineWidth = g === 'band' ? 2.4 : 3.4;
      ctx.beginPath();
      ctx.moveTo(hx - 6.6, hy - (g === 'band' ? 2 : 3.5));
      ctx.lineTo(hx + 6.6, hy - (g === 'band' ? 2 : 3.5));
      ctx.stroke();
      if (g === 'band') {
        const bx = hx - 6 * f, by = hy - 2;
        ctx.lineWidth = 1.6;
        ctx.beginPath();
        ctx.moveTo(bx, by);
        ctx.quadraticCurveTo(bx - 6 * f, by + 1, bx - 12 * f, by + 3 + Math.sin(t * 9) * 2);
        ctx.moveTo(bx, by);
        ctx.quadraticCurveTo(bx - 5 * f, by + 3, bx - 10 * f, by + 7 + Math.sin(t * 9 + 1) * 2);
        ctx.stroke();
      }
      break;
    }
    case 'horns':
      ctx.strokeStyle = '#c9bfa6';
      ctx.lineWidth = 2.4;
      ctx.beginPath();
      ctx.moveTo(hx - 4, hy - 5);
      ctx.quadraticCurveTo(hx - 10, hy - 9, hx - 7, hy - 15);
      ctx.moveTo(hx + 4, hy - 5);
      ctx.quadraticCurveTo(hx + 10, hy - 9, hx + 7, hy - 15);
      ctx.stroke();
      break;
    case 'mask':
      ctx.fillStyle = st.accent2;
      ctx.fillRect(hx + (f > 0 ? 0.5 : -5.5), hy - 2.5, 5, 2);
      break;
    case 'lamp': {
      ctx.fillStyle = '#4e432a';
      ctx.beginPath();
      ctx.arc(hx, hy, 7.8, Math.PI, 0);
      ctx.closePath();
      ctx.fill();
      const lx = hx + 6 * f, ly = hy - 4;
      const gr = ctx.createRadialGradient(lx, ly, 0, lx, ly, 11);
      gr.addColorStop(0, 'rgba(255,220,130,0.5)');
      gr.addColorStop(1, 'rgba(255,220,130,0)');
      ctx.fillStyle = gr;
      ctx.fillRect(lx - 11, ly - 11, 22, 22);
      ctx.fillStyle = '#f0d070';
      ctx.beginPath();
      ctx.arc(lx, ly, 2, 0, TAU);
      ctx.fill();
      break;
    }
    case 'ninja': {
      // a dark wrap over the head, an eye slit, and long tails streaming behind
      ctx.fillStyle = '#0e0c0c';
      ctx.beginPath();
      ctx.arc(hx, hy, 7.6, 0, TAU);
      ctx.fill();
      ctx.fillStyle = team === 1 ? '#c0432f' : '#d8c08a';
      ctx.fillRect(hx + (f > 0 ? -1 : -6), hy - 2.6, 7, 2);
      ctx.strokeStyle = team === 1 ? '#7a1e16' : '#5a4a2a';
      ctx.lineWidth = 1.6;
      const bx = hx - 6 * f, by = hy - 3;
      ctx.beginPath();
      ctx.moveTo(bx, by);
      ctx.quadraticCurveTo(bx - 8 * f, by - 1, bx - 16 * f, by + 2 + Math.sin(t * 11) * 3);
      ctx.moveTo(bx, by);
      ctx.quadraticCurveTo(bx - 7 * f, by + 3, bx - 13 * f, by + 8 + Math.sin(t * 11 + 1.3) * 3);
      ctx.stroke();
      break;
    }
    case 'cowl':
      // a deep charcoal hood with the cloak hanging down the back
      ctx.fillStyle = team === 1 ? '#2a1a1a' : '#26241f';
      ctx.beginPath();
      ctx.arc(hx - 0.5 * f, hy - 0.5, 8.4, Math.PI * 0.9, Math.PI * 2.1);
      ctx.lineTo(hx + 4 * f, hy + 3);
      ctx.lineTo(hx - 11 * f, hy + 14);
      ctx.closePath();
      ctx.fill();
      break;
    case 'pelt':
      // a wolf pelt worn as a hood, ears up, the hide hanging down the back
      ctx.fillStyle = '#5a4430';
      ctx.beginPath();
      ctx.arc(hx - 0.5 * f, hy - 1, 8.2, Math.PI * 0.95, Math.PI * 2.05);
      ctx.lineTo(hx - 9 * f, hy + 10);
      ctx.lineTo(hx - 6 * f, hy + 2);
      ctx.closePath();
      ctx.fill();
      ctx.beginPath();
      ctx.moveTo(hx - 4 * f, hy - 7); ctx.lineTo(hx - 6 * f, hy - 13); ctx.lineTo(hx - 1 * f, hy - 8);
      ctx.moveTo(hx + 2 * f, hy - 8); ctx.lineTo(hx + 2 * f, hy - 14); ctx.lineTo(hx + 5 * f, hy - 7);
      ctx.fill();
      ctx.fillStyle = '#d8c8a0';
      ctx.fillRect(hx + 5 * f - 1, hy - 5, 2, 2);
      break;
    case 'goggles':
      ctx.strokeStyle = '#4a3420';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(hx - 6.8, hy - 2);
      ctx.lineTo(hx + 6.8, hy - 2);
      ctx.stroke();
      ctx.fillStyle = '#9a8a5a';
      ctx.beginPath();
      ctx.arc(hx + 3.5 * f, hy - 2, 2.6, 0, TAU);
      ctx.fill();
      ctx.fillStyle = 'rgba(160,210,230,0.8)';
      ctx.beginPath();
      ctx.arc(hx + 3.5 * f, hy - 2, 1.5, 0, TAU);
      ctx.fill();
      break;
    case 'hardhat':
      // a brimmed leather cap
      ctx.fillStyle = '#7a5a30';
      ctx.beginPath();
      ctx.arc(hx, hy - 1, 7.6, Math.PI, 0);
      ctx.closePath();
      ctx.fill();
      ctx.fillRect(hx - 9 + (f > 0 ? 2 : 0), hy - 1.5, 16, 2);
      break;
    case 'hood':
      ctx.fillStyle = '#3d3022';
      ctx.beginPath();
      ctx.arc(hx - f, hy - 0.5, 8.4, Math.PI, 0);
      ctx.lineTo(hx - 8 * f, hy + 6);
      ctx.closePath();
      ctx.fill();
      break;
  }
}

function swingTrail(ctx, x, y, ang, len, f, swing) {
  if (!(swing > 0.42 && swing < 0.66)) return;
  const [tx, ty] = polar(x, y, ang, len, f);
  const [ox, oy] = polar(x, y, ang - 0.9, len, f);
  ctx.fillStyle = 'rgba(230,225,210,0.18)';
  ctx.beginPath();
  ctx.moveTo(x, y);
  ctx.lineTo(ox, oy);
  ctx.lineTo(tx, ty);
  ctx.closePath();
  ctx.fill();
}

// Great Swords (big): a longer, broader blade with a wider guard.
function drawSword(ctx, x, y, ang, f, st, swing, big) {
  const len = big ? 36 : 27;
  swingTrail(ctx, x, y, ang, len, f, swing);
  const [tx, ty] = polar(x, y, ang, len, f);
  const [px, py] = polar(x, y, ang + Math.PI, 5, f);
  ctx.lineCap = 'round';
  ctx.strokeStyle = '#1f2124';
  ctx.lineWidth = big ? 6 : 4.4;
  ctx.beginPath();
  ctx.moveTo(px, py);
  ctx.lineTo(tx, ty);
  ctx.stroke();
  ctx.strokeStyle = '#a9b0b6';
  ctx.lineWidth = big ? 3.2 : 2;
  ctx.beginPath();
  ctx.moveTo(x, y);
  ctx.lineTo(tx, ty);
  ctx.stroke();
  const [g1x, g1y] = polar(x, y, ang + Math.PI / 2, big ? 6.5 : 4.5, f);
  const [g2x, g2y] = polar(x, y, ang - Math.PI / 2, big ? 6.5 : 4.5, f);
  ctx.strokeStyle = shade(st.accent, -0.35);
  ctx.lineWidth = 2.6;
  ctx.beginPath();
  ctx.moveTo(g1x, g1y);
  ctx.lineTo(g2x, g2y);
  ctx.stroke();
}

function drawClub(ctx, x, y, ang, f, swing) {
  swingTrail(ctx, x, y, ang, 22, f, swing);
  const [px, py] = polar(x, y, ang + Math.PI, 4, f);
  const [mx, my] = polar(x, y, ang, 10, f);
  const [tx, ty] = polar(x, y, ang, 22, f);
  ctx.lineCap = 'round';
  ctx.strokeStyle = '#2a1c10';
  ctx.lineWidth = 4.2;
  ctx.beginPath();
  ctx.moveTo(px, py);
  ctx.lineTo(mx, my);
  ctx.stroke();
  ctx.lineWidth = 8.5;
  ctx.beginPath();
  ctx.moveTo(mx, my);
  ctx.lineTo(tx, ty);
  ctx.stroke();
  ctx.strokeStyle = '#5c3f24';
  ctx.lineWidth = 2.4;
  ctx.beginPath();
  ctx.moveTo(px, py);
  ctx.lineTo(mx, my);
  ctx.stroke();
  ctx.lineWidth = 6;
  ctx.beginPath();
  ctx.moveTo(mx, my);
  ctx.lineTo(tx, ty);
  ctx.stroke();
  ctx.fillStyle = '#8a8d90';
  for (const d of [14, 19]) {
    const [sx, sy] = polar(x, y, ang, d, f);
    const [nx, ny] = polar(sx, sy, ang + Math.PI / 2, 3.2, f);
    ctx.fillRect(nx - 1, ny - 1, 2, 2);
  }
}

// A shallow gold pan, swirled over the stream; better pans are bigger and brighter.
function drawPan(ctx, x, y, th, f, t, P) {
  const [cx, cy] = polar(x, y, th, 4, f);
  const r = P.pan2 ? 10 : P.pan1 ? 9 : 8;
  ctx.save();
  ctx.translate(cx, cy + 2);
  ctx.rotate(Math.sin(t * 5) * 0.12);
  ctx.fillStyle = P.pan2 ? '#8a8e93' : P.pan1 ? '#6f6c68' : '#5a4630';
  ctx.strokeStyle = '#1e1a16';
  ctx.lineWidth = 1.2;
  ellipse(ctx, 0, 0, r, r * 0.32);
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = 'rgba(80,120,135,0.75)';
  ellipse(ctx, Math.sin(t * 5) * 2, -0.5, r * 0.65, r * 0.18);
  ctx.fill();
  if (Math.sin(t * 7) > 0.4) {
    ctx.fillStyle = '#e0bf5a';
    ctx.fillRect(Math.cos(t * 5) * 3, -1.2, 1.6, 1.6);
  }
  ctx.restore();
}

function drawPick(ctx, x, y, ang, f, steel, tempered) {
  const L = tempered ? 19 : steel ? 18 : 17, H = tempered ? 12 : steel ? 11 : 9;
  const [tx, ty] = polar(x, y, ang, L, f);
  const [bx, by] = polar(x, y, ang + Math.PI, 8, f);
  ctx.strokeStyle = '#5a3c22';
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(bx, by);
  ctx.lineTo(tx, ty);
  ctx.stroke();
  const [h1x, h1y] = polar(tx, ty, ang - Math.PI / 2, H, f);
  const [h2x, h2y] = polar(tx, ty, ang + Math.PI / 2, H, f);
  const [cx, cy] = polar(tx, ty, ang, 5, f);
  ctx.strokeStyle = steel ? '#9aa3ad' : '#5e5750';
  ctx.lineWidth = steel ? 3.4 : 3.2;
  ctx.beginPath();
  ctx.moveTo(h1x, h1y);
  ctx.quadraticCurveTo(cx, cy, h2x, h2y);
  ctx.stroke();
  if (steel) {
    ctx.strokeStyle = tempered ? 'rgba(220,180,90,0.8)' : 'rgba(230,236,240,0.6)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(h1x, h1y);
    ctx.quadraticCurveTo(cx, cy, tx, ty);
    ctx.stroke();
  }
}

// Recurve bows (upgrade) are longer, darker and flick outward at the tips.
function drawBow(ctx, x, y, th, f, sp, recurve, st) {
  const L = recurve ? 17 : 14;
  let [t1x, t1y] = polar(x, y, th - Math.PI / 2, L, f);
  let [t2x, t2y] = polar(x, y, th + Math.PI / 2, L, f);
  [t1x, t1y] = polar(t1x, t1y, th + Math.PI, 5, f);
  [t2x, t2y] = polar(t2x, t2y, th + Math.PI, 5, f);
  const cx = 2 * x - (t1x + t2x) / 2, cy = 2 * y - (t1y + t2y) / 2;
  ctx.strokeStyle = recurve ? '#2c1a0c' : '#4e3018';
  ctx.lineWidth = recurve ? 3 : 2.6;
  ctx.beginPath();
  ctx.moveTo(t1x, t1y);
  ctx.quadraticCurveTo(cx, cy, t2x, t2y);
  ctx.stroke();
  if (recurve) {
    const [r1x, r1y] = polar(t1x, t1y, th, 4, f);
    const [r2x, r2y] = polar(t2x, t2y, th, 4, f);
    ctx.strokeStyle = shade(st.accent, -0.25);
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(t1x, t1y);
    ctx.lineTo(r1x, r1y);
    ctx.moveTo(t2x, t2y);
    ctx.lineTo(r2x, r2y);
    ctx.stroke();
  }
  ctx.strokeStyle = 'rgba(220,212,190,0.85)';
  ctx.lineWidth = 0.8;
  ctx.beginPath();
  ctx.moveTo(t1x, t1y);
  ctx.lineTo(sp[0], sp[1]);
  ctx.lineTo(t2x, t2y);
  ctx.stroke();
}

function drawNockedArrow(ctx, p, th, f, bodkin) {
  const [tx, ty] = polar(p[0], p[1], th, 30, f);
  ctx.strokeStyle = '#4a3420';
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(p[0], p[1]);
  ctx.lineTo(tx, ty);
  ctx.stroke();
  ctx.fillStyle = bodkin ? '#c4cbd2' : '#7d8288';
  const hl = bodkin ? 6 : 4;
  const [a1x, a1y] = polar(tx, ty, th + 2.75, hl, f);
  const [a2x, a2y] = polar(tx, ty, th - 2.75, hl, f);
  ctx.beginPath();
  ctx.moveTo(tx, ty);
  ctx.lineTo(a1x, a1y);
  ctx.lineTo(a2x, a2y);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = '#b8ad96';
  ctx.lineWidth = 1.2;
  const [f1x, f1y] = polar(p[0], p[1], th + 0.5, 4, f);
  const [f2x, f2y] = polar(p[0], p[1], th - 0.5, 4, f);
  ctx.beginPath();
  ctx.moveTo(f1x, f1y);
  ctx.lineTo(p[0], p[1]);
  ctx.lineTo(f2x, f2y);
  ctx.stroke();
}

// ---------------------------------------------------------------- statue

function texFill(ctx, x, y, w, h, alpha = 0.5) {
  ctx.save();
  ctx.globalAlpha *= alpha;
  ctx.fillStyle = texPattern(ctx, 'speck');
  ctx.fillRect(x, y, w, h);
  ctx.restore();
}

function drawBlock(ctx, x, y, w, h, stone, dark, light) {
  ctx.fillStyle = stone;
  ctx.fillRect(x, y, w, h);
  texFill(ctx, x, y, w, h, 0.6);
  ctx.fillStyle = rgba(light, 0.45);
  ctx.fillRect(x, y, w, 2);
  ctx.fillStyle = rgba(dark, 0.5);
  ctx.fillRect(x, y + h - 4, w, 4);
  // grime streaks
  ctx.fillStyle = rgba(dark, 0.18);
  for (let i = 0; i < w; i += 23) ctx.fillRect(x + ((i * 7) % w), y + 2, 3, h * 0.7);
  weather(ctx, x, y, w, h, x * 0.37 + y, 0.8);
  ctx.strokeStyle = dark;
  ctx.lineWidth = 2;
  ctx.strokeRect(x, y, w, h);
}

function drawStatue(ctx, s) {
  const st = TEAM_STYLE[s.team], f = s.team === 0 ? 1 : -1;
  const stone = s.stone, dark = shade(stone, -0.55), light = shade(stone, 0.25);
  const x = s.x, base = LANE_TOP - 2;
  ctx.save();
  if (s.flash > 0) ctx.translate(rnd(-2, 2), 0);
  ctx.fillStyle = 'rgba(0,0,0,0.3)';
  ellipse(ctx, x, base + 2, 95, 10);
  ctx.fill();

  if (s.dead) {
    drawBlock(ctx, x - 75, base - 20, 150, 20, stone, dark, light);
    for (let i = 0; i < 11; i++) {
      const bx = x + (i - 5) * 14 + Math.sin(i * 7.1) * 6, by = base - 20 - Math.abs(Math.sin(i * 3.3)) * 16;
      ctx.save();
      ctx.translate(bx, by);
      ctx.rotate(Math.sin(i * 2.7) * 0.6);
      ctx.fillStyle = i % 3 ? stone : shade(stone, -0.15);
      ctx.strokeStyle = dark;
      ctx.lineWidth = 1.5;
      ctx.fillRect(-10, -7, 20, 14);
      ctx.strokeRect(-10, -7, 20, 14);
      ctx.restore();
    }
    ctx.restore();
    return;
  }

  let y = base;
  for (const [w, h] of [[150, 20], [124, 28], [100, 16]]) {
    drawBlock(ctx, x - w / 2, y - h, w, h, stone, dark, light);
    y -= h;
  }
  ctx.fillStyle = shade(st.accent, -0.3);
  ctx.fillRect(x - 60, base - 44, 120, 3);

  drawStatueFigure(ctx, x, y, f, s.style.pose, stone, dark, light, st, s.team);
  drawCrystal(ctx, x, base - 33, st.crystal, s.glow);

  const n = Math.min(s.style.cracks.length, Math.floor((1 - s.hp / s.max) * (s.style.cracks.length + 1)));
  ctx.strokeStyle = rgba(dark, 0.95);
  ctx.lineWidth = 1.6;
  for (let i = 0; i < n; i++) {
    const line = s.style.cracks[i];
    ctx.beginPath();
    ctx.moveTo(x + line[0][0], base + line[0][1]);
    for (let k = 1; k < line.length; k++) ctx.lineTo(x + line[k][0], base + line[k][1]);
    ctx.stroke();
  }
  ctx.restore();
}

function drawStatueFigure(ctx, x, y, f, pose, stone, dark, light, st, team) {
  const P = p => [x + p[0] * f, y + p[1]];
  const hip = [0, -62], sh = [4, -122], head = [6, -147];
  let arms, weapon;
  switch (pose) {
    case 'sword': arms = [[[-14, -100], [-22, -80]], [[22, -142], [30, -172]]]; weapon = 'sword'; break;
    case 'spear': arms = [[[-16, -102], [-6, -84]], [[24, -112], [36, -126]]]; weapon = 'spear'; break;
    case 'crown': arms = [[[-14, -148], [-24, -178]], [[22, -148], [32, -178]]]; weapon = 'crown'; break;
    default: arms = [[[-18, -102], [-6, -86]], [[24, -140], [26, -174]]]; weapon = 'fist';
  }
  const segs = [
    [hip, [10, -30], [14, 0]],
    [hip, [-8, -30], [-14, 0]],
    [hip, sh],
    [sh, arms[0][0], arms[0][1]],
    [sh, arms[1][0], arms[1][1]],
  ];
  if (weapon === 'spear') {
    ctx.lineCap = 'butt';
    ctx.strokeStyle = dark;
    ctx.lineWidth = 8;
    ctx.beginPath();
    ctx.moveTo(...P([38, -4]));
    ctx.lineTo(...P([40, -236]));
    ctx.stroke();
    ctx.strokeStyle = stone;
    ctx.lineWidth = 4.5;
    ctx.stroke();
    ctx.fillStyle = light;
    ctx.strokeStyle = dark;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(...P([33, -232]));
    ctx.lineTo(...P([40, -266]));
    ctx.lineTo(...P([47, -232]));
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
  }
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  const limbPath = () => {
    ctx.beginPath();
    for (const sg of segs) {
      ctx.moveTo(...P(sg[0]));
      for (let i = 1; i < sg.length; i++) ctx.lineTo(...P(sg[i]));
    }
  };
  limbPath();
  ctx.strokeStyle = dark;
  ctx.lineWidth = 16;
  ctx.stroke();
  ctx.strokeStyle = stone;
  ctx.lineWidth = 10.5;
  ctx.stroke();
  ctx.save();
  ctx.globalAlpha = 0.7;
  ctx.strokeStyle = texPattern(ctx, 'speck');
  ctx.stroke();
  ctx.restore();
  ctx.strokeStyle = rgba(light, 0.4);
  ctx.lineWidth = 2.5;
  ctx.beginPath();
  ctx.moveTo(...P([-2, -64]));
  ctx.lineTo(...P([2, -120]));
  ctx.stroke();

  const [hx, hy] = P(head);
  ctx.fillStyle = stone;
  ctx.strokeStyle = dark;
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.arc(hx, hy, 17, 0, TAU);
  ctx.fill();
  texFill(ctx, hx - 17, hy - 17, 34, 34, 0.6);
  ctx.beginPath();
  ctx.arc(hx, hy, 17, 0, TAU);
  ctx.stroke();
  ctx.fillStyle = rgba(light, 0.35);
  ctx.beginPath();
  ctx.arc(hx - 5 * f, hy - 6, 6, 0, TAU);
  ctx.fill();
  // weathering drip under the head
  ctx.strokeStyle = rgba(dark, 0.35);
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(hx + 4 * f, hy + 12);
  ctx.lineTo(hx + 5 * f, hy + 30);
  ctx.stroke();
  if (team === 1) {
    const glow = 0.6 + 0.4 * Math.sin(RT * 3);
    ctx.fillStyle = `rgba(255,60,40,${glow})`;
    ctx.beginPath();
    ctx.arc(hx + 7 * f, hy - 2, 2.6, 0, TAU);
    ctx.fill();
  }

  if (weapon === 'sword') {
    const [bx, by] = P([30, -172]);
    const [tx, ty] = P([44, -250]);
    ctx.strokeStyle = dark;
    ctx.lineWidth = 11;
    ctx.beginPath();
    ctx.moveTo(bx, by);
    ctx.lineTo(tx, ty);
    ctx.stroke();
    ctx.strokeStyle = light;
    ctx.lineWidth = 6.5;
    ctx.stroke();
    ctx.strokeStyle = dark;
    ctx.lineWidth = 7;
    ctx.beginPath();
    ctx.moveTo(...P([16, -176]));
    ctx.lineTo(...P([46, -170]));
    ctx.stroke();
    ctx.strokeStyle = shade(st.accent, -0.3);
    ctx.lineWidth = 3.5;
    ctx.stroke();
  } else if (weapon === 'crown') {
    ctx.fillStyle = mixHex(st.accent, stone, 0.4);
    ctx.strokeStyle = dark;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(hx - 14, hy - 12);
    ctx.lineTo(hx - 15, hy - 30);
    ctx.lineTo(hx - 7, hy - 20);
    ctx.lineTo(hx, hy - 33);
    ctx.lineTo(hx + 7, hy - 20);
    ctx.lineTo(hx + 15, hy - 30);
    ctx.lineTo(hx + 14, hy - 12);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
  } else if (weapon === 'fist') {
    ctx.fillStyle = stone;
    ctx.strokeStyle = dark;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(...P([26, -178]), 9, 0, TAU);
    ctx.fill();
    ctx.stroke();
  }
}

function drawCrystal(ctx, x, y, col, glow) {
  const R = 34 + glow * 22 + Math.sin(RT * 2.5) * 4;
  const g = ctx.createRadialGradient(x, y, 2, x, y, R);
  g.addColorStop(0, rgba(col, 0.45 + glow * 0.35));
  g.addColorStop(1, rgba(col, 0));
  ctx.fillStyle = g;
  ctx.fillRect(x - R, y - R, 2 * R, 2 * R);
  ctx.fillStyle = shade(col, -0.1);
  ctx.strokeStyle = shade(col, -0.55);
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(x, y - 17);
  ctx.lineTo(x + 10, y - 2);
  ctx.lineTo(x, y + 12);
  ctx.lineTo(x - 10, y - 2);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = rgba(shade(col, 0.55), 0.8);
  ctx.beginPath();
  ctx.moveTo(x, y - 17);
  ctx.lineTo(x - 10, y - 2);
  ctx.lineTo(x - 2, y - 3);
  ctx.closePath();
  ctx.fill();
}

// ---------------------------------------------------------------- castle (cross-section)

function drawBricks(ctx, L, top, R, bottom, dark, alpha = 0.45) {
  ctx.strokeStyle = rgba(dark, alpha);
  ctx.lineWidth = 1;
  ctx.beginPath();
  for (let y = top, row = 0; y < bottom; y += 16, row++) {
    ctx.moveTo(L, y);
    ctx.lineTo(R, y);
    for (let x = L + (row % 2) * 16; x < R; x += 32) {
      ctx.moveTo(x, y);
      ctx.lineTo(x, Math.min(bottom, y + 16));
    }
  }
  ctx.stroke();
}

// A wall sliced open: lighter cut face with diagonal hatching.
function drawCut(ctx, x, y, w, h, color, dark) {
  ctx.fillStyle = color;
  ctx.fillRect(x, y, w, h);
  texFill(ctx, x, y, w, h, 0.7);
  ctx.save();
  ctx.beginPath();
  ctx.rect(x, y, w, h);
  ctx.clip();
  ctx.strokeStyle = rgba(dark, 0.3);
  ctx.lineWidth = 1;
  ctx.beginPath();
  for (let i = -h; i < w; i += 7) {
    ctx.moveTo(x + i, y + h);
    ctx.lineTo(x + i + h, y);
  }
  ctx.stroke();
  ctx.restore();
  ctx.strokeStyle = dark;
  ctx.lineWidth = 2;
  ctx.strokeRect(x, y, w, h);
}

// A repeatable pseudo-random number in 0..1 for seed and index (weathering looks the same every frame).
const hrand = (seed, i) => { const s = Math.sin(seed * 127.1 + i * 311.7) * 43758.5453; return s - Math.floor(s); };

// Age a wall: grime rising from the ground, light from one side and shade on the other, streaks
// of damp and soot running down from the top, chipped and stained patches, shadow under the eaves.
function weather(ctx, x, y, w, h, seed, k = 1) {
  ctx.save();
  ctx.beginPath();
  ctx.rect(x, y, w, h);
  ctx.clip();
  let g = ctx.createLinearGradient(0, y + h * 0.35, 0, y + h);
  g.addColorStop(0, 'rgba(22,15,8,0)');
  g.addColorStop(1, `rgba(22,15,8,${0.5 * k})`);
  ctx.fillStyle = g;
  ctx.fillRect(x, y, w, h);
  g = ctx.createLinearGradient(x, 0, x + w, 0);
  g.addColorStop(0, `rgba(255,232,196,${0.07 * k})`);
  g.addColorStop(0.55, 'rgba(0,0,0,0)');
  g.addColorStop(1, `rgba(0,0,0,${0.3 * k})`);
  ctx.fillStyle = g;
  ctx.fillRect(x, y, w, h);
  ctx.lineCap = 'butt';
  for (let i = 0; i < w / 6; i++) {
    const sx = x + hrand(seed, i) * w, len = h * (0.15 + hrand(seed, i + 50) * 0.65);
    ctx.strokeStyle = `rgba(14,9,5,${(0.06 + hrand(seed, i + 90) * 0.14) * k})`;
    ctx.lineWidth = 0.7 + hrand(seed, i + 20) * 2;
    ctx.beginPath();
    ctx.moveTo(sx, y);
    ctx.lineTo(sx + (hrand(seed, i + 7) - 0.5) * 2.5, y + len);
    ctx.stroke();
  }
  for (let i = 0; i < (w * h) / 700; i++) {
    const px = x + hrand(seed, i + 200) * w, py = y + hrand(seed, i + 300) * h, r = 1.2 + hrand(seed, i + 400) * 3.5;
    ctx.fillStyle = hrand(seed, i + 500) > 0.55 ? `rgba(255,240,210,${0.06 * k})` : `rgba(10,7,5,${0.22 * k})`;
    ctx.beginPath();
    ctx.ellipse(px, py, r * 1.5, r * 0.7, 0, 0, TAU);
    ctx.fill();
  }
  g = ctx.createLinearGradient(0, y, 0, y + 12);
  g.addColorStop(0, `rgba(0,0,0,${0.45 * k})`);
  g.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = g;
  ctx.fillRect(x, y, w, 12);
  ctx.restore();
}

// Texture the roof just filled (its path must still be the current path): courses of tiles or
// shingles, a few missing or dark ones and patches of moss, light catching the upper slope.
// tiles = false for stone (pediments): just the stains and the light.
function roofTiles(ctx, x, y, w, h, seed, tiles = true) {
  ctx.save();
  ctx.clip();
  if (tiles) {
    ctx.strokeStyle = 'rgba(0,0,0,0.38)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    for (let ry = y + 5, row = 0; ry < y + h + 6; ry += 5.5, row++) {
      ctx.moveTo(x, ry);
      ctx.lineTo(x + w, ry);
      for (let rx = x + (row % 2) * 4.5; rx < x + w; rx += 9) { ctx.moveTo(rx, ry - 5.5); ctx.lineTo(rx, ry); }
    }
    ctx.stroke();
  }
  for (let i = 0; i < (w * h) / 220; i++) {
    const px = x + hrand(seed, i) * w, py = y + hrand(seed, i + 40) * h, moss = hrand(seed, i + 80) > 0.62;
    ctx.fillStyle = moss ? 'rgba(74,92,40,0.4)' : 'rgba(0,0,0,0.32)';
    ctx.fillRect(px, py, 4 + hrand(seed, i + 9) * 6, moss ? 3 : 4.5);
  }
  const g = ctx.createLinearGradient(0, y, 0, y + h);
  g.addColorStop(0, 'rgba(255,228,186,0.14)');
  g.addColorStop(1, 'rgba(0,0,0,0.3)');
  ctx.fillStyle = g;
  ctx.fillRect(x, y, w, h);
  ctx.restore();
}

// The keep's flagstone floor, lived in: grime worn into the walkway, puddles catching the torch
// light, straw, a drain grate, and barrels and crates stacked by the gate.
function drawKeepFloor(ctx, L, F1, top, bot, seed) {
  const h = bot - top;
  ctx.save();
  ctx.beginPath();
  ctx.rect(L, top, F1 - L, h);
  ctx.clip();
  // the walkway down the middle is worn darker
  const g = ctx.createLinearGradient(0, top, 0, bot);
  g.addColorStop(0, 'rgba(0,0,0,0.35)');
  g.addColorStop(0.25, 'rgba(0,0,0,0.05)');
  g.addColorStop(0.6, 'rgba(20,14,8,0.22)');
  g.addColorStop(1, 'rgba(0,0,0,0.3)');
  ctx.fillStyle = g;
  ctx.fillRect(L, top, F1 - L, h);
  for (let i = 0; i < 26; i++) {
    const x = L + hrand(seed + 7, i) * (F1 - L), y = top + 10 + hrand(seed + 7, i + 40) * (h - 20);
    const r = 4 + hrand(seed + 7, i + 80) * 12;
    if (hrand(seed + 7, i + 120) > 0.72) {
      // a puddle: dark water with a glint of torchlight
      ctx.fillStyle = 'rgba(18,22,26,0.55)';
      ellipse(ctx, x, y, r * 1.8, r * 0.4);
      ctx.fill();
      ctx.fillStyle = `rgba(255,190,110,${0.12 + 0.06 * Math.sin(RT * 3 + i)})`;
      ellipse(ctx, x - r * 0.4, y - r * 0.1, r * 0.6, r * 0.12);
      ctx.fill();
    } else {
      ctx.fillStyle = 'rgba(12,9,6,0.18)';   // stains
      ellipse(ctx, x, y, r * 1.6, r * 0.45);
      ctx.fill();
    }
  }
  // scattered straw
  ctx.strokeStyle = 'rgba(190,160,90,0.45)';
  ctx.lineWidth = 1;
  ctx.beginPath();
  for (let i = 0; i < 60; i++) {
    const x = L + hrand(seed + 3, i) * (F1 - L), y = top + hrand(seed + 3, i + 60) * h, a = hrand(seed + 3, i + 120) * TAU;
    ctx.moveTo(x, y);
    ctx.lineTo(x + Math.cos(a) * 5, y + Math.sin(a) * 1.6);
  }
  ctx.stroke();
  // a drain grate
  ctx.fillStyle = '#0c0b0a';
  ctx.fillRect(270, bot - 22, 26, 9);
  ctx.strokeStyle = '#4a4846';
  ctx.lineWidth = 1.2;
  ctx.beginPath();
  for (let x = 272; x < 296; x += 4) { ctx.moveTo(x, bot - 22); ctx.lineTo(x, bot - 13); }
  ctx.stroke();
  ctx.restore();
  // barrels and crates stacked by the gate
  const barrel = (x, y) => {
    ctx.fillStyle = '#4a3220';
    ctx.strokeStyle = '#1a120a';
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.moveTo(x - 8, y);
    ctx.quadraticCurveTo(x - 10, y - 11, x - 8, y - 22);
    ctx.lineTo(x + 8, y - 22);
    ctx.quadraticCurveTo(x + 10, y - 11, x + 8, y);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    ctx.strokeStyle = '#3a3c3e';
    ctx.lineWidth = 1.6;
    ctx.beginPath();
    for (const dy of [-5, -17]) { ctx.moveTo(x - 9, y + dy); ctx.lineTo(x + 9, y + dy); }
    ctx.stroke();
    ctx.fillStyle = 'rgba(255,220,170,0.1)';
    ctx.fillRect(x - 6, y - 21, 3, 20);
  };
  const crate = (x, y, s) => {
    ctx.fillStyle = '#5a4128';
    ctx.strokeStyle = '#1e140c';
    ctx.lineWidth = 1.2;
    ctx.fillRect(x, y - s, s, s);
    ctx.strokeRect(x, y - s, s, s);
    ctx.beginPath();
    ctx.moveTo(x, y - s); ctx.lineTo(x + s, y);
    ctx.moveTo(x + s, y - s); ctx.lineTo(x, y);
    ctx.stroke();
    weather(ctx, x, y - s, s, s, x, 0.8);
  };
  crate(512, top + 4, 18);
  crate(528, top + 2, 14);
  crate(516, top - 12, 13);
  barrel(546, top + 6);
  barrel(22, top + 4);
}

function drawBanner(ctx, x, y, w, h, kind, st) {
  const sway = Math.sin(RT * 1.5 + x) * 2;
  const cloth = shade(st.accent, -0.35);
  ctx.fillStyle = cloth;
  ctx.strokeStyle = shade(st.accent, -0.7);
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(x, y);
  ctx.lineTo(x + w, y);
  ctx.lineTo(x + w + sway, y + h);
  ctx.lineTo(x + w * 0.7 + sway, y + h - 6);
  ctx.lineTo(x + w / 2 + sway, y + h - 12);
  ctx.lineTo(x + w * 0.25 + sway, y + h - 4);
  ctx.lineTo(x + sway, y + h);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  texFill(ctx, x, y, w, h, 0.5);
  ctx.fillStyle = st.body;
  ctx.strokeStyle = st.body;
  if (kind === 'stripe') ctx.fillRect(x + w / 2 - 3, y, 6, h - 14);
  else if (kind === 'chevron') {
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(x + 3, y + 14);
    ctx.lineTo(x + w / 2, y + 26);
    ctx.lineTo(x + w - 3, y + 14);
    ctx.stroke();
  } else if (kind === 'emblem') {
    ctx.beginPath();
    ctx.arc(x + w / 2, y + 20, 6, 0, TAU);
    ctx.fill();
  }
}

// An iron fire bowl on a tripod outside the gate, flames licking up and sparks drifting off.
function drawBrazier(ctx, x, y, seed) {
  ctx.strokeStyle = '#1e1c1a';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(x - 9, y); ctx.lineTo(x, y - 22); ctx.lineTo(x + 9, y);
  ctx.moveTo(x, y - 22); ctx.lineTo(x, y);
  ctx.stroke();
  ctx.fillStyle = '#2a2826';
  ctx.beginPath();
  ctx.moveTo(x - 12, y - 30);
  ctx.quadraticCurveTo(x, y - 16, x + 12, y - 30);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = '#5a4a3a';
  ctx.fillRect(x - 12, y - 31, 24, 2);
  for (let i = 0; i < 4; i++) {
    const fl = 7 + Math.sin(RT * 14 + i * 2.1 + seed) * 2.5 + (i % 2) * 3;
    ctx.fillStyle = i % 2 ? '#ffb347' : '#e8622a';
    ellipse(ctx, x - 6 + i * 4, y - 31 - fl * 0.6, 3, fl);
    ctx.fill();
  }
  ctx.fillStyle = '#fff1b0';
  ellipse(ctx, x, y - 33, 3, 4);
  ctx.fill();
  const wx = seed === 1 ? WORLD_W - x : x;   // the red keep is drawn mirrored; particles live in world space
  if (chance(0.15) && G.particles) G.particles.push({ kind: 'spark', x: wx + rnd(-6, 6), y: y - 40, vx: rnd(-8, 8), vy: rnd(-40, -20), life: 0.9, max: 0.9, color: '#ffb347', size: 1.2 });
}

function drawTorch(ctx, tx, ty, seed) {
  ctx.fillStyle = '#2b2018';
  ctx.fillRect(tx - 2, ty, 4, 12);
  const fl = 1 + Math.sin(RT * 17 + seed) * 0.15 + Math.sin(RT * 29 + seed) * 0.1;
  const g = ctx.createRadialGradient(tx, ty - 4, 0, tx, ty - 4, 46 * fl);
  g.addColorStop(0, 'rgba(255,160,60,0.4)');
  g.addColorStop(1, 'rgba(255,110,30,0)');
  ctx.fillStyle = g;
  ctx.fillRect(tx - 48, ty - 52, 96, 96);
  ctx.fillStyle = '#e8862a';
  ellipse(ctx, tx, ty - 5, 4 * fl, 8 * fl);
  ctx.fill();
  ctx.fillStyle = '#ffd47a';
  ellipse(ctx, tx, ty - 3, 2, 4 * fl);
  ctx.fill();
}

function drawBarracks(ctx, bx, base, st, hover) {
  const w = 100, L = bx - w / 2;
  if (hover) { ctx.shadowColor = 'rgba(255,215,120,0.9)'; ctx.shadowBlur = 14; }
  // stone footing
  ctx.fillStyle = '#4f4a44';
  ctx.fillRect(L, base - 32, w, 32);
  ctx.shadowBlur = 0;
  texFill(ctx, L, base - 32, w, 32, 0.7);
  drawBricks(ctx, L, base - 32, L + w, base, '#1d1a17', 0.6);
  weather(ctx, L, base - 32, w, 32, 11);
  // timber-framed upper storey
  ctx.fillStyle = '#7c7364';
  ctx.fillRect(L + 4, base - 84, w - 8, 52);
  texFill(ctx, L + 4, base - 84, w - 8, 52, 0.6);
  ctx.strokeStyle = '#2c2016';
  ctx.lineWidth = 4;
  ctx.strokeRect(L + 4, base - 84, w - 8, 52);
  ctx.beginPath();
  for (let i = 1; i < 4; i++) {
    const x = L + 4 + i * ((w - 8) / 4);
    ctx.moveTo(x, base - 84);
    ctx.lineTo(x, base - 32);
  }
  ctx.moveTo(L + 4, base - 84);
  ctx.lineTo(L + 4 + (w - 8) / 4, base - 32);
  ctx.moveTo(L + w - 4, base - 84);
  ctx.lineTo(L + w - 4 - (w - 8) / 4, base - 32);
  ctx.stroke();
  weather(ctx, L + 4, base - 84, w - 8, 52, 12);
  // shutters
  ctx.fillStyle = '#161210';
  ctx.fillRect(bx - 8, base - 72, 16, 18);
  // roof
  ctx.fillStyle = '#34302d';
  ctx.strokeStyle = '#151311';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(L - 8, base - 82);
  ctx.lineTo(bx, base - 116);
  ctx.lineTo(L + w + 8, base - 82);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  roofTiles(ctx, L - 8, base - 116, w + 16, 34, 13);
  texFill(ctx, L - 8, base - 116, w + 16, 34, 0.8);
  // door + sign with crossed blades
  ctx.fillStyle = '#0e0b09';
  ctx.beginPath();
  ctx.moveTo(bx - 14, base);
  ctx.lineTo(bx - 14, base - 24);
  ctx.arc(bx, base - 24, 14, Math.PI, 0);
  ctx.lineTo(bx + 14, base);
  ctx.fill();
  ctx.fillStyle = '#3d2c1c';
  ctx.fillRect(bx - 16, base - 54, 32, 14);
  ctx.strokeStyle = '#a7a9a9';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(bx - 10, base - 51);
  ctx.lineTo(bx + 10, base - 43);
  ctx.moveTo(bx + 10, base - 51);
  ctx.lineTo(bx - 10, base - 43);
  ctx.stroke();
  // spear rack
  ctx.strokeStyle = '#3a2a1a';
  ctx.lineWidth = 2;
  ctx.beginPath();
  for (let i = 0; i < 3; i++) {
    ctx.moveTo(L + w + 6 + i * 5, base);
    ctx.lineTo(L + w + 2 + i * 5, base - 46);
  }
  ctx.stroke();
  ctx.fillStyle = '#7d8288';
  for (let i = 0; i < 3; i++) ctx.fillRect(L + w + 1 + i * 5, base - 52, 2, 6);
  drawBanner(ctx, L + 10, base - 82, 16, 34, 'stripe', st);
}

// Stone hall of the spearton: columns, pediment, a shield over the door.
function drawSpearHall(ctx, x, base, st, hover) {
  const w = 100, L = x - w / 2, stone = '#5b5650', dark = '#1f1c19';
  if (hover) { ctx.shadowColor = 'rgba(255,215,120,0.9)'; ctx.shadowBlur = 14; }
  ctx.fillStyle = stone;
  ctx.fillRect(L, base - 78, w, 78);
  ctx.shadowBlur = 0;
  texFill(ctx, L, base - 78, w, 78, 0.8);
  drawBricks(ctx, L, base - 78, L + w, base, dark, 0.45);
  weather(ctx, L, base - 78, w, 78, 21);
  // columns
  for (const cx of [L + 10, L + w - 10]) {
    ctx.fillStyle = '#77716a';
    ctx.fillRect(cx - 6, base - 78, 12, 78);
    texFill(ctx, cx - 6, base - 78, 12, 78, 0.7);
    ctx.strokeStyle = dark;
    ctx.lineWidth = 1.5;
    ctx.strokeRect(cx - 6, base - 78, 12, 78);
    ctx.beginPath();
    ctx.moveTo(cx - 2, base - 74);
    ctx.lineTo(cx - 2, base - 4);
    ctx.moveTo(cx + 2, base - 74);
    ctx.lineTo(cx + 2, base - 4);
    ctx.stroke();
  }
  // pediment
  ctx.fillStyle = '#6a645d';
  ctx.strokeStyle = dark;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(L - 6, base - 78);
  ctx.lineTo(x, base - 108);
  ctx.lineTo(L + w + 6, base - 78);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  roofTiles(ctx, L - 6, base - 108, w + 12, 30, 22, false);
  texFill(ctx, L - 6, base - 108, w + 12, 30, 0.8);
  // heavy door + shield emblem
  ctx.fillStyle = '#0e0b09';
  ctx.fillRect(x - 15, base - 44, 30, 44);
  ctx.strokeStyle = '#3a2c1e';
  ctx.lineWidth = 1.2;
  ctx.beginPath();
  for (let i = -10; i <= 10; i += 10) {
    ctx.moveTo(x + i, base - 44);
    ctx.lineTo(x + i, base);
  }
  ctx.stroke();
  drawShield(ctx, x, base - 60, 1, st, false);
  ctx.strokeStyle = '#8a9096';
  ctx.lineWidth = 1.6;
  ctx.beginPath();
  ctx.moveTo(x - 14, base - 72);
  ctx.lineTo(x + 14, base - 48);
  ctx.stroke();
}


// The Mage Tower: a round stone tower under a slate cone, one window for each of the mages it
// trains: the Cleric's candlelit arch, the Warlock's violet rose window and the Necromancer's
// green-lit skull niche over the door.
function drawMageTower(ctx, x, base, st, hover) {
  const w = 66, top = base - 118, stone = '#5d5852', dark = '#1f1c19';
  ctx.save();
  if (hover) { ctx.shadowColor = 'rgba(255,215,120,0.9)'; ctx.shadowBlur = 14; }
  // the drum, a little narrower at the top
  ctx.fillStyle = stone;
  ctx.beginPath();
  ctx.moveTo(x - w / 2, base); ctx.lineTo(x - w / 2 + 4, top); ctx.lineTo(x + w / 2 - 4, top); ctx.lineTo(x + w / 2, base);
  ctx.closePath();
  ctx.fill();
  ctx.shadowBlur = 0;
  ctx.save();
  ctx.clip();
  texFill(ctx, x - w / 2, top, w, base - top, 0.8);
  drawBricks(ctx, x - w / 2, top, x + w / 2, base, dark, 0.45);
  // curve of the drum: light on one side, shade on the other
  const g = ctx.createLinearGradient(x - w / 2, 0, x + w / 2, 0);
  g.addColorStop(0, 'rgba(255,235,200,0.10)');
  g.addColorStop(0.45, 'rgba(0,0,0,0)');
  g.addColorStop(1, 'rgba(0,0,0,0.38)');
  ctx.fillStyle = g;
  ctx.fillRect(x - w / 2, top, w, base - top);
  weather(ctx, x - w / 2, top, w, base - top, 33);
  ctx.restore();
  ctx.strokeStyle = dark;
  ctx.lineWidth = 1.6;
  ctx.beginPath();
  ctx.moveTo(x - w / 2, base); ctx.lineTo(x - w / 2 + 4, top); ctx.lineTo(x + w / 2 - 4, top); ctx.lineTo(x + w / 2, base);
  ctx.stroke();
  // a band in the side's colour under the eaves
  ctx.fillStyle = shade(st.accent, -0.35);
  ctx.fillRect(x - w / 2 + 3, top + 2, w - 6, 5);
  // slate cone with a star on its spire
  ctx.fillStyle = '#3a3e46';
  ctx.beginPath();
  ctx.moveTo(x - w / 2 - 6, top + 2); ctx.lineTo(x, top - 46); ctx.lineTo(x + w / 2 + 6, top + 2);
  ctx.closePath();
  ctx.fill();
  ctx.save();
  ctx.clip();
  roofTiles(ctx, x - w / 2 - 6, top - 46, w + 12, 48, 18, false);
  weather(ctx, x - w / 2 - 6, top - 46, w + 12, 48, 34, 0.8);
  ctx.restore();
  ctx.strokeStyle = dark;
  ctx.stroke();
  ctx.strokeStyle = '#6a6e74';
  ctx.lineWidth = 1.6;
  ctx.beginPath(); ctx.moveTo(x, top - 46); ctx.lineTo(x, top - 58); ctx.stroke();
  ctx.fillStyle = shade(st.accent, 0.1);
  ctx.beginPath();
  for (let i = 0; i < 10; i++) { const a = -Math.PI / 2 + i * Math.PI / 5, r = i % 2 ? 2.2 : 5; ctx.lineTo(x + Math.cos(a) * r, top - 62 + Math.sin(a) * r); }
  ctx.closePath();
  ctx.fill();
  const flick = 0.75 + 0.25 * Math.sin(RT * 7 + x);
  // the Cleric's arched window, candlelit
  ctx.fillStyle = `rgba(255,214,130,${0.85 * flick})`;
  ctx.beginPath(); ctx.moveTo(x - 20, top + 46); ctx.lineTo(x - 20, top + 28); ctx.arc(x - 15, top + 28, 5, Math.PI, 0); ctx.lineTo(x - 10, top + 46); ctx.closePath(); ctx.fill();
  ctx.strokeStyle = dark; ctx.lineWidth = 1.2; ctx.stroke();
  ctx.beginPath(); ctx.moveTo(x - 15, top + 23); ctx.lineTo(x - 15, top + 46); ctx.stroke();
  // the Warlock's rose window, violet
  ctx.fillStyle = `rgba(176,102,232,${0.8 * flick})`;
  ctx.beginPath(); ctx.arc(x + 15, top + 34, 7, 0, TAU); ctx.fill();
  ctx.stroke();
  ctx.beginPath();
  for (let i = 0; i < 4; i++) { const a = i * Math.PI / 4; ctx.moveTo(x + 15 - Math.cos(a) * 7, top + 34 - Math.sin(a) * 7); ctx.lineTo(x + 15 + Math.cos(a) * 7, top + 34 + Math.sin(a) * 7); }
  ctx.stroke();
  // the Necromancer's skull niche over the door, green-lit
  ctx.fillStyle = '#0d0c0b';
  ctx.beginPath(); ctx.arc(x, base - 52, 7, Math.PI, 0); ctx.lineTo(x + 7, base - 44); ctx.lineTo(x - 7, base - 44); ctx.closePath(); ctx.fill();
  ctx.fillStyle = `rgba(130,255,150,${0.35 * flick})`;
  ctx.fillRect(x - 6, base - 57, 12, 13);
  ctx.fillStyle = '#d8d0bc';
  ctx.beginPath(); ctx.arc(x, base - 51, 3.6, 0, TAU); ctx.fill();
  ctx.fillRect(x - 2.2, base - 49, 4.4, 3);
  ctx.fillStyle = '#103a14';
  ctx.fillRect(x - 2.2, base - 52.5, 1.6, 1.6);
  ctx.fillRect(x + 0.6, base - 52.5, 1.6, 1.6);
  // an arched oak door
  ctx.fillStyle = '#0e0b09';
  ctx.beginPath(); ctx.moveTo(x - 11, base); ctx.lineTo(x - 11, base - 28); ctx.arc(x, base - 28, 11, Math.PI, 0); ctx.lineTo(x + 11, base); ctx.closePath(); ctx.fill();
  ctx.strokeStyle = '#3a2c1e';
  ctx.lineWidth = 1.2;
  ctx.beginPath();
  for (const dx of [-5, 0, 5]) { ctx.moveTo(x + dx, base - 36); ctx.lineTo(x + dx, base); }
  ctx.stroke();
  ctx.restore();
}

// Open-fronted archery range: straw butts with painted rings and a bow rack.
function drawRange(ctx, x, base, st, hover) {
  const w = 100, L = x - w / 2;
  if (hover) { ctx.shadowColor = 'rgba(255,215,120,0.9)'; ctx.shadowBlur = 14; }
  ctx.fillStyle = '#3e2e20';
  ctx.fillRect(L, base - 74, w, 74);
  ctx.shadowBlur = 0;
  texFill(ctx, L, base - 74, w, 74, 0.8);
  ctx.strokeStyle = 'rgba(12,8,5,0.6)';
  ctx.lineWidth = 1;
  ctx.beginPath();
  for (let y = base - 66; y < base; y += 9) {
    ctx.moveTo(L, y);
    ctx.lineTo(L + w, y);
  }
  ctx.stroke();
  weather(ctx, L, base - 74, w, 74, 31);
  // corner posts and roof
  ctx.fillStyle = '#2a1e14';
  ctx.fillRect(L - 2, base - 80, 5, 80);
  ctx.fillRect(L + w - 3, base - 80, 5, 80);
  ctx.fillStyle = '#3a2f22';
  ctx.strokeStyle = '#171009';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(L - 8, base - 78);
  ctx.lineTo(L + w * 0.3, base - 100);
  ctx.lineTo(L + w + 8, base - 84);
  ctx.lineTo(L + w + 8, base - 78);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  roofTiles(ctx, L - 8, base - 100, w + 16, 22, 32);
  texFill(ctx, L - 8, base - 100, w + 16, 22, 0.8);
  // targets
  for (const [tx, ty] of [[L + 20, base - 46], [L + w - 20, base - 40]]) {
    ctx.fillStyle = '#a08a5a';
    ctx.beginPath();
    ctx.arc(tx, ty, 11, 0, TAU);
    ctx.fill();
    ctx.strokeStyle = '#3a2a16';
    ctx.lineWidth = 1.5;
    ctx.stroke();
    ctx.strokeStyle = shade(st.accent, -0.35);
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(tx, ty, 7, 0, TAU);
    ctx.stroke();
    ctx.fillStyle = '#6e1510';
    ctx.beginPath();
    ctx.arc(tx, ty, 2.6, 0, TAU);
    ctx.fill();
    ctx.strokeStyle = '#2b1d10';
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.moveTo(tx + 1, ty - 1);
    ctx.lineTo(tx - 9, ty - 5);
    ctx.stroke();
    ctx.strokeStyle = '#2a1e14';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(tx - 6, ty + 9);
    ctx.lineTo(tx - 9, base);
    ctx.moveTo(tx + 6, ty + 9);
    ctx.lineTo(tx + 9, base);
    ctx.stroke();
  }
  // door
  ctx.fillStyle = '#0e0b09';
  ctx.fillRect(x - 11, base - 38, 22, 38);
  // bows hanging over the door
  for (let i = -1; i <= 1; i += 2) {
    ctx.strokeStyle = '#4e3018';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(x + i * 7, base - 54, 9, -Math.PI / 2 - 1.1, -Math.PI / 2 + 1.1);
    ctx.stroke();
  }
}

function drawLodge(ctx, lx, base, hover) {
  const w = 96, L = lx - w / 2;
  if (hover) { ctx.shadowColor = 'rgba(255,215,120,0.9)'; ctx.shadowBlur = 14; }
  ctx.fillStyle = '#4c3826';
  ctx.fillRect(L, base - 70, w, 70);
  ctx.shadowBlur = 0;
  texFill(ctx, L, base - 70, w, 70, 0.8);
  ctx.strokeStyle = 'rgba(15,10,6,0.6)';
  ctx.lineWidth = 1.2;
  ctx.beginPath();
  for (let x = L + 9; x < L + w; x += 9) {
    ctx.moveTo(x, base - 70);
    ctx.lineTo(x, base);
  }
  ctx.stroke();
  ctx.strokeStyle = '#21170e';
  ctx.lineWidth = 2;
  ctx.strokeRect(L, base - 70, w, 70);
  weather(ctx, L, base - 70, w, 70, 41);
  // sagging single-slope roof
  ctx.fillStyle = '#3a2f22';
  ctx.beginPath();
  ctx.moveTo(L - 10, base - 96);
  ctx.quadraticCurveTo(lx, base - 86, L + w + 10, base - 66);
  ctx.lineTo(L + w + 10, base - 60);
  ctx.lineTo(L - 10, base - 68);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  roofTiles(ctx, L - 10, base - 96, w + 20, 36, 42);
  texFill(ctx, L - 10, base - 96, w + 20, 36, 0.8);
  // door
  ctx.fillStyle = '#0e0b09';
  ctx.fillRect(lx - 12, base - 38, 24, 38);
  // sign with pickaxe
  ctx.fillStyle = '#5b4126';
  ctx.fillRect(lx - 15, base - 58, 30, 14);
  drawPick(ctx, lx - 4, base - 49, -0.6, 1, false);
  // lantern
  const lg = ctx.createRadialGradient(L + 8, base - 50, 0, L + 8, base - 50, 30);
  lg.addColorStop(0, 'rgba(255,200,110,0.45)');
  lg.addColorStop(1, 'rgba(255,200,110,0)');
  ctx.fillStyle = lg;
  ctx.fillRect(L - 22, base - 80, 60, 60);
  ctx.fillStyle = '#f0c060';
  ctx.fillRect(L + 5, base - 54, 6, 8);
  // ore cart
  const cx = L + w + 20;
  ctx.fillStyle = '#3e3328';
  ctx.beginPath();
  ctx.moveTo(cx - 16, base - 24);
  ctx.lineTo(cx + 16, base - 24);
  ctx.lineTo(cx + 12, base - 8);
  ctx.lineTo(cx - 12, base - 8);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = '#c99b2a';
  ctx.beginPath();
  ctx.arc(cx - 6, base - 25, 4, 0, TAU);
  ctx.arc(cx + 2, base - 27, 5, 0, TAU);
  ctx.arc(cx + 9, base - 25, 3.5, 0, TAU);
  ctx.fill();
  ctx.fillStyle = '#1a1612';
  ctx.beginPath();
  ctx.arc(cx - 8, base - 6, 5, 0, TAU);
  ctx.arc(cx + 8, base - 6, 5, 0, TAU);
  ctx.fill();
}

function drawResearchBar(ctx, x, y, frac) {
  ctx.fillStyle = 'rgba(0,0,0,0.65)';
  ctx.fillRect(x - 31, y - 1, 62, 7);
  ctx.fillStyle = '#c49a2c';
  ctx.fillRect(x - 30, y, 60 * frac, 5);
  if (Math.sin(RT * 9) > 0.6) {
    ctx.fillStyle = '#ffcf6a';
    ctx.fillRect(x + rnd(-20, 20), y - rnd(4, 14), 2, 2);
  }
}

// The stream that runs along the front of the castle floor and out under the gate.
// Garrisoned miners kneel on its bank to pan.
// The stream, in castle coordinates (the red keep is drawn mirrored): it runs along the front of
// the keep below a stone quay, where garrisoned miners kneel to pan, slips out through an iron
// grate under the front wall and winds away through the foreground in a couple of S-bends.
// Returns { top, bot } polylines (for the banks), sampled every few pixels.

// The Sifter (castle upgrade): a long wooden sluice laid in the stream along the panning quay, with
// riffle bars catching the gold and the water frothing over them, and a rocker box at its head.
function drawSifter(ctx) {
  const y = LANE_BOT + 22, x0 = 150, x1 = 505, h = 9;
  ctx.save();
  ctx.fillStyle = 'rgba(0,0,0,0.3)';
  ctx.fillRect(x0, y + h, x1 - x0, 3);
  ctx.fillStyle = '#4e3620';   // the trough's sides
  ctx.fillRect(x0, y, x1 - x0, h);
  ctx.fillStyle = '#20303a';   // water running down it
  ctx.fillRect(x0 + 2, y + 2, x1 - x0 - 4, h - 4);
  ctx.fillStyle = '#6a4a2c';   // riffle bars
  for (let x = x0 + 8; x < x1 - 4; x += 13) ctx.fillRect(x, y + 1, 2.5, h - 2);
  for (let i = 0; i < 9; i++) {   // froth tumbling over the bars
    const k = (RT * 0.6 + i * 0.113) % 1, fx = x0 + 10 + k * (x1 - x0 - 20);
    ctx.fillStyle = `rgba(220,235,240,${0.5 * (1 - k)})`;
    ctx.fillRect(fx, y + 3 + (i % 2), 3, 1.5);
  }
  ctx.fillStyle = 'rgba(232,190,80,0.8)';   // flecks caught in the riffles
  for (let x = x0 + 12; x < x1; x += 39) ctx.fillRect(x, y + h - 4, 1.6, 1.6);
  // posts holding it in the current, and the rocker box at its head
  ctx.fillStyle = '#3a2814';
  for (const x of [x0 + 20, (x0 + x1) / 2, x1 - 20]) ctx.fillRect(x - 2, y + h, 4, 8);
  ctx.fillStyle = '#5e4128';
  ctx.fillRect(x0 - 26, y - 12, 28, 20);
  ctx.strokeStyle = '#24180d';
  ctx.lineWidth = 1.2;
  ctx.strokeRect(x0 - 26, y - 12, 28, 20);
  ctx.beginPath(); ctx.moveTo(x0 - 26, y - 4); ctx.lineTo(x0 + 2, y - 4); ctx.moveTo(x0 - 14, y - 12); ctx.lineTo(x0 - 18, y - 22); ctx.stroke();   // a slat and the rocker handle
  weather(ctx, x0 - 26, y - 12, x1 - x0 + 26, h + 12, 7.7, 0.6);
  ctx.restore();
}
function streamShape(F1) {
  const quay = LANE_BOT + 16, top = [], bot = [];
  for (let x = -90; x <= F1 + 460; x += 6) {
    const out = Math.max(0, (x - F1) / 380);          // how far beyond the wall (0 inside)
    const fall = out * out * (3 - 2 * Math.min(1, out)); // smoothstep: it turns down out of view
    let y = quay + 4 + Math.sin(x * 0.017) * 3 + Math.sin(x * 0.041 + 1.3) * 1.5;
    y += fall * (VIEW_H + 60 - quay) + Math.sin(out * 6.5) * 18 * Math.min(1, out * 2);
    const w = (20 + Math.sin(x * 0.011 + 1) * 4) * (1 + out * 0.7);
    top.push([x, y]);
    bot.push([x, y + w]);
  }
  return { top, bot };
}

function drawStream(ctx, F1, stone, dark) {
  const { top, bot } = streamShape(F1), quay = LANE_BOT + 16, t = RT;
  const path = () => {
    ctx.beginPath();
    ctx.moveTo(top[0][0], top[0][1]);
    for (const p of top) ctx.lineTo(p[0], p[1]);
    for (let i = bot.length - 1; i >= 0; i--) ctx.lineTo(bot[i][0], bot[i][1]);
    ctx.closePath();
  };
  // muddy banks, wider than the water
  ctx.fillStyle = '#2a221a';
  ctx.beginPath();
  ctx.moveTo(top[0][0], top[0][1] - 3);
  for (const p of top) ctx.lineTo(p[0], p[1] - 3);
  for (let i = bot.length - 1; i >= 0; i--) ctx.lineTo(bot[i][0], bot[i][1] + 5);
  ctx.closePath();
  ctx.fill();
  // the water: dark and deep in the middle, a little lighter at the edges
  path();
  const g = ctx.createLinearGradient(0, quay, 0, VIEW_H);
  g.addColorStop(0, '#2b4650');
  g.addColorStop(0.5, '#1d3139');
  g.addColorStop(1, '#14232a');
  ctx.fillStyle = g;
  ctx.fill();
  ctx.save();
  path();
  ctx.clip();
  // reflected sky along the far edge, ripples drifting downstream, glints of light
  ctx.strokeStyle = 'rgba(160,200,210,0.18)';
  ctx.lineWidth = 2;
  ctx.beginPath();
  for (let i = 0; i < top.length; i++) { const [x, y] = top[i]; i ? ctx.lineTo(x, y + 3) : ctx.moveTo(x, y + 3); }
  ctx.stroke();
  ctx.lineWidth = 1;
  for (let i = 2; i < top.length - 2; i++) {
    const [x, y0] = top[i], y1 = bot[i][1], w = y1 - y0;
    const flow = (t * 30 + i * 37) % 60 / 60;           // ripples travel along with the current
    for (const [k, len] of [[0.3, 7], [0.6, 11], [0.8, 5]]) {
      const ph = (i * 13.7 + k * 31) % 1;
      if (((ph + flow) % 1) > 0.4) continue;
      const ry = y0 + w * k, rx = x + flow * 6;
      ctx.strokeStyle = `rgba(185,215,222,${0.16 + 0.14 * Math.sin(t * 3 + i)})`;
      ctx.beginPath();
      ctx.moveTo(rx, ry);
      ctx.quadraticCurveTo(rx + len / 2, ry - 1.2, rx + len, ry + 0.3);
      ctx.stroke();
    }
    if ((i * 7) % 11 === 0) {
      ctx.fillStyle = `rgba(255,240,200,${Math.max(0, Math.sin(t * 2.3 + i * 1.7)) * 0.35})`;
      ctx.fillRect(x, y0 + w * 0.4, 2, 1);
    }
  }
  ctx.restore();
  // inside the keep: the quay's cut-stone face above the water
  ctx.fillStyle = shade(stone, -0.35);
  ctx.fillRect(-90, quay - 2, F1 + 90, 6);
  ctx.strokeStyle = rgba(dark, 0.8);
  ctx.lineWidth = 1;
  ctx.beginPath();
  for (let x = -80; x < F1; x += 22) { ctx.moveTo(x, quay - 2); ctx.lineTo(x, quay + 4); }
  ctx.moveTo(-90, quay + 4); ctx.lineTo(F1, quay + 4);
  ctx.stroke();
  // the iron grate where it passes under the front wall
  ctx.strokeStyle = '#1e1d1c';
  ctx.lineWidth = 2;
  ctx.beginPath();
  const gy = quay + 2, gh = 26;
  for (let x = F1 - 24; x <= F1; x += 6) { ctx.moveTo(x, gy); ctx.lineTo(x, gy + gh); }
  ctx.moveTo(F1 - 26, gy + 8); ctx.lineTo(F1 + 2, gy + 8);
  ctx.stroke();
  // rocks along the banks and reeds outside the walls
  for (let i = 3; i < top.length; i += 7) {
    const side = i % 2 ? top[i] : bot[i], [x, y] = side;
    if (x < F1 && side === top[i]) continue;   // the quay's straight edge has no rocks
    const r = 2.5 + ((i * 17) % 5);
    ctx.fillStyle = '#4a443e';
    ellipse(ctx, x, y + (side === top[i] ? -1 : 2), r * 1.3, r * 0.75);
    ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,0.08)';
    ellipse(ctx, x - r * 0.3, y + (side === top[i] ? -2 : 1), r * 0.6, r * 0.3);
    ctx.fill();
  }
  ctx.strokeStyle = '#4a5a2a';
  ctx.lineWidth = 1.2;
  ctx.beginPath();
  for (let i = 0; i < top.length; i += 3) {
    const [x, y] = i % 2 ? top[i] : bot[i];
    if (x < F1 + 10) continue;
    const sw = Math.sin(t * 1.5 + i) * 1.5, up = i % 2 ? -1 : 1;
    for (let k = -1; k <= 1; k++) { ctx.moveTo(x + k * 2, y + up * 2); ctx.lineTo(x + k * 3 + sw, y + up * 2 - 10 - (k ? 0 : 4)); }
  }
  ctx.stroke();
}

// The giant pit just outside the gate: a spiked palisade with a barred gate and hanging chains.
function drawGiantPit(ctx, x, base, st, hover) {
  const w = 96, L = x - w / 2, h = 74;
  if (hover) { ctx.shadowColor = 'rgba(255,215,120,0.9)'; ctx.shadowBlur = 14; }
  ctx.fillStyle = '#3a2a1c';
  ctx.fillRect(L, base - h, w, h);
  ctx.shadowBlur = 0;
  // pointed stakes
  ctx.fillStyle = '#4e3824';
  ctx.strokeStyle = '#1e140c';
  ctx.lineWidth = 1.2;
  for (let sx = L; sx < L + w; sx += 9) {
    const top = base - h - 8 - ((sx * 7) % 6);
    ctx.beginPath();
    ctx.moveTo(sx, base);
    ctx.lineTo(sx, top + 6);
    ctx.lineTo(sx + 4.5, top);
    ctx.lineTo(sx + 9, top + 6);
    ctx.lineTo(sx + 9, base);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
  }
  texFill(ctx, L, base - h - 14, w, h + 14, 0.7);
  weather(ctx, L, base - h - 14, w, h + 14, 61);
  ctx.strokeStyle = '#2a1c10';
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(L, base - h * 0.35);
  ctx.lineTo(L + w, base - h * 0.35);
  ctx.moveTo(L, base - h * 0.75);
  ctx.lineTo(L + w, base - h * 0.75);
  ctx.stroke();
  // barred gate
  ctx.fillStyle = '#0e0b09';
  ctx.fillRect(x - 20, base - 56, 40, 56);
  ctx.strokeStyle = '#5a5e64';
  ctx.lineWidth = 2;
  ctx.beginPath();
  for (let bx = x - 16; bx <= x + 16; bx += 8) {
    ctx.moveTo(bx, base - 56);
    ctx.lineTo(bx, base);
  }
  ctx.moveTo(x - 20, base - 30);
  ctx.lineTo(x + 20, base - 30);
  ctx.stroke();
  // glinting eyes in the dark
  if (Math.sin(RT * 0.7 + x) > -0.3) {
    ctx.fillStyle = 'rgba(220,200,140,0.8)';
    ctx.fillRect(x - 5, base - 40, 2, 1.5);
    ctx.fillRect(x + 3, base - 40, 2, 1.5);
  }
  // hanging chains and a skull on a stake
  ctx.strokeStyle = '#6a6e74';
  ctx.lineWidth = 1;
  for (const cx of [L + 10, L + w - 12]) {
    for (let k = 0; k < 6; k++) {
      ctx.beginPath();
      if (k % 2) ctx.ellipse(cx, base - h + 4 + k * 4, 1.2, 2.2, 0, 0, TAU);
      else ctx.ellipse(cx, base - h + 4 + k * 4, 2.2, 1.2, 0, 0, TAU);
      ctx.stroke();
    }
  }
  ctx.strokeStyle = '#3a2a1a';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(L + w + 8, base);
  ctx.lineTo(L + w + 8, base - h - 16);
  ctx.stroke();
  ctx.fillStyle = '#bdb5a2';
  ctx.beginPath();
  ctx.arc(L + w + 8, base - h - 20, 4.5, 0, TAU);
  ctx.fill();
  ctx.fillStyle = '#1a1210';
  ctx.fillRect(L + w + 5.5, base - h - 21, 2, 2);
  ctx.fillRect(L + w + 9, base - h - 21, 2, 2);
  drawBanner(ctx, L + 30, base - h + 2, 14, 26, 'plain', st);
}

function drawCastle(ctx, team, hoverKey) {
  const c = team.castle, st = TEAM_STYLE[team.id];
  const stone = c.stone, dark = shade(stone, -0.6), inner = shade(stone, -0.5), cutCol = shade(stone, 0.05);
  const floorTop = LANE_TOP - 10, floorBot = LANE_BOT + 16;
  const L = -80, F0 = GATE_X - 14, F1 = GATE_X + 14;
  const ceilTop = WALL_TOP - 8, ceilBot = WALL_TOP + 14;
  const gateTop = floorTop - 104;
  ctx.save();
  if (team.id === 1) {
    ctx.translate(WORLD_W, 0);
    ctx.scale(-1, 1);
  }

  // interior back wall
  ctx.fillStyle = inner;
  ctx.fillRect(L, ceilBot, F0 - L, floorTop - ceilBot + 2);
  texFill(ctx, L, ceilBot, F0 - L, floorTop - ceilBot, 0.8);
  drawBricks(ctx, L, ceilBot, F0, floorTop, shade(inner, -0.6), 0.5);
  weather(ctx, L, ceilBot, F0 - L, floorTop - ceilBot, 101 + team.id, 0.9);
  // soot blackening the wall above each torch
  for (const [tx, ty] of [[155, floorTop - 120], [395, floorTop - 112], [530, floorTop - 90]]) {
    const sg2 = ctx.createRadialGradient(tx, ty - 26, 2, tx, ty - 26, 34);
    sg2.addColorStop(0, 'rgba(8,6,4,0.55)');
    sg2.addColorStop(1, 'rgba(8,6,4,0)');
    ctx.fillStyle = sg2;
    ctx.beginPath();
    ctx.ellipse(tx, ty - 26, 16, 34, 0, 0, TAU);
    ctx.fill();
  }
  const sg = ctx.createLinearGradient(0, ceilBot, 0, ceilBot + 70);
  sg.addColorStop(0, 'rgba(0,0,0,0.55)');
  sg.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = sg;
  ctx.fillRect(L, ceilBot, F0 - L, 70);

  // flagstone floor
  ctx.fillStyle = shade(stone, -0.3);
  ctx.fillRect(L, floorTop, F1 - L, floorBot - floorTop);
  texFill(ctx, L, floorTop, F1 - L, floorBot - floorTop, 0.9);
  ctx.strokeStyle = rgba(dark, 0.55);
  ctx.lineWidth = 1;
  ctx.beginPath();
  for (let y = floorTop, row = 0; y < floorBot; y += 20, row++) {
    ctx.moveTo(L, y);
    ctx.lineTo(F1, y);
    for (let x = L + (row % 2) * 22; x < F1; x += 44) {
      ctx.moveTo(x, y);
      ctx.lineTo(x - 4, Math.min(floorBot, y + 20));
    }
  }
  ctx.stroke();
  ctx.fillStyle = 'rgba(0,0,0,0.35)';
  ctx.fillRect(L, floorBot - 4, F1 - L, 4);
  drawKeepFloor(ctx, L, F1, floorTop, floorBot, team.id);
  drawStream(ctx, F1, stone, dark);
  if (team.upgrades.castle.sifter) drawSifter(ctx);

  // rear tower, sliced open, with a ladder
  const tx1 = 92, tTop = ceilTop - c.towerH;
  ctx.fillStyle = inner;
  ctx.fillRect(L, tTop, tx1 - L, ceilTop - tTop);
  texFill(ctx, L, tTop, tx1 - L, ceilTop - tTop, 0.8);
  drawBricks(ctx, L, tTop, tx1, ceilTop, shade(inner, -0.6), 0.5);
  weather(ctx, L, tTop, tx1 - L, ceilTop - tTop, 103 + team.id);
  drawCut(ctx, L, tTop + (ceilTop - tTop) * 0.45, tx1 - L, 12, cutCol, dark);
  drawCut(ctx, tx1 - 16, tTop, 16, ceilTop - tTop, cutCol, dark);
  ctx.strokeStyle = '#3b2a1a';
  ctx.lineWidth = 2.5;
  ctx.beginPath();
  const ladTop = tTop + (ceilTop - tTop) * 0.45;
  ctx.moveTo(52, ladTop);
  ctx.lineTo(52, ceilTop);
  ctx.moveTo(66, ladTop);
  ctx.lineTo(66, ceilTop);
  for (let y = ladTop + 8; y < ceilTop; y += 10) {
    ctx.moveTo(52, y);
    ctx.lineTo(66, y);
  }
  ctx.stroke();
  const rc = shade(st.accent, -0.6);
  ctx.strokeStyle = dark;
  ctx.lineWidth = 2;
  if (c.roof === 'spire') {
    ctx.fillStyle = rc;
    ctx.beginPath();
    ctx.moveTo(L - 10, tTop);
    ctx.lineTo((L + tx1) / 2 + 10, tTop - 80);
    ctx.lineTo(tx1 + 10, tTop);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    texFill(ctx, L - 10, tTop - 80, tx1 - L + 20, 80, 0.7);
  } else if (c.roof === 'dome') {
    ctx.fillStyle = rc;
    ctx.beginPath();
    ctx.ellipse((L + tx1) / 2, tTop, (tx1 - L) / 2 + 6, 40, 0, Math.PI, 0);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
  } else {
    ctx.fillStyle = cutCol;
    for (let x = L; x < tx1; x += 22) {
      ctx.fillRect(x, tTop - 16, 13, 16);
      ctx.strokeRect(x, tTop - 16, 13, 16);
    }
  }

  // ceiling slab / rampart walk, cut open
  drawCut(ctx, L, ceilTop, F1 - L, ceilBot - ceilTop, cutCol, dark);
  weather(ctx, L, ceilTop, F1 - L, ceilBot - ceilTop, 105 + team.id, 0.7);
  ctx.fillStyle = cutCol;
  for (let x = tx1 + 4; x < F1 - 6; x += 24) {
    ctx.fillRect(x, ceilTop - 14, 14, 14);
    ctx.strokeRect(x, ceilTop - 14, 14, 14);
  }

  // hanging banners inside the hall
  for (const bx of [146, 266, 386]) drawBanner(ctx, bx, ceilBot, 22, 46, c.banner, st);

  // front wall cut through, with the raised portcullis in the gateway
  drawCut(ctx, F0, ceilTop - 14, F1 - F0, gateTop - ceilTop + 14, cutCol, dark);
  ctx.strokeStyle = '#26221f';
  ctx.lineWidth = 2;
  ctx.beginPath();
  for (let x = F0 + 4; x < F1; x += 6) {
    ctx.moveTo(x, gateTop);
    ctx.lineTo(x, gateTop + 26);
  }
  ctx.moveTo(F0, gateTop + 12);
  ctx.lineTo(F1, gateTop + 12);
  ctx.moveTo(F0, gateTop + 24);
  ctx.lineTo(F1, gateTop + 24);
  ctx.stroke();

  if (c.torches) {
    drawTorch(ctx, 155, floorTop - 120, 1);
    drawTorch(ctx, 395, floorTop - 112, 2);
    drawTorch(ctx, 530, floorTop - 90, 3);
  }

  // one building per class: Barracks, Mage Tower, Range and Workers' Lodge inside, the pit outside
  const base = floorTop + 2;
  drawBarracks(ctx, CLASS_X.infantry, base, st, hoverKey === 'infantry');
  drawMageTower(ctx, CLASS_X.mages, base, st, hoverKey === 'mages');
  drawRange(ctx, CLASS_X.ranged, base, st, hoverKey === 'ranged');
  drawLodge(ctx, CLASS_X.workers, base, hoverKey === 'workers');
  drawGiantPit(ctx, GIANT_PIT_X, LANE_TOP - 6, st, hoverKey === 'giants');
  drawBrazier(ctx, GATE_X + 34, LANE_TOP - 10, team.id);
  ctx.restore();

  // research progress above each building, one bar per upgrade under way (unmirrored)
  const bars = [['castle', 10, WALL_TOP - 150, ['castle']], ...TRAIN_GROUPS.map(g => [g.key, CLASS_X[g.key], g.key === 'giants' ? LANE_TOP - 120 : floorTop - 160, g.types])];
  for (const [, bx, y, types] of bars) {
    let k = 0;
    for (const type of types) {
      const r = team.research[type];
      if (!r) continue;
      const def = UPGRADES[type].find(u => u.key === r.key);
      drawResearchBar(ctx, team.id === 0 ? bx : WORLD_W - bx, y - k * 8, r.t / def.time);
      k++;
    }
  }
}

// ---------------------------------------------------------------- defensive trenches

// A defensive trench, drawn one slice per lane row: a dug ditch on the enemy side, an earth
// rampart piled up behind it with sharpened stakes jutting toward the enemy, and (Palisade) a
// row of pointed logs along the top. Defenders stand on the rampart.
function drawWallSeg(ctx, w, k) {
  const st = TEAM_STYLE[w.team], th = G.map.theme;
  const f = w.team === 0 ? 1 : -1;   // the enemy is this way
  const last = WALL_SEGS - 1, k1 = Math.min(last, k + 1);
  const segX = i => w.x + (i - last / 2) * 5 * -f;   // the far end leans back a little (perspective)
  const y0 = wallSegY(k), y1 = wallSegY(k1), x0 = segX(k), x1 = segX(k1);
  const earth = shade(mixHex('#6b5338', th.ground[0], 0.3), (k % 2) * 0.03);
  const dark = shade(earth, -0.55);
  const dmg = w.progress >= 1 ? 1 - w.hp / w.max : 0;
  const h = Math.max(4, WALL_H[0] * Math.min(1, w.progress) - dmg * 7);   // earth slumps as it's hacked at
  // cross-section of the bank at a row: back foot, top back, top front, front foot
  const prof = (x, y) => ({ back: [x - f * 36, y], topB: [x - f * 10, y - h], topF: [x + f * 3, y - h], front: [x + f * 12, y] });
  const A = prof(x0, y0), B = prof(x1, y1);
  const quad = (p, q, r, s, col) => {
    ctx.fillStyle = col;
    ctx.beginPath();
    ctx.moveTo(...p); ctx.lineTo(...q); ctx.lineTo(...r); ctx.lineTo(...s);
    ctx.closePath();
    ctx.fill();
  };

  // the ditch in front, running the depth of the lane
  const depth = 3 + 4 * Math.min(1, w.progress), dx0 = x0 + f * 22, dx1 = x1 + f * 22;
  quad([dx0 - f * 10, y0 - 2], [dx0 + f * 10, y0 - 2], [dx1 + f * 10, y1 + depth], [dx1 - f * 10, y1 + depth], shade(earth, -0.72));
  if (k === last) {
    quad([dx0 - f * 10, y0 - 2], [dx0 + f * 10, y0 - 2], [dx0 + f * 7, y0 + depth + 2], [dx0 - f * 7, y0 + depth + 2], shade(earth, -0.6));
  }

  // the bank between this row and the next: back slope, top and the steep face toward the enemy
  if (k < last) {
    quad(A.back, A.topB, B.topB, B.back, shade(earth, -0.12));
    quad(A.topB, A.topF, B.topF, B.topB, shade(earth, 0.12));
    quad(A.topF, A.front, B.front, B.topF, shade(earth, -0.3));
    ctx.strokeStyle = rgba(dark, 0.6);
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(...A.topB); ctx.lineTo(...B.topB);
    ctx.moveTo(...A.topF); ctx.lineTo(...B.topF);
    ctx.stroke();
  } else {
    // the near end of the bank: its cross-section
    ctx.fillStyle = earth;
    ctx.beginPath();
    ctx.moveTo(...A.back);
    ctx.quadraticCurveTo(x0 - f * 24, y0 - h * 0.85, ...A.topB);
    ctx.lineTo(...A.topF);
    ctx.lineTo(...A.front);
    ctx.closePath();
    ctx.fill();
    texFill(ctx, Math.min(A.back[0], A.front[0]), y0 - h, 48, h, 0.6);
    ctx.strokeStyle = dark;
    ctx.lineWidth = 1.4;
    ctx.stroke();
    ctx.strokeStyle = rgba(dark, 0.45);
    ctx.lineWidth = 1;
    ctx.beginPath();
    for (const s of [0.35, 0.68]) {
      ctx.moveTo(lerp(A.back[0], A.topB[0], s) + f * 2, y0 - h * s);
      ctx.lineTo(lerp(A.front[0], A.topF[0], s) - f, y0 - h * s);
    }
    ctx.stroke();
  }
  if (w.progress >= 1) {
    // a little grass along the crest
    ctx.strokeStyle = shade(th.grass, -0.1);
    ctx.lineWidth = 1;
    ctx.beginPath();
    for (let i = 0; i < 3; i++) {
      const gx = lerp(A.topB[0], A.topF[0], i / 2) + (i - 1) * 0.5;
      ctx.moveTo(gx, y0 - h);
      ctx.lineTo(gx + (i % 2 ? 2 : -2), y0 - h - 3);
    }
    ctx.stroke();
  }

  // sharpened stakes jutting from the face toward the enemy (knocked out as it's damaged)
  const stakes = w.progress < 0.5 ? 0 : dmg > 0.66 ? 0 : dmg > 0.33 ? 1 : 2;
  ctx.strokeStyle = '#5a4026';
  ctx.lineWidth = 2.2;
  ctx.beginPath();
  for (let i = 0; i < stakes; i++) {
    const s = 0.35 + i * 0.3, sx = lerp(A.front[0], A.topF[0], s), sy = y0 - h * s;
    ctx.moveTo(sx - f * 3, sy + 2);
    ctx.lineTo(sx + f * 12, sy - 5);
  }
  if (dmg > 0.33) {   // a broken stake lying in the ditch
    ctx.moveTo(dx0 - 6, y0 - 1);
    ctx.lineTo(dx0 + 5, y0 + 1);
  }
  ctx.stroke();

  // Palisade: pointed logs along the crest
  const extra = (WALL_H[1] - WALL_H[0]) * (w.tier === 2 ? 1 : w.reinforcing ? w.rprog : 0);
  if (extra > 0) {
    for (let i = 0; i < 3; i++) {
      const lx = lerp(A.topB[0], A.topF[0], i / 2), top = y0 - h - extra - (i % 2) * 2;
      ctx.fillStyle = i % 2 ? '#6a4a2c' : '#5a3e24';
      ctx.beginPath();
      ctx.moveTo(lx - 2.6, y0 - h + 1);
      ctx.lineTo(lx - 2.6, top);
      ctx.lineTo(lx, top - 5);
      ctx.lineTo(lx + 2.6, top);
      ctx.lineTo(lx + 2.6, y0 - h + 1);
      ctx.closePath();
      ctx.fill();
      ctx.strokeStyle = '#2a1c10';
      ctx.lineWidth = 0.8;
      ctx.stroke();
    }
    ctx.fillStyle = '#3a3a3e';
    ctx.fillRect(Math.min(A.topB[0], A.topF[0]) - 2, y0 - h - extra * 0.45, 16, 1.6);   // lashing
  }

  // under construction: a spade stuck in the spoil heap
  if (w.progress < 1 && k === last) {
    ctx.strokeStyle = '#5a4026';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(A.back[0] + f * 2, y0 - 2);
    ctx.lineTo(A.back[0] - f * 6, y0 - 22);
    ctx.stroke();
    ctx.fillStyle = '#8a8d90';
    ctx.fillRect(A.back[0] - 2, y0 - 4, 5, 6);
  }
  if (w.progress >= 1 && k === 0) drawBanner(ctx, A.topB[0], y0 - h - extra - 2, 10, 20, 'plain', st);
}

// ---------------------------------------------------------------- mines

function drawMine(ctx, m, hover) {
  if (m.gold <= 0) {
    // exhausted: a low heap of spoil that prospectors can restore
    ctx.save();
    ctx.translate(m.x, m.y);
    ctx.scale(0.45, 0.35);
    for (const rk of m.rocks.slice(0, 4)) {
      poly(ctx, rk.poly);
      ctx.fillStyle = shade(rk.col, -0.25);
      ctx.fill();
      ctx.strokeStyle = rk.edge;
      ctx.lineWidth = 2;
      ctx.stroke();
    }
    ctx.restore();
    if (hover) {
      ctx.font = '600 12px "Segoe UI", sans-serif';
      ctx.textAlign = 'center';
      ctx.fillStyle = 'rgba(0,0,0,0.65)';
      ctx.fillRect(m.x - 44, m.y - 40, 88, 18);
      ctx.fillStyle = '#9c8f76';
      ctx.fillText('Exhausted', m.x, m.y - 27);
    }
    return;
  }
  const frac = m.gold / m.max, k = 0.55 + 0.45 * frac;
  ctx.save();
  ctx.translate(m.x, m.y);
  ctx.fillStyle = 'rgba(0,0,0,0.3)';
  ellipse(ctx, 0, 2, m.size * 1.3 * k, 7);
  ctx.fill();
  ctx.scale(k, k);
  for (const rk of m.rocks) {
    poly(ctx, rk.poly);
    ctx.fillStyle = rk.col;
    ctx.fill();
    ctx.save();
    ctx.clip();
    ctx.fillStyle = texPattern(ctx, 'speck');
    ctx.fillRect(-60, -80, 120, 90);
    ctx.restore();
    poly(ctx, rk.poly);
    ctx.strokeStyle = rk.edge;
    ctx.lineWidth = 1.6;
    ctx.stroke();
    ctx.strokeStyle = rgba(rk.hi, 0.45);
    ctx.lineWidth = 1.4;
    ctx.beginPath();
    ctx.moveTo(rk.poly[3][0], rk.poly[3][1]);
    ctx.lineTo(rk.poly[4][0], rk.poly[4][1]);
    ctx.stroke();
  }
  const nN = Math.ceil(m.nuggets.length * frac);
  for (let i = 0; i < nN; i++) {
    const n = m.nuggets[i];
    poly(ctx, n.pts);
    ctx.fillStyle = '#c99b2a';
    ctx.fill();
    ctx.strokeStyle = '#5e440c';
    ctx.lineWidth = 1;
    ctx.stroke();
    ctx.fillStyle = '#f2dc8a';
    ctx.fillRect(n.x - 1, n.y - 1.5, 1.5, 1.5);
    if (Math.sin(RT * 2.2 + n.x * 0.7 + m.seed) > 0.97) {
      ctx.strokeStyle = 'rgba(255,245,200,0.9)';
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      ctx.moveTo(n.x - 5, n.y);
      ctx.lineTo(n.x + 5, n.y);
      ctx.moveTo(n.x, n.y - 5);
      ctx.lineTo(n.x, n.y + 5);
      ctx.stroke();
    }
  }
  ctx.restore();
  if (m.saltT > 0) {
    // salted by a saboteur: a white crust over the rocks, fading as it wears off
    ctx.fillStyle = `rgba(240,238,232,${0.25 + 0.5 * Math.min(1, m.saltT / 10)})`;
    for (let i = 0; i < 9; i++) {
      const a = i * 2.39 + m.seed, r = m.size * (0.25 + (i % 3) * 0.22);
      ctx.fillRect(m.x + Math.cos(a) * r - 1.5, m.y - m.size * 0.5 + Math.sin(a) * r * 0.6 - 1, 3, 2);
    }
    ctx.font = '600 10px "Segoe UI", sans-serif';
    ctx.textAlign = 'center';
    ctx.fillStyle = 'rgba(240,238,232,0.9)';
    ctx.fillText(`salted ${Math.ceil(m.saltT)}s`, m.x, m.y + 14);
  }
  if (hover) {
    ctx.font = '600 13px "Segoe UI", sans-serif';
    ctx.textAlign = 'center';
    ctx.fillStyle = 'rgba(0,0,0,0.65)';
    ctx.fillRect(m.x - 44, m.y - m.size * 1.4 - 32, 88, 20);
    ctx.fillStyle = '#e0bf5a';
    ctx.fillText(`${Math.ceil(m.gold)} gold`, m.x, m.y - m.size * 1.4 - 17);
  }
}

// ---------------------------------------------------------------- props

function drawProp(ctx, p, th) {
  ctx.save();
  ctx.translate(p.x, p.y);
  ctx.lineCap = 'round';
  const col = th.prop;
  switch (p.kind) {
    case 'rock':
      poly(ctx, p.poly);
      ctx.fillStyle = p.col;
      ctx.fill();
      ctx.strokeStyle = p.edge;
      ctx.lineWidth = 1.5;
      ctx.stroke();
      break;
    case 'deadtree':
      ctx.scale(p.s * p.flip, p.s);
      ctx.strokeStyle = col;
      for (const [x1, y1, x2, y2, d] of p.segs) {
        ctx.lineWidth = 1 + d * 1.8;
        ctx.beginPath();
        ctx.moveTo(x1, y1);
        ctx.lineTo(x2, y2);
        ctx.stroke();
      }
      break;
    case 'tree':
      ctx.scale(p.s, p.s);
      ctx.strokeStyle = col;
      ctx.lineWidth = 5;
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.lineTo(0, -p.h + 10);
      ctx.stroke();
      ctx.fillStyle = shade(th.grass, -0.4);
      ctx.beginPath();
      for (const [bx, by, br] of p.blobs) {
        ctx.moveTo(bx + br, by);
        ctx.arc(bx, by, br, 0, TAU);
      }
      ctx.fill();
      break;
    case 'bush':
      ctx.scale(p.s, p.s);
      ctx.fillStyle = shade(th.grass, -0.3);
      ctx.beginPath();
      for (const [bx, by, br] of p.blobs) {
        ctx.moveTo(bx + br, by);
        ctx.arc(bx, by, br, 0, TAU);
      }
      ctx.fill();
      break;
    case 'bones':
      ctx.scale(p.s * p.flip, p.s);
      ctx.strokeStyle = '#b9b09b';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(-14, -2);
      ctx.lineTo(10, -2);
      for (let i = 0; i < 4; i++) {
        ctx.moveTo(-10 + i * 6, -2);
        ctx.quadraticCurveTo(-8 + i * 6, -12, -4 + i * 6, -10);
      }
      ctx.stroke();
    // falls through to draw a skull with the ribs
    case 'skull': {
      const sx = p.kind === 'bones' ? 16 : 0;
      ctx.fillStyle = '#bdb5a2';
      ctx.beginPath();
      ctx.arc(sx, -5, 5, 0, TAU);
      ctx.fill();
      ctx.fillStyle = '#2a2420';
      ctx.fillRect(sx - 3, -6, 2, 2);
      ctx.fillRect(sx + 1, -6, 2, 2);
      break;
    }
    case 'sword':
      ctx.rotate(p.tilt);
      ctx.strokeStyle = '#2e3034';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(0, 2);
      ctx.lineTo(0, -26);
      ctx.stroke();
      ctx.strokeStyle = '#6f7378';
      ctx.lineWidth = 1.4;
      ctx.stroke();
      ctx.strokeStyle = '#3a2818';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(-6, -26);
      ctx.lineTo(6, -26);
      ctx.moveTo(0, -26);
      ctx.lineTo(0, -34);
      ctx.stroke();
      break;
    case 'grave':
      ctx.strokeStyle = shade(col, 0.15);
      ctx.lineWidth = 3.5;
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.lineTo(0, -24);
      ctx.moveTo(-7, -17);
      ctx.lineTo(7, -17);
      ctx.stroke();
      break;
    case 'ruin': {
      const sc = shade(th.rock, 0.05), dk = shade(th.rock, -0.5);
      ctx.fillStyle = sc;
      ctx.strokeStyle = dk;
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(-9, 0);
      ctx.lineTo(-9, -p.h);
      ctx.lineTo(-2, -p.h - 5 + p.cut * 0.3);
      ctx.lineTo(3, -p.h + p.cut * 0.5);
      ctx.lineTo(9, -p.h - p.cut * 0.4);
      ctx.lineTo(9, 0);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
      texFill(ctx, -9, -p.h - 5, 18, p.h + 5, 0.7);
      ctx.fillRect(-13, -5, 26, 5);
      ctx.strokeRect(-13, -5, 26, 5);
      break;
    }
    case 'banner':
      ctx.rotate(p.tilt);
      ctx.strokeStyle = col;
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.lineTo(0, -50);
      ctx.stroke();
      ctx.fillStyle = grit(p.col);
      ctx.beginPath();
      ctx.moveTo(0, -48);
      ctx.lineTo(22 + Math.sin(RT * 2 + p.x) * 3, -44);
      ctx.lineTo(16, -36);
      ctx.lineTo(20 + Math.sin(RT * 2 + p.x + 1) * 3, -28);
      ctx.lineTo(0, -30);
      ctx.closePath();
      ctx.fill();
      break;
  }
  ctx.restore();
}

// Distant silhouettes standing on hill layers.
function drawHillDeco(ctx, d, x, col) {
  ctx.save();
  ctx.translate(x, d.y);
  ctx.scale(d.s, d.s);
  ctx.fillStyle = col;
  ctx.strokeStyle = col;
  switch (d.kind) {
    case 'pine':
      ctx.beginPath();
      ctx.moveTo(-14, 0);
      ctx.lineTo(0, -52);
      ctx.lineTo(14, 0);
      ctx.closePath();
      ctx.fill();
      ctx.beginPath();
      ctx.moveTo(-10, -22);
      ctx.lineTo(0, -64);
      ctx.lineTo(10, -22);
      ctx.closePath();
      ctx.fill();
      break;
    case 'deadtree':
      ctx.lineCap = 'round';
      for (const [x1, y1, x2, y2, dd] of d.segs) {
        ctx.lineWidth = 1 + dd * 1.6;
        ctx.beginPath();
        ctx.moveTo(x1, y1);
        ctx.lineTo(x2, y2);
        ctx.stroke();
      }
      break;
    case 'tower':
      ctx.fillRect(-10, -70, 20, 72);
      for (let i = -12; i < 12; i += 8) ctx.fillRect(i, -78, 5, 8);
      break;
    case 'spire':
      ctx.fillRect(-6, -60, 12, 62);
      ctx.beginPath();
      ctx.moveTo(-10, -60);
      ctx.lineTo(0, -95);
      ctx.lineTo(10, -60);
      ctx.closePath();
      ctx.fill();
      break;
    case 'windmill': {
      ctx.beginPath();
      ctx.moveTo(-9, 0);
      ctx.lineTo(-6, -46);
      ctx.lineTo(6, -46);
      ctx.lineTo(9, 0);
      ctx.closePath();
      ctx.fill();
      ctx.lineWidth = 3;
      const a = RT * 0.4 + d.x;
      ctx.beginPath();
      for (let i = 0; i < 4; i++) {
        ctx.moveTo(0, -46);
        ctx.lineTo(Math.cos(a + (i * Math.PI) / 2) * 28, -46 + Math.sin(a + (i * Math.PI) / 2) * 28);
      }
      ctx.stroke();
      break;
    }
  }
  ctx.restore();
}

// ---------------------------------------------------------------- HUD art

// ---------------------------------------------------------------- architects' works

// An archer tower: a tall timber frame on four splayed legs, braced in X's, with a ladder up the
// middle. Towers always stand at the back of the lane so they never hide the fighting. It's drawn
// in two passes so the archer stands behind the parapet: the frame and floor here, then the
// parapet, roof and pennant in drawTowerFront. While it's being built it rises as bare scaffolding.
const TOWER_PW = 26;   // half-width of the fighting platform
function drawTower(ctx, tw) {
  if (tw.mid) return drawMidTower(ctx, tw);
  const x = tw.x, y = tw.y, h = TOWER.h, built = tw.progress >= 1;
  const owner = tw.team >= 0 ? G.teams[tw.team] : null;
  const iron = owner && owner.upgrades.architect.tower2;
  const wood = tw.flash > 0 ? '#7a3a2a' : '#5e4128', dark = '#24180d';
  const top = y - h * (built ? 1 : Math.max(0.2, tw.progress));
  const legX = k => lerp(25, 17, k), leg = (s, k) => x + s * legX(k);
  ctx.save();
  ctx.lineCap = 'round';
  ctx.fillStyle = 'rgba(0,0,0,0.28)';
  ellipse(ctx, x, y + 2, 36, 6);
  ctx.fill();
  // back legs, set in and darker
  ctx.strokeStyle = shade(wood, -0.4);
  ctx.lineWidth = 4;
  ctx.beginPath();
  for (const s of [-1, 1]) { ctx.moveTo(x + s * 17, y - 5); ctx.lineTo(x + s * 12, top); }
  ctx.stroke();
  // X braces and ledgers, bay by bay (only as far up as it's been built)
  ctx.strokeStyle = shade(wood, -0.18);
  ctx.lineWidth = 2.4;
  ctx.beginPath();
  const bays = 3;
  for (let b = 0; b < bays; b++) {
    const k0 = b / bays, k1 = (b + 1) / bays, y0 = y - h * k0, y1 = y - h * k1;
    if (y1 < top - 0.5) break;
    ctx.moveTo(leg(-1, k0), y0); ctx.lineTo(leg(1, k1), y1);
    ctx.moveTo(leg(1, k0), y0); ctx.lineTo(leg(-1, k1), y1);
    ctx.moveTo(leg(-1, k1), y1); ctx.lineTo(leg(1, k1), y1);
  }
  ctx.stroke();
  // the ladder
  ctx.strokeStyle = '#6e4e2e';
  ctx.lineWidth = 1.6;
  ctx.beginPath();
  ctx.moveTo(x - 6, y); ctx.lineTo(x - 5, top); ctx.moveTo(x + 3, y); ctx.lineTo(x + 4, top);
  for (let ly = y - 7; ly > top + 3; ly -= 8) { ctx.moveTo(x - 6, ly); ctx.lineTo(x + 3.5, ly); }
  ctx.stroke();
  // front legs on stone footings
  const kTop = (y - top) / h;
  for (const [lw, col] of [[6.5, dark], [4.4, wood]]) {
    ctx.strokeStyle = col;
    ctx.lineWidth = lw;
    ctx.beginPath();
    for (const s of [-1, 1]) { ctx.moveTo(leg(s, 0), y); ctx.lineTo(leg(s, kTop), top); }
    ctx.stroke();
  }
  ctx.fillStyle = '#5a554c';
  for (const s of [-1, 1]) ctx.fillRect(leg(s, 0) - 5, y - 3, 10, 5);
  if (iron) {   // Reinforced Towers: iron plates at every joint
    ctx.fillStyle = '#44474c';
    for (let b = 1; b <= bays; b++) for (const s of [-1, 1]) ctx.fillRect(leg(s, b / bays) - 3.5, y - h * b / bays - 3, 7, 6);
  }
  weather(ctx, x - 26, top, 52, y - top, tw.x * 0.31, 0.6);
  if (built) {
    // the platform floor, beams jutting out past the legs
    ctx.fillStyle = '#3e2a18';
    ctx.fillRect(x - TOWER_PW - 4, top - 2, TOWER_PW * 2 + 8, 6);
    ctx.fillStyle = '#2a1c10';
    for (const s of [-1, 1]) ctx.fillRect(x + s * (TOWER_PW + 4) - (s > 0 ? 3 : 0), top - 2, 3, 6);
    // back corner posts (the front ones are drawn over the archer)
    ctx.strokeStyle = shade(wood, -0.35);
    ctx.lineWidth = 2.4;
    ctx.beginPath();
    for (const s of [-1, 1]) { ctx.moveTo(x + s * (TOWER_PW - 6), top); ctx.lineTo(x + s * (TOWER_PW - 6), top - 42); }
    ctx.stroke();
  }
  ctx.restore();
}

// The front half of a tower, drawn over its archer: the plank parapet, the front posts, the
// shingled roof and a pennant in the owner's colour, plus splinters and its health bar.
function drawTowerFront(ctx, tw) {
  if (tw.mid) return drawMidTowerFront(ctx, tw);
  if (tw.progress < 1) return;
  const x = tw.x, top = tw.y - TOWER.h, pw = TOWER_PW;
  const owner = tw.team >= 0 ? G.teams[tw.team] : null;
  const iron = owner && owner.upgrades.architect.tower2;
  const wood = tw.flash > 0 ? '#7a3a2a' : '#5e4128', dark = '#24180d';
  ctx.save();
  ctx.lineCap = 'round';
  // upright planks with gaps to shoot through, under a top rail
  for (let px = -pw; px < pw; px += 7) {
    ctx.fillStyle = shade(wood, (hrand(tw.x, px) - 0.5) * 0.24);
    ctx.fillRect(x + px, top - 15, 6, 15);
  }
  ctx.fillStyle = shade(wood, -0.2);
  ctx.fillRect(x - pw - 1, top - 17, pw * 2 + 2, 3.5);
  weather(ctx, x - pw - 1, top - 17, pw * 2 + 2, 17, tw.x * 0.53, 0.8);
  if (iron) {
    ctx.fillStyle = '#44474c';
    ctx.fillRect(x - pw - 1, top - 9, pw * 2 + 2, 2.2);
  }
  // front posts holding up the roof
  ctx.strokeStyle = dark;
  ctx.lineWidth = 3;
  ctx.beginPath();
  for (const s of [-1, 1]) { ctx.moveTo(x + s * (pw - 1), top - 15); ctx.lineTo(x + s * (pw - 1), top - 44); }
  ctx.stroke();
  // the roof: pitched shingles
  const eave = top - 42, peak = top - 66, rw = pw + 9;
  ctx.fillStyle = shade(wood, -0.28);
  ctx.beginPath();
  ctx.moveTo(x - rw, eave); ctx.lineTo(x, peak); ctx.lineTo(x + rw, eave); ctx.closePath();
  ctx.fill();
  ctx.save();
  ctx.clip();
  ctx.strokeStyle = 'rgba(16,10,5,0.55)';
  ctx.lineWidth = 1;
  ctx.beginPath();
  for (let r = 1; r < 5; r++) {
    const yy = peak + (eave - peak) * r / 5;
    ctx.moveTo(x - rw, yy); ctx.lineTo(x + rw, yy);
    for (let sx = -rw + (r % 2) * 4; sx < rw; sx += 8) { ctx.moveTo(x + sx, yy); ctx.lineTo(x + sx, yy - (eave - peak) / 5); }
  }
  ctx.stroke();
  weather(ctx, x - rw, peak, rw * 2, eave - peak, tw.x * 0.71, 0.7);
  ctx.restore();
  ctx.strokeStyle = dark;
  ctx.lineWidth = 1.6;
  ctx.beginPath();
  ctx.moveTo(x - rw, eave); ctx.lineTo(x, peak); ctx.lineTo(x + rw, eave);
  ctx.stroke();
  // a pennant from the peak
  ctx.lineWidth = 1.3;
  ctx.beginPath(); ctx.moveTo(x, peak); ctx.lineTo(x, peak - 16); ctx.stroke();
  ctx.fillStyle = owner ? shade(TEAM_STYLE[tw.team].accent, -0.15) : '#8a8478';
  const flap = Math.sin(RT * 3 + tw.x) * 2;
  ctx.beginPath(); ctx.moveTo(x, peak - 16); ctx.lineTo(x + 13, peak - 12 + flap); ctx.lineTo(x, peak - 8); ctx.closePath(); ctx.fill();
  // damage: splintered planks and a gap torn in the roof
  const hurt = 1 - tw.hp / tw.max;
  if (hurt > 0.35) {
    ctx.strokeStyle = 'rgba(16,10,5,0.85)';
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.moveTo(x - 14, top - 13); ctx.lineTo(x - 9, top - 6); ctx.lineTo(x - 12, top - 1);
    if (hurt > 0.65) { ctx.moveTo(x + 8, top - 15); ctx.lineTo(x + 14, top - 4); }
    ctx.stroke();
    if (hurt > 0.65) {
      ctx.fillStyle = '#120c07';
      ctx.beginPath(); ctx.moveTo(x + 6, eave - 4); ctx.lineTo(x + 14, eave - 13); ctx.lineTo(x + 19, eave - 3); ctx.closePath(); ctx.fill();
    }
  }
  ctx.restore();
  structureBar(ctx, x, peak - 26, 36, tw);
}

function structureBar(ctx, x, y, w, s) {
  if (s.hp >= s.max) return;
  const f = s.hp / s.max;
  ctx.fillStyle = 'rgba(0,0,0,0.65)';
  ctx.fillRect(x - w / 2 - 1, y, w + 2, 5);
  ctx.fillStyle = f > 0.5 ? '#c9a23a' : '#b5402f';
  ctx.fillRect(x - w / 2, y + 1, w * f, 3);
}

// The Monolith's tower: two dressed-stone piers built around the obelisk, joined high up by an
// arched bridge it rises through, and iron clamps binding the piers to it. Runes cut into the piers
// glow with the Monolith's colour. Tougher and taller-reaching than any timber tower; the banner is
// grey until an archer is posted, then takes that side's colour.
function drawMidTower(ctx, tw) {
  const x = tw.x, y = tw.y, h = TOWER.mid.h, built = tw.progress >= 1;
  const top = y - h * (built ? 1 : Math.max(0.15, tw.progress));
  const stone = tw.flash > 0 ? '#8a5a4a' : '#7a746a', dark = '#2e2b27';
  const s = G.shrine, col = s && s.owner >= 0 ? TEAM_STYLE[s.owner].crystal : '#cfc6b0';
  ctx.save();
  ctx.fillStyle = 'rgba(0,0,0,0.3)';
  ellipse(ctx, x, y + 2, 60, 8);
  ctx.fill();
  for (const sd of [-1, 1]) {
    // a pier, flared at the foot
    const inner = x + sd * 18, outer = x + sd * 50, footO = x + sd * 58;
    ctx.fillStyle = stone;
    ctx.beginPath();
    ctx.moveTo(inner, y); ctx.lineTo(footO, y); ctx.lineTo(outer, y - 26); ctx.lineTo(outer, top); ctx.lineTo(inner, top);
    ctx.closePath();
    ctx.fill();
    ctx.save();
    ctx.clip();
    drawBricks(ctx, Math.min(inner, footO), top, Math.max(inner, footO), y, dark, 0.45);
    weather(ctx, Math.min(inner, footO), top, 40, y - top, tw.x * 0.17 + sd, 0.9);
    ctx.fillStyle = sd < 0 ? 'rgba(255,240,215,0.05)' : 'rgba(0,0,0,0.18)';
    ctx.fillRect(Math.min(inner, footO), top, 40, y - top);
    ctx.restore();
    ctx.strokeStyle = dark;
    ctx.lineWidth = 1.6;
    ctx.stroke();
    // runes running up the pier, glowing with the Monolith
    for (let i = 0; i < 4; i++) {
      const ry = y - 24 - i * 22;
      if (ry < top + 6) break;
      ctx.fillStyle = rgba(col, 0.3 + 0.25 * Math.sin(RT * 2 + i + sd));
      ctx.fillRect(x + sd * 34 - 2.5, ry - 8, 5, 8);
    }
    // iron clamps binding the pier to the obelisk
    ctx.strokeStyle = '#3a3c40';
    ctx.lineWidth = 3;
    ctx.beginPath();
    for (const cy of [y - 52, y - 88]) if (cy > top + 4) { ctx.moveTo(inner, cy); ctx.lineTo(x + sd * (cy > y - 70 ? 12 : 10), cy); }
    ctx.stroke();
  }
  if (built) {
    // the bridge between the piers, arched underneath where the obelisk passes up through it
    ctx.fillStyle = shade(stone, -0.06);
    ctx.beginPath();
    ctx.moveTo(x - 54, top - 2); ctx.lineTo(x + 54, top - 2); ctx.lineTo(x + 54, top + 12); ctx.lineTo(x + 18, top + 12);
    ctx.quadraticCurveTo(x, top + 2, x - 18, top + 12);
    ctx.lineTo(x - 54, top + 12);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = dark;
    ctx.lineWidth = 1.6;
    ctx.stroke();
    // a corbelled lip
    ctx.fillStyle = shade(stone, -0.25);
    for (let px = -54; px < 54; px += 9) ctx.fillRect(x + px, top + 12, 6, 3);
  }
  ctx.restore();
}

// The Monolith tower's battlements, drawn over its archer: merlons on either side, open in the
// middle where the obelisk's tip rises through, and the banner on the right pier.
function drawMidTowerFront(ctx, tw) {
  if (tw.progress < 1) return;
  const x = tw.x, top = tw.y - TOWER.mid.h;
  const stone = tw.flash > 0 ? '#8a5a4a' : '#7a746a', dark = '#2e2b27';
  ctx.save();
  ctx.fillStyle = shade(stone, 0.06);
  ctx.strokeStyle = dark;
  ctx.lineWidth = 1.3;
  for (const sd of [-1, 1]) {
    ctx.fillRect(x + (sd < 0 ? -56 : 14), top - 6, 42, 6);
    ctx.strokeRect(x + (sd < 0 ? -56 : 14), top - 6, 42, 6);
    for (let k = 0; k < 4; k++) {
      const mx = x + sd * (16 + k * 11) - (sd < 0 ? 7 : 0);
      ctx.fillRect(mx, top - 16, 7, 10);
      ctx.strokeRect(mx, top - 16, 7, 10);
    }
  }
  weather(ctx, x - 56, top - 16, 112, 16, tw.x * 0.29, 0.8);
  const holder = towerHolder(tw);   // a side, NEUTRAL (its own archers) or -1 (empty)
  ctx.lineWidth = 1.4;
  ctx.beginPath(); ctx.moveTo(x + 46, top - 16); ctx.lineTo(x + 46, top - 46); ctx.stroke();
  ctx.fillStyle = holder >= 0 ? shade(TEAM_STYLE[holder].accent, -0.1) : '#9a948a';
  const flap = Math.sin(RT * 3 + tw.x) * 2;
  ctx.beginPath(); ctx.moveTo(x + 46, top - 46); ctx.lineTo(x + 62, top - 41 + flap); ctx.lineTo(x + 46, top - 35); ctx.closePath(); ctx.fill();
  ctx.restore();
  structureBar(ctx, x, top - 58, 48, tw);
}

// What a wrecked trench or tower leaves: a slumped earth ridge with broken stakes, a heap of
// splintered timbers with two legs still standing, or (the Monolith's tower) broken pier stumps and
// scattered blocks round the obelisk's foot. With architects selected, ruins they can rebuild show
// the price.
function drawRuin(ctx, s, showPrice) {
  ctx.save();
  if (s.isTower && s.mid) {
    const x = s.x, y = s.y, stone = '#6a655c', dark = '#2e2b27';
    for (const sd of [-1, 1]) {
      const hgt = sd < 0 ? 38 : 24;
      ctx.fillStyle = stone;
      ctx.beginPath();
      ctx.moveTo(x + sd * 18, y); ctx.lineTo(x + sd * 58, y); ctx.lineTo(x + sd * 50, y - hgt * 0.6);
      ctx.lineTo(x + sd * 42, y - hgt); ctx.lineTo(x + sd * 34, y - hgt * 0.7); ctx.lineTo(x + sd * 26, y - hgt * 0.9); ctx.lineTo(x + sd * 18, y - hgt * 0.5);
      ctx.closePath();
      ctx.fill();
      ctx.strokeStyle = dark;
      ctx.lineWidth = 1.4;
      ctx.stroke();
      ctx.fillStyle = shade(stone, -0.1);
      for (let i = 0; i < 4; i++) ctx.fillRect(x + sd * (62 + hrand(s.x, i + sd) * 22), y - 6 - hrand(s.x, i + 7) * 4, 9, 7);
    }
  } else if (s.isTower) {
    const x = s.x, y = s.y;
    ctx.fillStyle = '#3a2a1a';
    ctx.beginPath();
    ctx.moveTo(x - 40, y); ctx.quadraticCurveTo(x - 14, y - 26, x + 6, y - 20); ctx.quadraticCurveTo(x + 26, y - 14, x + 40, y);
    ctx.closePath();
    ctx.fill();
    ctx.lineCap = 'round';
    ctx.strokeStyle = '#24180d';
    ctx.lineWidth = 5;
    ctx.beginPath();
    ctx.moveTo(x - 24, y); ctx.lineTo(x - 21, y - 42); ctx.moveTo(x + 24, y); ctx.lineTo(x + 22, y - 26);
    ctx.stroke();
    ctx.strokeStyle = '#5e4128';
    ctx.lineWidth = 3.4;
    ctx.stroke();
    ctx.fillStyle = '#5e4128';   // splintered tops
    ctx.beginPath(); ctx.moveTo(x - 23, y - 40); ctx.lineTo(x - 19, y - 48); ctx.lineTo(x - 19, y - 40); ctx.fill();
    ctx.lineWidth = 2.6;
    ctx.beginPath();
    ctx.moveTo(x - 30, y - 6); ctx.lineTo(x + 6, y - 30);
    ctx.moveTo(x + 30, y - 3); ctx.lineTo(x - 6, y - 20);
    ctx.moveTo(x - 10, y - 12); ctx.lineTo(x + 34, y - 16);
    ctx.stroke();
    ctx.fillStyle = '#4a3420';   // fallen planks
    ctx.save(); ctx.translate(x + 8, y - 6); ctx.rotate(-0.25); ctx.fillRect(-14, -2, 28, 4); ctx.restore();
    ctx.save(); ctx.translate(x - 14, y - 4); ctx.rotate(0.4); ctx.fillRect(-10, -2, 20, 4); ctx.restore();
  } else {
    ctx.fillStyle = 'rgba(70,52,34,0.85)';
    for (let k = 0; k < WALL_SEGS; k++) {
      const y = wallSegY(k), wx = s.x + (k - (WALL_SEGS - 1) / 2) * -5;
      ctx.beginPath();
      ctx.moveTo(wx - 22, y); ctx.quadraticCurveTo(wx - 6, y - 9, wx + 10, y);
      ctx.closePath();
      ctx.fill();
    }
    ctx.strokeStyle = '#4e3824';
    ctx.lineWidth = 1.6;
    ctx.beginPath();
    for (let k = 0; k < WALL_SEGS; k += 2) { const y = wallSegY(k); ctx.moveTo(s.x - 2, y - 2); ctx.lineTo(s.x + 6 - k, y - 12); }
    ctx.stroke();
  }
  if (showPrice) {
    ctx.font = '600 11px "Segoe UI", sans-serif';
    ctx.textAlign = 'center';
    ctx.fillStyle = '#e8d8a8';
    ctx.fillText(`Rebuild: ${rebuildCost(s)} gold`, s.x, (s.isTower ? s.y - (s.mid ? 56 : 58) : LANE_TOP - 18));
  }
  ctx.restore();
}

// Traps are hidden from the enemy: drawn for their owner (and for neutral traps), or once one of
// your saboteurs has sniffed it out. A trap being laid is drawn faint.
function drawTrap(ctx, trap) {
  if (trap.team === 1 && !trap.spotted[0]) return;
  ctx.save();
  ctx.globalAlpha = trap.armed ? (trap.team === -1 ? 0.8 : 0.95) : 0.35 + 0.3 * trap.prog;
  const x = trap.x, y = trap.y, tar = trap.kind === 'tar';
  if (tar) drawThatchCover(ctx, x, y, TRAP.tar.coverR, trap.magic);
  else { ctx.save(); ctx.translate(x, y); ctx.scale(1.4, 1.4); drawPlateMine(ctx, 0, 0, trap.magic); ctx.restore(); }
  if (trap.team === 1) {   // an enemy trap your saboteur found: marked in red
    const r = tar ? 12 : 8;
    ctx.globalAlpha = 1;
    ctx.strokeStyle = 'rgba(230,80,60,0.85)';
    ctx.lineWidth = 1.8;
    ctx.beginPath(); ctx.moveTo(x - r, y - r); ctx.lineTo(x + r, y + r * 0.5); ctx.moveTo(x + r, y - r); ctx.lineTo(x - r, y + r * 0.5); ctx.stroke();
  }
  ctx.restore();
}

// A tar pit hidden under a thatched cover: a mat of straw and brush laid over the hole, sagging a
// little in the middle where a glint of tar shows through, with grass growing up round the rim.
function drawThatchCover(ctx, x, y, r, magic) {
  const ry = r * 0.36;
  ctx.fillStyle = 'rgba(0,0,0,0.32)';
  ellipse(ctx, x, y + 2, r + 3, ry + 2);
  ctx.fill();
  ctx.fillStyle = '#6e5a36';
  ellipse(ctx, x, y, r, ry);
  ctx.fill();
  ctx.fillStyle = 'rgba(20,14,8,0.35)';   // the sag
  ellipse(ctx, x + 2, y + 1, r * 0.5, ry * 0.5);
  ctx.fill();
  // straw laid in overlapping rows across the cover like a roof, each row's ends hanging over the next
  ctx.lineCap = 'round';
  ctx.save();
  ellipse(ctx, x, y, r, ry);
  ctx.clip();
  const rows = 6;
  for (let row = 0; row < rows; row++) {
    const yy = y - ry + (row + 0.6) * (2 * ry / rows), sd = x * 0.37 + row * 13;
    ctx.fillStyle = 'rgba(30,20,10,0.35)';   // shadow under the row above
    ctx.fillRect(x - r, yy + 1.6, r * 2, 1.4);
    for (let i = 0; i < 26; i++) {
      const sx = x - r + hrand(sd, i) * 2 * r, len = 3 + hrand(sd, i + 50) * 4, lean = (hrand(sd, i + 80) - 0.5) * 3, c = hrand(sd, i + 300);
      ctx.strokeStyle = c < 0.35 ? '#b49a5c' : c < 0.75 ? '#927a48' : '#64502e';
      ctx.lineWidth = 0.7 + hrand(sd, i + 400) * 0.8;
      ctx.beginPath();
      ctx.moveTo(sx, yy - len * 0.6);
      ctx.lineTo(sx + lean, yy + len * 0.5);
      ctx.stroke();
    }
  }
  ctx.restore();
  // ragged straw ends sticking out past the rim
  ctx.lineWidth = 0.8;
  for (let i = 0; i < 30; i++) {
    const a = hrand(x, i + 700) * TAU, c = hrand(x, i + 730);
    ctx.strokeStyle = c < 0.5 ? '#a08850' : '#7a6438';
    ctx.beginPath();
    ctx.moveTo(x + Math.cos(a) * r * 0.9, y + Math.sin(a) * ry * 0.9);
    ctx.lineTo(x + Math.cos(a) * r * (1.04 + c * 0.1), y + Math.sin(a) * ry * (1.04 + c * 0.12));
    ctx.stroke();
  }
  // a few branches laid across to hold it down
  ctx.strokeStyle = '#3e2c18';
  ctx.lineWidth = 1.6;
  ctx.beginPath();
  for (let i = 0; i < 3; i++) {
    const a = (hrand(x, i + 500) - 0.5) * 0.7 + (i - 1) * 0.5, cx = x + (i - 1) * r * 0.3;
    ctx.moveTo(cx - Math.cos(a) * r * 0.7, y - Math.sin(a) * ry * 0.7);
    ctx.lineTo(cx + Math.cos(a) * r * 0.7, y + Math.sin(a) * ry * 0.7);
  }
  ctx.stroke();
  // a gap showing the tar beneath
  ctx.fillStyle = '#0c0907';
  ellipse(ctx, x + r * 0.18, y + 1, r * 0.14, ry * 0.22);
  ctx.fill();
  ctx.fillStyle = magic ? `rgba(176,102,232,${0.5 + 0.25 * Math.sin(RT * 3 + x)})` : 'rgba(255,240,220,0.18)';
  ellipse(ctx, x + r * 0.15, y + 0.5, r * 0.06, ry * 0.08);
  ctx.fill();
  // grass tufts round the rim
  ctx.strokeStyle = '#4e5a2c';
  ctx.lineWidth = 1.1;
  ctx.beginPath();
  for (let i = 0; i < 7; i++) {
    const a = Math.PI * (0.05 + 0.9 * hrand(x, i + 600)), gx = x + Math.cos(a) * r * 0.98, gy = y + Math.sin(a) * ry * 0.98;
    ctx.moveTo(gx, gy); ctx.lineTo(gx - 2, gy - 5);
    ctx.moveTo(gx, gy); ctx.lineTo(gx + 1.5, gy - 6);
  }
  ctx.stroke();
}

// A mine: an iron pressure plate on a low wooden box, with bundled sticks of dynamite poking out
// from under it and a fuse wire curling into the plate. Magic ones carry a glowing rune.
function drawPlateMine(ctx, x, y, magic) {
  ctx.fillStyle = 'rgba(0,0,0,0.32)';
  ellipse(ctx, x, y + 2, 18, 4.5);
  ctx.fill();
  // dynamite under the plate, sticking out both sides
  const stick = (sx, sy, len, dir) => {
    ctx.fillStyle = '#9a2e20';
    ctx.fillRect(dir > 0 ? sx : sx - len, sy, len, 2.8);
    ctx.fillStyle = '#c24a32';
    ctx.fillRect(dir > 0 ? sx : sx - len, sy, len, 0.9);
    ctx.fillStyle = '#e0d2b0';   // the paper end cap
    ctx.fillRect(dir > 0 ? sx + len - 1.5 : sx - len, sy, 1.5, 2.8);
  };
  for (let i = 0; i < 3; i++) stick(x + 8, y - 5 + i * 2.6, 9 - i, 1);
  for (let i = 0; i < 2; i++) stick(x - 10, y - 4 + i * 2.8, 7 + i, -1);
  ctx.strokeStyle = '#c8b48a';   // twine round the bundle
  ctx.lineWidth = 1;
  ctx.beginPath(); ctx.moveTo(x + 13, y - 5.5); ctx.lineTo(x + 13, y + 2.5); ctx.stroke();
  // the fuse wire, from the sticks into the plate
  ctx.strokeStyle = '#2a2420';
  ctx.beginPath(); ctx.moveTo(x + 17, y - 4); ctx.quadraticCurveTo(x + 22, y - 10, x + 9, y - 8); ctx.stroke();
  // the box and its plate, in perspective
  ctx.fillStyle = '#4a3220';
  ctx.beginPath();
  ctx.moveTo(x - 12, y - 3); ctx.lineTo(x + 10, y - 3); ctx.lineTo(x + 10, y + 1); ctx.lineTo(x - 12, y + 1);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = '#5a5d62';
  ctx.beginPath();
  ctx.moveTo(x - 12, y - 3); ctx.lineTo(x + 10, y - 3); ctx.lineTo(x + 13, y - 8); ctx.lineTo(x - 9, y - 8);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = '#2a2b2d';
  ctx.lineWidth = 1;
  ctx.stroke();
  ctx.fillStyle = '#74787e';   // the raised pad
  ctx.beginPath();
  ctx.moveTo(x - 6, y - 4.2); ctx.lineTo(x + 5, y - 4.2); ctx.lineTo(x + 7, y - 6.8); ctx.lineTo(x - 4, y - 6.8);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = '#2a2b2d';   // rivets
  for (const [rx, rz] of [[-10, -3.8], [8.5, -3.8], [11, -7.2], [-7.5, -7.2]]) ctx.fillRect(x + rx, y + rz, 1.4, 1.2);
  if (magic) {
    ctx.strokeStyle = `rgba(176,102,232,${0.55 + 0.3 * Math.sin(RT * 4 + x)})`;
    ctx.lineWidth = 1.2;
    ellipse(ctx, x + 0.5, y - 5.5, 6, 2);
    ctx.stroke();
  }
}

// A sprung tar pit: a wide glossy black pool, bubbling (and smouldering violet when it's magic),
// with the broken thatch that hid it floating and slowly sinking. It lingers a good while.
function drawTarPool(ctx, p) {
  const fade = Math.min(1, (p.dur - p.t) / 3, p.t / 0.25);
  const r = p.r, ry = r * 0.42;
  ctx.save();
  ctx.globalAlpha = 0.9 * fade;
  ctx.fillStyle = '#100c09';
  // one path, so the ragged lobes merge into the pool instead of stacking darker
  ctx.beginPath();
  ctx.ellipse(p.x, p.y, r, ry, 0, 0, TAU);
  for (let i = 0; i < 5; i++) {
    const a = hrand(p.x, i) * TAU, cx = p.x + Math.cos(a) * r * 0.75, cy = p.y + Math.sin(a) * ry * 0.75;
    ctx.moveTo(cx + r * 0.3, cy);
    ctx.ellipse(cx, cy, r * 0.3, ry * 0.32, 0, 0, TAU);
  }
  ctx.fill('nonzero');
  ctx.fillStyle = 'rgba(255,240,220,0.08)';
  ellipse(ctx, p.x - r * 0.3, p.y - ry * 0.3, r * 0.35, ry * 0.18);
  ctx.fill();
  // the cover's straw, sinking over the first while
  const sink = clamp(1 - p.t / 12, 0.15, 1);
  ctx.lineCap = 'round';
  for (let i = 0; i < 18; i++) {
    const a = hrand(p.x, i + 30) * TAU, d = 0.2 + hrand(p.x, i + 60) * 0.65, drift = Math.sin(RT * 0.4 + i) * 2;
    const sx = p.x + Math.cos(a) * r * d + drift, sy = p.y + Math.sin(a) * ry * d, ang = hrand(p.x, i + 90) * Math.PI, len = 4 + hrand(p.x, i + 120) * 7;
    ctx.strokeStyle = `rgba(150,126,76,${0.75 * sink})`;
    ctx.lineWidth = 1.1;
    ctx.beginPath();
    ctx.moveTo(sx - Math.cos(ang) * len, sy - Math.sin(ang) * len * 0.4);
    ctx.lineTo(sx + Math.cos(ang) * len, sy + Math.sin(ang) * len * 0.4);
    ctx.stroke();
  }
  for (let i = 0; i < 8; i++) {
    const k = (RT * 0.7 + i * 0.37) % 1, bx = p.x + Math.sin(i * 2.7) * r * 0.65, by = p.y + Math.cos(i * 1.9) * ry * 0.5;
    ctx.strokeStyle = p.magic ? `rgba(190,120,255,${0.5 * (1 - k)})` : `rgba(90,80,70,${0.6 * (1 - k)})`;
    ctx.lineWidth = 1;
    ctx.beginPath(); ctx.arc(bx, by, 1 + k * 3, 0, TAU); ctx.stroke();
  }
  ctx.restore();
}


// A thrown net draped over a pinned unit: a sagging mesh with weighted corners, fading as it's
// struggled off (k: 1 fully on, toward 0 as it's thrown off).
function drawNetOver(ctx, x, y, scale, k) {
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(scale, scale);
  ctx.globalAlpha *= 0.85 * k;
  ctx.strokeStyle = '#c8b890';
  ctx.lineWidth = 0.9;
  const top = -58, w = 18;
  ctx.beginPath();
  for (let i = 0; i <= 6; i++) {
    const a = -w + i * (2 * w / 6);
    ctx.moveTo(a * 0.5, top);
    ctx.quadraticCurveTo(a * 1.1, top + 30, a * 1.3, -2);
  }
  for (let j = 1; j <= 5; j++) {
    const yy = top + j * 10, sp = w * (0.5 + j * 0.16);
    ctx.moveTo(-sp, yy);
    ctx.quadraticCurveTo(0, yy + 4, sp, yy);
  }
  ctx.stroke();
  ctx.fillStyle = '#6a6e74';   // lead weights on the hem
  for (let i = 0; i <= 4; i++) { ctx.beginPath(); ctx.arc(-w * 1.25 + i * (w * 2.5 / 4), -2, 1.6, 0, TAU); ctx.fill(); }
  ctx.restore();
}

// What a Quartermaster is busy with, as a little sign over its head: a bandage (healing), hammer and
// wrench (refitting, with a ring filling as it works), a net (Gladiator gear), a horn (cheering the
// miners), a crate (trap materials) or a pick over gold (restoring a deposit).
function drawJobIcon(ctx, x, y, kind, k) {
  ctx.save();
  ctx.translate(x, y);
  ctx.fillStyle = 'rgba(16,12,8,0.78)';
  ctx.beginPath(); ctx.arc(0, 0, 8, 0, TAU); ctx.fill();
  ctx.strokeStyle = 'rgba(232,216,168,0.55)';
  ctx.lineWidth = 1;
  ctx.stroke();
  if (k > 0) {   // progress around the rim
    ctx.strokeStyle = '#a7c98a';
    ctx.lineWidth = 2;
    ctx.beginPath(); ctx.arc(0, 0, 8, -Math.PI / 2, -Math.PI / 2 + TAU * Math.min(1, k)); ctx.stroke();
  }
  ctx.lineCap = 'round';
  switch (kind) {
    case 'heal':
      ctx.fillStyle = '#f0ece0'; ctx.fillRect(-4.5, -4.5, 9, 9);
      ctx.fillStyle = '#c0402e'; ctx.fillRect(-1.2, -3.6, 2.4, 7.2); ctx.fillRect(-3.6, -1.2, 7.2, 2.4);
      break;
    case 'refit':
      ctx.strokeStyle = '#8a6a40'; ctx.lineWidth = 1.6; ctx.beginPath(); ctx.moveTo(-4, 4); ctx.lineTo(3, -3); ctx.stroke();
      ctx.fillStyle = '#b8bec4'; ctx.save(); ctx.rotate(-0.8); ctx.fillRect(-1, -6.5, 6, 3); ctx.restore();
      ctx.strokeStyle = '#b8bec4'; ctx.lineWidth = 1.6; ctx.beginPath(); ctx.moveTo(4, 4); ctx.lineTo(-2, -2); ctx.stroke();
      ctx.beginPath(); ctx.arc(-3, -3, 1.8, 0, TAU); ctx.stroke();
      break;
    case 'gear':
      ctx.strokeStyle = '#c8b890'; ctx.lineWidth = 0.9; ctx.beginPath();
      for (let i = -1; i <= 1; i++) { ctx.moveTo(-4.5, i * 2.5); ctx.lineTo(4.5, i * 2.5); ctx.moveTo(i * 2.5, -4.5); ctx.lineTo(i * 2.5, 4.5); }
      ctx.stroke();
      break;
    case 'cheer':
      ctx.fillStyle = '#d8b060'; ctx.beginPath(); ctx.moveTo(-4.5, -1.5); ctx.lineTo(3, -4.5); ctx.lineTo(3, 4.5); ctx.lineTo(-4.5, 1.5); ctx.closePath(); ctx.fill();
      ctx.strokeStyle = '#f0e0a8'; ctx.lineWidth = 0.9; ctx.beginPath(); ctx.moveTo(5, -3); ctx.lineTo(6.5, -4.5); ctx.moveTo(5.5, 0); ctx.lineTo(7, 0); ctx.moveTo(5, 3); ctx.lineTo(6.5, 4.5); ctx.stroke();
      break;
    case 'materials':
      ctx.fillStyle = '#8a6a40'; ctx.fillRect(-4.5, -4, 9, 8);
      ctx.strokeStyle = '#3a2814'; ctx.lineWidth = 1; ctx.strokeRect(-4.5, -4, 9, 8);
      ctx.beginPath(); ctx.moveTo(-4.5, -4); ctx.lineTo(4.5, 4); ctx.moveTo(4.5, -4); ctx.lineTo(-4.5, 4); ctx.stroke();
      break;
    case 'prospect':
      ctx.fillStyle = '#d8ac2c'; ctx.beginPath(); ctx.arc(2, 2.5, 2.6, 0, TAU); ctx.fill();
      ctx.strokeStyle = '#8a6a40'; ctx.lineWidth = 1.4; ctx.beginPath(); ctx.moveTo(-3.5, 4); ctx.lineTo(2, -2.5); ctx.stroke();
      ctx.strokeStyle = '#b8bec4'; ctx.lineWidth = 1.6; ctx.beginPath(); ctx.moveTo(-2.5, -4); ctx.quadraticCurveTo(2.5, -4.5, 4.5, -1); ctx.stroke();
      break;
  }
  ctx.restore();
}

// A small badge over a unit's head: a glyph and a count (a Necromancer's pack, a Gladiator's glory).
function drawCountBadge(ctx, x, y, glyph, text, col) {
  ctx.save();
  ctx.font = '700 10px "Segoe UI", sans-serif';
  const w = ctx.measureText(text).width + 17;
  ctx.fillStyle = 'rgba(16,12,8,0.78)';
  ctx.fillRect(x - w / 2, y - 7, w, 13);
  ctx.strokeStyle = rgba(col, 0.6);
  ctx.lineWidth = 1;
  ctx.strokeRect(x - w / 2 + 0.5, y - 6.5, w - 1, 12);
  const gx = x - w / 2 + 7;
  ctx.fillStyle = col;
  if (glyph === 'skull') {
    ctx.beginPath(); ctx.arc(gx, y - 1.5, 3.4, 0, TAU); ctx.fill();
    ctx.fillRect(gx - 2, y + 1, 4, 2.6);
    ctx.fillStyle = '#10140c'; ctx.fillRect(gx - 2, y - 2.5, 1.5, 1.5); ctx.fillRect(gx + 0.5, y - 2.5, 1.5, 1.5);
  } else {
    ctx.beginPath();
    for (let i = 0; i < 10; i++) { const a = -Math.PI / 2 + i * Math.PI / 5, r = i % 2 ? 1.7 : 4.2; ctx.lineTo(gx + Math.cos(a) * r, y + Math.sin(a) * r); }
    ctx.closePath(); ctx.fill();
  }
  ctx.fillStyle = col;
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  ctx.fillText(text, gx + 6, y + 0.5);
  ctx.restore();
}
function grainOver(c, w, h, alpha) {
  c.save();
  c.globalAlpha = alpha;
  c.globalCompositeOperation = 'overlay';
  c.fillStyle = texPattern(c, 'grain');
  c.fillRect(0, 0, w, h);
  c.restore();
}

// Small symbolic unit icons for the training bar, on a dark tile tinted with the group color.
function drawUnitIcon(cv, type) {
  const c = cv.getContext('2d'), W = cv.width;
  c.setTransform(W / 40, 0, 0, W / 40, 0, 0);
  c.clearRect(0, 0, 40, 40);
  const gc = groupOf(type).color;
  const bg = c.createRadialGradient(20, 18, 2, 20, 20, 26);
  bg.addColorStop(0, shade(gc, -0.55));
  bg.addColorStop(1, '#0d0a08');
  c.fillStyle = bg;
  c.fillRect(0, 0, 40, 40);
  c.lineCap = 'round';
  c.lineJoin = 'round';
  const steel = '#c3c9cf', wood = '#7a5432', gold = '#d8ac2c', ink = '#141210';
  const head = (x, y, r = 4.5) => { c.fillStyle = '#e8dcc0'; c.beginPath(); c.arc(x, y, r, 0, TAU); c.fill(); };
  const line = (col, w, pts) => { c.strokeStyle = col; c.lineWidth = w; c.beginPath(); pts.forEach(([x, y], i) => (i ? c.lineTo(x, y) : c.moveTo(x, y))); c.stroke(); };
  switch (type) {
    case 'architect':
      // a mason's hammer over rolled plans
      c.fillStyle = '#d8c89a'; c.save(); c.translate(20, 22); c.rotate(-0.5); c.fillRect(-14, -4, 28, 8); c.restore();
      line('#8a7a50', 1, [[8, 28], [30, 14]]);
      line(wood, 3, [[12, 34], [27, 9]]);
      c.fillStyle = steel; c.save(); c.translate(27, 9); c.rotate(0.55); c.fillRect(-7, -3, 14, 6); c.restore();
      break;
    case 'miner':
      line(wood, 3.2, [[9, 33], [26, 12]]);
      line(steel, 3.6, [[15, 8], [24, 7], [34, 15]]);
      c.fillStyle = gold;
      for (const [x, y, r] of [[27, 31, 3.4], [33, 28, 2.6], [31, 34, 2.4]]) { c.beginPath(); c.arc(x, y, r, 0, TAU); c.fill(); }
      break;
    case 'sword':
      line(ink, 5, [[10, 30], [31, 9]]);
      line(steel, 2.6, [[12, 28], [31, 9]]);
      line(gold, 3, [[9, 23], [17, 31]]);
      line(wood, 3, [[11, 29], [6, 34]]);
      break;
    case 'spear':
      line(wood, 2.6, [[8, 35], [32, 6]]);
      c.fillStyle = steel; c.beginPath(); c.moveTo(35, 3); c.lineTo(28, 7); c.lineTo(32, 11); c.closePath(); c.fill();
      c.fillStyle = '#5a4430'; c.strokeStyle = '#8d939a'; c.lineWidth = 1.6;
      c.beginPath(); c.ellipse(15, 24, 8, 10, 0, 0, TAU); c.fill(); c.stroke();
      c.fillStyle = gold; c.beginPath(); c.arc(15, 24, 2.2, 0, TAU); c.fill();
      break;
    case 'ninja':
      c.fillStyle = ink; c.beginPath(); c.arc(17, 20, 10, 0, TAU); c.fill();
      c.fillStyle = '#d8c08a'; c.fillRect(9, 17, 17, 3.2);
      line('#7a2a1e', 1.8, [[8, 18], [3, 21], [5, 26]]);
      drawStar(c, 31, 30, 6, 0.4);
      break;
    case 'archer':
      c.strokeStyle = '#3a2410'; c.lineWidth = 3; c.beginPath(); c.moveTo(13, 4); c.quadraticCurveTo(34, 20, 13, 36); c.stroke();
      line('#d8cfbc', 0.9, [[13, 4], [13, 36]]);
      line(wood, 1.8, [[6, 20], [33, 20]]);
      c.fillStyle = steel; c.beginPath(); c.moveTo(37, 20); c.lineTo(31, 17); c.lineTo(31, 23); c.closePath(); c.fill();
      break;
    case 'flyer':
      c.fillStyle = shade('#c49a2c', -0.35); c.strokeStyle = ink; c.lineWidth = 1.2;
      c.beginPath(); c.moveTo(3, 18); c.quadraticCurveTo(20, 0, 37, 14); c.quadraticCurveTo(20, 10, 3, 18); c.closePath(); c.fill(); c.stroke();
      head(21, 18, 3.6);
      line('#e8dcc0', 2.2, [[20, 21], [16, 31]]);
      line('#e8dcc0', 1.8, [[16, 31], [11, 36]]);
      line('#6a4a2a', 2.6, [[20, 25], [32, 30]]);
      line('#2a1c10', 1.6, [[31, 25], [33, 35]]);
      break;
    case 'quartermaster':
      // a supply crate with a bandage roll and a full sack beside it
      c.fillStyle = '#7a5a34'; c.strokeStyle = ink; c.lineWidth = 1.4;
      c.fillRect(6, 17, 19, 17); c.strokeRect(6, 17, 19, 17);
      line('#4a3420', 1.4, [[6, 25.5], [25, 25.5]]);
      c.fillStyle = '#e8e0cc'; c.fillRect(12.5, 19, 6, 13); c.fillRect(9, 22.5, 13, 6);
      c.fillStyle = '#b8402e'; c.fillRect(14, 20.5, 3, 10); c.fillRect(10.5, 24, 10, 3);
      c.fillStyle = '#9a8a62'; c.beginPath(); c.ellipse(30, 27, 7, 8, 0, 0, TAU); c.fill(); c.stroke();
      line('#5a4a30', 1.6, [[26, 19], [34, 19]]);
      c.fillStyle = '#e8e0cc'; c.beginPath(); c.arc(30, 11, 4, 0, TAU); c.fill(); line('#c8bea8', 1, [[27, 11], [33, 11]]);
      break;
    case 'gladiator':
      // a net behind a crested helmet, a javelin across
      c.strokeStyle = 'rgba(200,190,160,0.5)'; c.lineWidth = 0.9; c.beginPath();
      for (let i = 0; i < 5; i++) { c.moveTo(4 + i * 7, 4); c.lineTo(4 + i * 7 - 6, 36); c.moveTo(2, 6 + i * 7); c.lineTo(38, 2 + i * 7); }
      c.stroke();
      line(wood, 2.2, [[5, 34], [35, 6]]);
      c.fillStyle = steel; c.beginPath(); c.moveTo(37, 4); c.lineTo(31, 6); c.lineTo(35, 10); c.closePath(); c.fill();
      c.fillStyle = '#8d939a'; c.strokeStyle = ink; c.lineWidth = 1.3;
      c.beginPath(); c.arc(20, 23, 9, Math.PI, 0); c.lineTo(29, 31); c.lineTo(11, 31); c.closePath(); c.fill(); c.stroke();
      c.fillStyle = ink; c.fillRect(14, 24, 12, 2); c.fillRect(19, 24, 2, 6);
      c.fillStyle = '#a8302a'; c.beginPath(); c.moveTo(11, 15); c.quadraticCurveTo(20, 6, 29, 15); c.lineTo(27, 17); c.quadraticCurveTo(20, 10, 13, 17); c.closePath(); c.fill();
      break;
    case 'necromancer': {
      // a skull on a staff, glowing green
      const g = c.createRadialGradient(26, 11, 0, 26, 11, 14);
      g.addColorStop(0, 'rgba(130,255,150,0.85)'); g.addColorStop(1, 'rgba(130,255,150,0)');
      c.fillStyle = g; c.fillRect(10, 0, 30, 28);
      line('#2a1c14', 3, [[9, 37], [24, 15]]);
      c.fillStyle = '#e0d8c4'; c.beginPath(); c.arc(26, 10, 6, 0, TAU); c.fill();
      c.fillRect(23, 13, 6, 5);
      c.fillStyle = '#103a14'; c.beginPath(); c.arc(24, 10, 1.6, 0, TAU); c.arc(28.2, 10, 1.6, 0, TAU); c.fill();
      line('#103a14', 0.8, [[24.5, 16], [24.5, 18], [26, 16], [26, 18], [27.5, 16], [27.5, 18]]);
      break;
    }
    case 'cleric': {
      const g = c.createRadialGradient(27, 10, 0, 27, 10, 13);
      g.addColorStop(0, 'rgba(255,240,180,0.9)'); g.addColorStop(1, 'rgba(255,240,180,0)');
      c.fillStyle = g; c.fillRect(12, 0, 28, 26);
      line('#8a6a3a', 3, [[10, 36], [26, 11]]);
      c.strokeStyle = '#f2dc8a'; c.lineWidth = 1.6; c.beginPath(); c.arc(27, 10, 4, 0, TAU);
      for (let i = 0; i < 8; i++) { const a = (i / 8) * TAU; c.moveTo(27 + Math.cos(a) * 6, 10 + Math.sin(a) * 6); c.lineTo(27 + Math.cos(a) * 9, 10 + Math.sin(a) * 9); }
      c.stroke();
      break;
    }
    case 'warlock': {
      const g = c.createRadialGradient(27, 10, 0, 27, 10, 13);
      g.addColorStop(0, 'rgba(176,77,255,0.9)'); g.addColorStop(1, 'rgba(176,77,255,0)');
      c.fillStyle = g; c.fillRect(12, 0, 28, 26);
      line('#3a2a30', 3, [[10, 36], [26, 12]]);
      c.fillStyle = '#d8b0ff'; c.beginPath(); c.arc(27, 10, 4, 0, TAU); c.fill();
      c.fillStyle = '#bdb5a2'; c.beginPath(); c.arc(13, 26, 3.2, 0, TAU); c.fill();
      break;
    }
    case 'firebird': {
      // a flaming wing over a falling pot
      const g = c.createLinearGradient(3, 0, 37, 0); g.addColorStop(0, '#7a1a10'); g.addColorStop(0.5, '#e0602a'); g.addColorStop(1, '#ffb347');
      c.fillStyle = g; c.beginPath(); c.moveTo(3, 18); c.quadraticCurveTo(20, 0, 37, 14); c.quadraticCurveTo(20, 10, 3, 18); c.closePath(); c.fill();
      c.fillStyle = 'rgba(255,200,90,0.8)'; for (const x of [10, 18, 26]) { c.beginPath(); c.ellipse(x, 18, 2, 4, 0, 0, TAU); c.fill(); }
      c.fillStyle = '#7a4a2a'; c.beginPath(); c.arc(21, 30, 5, 0, TAU); c.fill();
      c.fillStyle = '#ffd25a'; c.beginPath(); c.arc(24, 25, 2, 0, TAU); c.fill();
      break;
    }
    case 'saboteur':
      // a hooded face and a sack spilling salt
      c.fillStyle = '#26241f'; c.beginPath(); c.arc(15, 15, 10, Math.PI * 0.9, Math.PI * 2.1); c.lineTo(20, 22); c.lineTo(6, 26); c.closePath(); c.fill();
      c.fillStyle = '#c0432f'; c.fillRect(14, 14, 6, 2);
      c.fillStyle = '#d8d2c0'; c.strokeStyle = '#3a2e22'; c.lineWidth = 1.2; c.beginPath(); c.ellipse(28, 27, 7, 8, 0, 0, TAU); c.fill(); c.stroke();
      c.fillStyle = '#f0eee8'; for (const [x, y] of [[22, 35], [25, 37], [19, 37], [28, 38]]) c.fillRect(x, y, 2, 2);
      break;
    case 'beastmaster':
      // a sling whirling a stone, and a giant's horn
      c.strokeStyle = 'rgba(216,207,188,0.45)'; c.lineWidth = 1; c.setLineDash([2, 3]); c.beginPath(); c.arc(16, 15, 10, 0, TAU); c.stroke(); c.setLineDash([]);
      line('#8a6a44', 1.6, [[8, 34], [16, 15], [24, 9]]);
      c.fillStyle = '#8f8a80'; c.beginPath(); c.arc(25, 8, 3.4, 0, TAU); c.fill();
      c.fillStyle = '#d8c8a0'; c.beginPath(); c.moveTo(27, 36); c.quadraticCurveTo(38, 30, 35, 18); c.quadraticCurveTo(34, 28, 24, 32); c.closePath(); c.fill();
      break;
    case 'golem':
      // a stone head with glowing eyes and a rune on the brow
      c.fillStyle = '#8c8678'; c.strokeStyle = '#2a2622'; c.lineWidth = 1.6;
      c.fillRect(9, 8, 22, 24); c.strokeRect(9, 8, 22, 24);
      c.fillStyle = '#58c3e8'; c.fillRect(13, 17, 5, 3); c.fillRect(22, 17, 5, 3);
      c.strokeStyle = 'rgba(88,195,232,0.8)'; c.lineWidth = 1.4; c.beginPath(); c.moveTo(18, 10); c.lineTo(20, 14); c.lineTo(22, 10); c.moveTo(14, 26); c.lineTo(26, 26); c.stroke();
      c.fillStyle = '#5a5650'; c.fillRect(4, 30, 32, 8);
      break;
    case 'ballista':
      c.fillStyle = '#2a1c10';
      for (const x of [11, 27]) { c.beginPath(); c.arc(x, 31, 5, 0, TAU); c.fill(); }
      line('#7a5432', 3.4, [[4, 26], [34, 26]]);
      line('#7a5432', 3.6, [[6, 21], [33, 15]]);
      c.strokeStyle = '#1a120a'; c.lineWidth = 2.6; c.beginPath(); c.moveTo(29, 4); c.quadraticCurveTo(36, 12, 33, 15); c.quadraticCurveTo(36, 19, 31, 27); c.stroke();
      line('#d8cfbc', 0.9, [[29, 4], [14, 18], [31, 27]]);
      line(steel, 2, [[14, 17], [38, 13]]);
      break;
    case 'giant':
      line('#4e3620', 8, [[9, 35], [27, 11]]);
      c.fillStyle = '#9a9da0';
      for (const [x, y] of [[22, 13], [28, 18], [26, 8], [32, 13], [30, 6]]) c.fillRect(x - 1.8, y - 1.8, 3.6, 3.6);
      c.strokeStyle = '#b8b2a6'; c.lineWidth = 1.6; c.beginPath(); c.arc(9, 35, 4, 0, TAU); c.stroke();
      break;
  }
  c.setTransform(1, 0, 0, 1, 0, 0);
  grainOver(c, W, W, 0.08);
}

// Second-tier upgrades reuse their first tier's art with a "II" badge.
// Later tiers (including the clan-only ones) reuse their first tier's art with a II or III badge.
const TIER2_ICON = {
  rage2: 'rage', bag2: 'bag', pick2: 'pick', devout2: 'devout', shield2: 'shield', tithe2: 'tithe', pan2: 'pan1', protein2: 'protein', protein3: 'protein',
  greatsword: 'blades', longbow: 'bow', broadheads: 'arrows', steady: 'quiver', scope2: 'scope', barbs2: 'barbs', levy2: 'levy',
  mule: 'bag', diamond: 'pick', gilded: 'tithe', c_focus2: 'c_focus', w_focus2: 'w_focus', horde2: 'horde',
};
const TIER3_KEYS = ['protein3', 'mule', 'diamond', 'gilded'];

function drawUpgradeIcon(cv, type, key) {
  if (type === 'spear' && key === 'helm') key = 'shelm';
  if (type === 'ninja' && key === 'focus') key = 'nfocus';
  if (key === 'hawkeye') key = 'eye';   // Kestrel crits share the Eagle Eye art
  if (type === 'cleric' || type === 'warlock') key = type[0] + '_' + key;   // the mages share upgrade keys
  const tierMark = TIER3_KEYS.includes(key) ? 'III' : 'II';
  const tier2 = !!TIER2_ICON[key];
  if (tier2) key = TIER2_ICON[key];
  const c = cv.getContext('2d'), W = cv.width;
  c.setTransform(W / 40, 0, 0, W / 40, 0, 0);
  c.clearRect(0, 0, 40, 40);
  const bg = c.createRadialGradient(20, 16, 2, 20, 20, 28);
  bg.addColorStop(0, '#3e3226');
  bg.addColorStop(1, '#0f0c09');
  c.fillStyle = bg;
  c.fillRect(0, 0, 40, 40);
  c.lineCap = 'round';
  c.lineJoin = 'round';
  const steel = '#a3aab1', wood = '#6a4a2a', gold = '#c99b2a', dark = '#151311';
  switch (key) {
    case 'blades':
      c.strokeStyle = dark; c.lineWidth = 5;
      c.beginPath(); c.moveTo(9, 31); c.lineTo(31, 9); c.stroke();
      c.strokeStyle = steel; c.lineWidth = 2.6; c.stroke();
      c.strokeStyle = gold; c.lineWidth = 3;
      c.beginPath(); c.moveTo(9, 22); c.lineTo(18, 31); c.stroke();
      c.strokeStyle = wood; c.beginPath(); c.moveTo(12, 28); c.lineTo(7, 33); c.stroke();
      break;
    case 'helm':
      c.fillStyle = '#62676d'; c.strokeStyle = dark; c.lineWidth = 1.5;
      c.beginPath(); c.arc(20, 22, 12, Math.PI, 0); c.lineTo(32, 28); c.lineTo(26, 28); c.lineTo(24, 33); c.lineTo(16, 33); c.lineTo(14, 28); c.lineTo(8, 28); c.closePath(); c.fill(); c.stroke();
      c.fillStyle = dark; c.fillRect(19, 22, 2.5, 10);
      c.strokeStyle = 'rgba(230,235,240,0.5)'; c.beginPath(); c.arc(20, 22, 9, Math.PI * 1.2, Math.PI * 1.5); c.stroke();
      break;
    case 'leap':
      c.strokeStyle = '#d8cfbc'; c.lineWidth = 2; c.setLineDash([3, 3]);
      c.beginPath(); c.moveTo(5, 33); c.quadraticCurveTo(18, 2, 33, 22); c.stroke(); c.setLineDash([]);
      c.fillStyle = '#d8cfbc'; c.beginPath(); c.moveTo(35, 26); c.lineTo(29, 21); c.lineTo(36, 18); c.closePath(); c.fill();
      c.strokeStyle = steel; c.lineWidth = 2.5; c.beginPath(); c.moveTo(24, 12); c.lineTo(32, 6); c.stroke();
      break;
    case 'rage':
      c.fillStyle = '#8e1a14'; c.strokeStyle = '#2a0806'; c.lineWidth = 1.5;
      c.beginPath(); c.moveTo(20, 5); c.quadraticCurveTo(33, 22, 27, 30); c.quadraticCurveTo(20, 37, 13, 30); c.quadraticCurveTo(7, 22, 20, 5); c.fill(); c.stroke();
      c.fillStyle = 'rgba(255,140,120,0.5)'; c.beginPath(); c.ellipse(16, 24, 2.5, 4, -0.3, 0, TAU); c.fill();
      break;
    case 'bag':
      c.fillStyle = '#6b5032'; c.strokeStyle = dark; c.lineWidth = 1.5;
      c.beginPath(); c.ellipse(20, 25, 12, 11, 0, 0, TAU); c.fill(); c.stroke();
      c.beginPath(); c.moveTo(14, 15); c.lineTo(26, 15); c.stroke();
      c.fillStyle = gold;
      for (const [x, y] of [[15, 12], [21, 10], [26, 13], [18, 8]]) { c.beginPath(); c.arc(x, y, 3, 0, TAU); c.fill(); }
      break;
    case 'devout':
      { const g = c.createRadialGradient(20, 20, 2, 20, 20, 18); g.addColorStop(0, 'rgba(88,195,232,0.7)'); g.addColorStop(1, 'rgba(88,195,232,0)'); c.fillStyle = g; c.fillRect(0, 0, 40, 40); }
      c.fillStyle = '#58c3e8'; c.strokeStyle = '#123848'; c.lineWidth = 1.5;
      c.beginPath(); c.moveTo(20, 6); c.lineTo(28, 19); c.lineTo(20, 34); c.lineTo(12, 19); c.closePath(); c.fill(); c.stroke();
      c.fillStyle = 'rgba(220,245,255,0.6)'; c.beginPath(); c.moveTo(20, 6); c.lineTo(12, 19); c.lineTo(18, 19); c.closePath(); c.fill();
      break;
    case 'pick':
      c.strokeStyle = wood; c.lineWidth = 3.5; c.beginPath(); c.moveTo(10, 32); c.lineTo(27, 12); c.stroke();
      c.strokeStyle = '#9aa3ad'; c.lineWidth = 4; c.beginPath(); c.moveTo(14, 7); c.quadraticCurveTo(28, 9, 35, 22); c.stroke();
      c.strokeStyle = 'rgba(240,245,250,0.7)'; c.lineWidth = 1.2; c.beginPath(); c.moveTo(16, 7); c.quadraticCurveTo(27, 9, 32, 17); c.stroke();
      break;
    case 'walls':
      // an earth rampart with stakes, the ditch in front, and a spade
      c.fillStyle = '#6a5440'; c.strokeStyle = dark; c.lineWidth = 1.2;
      c.beginPath(); c.moveTo(3, 32); c.quadraticCurveTo(8, 18, 13, 16); c.lineTo(22, 16); c.lineTo(26, 32); c.closePath(); c.fill(); c.stroke();
      c.fillStyle = '#251c14'; c.beginPath(); c.moveTo(26, 30); c.lineTo(38, 30); c.lineTo(36, 36); c.lineTo(28, 36); c.closePath(); c.fill();
      c.strokeStyle = '#8a6a44'; c.lineWidth = 2; c.beginPath(); c.moveTo(21, 24); c.lineTo(32, 18); c.moveTo(23, 29); c.lineTo(34, 24); c.stroke();
      c.strokeStyle = wood; c.lineWidth = 2; c.beginPath(); c.moveTo(16, 4); c.lineTo(10, 15); c.stroke();
      c.fillStyle = steel; c.fillRect(7, 13, 6, 6);
      break;
    case 'walls2':
      // pointed logs lashed along the top of a rampart
      c.fillStyle = '#6a5440'; c.beginPath(); c.moveTo(2, 36); c.lineTo(8, 26); c.lineTo(32, 26); c.lineTo(38, 36); c.closePath(); c.fill();
      for (let i = 0; i < 5; i++) {
        const x = 8 + i * 6;
        c.fillStyle = i % 2 ? '#6a4a2c' : '#5a3e24';
        c.beginPath(); c.moveTo(x - 2.6, 27); c.lineTo(x - 2.6, 9 + (i % 2) * 2); c.lineTo(x, 4 + (i % 2) * 2); c.lineTo(x + 2.6, 9 + (i % 2) * 2); c.lineTo(x + 2.6, 27); c.closePath(); c.fill();
      }
      c.fillStyle = '#3a3a3e'; c.fillRect(5, 17, 30, 2);
      break;
    case 'drill':
      // three ranked helmets behind a raised blade
      for (const [x, y] of [[11, 26], [20, 22], [29, 26]]) {
        c.fillStyle = '#5d6168'; c.strokeStyle = dark; c.lineWidth = 1.2;
        c.beginPath(); c.arc(x, y, 6, Math.PI, 0); c.closePath(); c.fill(); c.stroke();
        c.fillStyle = '#161514'; c.fillRect(x - 3, y, 6, 8);
      }
      c.strokeStyle = steel; c.lineWidth = 2.4; c.beginPath(); c.moveTo(20, 15); c.lineTo(20, 3); c.stroke();
      c.strokeStyle = gold; c.lineWidth = 2; c.beginPath(); c.moveTo(16, 15); c.lineTo(24, 15); c.stroke();
      break;
    case 'prospect':
      c.fillStyle = '#5d5650'; c.strokeStyle = dark; c.lineWidth = 1.2;
      c.beginPath(); c.moveTo(5, 34); c.lineTo(12, 22); c.lineTo(22, 19); c.lineTo(32, 24); c.lineTo(36, 34); c.closePath(); c.fill(); c.stroke();
      c.fillStyle = gold;
      for (const [x, y] of [[14, 27], [22, 24], [28, 29]]) { c.beginPath(); c.arc(x, y, 2.6, 0, TAU); c.fill(); }
      c.strokeStyle = '#e8c25a'; c.lineWidth = 2.6;
      c.beginPath(); c.moveTo(21, 16); c.lineTo(21, 4); c.moveTo(16, 9); c.lineTo(21, 4); c.lineTo(26, 9); c.stroke();
      break;
    case 'bow':
      c.strokeStyle = '#2c1a0c'; c.lineWidth = 3;
      c.beginPath(); c.moveTo(12, 4); c.quadraticCurveTo(34, 20, 12, 36); c.stroke();
      c.strokeStyle = gold; c.lineWidth = 2;
      c.beginPath(); c.moveTo(12, 4); c.lineTo(8, 6); c.moveTo(12, 36); c.lineTo(8, 34); c.stroke();
      c.strokeStyle = '#d8cfbc'; c.lineWidth = 0.9; c.beginPath(); c.moveTo(12, 4); c.lineTo(12, 36); c.stroke();
      break;
    case 'arrows':
      for (const dy of [-7, 0, 7]) {
        c.strokeStyle = wood; c.lineWidth = 1.8; c.beginPath(); c.moveTo(6, 20 + dy + 6); c.lineTo(30, 20 + dy - 6); c.stroke();
        c.fillStyle = '#c4cbd2'; c.beginPath(); c.moveTo(36, 20 + dy - 9); c.lineTo(28, 20 + dy - 8); c.lineTo(31, 20 + dy - 2); c.closePath(); c.fill();
      }
      break;
    case 'quiver':
      c.fillStyle = '#4a2e16'; c.strokeStyle = dark; c.lineWidth = 1.4;
      c.beginPath(); c.moveTo(14, 36); c.lineTo(10, 14); c.lineTo(22, 12); c.lineTo(25, 35); c.closePath(); c.fill(); c.stroke();
      c.strokeStyle = '#d8cfbc'; c.lineWidth = 1.4;
      for (let i = 0; i < 5; i++) { c.beginPath(); c.moveTo(12 + i * 2.4, 13); c.lineTo(10 + i * 3.2, 4); c.stroke(); }
      c.strokeStyle = gold; c.lineWidth = 2; c.beginPath(); c.moveTo(29, 24); c.lineTo(35, 18); c.moveTo(29, 30); c.lineTo(35, 24); c.stroke();
      break;
    case 'fire': {
      const g = c.createRadialGradient(31, 9, 1, 31, 9, 12);
      g.addColorStop(0, 'rgba(255,170,60,0.85)');
      g.addColorStop(1, 'rgba(255,90,20,0)');
      c.fillStyle = g; c.fillRect(17, 0, 23, 22);
      c.strokeStyle = wood; c.lineWidth = 2; c.beginPath(); c.moveTo(6, 34); c.lineTo(28, 12); c.stroke();
      c.fillStyle = '#c4cbd2'; c.beginPath(); c.moveTo(33, 7); c.lineTo(25, 10); c.lineTo(30, 15); c.closePath(); c.fill();
      c.fillStyle = '#ff9a2e'; c.beginPath(); c.moveTo(27, 13); c.quadraticCurveTo(22, 6, 29, 1); c.quadraticCurveTo(31, 8, 35, 6); c.quadraticCurveTo(34, 13, 27, 13); c.fill();
      c.fillStyle = '#ffe08a'; c.beginPath(); c.ellipse(29, 10, 1.6, 3, 0.4, 0, TAU); c.fill();
      c.strokeStyle = '#d8cfbc'; c.lineWidth = 1.4; c.beginPath(); c.moveTo(6, 34); c.lineTo(4, 30); c.moveTo(6, 34); c.lineTo(10, 35); c.stroke();
      break;
    }
    // ---- mages: each Cleric icon has a Warlock mirror
    case 'c_focus':
    case 'w_focus': {
      const oc = key === 'c_focus' ? '#fff0b8' : '#b04dff';
      const g = c.createRadialGradient(26, 10, 0, 26, 10, 12);
      g.addColorStop(0, rgba(oc, 0.8)); g.addColorStop(1, rgba(oc, 0));
      c.fillStyle = g; c.fillRect(12, 0, 28, 24);
      c.strokeStyle = key === 'c_focus' ? '#7d5e34' : '#2e2018'; c.lineWidth = 3;
      c.beginPath(); c.moveTo(10, 36); c.lineTo(25, 12); c.stroke();
      c.fillStyle = oc; c.beginPath(); c.arc(26, 10, 3.5, 0, TAU); c.fill();
      break;
    }
    case 'c_pool':
    case 'w_pool': {
      const heal = key === 'c_pool';
      c.fillStyle = heal ? 'rgba(200,220,120,0.55)' : 'rgba(110,40,140,0.65)';
      c.beginPath(); c.ellipse(20, 28, 16, 6, 0, 0, TAU); c.fill();
      c.strokeStyle = heal ? '#f2dc8a' : '#c070ff'; c.lineWidth = 1.4; c.stroke();
      if (heal) {
        c.strokeStyle = '#a8e08a'; c.lineWidth = 3;
        c.beginPath(); c.moveTo(20, 6); c.lineTo(20, 20); c.moveTo(13, 13); c.lineTo(27, 13); c.stroke();
      } else {
        c.fillStyle = '#bdb5a2'; c.beginPath(); c.arc(20, 13, 6, 0, TAU); c.fill();
        c.fillStyle = '#1a1018'; c.fillRect(16.5, 11, 2.5, 2.5); c.fillRect(21, 11, 2.5, 2.5); c.fillRect(18, 17, 4, 2);
      }
      break;
    }
    case 'c_big': {
      c.strokeStyle = 'rgba(240,230,180,0.85)'; c.lineWidth = 2;
      c.fillStyle = 'rgba(240,230,180,0.18)';
      c.beginPath(); c.arc(20, 30, 15, Math.PI, 0); c.closePath(); c.fill(); c.stroke();
      c.strokeStyle = '#161514'; c.lineWidth = 2.4;
      for (const x of [14, 20, 26]) { c.beginPath(); c.arc(x, 21, 2, 0, TAU); c.moveTo(x, 23); c.lineTo(x, 30); c.stroke(); }
      break;
    }
    case 'w_big': {
      const g = c.createRadialGradient(20, 20, 2, 20, 20, 17);
      g.addColorStop(0, '#ffe08a'); g.addColorStop(0.45, '#ff8a2e'); g.addColorStop(1, 'rgba(160,40,10,0)');
      c.fillStyle = g; c.beginPath(); c.arc(20, 20, 17, 0, TAU); c.fill();
      c.fillStyle = 'rgba(60,40,30,0.6)';
      for (const [x, y, r] of [[8, 8, 3], [33, 10, 2.5], [6, 30, 2.5]]) { c.beginPath(); c.arc(x, y, r, 0, TAU); c.fill(); }
      break;
    }
    case 'c_hope':
      // a dawn rising behind an upturned chevron
      { const g = c.createRadialGradient(20, 26, 2, 20, 26, 18); g.addColorStop(0, 'rgba(242,220,138,0.85)'); g.addColorStop(1, 'rgba(242,220,138,0)'); c.fillStyle = g; c.fillRect(0, 0, 40, 40); }
      c.strokeStyle = '#f2dc8a'; c.lineWidth = 1.4;
      for (let i = 0; i < 7; i++) { const a = Math.PI + (i + 0.5) * Math.PI / 7; c.beginPath(); c.moveTo(20 + Math.cos(a) * 9, 28 + Math.sin(a) * 9); c.lineTo(20 + Math.cos(a) * 15, 28 + Math.sin(a) * 15); c.stroke(); }
      c.fillStyle = '#f2dc8a'; c.beginPath(); c.arc(20, 28, 7, Math.PI, 0); c.fill();
      c.strokeStyle = '#fff4d0'; c.lineWidth = 3; c.beginPath(); c.moveTo(12, 16); c.lineTo(20, 8); c.lineTo(28, 16); c.stroke();
      break;
    case 'w_fear':
      // a hollow-eyed face in violet smoke
      { const g = c.createRadialGradient(20, 20, 2, 20, 20, 18); g.addColorStop(0, 'rgba(176,102,232,0.6)'); g.addColorStop(1, 'rgba(176,102,232,0)'); c.fillStyle = g; c.fillRect(0, 0, 40, 40); }
      c.fillStyle = '#d8d0c0'; c.strokeStyle = dark; c.lineWidth = 1.4;
      c.beginPath(); c.ellipse(20, 18, 10, 11, 0, 0, TAU); c.fill(); c.stroke();
      c.fillRect(15, 26, 10, 6); c.strokeRect(15, 26, 10, 6);
      c.fillStyle = '#1a0e22';
      c.beginPath(); c.ellipse(16, 17, 3, 4, 0.2, 0, TAU); c.fill();
      c.beginPath(); c.ellipse(24, 17, 3, 4, -0.2, 0, TAU); c.fill();
      c.fillStyle = '#c070ff'; c.beginPath(); c.arc(16, 18, 1, 0, TAU); c.arc(24, 18, 1, 0, TAU); c.fill();
      c.strokeStyle = dark; c.lineWidth = 1; c.beginPath(); for (let x = 17; x <= 23; x += 2) { c.moveTo(x, 26); c.lineTo(x, 32); } c.stroke();
      break;
    case 'sifter':
      // a sluice box tilted in running water, gold caught in its riffles
      c.fillStyle = '#20404c'; c.fillRect(0, 26, 40, 14);
      c.strokeStyle = 'rgba(200,230,240,0.4)'; c.lineWidth = 1;
      for (const y of [30, 35]) { c.beginPath(); c.moveTo(2, y); c.quadraticCurveTo(12, y - 2, 22, y); c.quadraticCurveTo(30, y + 2, 38, y); c.stroke(); }
      c.save(); c.translate(20, 22); c.rotate(-0.25);
      c.fillStyle = '#6a4a2a'; c.strokeStyle = dark; c.lineWidth = 1.4;
      c.fillRect(-16, -5, 32, 10); c.strokeRect(-16, -5, 32, 10);
      c.fillStyle = '#2a3c44'; c.fillRect(-14, -3, 28, 6);
      c.fillStyle = '#8a6440'; for (let x = -12; x < 14; x += 6) c.fillRect(x, -4, 2, 8);
      c.fillStyle = gold; for (const x of [-9, -3, 3, 9]) { c.beginPath(); c.arc(x, 2, 1.2, 0, TAU); c.fill(); }
      c.restore();
      break;
    // ---- quartermaster, gladiator, necromancer
    case 'salves':
      // a jar of salve and a bandage roll
      c.fillStyle = '#7a8a6a'; c.strokeStyle = dark; c.lineWidth = 1.4;
      c.beginPath(); c.moveTo(9, 14); c.lineTo(23, 14); c.lineTo(25, 33); c.lineTo(7, 33); c.closePath(); c.fill(); c.stroke();
      c.fillStyle = '#5a3e24'; c.fillRect(8, 10, 16, 5); c.strokeRect(8, 10, 16, 5);
      c.fillStyle = '#a8e08a'; c.fillRect(10, 20, 12, 3);
      c.fillStyle = '#e8e0cc'; c.beginPath(); c.arc(30, 27, 6, 0, TAU); c.fill(); c.stroke();
      c.strokeStyle = '#c8bea8'; c.beginPath(); c.arc(30, 27, 3, 0, TAU); c.stroke();
      c.fillStyle = '#b8402e'; c.fillRect(28.5, 9, 3, 9); c.fillRect(25.5, 12, 9, 3);
      break;
    case 'wagon':
      // a supply cart laden with crates
      c.fillStyle = '#6a4a2a'; c.strokeStyle = dark; c.lineWidth = 1.4;
      c.fillRect(5, 18, 28, 8); c.strokeRect(5, 18, 28, 8);
      c.fillStyle = '#8a6a40'; c.fillRect(8, 9, 10, 9); c.strokeRect(8, 9, 10, 9); c.fillRect(19, 11, 10, 7); c.strokeRect(19, 11, 10, 7);
      for (const x of [11, 27]) { c.fillStyle = '#3a2814'; c.beginPath(); c.arc(x, 29, 5, 0, TAU); c.fill(); c.strokeStyle = '#8a7a5a'; c.beginPath(); c.moveTo(x - 4, 29); c.lineTo(x + 4, 29); c.moveTo(x, 25); c.lineTo(x, 33); c.stroke(); }
      c.strokeStyle = wood; c.lineWidth = 2; c.beginPath(); c.moveTo(33, 22); c.lineTo(38, 20); c.stroke();
      break;
    case 'manica':
      // an armored sleeve of overlapping plates
      for (let i = 0; i < 5; i++) {
        c.fillStyle = shade('#8d939a', -i * 0.06); c.strokeStyle = dark; c.lineWidth = 1.2;
        c.beginPath(); c.moveTo(10 + i * 4, 8 + i * 5); c.lineTo(26 + i * 2, 6 + i * 5); c.lineTo(28 + i * 2, 12 + i * 5); c.lineTo(12 + i * 4, 14 + i * 5); c.closePath(); c.fill(); c.stroke();
      }
      c.fillStyle = '#5a3e24'; c.fillRect(27, 31, 8, 5);
      break;
    case 'nets':
      // a weighted net spread wide
      c.strokeStyle = '#c8b890'; c.lineWidth = 1.1; c.beginPath();
      for (let i = 0; i <= 5; i++) { c.moveTo(6 + i * 5.6, 6); c.quadraticCurveTo(4 + i * 6.4, 20, 4 + i * 6.4, 33); c.moveTo(5, 8 + i * 5); c.quadraticCurveTo(20, 11 + i * 5, 35, 8 + i * 5); }
      c.stroke();
      c.fillStyle = '#6a6e74'; for (let i = 0; i <= 5; i++) { c.beginPath(); c.arc(4 + i * 6.4, 34, 2.2, 0, TAU); c.fill(); }
      break;
    case 'fame':
      // a laurel wreath around a palm frond
      c.strokeStyle = '#7a9a4a'; c.lineWidth = 2;
      c.beginPath(); c.arc(20, 21, 12, Math.PI * 0.65, Math.PI * 2.35); c.stroke();
      c.fillStyle = '#9ab85a';
      for (let i = 0; i < 9; i++) { const a = Math.PI * 0.7 + i * Math.PI * 0.18; for (const s of [1, -1]) { c.beginPath(); c.ellipse(20 + Math.cos(a) * 12 + s * 2, 21 + Math.sin(a) * 12, 3, 1.4, a + s * 0.6, 0, TAU); c.fill(); } }
      c.fillStyle = gold; c.beginPath(); c.moveTo(20, 11); c.lineTo(23, 19); c.lineTo(20, 31); c.lineTo(17, 19); c.closePath(); c.fill();
      break;
    case 'horde':
      // three skulls rising out of the earth
      c.fillStyle = '#3a3024'; c.fillRect(0, 30, 40, 10);
      { const g = c.createRadialGradient(20, 26, 2, 20, 26, 18); g.addColorStop(0, 'rgba(130,255,150,0.45)'); g.addColorStop(1, 'rgba(130,255,150,0)'); c.fillStyle = g; c.fillRect(0, 6, 40, 30); }
      for (const [x, y, r] of [[11, 26, 5], [29, 26, 5], [20, 20, 6.5]]) {
        c.fillStyle = '#d8d0bc'; c.beginPath(); c.arc(x, y, r, 0, TAU); c.fill(); c.fillRect(x - r * 0.55, y + r * 0.5, r * 1.1, r * 0.7);
        c.fillStyle = '#103a14'; c.beginPath(); c.arc(x - r * 0.38, y, r * 0.26, 0, TAU); c.arc(x + r * 0.38, y, r * 0.26, 0, TAU); c.fill();
      }
      break;
    case 'grave':
      // a handful of grave dirt over a cracked tombstone
      c.fillStyle = '#6a655c'; c.strokeStyle = dark; c.lineWidth = 1.4;
      c.beginPath(); c.moveTo(11, 34); c.lineTo(11, 14); c.arc(20, 14, 9, Math.PI, 0); c.lineTo(29, 34); c.closePath(); c.fill(); c.stroke();
      c.beginPath(); c.moveTo(20, 8); c.lineTo(17, 16); c.lineTo(22, 22); c.lineTo(19, 30); c.stroke();
      c.fillStyle = '#4a3a24'; c.beginPath(); c.ellipse(20, 35, 17, 4, 0, 0, TAU); c.fill();
      c.fillStyle = 'rgba(130,255,150,0.7)'; for (const [x, y] of [[8, 30], [33, 31], [26, 33]]) { c.beginPath(); c.arc(x, y, 1.2, 0, TAU); c.fill(); }
      break;
    case 'rites':
      // a ritual circle with a candle at each point
      c.strokeStyle = 'rgba(130,255,150,0.8)'; c.lineWidth = 1.3;
      c.beginPath(); c.ellipse(20, 26, 15, 6, 0, 0, TAU); c.stroke();
      c.beginPath(); for (let i = 0; i < 5; i++) { const a = i * TAU * 2 / 5 - Math.PI / 2; c.lineTo(20 + Math.cos(a) * 14, 26 + Math.sin(a) * 5.5); } c.closePath(); c.stroke();
      for (let i = 0; i < 5; i++) { const a = i * TAU / 5 - Math.PI / 2, x = 20 + Math.cos(a) * 15, y = 26 + Math.sin(a) * 6; c.fillStyle = '#e8e0cc'; c.fillRect(x - 1.2, y - 6, 2.4, 6); c.fillStyle = '#ffcf6a'; c.beginPath(); c.ellipse(x, y - 8, 1.2, 2.2, 0, 0, TAU); c.fill(); }
      break;
    // ---- giants
    case 'blinders':
      c.fillStyle = '#161514'; c.beginPath(); c.arc(20, 22, 11, 0, TAU); c.fill();
      c.fillStyle = '#5a3c22'; c.fillRect(4, 14, 9, 14); c.fillRect(27, 14, 9, 14);
      c.strokeStyle = '#2a1c10'; c.lineWidth = 2; c.beginPath(); c.moveTo(4, 18); c.lineTo(36, 18); c.stroke();
      c.fillStyle = '#d8c8a0'; c.fillRect(17, 20, 2.5, 2); c.fillRect(22, 20, 2.5, 2);
      break;
    case 'stun': {
      c.strokeStyle = '#4e3620'; c.lineWidth = 7; c.beginPath(); c.moveTo(8, 34); c.lineTo(26, 12); c.stroke();
      c.fillStyle = '#8a8d90';
      for (const [x, y] of [[20, 14], [26, 20], [24, 9], [30, 15]]) c.fillRect(x - 1.5, y - 1.5, 3, 3);
      c.fillStyle = '#f2dc8a';
      for (const [x, y] of [[8, 8], [33, 30], [14, 4]]) {
        c.beginPath();
        for (let i = 0; i < 10; i++) { const a = (i / 10) * TAU, r = i % 2 ? 1.5 : 3.6; c.lineTo(x + Math.cos(a) * r, y + Math.sin(a) * r); }
        c.closePath(); c.fill();
      }
      break;
    }
    case 'protein':
      c.fillStyle = '#7a5434'; c.strokeStyle = dark; c.lineWidth = 1.5;
      c.beginPath(); c.ellipse(18, 22, 9, 12, -0.6, 0, TAU); c.fill(); c.stroke();
      c.fillStyle = '#e8dcc0'; c.beginPath(); c.arc(28, 10, 4, 0, TAU); c.arc(32, 13, 4, 0, TAU); c.fill();
      c.strokeStyle = '#e8dcc0'; c.lineWidth = 3.5; c.beginPath(); c.moveTo(24, 16); c.lineTo(29, 11); c.stroke();
      break;
    case 'pan1':
      c.fillStyle = '#2c4652'; c.fillRect(0, 28, 40, 12);
      c.strokeStyle = 'rgba(170,205,215,0.5)'; c.lineWidth = 1; c.beginPath(); c.moveTo(3, 32); c.lineTo(12, 32); c.moveTo(22, 35); c.lineTo(34, 35); c.stroke();
      c.fillStyle = '#6f6c68'; c.strokeStyle = dark; c.lineWidth = 1.4;
      c.beginPath(); c.ellipse(20, 20, 15, 6, -0.15, 0, TAU); c.fill(); c.stroke();
      c.fillStyle = 'rgba(80,120,135,0.85)'; c.beginPath(); c.ellipse(20, 19.5, 10, 3.4, -0.15, 0, TAU); c.fill();
      c.fillStyle = gold;
      for (const [x, y] of [[16, 19], [22, 20], [19, 21]]) { c.beginPath(); c.arc(x, y, 1.5, 0, TAU); c.fill(); }
      break;
    case 'tithe':
      // statue silhouette raining coins
      c.fillStyle = '#7d7466'; c.strokeStyle = dark; c.lineWidth = 1.2;
      c.fillRect(11, 31, 18, 5); c.strokeRect(11, 31, 18, 5);
      c.strokeStyle = '#7d7466'; c.lineWidth = 3.5;
      c.beginPath(); c.arc(20, 10, 4, 0, TAU); c.moveTo(20, 14); c.lineTo(20, 24); c.lineTo(16, 31); c.moveTo(20, 24); c.lineTo(24, 31); c.moveTo(20, 17); c.lineTo(27, 11); c.stroke();
      c.fillStyle = gold;
      for (const [x, y] of [[8, 14], [32, 20], [9, 25], [31, 30]]) { c.beginPath(); c.arc(x, y, 2.6, 0, TAU); c.fill(); }
      break;
    case 'levy':
      // a fresh recruit marching out with a club, plus an hourglass
      c.strokeStyle = '#161514'; c.lineWidth = 2.6;
      c.beginPath(); c.arc(15, 9, 3.5, 0, TAU); c.moveTo(15, 13); c.lineTo(16, 24); c.lineTo(11, 34); c.moveTo(16, 24); c.lineTo(21, 33); c.moveTo(15, 16); c.lineTo(22, 20); c.stroke();
      c.fillStyle = '#161514'; c.beginPath(); c.arc(15, 9, 3.5, 0, TAU); c.fill();
      c.strokeStyle = '#5c3f24'; c.lineWidth = 3.5; c.beginPath(); c.moveTo(22, 20); c.lineTo(28, 10); c.stroke();
      c.strokeStyle = gold; c.lineWidth = 1.4;
      c.beginPath(); c.moveTo(29, 24); c.lineTo(36, 24); c.lineTo(29, 34); c.lineTo(36, 34); c.closePath(); c.stroke();
      break;
    case 'archer2':
    case 'archer3':
    case 'archer4':
      c.fillStyle = '#6a645d'; c.strokeStyle = dark; c.lineWidth = 1.2;
      c.fillRect(6, 22, 28, 14); c.strokeRect(6, 22, 28, 14);
      for (let x = 6; x < 34; x += 8) { c.fillRect(x, 18, 5, 4); c.strokeRect(x, 18, 5, 4); }
      c.strokeStyle = '#161514'; c.lineWidth = 2.2;
      c.beginPath(); c.arc(20, 9, 3, 0, TAU); c.moveTo(20, 12); c.lineTo(20, 18); c.moveTo(20, 14); c.lineTo(26, 12); c.stroke();
      c.strokeStyle = '#4e3018'; c.lineWidth = 1.6; c.beginPath(); c.arc(25, 12, 5, -1.2, 1.2); c.stroke();
      c.fillStyle = gold; c.font = 'bold 9px Georgia, serif'; c.textAlign = 'left';
      c.fillText({ archer2: 'II', archer3: 'III', archer4: 'IV' }[key], 4, 11);
      break;
    case 'shield':
      c.fillStyle = '#4e3c28'; c.strokeStyle = '#7d8288'; c.lineWidth = 2;
      c.beginPath(); c.ellipse(20, 20, 11, 15, 0, 0, TAU); c.fill(); c.stroke();
      c.fillStyle = gold; c.beginPath(); c.arc(20, 20, 3.5, 0, TAU); c.fill();
      break;
    case 'shelm':
      c.strokeStyle = '#8e2a22'; c.lineWidth = 4; c.beginPath(); c.arc(20, 22, 15, Math.PI * 1.1, Math.PI * 1.9); c.stroke();
      c.fillStyle = '#62676d'; c.strokeStyle = dark; c.lineWidth = 1.5;
      c.beginPath(); c.arc(20, 24, 11, Math.PI, 0); c.lineTo(31, 30); c.lineTo(9, 30); c.closePath(); c.fill(); c.stroke();
      c.fillStyle = dark; c.fillRect(19, 24, 2.5, 9);
      break;
    case 'inspire':
      c.strokeStyle = wood; c.lineWidth = 2.4; c.beginPath(); c.moveTo(12, 37); c.lineTo(12, 4); c.stroke();
      c.fillStyle = '#9a7a26'; c.beginPath(); c.moveTo(12, 5); c.quadraticCurveTo(24, 8, 34, 6); c.lineTo(28, 13); c.lineTo(34, 20); c.quadraticCurveTo(24, 18, 12, 19); c.closePath(); c.fill();
      c.strokeStyle = '#e8d38a'; c.lineWidth = 1.6;
      for (const y of [27, 32]) { c.beginPath(); c.moveTo(20, y + 3); c.lineTo(25, y); c.lineTo(30, y + 3); c.stroke(); }
      break;
    // ---- critical hits (archers and ninjas)
    case 'eye':
    case 'vital':
      c.strokeStyle = '#d8cfbc'; c.lineWidth = 1.6;
      c.beginPath(); c.arc(20, 20, 13, 0, TAU); c.moveTo(20, 3); c.lineTo(20, 11); c.moveTo(20, 29); c.lineTo(20, 37); c.moveTo(3, 20); c.lineTo(11, 20); c.moveTo(29, 20); c.lineTo(37, 20); c.stroke();
      c.fillStyle = key === 'eye' ? '#e0bf5a' : '#c0432f'; c.beginPath(); c.arc(20, 20, 4.5, 0, TAU); c.fill();
      c.fillStyle = '#fff4c8'; c.font = 'bold 8px Georgia, serif'; c.textAlign = 'center'; c.fillText('×2', 31, 37);
      break;
    // ---- ninja
    case 'serrated':
      c.strokeStyle = '#1a1414'; c.lineWidth = 3; c.beginPath(); c.moveTo(7, 34); c.lineTo(13, 28); c.stroke();
      c.strokeStyle = '#c8ccd0'; c.lineWidth = 2.2; c.beginPath(); c.moveTo(13, 28); c.quadraticCurveTo(24, 20, 34, 5); c.stroke();
      c.strokeStyle = '#7a8086'; c.lineWidth = 1.2; c.beginPath();
      for (let k = 0.2; k < 0.95; k += 0.15) { const x = 13 + 21 * k, y = 28 - 23 * k; c.moveTo(x, y); c.lineTo(x + 2.5, y + 1.5); }
      c.stroke();
      break;
    case 'parry':
      c.strokeStyle = '#c8ccd0'; c.lineWidth = 2.4;
      c.beginPath(); c.moveTo(8, 32); c.lineTo(30, 6); c.moveTo(8, 8); c.lineTo(32, 30); c.stroke();
      c.fillStyle = '#fff4c8';
      c.beginPath(); for (let i = 0; i < 10; i++) { const a = (i / 10) * TAU, r = i % 2 ? 2 : 5; c.lineTo(20 + Math.cos(a) * r, 19 + Math.sin(a) * r); } c.closePath(); c.fill();
      break;
    case 'nfocus':
      c.fillStyle = '#0e0c0c'; c.beginPath(); c.arc(20, 20, 13, 0, TAU); c.fill();
      c.fillStyle = '#d8c08a'; c.fillRect(9, 17, 22, 4);
      c.fillStyle = '#c0432f'; c.beginPath(); c.arc(24, 19, 1.8, 0, TAU); c.fill();
      c.strokeStyle = 'rgba(200,70,50,0.6)'; c.lineWidth = 1.4; c.setLineDash([2, 2]); c.beginPath(); c.arc(20, 20, 17, 0, TAU); c.stroke(); c.setLineDash([]);
      break;
    case 'stars':
      drawStar(c, 14, 24, 8, 0.3);
      drawStar(c, 29, 12, 6, 0.9);
      c.strokeStyle = 'rgba(216,207,188,0.5)'; c.lineWidth = 1; c.beginPath(); c.moveTo(3, 30); c.lineTo(8, 27); c.moveTo(20, 16); c.lineTo(24, 14); c.stroke();
      break;
    // ---- kestrels
    case 'feather':
      c.fillStyle = '#d8cfbc'; c.strokeStyle = '#5a4a38'; c.lineWidth = 1.2;
      c.beginPath(); c.moveTo(10, 34); c.quadraticCurveTo(12, 12, 31, 5); c.quadraticCurveTo(28, 24, 10, 34); c.fill(); c.stroke();
      c.beginPath(); c.moveTo(10, 34); c.lineTo(26, 12); c.stroke();
      c.strokeStyle = '#d8cfbc'; c.lineWidth = 1.4; c.setLineDash([2, 3]); c.beginPath(); c.moveTo(33, 22); c.lineTo(33, 36); c.stroke(); c.setLineDash([]);
      break;
    case 'scope':
      c.fillStyle = '#4a3220'; c.fillRect(6, 18, 22, 5);
      c.fillStyle = '#8a7a4a'; c.fillRect(10, 12, 14, 5);
      c.fillStyle = 'rgba(160,210,230,0.85)'; c.beginPath(); c.arc(25, 14.5, 2.4, 0, TAU); c.fill();
      c.strokeStyle = '#d8cfbc'; c.lineWidth = 1; c.setLineDash([2, 2]); c.beginPath(); c.moveTo(28, 21); c.lineTo(38, 21); c.stroke(); c.setLineDash([]);
      break;
    case 'winch':
      c.strokeStyle = '#8a9096'; c.lineWidth = 2.4; c.beginPath(); c.arc(20, 20, 9, 0, TAU); c.stroke();
      c.beginPath(); for (let i = 0; i < 6; i++) { const a = (i / 6) * TAU; c.moveTo(20 + Math.cos(a) * 9, 20 + Math.sin(a) * 9); c.lineTo(20 + Math.cos(a) * 12.5, 20 + Math.sin(a) * 12.5); } c.stroke();
      c.strokeStyle = '#4a3220'; c.lineWidth = 3; c.beginPath(); c.moveTo(20, 20); c.lineTo(31, 31); c.stroke();
      break;
    case 'barbs':
      for (const dy of [-6, 6]) {
        c.strokeStyle = '#6a5a44'; c.lineWidth = 2.6; c.beginPath(); c.moveTo(6, 22 + dy); c.lineTo(28, 18 + dy); c.stroke();
        c.fillStyle = '#9aa0a6'; c.beginPath(); c.moveTo(36, 16 + dy); c.lineTo(27, 14 + dy); c.lineTo(29, 18 + dy); c.lineTo(27, 22 + dy); c.closePath(); c.fill();
      }
      break;
    // ---- ballista
    // ---- firebird
    case 'pitch': {
      const g = c.createRadialGradient(20, 26, 2, 20, 26, 16); g.addColorStop(0, 'rgba(255,200,90,0.9)'); g.addColorStop(1, 'rgba(255,90,20,0)');
      c.fillStyle = g; c.fillRect(0, 8, 40, 32);
      c.fillStyle = '#3a2418'; c.beginPath(); c.arc(20, 16, 8, 0, TAU); c.fill();
      c.fillStyle = '#1a120c'; c.fillRect(17, 5, 6, 4);
      break;
    }
    case 'fuse':
      c.fillStyle = '#7a4a2a'; c.beginPath(); c.arc(16, 26, 9, 0, TAU); c.fill();
      c.strokeStyle = '#d8cfbc'; c.lineWidth = 1.4; c.beginPath(); c.moveTo(20, 18); c.quadraticCurveTo(26, 10, 31, 9); c.stroke();
      c.fillStyle = '#ffd25a'; for (let i = 0; i < 8; i++) { const a = (i / 8) * TAU, r = i % 2 ? 2 : 5; c.beginPath(); c.arc(32 + Math.cos(a) * r * 0.6, 8 + Math.sin(a) * r * 0.6, 1, 0, TAU); c.fill(); }
      break;
    // ---- saboteur
    case 'sappers':
      c.fillStyle = '#6a5440'; c.beginPath(); c.moveTo(4, 36); c.quadraticCurveTo(10, 22, 18, 20); c.lineTo(26, 20); c.lineTo(30, 36); c.closePath(); c.fill();
      c.strokeStyle = '#2a1e14'; c.lineWidth = 1.4; c.beginPath(); c.moveTo(17, 22); c.lineTo(21, 30); c.lineTo(18, 36); c.stroke();
      c.strokeStyle = wood; c.lineWidth = 2.4; c.beginPath(); c.moveTo(34, 6); c.lineTo(24, 22); c.stroke();
      c.strokeStyle = steel; c.lineWidth = 2.6; c.beginPath(); c.moveTo(27, 8); c.quadraticCurveTo(33, 9, 38, 15); c.stroke();
      break;
    case 'brine':
      c.fillStyle = '#9ec8d8'; c.beginPath(); c.moveTo(20, 4); c.quadraticCurveTo(31, 18, 28, 26); c.quadraticCurveTo(20, 34, 12, 26); c.quadraticCurveTo(9, 18, 20, 4); c.fill();
      c.fillStyle = '#f0eee8'; for (const [x, y] of [[8, 34], [14, 36], [26, 36], [32, 33], [20, 37]]) c.fillRect(x, y, 3, 3);
      break;
    // ---- beastmaster
    case 'stones':
      c.fillStyle = '#6a6d70'; c.strokeStyle = dark; c.lineWidth = 1.2;
      for (const [x, y, r] of [[14, 24, 7], [26, 26, 6], [20, 14, 6]]) { c.beginPath(); c.arc(x, y, r, 0, TAU); c.fill(); c.stroke(); }
      c.strokeStyle = '#8a6a44'; c.lineWidth = 2; c.beginPath(); c.moveTo(4, 36); c.lineTo(12, 30); c.stroke();
      break;
    case 'lore':
      c.fillStyle = '#5a4430'; c.beginPath(); c.ellipse(20, 26, 8, 7, 0, 0, TAU); c.fill();
      for (const [x, y] of [[10, 15], [17, 11], [24, 11], [31, 15]]) { c.beginPath(); c.ellipse(x, y, 3.2, 4, 0, 0, TAU); c.fill(); }
      c.strokeStyle = '#e0bf5a'; c.lineWidth = 1.4; c.beginPath(); c.arc(20, 22, 17, -0.4, 0.4); c.stroke();
      break;
    // ---- spirit golem
    case 'plating':
      c.fillStyle = '#5a5e64'; c.strokeStyle = '#58c3e8'; c.lineWidth = 1.2;
      c.beginPath(); c.moveTo(20, 4); c.lineTo(34, 10); c.lineTo(31, 28); c.lineTo(20, 36); c.lineTo(9, 28); c.lineTo(6, 10); c.closePath(); c.fill(); c.stroke();
      c.beginPath(); c.moveTo(20, 12); c.lineTo(24, 20); c.lineTo(20, 28); c.lineTo(16, 20); c.closePath(); c.stroke();
      break;
    case 'core': {
      const g = c.createRadialGradient(20, 20, 1, 20, 20, 16); g.addColorStop(0, '#e8f8ff'); g.addColorStop(0.4, '#9fe0ff'); g.addColorStop(1, 'rgba(88,195,232,0)');
      c.fillStyle = g; c.beginPath(); c.arc(20, 20, 16, 0, TAU); c.fill();
      c.strokeStyle = '#8c8678'; c.lineWidth = 3; c.strokeRect(9, 9, 22, 22);
      break;
    }
    case 'torsion':
      c.fillStyle = '#b8a070'; c.fillRect(13, 6, 14, 28);
      c.strokeStyle = '#6a5430'; c.lineWidth = 1.6; c.beginPath();
      for (let y = 8; y < 34; y += 5) { c.moveTo(13, y); c.lineTo(27, y + 3); }
      c.stroke();
      c.fillStyle = '#5a5d60'; c.fillRect(10, 4, 20, 4); c.fillRect(10, 32, 20, 4);
      break;
    case 'ironbolt':
      c.strokeStyle = '#3a2a1a'; c.lineWidth = 4; c.beginPath(); c.moveTo(5, 32); c.lineTo(28, 12); c.stroke();
      c.strokeStyle = '#8a6a44'; c.lineWidth = 5; c.beginPath(); c.moveTo(5, 32); c.lineTo(10, 28); c.stroke();
      c.fillStyle = '#8a9096'; c.beginPath(); c.moveTo(37, 4); c.lineTo(24, 10); c.lineTo(30, 17); c.closePath(); c.fill();
      c.strokeStyle = dark; c.lineWidth = 1; c.stroke();
      break;
    case 'mantlet':
      c.fillStyle = '#5a3e24'; c.strokeStyle = dark; c.lineWidth = 1.4;
      c.beginPath(); c.moveTo(8, 36); c.lineTo(8, 9); c.lineTo(32, 4); c.lineTo(32, 36); c.closePath(); c.fill(); c.stroke();
      c.beginPath(); c.moveTo(16, 7); c.lineTo(16, 36); c.moveTo(24, 5); c.lineTo(24, 36); c.stroke();
      c.fillStyle = '#8a8d90'; c.fillRect(8, 15, 24, 2.5); c.fillRect(8, 27, 24, 2.5);
      break;
    case 'javelin':
      // a javelin arcing up toward a flyer's wing
      c.strokeStyle = 'rgba(216,207,188,0.5)'; c.lineWidth = 1; c.setLineDash([2, 3]); c.beginPath(); c.moveTo(5, 35); c.quadraticCurveTo(12, 14, 26, 10); c.stroke(); c.setLineDash([]);
      c.strokeStyle = wood; c.lineWidth = 2.4; c.beginPath(); c.moveTo(14, 26); c.lineTo(30, 10); c.stroke();
      c.fillStyle = steel; c.beginPath(); c.moveTo(34, 6); c.lineTo(27, 9); c.lineTo(31, 13); c.closePath(); c.fill();
      c.fillStyle = shade('#c49a2c', -0.35); c.beginPath(); c.moveTo(22, 4); c.quadraticCurveTo(31, -1, 39, 4); c.quadraticCurveTo(31, 2, 22, 4); c.fill();
      break;
    case 'halberd':
      c.strokeStyle = wood; c.lineWidth = 2.6; c.beginPath(); c.moveTo(8, 36); c.lineTo(30, 6); c.stroke();
      c.fillStyle = '#868d94'; c.strokeStyle = dark; c.lineWidth = 1;
      c.beginPath(); c.moveTo(25, 13); c.quadraticCurveTo(14, 8, 17, 2); c.lineTo(29, 8); c.closePath(); c.fill(); c.stroke();
      c.beginPath(); c.moveTo(30, 6); c.lineTo(36, 1); c.lineTo(32, 9); c.closePath(); c.fill();
      break;
  }
  if (tier2) {
    c.fillStyle = 'rgba(0,0,0,0.7)';
    c.fillRect(25, 1, 14, 11);
    c.fillStyle = '#e0bf5a';
    c.font = 'bold 9px Georgia, serif';
    c.textAlign = 'center';
    c.fillText(tierMark, 32, 10);
  }
  c.setTransform(1, 0, 0, 1, 0, 0);
  grainOver(c, W, W, 0.1);
}
