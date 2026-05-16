export function isLikelyFullHtml(s: string): boolean {
  const t = s.trimStart().slice(0, 64).toLowerCase();
  return t.startsWith('<!doctype') || t.startsWith('<html');
}
