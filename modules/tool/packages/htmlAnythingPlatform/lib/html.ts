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
    throw new Error(
      '工具入参 content 不是完整 HTML。请由上游 AI 大脑重新生成包含 <!DOCTYPE html><html><head>...</head><body>...</body></html> 的完整单文件 HTML 后，再调用本发布工具。'
    );
  }
  if (!isCompleteHtmlDocument(finalHtml)) {
    throw new Error(
      '工具入参 content 必须包含完整 <html>、<head>、<body> 结构。请上游 AI 大脑不要传原始需求、Markdown 或片段 HTML。'
    );
  }
  if (isUpstreamErrorHtmlDocument(finalHtml)) {
    throw new Error(
      '工具入参 content 是上游错误页，不是可发布 HTML。请上游 AI 大脑重新生成完整页面后再调用工具。'
    );
  }

  return /^<!doctype html>/i.test(finalHtml) ? finalHtml : `<!DOCTYPE html>\n${finalHtml}`;
}
