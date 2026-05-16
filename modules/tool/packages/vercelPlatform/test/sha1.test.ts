import { describe, expect, test } from 'bun:test';
import { sha1Hex } from '../lib/sha1';

describe('sha1Hex', () => {
  test('matches known digest for abc', () => {
    expect(sha1Hex(Buffer.from('abc', 'utf8'))).toBe('a9993e364706816aba3e25717850c26c9cd0d89d');
  });
});
