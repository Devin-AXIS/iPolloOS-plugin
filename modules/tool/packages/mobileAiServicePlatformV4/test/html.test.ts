import { describe, expect, it } from 'vitest';
import { extractHtml } from '../lib/html';

const html =
  '<!DOCTYPE html><html><head><meta name="viewport" content="width=device-width"/></head><body></body></html>';

describe('html helpers', () => {
  it('extracts html from markdown fence', () => {
    expect(extractHtml(`before\n\`\`\`html\n${html}\n\`\`\``)).toBe(html);
  });

  it('rejects incomplete html', () => {
    expect(() => extractHtml('<div>nope</div>')).toThrow('complete HTML');
  });

  it('requires mobile viewport', () => {
    expect(() => extractHtml('<!DOCTYPE html><html><head></head><body></body></html>')).toThrow(
      'viewport'
    );
  });

  it('rejects upstream gateway error pages', () => {
    expect(() =>
      extractHtml(`<!DOCTYPE html>
<html>
<head><title>504 Gateway Time-out</title></head>
<body bgcolor="white">
<center><h1>504 Gateway Time-out</h1></center>
<hr><center>alb</center>
</body>
</html>`)
    ).toThrow('upstream error page');
  });
});
