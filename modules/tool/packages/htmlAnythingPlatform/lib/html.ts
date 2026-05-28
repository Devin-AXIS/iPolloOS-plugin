const HTML_FENCE_RE = /```(?:html)?\s*([\s\S]*?)```/i;
const UPSTREAM_ERROR_PAGE_RE =
  /\b(?:40[0-9]|50[0-9])\b[\s\S]{0,120}\b(?:gateway|time-?out|not found|forbidden|unauthorized|service unavailable|internal server error|bad gateway)\b|\b(?:gateway time-?out|bad gateway|service unavailable|internal server error)\b|<center>\s*(?:alb|nginx|openresty)\s*<\/center>/i;

export function isCompleteHtmlDocument(value: string): boolean {
  const text = value.trim();
  return /<html(?:\s[^>]*)?>[\s\S]*<head(?:\s[^>]*)?>[\s\S]*<\/head>[\s\S]*<body(?:\s[^>]*)?>[\s\S]*<\/body>[\s\S]*<\/html>/i.test(
    text
  );
}

export function isUpstreamErrorHtmlDocument(value: string): boolean {
  const text = value.trim();
  if (!text) return false;

  const title = /<title\b[^>]*>([\s\S]*?)<\/title>/i.exec(text)?.[1] ?? '';
  const h1 = /<h1\b[^>]*>([\s\S]*?)<\/h1>/i.exec(text)?.[1] ?? '';
  const body = /<body\b[^>]*>([\s\S]*?)<\/body>/i.exec(text)?.[1] ?? text;
  const plain = [title, h1, body]
    .join(' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  return UPSTREAM_ERROR_PAGE_RE.test(plain) || UPSTREAM_ERROR_PAGE_RE.test(text);
}

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
  if (!isCompleteHtmlDocument(finalHtml)) {
    throw new Error('AI app output must include complete <html>, <head>, and <body> sections');
  }
  if (isUpstreamErrorHtmlDocument(finalHtml)) {
    throw new Error('AI app output is an upstream error page, not generated HTML');
  }

  return /^<!doctype html>/i.test(finalHtml) ? finalHtml : `<!DOCTYPE html>\n${finalHtml}`;
}
