/* =========================
   Scaler — base 1728×1117 (hero responsive)
   (Conserve ta logique + header height + nav active)
   ========================= */
(() => {
  const BASE_W = 1728;
  const BASE_H = 1117;

  const debounce = (fn, ms = 80) => { let t; return (...a)=>{ clearTimeout(t); t=setTimeout(()=>fn(...a), ms); }; };

  function setVHVar() {
    document.documentElement.style.setProperty('--vh', `${window.innerHeight * 0.01}px`);
  }

  function getCurrentPage(href) {
    try {
      const u = new URL(href, location.origin);
      return (u.pathname.split('/').pop() || 'index.html').toLowerCase();
    } catch { return 'index.html'; }
  }

  function markActiveNav() {
    const current = getCurrentPage(location.href);
    document.querySelectorAll('.site-nav a').forEach(a => {
      const href = a.getAttribute('href') || '';
      a.classList.toggle('is-active', getCurrentPage(href) === current);
    });
  }

  function updateScale() {
    const root = document.documentElement;
    const boost = parseFloat(getComputedStyle(root).getPropertyValue('--boost')) || 1;

    const header = document.querySelector('.site-header');
    const headH = header ? header.getBoundingClientRect().height : 0;

    const availW = window.innerWidth;
    const availH = Math.max(0, window.innerHeight - headH);

    const scale = Math.min(availW / (BASE_W * boost), availH / (BASE_H * boost));
    root.style.setProperty('--scale', String(scale));
    markActiveNav();
  }

  const recalc = debounce(() => { setVHVar(); updateScale(); });

  window.addEventListener('resize', recalc, { passive: true });
  window.addEventListener('orientationchange', recalc, { passive: true });
  document.addEventListener('visibilitychange', () => { if (!document.hidden) recalc(); });

  if (document.fonts && document.fonts.ready) document.fonts.ready.then(recalc).catch(()=>{});

  const hero = document.querySelector('.hero');
  if (hero && !hero.complete) {
    hero.addEventListener('load', recalc, { once: true });
    hero.addEventListener('error', recalc, { once: true });
  }

  window.addEventListener('load', recalc);

  // Anti-drag images
  document.addEventListener('dragstart', e => { if (e.target && e.target.tagName === 'IMG') e.preventDefault(); });
})();

/* =========================
   Accordions — hover + sticky au clic
   ========================= */
(() => {
  const details = document.querySelectorAll('.qa details');
  if (!details.length) return;

  details.forEach(d => {
    d.addEventListener('mouseenter', () => { if (!d.dataset.sticky) d.setAttribute('open',''); });
    d.addEventListener('mouseleave', () => { if (!d.dataset.sticky) d.removeAttribute('open'); });
    d.addEventListener('click', ev => {
      if (!ev.target.closest('summary')) return;
      if (d.dataset.sticky) { delete d.dataset.sticky; d.removeAttribute('open'); }
      else { d.dataset.sticky = '1'; d.setAttribute('open',''); }
    });
  });
})();

/* =========================
   Smooth scroll #contact (dé-doublonné)
   ========================= */
(() => {
  const target = document.querySelector('#contact');
  if (!target) return;
  document.querySelectorAll('a[href="#contact"]').forEach(a=>{
    a.addEventListener('click', e=>{
      e.preventDefault();
      target.scrollIntoView({ behavior:'smooth', block:'start' });
    });
  });
})();

/* =========================
   GLITCH TRAIL — + Compteur cubes (compatible avec ta version)
   ========================= */
(() => {
  const finePointer = matchMedia('(pointer:fine)').matches;
  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (!finePointer || reduced) return;

  // Racine : si #glitch-trail existe on l’utilise, sinon <body>
  const root = document.getElementById('glitch-trail') || document.body;

  // Couche unique
  let layer = root.querySelector('.glitch-layer');
  if (!layer) {
    layer = document.createElement('div');
    layer.className = 'glitch-layer';
    root.appendChild(layer);
  }

  // Compteur
  const countEl = document.querySelector('[data-cubes]');
  let liveCount = layer ? layer.children.length : 0;
  const updateCount = ()=>{ if (countEl) countEl.textContent = String(liveCount); };
  updateCount();

  // Cible valide ?
  function isGlitchTarget(el) {
    if (!el) return false;
    if (el.closest?.('[data-glitch]')) return true;
    if (el.tagName === 'IMG') {
      const src = (el.currentSrc || el.src || '').toLowerCase();
      if (/\.png(\?.*)?$/.test(src) || src.startsWith('data:image/png')) return true;
    }
    return false;
  }

  // Spawn 1 carré
  function spawnSquare(x, y) {
    const d = document.createElement('div');
    d.className = 'glitch-square';
    const r = Math.random();
    if      (r < 0.25) d.classList.add('size-s');
    else if (r < 0.65) d.classList.add('size-m');
    else if (r < 0.9)  d.classList.add('size-l');
    else               d.classList.add('size-xl');

    const jitter = (min, max) => min + Math.random() * (max - min);
    d.style.left = `${x + jitter(-3,3)}px`;
    d.style.top  = `${y + jitter(-3,3)}px`;

    layer.appendChild(d);
    liveCount++; updateCount();

    setTimeout(() => { d.remove(); liveCount = Math.max(0, liveCount - 1); updateCount(); }, 500);
  }

  // Trail
  let last = 0;
  function onMove(e) {
    const now = performance.now();
    if (now - last < 12) return;

    const x = e.clientX ?? e.touches?.[0]?.clientX ?? 0;
    const y = e.clientY ?? e.touches?.[0]?.clientY ?? 0;

    const el = document.elementFromPoint(x, y);
    if (isGlitchTarget(el)) {
      spawnSquare(x, y);
      if (Math.random() < 0.5) spawnSquare(x + (Math.random()*8-4), y + (Math.random()*8-4));
      if (Math.random() < 0.2) spawnSquare(x + (Math.random()*14-7), y + (Math.random()*14-7));
      last = now;
    }
  }
  window.addEventListener('mousemove', onMove, { passive: true });
  window.addEventListener('touchmove', onMove, { passive: true });

  // Nettoyage défensif
  const CLEAN_LIMIT = 400;
  setInterval(() => {
    if (layer.children.length > CLEAN_LIMIT) {
      const excess = layer.children.length - CLEAN_LIMIT;
      for (let i = 0; i < excess; i++) layer.firstElementChild?.remove();
      liveCount = layer.children.length; updateCount();
    }
  }, 1000);

  // Hook externe pour “burst”
  document.addEventListener('glitch:cubeSpawn', (e) => {
    const n = Math.max(1, Number(e.detail?.burst || 12));
    const x = e.detail?.x ?? window.innerWidth/2;
    const y = e.detail?.y ?? window.innerHeight/2;
    for (let i=0;i<n;i++) spawnSquare(x + (Math.random()*16-8), y + (Math.random()*16-8));
  });
})();

/* =========================
   LIGHTBOX — Page 3D (compat : nouveau HTML + ancien fallback)
   ========================= */
(() => {
  if (!document.body.classList.contains('page-3d')) return;

  // Sources (nouveau HTML : liens .gallery-grid[data-viewer="open"])
  const anchors = Array.from(document.querySelectorAll('.gallery-grid a[data-viewer="open"]'));

  // Fallback si ancien marquage .gallery-item img
  if (!anchors.length) {
    const imgs = Array.from(document.querySelectorAll('.gallery-item img'));
    imgs.forEach(img => {
      const a = document.createElement('a');
      a.href = img.currentSrc || img.src;
      a.dataset.viewer = 'open';
      img.replaceWith(a);
      a.appendChild(img);
      anchors.push(a);
    });
  }

  const lb = document.getElementById('lightbox') || document.querySelector('.lightbox');
  if (!lb) return;

  const lbImg   = lb.querySelector('[data-viewer="media"]') || document.getElementById('lightbox-img');
  const lbClose = lb.querySelector('[data-viewer="close"]') || lb.querySelector('.lightbox-close');
  const lbPrev  = lb.querySelector('[data-viewer="prev"]')  || lb.querySelector('.lightbox-prev');
  const lbNext  = lb.querySelector('[data-viewer="next"]')  || lb.querySelector('.lightbox-next');
  const lbBack  = lb.querySelector('.lightbox-backdrop')    || lb;
  const lbCur   = lb.querySelector('[data-viewer="current"]');
  const lbTot   = lb.querySelector('[data-viewer="total"]');

  let idx = 0, open = false;
  if (lbTot) lbTot.textContent = String(anchors.length);

  const preload = src => { const i = new Image(); i.src = src; };
  const preloadNeighbors = i => {
    const p = (i - 1 + anchors.length) % anchors.length;
    const n = (i + 1) % anchors.length;
    preload(anchors[p].href);
    preload(anchors[n].href);
  };

  function setBodyLock(lock){
    if (lock){
      const sbw = window.innerWidth - document.documentElement.clientWidth;
      document.body.style.overflow = 'hidden';
      if (sbw>0) document.body.style.paddingRight = sbw+'px';
    } else {
      document.body.style.overflow = '';
      document.body.style.paddingRight = '';
    }
  }

  function show(i){
    idx = (i + anchors.length) % anchors.length;
    const a = anchors[idx];
    const img = a.querySelector('img');
    if (lbImg){
      lbImg.src = a.href;
      lbImg.alt = img ? (img.alt || '') : '';
    }
    if (lbCur) lbCur.textContent = String(idx+1);
    preloadNeighbors(idx);
  }

  function openLB(i=0){
    open = true;
    lb.setAttribute('aria-hidden','false');
    lb.hidden = false;
    setBodyLock(true);
    show(i);
    document.addEventListener('keydown', onKey);
  }
  function closeLB(){
    open = false;
    lb.setAttribute('aria-hidden','true');
    lb.hidden = true;
    setBodyLock(false);
    document.removeEventListener('keydown', onKey);
  }
  function next(){ show(idx+1); }
  function prev(){ show(idx-1); }

  function onKey(e){
    if (!open) return;
    if (e.key === 'Escape') { e.preventDefault(); closeLB(); }
    if (e.key === 'ArrowRight') { e.preventDefault(); next(); }
    if (e.key === 'ArrowLeft')  { e.preventDefault(); prev(); }
  }

  anchors.forEach((a, i) => {
    a.addEventListener('click', (e) => {
      e.preventDefault();
      openLB(i);
      // petit burst pour le glitch counter
      document.dispatchEvent(new CustomEvent('glitch:cubeSpawn', { detail: { burst: 14 } }));
    }, { passive: false });
  });

  lbClose?.addEventListener('click', closeLB);
  lbBack?.addEventListener('click', (e)=>{ if (e.target === lbBack) closeLB(); });
  lbNext?.addEventListener('click', next);
  lbPrev?.addEventListener('click', prev);

  // Touch swipe
  (() => {
    let sx=0, sy=0, dx=0, dy=0, active=false;
    const THRESH = 48;
    lb.addEventListener('touchstart', (e)=>{ const t=e.touches[0]; sx=t.clientX; sy=t.clientY; dx=dy=0; active=true; }, { passive:true });
    lb.addEventListener('touchmove',  (e)=>{ if(!active)return; const t=e.touches[0]; dx=t.clientX-sx; dy=t.clientY-sy; }, { passive:true });
    lb.addEventListener('touchend',   ()=>{ if(!active)return; if(Math.abs(dx)>Math.abs(dy) && Math.abs(dx)>THRESH){ dx<0?next():prev(); } active=false; }, { passive:true });
  })();
})();
// Gestion des covers vidéos → autoplay
document.querySelectorAll('.video-cover').forEach(cover => {
  cover.addEventListener('click', () => {
    const iframe = cover.nextElementSibling;

    // Ajoute autoplay si pas déjà présent
    if (iframe && iframe.tagName === "IFRAME") {
      if (iframe.src.indexOf("autoplay=1") === -1) {
        iframe.src += (iframe.src.includes("?") ? "&" : "?") + "autoplay=1";
      }
    }

    // Cache la cover
    cover.style.display = "none";
  });
});


