'use strict';
// Gladiators: a javelin and a net to throw (one of each, until they garrison or a Quartermaster
// brings new ones), and a short sword for the rest. Every kill makes one tougher and deadlier, and
// it hits harder the fewer friends are near it. They never march in formation: they run ahead.

const gladiatorMul = u => (1 + GLADIATOR.killDmg * (u.kills || 0)) * (1 + GLADIATOR.alonePer * Math.max(0, GLADIATOR.aloneN - (u.friendsNear || 0)));

// Throws: the javelin at a flyer if one is in reach (it's how Gladiators answer the sky), otherwise
// at an enemy closing in; the net at the nearest enemy fighter about to reach it (giants are too
// big to pin). Garrisoning restocks both.
function updateGladiatorGear(u) {
  if (u.inside) { u.javelin = 1; u.net = 1; return; }
  if (u.swing >= 0 || u.stunT > 0 || u.netT > 0) return;
  if (u.javelin) {
    let best = null, bd = JAVELIN.range, air = false;
    for (const e of G.units) {
      if (e.team === u.team || e.dead || e.inside || e.stealth || isWorker(e)) continue;
      const d = Math.abs(e.x - u.x) + Math.abs(e.y - u.y) * 0.5, fly = isFlying(e);
      if (!fly && d < 110) continue;   // too close to bother: the sword will do
      if ((fly && !air) || (fly === air && d < bd)) { best = e; bd = d; air = fly; }
    }
    if (best && (air || bd < JAVELIN.range * 0.8)) {
      u.javelin = 0;
      u.facing = best.x >= u.x ? 1 : -1;
      fireArrow(u.team, u.x + u.facing * 8, u.y - 56 * u.scale, best, JAVELIN.dmg * dmgMult(u), u, false, { kind: 'javelin' });
      return;
    }
  }
  if (u.net) {
    let best = null, bd = GLADIATOR.netRange;
    for (const e of G.units) {
      if (e.team === u.team || e.dead || e.inside || e.stealth || isWorker(e) || isGiant(e) || isFlying(e) || e.netT > 0) continue;
      const d = Math.abs(e.x - u.x) + Math.abs(e.y - u.y) * 0.5;
      if (d > 40 && d < bd) { best = e; bd = d; }
    }
    if (best) {
      u.net = 0;
      u.facing = best.x >= u.x ? 1 : -1;
      fireArrow(u.team, u.x + u.facing * 8, u.y - 44 * u.scale, best, 0, u, false, { kind: 'net', net: u.perks.nets ? GLADIATOR.netTimeWeighted : GLADIATOR.netTime });
    }
  }
}

// A kill feeds the Gladiator: more health (healed by as much) and a little more damage.
function gladiatorKill(u) {
  const before = u.kills || 0;
  u.kills = Math.min(GLADIATOR.maxKills, before + (u.perks.fame ? 2 : 1));
  const gained = u.kills - before;
  if (!gained) return;
  applyPerks(u);
  u.hp = Math.min(u.maxHp, u.hp + GLADIATOR.killHp * gained);
  if (u.team === 0) floatText(u.x, u.y - 84, `Glory ×${u.kills}`, '#e0bf5a');
  // a warning when the enemy's Gladiator gets out of hand: deal with it before it snowballs
  else if (u.kills >= 6 && Math.floor(before / 6) < Math.floor(u.kills / 6)) toast(`An enemy Gladiator is on a rampage (glory ×${u.kills}): focus it down!`, 'warn');
}
