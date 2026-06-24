import { afterEach, describe, expect, test } from 'vitest';
import { tool as accountXOverview } from '../children/accountXOverview/src';
import { tool as checkAccountUpdates } from '../children/checkAccountUpdates/src';
import { tool as getXTrends } from '../children/getXTrends/src';
import { tool as manageXFollow } from '../children/manageXFollow/src';
import { tool as manageXPost } from '../children/manageXPost/src';
import { tool as publishXPost } from '../children/publishXPost/src';
import { tool as queryXContent } from '../children/queryXContent/src';
import { tool as replyXPost } from '../children/replyXPost/src';
import { tool as searchXPosts } from '../children/searchXPosts/src';

const originalFetch = globalThis.fetch;
type FetchInput = Parameters<typeof fetch>[0];

const base = {
  bearerToken: 'test_bearer_token_123',
  userAccessToken: 'test_user_token_123',
  baseUrl: 'https://api.x.com',
  timeoutMs: 5000,
  defaultMaxResults: 10
};

afterEach(() => {
  globalThis.fetch = originalFetch;
});

describe('X platform tools', () => {
  test('keeps monitor polling active when account list is empty', async () => {
    let requestCount = 0;
    globalThis.fetch = (async () => {
      requestCount += 1;
      return new Response('{}', { status: 500 });
    }) as unknown as typeof fetch;

    const result = await checkAccountUpdates({
      ...base,
      username: '',
      state_json: '{}',
      max_results: 5,
      include_replies: false,
      include_retweets: false
    });

    expect(requestCount).toBe(0);
    expect(JSON.parse(result.events_json)).toEqual([]);
    expect(result.count).toBe(0);
    expect(result.system_error).toBeUndefined();
    expect(result.summary_markdown).toContain('没有配置 X 监控账号');
  });

  test('checks account updates and returns events plus next state', async () => {
    globalThis.fetch = (async (url: FetchInput) => {
      const textUrl = String(url);
      if (textUrl.includes('/2/users/by/username/xdevelopers')) {
        return new Response(
          JSON.stringify({
            data: {
              id: '2244994945',
              username: 'xdevelopers',
              name: 'X Developers'
            }
          }),
          { status: 200 }
        );
      }

      return new Response(
        JSON.stringify({
          data: [
            {
              id: '101',
              text: 'New post',
              author_id: '2244994945',
              created_at: '2026-06-09T00:01:00Z'
            }
          ],
          includes: {
            users: [
              {
                id: '2244994945',
                username: 'xdevelopers',
                name: 'X Developers'
              }
            ]
          },
          meta: {
            result_count: 1,
            newest_id: '101'
          }
        }),
        { status: 200 }
      );
    }) as unknown as typeof fetch;

    const result = await checkAccountUpdates({
      ...base,
      username: 'xdevelopers',
      state_json: '{"lastPostId":"100"}',
      max_results: 5,
      include_replies: false,
      include_retweets: false
    });

    const events = JSON.parse(result.events_json);
    const state = JSON.parse(result.next_state_json);

    expect(events).toHaveLength(1);
    expect(events[0].dedupeKey).toBe('x:post:101');
    expect(state.lastPostId).toBe('101');
    expect(result.count).toBe(1);
  });

  test('checks multiple accounts with separate cursors in one monitor run', async () => {
    const timelineRequests: string[] = [];
    globalThis.fetch = (async (url: FetchInput) => {
      const textUrl = String(url);
      if (textUrl.includes('/2/users/by/username/xdevelopers')) {
        return new Response(
          JSON.stringify({ data: { id: '1', username: 'xdevelopers', name: 'X Developers' } }),
          { status: 200 }
        );
      }
      if (textUrl.includes('/2/users/by/username/openai')) {
        return new Response(JSON.stringify({ data: { id: '2', username: 'openai' } }), {
          status: 200
        });
      }

      timelineRequests.push(textUrl);
      if (textUrl.includes('/2/users/1/tweets')) {
        return new Response(
          JSON.stringify({
            data: [{ id: '101', text: 'X dev post', author_id: '1' }],
            includes: { users: [{ id: '1', username: 'xdevelopers' }] },
            meta: { result_count: 1 }
          }),
          { status: 200 }
        );
      }

      return new Response(
        JSON.stringify({
          data: [{ id: '202', text: 'OpenAI post', author_id: '2' }],
          includes: { users: [{ id: '2', username: 'openai' }] },
          meta: { result_count: 1 }
        }),
        { status: 200 }
      );
    }) as unknown as typeof fetch;

    const result = await checkAccountUpdates({
      ...base,
      username: 'xdevelopers, @openai',
      max_results: 10,
      include_replies: false,
      include_retweets: false,
      state_json: JSON.stringify({
        accounts: {
          xdevelopers: { userId: '1', username: 'xdevelopers', lastPostId: '100' },
          openai: { userId: '2', username: 'openai', lastPostId: '200' }
        }
      })
    });

    const events = JSON.parse(result.events_json);
    const state = JSON.parse(result.next_state_json);

    expect(events).toHaveLength(2);
    expect(state.accounts.xdevelopers.lastPostId).toBe('101');
    expect(state.accounts.openai.lastPostId).toBe('202');
    expect(timelineRequests[0]).toContain('since_id=100');
    expect(timelineRequests[1]).toContain('since_id=200');
    expect(result.summary_markdown).toContain('@xdevelopers');
    expect(result.summary_markdown).toContain('@openai');
  });

  test('queries profile mode without making timeline requests', async () => {
    let requestCount = 0;
    globalThis.fetch = (async () => {
      requestCount += 1;
      return new Response(
        JSON.stringify({
          data: {
            id: '2244994945',
            username: 'xdevelopers',
            name: 'X Developers'
          }
        }),
        { status: 200 }
      );
    }) as unknown as typeof fetch;

    const result = await queryXContent({
      ...base,
      mode: 'user_by_username',
      username: '@xdevelopers',
      max_results: 10,
      include_replies: true,
      include_retweets: true
    });

    expect(requestCount).toBe(1);
    expect(result.users_json).toContain('xdevelopers');
    expect(result.answer_markdown).toContain('@xdevelopers');
  });

  test('returns account overview by username list', async () => {
    globalThis.fetch = (async (url: FetchInput) => {
      const textUrl = String(url);
      if (textUrl.includes('/2/users/by/username/xdevelopers')) {
        return new Response(
          JSON.stringify({
            data: {
              id: '2244994945',
              username: 'xdevelopers',
              name: 'X Developers',
              public_metrics: { followers_count: 10, following_count: 2, tweet_count: 3 }
            }
          }),
          { status: 200 }
        );
      }

      return new Response(
        JSON.stringify({
          data: [
            {
              id: '101',
              text: 'Latest post',
              author_id: '2244994945',
              created_at: '2026-06-09T00:01:00Z'
            }
          ],
          includes: { users: [{ id: '2244994945', username: 'xdevelopers' }] },
          meta: { result_count: 1 }
        }),
        { status: 200 }
      );
    }) as unknown as typeof fetch;

    const result = await accountXOverview({
      ...base,
      username: '@xdevelopers'
    });

    expect(result.result_count).toBe(1);
    expect(result.summary_markdown).toContain('@xdevelopers');
    expect(result.source_links).toContain('https://x.com/xdevelopers/status/101');
  });

  test('searches X posts and returns trend list', async () => {
    globalThis.fetch = (async (url: FetchInput) => {
      const textUrl = String(url);
      if (
        textUrl.includes('/2/trends/by/woeid/1') ||
        textUrl.includes('/2/trends/by/woeid/23424977')
      ) {
        return new Response(
          JSON.stringify({
            data: [
              { trend_name: '#OpenAI', tweet_count: 1000 },
              { trend_name: '#Bitcoin', tweet_count: 900 },
              { trend_name: '#Sports', tweet_count: 800 }
            ]
          }),
          { status: 200 }
        );
      }

      return new Response(
        JSON.stringify({
          data: [{ id: '101', text: 'Hot post', author_id: '1' }],
          includes: { users: [{ id: '1', username: 'ai' }] },
          meta: { result_count: 1 }
        }),
        { status: 200 }
      );
    }) as unknown as typeof fetch;

    const search = await searchXPosts({
      ...base,
      query: 'AI agent',
      view: 'latest',
      scope: 'recent'
    });
    const trends = await getXTrends({
      ...base,
      region: 'United States',
      topic: 'AI'
    });

    expect(search.result_count).toBe(1);
    expect(search.answer_markdown).toContain('Hot post');
    expect(trends.result_count).toBe(1);
    expect(trends.trends_markdown).toContain('#OpenAI');
    expect(trends.trends_markdown).not.toContain('#Bitcoin');
    expect(trends.matched_keywords).toContain('openai');
  });

  test('returns a clear write-token error before publishing without user access token', async () => {
    let requestCount = 0;
    globalThis.fetch = (async () => {
      requestCount += 1;
      return new Response(JSON.stringify({ data: { id: '201', text: 'ok' } }), {
        status: 201
      });
    }) as unknown as typeof fetch;

    const result = await publishXPost({
      bearerToken: 'test_bearer_token_123',
      text: 'new post'
    });

    expect(result.success).toBe(false);
    expect(result.system_error).toContain('userAccessToken');
    expect(requestCount).toBe(0);
  });

  test('returns clear write-token errors for post actions', async () => {
    let requestCount = 0;
    globalThis.fetch = (async () => {
      requestCount += 1;
      return new Response(JSON.stringify({ data: { reposted: true } }), {
        status: 200
      });
    }) as unknown as typeof fetch;

    const result = await manageXPost({
      bearerToken: 'test_bearer_token_123',
      action: 'repost',
      post_id: '100'
    });

    expect(result.success).toBe(false);
    expect(result.system_error).toContain('userAccessToken');
    expect(requestCount).toBe(0);
  });

  test('publishes and replies to X posts', async () => {
    globalThis.fetch = (async () => {
      return new Response(JSON.stringify({ data: { id: '201', text: 'ok' } }), {
        status: 201
      });
    }) as unknown as typeof fetch;

    const published = await publishXPost({
      ...base,
      text: 'new post'
    });
    const replied = await replyXPost({
      ...base,
      reply_to_post_id: '100',
      text: 'reply'
    });

    expect(published.success).toBe(true);
    expect(published.post_id).toBe('201');
    expect(replied.success).toBe(true);
    expect(replied.post_url).toContain('/201');
  });

  test('manages post actions without user-visible actor id', async () => {
    const requests: string[] = [];
    globalThis.fetch = (async (url: FetchInput) => {
      requests.push(String(url));
      if (String(url).includes('/2/users/me')) {
        return new Response(JSON.stringify({ data: { id: '42', username: 'me' } }), {
          status: 200
        });
      }
      return new Response(JSON.stringify({ data: { liked: true } }), {
        status: 200
      });
    }) as unknown as typeof fetch;

    const result = await manageXPost({
      ...base,
      action: 'like',
      post_id: '100'
    });

    expect(result.success).toBe(true);
    expect(requests[0]).toContain('/2/users/me');
    expect(requests[1]).toContain('/2/users/42/likes');
  });

  test('manages follows with username only', async () => {
    const requests: string[] = [];
    globalThis.fetch = (async (url: FetchInput) => {
      const textUrl = String(url);
      requests.push(textUrl);
      if (textUrl.includes('/2/users/me')) {
        return new Response(JSON.stringify({ data: { id: '42', username: 'me' } }), {
          status: 200
        });
      }
      if (textUrl.includes('/2/users/by/username/xdevelopers')) {
        return new Response(
          JSON.stringify({ data: { id: '2244994945', username: 'xdevelopers' } }),
          { status: 200 }
        );
      }
      return new Response(JSON.stringify({ data: { following: true } }), {
        status: 200
      });
    }) as unknown as typeof fetch;

    const result = await manageXFollow({
      ...base,
      action: 'follow',
      target_username: '@xdevelopers'
    });

    expect(result.success).toBe(true);
    expect(result.target_user_id).toBe('2244994945');
    expect(requests[0]).toContain('/2/users/me');
    expect(requests[1]).toContain('/2/users/by/username/xdevelopers');
    expect(requests[2]).toContain('/2/users/42/following');
  });
});
