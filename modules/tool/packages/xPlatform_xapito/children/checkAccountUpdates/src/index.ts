import { getErrText } from '@tool/utils/err';
import { z } from 'zod';
import { getUserPosts, lookupUserByUsername } from '../../../lib/client';
import { normalizePostEvents } from '../../../lib/format';
import { comparePostIds, normalizePostId } from '../../../lib/postId';
import { XReadConfigSchema, cleanUsername } from '../../../lib/schemas';

const STATE_VERSION = 1;
const MAX_SEEN_POST_IDS = 200;

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
  events_json: z.array(TriggerEventSchema),
  next_state_json: z.record(z.string(), z.any()),
  summary_markdown: z.string().optional(),
  system_error: SystemErrorSchema.optional()
});

type In = z.infer<typeof InputType>;
type Out = z.infer<typeof OutputType>;
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

function accountKey(username: string): string {
  return cleanUsername(username).toLowerCase();
}

function parseState(value: unknown): PollingState {
  if (!value) return { version: STATE_VERSION };
  const raw = typeof value === 'string' ? JSON.parse(value || '{}') : value;
  const record = raw && typeof raw === 'object' ? (raw as Record<string, unknown>) : {};
  const legacyAccounts =
    record.accounts && typeof record.accounts === 'object'
      ? (record.accounts as Record<string, Record<string, unknown>>)
      : undefined;
  const legacyUsername = accountKey(record.username as string);
  const legacyAccount = legacyUsername ? legacyAccounts?.[legacyUsername] : undefined;
  const source = legacyAccount ?? record;

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
}) {
  const postId = normalizePostId(input.event.id);
  const stableKey = `x:${input.userId}:${postId}`;
  return {
    dedupeKey: stableKey,
    eventId: stableKey,
    eventType: 'x.post.created',
    source: 'xPlatform_xapito',
    occurredAt: input.event.postedAt || undefined,
    data: {
      account: {
        userId: input.userId,
        username: input.username
      },
      post: {
        id: postId,
        text: input.event.text,
        url: input.event.url,
        createdAt: input.event.postedAt || null,
        postType: eventType(input.event),
        authorUsername: input.event.authorUsername || input.username
      },
      detectedAt: input.detectedAt
    }
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

export async function tool(props: In): Promise<Out> {
  const checkedAt = new Date().toISOString();
  const input = InputType.parse(props);
  const previousState = parseState(input.state_json);
  const username = accountKey(input.username || previousState.username || '');

  if (!username) {
    const error = { code: 'INVALID_INPUT', message: 'username is required', retryable: false };
    return {
      events_json: [],
      next_state_json: buildState({
        previous: previousState,
        username: previousState.username ?? '',
        checkedAt,
        success: false,
        error
      }),
      summary_markdown: 'Failed to check X account: username is required.',
      system_error: error
    };
  }

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
        events_json: [],
        next_state_json: buildState({
          previous: previousState,
          userId,
          username: resolvedUsername,
          lastPostId: newestPostId,
          newestPostId,
          seenPostIds: newestPostId ? [newestPostId] : [],
          checkedAt,
          success: true
        }),
        summary_markdown: `Initialized polling baseline for @${resolvedUsername}.`,
        system_error: null
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
      events_json: triggerEvents,
      next_state_json: buildState({
        previous: previousState,
        userId,
        username: resolvedUsername,
        lastPostId: newestPostId || previousState.lastPostId,
        newestPostId: newestPostId || previousState.newestPostId,
        seenPostIds: allEvents.map((event) => event.id),
        checkedAt,
        success: true
      }),
      summary_markdown: triggerEvents.length
        ? `Found ${triggerEvents.length} new X post(s) for @${resolvedUsername}.`
        : `No new X posts found for @${resolvedUsername}.`,
      system_error: null
    };
  } catch (error: unknown) {
    const systemError = classifyError(error);
    return {
      events_json: [],
      next_state_json: buildState({
        previous: previousState,
        username,
        checkedAt,
        success: false,
        error: {
          code: systemError.code,
          message: systemError.message
        }
      }),
      summary_markdown: `Failed to check @${username}.`,
      system_error: systemError
    };
  }
}
