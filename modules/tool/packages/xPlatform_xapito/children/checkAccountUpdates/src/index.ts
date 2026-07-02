import { getErrText } from '@tool/utils/err';
import { z } from 'zod';
import { getUserPosts, lookupUserByUsername } from '../../../lib/client';
import { normalizePostEvents } from '../../../lib/format';
import { comparePostIds, normalizePostId } from '../../../lib/postId';
import { XReadConfigSchema, cleanUsername, parseXUsernames } from '../../../lib/schemas';

const STATE_VERSION = 1;
const MAX_SEEN_POST_IDS = 200;
const MAX_USERNAMES = 20;

const emptyToUndefined = (value: unknown) =>
  value === '' || value === null || value === undefined ? undefined : value;

const booleanInput = z.preprocess((value) => {
  if (typeof value === 'string') {
    if (value.toLowerCase() === 'false') return false;
    if (value.toLowerCase() === 'true') return true;
  }
  return value;
}, z.boolean());

const InitialModeSchema = z.enum(['baseline', 'backfill']);

export const InputType = XReadConfigSchema.and(
  z.object({
    username: z.preprocess(emptyToUndefined, z.string().max(4096).optional()),
    state_json: z.preprocess(
      emptyToUndefined,
      z.union([z.string(), z.record(z.string(), z.any())]).optional()
    ),
    max_results: z.coerce.number().int().min(5).max(100).default(20),
    include_replies: booleanInput.default(false),
    include_retweets: booleanInput.default(false),
    initial_mode: InitialModeSchema.default('baseline')
  })
);

const TriggerEventSchema = z.object({
  dedupeKey: z.string(),
  eventId: z.string(),
  eventType: z.string(),
  occurredAt: z.string().optional(),
  source: z.string().optional(),
  data: z.unknown()
});

const SystemErrorSchema = z
  .object({
    code: z.string(),
    message: z.string(),
    retryable: z.boolean().optional()
  })
  .nullable();

export const OutputType = z.object({
  events_json: z.string(),
  count: z.number().int().nonnegative(),
  next_state_json: z.string(),
  summary_markdown: z.string().optional(),
  latest_content_text: z.string(),
  latest_account_username: z.string(),
  latest_author_username: z.string(),
  latest_post_created_at: z.string(),
  latest_post_id: z.string(),
  latest_post_type: z.string(),
  latest_event_json: z.string(),
  system_error: SystemErrorSchema.optional()
});

type In = z.infer<typeof InputType>;
type Out = z.infer<typeof OutputType>;
type TriggerEvent = z.infer<typeof TriggerEventSchema>;
type PostEvent = ReturnType<typeof normalizePostEvents>[number];

type PollingState = {
  version: 1;
  userId?: string;
  username?: string;
  lastPostId?: string;
  newestPostId?: string;
  seenPostIds?: string[];
  checkedAt?: string;
  lastSuccessAt?: string;
  lastError?: { code: string; message: string } | null;
};

type ParsedState = PollingState & {
  accounts?: Record<string, PollingState>;
};

type AccountCheckResult = {
  username: string;
  events: TriggerEvent[];
  state: Record<string, unknown>;
  summary: string;
  systemError: z.infer<typeof SystemErrorSchema>;
};

function accountKey(username: string): string {
  return cleanUsername(username).toLowerCase();
}

function emptyState(): PollingState {
  return { version: STATE_VERSION, seenPostIds: [], lastError: null };
}

function stateFromRecord(source: Record<string, unknown>): PollingState {
  return {
    version: STATE_VERSION,
    userId: typeof source.userId === 'string' ? source.userId : undefined,
    username: typeof source.username === 'string' ? accountKey(source.username) : undefined,
    lastPostId: normalizePostId(source.lastPostId) || undefined,
    newestPostId: normalizePostId(source.newestPostId) || undefined,
    seenPostIds: Array.isArray(source.seenPostIds)
      ? source.seenPostIds.map(normalizePostId).filter(Boolean).slice(0, MAX_SEEN_POST_IDS)
      : [],
    checkedAt: typeof source.checkedAt === 'string' ? source.checkedAt : undefined,
    lastSuccessAt: typeof source.lastSuccessAt === 'string' ? source.lastSuccessAt : undefined,
    lastError:
      source.lastError && typeof source.lastError === 'object'
        ? {
            code: String((source.lastError as Record<string, unknown>).code ?? 'X_TRIGGER_ERROR'),
            message: String((source.lastError as Record<string, unknown>).message ?? '')
          }
        : null
  };
}

function parseState(value: unknown): ParsedState {
  if (!value) return emptyState();
  const raw = typeof value === 'string' ? JSON.parse(value || '{}') : value;
  const record = raw && typeof raw === 'object' ? (raw as Record<string, unknown>) : {};
  const legacyAccounts =
    record.accounts && typeof record.accounts === 'object'
      ? (record.accounts as Record<string, Record<string, unknown>>)
      : undefined;
  const legacyUsername = accountKey(record.username as string);
  const legacyAccount = legacyUsername ? legacyAccounts?.[legacyUsername] : undefined;
  const source = legacyAccount ?? record;
  const state = stateFromRecord(source);

  if (!legacyAccounts) return state;

  const accounts = Object.fromEntries(
    Object.entries(legacyAccounts).map(([key, account]) => {
      const accountState = stateFromRecord(account);
      return [accountKey(accountState.username ?? key), accountState];
    })
  );

  return {
    ...state,
    accounts
  };
}

function sortEventsOldestFirst(events: PostEvent[]): PostEvent[] {
  return [...events]
    .map((event) => ({
      ...event,
      id: normalizePostId(event.id)
    }))
    .filter((event) => event.id)
    .sort((left, right) => comparePostIds(left.id, right.id));
}

function latestPostId(events: PostEvent[], fallback?: string): string {
  return events.reduce(
    (latest, event) => {
      if (!latest) return event.id;
      return comparePostIds(event.id, latest) > 0 ? event.id : latest;
    },
    normalizePostId(fallback) || ''
  );
}

function keepSeenPostIds(existing: string[], incoming: string[]): string[] {
  const seen = new Set<string>();
  return [...existing, ...incoming]
    .map(normalizePostId)
    .filter(Boolean)
    .filter((id) => {
      if (seen.has(id)) return false;
      seen.add(id);
      return true;
    })
    .sort(comparePostIds)
    .slice(-MAX_SEEN_POST_IDS);
}

function eventType(event: PostEvent): 'original' | 'retweet' | 'reply' | 'quote' {
  const refs = event.referencedTweets ?? [];
  if (refs.some((ref) => ref.type === 'retweeted')) return 'retweet';
  if (refs.some((ref) => ref.type === 'replied_to')) return 'reply';
  if (refs.some((ref) => ref.type === 'quoted')) return 'quote';
  return 'original';
}

function toTriggerEvent(input: {
  userId: string;
  username: string;
  event: PostEvent;
  detectedAt: string;
}): TriggerEvent {
  const postId = normalizePostId(input.event.id);
  const stableKey = `x:${input.userId}:${postId}`;
  return {
    dedupeKey: stableKey,
    eventId: stableKey,
    eventType: 'x.post.created',
    source: 'xPlatform_xapito',
    occurredAt: input.event.postedAt || undefined,
    data: {
      content_text: input.event.text,
      account: {
        userId: input.userId,
        username: input.username
      },
      post: {
        id: postId,
        text: input.event.text,
        createdAt: input.event.postedAt || null,
        postType: eventType(input.event),
        authorUsername: input.event.authorUsername || input.username
      },
      detectedAt: input.detectedAt
    }
  };
}

function latestOutputFromEvents(events: TriggerEvent[]) {
  const latest = events.reduce<TriggerEvent | undefined>((current, event) => {
    const currentId = normalizePostId((current?.data as any)?.post?.id);
    const eventId = normalizePostId((event.data as any)?.post?.id);
    if (!eventId) return current;
    if (!currentId) return event;
    return comparePostIds(eventId, currentId) > 0 ? event : current;
  }, undefined);
  const data = (latest?.data && typeof latest.data === 'object' ? latest.data : {}) as Record<
    string,
    any
  >;
  const post = data.post && typeof data.post === 'object' ? data.post : {};
  const account = data.account && typeof data.account === 'object' ? data.account : {};
  return {
    latest_content_text: String(data.content_text || post.text || ''),
    latest_account_username: String(account.username || ''),
    latest_author_username: String(post.authorUsername || account.username || ''),
    latest_post_created_at: String(post.createdAt || latest?.occurredAt || ''),
    latest_post_id: String(post.id || ''),
    latest_post_type: String(post.postType || ''),
    latest_event_json: latest ? JSON.stringify(latest, null, 2) : ''
  };
}

function buildState(input: {
  previous: PollingState;
  userId?: string;
  username: string;
  lastPostId?: string;
  newestPostId?: string;
  seenPostIds?: string[];
  checkedAt: string;
  success: boolean;
  error?: { code: string; message: string } | null;
}): Record<string, unknown> {
  return {
    version: STATE_VERSION,
    userId: input.userId ?? input.previous.userId,
    username: input.username,
    lastPostId: normalizePostId(input.lastPostId ?? input.previous.lastPostId) || undefined,
    newestPostId: normalizePostId(input.newestPostId ?? input.previous.newestPostId) || undefined,
    seenPostIds: keepSeenPostIds(input.previous.seenPostIds ?? [], input.seenPostIds ?? []),
    checkedAt: input.checkedAt,
    lastSuccessAt: input.success ? input.checkedAt : input.previous.lastSuccessAt,
    lastError: input.error ?? null
  };
}

function classifyError(error: unknown) {
  const message = getErrText(error);
  const retryable = /429|408|timeout|network|5\d\d|rate/i.test(message);
  return {
    code: retryable ? 'X_API_RETRYABLE_ERROR' : 'X_API_ERROR',
    message,
    retryable
  };
}

function previousStateForUsername(
  state: ParsedState,
  username: string,
  hasSingleRequestedUsername: boolean
): PollingState {
  if (state.accounts?.[username]) return state.accounts[username];
  if (state.username === username) return state;
  if (hasSingleRequestedUsername && !state.accounts) return state;
  return emptyState();
}

async function checkAccount(
  input: In,
  previousState: PollingState,
  username: string,
  checkedAt: string
): Promise<AccountCheckResult> {
  try {
    let userId = previousState.userId;
    let resolvedUsername = previousState.username ?? username;
    if (!userId || accountKey(resolvedUsername) !== username) {
      const user = await lookupUserByUsername(input, username);
      userId = user.id;
      resolvedUsername = accountKey(user.username ?? username);
    }

    const data = await getUserPosts(input, {
      userId,
      maxResults: input.max_results,
      sinceId: previousState.lastPostId,
      includeReplies: input.include_replies,
      includeRetweets: input.include_retweets
    });
    const allEvents = sortEventsOldestFirst(normalizePostEvents(data));
    const newestPostId = latestPostId(allEvents, previousState.lastPostId);

    if (!previousState.lastPostId && input.initial_mode === 'baseline') {
      return {
        username: resolvedUsername,
        events: [],
        state: buildState({
          previous: previousState,
          userId,
          username: resolvedUsername,
          lastPostId: newestPostId,
          newestPostId,
          seenPostIds: newestPostId ? [newestPostId] : [],
          checkedAt,
          success: true
        }),
        summary: `Initialized polling baseline for @${resolvedUsername}.`,
        systemError: null
      };
    }

    const seen = new Set((previousState.seenPostIds ?? []).map(normalizePostId).filter(Boolean));
    const newEvents = allEvents.filter((event) => {
      if (previousState.lastPostId && comparePostIds(event.id, previousState.lastPostId) <= 0) {
        return false;
      }
      if (seen.has(event.id)) return false;
      seen.add(event.id);
      return true;
    });
    const triggerEvents = newEvents.map((event) =>
      toTriggerEvent({ userId, username: resolvedUsername, event, detectedAt: checkedAt })
    );

    return {
      username: resolvedUsername,
      events: triggerEvents,
      state: buildState({
        previous: previousState,
        userId,
        username: resolvedUsername,
        lastPostId: newestPostId || previousState.lastPostId,
        newestPostId: newestPostId || previousState.newestPostId,
        seenPostIds: allEvents.map((event) => event.id),
        checkedAt,
        success: true
      }),
      summary: triggerEvents.length
        ? `Found ${triggerEvents.length} new X post(s) for @${resolvedUsername}.`
        : `No new X posts found for @${resolvedUsername}.`,
      systemError: null
    };
  } catch (error: unknown) {
    const systemError = classifyError(error);
    return {
      username,
      events: [],
      state: buildState({
        previous: previousState,
        username,
        checkedAt,
        success: false,
        error: {
          code: systemError.code,
          message: systemError.message
        }
      }),
      summary: `Failed to check @${username}.`,
      systemError
    };
  }
}

export async function tool(props: In): Promise<Out> {
  const checkedAt = new Date().toISOString();
  const input = InputType.parse(props);
  const previousState = parseState(input.state_json);
  const usernames = parseXUsernames(input.username);
  if (!usernames.length && previousState.username) usernames.push(previousState.username);

  if (!usernames.length) {
    const error = { code: 'INVALID_INPUT', message: 'username is required', retryable: false };
    return {
      events_json: JSON.stringify([]),
      count: 0,
      next_state_json: JSON.stringify(
        buildState({
          previous: previousState,
          username: previousState.username ?? '',
          checkedAt,
          success: false,
          error
        }),
        null,
        2
      ),
      summary_markdown: 'Failed to check X account: username is required.',
      ...latestOutputFromEvents([]),
      system_error: error
    };
  }

  if (usernames.length > MAX_USERNAMES) {
    const error = {
      code: 'INVALID_INPUT',
      message: `Too many usernames: received ${usernames.length}, maximum is ${MAX_USERNAMES}.`,
      retryable: false
    };
    return {
      events_json: JSON.stringify([]),
      count: 0,
      next_state_json: JSON.stringify(
        {
          version: STATE_VERSION,
          accounts: previousState.accounts ?? {},
          checkedAt,
          lastError: { code: error.code, message: error.message }
        },
        null,
        2
      ),
      summary_markdown: `Failed to check X accounts: maximum ${MAX_USERNAMES} usernames are allowed.`,
      ...latestOutputFromEvents([]),
      system_error: error
    };
  }

  const results: AccountCheckResult[] = [];
  for (const username of usernames) {
    const previousAccountState = previousStateForUsername(
      previousState,
      username,
      usernames.length === 1
    );
    results.push(await checkAccount(input, previousAccountState, username, checkedAt));
  }

  if (results.length === 1) {
    const result = results[0];
    const count = result.events.length;
    return {
      events_json: JSON.stringify(result.events, null, 2),
      count,
      next_state_json: JSON.stringify(result.state, null, 2),
      summary_markdown: count > 0 || result.systemError ? result.summary : '',
      ...latestOutputFromEvents(result.events),
      system_error: result.systemError
    };
  }

  const accounts = Object.fromEntries(results.map((result) => [result.username, result.state]));
  const events = results.flatMap((result) => result.events);
  const failed = results.filter((result) => result.systemError);

  return {
    events_json: JSON.stringify(events, null, 2),
    count: events.length,
    next_state_json: JSON.stringify(
      {
        version: STATE_VERSION,
        accounts,
        checkedAt,
        lastSuccessAt: failed.length === results.length ? previousState.lastSuccessAt : checkedAt,
        lastError:
          failed.length > 0
            ? {
                code: failed.length === results.length ? 'X_API_ERROR' : 'X_PARTIAL_ACCOUNT_ERROR',
                message: failed
                  .map((result) => `@${result.username}: ${result.systemError?.message}`)
                  .join('; ')
              }
            : null
      },
      null,
      2
    ),
    summary_markdown:
      events.length > 0 || failed.length > 0
        ? results.map((result) => result.summary).join('\n')
        : '',
    ...latestOutputFromEvents(events),
    system_error: failed.length === results.length ? failed[0].systemError : null
  };
}
