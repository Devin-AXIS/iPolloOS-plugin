import { getErrText } from '@tool/utils/err';
import { z } from 'zod';
import { getUserPosts, lookupUserByUsername } from '../../../lib/client';
import { normalizePostEvents, stringifyJson } from '../../../lib/format';
import { XReadConfigSchema, cleanUsername, type XPost, type XUser } from '../../../lib/schemas';

const emptyToUndefined = (value: unknown) =>
  value === '' || value === null || value === undefined ? undefined : value;

export const InputType = XReadConfigSchema.and(
  z.object({
    username: z.preprocess(emptyToUndefined, z.string().max(4096).optional())
  })
);

export const OutputType = z.object({
  summary_markdown: z.string(),
  accounts_json: z.string(),
  posts_json: z.string(),
  source_links: z.string(),
  result_count: z.number(),
  system_error: z.string().optional()
});

type In = z.infer<typeof InputType>;
type Out = z.infer<typeof OutputType>;

function parseUsernames(value: unknown): string[] {
  const usernames = String(value ?? '')
    .split(/[\s,，;；]+/)
    .map(cleanUsername)
    .filter(Boolean)
    .map((item) => item.toLowerCase());
  return Array.from(new Set(usernames)).slice(0, 20);
}

function metricsLine(user: XUser): string {
  const metrics = user.public_metrics;
  if (!metrics) return '';
  return [
    `关注者 ${metrics.followers_count ?? 0}`,
    `关注 ${metrics.following_count ?? 0}`,
    `Posts ${metrics.tweet_count ?? 0}`
  ].join(' · ');
}

function buildSummary(
  items: Array<{ user: XUser; posts: ReturnType<typeof normalizePostEvents> }>
) {
  if (!items.length) return '# X 账号综合查询\n\n未查询到账号。';

  const lines = ['# X 账号综合查询'];
  items.forEach(({ user, posts }) => {
    lines.push('', `## @${user.username ?? user.id}`);
    if (user.name) lines.push(user.name);
    const metrics = metricsLine(user);
    if (metrics) lines.push('', metrics);
    if (user.description) lines.push('', user.description);
    lines.push('', `主页：https://x.com/${user.username ?? user.id}`);

    if (!posts.length) {
      lines.push('', '最近未查询到公开内容。');
      return;
    }

    lines.push('', '最近内容：');
    posts
      .slice()
      .reverse()
      .slice(0, 5)
      .forEach((post) => {
        const text = post.text ? ` - ${post.text.replace(/\s+/g, ' ').slice(0, 160)}` : '';
        lines.push(`- ${post.id}${post.postedAt ? ` · ${post.postedAt}` : ''}${text}`);
      });
  });
  return lines.join('\n');
}

function emptyOutput(systemError?: string): Out {
  return {
    summary_markdown: '',
    accounts_json: '[]',
    posts_json: '[]',
    source_links: '',
    result_count: 0,
    system_error: systemError
  };
}

export async function tool(props: In): Promise<Out> {
  try {
    const input = InputType.parse(props);
    const usernames = parseUsernames(input.username);
    if (!usernames.length) throw new Error('username is required');

    const items: Array<{ user: XUser; posts: ReturnType<typeof normalizePostEvents> }> = [];
    const allPosts: XPost[] = [];
    const links: string[] = [];
    const errors: string[] = [];

    for (const username of usernames) {
      try {
        const user = await lookupUserByUsername(input, username);
        const postsResponse = await getUserPosts(input, {
          userId: user.id,
          maxResults: 10,
          includeReplies: false,
          includeRetweets: false
        });
        const posts = normalizePostEvents(postsResponse);
        items.push({ user, posts });
        allPosts.push(...postsResponse.data);
        links.push(`https://x.com/${user.username ?? username}`);
        posts.forEach((post) => links.push(post.url));
      } catch (e: unknown) {
        errors.push(`@${username}: ${getErrText(e)}`);
      }
    }

    return {
      summary_markdown: errors.length
        ? `${buildSummary(items)}\n\n部分账号查询失败：\n${errors.join('\n')}`
        : buildSummary(items),
      accounts_json: stringifyJson(items.map((item) => item.user)),
      posts_json: stringifyJson(allPosts),
      source_links: links.join('\n'),
      result_count: items.length,
      system_error: errors.length ? errors.join('\n') : undefined
    };
  } catch (e: unknown) {
    return emptyOutput(getErrText(e));
  }
}
