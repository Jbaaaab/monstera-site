/* =========================
   Loading Screen + Page-enter transition
   ─────────────────────────────────────────
   Heavy pages  (data-loader="heavy" on <html>)
     → Full loader: white→green background, spinning pastille, counter 0→100%
     → Exits: single panel slides right
   Light pages coming from a link click  (sessionStorage jb-pt=1)
     → Quick enter curtain: 3 strips already covering, slide out to reveal
   Light pages opened directly
     → Nothing (fast page, no need)
   ─────────────────────────────────────────
   INSTANT HIDE: adds .jb-loading to <html> synchronously the moment this
   script runs (before <body> exists), so the browser never paints raw content.
   ========================= */
(function () {
  'use strict';

  /* ─── constants ─── */
  var GREEN       = [0x41, 0xF3, 0x73];
  var WHITE       = [255, 255, 255];
  var MIN_MS      = 1500;    // heavy pages: always shown this long
  var PHASE1_MS   = 1800;    // fake progress: 0→80 % over this duration
  var PHASE1_MAX  = 80;      // % ceiling during fake phase
  var DRIFT       = 0.004;   // extra %/ms after PHASE1 while still loading
  var LERP_DONE   = 0.18;    // sweep speed once page has loaded

  /* ─── decide mode ─── */
  var isHeavy        = document.documentElement.getAttribute('data-loader') === 'heavy';
  var fromTransition = sessionStorage.getItem('jb-pt') === '1';
  if (fromTransition) sessionStorage.removeItem('jb-pt');

  var mode = isHeavy ? 'heavy' : (fromTransition ? 'curtain' : 'none');
  if (mode === 'none') return;   // light page, direct nav → nothing to do

  /* ─── INSTANT HIDE ─── */
  /* This runs synchronously in <head> before any <body> is parsed,
     so the browser won't paint a single frame of bare content.       */
  document.documentElement.classList.add('jb-loading');

  /* ─── shared helpers ─── */
  var inWork  = /\/work\//.test(location.pathname);
  var imgBase = inWork ? '../assets/Img/' : 'assets/Img/';

  function lerp(a, b, t) { return a + (b - a) * t; }

  function colorAt(pct) {
    var t = pct / 100;
    return 'rgb(' +
      Math.round(lerp(WHITE[0], GREEN[0], t)) + ',' +
      Math.round(lerp(WHITE[1], GREEN[1], t)) + ',' +
      Math.round(lerp(WHITE[2], GREEN[2], t)) + ')';
  }

  /* ─── strip builder (shared by both modes) ─── */
  function buildStrips(dataMode) {
    var old = document.getElementById('jb-pt');
    if (old) old.remove();
    var wrap = document.createElement('div');
    wrap.id = 'jb-pt';
    wrap.setAttribute('data-mode', dataMode);
    for (var i = 0; i < 3; i++) {
      var s = document.createElement('div');
      s.className = 'jb-pt-strip';
      s.style.setProperty('--i', i);
      wrap.appendChild(s);
    }
    document.body.prepend(wrap);
    return wrap;
  }

  /* ═══════════════════════════════════════
     HEAVY MODE
     ═══════════════════════════════════════ */
  function startHeavy() {
    /* build loader panel */
    var loaderEl = document.createElement('div');
    loaderEl.id = 'jb-loader';
    loaderEl.setAttribute('aria-hidden', 'true');

    var img = document.createElement('img');
    img.className = 'jb-loader-pastille';
    img.src       = imgBase + 'PASTILLE CHARGEMENT.png';
    img.alt       = '';
    img.draggable = false;

    var pctEl = document.createElement('div');
    pctEl.className   = 'jb-loader-percent';
    pctEl.textContent = '0%';

    loaderEl.appendChild(img);
    loaderEl.appendChild(pctEl);
    document.body.prepend(loaderEl);

    /* un-hide body — loader covers everything */
    document.documentElement.classList.remove('jb-loading');

    /* ── progress animation ── */
    var startTime  = performance.now();
    var displayed  = 0;
    var pageLoaded = false;
    var minDone    = false;
    var rafId      = null;

    /* time-based fake progress: sqrt ease 0→80 % over PHASE1_MS,
       then slow drift, then LERP sweep to 100 when actually loaded */
    function fakeAt(now) {
      var elapsed = now - startTime;
      if (elapsed < PHASE1_MS) {
        return Math.sqrt(elapsed / PHASE1_MS) * PHASE1_MAX;
      }
      return Math.min(PHASE1_MAX + (elapsed - PHASE1_MS) * DRIFT, 95);
    }

    function render(pct) {
      loaderEl.style.backgroundColor = colorAt(pct);
      pctEl.textContent = Math.floor(pct) + '%';
    }

    function doExit() {
      render(100);
      setTimeout(function () {
        loaderEl.classList.add('is-exiting');
        var cleanup = function () { if (loaderEl) loaderEl.remove(); };
        loaderEl.addEventListener('transitionend', cleanup, { once: true });
        setTimeout(cleanup, 1100);
      }, 250);
    }

    function tick(now) {
      if (pageLoaded) {
        displayed += (100 - displayed) * LERP_DONE;
        if (displayed >= 99.5) {
          displayed = 100;
          render(100);
          cancelAnimationFrame(rafId);
          if (minDone) doExit();
          /* else: wait for MIN_MS timer */
          return;
        }
      } else {
        displayed = fakeAt(now);
      }
      render(displayed);
      rafId = requestAnimationFrame(tick);
    }

    rafId = requestAnimationFrame(tick);

    setTimeout(function () {
      minDone = true;
      if (displayed >= 100) doExit();
    }, MIN_MS);

    window.addEventListener('load', function () {
      pageLoaded = true;
    }, { once: true });
  }

  /* ═══════════════════════════════════════
     CURTAIN MODE  (light page, from link)
     ═══════════════════════════════════════ */
  function startCurtain() {
    var wrap = buildStrips('enter');

    /* un-hide body — strips cover everything */
    document.documentElement.classList.remove('jb-loading');

    /* double-rAF: ensure strips are painted at translateX(0) first */
    requestAnimationFrame(function () {
      requestAnimationFrame(function () {
        wrap.classList.add('is-revealing');
        var totalMs = 480 + 60 * 2; /* = 600ms */
        setTimeout(function () { wrap.remove(); }, totalMs + 50);
      });
    });
  }

  /* ─── boot (wait for <body>) ─── */
  function boot() {
    if (mode === 'heavy')   startHeavy();
    else                    startCurtain();
  }

  if (document.body) {
    boot();
  } else {
    document.addEventListener('DOMContentLoaded', boot);
  }

}());
