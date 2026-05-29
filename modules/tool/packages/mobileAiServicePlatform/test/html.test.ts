import { describe, expect, it } from 'vitest';
import { extractHtml } from '../lib/html';

const html =
  '<!DOCTYPE html><html><head><meta name="viewport" content="width=device-width"/></head><body></body></html>';

describe('html helpers', () => {
  it('extracts html from markdown fence', () => {
    expect(extractHtml(`before\n\`\`\`html\n${html}\n\`\`\``)).toBe(html);
  });

  it('rejects incomplete html', () => {
    expect(() => extractHtml('<div>nope</div>')).toThrow('完整 HTML');
  });

  it('requires mobile viewport', () => {
    expect(() => extractHtml('<!DOCTYPE html><html><head></head><body></body></html>')).toThrow(
      'viewport'
    );
  });
});
