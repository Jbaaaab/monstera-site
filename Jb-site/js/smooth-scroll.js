/* =========================
   Smooth scroll with inertia
   Lerp-based, no dependencies
   ========================= */
(function () {
  // Respect reduced-motion preference
  if (matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  // Touch/stylus devices: let native scroll handle it
  if (!matchMedia('(pointer: fine)').matches) return;

  // Disable CSS smooth scroll to avoid double-smoothing
  document.documentElement.style.scrollBehavior = 'auto';

  let targetY  = window.scrollY;
  let currentY = window.scrollY;
  let raf      = null;

  // Inertia factor — lower = more lag/inertia (0.06–0.12 is a good range)
  const FRICTION = 0.09;

  /* ---- helpers ---- */
  function lerp(a, b, t) { return a + (b - a) * t; }
  function clamp(v, min, max) { return Math.max(min, Math.min(max, v)); }
  function maxScroll() {
    return Math.max(0, document.documentElement.scrollHeight - window.innerHeight);
  }

  /* ---- normalize wheel delta (pixels / lines / pages) ---- */
  function normalizeDelta(e) {
    if (e.deltaMode === 1) return e.deltaY * 40;               // lines → px
    if (e.deltaMode === 2) return e.deltaY * window.innerHeight; // pages → px
    return e.deltaY;                                            // already px
  }

  /* ---- animation loop ---- */
  function loop() {
    currentY = lerp(currentY, targetY, FRICTION);

    if (Math.abs(targetY - currentY) < 0.5) {
      currentY = targetY;
      window.scrollTo(0, currentY);
      raf = null;
      return;
    }

    window.scrollTo(0, currentY);
    raf = requestAnimationFrame(loop);
  }

  function kick() {
    if (!raf) raf = requestAnimationFrame(loop);
  }

  /* ---- mouse wheel ---- */
  window.addEventListener('wheel', function (e) {
    // Let the browser handle zooming (ctrl+wheel)
    if (e.ctrlKey) return;
    e.preventDefault();
    targetY = clamp(targetY + normalizeDelta(e), 0, maxScroll());
    kick();
  }, { passive: false });

  /* ---- keyboard ---- */
  const KEY_LINE = 120;
  window.addEventListener('keydown', function (e) {
    // Don't intercept when focus is inside an input/textarea
    const tag = document.activeElement && document.activeElement.tagName;
    if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;

    let delta = 0;
    switch (e.key) {
      case 'ArrowDown':  delta = KEY_LINE; break;
      case 'ArrowUp':    delta = -KEY_LINE; break;
      case 'PageDown':   delta = window.innerHeight * 0.88; break;
      case 'PageUp':     delta = -window.innerHeight * 0.88; break;
      case ' ':          delta = e.shiftKey ? -window.innerHeight * 0.88 : window.innerHeight * 0.88; break;
      case 'Home':       targetY = 0; kick(); return;
      case 'End':        targetY = maxScroll(); kick(); return;
      default: return;
    }

    e.preventDefault();
    targetY = clamp(targetY + delta, 0, maxScroll());
    kick();
  });

  /* ---- scrollbar drag / programmatic scrolls (anchors, etc.) ---- */
  window.addEventListener('scroll', function () {
    // If the raf is NOT running, the scroll was triggered externally
    // (scrollbar drag, anchor click, JS scrollIntoView…) → sync our state
    if (!raf) {
      currentY = window.scrollY;
      targetY  = window.scrollY;
    }
  }, { passive: true });

  // Initial sync in case the page loads mid-scroll (e.g. back navigation)
  currentY = targetY = window.scrollY;
})();
