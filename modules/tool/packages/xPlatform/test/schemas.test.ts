import { describe, expect, test } from 'bun:test';
import { XConfigSchema, XPostListResponseSchema, cleanUsername } from '../lib/schemas';

describe('X platform schemas', () => {
  test('fills default config and normalizes usernames', () => {
    const config = XConfigSchema.parse({
      bearerToken: 'xox_test_bearer_token'
    });

    expect(config.baseUrl).toBe('https://api.x.com');
    expect(config.timeoutMs).toBe(15000);
    expect(config.defaultMaxResults).toBe(10);
    expect(cleanUsername('@xdevelopers')).toBe('xdevelopers');
  });

  test('parses post list responses with missing optional sections', () => {
    const response = XPostListResponseSchema.parse({
      data: [
        {
          id: '100',
          text: 'Hello X'
        }
      ],
      meta: {
        result_count: 1
      }
    });

    expect(response.data).toHaveLength(1);
    expect(response.meta?.result_count).toBe(1);
  });
});
