(function () {
  'use strict';

  /* ── constants ── */
  var GREEN      = [0x41, 0xF3, 0x73];
  var WHITE      = [255, 255, 255];
  var MIN_MS     = 1500;   /* heavy: always shown at least this long        */
  var PHASE1_MS  = 1800;   /* fake progress: 0 → 80 % over this duration   */
  var PHASE1_MAX = 80;     /* % ceiling during fake phase                   */
  var DRIFT      = 0.004;  /* extra % / ms after PHASE1 while still loading */
  var LERP_DONE  = 0.18;   /* sweep speed once window.load fires            */

  /* ── read page flags ── */
  var loaderAttr     = document.documentElement.getAttribute('data-loader');
  var isHeavy        = loaderAttr === 'heavy';
  var isAlways       = loaderAttr === 'always'; /* show on first direct visit; skip on back/forward */
  var fromTransition = sessionStorage.getItem('jb-pt') === '1';
  var visitKey       = 'jb-v:' + location.pathname;
  var wasVisited     = !!localStorage.getItem(visitKey);

  /* Clear transition flag immediately (always, regardless of mode) */
  if (fromTransition) sessionStorage.removeItem('jb-pt');

  /* ── back / forward nav detection ──────────────────────────
     Both the legacy API (type===2) and the modern Navigation
     Timing API are checked for cross-browser coverage.        */
  var navEntry      = performance && performance.getEntriesByType &&
                      performance.getEntriesByType('navigation')[0];
  var isBackForward = navEntry
    ? navEntry.type === 'back_forward'
    : !!(performance.navigation && performance.navigation.type === 2);

  /* ── bfcache restore: clean up any frozen loading overlay ──
     When the browser restores a page from the back-forward
     cache, pageshow fires with persisted=true.  Any in-flight
     loader (green screen) or transition strips must be removed
     so the page appears immediately.                          */
  window.addEventListener('pageshow', function (e) {
    if (!e.persisted) return;
    var loader = document.getElementById('jb-loader');
    if (loader) loader.remove();
    var strips = document.getElementById('jb-pt');
    if (strips) strips.remove();
    document.documentElement.classList.remove('jb-loading');
  });

  /* ── decide mode ──────────────────────────────────────────
     fromTransition → curtain ALWAYS (prevents double animation)
     back/forward nav → none (page already seen; no green flash)
     always/heavy + first direct visit → full loading screen
     everything else → nothing                                */
  var mode;
  if (fromTransition) {
    mode = 'curtain';
  } else if (isBackForward) {
    mode = 'none';
  } else if (isAlways || (!wasVisited && isHeavy)) {
    mode = 'heavy';
  } else {
    mode = 'none';
  }

  if (mode === 'none') return;

  /* ── INSTANT HIDE ──────────────────────────────────────────
     Runs synchronously in <head> before any <body> is parsed.
     Browser never paints a raw frame of content.             */
  document.documentElement.classList.add('jb-loading');

  /* ── helpers ── */
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

  /* ── strip builder (curtain mode) ── */
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

  /* ═══════════════════════════════════
     HEAVY MODE — full loading screen
     ═══════════════════════════════════ */
  function startHeavy() {
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

    document.documentElement.classList.remove('jb-loading');

    var startTime  = performance.now();
    var displayed  = 0;
    var pageLoaded = false;
    var minDone    = false;
    var rafId      = null;

    /* sqrt-ease: fast at start, slows near PHASE1_MAX, then slow drift */
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
      /* Mark page as visited so future navigations use curtain only */
      try { localStorage.setItem(visitKey, '1'); } catch (e) {}
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

    window.addEventListener('load', function () { pageLoaded = true; }, { once: true });
  }

  /* ═══════════════════════════════════
     CURTAIN MODE — quick reveal
     (light pages from link, OR heavy pages already cached)
     ═══════════════════════════════════ */
  function startCurtain() {
    /* Mark as visited so future direct/back navigations skip heavy loader */
    try { localStorage.setItem(visitKey, '1'); } catch (e) {}
    var wrap = buildStrips('enter');
    document.documentElement.classList.remove('jb-loading');

    /* Double rAF: ensure strips are painted at translateX(0) before reveal */
    requestAnimationFrame(function () {
      requestAnimationFrame(function () {
        wrap.classList.add('is-revealing');
        /* 480ms strip + 60ms × 2 stagger = 600ms total */
        setTimeout(function () { wrap.remove(); }, 650);
      });
    });
  }

  /* ── boot ── */
  function boot() {
    if (mode === 'heavy') startHeavy();
    else                  startCurtain();
  }

  if (document.body) { boot(); }
  else { document.addEventListener('DOMContentLoaded', boot); }

}());
