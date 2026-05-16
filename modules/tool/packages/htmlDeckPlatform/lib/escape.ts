/** 防 XSS：纯文本字段统一走这里 */
export function escapeHtml(raw: string): string {
  return raw
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/** 宽松清理 URL：仅允许 http(s) / data:image / 相对路径慎用 — 这里只拦 obvious javascript: */
export function sanitizeImageUrl(url: string): string {
  const t = url.trim();
  if (!t) return '';
  const lower = t.slice(0, 12).toLowerCase();
  if (lower.startsWith('javascript:') || lower.startsWith('vbscript:')) return '';
  return t;
}
