import { describe, expect, test } from 'bun:test';
import {
  XActionConfigSchema,
  XConfigSchema,
  XPostListResponseSchema,
  XReadConfigSchema,
  cleanUsername
} from '../lib/schemas';

describe('X platform schemas', () => {
  test('fills default config and normalizes usernames', () => {
    const config = XConfigSchema.parse({
      bearerToken: 'xox_test_bearer_token'
    });

    expect(config.baseUrl).toBe('https://api.x.com');
    expect(config.proxyUrl).toBeUndefined();
    expect(config.timeoutMs).toBe(15000);
    expect(config.defaultMaxResults).toBe(10);
    expect(cleanUsername('@xdevelopers')).toBe('xdevelopers');
  });

  test('accepts optional proxy URL for restricted network environments', () => {
    const config = XConfigSchema.parse({
      bearerToken: 'xox_test_bearer_token',
      proxyUrl: 'http://127.0.0.1:7890'
    });

    expect(config.proxyUrl).toBe('http://127.0.0.1:7890');
  });

  test('keeps read and action tokens separated by capability', () => {
    expect(
      XReadConfigSchema.parse({
        bearerToken: 'xox_test_bearer_token'
      }).bearerToken
    ).toBe('xox_test_bearer_token');

    expect(
      XActionConfigSchema.parse({
        userAccessToken: 'xox_user_action_token'
      }).userAccessToken
    ).toBe('xox_user_action_token');

    expect(() => XReadConfigSchema.parse({})).toThrow();
    expect(() => XActionConfigSchema.parse({ bearerToken: 'xox_test_bearer_token' })).toThrow();
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
