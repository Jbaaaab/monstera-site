/**
 * Floating cursor preview
 * Replaces the cursor with a floating image/video square on work rows
 */
(function () {
  const preview    = document.getElementById('cursor-preview');
  const previewImg = document.getElementById('cursor-preview-img');
  const previewVimeo = document.getElementById('cursor-preview-vimeo');

  if (!preview) return;

  let mouseX = 0, mouseY = 0;
  let posX   = 0, posY   = 0;
  let rafId  = null;
  let active = false;

  function lerp(a, b, t) { return a + (b - a) * t; }

  function tick() {
    posX = lerp(posX, mouseX, 0.1);
    posY = lerp(posY, mouseY, 0.1);
    preview.style.transform = 'translate(' + posX + 'px, ' + posY + 'px)';
    if (active) rafId = requestAnimationFrame(tick);
  }

  document.addEventListener('mousemove', function (e) {
    mouseX = e.clientX;
    mouseY = e.clientY;
  });

  const rows = document.querySelectorAll('[data-cursor-preview]');

  rows.forEach(function (row) {
    row.addEventListener('mouseenter', function () {
      const type = row.dataset.cursorPreviewType;
      const src  = row.dataset.cursorPreview;

      if (type === 'vimeo') {
        previewImg.style.display = 'none';
        previewVimeo.style.display = 'block';
        if (!previewVimeo.querySelector('iframe')) {
          previewVimeo.innerHTML =
            '<iframe src="https://player.vimeo.com/video/' + src +
            '?autoplay=1&muted=1&loop=1&title=0&byline=0&portrait=0&controls=0"' +
            ' allow="autoplay; fullscreen" allowfullscreen></iframe>';
        }
      } else {
        previewVimeo.style.display = 'none';
        previewImg.style.display = 'block';
        previewImg.src = src;
      }

      // Snap position before showing to avoid slide-in from 0,0
      posX = mouseX;
      posY = mouseY;

      preview.classList.add('is-visible');
      active = true;
      if (!rafId) rafId = requestAnimationFrame(tick);
    });

    row.addEventListener('mouseleave', function () {
      preview.classList.remove('is-visible');
      active = false;
      if (rafId) { cancelAnimationFrame(rafId); rafId = null; }
    });
  });
})();
