import { describe, expect, it } from 'vitest';
import { extractCompleteHtml } from '../lib/html';

describe('html helpers', () => {
  it('extracts fenced html', () => {
    const html = '<!DOCTYPE html><html><head></head><body><main>ok</main></body></html>';
    expect(extractCompleteHtml(`before\n\`\`\`html\n${html}\n\`\`\``)).toBe(html);
  });

  it('rejects incomplete html', () => {
    expect(() => extractCompleteHtml('<div>nope</div>')).toThrow('complete HTML');
  });
});
