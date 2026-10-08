/**
 * Lazy Loading minimalista para Zalen Portfolio
 * Usa Intersection Observer API para carregar imagens e vídeos sob demanda
 */

(function() {
  'use strict';

  // Lazy load de imagens com data-src
  if ('IntersectionObserver' in window) {
    const imageObserver = new IntersectionObserver((entries, observer) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          const img = entry.target;
          if (img.dataset.src) {
            img.src = img.dataset.src;
            if (img.dataset.srcset) {
              img.srcset = img.dataset.srcset;
            }
            img.classList.add('lazy-loaded');
            observer.unobserve(img);
          }
        }
      });
    }, {
      rootMargin: '50px'
    });

    document.querySelectorAll('img[data-src]').forEach(img => {
      imageObserver.observe(img);
    });

    // Lazy load de vídeos com data-src
    const videoObserver = new IntersectionObserver((entries, observer) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          const video = entry.target;
          if (video.dataset.src) {
            const source = document.createElement('source');
            source.src = video.dataset.src;
            source.type = video.dataset.type || 'video/mp4';
            video.appendChild(source);
            video.load();
            video.classList.add('lazy-loaded');
            observer.unobserve(video);
          }
        }
      });
    }, {
      rootMargin: '100px'
    });

    document.querySelectorAll('video[data-src]').forEach(video => {
      videoObserver.observe(video);
    });
  }

  // Fallback para browsers antigos: carregar tudo imediatamente
  if (!('IntersectionObserver' in window)) {
    document.querySelectorAll('[data-src]').forEach(el => {
      if (el.tagName === 'IMG') {
        el.src = el.dataset.src;
        if (el.dataset.srcset) el.srcset = el.dataset.srcset;
      } else if (el.tagName === 'VIDEO' && el.dataset.src) {
        const source = document.createElement('source');
        source.src = el.dataset.src;
        source.type = el.dataset.type || 'video/mp4';
        el.appendChild(source);
        el.load();
      }
    });
  }
})();
