/* =========================
   Loading Screen
   Only triggers if page hasn't loaded within 2.5s
   ========================= */
(() => {
  'use strict';

  const THRESHOLD_MS = 2500;
  const GREEN = [0x41, 0xF3, 0x73]; // #41F373
  const WHITE = [255, 255, 255];

  const inWork = /\/work\//.test(location.pathname);
  const assetBase = inWork ? '../assets/' : 'assets/';

  let loaderEl    = null;
  let percentEl   = null;
  let progress    = 0;      // currently displayed progress
  let target      = 0;      // target progress (set by load events)
  let loaderShown = false;
  let pageLoaded  = false;
  let rafId       = null;

  /* ---- Helpers ---- */
  function lerp(a, b, t) { return a + (b - a) * t; }

  function colorAtProgress(t) {
    const r = Math.round(lerp(WHITE[0], GREEN[0], t));
    const g = Math.round(lerp(WHITE[1], GREEN[1], t));
    const b = Math.round(lerp(WHITE[2], GREEN[2], t));
    return 'rgb(' + r + ',' + g + ',' + b + ')';
  }

  /* ---- DOM creation ---- */
  function createLoader() {
    loaderEl = document.createElement('div');
    loaderEl.id = 'jb-loader';
    loaderEl.setAttribute('aria-hidden', 'true');

    const img = document.createElement('img');
    img.className = 'jb-loader-pastille';
    img.src = assetBase + 'Img/PASTILLE CHARGEMENT.png';
    img.alt = '';
    img.draggable = false;

    percentEl = document.createElement('div');
    percentEl.className = 'jb-loader-percent';
    percentEl.textContent = '0%';

    loaderEl.appendChild(img);
    loaderEl.appendChild(percentEl);
    document.body.prepend(loaderEl);
  }

  /* ---- Progress rendering ---- */
  function applyProgress(pct) {
    if (!loaderEl) return;
    loaderEl.style.backgroundColor = colorAtProgress(pct / 100);
    if (percentEl) percentEl.textContent = Math.round(pct) + '%';
  }

  function tick() {
    if (progress < target) {
      // Ease toward target (faster when far, slower as it closes)
      progress += (target - progress) * 0.07;
      if (target - progress < 0.3) progress = target;
      applyProgress(progress);
    }

    if (progress < target) {
      rafId = requestAnimationFrame(tick);
    } else if (target >= 100) {
      applyProgress(100);
      scheduleExit();
    }
  }

  function setTarget(pct) {
    target = Math.max(target, Math.min(100, pct));
    if (!loaderShown) return;
    cancelAnimationFrame(rafId);
    rafId = requestAnimationFrame(tick);
  }

  /* ---- Exit animation ---- */
  function scheduleExit() {
    // Brief pause at 100% so the user sees it
    setTimeout(function () {
      if (!loaderEl) return;
      loaderEl.classList.add('is-exiting');
      loaderEl.addEventListener('transitionend', function () {
        if (loaderEl) { loaderEl.remove(); loaderEl = null; }
      }, { once: true });
      // Fallback removal in case transitionend doesn't fire
      setTimeout(function () {
        if (loaderEl) { loaderEl.remove(); loaderEl = null; }
      }, 1200);
    }, 350);
  }

  /* ---- Progress tracking ---- */
  var totalImgs   = 0;
  var loadedImgs  = 0;

  function onImgSettled() {
    loadedImgs++;
    if (totalImgs > 0) {
      setTarget(20 + (loadedImgs / totalImgs) * 78);
    }
  }

  function trackImages() {
    var imgs = Array.from(document.querySelectorAll('img'));
    totalImgs = imgs.length;
    if (totalImgs === 0) { setTarget(90); return; }

    imgs.forEach(function (img) {
      if (img.complete) {
        loadedImgs++;
      } else {
        img.addEventListener('load',  onImgSettled, { once: true });
        img.addEventListener('error', onImgSettled, { once: true });
      }
    });

    // Reflect already-loaded images immediately
    if (loadedImgs > 0) {
      setTarget(20 + (loadedImgs / totalImgs) * 78);
    }
  }

  document.addEventListener('DOMContentLoaded', function () {
    setTarget(20);
    trackImages();
  });

  window.addEventListener('load', function () {
    pageLoaded = true;
    setTarget(100);
  }, { once: true });

  /* ---- Threshold timer ---- */
  // Adjust for time already elapsed since navigation start
  var elapsed   = (performance && performance.now) ? performance.now() : 0;
  var remaining = Math.max(0, THRESHOLD_MS - elapsed);

  var showTimer = setTimeout(function () {
    if (pageLoaded) return; // Already loaded, nothing to show
    loaderShown = true;
    createLoader();
    applyProgress(progress); // Show current state immediately
    cancelAnimationFrame(rafId);
    rafId = requestAnimationFrame(tick);
  }, remaining);

  window.addEventListener('load', function () {
    clearTimeout(showTimer);
  }, { once: true });

})();
