import { getErrText } from '@tool/utils/err';
import { z } from 'zod';
import { getUserPosts, lookupUserByUsername, searchRecentPosts } from '../../../lib/client';
import {
  formatPostsMarkdown,
  formatSourceLinksFromPosts,
  formatUserMarkdown,
  stringifyJson
} from '../../../lib/format';
import { XQueryModeSchema, XReadConfigSchema, cleanUsername } from '../../../lib/schemas';

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
    mode: XQueryModeSchema.default('user_posts'),
    username: z.preprocess(emptyToUndefined, z.string().max(80).optional()),
    query: z.preprocess(emptyToUndefined, z.string().max(1024).optional()),
    max_results: z.coerce.number().int().min(5).max(100).default(10),
    pagination_token: z.preprocess(emptyToUndefined, z.string().max(2048).optional()),
    start_time: z.preprocess(emptyToUndefined, z.string().max(80).optional()),
    end_time: z.preprocess(emptyToUndefined, z.string().max(80).optional()),
    include_replies: booleanInput.default(true),
    include_retweets: booleanInput.default(true)
  })
);

export const OutputType = z.object({
  answer_markdown: z.string(),
  posts_json: z.string(),
  users_json: z.string(),
  source_links: z.string(),
  next_token: z.string(),
  result_count: z.number(),
  system_error: z.string().optional()
});

type In = z.infer<typeof InputType>;
type Out = z.infer<typeof OutputType>;

function emptyOutput(systemError?: string): Out {
  return {
    answer_markdown: '',
    posts_json: '[]',
    users_json: '[]',
    source_links: '',
    next_token: '',
    result_count: 0,
    system_error: systemError
  };
}

export async function tool(props: In): Promise<Out> {
  try {
    const input = InputType.parse(props);

    if (input.mode === 'user_by_username') {
      const username = cleanUsername(input.username);
      if (!username) throw new Error('username is required for user_by_username mode');
      const user = await lookupUserByUsername(input, username);
      return {
        answer_markdown: formatUserMarkdown(user),
        posts_json: '[]',
        users_json: stringifyJson([user]),
        source_links: user.username ? `https://x.com/${user.username}` : '',
        next_token: '',
        result_count: 1
      };
    }

    if (input.mode === 'recent_search') {
      if (!input.query?.trim()) throw new Error('query is required for recent_search mode');
      const data = await searchRecentPosts(input, {
        query: input.query,
        maxResults: input.max_results,
        paginationToken: input.pagination_token,
        startTime: input.start_time,
        endTime: input.end_time
      });
      return {
        answer_markdown: formatPostsMarkdown('X 最近搜索结果', data),
        posts_json: stringifyJson(data.data),
        users_json: stringifyJson(data.includes?.users ?? []),
        source_links: formatSourceLinksFromPosts(data),
        next_token: data.meta?.next_token ?? '',
        result_count: data.data.length
      };
    }

    let username = cleanUsername(input.username);
    if (!username) throw new Error('username is required for user_posts mode');
    const user = await lookupUserByUsername(input, username);
    const userId = user.id;
    username = user.username ?? username;

    const data = await getUserPosts(input, {
      userId,
      maxResults: input.max_results,
      paginationToken: input.pagination_token,
      startTime: input.start_time,
      endTime: input.end_time,
      includeReplies: input.include_replies,
      includeRetweets: input.include_retweets
    });

    return {
      answer_markdown: formatPostsMarkdown(
        `X 账号内容 ${username ? `@${username}` : userId}`,
        data
      ),
      posts_json: stringifyJson(data.data),
      users_json: stringifyJson(data.includes?.users ?? []),
      source_links: formatSourceLinksFromPosts(data),
      next_token: data.meta?.next_token ?? '',
      result_count: data.data.length
    };
  } catch (e: unknown) {
    return emptyOutput(getErrText(e));
  }
}
