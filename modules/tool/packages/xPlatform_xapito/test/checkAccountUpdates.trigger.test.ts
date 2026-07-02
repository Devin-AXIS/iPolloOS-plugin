import { afterEach, describe, expect, it, vi } from 'vitest';
import config from '../children/checkAccountUpdates/config';
import { tool as checkAccountUpdates } from '../children/checkAccountUpdates/src';
import { normalizePostId } from '../lib/postId';

const originalFetch = globalThis.fetch;
type FetchInput = Parameters<typeof fetch>[0];

const base = {
  bearerToken: 'test_bearer_token_123',
  baseUrl: 'https://x.p.xapi.to',
  timeoutMs: 5000,
  defaultMaxResults: 20
};

function userResponse(id = '44196397', username = 'openai') {
  return {
    data: {
      user: {
        result: {
          rest_id: id,
          legacy: {
            screen_name: username,
            name: username
          }
        }
      }
    }
  };
}

function postNode(id: string, text = `post ${id}`, userId = '44196397') {
  return {
    rest_id: id,
    legacy: {
      full_text: text,
      user_id_str: userId,
      created_at: '2026-06-24T10:00:00.000Z'
    },
    core: {
      user_results: {
        result: {
          rest_id: userId,
          legacy: {
            screen_name: 'openai',
            name: 'OpenAI'
          }
        }
      }
    }
  };
}

function postsResponse(ids: string[]) {
  return {
    data: {
      timeline: {
        instructions: ids.map((id) => ({
          entries: [
            {
              content: {
                itemContent: {
                  tweet_results: {
                    result: postNode(id)
                  }
                }
              }
            }
          ]
        }))
      }
    }
  };
}

function mockXapi(ids: string[], options: { failTweets?: boolean } = {}) {
  const urls: string[] = [];
  globalThis.fetch = (async (url: FetchInput) => {
    const textUrl = String(url);
    urls.push(textUrl);
    if (textUrl.includes('userByScreenNameV2')) {
      return new Response(JSON.stringify(userResponse()), { status: 200 });
    }
    if (options.failTweets) {
      return new Response(JSON.stringify({ message: 'rate limit exceeded' }), { status: 429 });
    }
    return new Response(JSON.stringify(postsResponse(ids)), { status: 200 });
  }) as unknown as typeof fetch;
  return urls;
}

function mockMultiAccountXapi() {
  const urls: string[] = [];
  const users: Record<string, { id: string; username: string; posts: string[] }> = {
    saijin0525: { id: '1001', username: 'saijin0525', posts: ['301'] },
    web3ammmyyy: { id: '1002', username: 'web3ammmyyy', posts: ['402'] }
  };

  globalThis.fetch = (async (url: FetchInput) => {
    const textUrl = String(url);
    urls.push(textUrl);
    const parsed = new URL(textUrl);

    if (textUrl.includes('userByScreenNameV2')) {
      const screenName = parsed.searchParams.get('screenName') ?? '';
      const user = users[screenName];
      return new Response(JSON.stringify(userResponse(user.id, user.username)), { status: 200 });
    }

    const userId = parsed.searchParams.get('userId') ?? '';
    const user = Object.values(users).find((item) => item.id === userId);
    return new Response(JSON.stringify(postsResponse(user?.posts ?? [])), { status: 200 });
  }) as unknown as typeof fetch;

  return urls;
}

function readEvents(result: Awaited<ReturnType<typeof checkAccountUpdates>>) {
  return JSON.parse(result.events_json);
}

function readState(result: Awaited<ReturnType<typeof checkAccountUpdates>>) {
  return JSON.parse(result.next_state_json);
}

afterEach(() => {
  globalThis.fetch = originalFetch;
  vi.useRealTimers();
  vi.restoreAllMocks();
});

describe('checkAccountUpdates standard polling trigger', () => {
  it('declares itself as a 60 second polling trigger', () => {
    expect(config.runtime?.kind).toBe('trigger');
    expect(config.runtime?.trigger?.type).toBe('polling');
    expect(config.runtime?.trigger?.configurableInterval).toBe(true);
    expect(config.runtime?.trigger?.schedule?.defaultIntervalSeconds).toBe(60);
    expect(config.runtime?.trigger?.schedule?.minIntervalSeconds).toBe(60);
    expect(config.runtime?.trigger?.schedule?.maxIntervalSeconds).toBe(86400);
  });

  it('establishes baseline on first run without historical events', async () => {
    mockXapi(['2067623442514386944']);

    const result = await checkAccountUpdates({
      ...base,
      username: 'openai',
      state_json: {}
    });

    const events = readEvents(result);
    const state = readState(result);

    expect(events).toEqual([]);
    expect(result.count).toBe(0);
    expect(result.summary_markdown).toBe('');
    expect(result.latest_content_text).toBe('');
    expect(state.userId).toBe('44196397');
    expect(state.lastPostId).toBe('2067623442514386944');
    expect(state.seenPostIds).toEqual(['2067623442514386944']);
    expect(result.system_error).toBeNull();
  });

  it('checks multiple usernames split by escaped slash newline instead of one combined username', async () => {
    const urls = mockMultiAccountXapi();

    const result = await checkAccountUpdates({
      ...base,
      username: '@saijin0525/n@web3ammmyyy',
      state_json: {}
    });

    const events = readEvents(result);
    const state = readState(result);

    expect(events).toEqual([]);
    expect(result.system_error).toBeNull();
    expect(state.accounts.saijin0525.lastPostId).toBe('301');
    expect(state.accounts.web3ammmyyy.lastPostId).toBe('402');
    expect(urls.some((url) => url.includes('saijin0525%2Fn'))).toBe(false);
    expect(urls.some((url) => url.includes('screenName=saijin0525'))).toBe(true);
    expect(urls.some((url) => url.includes('screenName=web3ammmyyy'))).toBe(true);
  });

  it('returns new post events from old to new with userId based dedupeKey', async () => {
    mockXapi(['2067623442514386946', '2067623442514386945']);

    const result = await checkAccountUpdates({
      ...base,
      username: 'openai',
      state_json: {
        version: 1,
        userId: '44196397',
        username: 'openai',
        lastPostId: '2067623442514386944',
        seenPostIds: ['2067623442514386944']
      }
    });

    const events = readEvents(result);
    const state = readState(result);

    expect(events.map((event: any) => event.data)).toHaveLength(2);
    expect(result.count).toBe(2);
    expect(events.map((event: any) => event.eventId)).toEqual([
      'x:44196397:2067623442514386945',
      'x:44196397:2067623442514386946'
    ]);
    expect(events[0].dedupeKey).toBe('x:44196397:2067623442514386945');
    expect(events[0].data).toMatchObject({
      content_text: 'post 2067623442514386945',
      post: {
        text: 'post 2067623442514386945'
      }
    });
    expect((events[0].data as { post: { url?: string } }).post.url).toBeUndefined();
    expect(result.latest_content_text).toBe('post 2067623442514386946');
    expect(result.latest_post_id).toBe('2067623442514386946');
    expect(state.lastPostId).toBe('2067623442514386946');
  });

  it('does not repeat seen posts', async () => {
    mockXapi(['2067623442514386945', '2067623442514386946']);

    const result = await checkAccountUpdates({
      ...base,
      username: 'openai',
      state_json: {
        version: 1,
        userId: '44196397',
        username: 'openai',
        lastPostId: '2067623442514386944',
        seenPostIds: ['2067623442514386945']
      }
    });

    const events = readEvents(result);

    expect(events.map((event: any) => event.eventId)).toEqual(['x:44196397:2067623442514386946']);
  });

  it('normalizes NoteTweet base64 IDs without losing precision', () => {
    expect(normalizePostId('Tm90ZVR3ZWV0OjIwNjc2MjM0NDI1MTQzODY5NDQ=')).toBe('2067623442514386944');
  });

  it('does not advance lastPostId when xapi.to fails', async () => {
    mockXapi([], { failTweets: true });

    const result = await checkAccountUpdates({
      ...base,
      username: 'openai',
      state_json: {
        version: 1,
        userId: '44196397',
        username: 'openai',
        lastPostId: '2067623442514386944',
        seenPostIds: []
      }
    });

    const events = readEvents(result);
    const state = readState(result);

    expect(events).toEqual([]);
    expect(state.lastPostId).toBe('2067623442514386944');
    expect(state.lastError).toMatchObject({ code: 'X_API_RETRYABLE_ERROR' });
    expect(result.system_error).toMatchObject({ retryable: true });
  });

  it('keeps at most 200 seenPostIds', async () => {
    mockXapi(['300']);
    const seenPostIds = Array.from({ length: 250 }, (_, index) => String(index + 1));

    const result = await checkAccountUpdates({
      ...base,
      username: 'openai',
      state_json: {
        version: 1,
        userId: '44196397',
        username: 'openai',
        lastPostId: '299',
        seenPostIds
      }
    });

    const state = readState(result);

    expect(state.seenPostIds).toHaveLength(200);
    expect(state.seenPostIds).toContain('300');
  });

  it('does not create timers or post hooks in the standard trigger path', async () => {
    const setIntervalSpy = vi.spyOn(globalThis, 'setInterval');
    const setTimeoutSpy = vi.spyOn(globalThis, 'setTimeout');
    const urls = mockXapi(['101']);

    await checkAccountUpdates({
      ...base,
      username: 'openai',
      state_json: {}
    });

    expect(setIntervalSpy).not.toHaveBeenCalled();
    expect(setTimeoutSpy).not.toHaveBeenCalledWith(expect.any(Function), 60_000);
    expect(urls.some((url) => url.includes('plugin-hooks'))).toBe(false);
  });
});
