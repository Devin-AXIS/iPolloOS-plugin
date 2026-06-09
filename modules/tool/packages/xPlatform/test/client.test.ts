import { afterEach, describe, expect, test } from 'bun:test';
import { getUserPosts, lookupUserByUsername, searchRecentPosts } from '../lib/client';

const originalFetch = globalThis.fetch;

const config = {
  bearerToken: 'test_bearer_token_123',
  baseUrl: 'https://api.x.com',
  timeoutMs: 5000,
  defaultMaxResults: 10
};

afterEach(() => {
  globalThis.fetch = originalFetch;
});

describe('X platform client', () => {
  test('looks up users by username with bearer token', async () => {
    let capturedUrl = '';
    let capturedAuth = '';
    globalThis.fetch = (async (url, init) => {
      capturedUrl = String(url);
      capturedAuth = String((init?.headers as Record<string, string>)?.Authorization);
      return new Response(JSON.stringify({ data: { id: '2244994945', username: 'xdevelopers' } }), {
        status: 200
      });
    }) as typeof fetch;

    const user = await lookupUserByUsername(config, '@xdevelopers');

    expect(user.id).toBe('2244994945');
    expect(capturedUrl).toContain('/2/users/by/username/xdevelopers?');
    expect(capturedAuth).toBe('Bearer test_bearer_token_123');
  });

  test('requests user posts with since id and exclude flags', async () => {
    let capturedUrl = '';
    globalThis.fetch = (async (url) => {
      capturedUrl = String(url);
      return new Response(JSON.stringify({ data: [], meta: { result_count: 0 } }), {
        status: 200
      });
    }) as typeof fetch;

    await getUserPosts(config, {
      userId: '2244994945',
      maxResults: 5,
      sinceId: '100',
      includeReplies: false,
      includeRetweets: false
    });

    expect(capturedUrl).toContain('/2/users/2244994945/tweets?');
    expect(capturedUrl).toContain('since_id=100');
    expect(capturedUrl).toContain('exclude=retweets%2Creplies');
  });

  test('requests recent search with query', async () => {
    let capturedUrl = '';
    globalThis.fetch = (async (url) => {
      capturedUrl = String(url);
      return new Response(JSON.stringify({ data: [], meta: { result_count: 0 } }), {
        status: 200
      });
    }) as typeof fetch;

    await searchRecentPosts(config, {
      query: 'from:xdevelopers -is:retweet',
      maxResults: 10
    });

    expect(capturedUrl).toContain('/2/tweets/search/recent?');
    expect(capturedUrl).toContain('query=from%3Axdevelopers+-is%3Aretweet');
  });
});
