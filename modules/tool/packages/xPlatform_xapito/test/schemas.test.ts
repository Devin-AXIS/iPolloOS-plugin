import { describe, expect, test } from 'vitest';
import {
  XActionConfigSchema,
  XConfigSchema,
  XPostListResponseSchema,
  XReadConfigSchema,
  cleanUsername,
  parseXUsernames
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

  test('parses usernames separated by commas, spaces, real newlines, and escaped newlines', () => {
    expect(parseXUsernames('@saijin0525,@web3ammmyyy')).toEqual([
      'saijin0525',
      'web3ammmyyy'
    ]);
    expect(parseXUsernames('@saijin0525 @web3ammmyyy')).toEqual([
      'saijin0525',
      'web3ammmyyy'
    ]);
    expect(parseXUsernames('@saijin0525\n@web3ammmyyy')).toEqual([
      'saijin0525',
      'web3ammmyyy'
    ]);
    expect(parseXUsernames('@saijin0525/n@web3ammmyyy')).toEqual([
      'saijin0525',
      'web3ammmyyy'
    ]);
    expect(parseXUsernames('@saijin0525\\n@web3ammmyyy，@SAIJIN0525')).toEqual([
      'saijin0525',
      'web3ammmyyy'
    ]);
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

    expect(
      XActionConfigSchema.parse({
        userAccessToken: 'oauth1_user_token',
        userAccessTokenSecret: 'oauth1_user_secret',
        consumerKey: 'oauth1_consumer_key',
        consumerSecret: 'oauth1_consumer_secret'
      }).userAccessTokenSecret
    ).toBe('oauth1_user_secret');

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
