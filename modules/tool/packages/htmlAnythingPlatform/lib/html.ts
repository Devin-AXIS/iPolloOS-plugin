const HTML_FENCE_RE = /```(?:html)?\s*([\s\S]*?)```/i;

export function extractCompleteHtml(raw: string): string {
  const fenced = raw.match(HTML_FENCE_RE)?.[1]?.trim();
  const text = (fenced || raw || '').trim();
  const docStart = text.search(/<!doctype html>|<html[\s>]/i);
  const html = docStart >= 0 ? text.slice(docStart).trim() : text;
  const docEnd = html.search(/<\/html>/i);
  const finalHtml = docEnd >= 0 ? html.slice(0, docEnd + '</html>'.length).trim() : html;

  if (!/<html[\s>]/i.test(finalHtml) || !/<\/html>/i.test(finalHtml)) {
    throw new Error('AI app output is not a complete HTML document');
  }
  if (!/<head[\s>]/i.test(finalHtml) || !/<body[\s>]/i.test(finalHtml)) {
    throw new Error('AI app output must include <head> and <body>');
  }

  return /^<!doctype html>/i.test(finalHtml) ? finalHtml : `<!DOCTYPE html>\n${finalHtml}`;
}
