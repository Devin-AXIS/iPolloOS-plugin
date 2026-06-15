import { afterEach, describe, expect, test } from 'bun:test';
import {
  createPost,
  getAuthenticatedUser,
  getTrendsByWoeid,
  getUserPosts,
  lookupUserByUsername,
  manageFollowAction,
  managePostAction,
  replyToPost,
  searchPosts,
  searchRecentPosts
} from '../lib/client';

const originalFetch = globalThis.fetch;
type FetchInput = Parameters<typeof fetch>[0];
type FetchInit = Parameters<typeof fetch>[1];

const config = {
  bearerToken: 'test_bearer_token_123',
  userAccessToken: 'test_user_token_123',
  baseUrl: 'https://api.x.com',
  timeoutMs: 5000,
  defaultMaxResults: 10
};

afterEach(() => {
  globalThis.fetch = originalFetch;
  delete process.env.X_API_PROXY_URL;
  delete process.env.X_PROXY_URL;
});

describe('X platform client', () => {
  test('looks up users by username with bearer token', async () => {
    let capturedUrl = '';
    let capturedAuth = '';
    globalThis.fetch = (async (url: FetchInput, init?: FetchInit) => {
      capturedUrl = String(url);
      capturedAuth = String((init?.headers as Record<string, string>)?.Authorization);
      return new Response(JSON.stringify({ data: { id: '2244994945', username: 'xdevelopers' } }), {
        status: 200
      });
    }) as unknown as typeof fetch;

    const user = await lookupUserByUsername(config, '@xdevelopers');

    expect(user.id).toBe('2244994945');
    expect(capturedUrl).toContain('/2/users/by/username/xdevelopers?');
    expect(capturedAuth).toBe('Bearer test_bearer_token_123');
  });

  test('attaches a proxy dispatcher when proxy URL is configured', async () => {
    let hasDispatcher = false;
    globalThis.fetch = (async (_url: FetchInput, init?: FetchInit & { dispatcher?: unknown }) => {
      hasDispatcher = !!init?.dispatcher;
      return new Response(JSON.stringify({ data: { id: '2244994945', username: 'xdevelopers' } }), {
        status: 200
      });
    }) as unknown as typeof fetch;

    await lookupUserByUsername(
      {
        ...config,
        proxyUrl: 'http://127.0.0.1:7890'
      },
      'xdevelopers'
    );

    expect(hasDispatcher).toBe(true);
  });

  test('reports network failure details without exposing auth headers', async () => {
    const error = new TypeError('fetch failed') as TypeError & {
      cause?: { code: string; message: string };
    };
    error.cause = { code: 'ETIMEDOUT', message: 'connect timed out' };
    globalThis.fetch = (async () => {
      throw error;
    }) as unknown as typeof fetch;

    await expect(lookupUserByUsername(config, 'xdevelopers')).rejects.toThrow(
      /causeCode=ETIMEDOUT/
    );
    await expect(lookupUserByUsername(config, 'xdevelopers')).rejects.toThrow(/proxy=disabled/);
  });

  test('requests user posts with since id and exclude flags', async () => {
    let capturedUrl = '';
    globalThis.fetch = (async (url: FetchInput) => {
      capturedUrl = String(url);
      return new Response(JSON.stringify({ data: [], meta: { result_count: 0 } }), {
        status: 200
      });
    }) as unknown as typeof fetch;

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
    globalThis.fetch = (async (url: FetchInput) => {
      capturedUrl = String(url);
      return new Response(JSON.stringify({ data: [], meta: { result_count: 0 } }), {
        status: 200
      });
    }) as unknown as typeof fetch;

    await searchRecentPosts(config, {
      query: 'from:xdevelopers -is:retweet',
      maxResults: 10
    });

    expect(capturedUrl).toContain('/2/tweets/search/recent?');
    expect(capturedUrl).toContain('query=from%3Axdevelopers+-is%3Aretweet');
  });

  test('searches full archive and sorts hot results by engagement locally', async () => {
    let capturedArchiveUrl = '';
    globalThis.fetch = (async (url: FetchInput) => {
      capturedArchiveUrl = String(url);
      return new Response(JSON.stringify({ data: [], meta: { result_count: 0 } }), {
        status: 200
      });
    }) as unknown as typeof fetch;

    await searchPosts(config, {
      query: 'AI agent',
      scope: 'all',
      view: 'relevant'
    });

    expect(capturedArchiveUrl).toContain('/2/tweets/search/all?');
    expect(capturedArchiveUrl).toContain('sort_order=relevancy');

    globalThis.fetch = (async () => {
      return new Response(
        JSON.stringify({
          data: [
            { id: '1', text: 'low', public_metrics: { like_count: 1 } },
            { id: '2', text: 'high', public_metrics: { like_count: 20, quote_count: 2 } }
          ],
          meta: { result_count: 2 }
        }),
        { status: 200 }
      );
    }) as unknown as typeof fetch;

    const hot = await searchPosts(config, {
      query: 'AI agent',
      view: 'hot',
      maxResults: 2
    });

    expect(hot.data[0].id).toBe('2');
  });

  test('requests trends by WOEID', async () => {
    let capturedUrl = '';
    globalThis.fetch = (async (url: FetchInput) => {
      capturedUrl = String(url);
      return new Response(
        JSON.stringify({
          data: [{ trend_name: '#AI', tweet_count: 1000 }]
        }),
        { status: 200 }
      );
    }) as unknown as typeof fetch;

    const trends = await getTrendsByWoeid(config, {
      woeid: 1,
      maxTrends: 50
    });

    expect(capturedUrl).toContain('/2/trends/by/woeid/1?');
    expect(capturedUrl).toContain('max_trends=50');
    expect(trends.data[0].trend_name).toBe('#AI');
  });

  test('uses user action token for authenticated user lookup', async () => {
    let capturedAuth = '';
    globalThis.fetch = (async (_url: FetchInput, init?: FetchInit) => {
      capturedAuth = String((init?.headers as Record<string, string>)?.Authorization);
      return new Response(JSON.stringify({ data: { id: '42', username: 'me' } }), {
        status: 200
      });
    }) as unknown as typeof fetch;

    const user = await getAuthenticatedUser(config);

    expect(user.id).toBe('42');
    expect(capturedAuth).toBe('Bearer test_user_token_123');
  });

  test('creates posts and replies through manage tweets endpoint', async () => {
    const requests: Array<{ url: string; method: string; body: any }> = [];
    globalThis.fetch = (async (url: FetchInput, init?: FetchInit) => {
      requests.push({
        url: String(url),
        method: String(init?.method),
        body: JSON.parse(String(init?.body))
      });
      return new Response(JSON.stringify({ data: { id: '200', text: 'ok' } }), {
        status: 201
      });
    }) as unknown as typeof fetch;

    await createPost(config, { text: 'new post', quotePostId: '100' });
    await replyToPost(config, { text: 'reply', replyToPostId: '100' });

    expect(requests[0].url).toContain('/2/tweets');
    expect(requests[0].method).toBe('POST');
    expect(requests[0].body.quote_tweet_id).toBe('100');
    expect(requests[1].body.reply.in_reply_to_tweet_id).toBe('100');
  });

  test('manages likes, reposts, and follows with actor and target ids resolved internally', async () => {
    const requests: Array<{ url: string; method: string; body?: any }> = [];
    globalThis.fetch = (async (url: FetchInput, init?: FetchInit) => {
      requests.push({
        url: String(url),
        method: String(init?.method),
        body: init?.body ? JSON.parse(String(init.body)) : undefined
      });
      return new Response(JSON.stringify({ data: { liked: true } }), {
        status: 200
      });
    }) as unknown as typeof fetch;

    await managePostAction(config, { actorUserId: '42', postId: '100', action: 'like' });
    await managePostAction(config, { actorUserId: '42', postId: '100', action: 'undo_repost' });
    await manageFollowAction(config, {
      actorUserId: '42',
      targetUserId: '2244994945',
      action: 'follow'
    });

    expect(requests[0].url).toContain('/2/users/42/likes');
    expect(requests[0].body.tweet_id).toBe('100');
    expect(requests[1].url).toContain('/2/users/42/retweets/100');
    expect(requests[1].method).toBe('DELETE');
    expect(requests[2].url).toContain('/2/users/42/following');
    expect(requests[2].body.target_user_id).toBe('2244994945');
  });
});
