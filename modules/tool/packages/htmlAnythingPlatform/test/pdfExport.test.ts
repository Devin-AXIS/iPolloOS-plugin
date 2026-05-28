import { describe, expect, it } from 'vitest';
import { getHtmlAnythingTemplate } from '../lib/templates';
import { injectPdfExport } from '../lib/pdfExport';

describe('pdf export injection', () => {
  it('injects pdf export into publication html', () => {
    const template = getHtmlAnythingTemplate('book-editorial');
    expect(template).toBeTruthy();

    const html = '<!DOCTYPE html><html><head></head><body><article>Book</article></body></html>';
    const result = injectPdfExport(html, template!);

    expect(result).toContain('html-anything-pdf-export');
    expect(result).not.toContain('html2pdf');
    expect(result).toContain('window.print()');
    expect(result).toContain('html-anything-reader-tools');
    expect(result).toContain('findExistingPrintButton');
    expect(result).toContain("existing.textContent = '导出 PDF'");
    expect(result).toContain('bottom: calc(76px + env(safe-area-inset-bottom))');
    expect(result).toContain('导出 PDF');
    expect(result.indexOf('html-anything-pdf-export-script')).toBeLessThan(
      result.indexOf('</body>')
    );
  });

  it('does not inject pdf export into slide html', () => {
    const template = getHtmlAnythingTemplate('deck-simple');
    expect(template).toBeTruthy();

    const html = '<!DOCTYPE html><html><head></head><body><main>Deck</main></body></html>';
    const result = injectPdfExport(html, template!);

    expect(result).toBe(html);
  });

  it('does not inject duplicate pdf export controls', () => {
    const template = getHtmlAnythingTemplate('research-report');
    expect(template).toBeTruthy();

    const html =
      '<!DOCTYPE html><html><head></head><body><button id="html-anything-pdf-export-script"></button></body></html>';
    const result = injectPdfExport(html, template!);

    expect(result).toBe(html);
  });
});
