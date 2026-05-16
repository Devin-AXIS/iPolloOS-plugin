import { createHash } from 'node:crypto';

export function sha1Hex(buf: Buffer): string {
  return createHash('sha1').update(buf).digest('hex');
}
