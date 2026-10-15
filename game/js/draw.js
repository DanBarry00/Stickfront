'use strict';
// Drawing routines for stick figures, statues, castles, walls, mines, props and icons.
// Limb angles are in a "facing right" frame; `f` (+1/-1) mirrors x.

const NO_PERKS = {};
const CLOTH = ['#3a2e22', '#3a1512'];

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
  const st = TEAM_STYLE[o.team], f = o.facing, P = o.perks || NO_PERKS, cleric = o.type === 'cleric';
  ctx.save();
  ctx.translate(o.x, o.y - (o.lift || 0));
  if (o.fall) ctx.rotate(-f * o.fall * 1.5);
  if (o.alpha !== undefined) ctx.globalAlpha *= o.alpha;
  ctx.scale(o.scale, o.scale);
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  const col = o.flash > 0 ? '#6e1510' : st.body;
  const robe = o.flash > 0 ? '#6e1510' : cleric ? '#a39a80' : '#2a1c2c';
  const robeDark = cleric ? '#766d58' : '#150c16';
  const trim = cleric ? shade(st.accent, -0.1) : o.team === 0 ? '#6a4a8a' : '#8a2030';
  const orbCol = cleric ? '#fff0b8' : '#b04dff';
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
  ctx.fillStyle = cleric ? 'rgba(255,240,190,0.5)' : 'rgba(200,80,255,0.75)';
  ctx.beginPath();
  ctx.arc(hx + 3 * f, hy - 0.5, 1.2, 0, TAU);
  ctx.fill();

  // staff with its orb
  const [tx, ty] = polar(hx2, hy2, staffAng, P.focus ? 32 : 30, f);
  const [lx, ly] = polar(hx2, hy2, staffAng + Math.PI, 17, f);
  ctx.strokeStyle = cleric ? '#7d5e34' : '#2a1c14';
  ctx.lineWidth = 2.6;
  ctx.beginPath();
  ctx.moveTo(lx, ly);
  ctx.lineTo(tx, ty);
  ctx.stroke();
  if (!cleric) {
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
  ctx.fillStyle = orbCol;
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

// A hunched, knuckle-dragging giant with a club. Chains hang from its shackles: more chains = more obedient.
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
  const outline = stone ? shade(stone, -0.6) : null;
  const t = RT + o.seed, ph = o.walk, mv = o.moving, s = o.swing;
  const hipY = -26 - (mv ? Math.abs(Math.sin(ph)) * 1.5 : Math.sin(t * 1.5) * 0.5);
  const sx = 7 * f, sy = hipY - 18, hx = sx + 6 * f, hy = sy - 3;

  // club arm: big overhead smash
  let th;
  if (s >= 0) th = s < 0.55 ? lerp(1.0, -2.2, easeOut(s / 0.55)) : s < 0.7 ? lerp(-2.2, 1.35, (s - 0.55) / 0.15) : lerp(1.35, 1.0, (s - 0.7) / 0.3);
  else th = 1.0 + (mv ? Math.sin(ph + Math.PI) * 0.2 : Math.sin(t * 1.5) * 0.05);
  const [ex, ey] = polar(sx, sy + 1, th + 0.3, 11, f);
  const [hx2, hy2] = polar(ex, ey, th - 0.1, 11, f);
  const ba = Math.PI / 2 + 0.25 + (mv ? Math.sin(ph) * 0.35 : 0);
  const [bex, bey] = polar(sx, sy + 1, ba, 11, f);
  const [bhx, bhy] = polar(bex, bey, ba - 0.2, 11, f);

  const feet = [], knees = [];
  for (let i = 0; i < 2; i++) {
    const p = ph + i * Math.PI;
    const fx = (mv ? Math.sin(p) * 9 : i ? -6 : 7) * f, fy = mv ? -Math.max(0, Math.cos(p)) * 3 : 0;
    feet.push([fx, fy]);
    knees.push([fx * 0.5 + 5 * f, hipY * 0.5 - 1]);
  }

  const limbs = (w, c) => {
    ctx.strokeStyle = c;
    ctx.lineWidth = w;
    ctx.beginPath();
    ctx.moveTo(sx, sy + 1);
    ctx.lineTo(bex, bey);
    ctx.lineTo(bhx, bhy);
    for (let i = 0; i < 2; i++) {
      ctx.moveTo(0, hipY);
      ctx.lineTo(knees[i][0], knees[i][1]);
      ctx.lineTo(feet[i][0], feet[i][1]);
    }
    ctx.stroke();
    // heavy torso with a gut
    ctx.lineWidth = w * 1.7;
    ctx.beginPath();
    ctx.moveTo(0, hipY);
    ctx.quadraticCurveTo(9 * f, hipY - 6, sx, sy);
    ctx.stroke();
  };
  if (outline) limbs(8, outline);
  limbs(5.5, skin);
  if (stone) {
    // cracked stone hide and the statue's crystal heart
    ctx.strokeStyle = rgba(outline, 0.8);
    ctx.lineWidth = 0.8;
    ctx.beginPath();
    ctx.moveTo(3 * f, hipY - 4);
    ctx.lineTo(6 * f, hipY - 10);
    ctx.lineTo(4 * f, hipY - 14);
    ctx.stroke();
    const g = ctx.createRadialGradient(5 * f, hipY - 10, 0, 5 * f, hipY - 10, 8);
    g.addColorStop(0, rgba(st.crystal, 0.9));
    g.addColorStop(1, rgba(st.crystal, 0));
    ctx.fillStyle = g;
    ctx.fillRect(5 * f - 8, hipY - 18, 16, 16);
  }

  // loincloth in team colours
  ctx.fillStyle = shade(st.accent, -0.45);
  ctx.beginPath();
  ctx.moveTo(-4 * f, hipY);
  ctx.lineTo(5 * f, hipY);
  ctx.lineTo(3 * f + Math.sin(t * 3) * 0.6, hipY + 8);
  ctx.lineTo(-3 * f, hipY + 7);
  ctx.closePath();
  ctx.fill();

  // small, low-slung head
  if (outline) {
    ctx.fillStyle = outline;
    ctx.beginPath();
    ctx.arc(hx, hy, 6.3, 0, TAU);
    ctx.fill();
  }
  ctx.fillStyle = skin;
  ctx.beginPath();
  ctx.arc(hx, hy, 5.2, 0, TAU);
  ctx.fill();
  ctx.fillRect(hx - 1 * f, hy + 2, 5 * f, 3);   // jutting jaw
  if (o.gear === 'horns') {
    ctx.strokeStyle = '#c9bfa6';
    ctx.lineWidth = 1.6;
    ctx.beginPath();
    ctx.moveTo(hx - 3, hy - 4);
    ctx.quadraticCurveTo(hx - 6, hy - 8, hx - 3, hy - 11);
    ctx.moveTo(hx + 3, hy - 4);
    ctx.quadraticCurveTo(hx + 6, hy - 8, hx + 3, hy - 11);
    ctx.stroke();
  }
  ctx.fillStyle = stone ? st.crystal : o.team === 1 ? st.accent2 : '#d8c8a0';
  ctx.fillRect(hx + 2 * f - 0.6, hy - 1.5, 1.4, 1.2);   // beady eye
  if (P.blinders && !stone) {
    ctx.fillStyle = '#4a3420';
    ctx.fillRect(hx + 3.5 * f - (f > 0 ? 0 : 2.5), hy - 4, 2.5, 5);
    ctx.strokeStyle = '#2a1c10';
    ctx.lineWidth = 0.8;
    ctx.beginPath();
    ctx.moveTo(hx - 5 * f, hy - 2);
    ctx.lineTo(hx + 4 * f, hy - 2);
    ctx.stroke();
  }

  // the club
  const ca = th - 0.4;
  const [c1x, c1y] = polar(hx2, hy2, ca + Math.PI, 4, f);
  const [c2x, c2y] = polar(hx2, hy2, ca, 14, f);
  const [c3x, c3y] = polar(hx2, hy2, ca, 30, f);
  ctx.strokeStyle = '#2a1c10';
  ctx.lineWidth = 5;
  ctx.beginPath();
  ctx.moveTo(c1x, c1y);
  ctx.lineTo(c2x, c2y);
  ctx.stroke();
  ctx.lineWidth = 10;
  ctx.beginPath();
  ctx.moveTo(c2x, c2y);
  ctx.lineTo(c3x, c3y);
  ctx.stroke();
  ctx.strokeStyle = '#4e3620';
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(c1x, c1y);
  ctx.lineTo(c2x, c2y);
  ctx.stroke();
  ctx.lineWidth = 7.5;
  ctx.beginPath();
  ctx.moveTo(c2x, c2y);
  ctx.lineTo(c3x, c3y);
  ctx.stroke();
  if (P.stun) {
    // iron studs on the Stun Club
    ctx.fillStyle = '#8a8d90';
    for (const dd of [18, 23, 28]) {
      const [px, py] = polar(hx2, hy2, ca, dd, f);
      for (const side of [-1, 1]) {
        const [qx, qy] = polar(px, py, ca + side * Math.PI / 2, 4.5, f);
        ctx.fillRect(qx - 1, qy - 1, 2, 2);
      }
    }
  }
  // front arm over the club
  if (outline) {
    ctx.strokeStyle = outline;
    ctx.lineWidth = 8;
    ctx.beginPath();
    ctx.moveTo(sx, sy + 1);
    ctx.lineTo(ex, ey);
    ctx.lineTo(hx2, hy2);
    ctx.stroke();
  }
  ctx.strokeStyle = skin;
  ctx.lineWidth = 5.5;
  ctx.beginPath();
  ctx.moveTo(sx, sy + 1);
  ctx.lineTo(ex, ey);
  ctx.lineTo(hx2, hy2);
  ctx.stroke();

  // shackles and chains: back wrist, front wrist, back ankle, front ankle, neck
  const cuffs = [[bhx, bhy], [hx2, hy2], feet[1], feet[0], [hx - 3 * f, hy + 5]];
  for (let i = 0; i < Math.min(5, o.chains || 0); i++) {
    const [cx, cy] = cuffs[i];
    ctx.fillStyle = '#3d4044';
    ctx.fillRect(cx - 2.2, cy - 2.2 + (i >= 2 && i < 4 ? -2 : 0), 4.4, 3);
    ctx.strokeStyle = '#6a6e74';
    ctx.lineWidth = 0.9;
    for (let k = 0; k < 4; k++) {
      const sway = Math.sin(t * 2 + i + k * 0.6) * k * 0.8;
      const lx = cx - f * (i === 4 ? k * 2.5 : 0) + sway, ly = cy + 2 + k * 2.6;
      ctx.beginPath();
      if (k % 2) ctx.ellipse(lx, ly, 0.9, 1.6, 0, 0, TAU);
      else ctx.ellipse(lx, ly, 1.6, 0.9, 0, 0, TAU);
      ctx.stroke();
    }
  }
  ctx.restore();
}

// Kestrel in flight: hanging under a glider wing, legs trailing, small crossbow aimed with the
// front arm. Feather Fall gives the wing a feathered trailing edge.
function drawFlyer(ctx, o) {
  const st = TEAM_STYLE[o.team], f = o.facing, P = o.perks || NO_PERKS;
  ctx.save();
  ctx.translate(o.x, o.y - (o.lift || 0));
  if (o.fall) ctx.rotate(-f * o.fall * 1.5);
  if (o.alpha !== undefined) ctx.globalAlpha *= o.alpha;
  ctx.scale(o.scale, o.scale);
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  const col = o.flash > 0 ? '#6e1510' : st.body, t = RT + o.seed;
  const sway = Math.sin(t * 2.2) * 1.5;

  // the glider wing
  const wy = -66 + sway * 0.5;
  const back = [-36 * f, wy + 10], top = [-4 * f, wy - 6], front = [32 * f, wy + 4];
  ctx.fillStyle = shade(st.accent, -0.45);
  ctx.strokeStyle = '#1a1612';
  ctx.lineWidth = 1.6;
  ctx.beginPath();
  ctx.moveTo(front[0], front[1]);
  ctx.quadraticCurveTo(top[0], top[1] - 10, back[0], back[1]);
  if (P.feather) {
    // feathered trailing edge
    for (let i = 1; i <= 6; i++) {
      const k = i / 6;
      const x = lerp(back[0], front[0], k), y = lerp(back[1], front[1], k) + 2;
      ctx.quadraticCurveTo(x - 4 * f, y + 7, x, y);
    }
  } else {
    ctx.quadraticCurveTo(-2 * f, wy + 2, front[0], front[1]);
  }
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  ctx.strokeStyle = rgba(st.accent2, 0.5);
  ctx.lineWidth = 1;
  ctx.beginPath();
  for (const k of [0.25, 0.5, 0.75]) {
    ctx.moveTo(-4 * f, wy - 2);
    ctx.lineTo(lerp(back[0], front[0], k), lerp(back[1], front[1], k) + 2);
  }
  ctx.stroke();

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
  drawCrossbow(ctx, hx, hy, aim, f, P, !shooting || o.swing < 0.8);
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

// Ballista: a wheeled bolt-thrower, its crewman turning the windlass behind it. Between shots
// the string is wound back over most of the reload, the bolt sits in the groove, and it snaps
// forward at the release (swing 0.8). Mantlet adds a timber shield across the front.
function drawBallista(ctx, o) {
  const st = TEAM_STYLE[o.team], f = o.facing, P = o.perks || NO_PERKS;
  ctx.save();
  ctx.translate(o.x, o.y - (o.lift || 0));
  if (o.fall) ctx.rotate(-f * o.fall * 0.5);
  if (o.alpha !== undefined) ctx.globalAlpha *= o.alpha;
  ctx.scale(o.scale, o.scale);
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  const wood = o.flash > 0 ? '#7a2a20' : '#6a4a2c', dark = '#2a1c10', t = RT + o.seed, s = o.swing;
  const pull = s < 0 ? 1 : s < 0.8 ? Math.min(1, s / 0.6) : 0;   // how far the string is wound back
  const cranking = s >= 0 && s < 0.6;

  // the crewman behind, hands on the windlass
  const cx = -30 * f, col = o.flash > 0 ? '#6e1510' : st.body;
  const crank = cranking ? Math.sin(t * 9) * 3 : 0;
  ctx.strokeStyle = col;
  ctx.lineWidth = 3.1;
  ctx.beginPath();
  ctx.moveTo(cx, -26); ctx.lineTo(cx - 4 * f, -13); ctx.lineTo(cx - 6 * f, 0);   // back leg
  ctx.moveTo(cx - 4 * f, -13); ctx.lineTo(cx + 2 * f, -6); ctx.lineTo(cx + 4 * f, 0);   // front leg
  ctx.moveTo(cx - 4 * f, -13); ctx.lineTo(cx, -36);   // spine
  ctx.moveTo(cx, -33); ctx.lineTo(cx + 7 * f, -28 + crank); ctx.lineTo(cx + 13 * f, -27 + crank);   // arms to the windlass
  ctx.stroke();
  ctx.fillStyle = col;
  ctx.beginPath();
  ctx.arc(cx + 1 * f, -43, 6.5, 0, TAU);
  ctx.fill();
  drawGear(ctx, o.gear, cx + 1 * f, -43, f, st, t, o.team);

  // wheels, spokes turning as it rolls
  for (const wx of [-13, 11]) {
    const x = wx * f;
    ctx.fillStyle = dark;
    ctx.beginPath();
    ctx.arc(x, -7, 7, 0, TAU);
    ctx.fill();
    ctx.strokeStyle = '#8a6a44';
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    for (let i = 0; i < 3; i++) {
      const a = (o.walk || 0) * 0.6 * f + (i / 3) * Math.PI;
      ctx.moveTo(x - Math.cos(a) * 6, -7 - Math.sin(a) * 6);
      ctx.lineTo(x + Math.cos(a) * 6, -7 + Math.sin(a) * 6);
    }
    ctx.stroke();
  }
  // carriage, trestle and the stock, tilted up a little
  ctx.strokeStyle = wood;
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.moveTo(-21 * f, -12); ctx.lineTo(19 * f, -12);
  ctx.moveTo(-5 * f, -12); ctx.lineTo(-2 * f, -25);
  ctx.moveTo(8 * f, -12); ctx.lineTo(5 * f, -26);
  ctx.stroke();
  ctx.lineWidth = 4.5;
  ctx.beginPath();
  ctx.moveTo(-19 * f, -24); ctx.lineTo(22 * f, -30);
  ctx.stroke();
  // windlass at the back of the stock
  ctx.fillStyle = '#8a8d90';
  ctx.beginPath();
  ctx.arc(-17 * f, -24, 3, 0, TAU);
  ctx.fill();
  // bow arms at the front: bent back as the string is wound
  const fx = 20 * f, fy = -29.5, bend = 6 * pull;
  const top = [fx - bend * f, fy - 16], bot = [fx - bend * f, fy + 14];
  ctx.strokeStyle = dark;
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(...top); ctx.quadraticCurveTo(fx + 4 * f, fy - 6, fx, fy); ctx.quadraticCurveTo(fx + 4 * f, fy + 6, ...bot);
  ctx.stroke();
  // string to the nock, and the bolt lying in the groove while loaded
  const nx = fx - (4 + 30 * pull) * f, ny = fy + 4.5 * pull;
  ctx.strokeStyle = '#d8cfbc';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(...top); ctx.lineTo(nx, ny); ctx.lineTo(...bot);
  ctx.stroke();
  if (pull > 0.3) {
    ctx.strokeStyle = '#4a3220';
    ctx.lineWidth = 2.2;
    ctx.beginPath();
    ctx.moveTo(nx, ny - 1); ctx.lineTo(fx + 8 * f, fy - 2);
    ctx.stroke();
    ctx.fillStyle = P.ironbolt ? '#8a9096' : '#a9b0b6';
    ctx.beginPath();
    ctx.moveTo(fx + 13 * f, fy - 2.5); ctx.lineTo(fx + 7 * f, fy - 5); ctx.lineTo(fx + 7 * f, fy + 0.5);
    ctx.closePath();
    ctx.fill();
  }
  // Torsion Springs: twisted rope skeins at the bow's root
  if (P.torsion) {
    ctx.fillStyle = '#b8a070';
    ctx.fillRect(fx - 4 * f - 2, fy - 7, 4, 14);
    ctx.strokeStyle = '#6a5430';
    ctx.lineWidth = 0.8;
    ctx.beginPath();
    for (let i = -6; i < 7; i += 3) { ctx.moveTo(fx - 4 * f - 2, fy + i); ctx.lineTo(fx - 4 * f + 2, fy + i + 2); }
    ctx.stroke();
  }
  // Mantlet: a timber shield across the front of the carriage
  if (P.mantlet) {
    ctx.fillStyle = '#5a3e24';
    ctx.strokeStyle = dark;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(24 * f, -2); ctx.lineTo(24 * f, -22); ctx.lineTo(30 * f, -24); ctx.lineTo(30 * f, -2);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = shade(st.accent, -0.2);
    ctx.fillRect(Math.min(24 * f, 30 * f) + 1, -15, 4, 3);
  }
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
  if (o.type === 'cleric' || o.type === 'warlock') return drawMage(ctx, o);
  if (o.type === 'flyer' && !o.grounded) return drawFlyer(ctx, o);
  if (o.type === 'ballista') return drawBallista(ctx, o);
  const st = TEAM_STYLE[o.team], f = o.facing, P = o.perks || NO_PERKS;
  ctx.save();
  ctx.translate(o.x, o.y - (o.lift || 0));
  if (o.fall) ctx.rotate(-f * o.fall * 1.5);
  if (o.alpha !== undefined) ctx.globalAlpha *= o.alpha;
  ctx.scale(o.scale, o.scale);
  const col = o.flash > 0 ? '#6e1510' : st.body;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';

  const t = RT + o.seed, ph = o.walk;
  const isMiner = o.type === 'miner', isArcher = o.type === 'archer', isSword = o.type === 'sword', isSpear = o.type === 'spear';
  const isNinja = o.type === 'ninja', isKnife = o.type === 'flyer';   // a grounded Kestrel fights with a knife
  const praying = o.pray !== undefined && o.pray >= 0;
  const panning = !!o.panning;
  const kneel = praying || panning;
  const wall = isSpear && o.wall;
  const run = (isSword || isNinja) && o.moving && !(o.pace < 0.8);   // in a slow formation they walk
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
    const lean = run ? 8 : wall ? 4 : o.swing > 0.4 && o.swing < 0.75 ? 4 : isArcher ? 0.5 : isSpear ? 2 : 1;
    sx = lean * f;
    sy = hipY - (run ? 21 : 23);
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
  } else if (isNinja && o.starRanged && o.swing >= 0) {
    // throwing a star: draw the arm back, then whip it forward (release at 0.8)
    const s = o.swing;
    th = s < 0.65 ? lerp(0.5, -2.3, easeOut(s / 0.65)) : lerp(-2.3, 0.4, Math.min(1, (s - 0.65) / 0.2));
  } else if (isSword || isNinja || isKnife) {
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
  if (isSword || isArcher || isSpear || isNinja || isKnife) {
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

  // miner extras: sack of gold, self-defense leathers, devout amulet, mason's hammer
  if (isMiner) {
    if (P.defense) {
      ctx.strokeStyle = '#4a3420';
      ctx.lineWidth = 2.4;
      ctx.beginPath();
      ctx.moveTo(sx + 1 * f, sy + 1);
      ctx.lineTo(-1 * f, hipY - 1);
      ctx.stroke();
      ctx.fillStyle = '#5a4028';
      ellipse(ctx, sx, sy + 1, 4.2, 3.2);
      ctx.fill();
    }
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
  if ((isSword || isSpear) && P.helm) drawHelmet(ctx, hx, hy, f, o.gear === 'horns', isSpear ? shade(st.accent, -0.2) : null);
  else drawGear(ctx, o.gear, hx, hy, f, st, t, o.team);
  if (o.team === 1 && o.gear !== 'mask' || o.rage > 0.3) {
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
  if (isNinja) {
    if (o.starRanged) {
      // blade sheathed across the back, a star in the throwing hand until it flies
      drawKatana(ctx, sx - 8 * f, sy - 6, 2.3, f, P, -1);
      if (o.swing < 0 || o.swing < 0.8) drawStar(ctx, hx2, hy2, 4, t * (o.swing >= 0 ? 0 : 2));
    } else {
      drawKatana(ctx, hx2, hy2, run && o.swing < 0 ? th + 0.8 : th - 1.0, f, P, o.swing);
    }
  } else if (isKnife) {
    // a torn glider wing still strapped to the back, and a short knife
    ctx.fillStyle = shade(st.accent, -0.5);
    ctx.beginPath();
    ctx.moveTo(sx - 2 * f, sy);
    ctx.lineTo(sx - 16 * f, sy - 10);
    ctx.lineTo(sx - 12 * f, sy + 2);
    ctx.lineTo(sx - 18 * f, sy + 8);
    ctx.closePath();
    ctx.fill();
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

function drawGear(ctx, g, hx, hy, f, st, t, team) {
  switch (g) {
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
function drawStream(ctx, x0, x1, dark) {
  const top = LANE_BOT + 1, bot = LANE_BOT + 13;
  ctx.fillStyle = '#26221e';
  ctx.fillRect(x0, top - 2, x1 - x0, bot - top + 4);
  const g = ctx.createLinearGradient(0, top, 0, bot);
  g.addColorStop(0, '#2c4652');
  g.addColorStop(1, '#1b2c33');
  ctx.fillStyle = g;
  ctx.fillRect(x0, top, x1 - x0, bot - top);
  // drifting ripples
  ctx.strokeStyle = 'rgba(170,205,215,0.28)';
  ctx.lineWidth = 1;
  ctx.beginPath();
  const drift = (RT * 26) % 40;
  for (let x = x0 - 40 + drift; x < x1; x += 40) {
    for (const [dy, len] of [[3, 12], [7, 18], [10, 9]]) {
      const xx = x + dy * 3;
      if (xx < x0 || xx + len > x1) continue;
      ctx.moveTo(xx, top + dy);
      ctx.quadraticCurveTo(xx + len / 2, top + dy - 1.2, xx + len, top + dy);
    }
  }
  ctx.stroke();
  // kerb stones along the bank
  ctx.strokeStyle = rgba(dark, 0.8);
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(x0, top - 1);
  ctx.lineTo(x1, top - 1);
  ctx.moveTo(x0, bot + 1);
  ctx.lineTo(x1, bot + 1);
  for (let x = x0 + 10; x < x1; x += 26) {
    ctx.moveTo(x, top - 3);
    ctx.lineTo(x, top);
  }
  ctx.stroke();
}

// Cleric's chapel on the rampart: pale stone, pointed roof, warm glowing window.
function drawChapel(ctx, x, base, st, hover) {
  const w = 54, L = x - w / 2, h = 46;
  if (hover) { ctx.shadowColor = 'rgba(255,215,120,0.9)'; ctx.shadowBlur = 14; }
  ctx.fillStyle = '#8f8778';
  ctx.fillRect(L, base - h, w, h);
  ctx.shadowBlur = 0;
  texFill(ctx, L, base - h, w, h, 0.7);
  drawBricks(ctx, L, base - h, L + w, base, '#2a2622', 0.4);
  ctx.strokeStyle = '#2a2622';
  ctx.lineWidth = 1.5;
  ctx.strokeRect(L, base - h, w, h);
  ctx.fillStyle = '#3a3634';
  ctx.beginPath();
  ctx.moveTo(L - 5, base - h);
  ctx.lineTo(x, base - h - 30);
  ctx.lineTo(L + w + 5, base - h);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  // sun emblem on the gable
  ctx.strokeStyle = shade(st.accent, -0.1);
  ctx.lineWidth = 1.6;
  ctx.beginPath();
  ctx.arc(x, base - h - 36, 3.5, 0, TAU);
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * TAU;
    ctx.moveTo(x + Math.cos(a) * 5, base - h - 36 + Math.sin(a) * 5);
    ctx.lineTo(x + Math.cos(a) * 8, base - h - 36 + Math.sin(a) * 8);
  }
  ctx.stroke();
  // glowing arched window
  const g = ctx.createRadialGradient(x, base - 26, 0, x, base - 26, 30);
  g.addColorStop(0, 'rgba(255,230,160,0.45)');
  g.addColorStop(1, 'rgba(255,230,160,0)');
  ctx.fillStyle = g;
  ctx.fillRect(x - 30, base - 56, 60, 60);
  ctx.fillStyle = '#f0d890';
  ctx.beginPath();
  ctx.moveTo(x - 6, base - 14);
  ctx.lineTo(x - 6, base - 30);
  ctx.arc(x, base - 30, 6, Math.PI, 0);
  ctx.lineTo(x + 6, base - 14);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = '#3a3226';
  ctx.beginPath();
  ctx.moveTo(x, base - 36);
  ctx.lineTo(x, base - 14);
  ctx.moveTo(x - 6, base - 24);
  ctx.lineTo(x + 6, base - 24);
  ctx.stroke();
}

// Warlock's sanctum on the rampart: dark stone, spiked roof, violet rune window.
function drawSanctum(ctx, x, base, hover) {
  const w = 54, L = x - w / 2, h = 50;
  if (hover) { ctx.shadowColor = 'rgba(190,120,255,0.9)'; ctx.shadowBlur = 14; }
  ctx.fillStyle = '#3b3036';
  ctx.fillRect(L, base - h, w, h);
  ctx.shadowBlur = 0;
  texFill(ctx, L, base - h, w, h, 0.8);
  drawBricks(ctx, L, base - h, L + w, base, '#120c10', 0.5);
  ctx.strokeStyle = '#120c10';
  ctx.lineWidth = 1.5;
  ctx.strokeRect(L, base - h, w, h);
  ctx.fillStyle = '#1e1619';
  ctx.beginPath();
  ctx.moveTo(L - 6, base - h);
  ctx.lineTo(L + 8, base - h - 18);
  ctx.lineTo(x - 4, base - h - 12);
  ctx.lineTo(x + 2, base - h - 32);
  ctx.lineTo(x + 8, base - h - 12);
  ctx.lineTo(L + w - 8, base - h - 20);
  ctx.lineTo(L + w + 6, base - h);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  // round rune window
  const pulse = 0.5 + 0.3 * Math.sin(RT * 2.4);
  const g = ctx.createRadialGradient(x, base - 28, 0, x, base - 28, 30);
  g.addColorStop(0, `rgba(176,77,255,${0.45 * pulse + 0.15})`);
  g.addColorStop(1, 'rgba(176,77,255,0)');
  ctx.fillStyle = g;
  ctx.fillRect(x - 30, base - 58, 60, 60);
  ctx.fillStyle = '#7a3ab0';
  ctx.beginPath();
  ctx.arc(x, base - 28, 8, 0, TAU);
  ctx.fill();
  ctx.strokeStyle = '#e0b0ff';
  ctx.lineWidth = 1;
  ctx.beginPath();
  for (let i = 0; i < 5; i++) {
    const a = -Math.PI / 2 + (i * 4 * Math.PI) / 5, b = -Math.PI / 2 + ((i + 1) * 4 * Math.PI) / 5;
    ctx.moveTo(x + Math.cos(a) * 6, base - 28 + Math.sin(a) * 6);
    ctx.lineTo(x + Math.cos(b) * 6, base - 28 + Math.sin(b) * 6);
  }
  ctx.stroke();
  // skull over the door
  ctx.fillStyle = '#bdb5a2';
  ctx.beginPath();
  ctx.arc(x, base - 8, 3.5, 0, TAU);
  ctx.fill();
}

// Ninja Dojo on the rampart: dark timber, a sweeping two-tier roof and a paper screen door.
function drawDojo(ctx, x, base, st, hover) {
  const w = 50, L = x - w / 2, h = 34;
  if (hover) { ctx.shadowColor = 'rgba(230,220,200,0.9)'; ctx.shadowBlur = 14; }
  ctx.fillStyle = '#2e2420';
  ctx.fillRect(L, base - h, w, h);
  ctx.shadowBlur = 0;
  texFill(ctx, L, base - h, w, h, 0.7);
  ctx.strokeStyle = '#140e0c';
  ctx.lineWidth = 1.5;
  ctx.strokeRect(L, base - h, w, h);
  // paper screen door with a lattice
  ctx.fillStyle = '#d8ccb0';
  ctx.fillRect(x - 10, base - 26, 20, 26);
  ctx.strokeStyle = '#3a2a20';
  ctx.lineWidth = 1;
  ctx.beginPath();
  for (const dx of [-5, 0, 5]) { ctx.moveTo(x + dx, base - 26); ctx.lineTo(x + dx, base); }
  for (const dy of [-19, -12, -6]) { ctx.moveTo(x - 10, base + dy); ctx.lineTo(x + 10, base + dy); }
  ctx.stroke();
  // two sweeping roofs, the eaves curling up
  const roof = (y, half, rise) => {
    ctx.beginPath();
    ctx.moveTo(x - half - 6, y - 4);
    ctx.quadraticCurveTo(x - half * 0.5, y, x - half * 0.4, y - rise);
    ctx.lineTo(x + half * 0.4, y - rise);
    ctx.quadraticCurveTo(x + half * 0.5, y, x + half + 6, y - 4);
    ctx.lineTo(x + half, y + 2);
    ctx.lineTo(x - half, y + 2);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
  };
  ctx.fillStyle = '#1a1414';
  ctx.strokeStyle = '#0a0808';
  roof(base - h, w / 2 + 4, 12);
  ctx.fillStyle = '#2a2020';
  ctx.fillRect(x - 12, base - h - 22, 24, 10);
  ctx.fillStyle = '#1a1414';
  roof(base - h - 20, 18, 10);
  // a red sun disc on a banner
  ctx.fillStyle = shade(st.accent, -0.2);
  ctx.fillRect(L + 3, base - h + 4, 7, 14);
  ctx.fillStyle = '#b83a2a';
  ctx.beginPath();
  ctx.arc(L + 6.5, base - h + 10, 2.4, 0, TAU);
  ctx.fill();
}

// Kestrel Aerie on the rampart: a timber launch ramp with a glider wing hanging from a perch.
function drawAerie(ctx, x, base, st, hover) {
  const L = x - 26;
  if (hover) { ctx.shadowColor = 'rgba(200,230,255,0.9)'; ctx.shadowBlur = 14; }
  // the perch tower
  ctx.fillStyle = '#5a4630';
  ctx.fillRect(L, base - 44, 16, 44);
  ctx.shadowBlur = 0;
  texFill(ctx, L, base - 44, 16, 44, 0.6);
  ctx.strokeStyle = '#22180e';
  ctx.lineWidth = 1.5;
  ctx.strokeRect(L, base - 44, 16, 44);
  // launch ramp sloping out toward the gate
  ctx.strokeStyle = '#3a2a1a';
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(L + 8, base - 40);
  ctx.lineTo(x + 30, base - 14);
  ctx.moveTo(x + 6, base - 25);
  ctx.lineTo(x + 6, base);
  ctx.moveTo(x + 22, base - 18);
  ctx.lineTo(x + 22, base);
  ctx.stroke();
  // a spare wing hanging from the perch
  ctx.fillStyle = shade(st.accent, -0.45);
  ctx.strokeStyle = '#1a1612';
  ctx.lineWidth = 1.2;
  ctx.beginPath();
  ctx.moveTo(L + 2, base - 48);
  ctx.quadraticCurveTo(L + 20, base - 66, L + 40, base - 52);
  ctx.quadraticCurveTo(L + 20, base - 54, L + 2, base - 48);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  // wind sock
  ctx.strokeStyle = '#2a1c10';
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(L + 8, base - 44);
  ctx.lineTo(L + 8, base - 70);
  ctx.stroke();
  const flap = Math.sin(RT * 4) * 2;
  ctx.fillStyle = '#c0432f';
  ctx.beginPath();
  ctx.moveTo(L + 8, base - 70);
  ctx.lineTo(L - 6, base - 67 + flap);
  ctx.lineTo(L - 6, base - 62 + flap);
  ctx.lineTo(L + 8, base - 64);
  ctx.closePath();
  ctx.fill();
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
  drawStream(ctx, L, F1, dark);

  // rear tower, sliced open, with a ladder
  const tx1 = 92, tTop = ceilTop - c.towerH;
  ctx.fillStyle = inner;
  ctx.fillRect(L, tTop, tx1 - L, ceilTop - tTop);
  texFill(ctx, L, tTop, tx1 - L, ceilTop - tTop, 0.8);
  drawBricks(ctx, L, tTop, tx1, ceilTop, shade(inner, -0.6), 0.5);
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
  ctx.fillStyle = cutCol;
  for (let x = tx1 + 4; x < F1 - 6; x += 24) {
    ctx.fillRect(x, ceilTop - 14, 14, 14);
    ctx.strokeRect(x, ceilTop - 14, 14, 14);
  }
  // the mages' halls stand on the rampart
  drawChapel(ctx, RAMPART_HALL_X.cleric, ceilTop, st, hoverKey === 'cleric');
  drawSanctum(ctx, RAMPART_HALL_X.warlock, ceilTop, hoverKey === 'warlock');
  drawDojo(ctx, RAMPART_HALL_X.ninja, ceilTop, st, hoverKey === 'ninja');
  drawAerie(ctx, RAMPART_HALL_X.flyer, ceilTop, st, hoverKey === 'flyer');

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

  const base = floorTop + 2;
  drawBarracks(ctx, BUILD_X.sword, base, st, hoverKey === 'sword');
  drawSpearHall(ctx, BUILD_X.spear, base, st, hoverKey === 'spear');
  drawRange(ctx, BUILD_X.archer, base, st, hoverKey === 'archer');
  drawLodge(ctx, BUILD_X.miner, base, hoverKey === 'miner');
  drawGiantPit(ctx, GIANT_PIT_X, LANE_TOP - 6, st, hoverKey === 'giant');
  ctx.restore();

  // research progress above buildings (unmirrored)
  for (const [type, bx] of [...Object.entries(BUILD_X), ...Object.entries(RAMPART_HALL_X), ['castle', 10], ['giant', GIANT_PIT_X]]) {
    const r = team.research[type];
    if (!r) continue;
    const def = UPGRADES[type].find(u => u.key === r.key);
    const y = type === 'castle' ? WALL_TOP - 150 : RAMPART_HALL_X[type] ? WALL_TOP - 78 : type === 'giant' ? LANE_TOP - 120 : floorTop - 128;
    drawResearchBar(ctx, team.id === 0 ? bx : WORLD_W - bx, y, r.t / def.time);
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
  mule: 'bag', diamond: 'pick', gilded: 'tithe',
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
    case 'defense':
      c.fillStyle = '#5a4028'; c.strokeStyle = dark; c.lineWidth = 1.5;
      c.beginPath(); c.moveTo(20, 5); c.lineTo(33, 10); c.lineTo(31, 24); c.quadraticCurveTo(27, 32, 20, 36); c.quadraticCurveTo(13, 32, 9, 24); c.lineTo(7, 10); c.closePath(); c.fill(); c.stroke();
      c.strokeStyle = '#9aa3ad'; c.lineWidth = 2.5; c.beginPath(); c.moveTo(13, 27); c.lineTo(27, 13); c.moveTo(13, 13); c.lineTo(27, 27); c.stroke();
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
    case 'c_speed':
      c.strokeStyle = '#e8e0c0'; c.lineWidth = 2;
      for (const y of [12, 20, 28]) { c.beginPath(); c.moveTo(6, y); c.lineTo(22, y); c.stroke(); }
      c.fillStyle = '#e8e0c0'; c.beginPath(); c.moveTo(24, 8); c.quadraticCurveTo(38, 20, 24, 32); c.lineTo(28, 20); c.closePath(); c.fill();
      break;
    case 'w_speed':
      c.strokeStyle = '#8a7a9a'; c.lineWidth = 2.6;
      for (let i = 0; i < 4; i++) { c.beginPath(); c.ellipse(9 + i * 7.5, 20, 4.5, 3, 0, 0, TAU); c.stroke(); }
      c.strokeStyle = '#c070ff'; c.lineWidth = 1.6;
      c.beginPath(); c.moveTo(14, 6); c.lineTo(26, 6); c.lineTo(14, 34); c.lineTo(26, 34); c.closePath(); c.stroke();
      break;
    case 'c_might':
      c.fillStyle = 'rgba(242,220,138,0.35)'; c.beginPath(); c.arc(20, 14, 12, 0, TAU); c.fill();
      c.strokeStyle = '#d9dee3'; c.lineWidth = 3; c.beginPath(); c.moveTo(20, 36); c.lineTo(20, 6); c.stroke();
      c.strokeStyle = gold; c.lineWidth = 3; c.beginPath(); c.moveTo(13, 28); c.lineTo(27, 28); c.stroke();
      c.strokeStyle = '#f2dc8a'; c.lineWidth = 1.6; c.beginPath(); c.moveTo(8, 12); c.lineTo(12, 8); c.lineTo(16, 12); c.moveTo(24, 12); c.lineTo(28, 8); c.lineTo(32, 12); c.stroke();
      break;
    case 'w_might':
      c.strokeStyle = '#8a8d90'; c.lineWidth = 3;
      c.beginPath(); c.moveTo(10, 8); c.lineTo(18, 20); c.moveTo(21, 23); c.lineTo(28, 34); c.stroke();
      c.strokeStyle = '#c070ff'; c.lineWidth = 1.6;
      c.beginPath(); c.moveTo(26, 6); c.lineTo(30, 12); c.lineTo(34, 6); c.moveTo(26, 14); c.lineTo(30, 20); c.lineTo(34, 14); c.stroke();
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
