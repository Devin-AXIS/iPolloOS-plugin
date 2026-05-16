import { describe, expect, test } from 'bun:test';
import { parseFilesJson } from '../lib/deployFromFiles';

describe('parseFilesJson', () => {
  test('accepts text file', () => {
    const r = parseFilesJson('[{"path":"a.txt","text":"hi"}]');
    expect('error' in r).toBe(false);
    if (!('error' in r)) expect(r).toEqual([{ path: 'a.txt', text: 'hi' }]);
  });
  test('rejects path traversal', () => {
    const r = parseFilesJson('[{"path":"../x","text":"a"}]');
    expect(r).toEqual({ error: '非法路径：../x' });
  });
});
