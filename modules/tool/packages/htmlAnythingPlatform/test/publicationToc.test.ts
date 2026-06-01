import { describe, expect, it } from 'vitest';
import { getHtmlAnythingTemplate } from '../lib/templates';
import { injectPublicationToc } from '../lib/publicationToc';

describe('publication toc injection', () => {
  it('injects reader toc controls into publication html', () => {
    const template = getHtmlAnythingTemplate('book-editorial');
    expect(template).toBeTruthy();

    const html =
      '<!DOCTYPE html><html><head></head><body><article><h1>第一章</h1><h2>方法</h2><h2>结论</h2></article></body></html>';
    const result = injectPublicationToc(html, template!);

    expect(result).toContain('html-anything-publication-toc-script');
    expect(result).toContain('html-anything-publication-toc-toggle');
    expect(result).toContain('目录');
    expect(result).toContain('body:has(.html-anything-publication-toc:not([hidden]))');
    expect(result).toContain('padding-left: 296px');
    expect(result).toContain('overflow-wrap: anywhere');
    expect(result).toContain('document.querySelectorAll');
    expect(result).toContain('article h1, article h2, article h3');
    expect(result).toContain('bottom: calc(82px + env(safe-area-inset-bottom))');
    expect(result).toContain('@media print');
    expect(result.indexOf('html-anything-publication-toc-script')).toBeLessThan(
      result.indexOf('</body>')
    );
  });

  it('does not inject toc into slide html', () => {
    const template = getHtmlAnythingTemplate('deck-simple');
    expect(template).toBeTruthy();

    const html = '<!DOCTYPE html><html><head></head><body><section>Deck</section></body></html>';
    const result = injectPublicationToc(html, template!);

    expect(result).toBe(html);
  });

  it('injects non-overlapping desktop toc into a main-only brief page', () => {
    const template = getHtmlAnythingTemplate('academic-paper');
    expect(template).toBeTruthy();

    const html =
      '<!DOCTYPE html><html><head></head><body><main class="page"><section class="hero"><h1>AI Executive Brief</h1></section><section class="stats"><h2>核心信号</h2></section><section class="grid"><h2>企业家判断矩阵</h2></section></main></body></html>';
    const result = injectPublicationToc(html, template!);

    expect(result).toContain('html-anything-publication-toc-script');
    expect(result).toContain('padding-left: 296px');
    expect(result).toContain('@media (max-width: 900px)');
  });

  it('does not inject duplicate toc controls', () => {
    const template = getHtmlAnythingTemplate('research-report');
    expect(template).toBeTruthy();

    const html =
      '<!DOCTYPE html><html><head></head><body><script id="html-anything-publication-toc-script"></script></body></html>';
    const result = injectPublicationToc(html, template!);

    expect(result).toBe(html);
  });
});
