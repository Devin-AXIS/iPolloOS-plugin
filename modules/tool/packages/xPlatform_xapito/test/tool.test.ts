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

const xapiUser = (id: string, username: string, extra: Record<string, unknown> = {}) => ({
  data: {
    user: {
      result: {
        rest_id: id,
        legacy: {
          screen_name: username,
          name: username,
          ...extra
        }
      }
    }
  }
});

const xapiPost = ({
  id,
  text,
  userId,
  username,
  createdAt
}: {
  id: string;
  text: string;
  userId: string;
  username: string;
  createdAt?: string;
}) => ({
  rest_id: id,
  legacy: {
    full_text: text,
    created_at: createdAt,
    user_id_str: userId
  },
  core: {
    user_results: {
      result: {
        rest_id: userId,
        legacy: {
          screen_name: username,
          name: username
        }
      }
    }
  }
});

const xapiPosts = (posts: ReturnType<typeof xapiPost>[]) => ({
  data: {
    timeline: {
      instructions: posts.map((post) => ({
        itemContent: {
          tweet_results: {
            result: post
          }
        }
      }))
    }
  }
});

afterEach(() => {
  globalThis.fetch = originalFetch;
});

describe('X platform tools', () => {
  test('checks account updates and returns events plus next state', async () => {
    globalThis.fetch = (async (url: FetchInput) => {
      const textUrl = String(url);
      if (textUrl.includes('/base/apitools/userByScreenNameV2')) {
        return new Response(JSON.stringify(xapiUser('2244994945', 'xdevelopers')), {
          status: 200
        });
      }

      return new Response(
        JSON.stringify(
          xapiPosts([
            xapiPost({
              id: '101',
              text: 'New post',
              userId: '2244994945',
              username: 'xdevelopers',
              createdAt: '2026-06-09T00:01:00Z'
            })
          ])
        ),
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
    expect(events[0].dedupeKey).toBe('x:2244994945:101');
    expect(result.latest_content_text).toBe('New post');
    expect(result.latest_account_username).toBe('xdevelopers');
    expect(result.latest_post_id).toBe('101');
    expect(state.lastPostId).toBe('101');
    expect(result.count).toBe(1);
  });

  test('checks multiple accounts with separate cursors in one monitor run', async () => {
    const timelineRequests: string[] = [];
    globalThis.fetch = (async (url: FetchInput) => {
      const textUrl = String(url);
      timelineRequests.push(textUrl);
      if (textUrl.includes('userId=1')) {
        return new Response(
          JSON.stringify([
            xapiPost({ id: '101', text: 'X dev post', userId: '1', username: 'xdevelopers' })
          ]),
          { status: 200 }
        );
      }

      return new Response(
        JSON.stringify([
          xapiPost({ id: '202', text: 'OpenAI post', userId: '2', username: 'openai' })
        ]),
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
    expect(timelineRequests[0]).toContain('userId=1');
    expect(timelineRequests[1]).toContain('userId=2');
    expect(result.latest_content_text).toBe('OpenAI post');
    expect(result.latest_account_username).toBe('openai');
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
      if (textUrl.includes('/base/apitools/userByScreenNameV2')) {
        return new Response(
          JSON.stringify(
            xapiUser('2244994945', 'xdevelopers', {
              followers_count: 10,
              friends_count: 2,
              statuses_count: 3
            })
          ),
          { status: 200 }
        );
      }

      return new Response(
        JSON.stringify(
          xapiPosts([
            xapiPost({
              id: '101',
              text: 'Latest post',
              userId: '2244994945',
              username: 'xdevelopers',
              createdAt: '2026-06-09T00:01:00Z'
            })
          ])
        ),
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
      if (textUrl.includes('/base/apitools/userByScreenNameV2')) {
        return new Response(JSON.stringify(xapiUser('2244994945', 'xdevelopers')), {
          status: 200
        });
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
    expect(requests[1]).toContain('/base/apitools/userByScreenNameV2');
    expect(requests[2]).toContain('/2/users/42/following');
  });
});
