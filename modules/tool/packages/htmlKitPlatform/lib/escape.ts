/** 防 XSS：插入到 HTML 文本节点 / 属性时需转义 */
export function escapeHtml(raw: string): string {
  return raw
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/** favicon 仅允许 http(s)，拦 javascript: 等 */
export function sanitizeHttpUrl(url: string): string {
  const t = url.trim();
  if (!t) return '';
  const lower = t.slice(0, 16).toLowerCase();
  if (
    lower.startsWith('javascript:') ||
    lower.startsWith('vbscript:') ||
    lower.startsWith('data:')
  ) {
    return '';
  }
  if (!/^https?:\/\//i.test(t)) return '';
  return t;
}
