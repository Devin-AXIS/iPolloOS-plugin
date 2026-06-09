import { afterEach, describe, expect, test } from 'bun:test';
import { tool as checkAccountUpdates } from '../children/checkAccountUpdates/src';
import { tool as queryXContent } from '../children/queryXContent/src';

const originalFetch = globalThis.fetch;

const base = {
  bearerToken: 'test_bearer_token_123',
  baseUrl: 'https://api.x.com',
  timeoutMs: 5000,
  defaultMaxResults: 10
};

afterEach(() => {
  globalThis.fetch = originalFetch;
});

describe('X platform tools', () => {
  test('checks account updates and returns events plus next state', async () => {
    globalThis.fetch = (async (url) => {
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
    }) as typeof fetch;

    const result = await checkAccountUpdates({
      ...base,
      username: 'xdevelopers',
      state_json: '{"lastPostId":"100"}',
      max_results: 5
    });

    const events = JSON.parse(result.events_json);
    const state = JSON.parse(result.next_state_json);

    expect(events).toHaveLength(1);
    expect(events[0].dedupeKey).toBe('x:post:101');
    expect(state.lastPostId).toBe('101');
    expect(result.count).toBe(1);
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
    }) as typeof fetch;

    const result = await queryXContent({
      ...base,
      mode: 'user_by_username',
      username: '@xdevelopers'
    });

    expect(requestCount).toBe(1);
    expect(result.users_json).toContain('xdevelopers');
    expect(result.answer_markdown).toContain('@xdevelopers');
  });
});
