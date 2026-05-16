/** 用 emoji 生成 data:image/svg+xml favicon（UTF-8 + encodeURIComponent） */
export function faviconDataUrlFromEmoji(emoji: string): string {
  const ch = [...emoji.trim()][0] ?? '·';
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><text y="0.85em" font-size="85" font-family="system-ui,sans-serif">${escapeXmlText(ch)}</text></svg>`;
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
}

function escapeXmlText(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/"/g, '&quot;');
}
