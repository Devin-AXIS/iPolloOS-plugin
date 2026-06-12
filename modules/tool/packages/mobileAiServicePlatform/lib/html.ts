const HTML_FENCE_RE = /```(?:html)?\s*([\s\S]*?)```/i;

export function extractHtml(raw: string): string {
  const fenced = raw.match(HTML_FENCE_RE)?.[1]?.trim();
  const text = fenced || raw.trim();
  const docStart = text.search(/<!doctype html>|<html[\s>]/i);
  const html = docStart >= 0 ? text.slice(docStart).trim() : text;
  const docEnd = html.search(/<\/html>/i);
  const finalHtml = docEnd >= 0 ? html.slice(0, docEnd + '</html>'.length).trim() : html;

  if (!/<html[\s>]/i.test(finalHtml) || !/<\/html>/i.test(finalHtml)) {
    throw new Error('AI app output is not a complete HTML document');
  }
  if (!/<meta\s+name=["']viewport["']/i.test(finalHtml)) {
    throw new Error('AI app output missing mobile viewport meta');
  }
  return finalHtml;
}

export function buildCoverJson(props: {
  title: string;
  description: string;
  mode: string;
  language: string;
}): string {
  return JSON.stringify({
    title: props.title.slice(0, 80),
    description: props.description.slice(0, 160),
    eyebrow: '移动 AI 服务',
    variant: 'summary',
    status: '已生成',
    actionLabel: '打开',
    accentColor: '#8b5cf6',
    chips: ['Mobile', 'AI', props.mode, props.language].filter(Boolean).slice(0, 4)
  });
}
