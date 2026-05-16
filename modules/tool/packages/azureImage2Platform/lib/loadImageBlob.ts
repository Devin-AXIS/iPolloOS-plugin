import { Buffer } from 'node:buffer';

const MAX_BYTES = 50 * 1024 * 1024;

function extFromMime(mime: string): string {
  const m = mime.toLowerCase();
  if (m.includes('jpeg') || m.includes('jpg')) return 'jpg';
  if (m.includes('webp')) return 'webp';
  return 'png';
}

/** 支持 HTTPS URL、data:image/...;base64、或纯 base64 字符串 */
export async function loadImageBlob(input: string): Promise<{ blob: Blob; filename: string }> {
  const t = input.trim();
  if (!t) {
    throw new Error('图片输入为空');
  }

  if (t.startsWith('data:')) {
    const semi = t.indexOf(';');
    const comma = t.indexOf(',');
    if (semi < 5 || comma < semi) {
      throw new Error('data URL 格式无效');
    }
    const mime = t.slice(5, semi);
    const meta = t.slice(semi + 1, comma);
    if (!meta.toLowerCase().includes('base64')) {
      throw new Error('仅支持 base64 的 data URL');
    }
    const b64 = t.slice(comma + 1);
    const buf = Buffer.from(b64, 'base64');
    if (buf.byteLength > MAX_BYTES) {
      throw new Error('图片超过 50MB 限制');
    }
    const ext = extFromMime(mime);
    return { blob: new Blob([buf], { type: mime || 'image/png' }), filename: `input.${ext}` };
  }

  if (/^https?:\/\//i.test(t)) {
    const res = await fetch(t);
    if (!res.ok) {
      throw new Error(`下载图片失败 HTTP ${res.status}`);
    }
    const buf = Buffer.from(await res.arrayBuffer());
    if (buf.byteLength > MAX_BYTES) {
      throw new Error('图片超过 50MB 限制');
    }
    const ct = res.headers.get('content-type')?.split(';')[0]?.trim() || 'image/png';
    const ext = extFromMime(ct);
    return { blob: new Blob([buf], { type: ct }), filename: `input.${ext}` };
  }

  const buf = Buffer.from(t, 'base64');
  if (buf.byteLength > MAX_BYTES) {
    throw new Error('图片超过 50MB 限制');
  }
  return { blob: new Blob([buf], { type: 'image/png' }), filename: 'input.png' };
}
