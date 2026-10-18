'use strict';
// Drawing for spells: pools on the ground, fireballs, bolts, beams, blasts, and spell effects on units.

const POOL_STYLE = {
  healpool: { fill: [200, 220, 120], edge: '#f2dc8a', mote: '#e8f0a0' },
  blight: { fill: [110, 40, 140], edge: '#c070ff', mote: '#9a5ac0' },
};

function drawPools(ctx, x0, x1) {
  for (const p of G.pools) {
    if (p.x + p.r < x0 || p.x - p.r > x1) continue;
    const st = POOL_STYLE[p.kind];
    const life = Math.min(1, p.t / 0.6, (p.dur - p.t) / 0.3 + 0.2);
    const [r, g, b] = st.fill;
    const grad = ctx.createRadialGradient(p.x, p.y, 4, p.x, p.y, p.r);
    grad.addColorStop(0, `rgba(${r},${g},${b},${0.45 * life})`);
    grad.addColorStop(1, `rgba(${r},${g},${b},${0.08 * life})`);
    ctx.fillStyle = grad;
    ellipse(ctx, p.x, p.y, p.r, 50);
    ctx.fill();
    ctx.strokeStyle = st.edge;
    ctx.globalAlpha = 0.6 * life;
    ctx.lineWidth = 1.5;
    ctx.setLineDash([8, 6]);
    ctx.lineDashOffset = -RT * 20;
    ellipse(ctx, p.x, p.y, p.r, 50);
    ctx.stroke();
    ctx.setLineDash([]);
    // rising motes (light for the healing pool, rot for the blight)
    ctx.fillStyle = st.mote;
    for (let i = 0; i < 10; i++) {
      const k = (RT * 0.6 + i / 10 + p.seed) % 1;
      const a = i * 2.4 + p.seed;
      const mx = p.x + Math.cos(a) * p.r * 0.75 * ((i % 3) / 3 + 0.3);
      const my = p.y + Math.sin(a) * 34 - k * 60;
      ctx.globalAlpha = life * (1 - k) * 0.9;
      ctx.beginPath();
      ctx.arc(mx, my, p.kind === 'blight' ? 2.2 : 1.6, 0, TAU);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
  }
}

function drawSpellShots(ctx) {
  for (const s of G.spellShots) {
    if (s.kind === 'fireball') {
      const g = ctx.createRadialGradient(s.x, s.y, 2, s.x, s.y, 22);
      g.addColorStop(0, 'rgba(255,240,180,1)');
      g.addColorStop(0.35, 'rgba(255,150,50,0.9)');
      g.addColorStop(1, 'rgba(200,60,10,0)');
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.arc(s.x, s.y, 22, 0, TAU);
      ctx.fill();
      // where it will land
      ctx.strokeStyle = 'rgba(255,120,40,0.5)';
      ctx.lineWidth = 1.5;
      ellipse(ctx, s.tx, s.ty + 20, SPELLS.fireball.r * (s.t / s.T), 40 * (s.t / s.T));
      ctx.stroke();
    } else {
      const g = ctx.createRadialGradient(s.x, s.y, 0, s.x, s.y, 9);
      g.addColorStop(0, 'rgba(240,200,255,1)');
      g.addColorStop(0.5, 'rgba(176,77,255,0.8)');
      g.addColorStop(1, 'rgba(120,30,200,0)');
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.arc(s.x, s.y, 9, 0, TAU);
      ctx.fill();
    }
  }
  for (const f of G.spellFx) {
    const k = f.t / f.max;
    if (f.kind === 'beam') {
      ctx.strokeStyle = rgba(f.color, 0.7 * (1 - k));
      ctx.lineWidth = 3 * (1 - k) + 1;
      ctx.beginPath();
      ctx.moveTo(f.x1, f.y1);
      ctx.quadraticCurveTo((f.x1 + f.x2) / 2, Math.min(f.y1, f.y2) - 20, f.x2, f.y2);
      ctx.stroke();
    } else if (f.kind === 'ring') {
      ctx.strokeStyle = rgba(f.color, 0.8 * (1 - k));
      ctx.lineWidth = 3;
      ellipse(ctx, f.x, f.y, f.r * (0.3 + 0.7 * k), 50 * (0.3 + 0.7 * k));
      ctx.stroke();
    } else if (f.kind === 'blast') {
      const g = ctx.createRadialGradient(f.x, f.y - 20, 4, f.x, f.y - 20, f.r * (0.6 + k));
      g.addColorStop(0, `rgba(255,220,140,${0.8 * (1 - k)})`);
      g.addColorStop(1, 'rgba(220,80,20,0)');
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.arc(f.x, f.y - 20, f.r * (0.6 + k), 0, TAU);
      ctx.fill();
    }
  }
}

// Under the unit: Sanctuary bubble glow, the Cleric's quickening wind / the Warlock's slowing chains at the feet.
function drawSpellEffectsUnder(ctx, u) {
  const fx = u.fx, s = u.scale;
  if (fx.haste > 0) {
    ctx.strokeStyle = 'rgba(230,240,255,0.55)';
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    for (let i = 0; i < 3; i++) {
      const off = ((RT * 60 + i * 9) % 26);
      ctx.moveTo(u.x - u.facing * (10 + off), u.y - 8 - i * 9);
      ctx.lineTo(u.x - u.facing * (18 + off), u.y - 8 - i * 9);
    }
    ctx.stroke();
  }
  if (fx.slow > 0) {
    ctx.strokeStyle = 'rgba(150,110,180,0.85)';
    ctx.lineWidth = 1.6;
    for (let i = -1; i <= 1; i += 2) {
      ctx.beginPath();
      ctx.ellipse(u.x + i * 5, u.y - 3, 4, 2.5, 0, 0, TAU);
      ctx.stroke();
    }
  }
  if (fx.shield > 0) {
    const a = Math.min(1, fx.shield / 30) * (0.5 + 0.15 * Math.sin(RT * 4 + u.seed));
    ctx.strokeStyle = `rgba(240,230,180,${a})`;
    ctx.fillStyle = `rgba(240,230,180,${a * 0.18})`;
    ctx.lineWidth = 1.5;
    ellipse(ctx, u.x, u.y - 36 * s, 20 * s, 42 * s);
    ctx.fill();
    ctx.stroke();
  }
}

// Above the unit: blessing / enfeeble arrows.
function drawSpellEffectsOver(ctx, u) {
  const top = u.y - 92 * u.scale, fx = u.fx;
  if (fx.empower > 0) {
    ctx.strokeStyle = '#f2c95a';
    ctx.lineWidth = 1.8;
    ctx.beginPath();
    ctx.moveTo(u.x + 12, top + 14);
    ctx.lineTo(u.x + 12, top + 4);
    ctx.moveTo(u.x + 8, top + 8);
    ctx.lineTo(u.x + 12, top + 4);
    ctx.lineTo(u.x + 16, top + 8);
    ctx.stroke();
  }
  if (fx.enfeeble > 0) {
    ctx.strokeStyle = '#b070e0';
    ctx.lineWidth = 1.8;
    ctx.beginPath();
    ctx.moveTo(u.x - 12, top + 4);
    ctx.lineTo(u.x - 12, top + 14);
    ctx.moveTo(u.x - 16, top + 10);
    ctx.lineTo(u.x - 12, top + 14);
    ctx.lineTo(u.x - 8, top + 10);
    ctx.stroke();
  }
}

// Targeting circle while the player chooses where to cast.
function drawSpellTarget(ctx, k, x, y) {
  const S = SPELLS[k], mine = S.owner === 'cleric';
  const casters = liveSel().filter(u => u.type === S.owner && u.perks[S.perk]);
  const near = casters.some(u => Math.abs(u.x - x) <= S.range);
  ctx.strokeStyle = mine ? 'rgba(242,220,138,0.85)' : 'rgba(192,112,255,0.85)';
  ctx.fillStyle = mine ? 'rgba(242,220,138,0.12)' : 'rgba(192,112,255,0.12)';
  ctx.lineWidth = 2;
  ctx.setLineDash([6, 5]);
  ellipse(ctx, x, clamp(y, LANE_TOP, LANE_BOT), S.r, 50);
  ctx.fill();
  ctx.stroke();
  ctx.setLineDash([]);
  ctx.font = '600 13px "Segoe UI", sans-serif';
  ctx.textAlign = 'center';
  ctx.fillStyle = '#e6d6aa';
  ctx.fillText(`${S.name} — ${S.mana} mana${near ? '' : ' (caster will walk into range)'}`, x, LANE_TOP - 80);
}

// Stunned: stars circling the head. Confused giant: a spinning question mark.
function drawStatusOver(ctx, u) {
  const top = u.y - 90 * u.scale;
  if (u.stunT > 0) {
    ctx.fillStyle = '#f2dc8a';
    for (let i = 0; i < 3; i++) {
      const a = RT * 5 + (i * TAU) / 3;
      const x = u.x + Math.cos(a) * 10 * Math.min(u.scale, 1.6), y = top + 18 + Math.sin(a) * 3;
      ctx.beginPath();
      for (let k = 0; k < 10; k++) {
        const b = (k / 10) * TAU, r = k % 2 ? 1.2 : 3;
        ctx.lineTo(x + Math.cos(b) * r, y + Math.sin(b) * r);
      }
      ctx.closePath();
      ctx.fill();
    }
  }
  if (u.confusedT > 0) {
    ctx.save();
    ctx.translate(u.x, top - 4);
    ctx.rotate(Math.sin(RT * 6) * 0.4);
    ctx.font = '700 18px Georgia, serif';
    ctx.textAlign = 'center';
    ctx.fillStyle = '#e0bf5a';
    ctx.fillText('?', 0, 0);
    ctx.restore();
  }
}
