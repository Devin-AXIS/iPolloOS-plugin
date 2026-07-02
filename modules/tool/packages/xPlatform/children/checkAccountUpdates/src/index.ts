import { getErrText } from '@tool/utils/err';
import { z } from 'zod';
import { getUserPosts, lookupUserByUsername } from '../../../lib/client';
import {
  latestPostId,
  normalizePostEvents,
  parseWatchState,
  stringifyJson
} from '../../../lib/format';
import {
  XConfigSchema,
  XReadConfigSchema,
  cleanUsername,
  type XWatchAccountState
} from '../../../lib/schemas';

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
    username: z.preprocess(emptyToUndefined, z.string().max(4096).optional()),
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
  latest_content_text: z.string(),
  latest_account_username: z.string(),
  latest_author_username: z.string(),
  latest_post_created_at: z.string(),
  latest_post_id: z.string(),
  latest_post_type: z.string(),
  latest_event_json: z.string(),
  system_error: z.string().optional()
});

type In = z.infer<typeof InputType>;
type Out = z.infer<typeof OutputType>;

function parseUsernames(value: unknown): string[] {
  const raw = String(value ?? '');
  const usernames = raw
    .split(/[\s,，;；]+/)
    .map(cleanUsername)
    .filter(Boolean)
    .map((item) => item.toLowerCase());
  return Array.from(new Set(usernames)).slice(0, 50);
}

function accountKey(username: string): string {
  return cleanUsername(username).toLowerCase();
}

function readAccountState(state: Record<string, any>, username: string): XWatchAccountState {
  const key = accountKey(username);
  const accountState = state.accounts?.[key];
  if (accountState) return accountState;

  const oldUsername = accountKey(state.username ?? '');
  if (oldUsername && oldUsername === key) {
    return {
      userId: state.userId,
      username: state.username,
      lastPostId: state.lastPostId,
      newestPostId: state.newestPostId,
      checkedAt: state.checkedAt
    };
  }

  return {};
}

function comparePostIds(a: string, b: string): number {
  try {
    const ai = BigInt(a);
    const bi = BigInt(b);
    return ai === bi ? 0 : ai > bi ? 1 : -1;
  } catch {
    return a.localeCompare(b);
  }
}

function latestEventId(events: Array<{ id?: string }>): string {
  return events.reduce((latest, event) => {
    const id = event.id ?? '';
    if (!id) return latest;
    if (!latest) return id;
    return comparePostIds(id, latest) > 0 ? id : latest;
  }, '');
}

function latestEvent<T extends { id?: string }>(events: T[]): T | undefined {
  return events.reduce<T | undefined>((latest, event) => {
    const id = event.id ?? '';
    if (!id) return latest;
    if (!latest?.id) return event;
    return comparePostIds(id, latest.id) > 0 ? event : latest;
  }, undefined);
}

function postTypeFromEvent(event: ReturnType<typeof normalizePostEvents>[number]) {
  const refType = event.referencedTweets?.[0]?.type;
  if (refType === 'retweeted') return 'retweet';
  if (refType === 'quoted') return 'quote';
  if (refType === 'replied_to') return 'reply';
  return 'post';
}

function latestOutputFromEvents(events: ReturnType<typeof normalizePostEvents>) {
  const latest = latestEvent(events);
  return {
    latest_content_text: latest?.text ?? '',
    latest_account_username: latest?.authorUsername ?? '',
    latest_author_username: latest?.authorUsername ?? '',
    latest_post_created_at: latest?.postedAt ?? '',
    latest_post_id: latest?.id ?? '',
    latest_post_type: latest ? postTypeFromEvent(latest) : '',
    latest_event_json: latest ? stringifyJson(latest) : ''
  };
}

function buildAccountState(input: {
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

function buildNextState(accounts: Record<string, XWatchAccountState>) {
  const checkedAt = new Date().toISOString();
  const state: Record<string, any> = {
    accounts,
    checkedAt
  };

  const accountList = Object.values(accounts);
  if (accountList.length === 1) {
    Object.assign(state, accountList[0]);
  }

  return state;
}

type AccountRunResult = {
  username: string;
  count: number;
  newestPostId: string;
  events: ReturnType<typeof normalizePostEvents>;
};

function formatPostText(text: string) {
  const cleaned = text.replace(/\s+/g, ' ').trim();
  if (!cleaned) return '新增 X 内容';
  return cleaned.length > 280 ? `${cleaned.slice(0, 280)}...` : cleaned;
}

function formatReferencedTweetLabel(event: ReturnType<typeof normalizePostEvents>[number]) {
  const first = event.referencedTweets?.[0];
  if (!first?.type) return '';
  if (first.type === 'retweeted') return '转发';
  if (first.type === 'quoted') return '引用';
  if (first.type === 'replied_to') return '回复';
  return '相关内容';
}

function formatSummary(results: AccountRunResult[]) {
  const total = results.reduce((sum, item) => sum + item.count, 0);
  if (!total) {
    return results.map((item) => `@${item.username}：暂无新内容`).join('\n');
  }

  const lines: string[] = [];
  results.forEach((item) => {
    if (!item.count) {
      lines.push(`@${item.username}：暂无新内容`, '');
      return;
    }

    lines.push(`@${item.username} 有 ${item.count} 条新内容：`, '');
    item.events.forEach((event) => {
      const label = formatReferencedTweetLabel(event);
      const prefix = label ? `${label}：` : '';
      lines.push(`${prefix}${formatPostText(event.text)}`);
      lines.push(`链接：${event.url}`, '');
    });
  });
  return lines.join('\n').trim();
}

function emptyOutput(summary: string, state: unknown, systemError?: string): Out {
  return {
    events_json: '[]',
    next_state_json: stringifyJson(state),
    summary_markdown: summary,
    count: 0,
    newest_post_id: '',
    ...latestOutputFromEvents([]),
    system_error: systemError
  };
}

export async function tool(props: In): Promise<Out> {
  const startedAt = new Date().toISOString();
  try {
    const input = InputType.parse(props);
    const state = parseWatchState(input.state_json);
    const usernames = parseUsernames(input.username || state.username);
    if (!usernames.length) {
      return emptyOutput('当前没有配置 X 监控账号，轮询已保持运行。', {
        ...state,
        checkedAt: startedAt
      });
    }
    const readConfig = XReadConfigSchema.safeParse(input);
    if (!readConfig.success) {
      return emptyOutput(
        `X 账号监控检查失败：${readConfig.error.issues[0]?.message || 'X read token is required'}`,
        {
          ...state,
          checkedAt: startedAt
        },
        readConfig.error.issues[0]?.message || 'X read token is required'
      );
    }

    const nextAccounts: Record<string, XWatchAccountState> = {};
    const allEvents: ReturnType<typeof normalizePostEvents> = [];
    const results: AccountRunResult[] = [];
    const errors: string[] = [];

    for (const requestedUsername of usernames) {
      const previousAccountState = readAccountState(state, requestedUsername);
      let username = cleanUsername(requestedUsername);
      let userId = previousAccountState.userId;

      try {
        if (!userId || accountKey(previousAccountState.username ?? '') !== accountKey(username)) {
          const user = await lookupUserByUsername(input, username);
          userId = user.id;
          username = user.username ?? username;
        }

        const data = await getUserPosts(input, {
          userId,
          maxResults: input.max_results,
          sinceId: previousAccountState.lastPostId,
          includeReplies: input.include_replies,
          includeRetweets: input.include_retweets
        });

        const events = normalizePostEvents(data).map((event) => ({
          ...event,
          eventType: 'x.post.created'
        }));
        allEvents.push(...events);
        const newestPostId = latestPostId(data.data, previousAccountState.lastPostId);
        const resolvedKey = accountKey(username);
        nextAccounts[resolvedKey] = buildAccountState({
          userId,
          username,
          lastPostId: previousAccountState.lastPostId,
          newestPostId
        });
        results.push({
          username,
          count: events.length,
          newestPostId,
          events
        });
      } catch (e: unknown) {
        const key = accountKey(username);
        nextAccounts[key] = {
          ...previousAccountState,
          username,
          checkedAt: startedAt
        };
        results.push({
          username,
          count: 0,
          newestPostId: previousAccountState.newestPostId ?? previousAccountState.lastPostId ?? '',
          events: []
        });
        errors.push(`@${username}: ${getErrText(e)}`);
      }
    }

    const nextState = buildNextState(nextAccounts);
    const summary = formatSummary(results);
    const systemError = errors.length ? errors.join('\n') : undefined;
    const eventsForOutput = allEvents;

    return {
      events_json: stringifyJson(eventsForOutput),
      next_state_json: stringifyJson(nextState),
      summary_markdown: systemError ? `${summary}\n\n部分账号检查失败：\n${systemError}` : summary,
      count: allEvents.length,
      newest_post_id: latestEventId(allEvents),
      ...latestOutputFromEvents(allEvents),
      system_error: systemError
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
