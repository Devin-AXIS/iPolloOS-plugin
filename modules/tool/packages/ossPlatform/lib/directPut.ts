import type OSS from 'ali-oss';
import { presignPutRequest } from './presign';

/**
 * 使用预签名 PUT + fetch 上传，避免部分运行时（如 Bun）走 ali-oss/urllib 时丢失 Content-Length。
 */
export async function putObjectViaPresignedFetch(
  client: OSS,
  objectKey: string,
  body: Buffer,
  opts: {
    contentType: string;
    attachObject: boolean;
    filenameAscii: string;
    expiresSeconds?: number;
  }
): Promise<void> {
  const exp = opts.expiresSeconds ?? 3600;
  const extra: Record<string, string> = {};
  if (opts.attachObject) {
    const name = opts.filenameAscii.replace(/[^\x20-\x7E]/g, '_');
    extra['Content-Disposition'] = `attachment; filename="${name}"`;
  }

  const { url, headers } = await presignPutRequest(client, objectKey, exp, {
    contentType: opts.contentType,
    extraSignedHeaders: Object.keys(extra).length ? extra : undefined
  });

  const res = await fetch(url, {
    method: 'PUT',
    headers,
    body
  });

  if (!res.ok) {
    const txt = await res.text().catch(() => '');
    throw new Error(`OSS upload failed HTTP ${res.status}: ${txt.slice(0, 800) || res.statusText}`);
  }
}
