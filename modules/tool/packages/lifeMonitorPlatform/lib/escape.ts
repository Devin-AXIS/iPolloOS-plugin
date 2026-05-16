export function escapeHtml(raw: string): string {
  return raw
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

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
