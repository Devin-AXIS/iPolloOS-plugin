import { getErrText } from '@tool/utils/err';
import { z } from 'zod';
import { getUserPosts, lookupUserByUsername } from '../../../lib/client';
import {
  latestPostId,
  normalizePostEvents,
  parseWatchState,
  stringifyJson
} from '../../../lib/format';
import { XReadConfigSchema, cleanUsername, type XWatchAccountState } from '../../../lib/schemas';

const emptyToUndefined = (value: unknown) =>
  value === '' || value === null || value === undefined ? undefined : value;

const booleanInput = z.preprocess((value) => {
  if (typeof value === 'string') {
    if (value.toLowerCase() === 'false') return false;
    if (value.toLowerCase() === 'true') return true;
  }
  return value;
}, z.boolean());

export const InputType = XReadConfigSchema.and(
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
  system_error: z.string().optional()
});

type In = z.infer<typeof InputType>;
type Out = z.infer<typeof OutputType>;
type PostEvent = ReturnType<typeof normalizePostEvents>[number];

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

function truncateText(value: string, maxLength = 180): string {
  const text = value.replace(/\s+/g, ' ').trim();
  if (text.length <= maxLength) return text;
  return `${text.slice(0, maxLength - 1)}…`;
}

function formatPostLine(event: PostEvent): string {
  const meta = [event.postedAt, event.url].filter(Boolean).join(' | ');
  const text = truncateText(event.text || '(无正文)');
  return `- ${text}${meta ? `\n  ${meta}` : ''}`;
}

function formatSummary(
  results: Array<{
    username: string;
    count: number;
    newestPostId: string;
    baseline: boolean;
    recentEvents: PostEvent[];
  }>
) {
  const total = results.reduce((sum, item) => sum + item.count, 0);
  const watched = results.map((item) => `@${item.username}`).join('、');
  const baselineAccounts = results.filter((item) => item.baseline);

  if (!total && baselineAccounts.length) {
    const lines = [
      `已建立 ${baselineAccounts.map((item) => `@${item.username}`).join('、')} 的监控基线。`,
      '',
      '首次运行不会把历史内容作为新增事件触发，因此 count=0、events_json=[]。'
    ];

    baselineAccounts.forEach((item) => {
      lines.push('', `## @${item.username} 最近内容摘要`);
      if (item.newestPostId) lines.push(`最新 Post ID：${item.newestPostId}`);
      const recent = item.recentEvents.slice(0, 5);
      if (!recent.length) {
        lines.push('', '未查询到可展示的最近内容。');
        return;
      }
      lines.push('', ...recent.map(formatPostLine));
    });

    return lines.join('\n');
  }
  if (!total) {
    const latest = results
      .map((item) => item.newestPostId)
      .filter(Boolean)
      .sort(comparePostIds)
      .at(-1);
    return `未发现 ${watched} 的新增 X 内容。${latest ? `最新 Post ID：${latest}` : ''}`;
  }

  const lines = [`发现 ${total} 条新增 X 内容。`, ''];
  results.forEach((item) => {
    lines.push(
      `- @${item.username}: ${item.count} 条${
        item.newestPostId ? `，最新 Post ID：${item.newestPostId}` : ''
      }`
    );
  });
  return lines.join('\n');
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
    const usernames = parseUsernames(input.username || state.username);
    if (!usernames.length) throw new Error('username is required');

    const nextAccounts: Record<string, XWatchAccountState> = {};
    const allEvents: ReturnType<typeof normalizePostEvents> = [];
    const results: Array<{
      username: string;
      count: number;
      newestPostId: string;
      baseline: boolean;
      recentEvents: PostEvent[];
    }> = [];
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

        const isBaseline = !previousAccountState.lastPostId;
        const normalizedEvents = normalizePostEvents(data);
        const events = isBaseline ? [] : normalizedEvents;
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
          baseline: isBaseline,
          recentEvents: isBaseline ? normalizedEvents.slice().reverse().slice(0, 5) : []
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
          baseline: false,
          recentEvents: []
        });
        errors.push(`@${username}: ${getErrText(e)}`);
      }
    }

    const nextState = buildNextState(nextAccounts);
    const summary = formatSummary(results);
    const systemError = errors.length ? errors.join('\n') : undefined;

    return {
      events_json: stringifyJson(allEvents),
      next_state_json: stringifyJson(nextState),
      summary_markdown: systemError ? `${summary}\n\n部分账号检查失败：\n${systemError}` : summary,
      count: allEvents.length,
      newest_post_id: latestEventId(allEvents),
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
