'use strict';
// Boot + main loop.

(function boot() {
  const ctx = $('cv').getContext('2d');
  buildTextures();
  newGame(randomSeed());
  resize();
  window.addEventListener('resize', resize);
  initInput();
  buildHUD();
  showMainMenu();

  let last = performance.now();
  function frame(now) {
    const dt = Math.min(0.05, (now - last) / 1000);
    last = now;
    RT += dt;
    try {
      if (G.state !== 'title' && !G.paused) {
        for (let i = 0; i < G.speed; i++) update(dt);
        if (G.over && G.state === 'play' && G.overT > 2.5) showEnd();
      }
      updateCamera(dt);
      audioTick(dt);
      clampCam();
      updateWeather(dt, VIEW.w);
      render(ctx);
      if (G.state !== 'title') updateHUD(dt);
      if (G.state === 'play') updateDebug(dt);
    } catch (err) {
      console.error(err);
    }
    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);
})();
