import { describe, expect, it } from 'vitest';
import { getHtmlAnythingTemplate } from '../lib/templates';
import { injectSlideRuntime } from '../lib/slideRuntime';

describe('slide runtime injection', () => {
  it('injects a unified slide runtime into slide templates', () => {
    const template = getHtmlAnythingTemplate('deck-simple');
    expect(template).toBeTruthy();

    const html =
      '<!DOCTYPE html><html><head></head><body><section class="slide">A</section><section class="slide">B</section></body></html>';
    const result = injectSlideRuntime(html, template!);

    expect(result).toContain('html-anything-slide-runtime-script');
    expect(result).toContain('html-anything-slide-controls');
    expect(result).toContain('overflow: hidden !important');
    expect(result).toContain('overflow-y: auto !important');
    expect(result).toContain('-webkit-overflow-scrolling: touch !important');
    expect(result).toContain('body > nav:not(.html-anything-slide-controls)');
    expect(result).toContain('body > .progress');
    expect(result).toContain('html-anything-native-slide-controls');
    expect(result).toContain('html-anything-has-native-slide-controls');
    expect(result).toContain('findNativeControls');
    expect(result).toContain('[data-slide-controls]');
    expect(result).toContain('[data-slide-prev]');
    expect(result).toContain('[data-slide-progress]');
    expect(result).toContain("document.querySelectorAll('section.slide, .slide')");
    expect(result).toContain('if (!slides.length)');
    expect(result).toContain('if (controls) controls.remove()');
    expect(result).toContain("slide.classList.toggle('active', active)");
    expect(result).toContain("slide.classList.remove('exiting')");
    expect(result).toContain("event.key === 'ArrowRight'");
    expect(result).toContain('event.stopImmediatePropagation()');
    expect(result).toContain("window.addEventListener('wheel'");
    expect(result).toContain('findScrollableFromEvent');
    expect(result).toContain('canScrollVertically');
    expect(result).toContain('if (verticalIntent && canScrollVertically');
    expect(result).toContain("window.addEventListener('touchend'");
    expect(result).toContain("history.replaceState(null, '', nextHash)");
    expect(result).toContain('progress.style.width');
    expect(result).not.toContain('translate3d(24px');
    expect(result.indexOf('html-anything-slide-runtime-script')).toBeLessThan(
      result.indexOf('</body>')
    );
  });

  it('prefers native slide controls when the generated template provides them', () => {
    const template = getHtmlAnythingTemplate('deck-simple');
    expect(template).toBeTruthy();

    const html =
      '<!DOCTYPE html><html><head></head><body><section class="slide">A</section><section class="slide">B</section><nav data-slide-controls><button data-slide-prev>Prev</button><span data-slide-counter>1/2</span><button data-slide-next>Next</button><i data-slide-progress></i></nav></body></html>';
    const result = injectSlideRuntime(html, template!);

    expect(result).toContain('<nav data-slide-controls>');
    expect(result).toContain(
      "document.documentElement.classList.add('html-anything-has-native-slide-controls')"
    );
    expect(result).toContain("nativeControls.classList.add('html-anything-native-slide-controls')");
  });

  it('does not inject slide runtime into publication templates', () => {
    const template = getHtmlAnythingTemplate('book-editorial');
    expect(template).toBeTruthy();

    const html = '<!DOCTYPE html><html><head></head><body><article>Book</article></body></html>';
    const result = injectSlideRuntime(html, template!);

    expect(result).toBe(html);
  });

  it('does not inject duplicate slide runtime controls', () => {
    const template = getHtmlAnythingTemplate('deck-simple');
    expect(template).toBeTruthy();

    const html =
      '<!DOCTYPE html><html><head></head><body><script id="html-anything-slide-runtime-script"></script></body></html>';
    const result = injectSlideRuntime(html, template!);

    expect(result).toBe(html);
  });
});
