import type { HtmlAnythingTemplate } from './templates';

const PUBLICATION_CATEGORIES = new Set(['book', 'research', 'publication']);

export function shouldInjectPdfExport(template: HtmlAnythingTemplate): boolean {
  return PUBLICATION_CATEGORIES.has(template.category);
}

function buildPdfExportSnippet(): string {
  return `
<style id="html-anything-pdf-export-style">
  .html-anything-reader-tools {
    position: fixed;
    right: 20px;
    bottom: max(20px, env(safe-area-inset-bottom));
    z-index: 2147483647;
    display: flex;
    flex-direction: column;
    align-items: flex-end;
    gap: 8px;
  }
  @media (max-width: 768px) {
    .html-anything-reader-tools {
      right: max(16px, env(safe-area-inset-right));
      bottom: calc(76px + env(safe-area-inset-bottom));
    }
  }
  .html-anything-pdf-export,
  .html-anything-reader-tools button {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 8px;
    min-width: 104px;
    height: 44px;
    padding: 0 18px;
    border: 1px solid rgba(15, 23, 42, 0.12);
    border-radius: 999px;
    background: rgba(255, 255, 255, 0.96);
    color: #0f172a;
    box-shadow: 0 8px 24px rgba(15, 23, 42, 0.14);
    backdrop-filter: blur(10px);
    font: 600 15px/1.2 system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
    cursor: pointer;
    white-space: nowrap;
  }
  .html-anything-pdf-export[disabled] {
    cursor: wait;
    opacity: 0.72;
  }
  @media print {
    .html-anything-reader-tools,
    .html-anything-pdf-export {
      display: none !important;
    }
  }
</style>
<div class="html-anything-reader-tools" aria-label="阅读器工具">
  <button class="html-anything-pdf-export" type="button" aria-label="导出 PDF">导出 PDF</button>
</div>
<script id="html-anything-pdf-export-script">
(function () {
  var tools = document.querySelector('.html-anything-reader-tools');
  if (!tools) return;

  function findExistingPrintButton() {
    var buttons = Array.prototype.slice.call(document.querySelectorAll('button, a, [role="button"]'));
    return buttons.find(function (node) {
      if (node.closest('.html-anything-reader-tools')) return false;
      var text = (node.textContent || node.getAttribute('aria-label') || node.getAttribute('title') || '').trim();
      return /^(打印|导出\\s*PDF|PDF)$/i.test(text);
    });
  }

  var existing = findExistingPrintButton();
  var injected = document.querySelector('.html-anything-pdf-export');
  var button = existing || injected;
  if (!button) return;

  if (existing) {
    if (injected && injected !== existing) injected.remove();
    existing.classList.add('html-anything-pdf-export');
    existing.setAttribute('aria-label', '导出 PDF');
    existing.textContent = '导出 PDF';
    tools.appendChild(existing);
  }

  button.addEventListener('click', function () {
    window.print();
  });
})();
</script>`.trim();
}

export function injectPdfExport(html: string, template: HtmlAnythingTemplate): string {
  if (!shouldInjectPdfExport(template)) return html;
  if (html.includes('html-anything-pdf-export-script')) return html;

  const snippet = buildPdfExportSnippet();
  if (/<\/body>/i.test(html)) {
    return html.replace(/<\/body>/i, `${snippet}\n</body>`);
  }
  return `${html}\n${snippet}`;
}
