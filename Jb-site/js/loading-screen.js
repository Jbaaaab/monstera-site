/* =========================
   Loading Screen
   — Shows immediately on every page load
   — Fake-but-convincing progress (eases to ~85%, jumps to 100% on window.load)
   — Minimum display of 1 200ms so the animation is always seen
   — Green panel slides out to the right on exit
   ========================= */
(() => {
  'use strict';

  const GREEN        = [0x41, 0xF3, 0x73]; // #41F373
  const WHITE        = [255, 255, 255];
  const MIN_DISPLAY  = 1200;               // ms — always shown at least this long
  const FAKE_TARGET  = 85;                 // % to ease toward while loading
  const LERP_FAKE    = 0.028;             // speed while loading  (slow, convincing)
  const LERP_FINISH  = 0.11;              // speed after load     (quick sweep to 100)

  const inWork   = /\/work\//.test(location.pathname);
  const imgBase  = inWork ? '../assets/Img/' : 'assets/Img/';

  let loaderEl    = null;
  let percentEl   = null;
  let displayed   = 0;       // currently rendered progress value
  let pageLoaded  = false;   // true when window.load has fired
  let minTimeDone = false;   // true after MIN_DISPLAY ms
  let rafId       = null;

  /* ---------- helpers ---------- */
  function lerp(a, b, t) { return a + (b - a) * t; }

  function colorAt(t) {
    const r = Math.round(lerp(WHITE[0], GREEN[0], t));
    const g = Math.round(lerp(WHITE[1], GREEN[1], t));
    const b = Math.round(lerp(WHITE[2], GREEN[2], t));
    return 'rgb(' + r + ',' + g + ',' + b + ')';
  }

  /* ---------- DOM ---------- */
  function buildLoader() {
    loaderEl = document.createElement('div');
    loaderEl.id = 'jb-loader';
    loaderEl.setAttribute('aria-hidden', 'true');

    const img = document.createElement('img');
    img.className  = 'jb-loader-pastille';
    img.src        = imgBase + 'PASTILLE CHARGEMENT.png';
    img.alt        = '';
    img.draggable  = false;

    percentEl = document.createElement('div');
    percentEl.className   = 'jb-loader-percent';
    percentEl.textContent = '0%';

    loaderEl.appendChild(img);
    loaderEl.appendChild(percentEl);
    document.body.prepend(loaderEl);
  }

  /* ---------- render ---------- */
  function render(pct) {
    if (!loaderEl) return;
    loaderEl.style.backgroundColor = colorAt(pct / 100);
    percentEl.textContent = Math.floor(pct) + '%';
  }

  /* ---------- exit ---------- */
  function exit() {
    if (!loaderEl) return;
    render(100);
    // Brief pause at 100% so the user sees the full green screen
    setTimeout(function () {
      if (!loaderEl) return;
      loaderEl.classList.add('is-exiting');
      // Cleanup after the CSS transition finishes
      var cleanup = function () {
        if (loaderEl) { loaderEl.remove(); loaderEl = null; }
      };
      loaderEl.addEventListener('transitionend', cleanup, { once: true });
      // Safety fallback if transitionend doesn't fire
      setTimeout(cleanup, 1100);
    }, 250);
  }

  /* ---------- animation loop ---------- */
  function tick() {
    var target = pageLoaded ? 100 : FAKE_TARGET;
    var speed  = pageLoaded ? LERP_FINISH : LERP_FAKE;

    displayed += (target - displayed) * speed;

    // Clamp floating-point drift
    if (displayed > 99.6 && pageLoaded) {
      displayed = 100;
      render(100);
      cancelAnimationFrame(rafId);
      if (minTimeDone) { exit(); } else { /* wait for timer */ }
      return;
    }

    render(displayed);
    rafId = requestAnimationFrame(tick);
  }

  /* ---------- boot ---------- */
  function start() {
    buildLoader();
    render(0);
    rafId = requestAnimationFrame(tick);

    // Minimum display timer
    setTimeout(function () {
      minTimeDone = true;
      // If progress has already hit 100 (fast page + fast animation), exit now
      if (displayed >= 100) exit();
    }, MIN_DISPLAY);

    // Real load event
    window.addEventListener('load', function () {
      pageLoaded = true;
      // RAF loop will pick up the new target on its next frame
    }, { once: true });
  }

  // Inject as soon as <body> exists (DOMContentLoaded fires after HTML parse, ~10-30ms)
  if (document.body) {
    start();
  } else {
    document.addEventListener('DOMContentLoaded', start);
  }

})();
