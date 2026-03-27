/* =========================
   Page Transition — exit only
   On every internal link click, 3 horizontal strips wipe in from the left,
   covering the current page, then navigation fires.
   The enter reveal is handled by loading-screen.js on the next page.
   ========================= */
(() => {
  'use strict';

  const STRIP_COUNT  = 3;
  const STRIP_MS     = 480;  // duration per strip
  const STAGGER_MS   = 65;   // delay between strips
  const TOTAL_MS     = STRIP_MS + STAGGER_MS * (STRIP_COUNT - 1); // ~610ms

  /* ---- helpers ---- */
  function isTransitionable(a) {
    if (!a || !a.href)                                   return false;
    if (a.target === '_blank')                           return false;
    if (a.hasAttribute('download'))                      return false;
    // External host
    try { if (new URL(a.href).hostname !== location.hostname) return false; }
    catch (_) { return false; }
    // Same page anchor only
    if (a.pathname === location.pathname && a.hash)      return false;
    // Already on this exact URL
    if (a.href === location.href)                        return false;
    return true;
  }

  /* ---- build overlay ---- */
  function buildOverlay() {
    // Remove stale overlay if any
    var old = document.getElementById('jb-pt');
    if (old) old.remove();

    var wrap = document.createElement('div');
    wrap.id = 'jb-pt';

    for (var i = 0; i < STRIP_COUNT; i++) {
      var strip = document.createElement('div');
      strip.className = 'jb-pt-strip';
      strip.style.setProperty('--i', i);
      wrap.appendChild(strip);
    }

    document.body.appendChild(wrap);
    return wrap;
  }

  /* ---- run cover animation, then call onDone ---- */
  function cover(onDone) {
    var wrap = buildOverlay();

    // Double rAF to ensure paint before transition kicks in
    requestAnimationFrame(function () {
      requestAnimationFrame(function () {
        wrap.classList.add('is-covering');
        setTimeout(onDone, TOTAL_MS);
      });
    });
  }

  /* ---- intercept clicks ---- */
  document.addEventListener('click', function (e) {
    // Let modifier-key clicks (new tab etc.) pass through
    if (e.ctrlKey || e.metaKey || e.shiftKey || e.altKey) return;

    var a = e.target.closest('a[href]');
    if (!isTransitionable(a)) return;

    e.preventDefault();
    var href = a.href; // resolved absolute URL

    cover(function () {
      window.location.href = href;
    });
  });

})();
