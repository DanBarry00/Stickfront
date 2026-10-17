'use strict';
// Dev helper for art work: draws units large on an overlay canvas so their art can be checked.
// Load from the console on the game page: const s = document.createElement('script'); s.src = 'art/showcase.js'; document.body.appendChild(s);
window.sheet = (items, opts = {}) => {
  document.getElementById('sheet')?.remove();
  const W = opts.w || 780, H = opts.h || 330, k = opts.k || 1;
  const cv = document.createElement('canvas');
  cv.id = 'sheet'; cv.width = W; cv.height = H;
  Object.assign(cv.style, { position: 'fixed', left: '10px', top: '10px', zIndex: 99999, border: '2px solid #222', width: 'calc(100vw - 24px)', height: 'auto' });
  document.body.appendChild(cv);
  const c = cv.getContext('2d');
  c.fillStyle = opts.bg || '#b59a72'; c.fillRect(0, 0, W, H);
  c.fillStyle = 'rgba(0,0,0,0.15)'; c.fillRect(0, H * 0.78, W, H * 0.22);
  c.save(); c.scale(k, k);
  for (const it of items) drawStickman(c, { team: 0, facing: 1, walk: 0, moving: false, swing: -1, flash: 0, seed: 3, perks: {}, scale: 1, ...it, y: (it.y || H * 0.8) / k });
  c.restore();
  return 'ok';
};
window.hideUI = on => {
  document.getElementById('hideui')?.remove();
  if (!on) return;
  const s = document.createElement('style');
  s.id = 'hideui';
  s.textContent = '#hud, #debug, #tip, #pauseMenu, #overlay, #help { visibility: hidden !important; }';
  document.head.appendChild(s);
};
