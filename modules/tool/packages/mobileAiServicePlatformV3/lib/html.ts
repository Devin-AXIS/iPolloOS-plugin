const HTML_FENCE_RE = /```(?:html)?\s*([\s\S]*?)```/i;

export function extractHtml(raw: string): string {
  const fenced = raw.match(HTML_FENCE_RE)?.[1]?.trim();
  const text = fenced || raw.trim();
  const docStart = text.search(/<!doctype html>|<html[\s>]/i);
  const html = docStart >= 0 ? text.slice(docStart).trim() : text;
  const docEnd = html.search(/<\/html>/i);
  const finalHtml = docEnd >= 0 ? html.slice(0, docEnd + '</html>'.length).trim() : html;

  if (!/<html[\s>]/i.test(finalHtml) || !/<\/html>/i.test(finalHtml)) {
    throw new Error(
      '工具入参 generated_html 不是完整 HTML。请由上游 AI 大脑重新生成包含 <!DOCTYPE html><html><head>...</head><body>...</body></html> 的完整移动端单文件 HTML 后，再调用本工具。'
    );
  }
  if (!/<meta\s+name=["']viewport["']/i.test(finalHtml)) {
    throw new Error('工具入参 generated_html 缺少移动端 viewport meta。请上游 AI 大脑补全后重试。');
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
