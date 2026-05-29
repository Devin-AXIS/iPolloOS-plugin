import type { HtmlAnythingTemplate } from './templates';

const PUBLICATION_CATEGORIES = new Set(['book', 'research', 'publication']);

export function shouldInjectPublicationToc(template: HtmlAnythingTemplate): boolean {
  return PUBLICATION_CATEGORIES.has(template.category);
}

function buildPublicationTocSnippet(): string {
  return `
<style id="html-anything-publication-toc-style">
  .html-anything-publication-toc {
    position: fixed;
    top: 24px;
    left: 24px;
    z-index: 2147483646;
    width: 248px;
    max-height: calc(100vh - 48px);
    padding: 16px;
    overflow: auto;
    border: 1px solid rgba(15, 23, 42, 0.12);
    border-radius: 18px;
    background: rgba(255, 255, 255, 0.9);
    color: #0f172a;
    box-shadow: 0 12px 36px rgba(15, 23, 42, 0.12);
    backdrop-filter: blur(14px);
    font: 500 13px/1.45 system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
  }
  .html-anything-publication-toc-title {
    margin: 0 0 10px;
    font-size: 12px;
    font-weight: 750;
    letter-spacing: 0.08em;
    text-transform: uppercase;
    color: rgba(15, 23, 42, 0.56);
  }
  .html-anything-publication-toc-list {
    display: grid;
    gap: 6px;
    margin: 0;
    padding: 0;
    list-style: none;
  }
  .html-anything-publication-toc a {
    display: block;
    padding: 8px 10px;
    border-radius: 12px;
    color: inherit;
    text-decoration: none;
  }
  .html-anything-publication-toc a:hover,
  .html-anything-publication-toc a:focus {
    background: rgba(15, 23, 42, 0.07);
    outline: none;
  }
  .html-anything-publication-toc-level-3 a {
    padding-left: 22px;
    color: rgba(15, 23, 42, 0.72);
  }
  .html-anything-publication-toc-toggle {
    position: fixed;
    left: 16px;
    bottom: calc(18px + env(safe-area-inset-bottom));
    z-index: 2147483647;
    display: none;
    width: 48px;
    height: 48px;
    align-items: center;
    justify-content: center;
    border: 1px solid rgba(15, 23, 42, 0.12);
    border-radius: 999px;
    background: rgba(255, 255, 255, 0.96);
    color: #0f172a;
    box-shadow: 0 8px 24px rgba(15, 23, 42, 0.16);
    backdrop-filter: blur(12px);
    font: 750 20px/1 system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
    cursor: pointer;
  }
  .html-anything-publication-toc-scrim {
    position: fixed;
    inset: 0;
    z-index: 2147483645;
    display: none;
    background: rgba(15, 23, 42, 0.32);
  }
  @media (max-width: 900px) {
    .html-anything-publication-toc {
      top: auto;
      right: 12px;
      bottom: calc(82px + env(safe-area-inset-bottom));
      left: 12px;
      display: none;
      width: auto;
      max-height: min(68vh, 520px);
      border-radius: 22px;
    }
    .html-anything-publication-toc.is-open,
    .html-anything-publication-toc-scrim.is-open,
    .html-anything-publication-toc-toggle {
      display: flex;
    }
    .html-anything-publication-toc.is-open {
      display: block;
    }
  }
  @media print {
    .html-anything-publication-toc,
    .html-anything-publication-toc-toggle,
    .html-anything-publication-toc-scrim {
      display: none !important;
    }
  }
</style>
<button class="html-anything-publication-toc-toggle" type="button" aria-label="打开目录" aria-expanded="false">☰</button>
<div class="html-anything-publication-toc-scrim" hidden></div>
<nav class="html-anything-publication-toc" aria-label="目录" hidden>
  <p class="html-anything-publication-toc-title">目录</p>
  <ol class="html-anything-publication-toc-list"></ol>
</nav>
<script id="html-anything-publication-toc-script">
(function () {
  var nav = document.querySelector('.html-anything-publication-toc');
  var list = document.querySelector('.html-anything-publication-toc-list');
  var toggle = document.querySelector('.html-anything-publication-toc-toggle');
  var scrim = document.querySelector('.html-anything-publication-toc-scrim');
  if (!nav || !list || !toggle || !scrim) return;

  function textOf(node) {
    return (node.textContent || '').replace(/\\s+/g, ' ').trim();
  }

  var headings = Array.prototype.slice.call(
    document.querySelectorAll('article h1, article h2, article h3, main h1, main h2, main h3, section h1, section h2, section h3')
  ).filter(function (node) {
    if (node.closest('.html-anything-publication-toc')) return false;
    var text = textOf(node);
    return text && !/^(目录|table\\s+of\\s+contents)$/i.test(text);
  });

  if (headings.length < 2) {
    nav.remove();
    toggle.remove();
    scrim.remove();
    return;
  }

  headings.slice(0, 80).forEach(function (heading, index) {
    if (!heading.id) heading.id = 'html-anything-section-' + (index + 1);
    var level = Math.min(3, Math.max(1, Number(heading.tagName.slice(1)) || 2));
    var item = document.createElement('li');
    item.className = 'html-anything-publication-toc-level-' + level;
    var link = document.createElement('a');
    link.href = '#' + heading.id;
    link.textContent = textOf(heading);
    link.addEventListener('click', function () {
      setOpen(false);
    });
    item.appendChild(link);
    list.appendChild(item);
  });

  nav.hidden = false;

  function setOpen(open) {
    nav.classList.toggle('is-open', open);
    scrim.classList.toggle('is-open', open);
    scrim.hidden = !open;
    toggle.setAttribute('aria-expanded', open ? 'true' : 'false');
  }

  toggle.addEventListener('click', function () {
    setOpen(!nav.classList.contains('is-open'));
  });
  scrim.addEventListener('click', function () {
    setOpen(false);
  });
  document.addEventListener('keydown', function (event) {
    if (event.key === 'Escape') setOpen(false);
  });
})();
</script>`.trim();
}

export function injectPublicationToc(html: string, template: HtmlAnythingTemplate): string {
  if (!shouldInjectPublicationToc(template)) return html;
  if (html.includes('html-anything-publication-toc-script')) return html;

  const snippet = buildPublicationTocSnippet();
  if (/<\/body>/i.test(html)) {
    return html.replace(/<\/body>/i, `${snippet}\n</body>`);
  }
  return `${html}\n${snippet}`;
}
