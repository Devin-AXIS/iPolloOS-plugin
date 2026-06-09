import { getErrText } from '@tool/utils/err';
import { z } from 'zod';
import { getUserPosts, lookupUserByUsername } from '../../../lib/client';
import {
  formatWatchSummary,
  latestPostId,
  normalizePostEvents,
  parseWatchState,
  stringifyJson
} from '../../../lib/format';
import { XConfigSchema, cleanUsername } from '../../../lib/schemas';

const emptyToUndefined = (value: unknown) =>
  value === '' || value === null || value === undefined ? undefined : value;

const booleanInput = z.preprocess((value) => {
  if (typeof value === 'string') {
    if (value.toLowerCase() === 'false') return false;
    if (value.toLowerCase() === 'true') return true;
  }
  return value;
}, z.boolean());

export const InputType = XConfigSchema.and(
  z.object({
    username: z.preprocess(emptyToUndefined, z.string().max(80).optional()),
    user_id: z.preprocess(emptyToUndefined, z.string().max(40).optional()),
    state_json: z.preprocess(
      emptyToUndefined,
      z.union([z.string(), z.record(z.string(), z.any())]).optional()
    ),
    max_results: z.coerce.number().int().min(5).max(100).default(10),
    include_replies: booleanInput.default(false),
    include_retweets: booleanInput.default(false)
  })
);

export const OutputType = z.object({
  events_json: z.string(),
  next_state_json: z.string(),
  summary_markdown: z.string(),
  count: z.number(),
  newest_post_id: z.string(),
  system_error: z.string().optional()
});

type In = z.infer<typeof InputType>;
type Out = z.infer<typeof OutputType>;

function buildNextState(input: {
  userId?: string;
  username?: string;
  lastPostId?: string;
  newestPostId?: string;
}) {
  const newest = input.newestPostId || input.lastPostId || '';
  return {
    userId: input.userId,
    username: input.username,
    lastPostId: newest,
    newestPostId: newest,
    checkedAt: new Date().toISOString()
  };
}

function emptyOutput(summary: string, state: unknown, systemError?: string): Out {
  return {
    events_json: '[]',
    next_state_json: stringifyJson(state),
    summary_markdown: summary,
    count: 0,
    newest_post_id: '',
    system_error: systemError
  };
}

export async function tool(props: In): Promise<Out> {
  const startedAt = new Date().toISOString();
  try {
    const input = InputType.parse(props);
    const state = parseWatchState(input.state_json);
    let username = cleanUsername(input.username || state.username);
    let userId = input.user_id || state.userId;
    if (!username && !userId) throw new Error('username or user_id is required');

    if (!userId) {
      const user = await lookupUserByUsername(input, username);
      userId = user.id;
      username = user.username ?? username;
    }

    const data = await getUserPosts(input, {
      userId,
      maxResults: input.max_results,
      sinceId: state.lastPostId,
      includeReplies: input.include_replies,
      includeRetweets: input.include_retweets
    });

    const events = normalizePostEvents(data);
    const newestPostId = latestPostId(data.data, state.lastPostId);
    const nextState = buildNextState({
      userId,
      username,
      lastPostId: state.lastPostId,
      newestPostId
    });

    return {
      events_json: stringifyJson(events),
      next_state_json: stringifyJson(nextState),
      summary_markdown: formatWatchSummary(username || userId, events.length, newestPostId),
      count: events.length,
      newest_post_id: newestPostId
    };
  } catch (e: unknown) {
    const previousState = parseWatchState((props as { state_json?: unknown }).state_json);
    return emptyOutput(
      `X 账号监控检查失败：${getErrText(e)}`,
      {
        ...previousState,
        checkedAt: startedAt
      },
      getErrText(e)
    );
  }
}
