/** 共享：路径规范化、跳过规则、文本/二进制判定 */

export function normalizeArchivePath(raw: string): string | null {
  const normalized = raw.replace(/\\/g, '/').replace(/^\/+/, '');
  if (!normalized || normalized.includes('../')) return null;
  return normalized;
}

export function shouldSkipArchivePath(normalized: string): boolean {
  const lower = normalized.toLowerCase();
  if (lower.includes('__macosx/')) return true;
  if (lower.endsWith('.ds_store')) return true;
  return false;
}

/** 小文件且像文本时走 UTF-8 直出，否则 base64 */
export function bufferToPayload(
  buf: Buffer,
  maxTextBytes = 512 * 1024
): { mode: 'text'; text: string } | { mode: 'base64'; base64: string } {
  if (buf.length <= maxTextBytes && isProbablyUtf8Text(buf)) {
    return { mode: 'text', text: buf.toString('utf8') };
  }
  return { mode: 'base64', base64: buf.toString('base64') };
}

function isProbablyUtf8Text(buf: Buffer): boolean {
  const n = Math.min(8192, buf.length);
  if (n === 0) return true;
  let ctrl = 0;
  for (let i = 0; i < n; i++) {
    const c = buf[i]!;
    if (c === 0) return false;
    if (c < 9 || (c > 13 && c < 32)) ctrl++;
  }
  return ctrl / n < 0.02;
}

const EXT_MIME: Record<string, string> = {
  html: 'text/html',
  htm: 'text/html',
  css: 'text/css',
  js: 'application/javascript',
  json: 'application/json',
  txt: 'text/plain',
  md: 'text/markdown',
  xml: 'application/xml',
  png: 'image/png',
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  gif: 'image/gif',
  webp: 'image/webp',
  svg: 'image/svg+xml',
  pdf: 'application/pdf',
  zip: 'application/zip'
};

export function guessMimeFromPath(path: string): string {
  const base = path.replace(/^.*\//, '');
  const dot = base.lastIndexOf('.');
  if (dot <= 0 || dot === base.length - 1) return 'application/octet-stream';
  const ext = base.slice(dot + 1).toLowerCase();
  return EXT_MIME[ext] ?? 'application/octet-stream';
}
