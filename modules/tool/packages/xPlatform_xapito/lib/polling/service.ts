import { getErrText } from '@tool/utils/err';
import { getUserPosts, lookupUserByUsername } from '../client';
import { cleanUsername, type XPostListResponse } from '../schemas';
import { normalizePostId, comparePostIds } from '../postId';
import { sendHookEvent } from './hook';
import { JsonPollingStateStore } from './stateStore';
import type {
  OutboxEvent,
  PollResult,
  XPostEvent,
  XPollingConfig,
  XPollingState,
  XPollingStatus
} from './types';

type LoggerLike = {
  info: (message: string, meta?: Record<string, unknown>) => void;
  warn: (message: string, meta?: Record<string, unknown>) => void;
  error: (message: string, meta?: Record<string, unknown>) => void;
};

type StateStoreLike = {
  load: () => Promise<XPollingState>;
  save: (state: XPollingState) => Promise<void>;
};

type PollingDependencies = {
  lookupUserByUsername?: typeof lookupUserByUsername;
  getUserPosts?: typeof getUserPosts;
  sendHookEvent?: typeof sendHookEvent;
};

const consoleLogger: LoggerLike = {
  info: (message, meta) => console.info(message, meta ?? ''),
  warn: (message, meta) => console.warn(message, meta ?? ''),
  error: (message, meta) => console.error(message, meta ?? '')
};

function nowIso() {
  return new Date().toISOString();
}

function accountKey(username: string): string {
  return cleanUsername(username).toLowerCase();
}

function postUrl(postId: string, username?: string): string {
  const handle = cleanUsername(username);
  return handle
    ? `https://x.com/${handle}/status/${postId}`
    : `https://x.com/i/web/status/${postId}`;
}

function postType(post: XPostListResponse['data'][number]): XPostEvent['post']['postType'] {
  const refs = post.referenced_tweets ?? [];
  if (refs.some((ref) => ref.type === 'retweeted')) return 'retweet';
  if (refs.some((ref) => ref.type === 'replied_to')) return 'reply';
  if (refs.some((ref) => ref.type === 'quoted')) return 'quote';
  return 'original';
}

function sortPostsOldestFirst(posts: XPostListResponse['data']) {
  return [...posts]
    .map((post) => ({ ...post, id: normalizePostId(post.id) }))
    .filter((post) => post.id)
    .sort((a, b) => comparePostIds(a.id, b.id));
}

async function runPool<T>(items: T[], concurrency: number, worker: (item: T) => Promise<void>) {
  let cursor = 0;
  const workers = Array.from(
    { length: Math.min(Math.max(concurrency, 1), items.length) },
    async () => {
      for (;;) {
        const index = cursor;
        cursor += 1;
        if (index >= items.length) return;
        await worker(items[index]);
      }
    }
  );
  await Promise.all(workers);
}

export class XPollingService {
  private started = false;
  private polling = false;
  private timer: ReturnType<typeof setTimeout> | null = null;
  private state: XPollingState | null = null;
  private activePoll: Promise<PollResult> | null = null;
  private lastStartedAt: string | null = null;
  private lastCompletedAt: string | null = null;
  private lastSuccessAt: string | null = null;
  private lastError: string | null = null;

  constructor(
    private readonly config: XPollingConfig,
    private readonly store: StateStoreLike = new JsonPollingStateStore(config.stateFile),
    private readonly logger: LoggerLike = consoleLogger,
    private readonly deps: PollingDependencies = {}
  ) {}

  async start(): Promise<void> {
    if (this.started) {
      this.logger.warn('X polling service is already started; ignoring duplicate start');
      return;
    }

    this.state = await this.store.load();
    this.started = true;

    this.logger.info('X polling service started', {
      intervalMs: this.config.intervalMs,
      accounts: this.config.accounts.length,
      hookEnabled: this.config.hook.enabled
    });

    if (!this.config.enabled) {
      this.logger.info('X polling background scheduler is disabled');
      return;
    }

    if (this.config.runImmediately) {
      void this.runCycleAndSchedule();
    } else {
      this.scheduleNext();
    }
  }

  async stop(): Promise<void> {
    if (this.timer) {
      clearTimeout(this.timer);
      this.timer = null;
    }
    this.started = false;

    if (this.activePoll) {
      await this.activePoll.catch(() => undefined);
    }
    if (this.state) await this.store.save(this.state);
    this.logger.info('X polling service stopped');
  }

  getStatus(): XPollingStatus {
    return {
      running: this.started,
      polling: this.polling,
      intervalMs: this.config.intervalMs,
      lastStartedAt: this.lastStartedAt,
      lastCompletedAt: this.lastCompletedAt,
      lastSuccessAt: this.lastSuccessAt,
      accounts: this.config.accounts.length,
      pendingEvents: this.state?.outbox.length ?? 0,
      lastError: this.lastError
    };
  }

  async pollOnce(): Promise<PollResult> {
    if (this.polling) {
      this.logger.warn('Previous X polling cycle is still running; skipping this cycle');
      return {
        skipped: true,
        accounts: this.config.accounts.length,
        successful: 0,
        failed: 0,
        newEvents: 0,
        hookDelivered: 0,
        pendingEvents: this.state?.outbox.length ?? 0,
        durationMs: 0,
        errors: ['polling already running']
      };
    }

    this.polling = true;
    this.lastStartedAt = nowIso();
    const started = Date.now();
    this.logger.info('X polling cycle started', { accounts: this.config.accounts.length });

    this.activePoll = this.doPoll(started).finally(() => {
      this.polling = false;
      this.activePoll = null;
    });
    return this.activePoll;
  }

  private async doPoll(started: number): Promise<PollResult> {
    const state = await this.ensureState();
    const errors: string[] = [];
    let successful = 0;
    let failed = 0;
    let newEvents = 0;

    try {
      await this.deliverOutbox(state);

      await runPool(this.config.accounts, this.config.concurrency, async (username) => {
        try {
          const created = await this.pollAccount(state, username);
          newEvents += created;
          successful += 1;
        } catch (error: unknown) {
          failed += 1;
          const message = getErrText(error);
          errors.push(`@${username}: ${message}`);
          this.logger.warn('X account polling failed', { username, error: message });
          const key = accountKey(username);
          state.accounts[key] = {
            ...(state.accounts[key] ?? {
              username: key,
              lastPostId: null,
              newestPostId: null,
              checkedAt: nowIso()
            }),
            lastError: message,
            checkedAt: nowIso()
          };
        }
      });

      await this.store.save(state);
      const delivered = await this.deliverOutbox(state);
      await this.store.save(state);

      this.lastCompletedAt = nowIso();
      this.lastSuccessAt = failed === 0 ? this.lastCompletedAt : this.lastSuccessAt;
      this.lastError = errors.length ? errors.join('; ') : null;

      const result = {
        skipped: false,
        accounts: this.config.accounts.length,
        successful,
        failed,
        newEvents,
        hookDelivered: delivered,
        pendingEvents: state.outbox.length,
        durationMs: Date.now() - started,
        errors
      };
      this.logger.info('X polling cycle completed', result);
      return result;
    } catch (error: unknown) {
      this.lastCompletedAt = nowIso();
      this.lastError = getErrText(error);
      await this.store.save(state);
      throw error;
    }
  }

  private async ensureState(): Promise<XPollingState> {
    if (!this.state) this.state = await this.store.load();
    return this.state;
  }

  private async pollAccount(state: XPollingState, requestedUsername: string): Promise<number> {
    const key = accountKey(requestedUsername);
    const previous = state.accounts[key];
    let userId = previous?.userId;
    let username = previous?.username ?? key;

    if (!userId) {
      const user = await (this.deps.lookupUserByUsername ?? lookupUserByUsername)(
        this.config.readConfig,
        username
      );
      userId = user.id;
      username = accountKey(user.username ?? username);
    }

    const data = await (this.deps.getUserPosts ?? getUserPosts)(this.config.readConfig, {
      userId,
      maxResults: this.config.readConfig.defaultMaxResults,
      sinceId: previous?.lastPostId ?? undefined,
      includeReplies: false,
      includeRetweets: false
    });
    const posts = sortPostsOldestFirst(data.data);
    const newestPostId = posts.reduce(
      (latest, post) => (comparePostIds(post.id, latest) > 0 ? post.id : latest),
      previous?.lastPostId ?? ''
    );
    const checkedAt = nowIso();

    if (!previous?.lastPostId) {
      state.accounts[username] = {
        userId,
        username,
        lastPostId: newestPostId || null,
        newestPostId: newestPostId || null,
        checkedAt,
        lastSuccessAt: checkedAt,
        lastError: undefined
      };
      return 0;
    }

    const newPosts = posts.filter((post) => comparePostIds(post.id, previous.lastPostId) > 0);
    const existing = new Set(state.outbox.map((item) => item.event.eventId));
    let created = 0;

    for (const post of newPosts) {
      const event = this.createEvent({ userId, username, post });
      if (existing.has(event.eventId)) continue;
      existing.add(event.eventId);
      state.outbox.push({
        event,
        createdAt: checkedAt,
        attempts: 0
      });
      created += 1;
    }

    state.accounts[username] = {
      ...previous,
      userId,
      username,
      newestPostId: newestPostId || previous.newestPostId,
      checkedAt,
      lastSuccessAt: checkedAt,
      lastError: undefined
    };
    state.checkedAt = checkedAt;
    return created;
  }

  private createEvent(input: {
    userId: string;
    username: string;
    post: XPostListResponse['data'][number];
  }): XPostEvent {
    const postId = normalizePostId(input.post.id);
    return {
      eventId: `x:${input.username}:${postId}`,
      eventType: 'x.post.created',
      source: 'x',
      account: {
        userId: input.userId,
        username: input.username
      },
      post: {
        id: postId,
        text: input.post.text ?? '',
        url: postUrl(postId, input.username),
        createdAt: input.post.created_at ?? null,
        postType: postType(input.post),
        authorUsername: input.username
      },
      detectedAt: nowIso()
    };
  }

  private async deliverOutbox(state: XPollingState): Promise<number> {
    if (!state.outbox.length) return 0;
    let delivered = 0;
    const remaining: OutboxEvent[] = [];

    for (const item of state.outbox) {
      const result = await (this.deps.sendHookEvent ?? sendHookEvent)(this.config.hook, item);
      item.attempts += result.attempts;
      if (result.delivered) {
        delivered += 1;
        this.advanceAccountState(state, item.event);
        continue;
      }

      item.lastError = result.error;
      remaining.push(item);
      this.logger.warn('X hook delivery failed', {
        eventId: item.event.eventId,
        attempts: item.attempts,
        error: result.error
      });
    }

    state.outbox = remaining;
    return delivered;
  }

  private advanceAccountState(state: XPollingState, event: XPostEvent) {
    const key = accountKey(event.account.username);
    const account = state.accounts[key];
    if (!account) return;
    if (comparePostIds(event.post.id, account.lastPostId) > 0) {
      account.lastPostId = event.post.id;
      account.newestPostId = event.post.id;
      account.checkedAt = nowIso();
      account.lastSuccessAt = account.checkedAt;
      account.lastError = undefined;
    }
  }

  private scheduleNext() {
    if (!this.started || !this.config.enabled) return;
    this.timer = setTimeout(() => {
      void this.runCycleAndSchedule();
    }, this.config.intervalMs);
    this.timer.unref?.();
  }

  private async runCycleAndSchedule() {
    try {
      await this.pollOnce();
    } catch (error: unknown) {
      this.lastError = getErrText(error);
      this.logger.error('X polling cycle failed', { error: this.lastError });
    } finally {
      this.scheduleNext();
    }
  }
}
