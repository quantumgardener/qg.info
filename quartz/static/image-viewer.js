document.addEventListener('DOMContentLoaded', () => {
  const thumbnails = document.querySelectorAll('.thumbnail');
  if (!thumbnails.length) return;

  // Create overlay
  const overlay = document.createElement('div');
  overlay.id = 'overlay';
  overlay.style.cssText = `
    position: fixed; inset: 0;
    padding: 2rem; background: white;
    display: none; justify-content: center; align-items: center;
    box-sizing: border-box; z-index: 9999;
  `;

  overlay.innerHTML = `
    <div id="overlayContent" style="text-align:center; width:100%; max-width:100%;">
      <img id="fullImage" style="display:block; margin: 0 auto; max-width:100%; box-shadow:0 0 10px rgba(0,0,0,0.2);" alt="" />
      <p id="caption" class="caption" style="margin:1rem 0 0.5rem 0;"></p>
      <p><a id="photopage" href="" rel="noopener">more details…</a></p>
    </div>
  `;
  document.body.appendChild(overlay);

  const fullImage = document.getElementById('fullImage');
  const caption = document.getElementById('caption');
  const photopage = document.getElementById('photopage');
  const content = document.getElementById('overlayContent');

  function chooseSizeSuffix(orientation, vw, vh) {
    if (orientation === 'landscape') {
      if (vw >= 1600) return '_h';
      if (vw >= 1024) return '_b';
      if (vw >= 800) return '_c';
      return '_z';
    } else {
      if (vh >= 1600) return '_h';
      if (vh >= 1024) return '_b';
      if (vh >= 800) return '_c';
      return '_z';
    }
  }

  thumbnails.forEach(img => {
    img.parentElement.addEventListener('click', event => {
      event.preventDefault();

      const link = img.parentElement;
      const base = link.dataset.fullsize?.replace(/_[a-z]\.webp$/, '');
      const orientation = link.dataset.orientation;
      const vw = window.innerWidth;
      const vh = window.innerHeight;

      // Populate overlay metadata
      fullImage.alt = link.dataset.caption || img.alt || '';
      caption.textContent = link.dataset.caption || img.alt || '';
      photopage.href = link.dataset.photopage;
      fullImage.src = '';

      overlay.style.display = 'flex';

      requestAnimationFrame(() => {
        const overlayHeight = overlay.clientHeight;
        const contentHeight = content.scrollHeight;

        // Add 5% viewport height as buffer for longer captions
        const captionBuffer = Math.round(vh * 0.05);
        const usedHeight = contentHeight - fullImage.offsetHeight + captionBuffer;
        const maxImageHeight = overlayHeight - usedHeight;

        fullImage.style.maxHeight = `${maxImageHeight}px`;

        const suffix = chooseSizeSuffix(orientation, vw, maxImageHeight);
        fullImage.src = `${base}${suffix}.webp`;
      });
    });
  });

  overlay.addEventListener('click', e => {
    const isPhotopage = e.target.closest('#photopage');

    if (isPhotopage) {
      console.log('Delegated navigation to:', isPhotopage.href);
      // Let the link do its job: don't stop propagation or prevent default
      return;
    }

    // Close the overlay for all other clicks
    overlay.style.display = 'none';
    fullImage.src = '';
    fullImage.alt = '';
    caption.textContent = '';
    photopage.href = '';
  });

  document.addEventListener('keydown', e => {
    if (e.key === 'Escape' && overlay.style.display === 'flex') {
      overlay.style.display = 'none';
      fullImage.src = '';
      fullImage.alt = '';
      caption.textContent = '';
      photopage.href = '';
    }
  });
});

