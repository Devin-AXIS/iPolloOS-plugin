import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { loadXPollingConfig } from '../lib/polling/config';
import { normalizePostId, comparePostIds } from '../lib/postId';
import { XPollingService } from '../lib/polling/service';
import type { XPollingConfig, XPollingState } from '../lib/polling/types';
import type { XPostListResponse, XReadConfig, XUser } from '../lib/schemas';

class MemoryStore {
  state: XPollingState = {
    version: 1,
    accounts: {},
    outbox: [],
    checkedAt: null
  };

  async load() {
    return structuredClone(this.state);
  }

  async save(state: XPollingState) {
    this.state = structuredClone(state);
  }
}

const logger = {
  info: vi.fn(),
  warn: vi.fn(),
  error: vi.fn()
};

const envKeys = ['X_BEARER_TOKEN', 'X_POLLING_INTERVAL_MS'] as const;
const originalEnv = Object.fromEntries(envKeys.map((key) => [key, process.env[key]])) as Record<
  (typeof envKeys)[number],
  string | undefined
>;

function setEnv(name: (typeof envKeys)[number], value: string | undefined) {
  if (value === undefined) {
    delete process.env[name];
    return;
  }
  process.env[name] = value;
}

function restoreEnv() {
  for (const key of envKeys) {
    setEnv(key, originalEnv[key]);
  }
}

function config(overrides: Partial<XPollingConfig> = {}): XPollingConfig {
  const readConfig = {
    bearerToken: '1234567890',
    baseUrl: 'https://x.p.xapi.to',
    timeoutMs: 15_000,
    defaultMaxResults: 10
  } satisfies XReadConfig;

  return {
    enabled: true,
    intervalMs: 60_000,
    runImmediately: false,
    concurrency: 2,
    accounts: ['openai'],
    stateFile: 'memory.json',
    readConfig,
    hook: {
      enabled: true,
      url: 'http://localhost/hook',
      secret: 'secret',
      timeoutMs: 10_000,
      maxRetries: 0
    },
    ...overrides
  };
}

function response(ids: string[]): XPostListResponse {
  return {
    data: ids.map((id) => ({
      id,
      text: `post ${id}`,
      created_at: '2026-06-24T00:00:00.000Z'
    })),
    meta: {
      result_count: ids.length
    }
  };
}

describe('xPlatform_xapito polling service', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.useRealTimers();
    restoreEnv();
  });

  it('uses the default 60 second polling interval and rejects unsafe intervals', () => {
    setEnv('X_BEARER_TOKEN', '1234567890');
    setEnv('X_POLLING_INTERVAL_MS', '');
    expect(loadXPollingConfig().intervalMs).toBe(60_000);

    setEnv('X_POLLING_INTERVAL_MS', '1000');
    expect(loadXPollingConfig().intervalMs).toBe(60_000);
  });

  it('starts only one timer and stop clears it', async () => {
    const service = new XPollingService(
      config({ runImmediately: false }),
      new MemoryStore(),
      logger
    );

    await service.start();
    await service.start();
    expect(vi.getTimerCount()).toBe(1);

    await service.stop();
    expect(vi.getTimerCount()).toBe(0);
  });

  it('runs immediately when configured', async () => {
    const store = new MemoryStore();
    const getUserPosts = vi.fn(async () => response(['100']));
    const service = new XPollingService(config({ runImmediately: true }), store, logger, {
      lookupUserByUsername: async () => ({ id: 'u1', username: 'openai' }) as XUser,
      getUserPosts
    });

    await service.start();
    await Promise.resolve();
    await Promise.resolve();

    expect(getUserPosts).toHaveBeenCalledTimes(1);
    await service.stop();
  });

  it('skips overlapping polling cycles', async () => {
    let release!: () => void;
    const pending = new Promise<void>((resolve) => {
      release = resolve;
    });
    const service = new XPollingService(config(), new MemoryStore(), logger, {
      lookupUserByUsername: async () => ({ id: 'u1', username: 'openai' }) as XUser,
      getUserPosts: async () => {
        await pending;
        return response(['100']);
      }
    });

    const first = service.pollOnce();
    const second = await service.pollOnce();
    expect(second.skipped).toBe(true);
    release();
    await first;
  });

  it('establishes a baseline without sending historical events', async () => {
    const store = new MemoryStore();
    const sendHookEvent = vi.fn();
    const service = new XPollingService(config(), store, logger, {
      lookupUserByUsername: async () => ({ id: 'u1', username: 'openai' }) as XUser,
      getUserPosts: async () => response(['101', '100']),
      sendHookEvent
    });

    const result = await service.pollOnce();

    expect(result.newEvents).toBe(0);
    expect(sendHookEvent).not.toHaveBeenCalled();
    expect(store.state.accounts.openai.lastPostId).toBe('101');
  });

  it('creates new events from old to new and advances state only after hook success', async () => {
    const store = new MemoryStore();
    store.state.accounts.openai = {
      userId: 'u1',
      username: 'openai',
      lastPostId: '100',
      newestPostId: '100',
      checkedAt: '2026-06-24T00:00:00.000Z'
    };
    const delivered: string[] = [];
    const service = new XPollingService(config(), store, logger, {
      getUserPosts: async () => response(['105', '103', '104']),
      sendHookEvent: async (_hook, item) => {
        delivered.push(item.event.post.id);
        return { delivered: true, attempts: 1 };
      }
    });

    const result = await service.pollOnce();

    expect(result.newEvents).toBe(3);
    expect(delivered).toEqual(['103', '104', '105']);
    expect(store.state.accounts.openai.lastPostId).toBe('105');
    expect(store.state.outbox).toHaveLength(0);
  });

  it('keeps pending events when hook delivery fails and retries them after restart', async () => {
    const store = new MemoryStore();
    store.state.accounts.openai = {
      userId: 'u1',
      username: 'openai',
      lastPostId: '100',
      newestPostId: '100',
      checkedAt: '2026-06-24T00:00:00.000Z'
    };

    const first = new XPollingService(config(), store, logger, {
      getUserPosts: async () => response(['101']),
      sendHookEvent: async () => ({ delivered: false, attempts: 1, error: 'HTTP 503' })
    });
    await first.pollOnce();
    expect(store.state.accounts.openai.lastPostId).toBe('100');
    expect(store.state.outbox).toHaveLength(1);

    const eventId = store.state.outbox[0].event.eventId;
    const second = new XPollingService(config(), store, logger, {
      getUserPosts: async () => response([]),
      sendHookEvent: async (_hook, item) => {
        expect(item.event.eventId).toBe(eventId);
        return { delivered: true, attempts: 1 };
      }
    });
    await second.pollOnce();

    expect(store.state.outbox).toHaveLength(0);
    expect(store.state.accounts.openai.lastPostId).toBe('101');
  });

  it('normalizes base64 NoteTweet IDs and compares with BigInt ordering', () => {
    expect(normalizePostId('Tm90ZVR3ZWV0OjIwNjc2MjM0NDI1MTQzODY5NDQ=')).toBe('2067623442514386944');
    expect(comparePostIds('2067623442514386944', '999')).toBe(1);
  });
});
