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

  it('rejects textual instructions that only mention html tags', () => {
    expect(() =>
      extractCompleteHtml(
        '<!DOCTYPE html> 开头，包含 <html>、<head>、<meta name="viewport">、<style> 或必要 CDN、<body>，并以 </html>'
      )
    ).toThrow('complete <html>');
  });

  it('rejects upstream gateway error pages', () => {
    expect(() =>
      extractCompleteHtml(`<!DOCTYPE html>
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
