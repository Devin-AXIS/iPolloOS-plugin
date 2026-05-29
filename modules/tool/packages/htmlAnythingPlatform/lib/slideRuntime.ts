import type { HtmlAnythingTemplate } from './templates';

export function shouldInjectSlideRuntime(template: HtmlAnythingTemplate): boolean {
  return template.category === 'slides';
}

function buildSlideRuntimeSnippet(): string {
  return `
<style id="html-anything-slide-runtime-style">
  html.html-anything-slide-runtime,
  html.html-anything-slide-runtime body {
    width: 100% !important;
    height: 100% !important;
    min-height: 100% !important;
    margin: 0 !important;
    overflow: hidden !important;
    overscroll-behavior: none !important;
  }
  html.html-anything-slide-runtime body {
    position: fixed !important;
    inset: 0 !important;
  }
  html.html-anything-slide-runtime .slide,
  html.html-anything-slide-runtime section.slide {
    position: absolute !important;
    inset: 0 !important;
    max-width: none !important;
    max-height: none !important;
    margin: 0 !important;
    overflow-x: hidden !important;
    overflow-y: auto !important;
    overscroll-behavior: contain !important;
    -webkit-overflow-scrolling: touch !important;
    opacity: 0 !important;
    visibility: hidden !important;
    pointer-events: none !important;
  }
  html.html-anything-slide-runtime .slide.html-anything-active-slide,
  html.html-anything-slide-runtime section.slide.html-anything-active-slide {
    opacity: 1 !important;
    visibility: visible !important;
    pointer-events: auto !important;
    z-index: 2 !important;
  }
  html.html-anything-slide-runtime body > nav:not(.html-anything-slide-controls),
  html.html-anything-slide-runtime body > .nav,
  html.html-anything-slide-runtime body > .progress,
  html.html-anything-slide-runtime body > [class*="slide-nav"],
  html.html-anything-slide-runtime body > [class*="slide-controls"],
  html.html-anything-slide-runtime body > [class*="progress"] {
    display: none !important;
    pointer-events: none !important;
  }
  html.html-anything-slide-runtime body > nav.html-anything-native-slide-controls,
  html.html-anything-slide-runtime body > .html-anything-native-slide-controls {
    display: flex !important;
    pointer-events: auto !important;
  }
  html.html-anything-slide-runtime.html-anything-has-native-slide-controls .html-anything-slide-controls {
    display: none !important;
  }
  .html-anything-slide-controls {
    position: fixed;
    left: 50%;
    bottom: max(18px, env(safe-area-inset-bottom));
    z-index: 2147483647;
    display: flex;
    align-items: center;
    gap: 10px;
    transform: translateX(-50%);
    padding: 8px;
    border: 1px solid rgba(15, 23, 42, 0.12);
    border-radius: 999px;
    background: rgba(255, 255, 255, 0.86);
    color: #0f172a;
    box-shadow: 0 10px 30px rgba(15, 23, 42, 0.14);
    backdrop-filter: blur(12px);
    font: 600 13px/1.1 system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
  }
  .html-anything-slide-controls button {
    width: 36px;
    height: 36px;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    border: 0;
    border-radius: 999px;
    background: rgba(15, 23, 42, 0.06);
    color: inherit;
    cursor: pointer;
    font: inherit;
  }
  .html-anything-slide-controls button:disabled {
    cursor: default;
    opacity: 0.36;
  }
  .html-anything-slide-counter {
    min-width: 48px;
    text-align: center;
    white-space: nowrap;
  }
  @media (max-width: 768px) {
    .html-anything-slide-controls {
      bottom: calc(18px + env(safe-area-inset-bottom));
    }
  }
  @media print {
    html.html-anything-slide-runtime,
    html.html-anything-slide-runtime body {
      position: static !important;
      width: auto !important;
      height: auto !important;
      overflow: visible !important;
    }
    html.html-anything-slide-runtime .slide,
    html.html-anything-slide-runtime section.slide {
      position: relative !important;
      inset: auto !important;
      width: 100% !important;
      height: 100vh !important;
      opacity: 1 !important;
      visibility: visible !important;
      transform: none !important;
      page-break-after: always;
    }
    .html-anything-slide-controls {
      display: none !important;
    }
  }
</style>
<div class="html-anything-slide-controls" aria-label="幻灯片翻页">
  <button class="html-anything-slide-prev" type="button" aria-label="上一页">‹</button>
  <span class="html-anything-slide-counter" aria-live="polite">1/1</span>
  <button class="html-anything-slide-next" type="button" aria-label="下一页">›</button>
</div>
<script id="html-anything-slide-runtime-script">
(function () {
  if (window.__htmlAnythingSlideRuntime) return;
  window.__htmlAnythingSlideRuntime = true;

  var slides = Array.prototype.slice.call(document.querySelectorAll('section.slide, .slide'));
  var controls = document.querySelector('.html-anything-slide-controls');
  if (!slides.length) {
    if (controls) controls.remove();
    return;
  }

  document.documentElement.classList.add('html-anything-slide-runtime');

  slides.forEach(function (slide, index) {
    slide.classList.add('slide');
    slide.setAttribute('data-html-anything-slide-index', String(index + 1));
    slide.setAttribute('tabindex', '-1');
  });

  var nativeControls = findNativeControls();
  if (nativeControls) {
    nativeControls.classList.add('html-anything-native-slide-controls');
    document.documentElement.classList.add('html-anything-has-native-slide-controls');
    controls = nativeControls;
  }
  var prev = findControl(controls, 'prev');
  var next = findControl(controls, 'next');
  var counter = findControl(controls, 'counter');
  var progress = findControl(controls, 'progress');
  var current = readHash();

  function findNativeControls() {
    var explicit = document.querySelector('[data-slide-controls]');
    if (explicit) return explicit;
    var candidates = Array.prototype.slice.call(document.querySelectorAll('body > nav, body > .nav, body > .progress-shell, body > [class*="slide-nav"], body > [class*="slide-controls"]'));
    return candidates.find(function (node) {
      if (node.classList.contains('html-anything-slide-controls')) return false;
      var text = (node.textContent || '').trim();
      return node.querySelector('[data-slide-prev], [data-slide-next], #prevBtn, #nextBtn, .prev, .next, .nav-btn') ||
        /上一页|下一页|prev|next|‹|›|←|→/i.test(text);
    });
  }

  function findControl(root, type) {
    if (!root) return null;
    if (type === 'prev') {
      return root.querySelector('[data-slide-prev], .html-anything-slide-prev, #prevBtn, .prev, [aria-label*="上一"], [aria-label*="Prev"], [aria-label*="Previous"]');
    }
    if (type === 'next') {
      return root.querySelector('[data-slide-next], .html-anything-slide-next, #nextBtn, .next, [aria-label*="下一"], [aria-label*="Next"]');
    }
    if (type === 'counter') {
      return root.querySelector('[data-slide-counter], .html-anything-slide-counter, #counter, .counter');
    }
    return document.querySelector('[data-slide-progress], #progressBar, .progress-bar');
  }

  function readHash() {
    var match = String(location.hash || '').match(/(?:#\\/?|#slide-)(\\d+)/);
    var index = match ? Number(match[1]) - 1 : 0;
    return Math.min(Math.max(index || 0, 0), slides.length - 1);
  }

  function syncHash(index) {
    var nextHash = '#/' + (index + 1);
    if (location.hash !== nextHash) {
      history.replaceState(null, '', nextHash);
    }
  }

  function show(index, options) {
    current = Math.min(Math.max(index, 0), slides.length - 1);
    slides.forEach(function (slide, slideIndex) {
      var active = slideIndex === current;
      slide.classList.remove('exiting');
      slide.classList.toggle('active', active);
      slide.classList.toggle('html-anything-active-slide', active);
      slide.setAttribute('aria-hidden', active ? 'false' : 'true');
    });
    if (counter) counter.textContent = String(current + 1) + '/' + String(slides.length);
    if (progress) progress.style.width = String(((current + 1) / slides.length) * 100) + '%';
    if (prev) prev.disabled = current === 0;
    if (next) next.disabled = current === slides.length - 1;
    if (!options || options.hash !== false) syncHash(current);
  }

  function go(delta) {
    show(current + delta);
  }

  function findScrollableFromEvent(event) {
    var node = event && event.target;
    var activeSlide = slides[current];
    while (node && node !== document && node !== window) {
      if (activeSlide && node === activeSlide) return activeSlide;
      if (activeSlide && node.nodeType === 1 && activeSlide.contains(node)) {
        var style = window.getComputedStyle(node);
        var canScroll = /(auto|scroll)/.test(style.overflowY || '') && node.scrollHeight > node.clientHeight + 1;
        if (canScroll) return node;
      }
      node = node.parentNode;
    }
    return activeSlide && activeSlide.scrollHeight > activeSlide.clientHeight + 1 ? activeSlide : null;
  }

  function canScrollVertically(node, deltaY) {
    if (!node || !deltaY) return false;
    if (node.scrollHeight <= node.clientHeight + 1) return false;
    if (deltaY > 0) return node.scrollTop + node.clientHeight < node.scrollHeight - 1;
    return node.scrollTop > 1;
  }

  if (prev) prev.addEventListener('click', function () { go(-1); });
  if (next) next.addEventListener('click', function () { go(1); });

  document.addEventListener('keydown', function (event) {
    var tag = event.target && event.target.tagName;
    if (/INPUT|TEXTAREA|SELECT/.test(tag || '') || event.defaultPrevented) return;
    if (event.key === 'ArrowLeft' || event.key === 'PageUp') {
      event.preventDefault();
      event.stopImmediatePropagation();
      go(-1);
    }
    if (event.key === 'ArrowRight' || event.key === 'PageDown' || event.key === ' ') {
      event.preventDefault();
      event.stopImmediatePropagation();
      go(1);
    }
  }, true);

  var wheelLock = 0;
  window.addEventListener('wheel', function (event) {
    var now = Date.now();
    var delta = Math.abs(event.deltaX) > Math.abs(event.deltaY) ? event.deltaX : event.deltaY;
    var scrollable = findScrollableFromEvent(event);
    if (Math.abs(event.deltaY) >= Math.abs(event.deltaX) && canScrollVertically(scrollable, event.deltaY)) {
      return;
    }
    event.preventDefault();
    if (now - wheelLock < 520) return;
    if (Math.abs(delta) < 24) return;
    wheelLock = now;
    go(delta > 0 ? 1 : -1);
  }, { passive: false });

  var touchStartX = 0;
  var touchStartY = 0;
  window.addEventListener('touchstart', function (event) {
    if (!event.touches || !event.touches.length) return;
    touchStartX = event.touches[0].clientX;
    touchStartY = event.touches[0].clientY;
  }, { passive: true });
  window.addEventListener('touchend', function (event) {
    if (!event.changedTouches || !event.changedTouches.length) return;
    var dx = event.changedTouches[0].clientX - touchStartX;
    var dy = event.changedTouches[0].clientY - touchStartY;
    var verticalIntent = Math.abs(dy) > Math.abs(dx);
    if (verticalIntent && canScrollVertically(findScrollableFromEvent(event), -dy)) return;
    var primary = Math.abs(dx) >= Math.abs(dy) ? dx : -dy;
    if (Math.abs(primary) < 48) return;
    go(primary < 0 ? 1 : -1);
  }, { passive: true });

  window.addEventListener('hashchange', function () {
    show(readHash(), { hash: false });
  });

  show(current, { hash: false });
})();
</script>`.trim();
}

export function injectSlideRuntime(html: string, template: HtmlAnythingTemplate): string {
  if (!shouldInjectSlideRuntime(template)) return html;
  if (html.includes('html-anything-slide-runtime-script')) return html;

  const snippet = buildSlideRuntimeSnippet();
  if (/<\/body>/i.test(html)) {
    return html.replace(/<\/body>/i, `${snippet}\n</body>`);
  }
  return `${html}\n${snippet}`;
}
