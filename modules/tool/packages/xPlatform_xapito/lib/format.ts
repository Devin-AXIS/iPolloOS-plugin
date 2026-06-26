import {
  XPostListResponseSchema,
  XWatchStateSchema,
  cleanUsername,
  type XPost,
  type XPostListResponse,
  type XUser,
  type XWatchState
} from './schemas';

function cleanText(value: unknown): string {
  return typeof value === 'string' ? value.trim() : '';
}

function userMapFromResponse(response: XPostListResponse): Map<string, XUser> {
  const users = response.includes?.users ?? [];
  return new Map(users.map((user) => [user.id, user]));
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

function postUrl(post: XPost, author?: XUser): string {
  const username = cleanUsername(author?.username);
  return username
    ? `https://x.com/${username}/status/${post.id}`
    : `https://x.com/i/web/status/${post.id}`;
}

export function stringifyJson(value: unknown): string {
  return JSON.stringify(value, null, 2);
}

export function parseWatchState(value: unknown): XWatchState {
  if (!value) return {};
  if (typeof value === 'string') {
    const text = value.trim();
    if (!text) return {};
    return XWatchStateSchema.parse(JSON.parse(text));
  }
  return XWatchStateSchema.parse(value);
}

export function latestPostId(posts: XPost[], fallback?: string): string {
  return posts.reduce((latest, post) => {
    if (!latest) return post.id;
    return comparePostIds(post.id, latest) > 0 ? post.id : latest;
  }, fallback ?? '');
}

export function normalizePostEvents(response: XPostListResponse) {
  const parsed = XPostListResponseSchema.parse(response);
  const usersById = userMapFromResponse(parsed);
  return parsed.data
    .map((post) => {
      const author = post.author_id ? usersById.get(post.author_id) : undefined;
      return {
        dedupeKey: `x:post:${post.id}`,
        id: post.id,
        text: post.text ?? '',
        postedAt: post.created_at ?? '',
        authorId: post.author_id ?? '',
        authorUsername: author?.username ?? '',
        authorName: author?.name ?? '',
        url: postUrl(post, author),
        publicMetrics: post.public_metrics ?? {},
        conversationId: post.conversation_id ?? '',
        referencedTweets: post.referenced_tweets ?? []
      };
    })
    .sort((a, b) => comparePostIds(a.id, b.id));
}

export function formatPostsMarkdown(title: string, response: XPostListResponse): string {
  const events = normalizePostEvents(response).sort((a, b) => comparePostIds(b.id, a.id));
  if (!events.length) return `# ${title}\n\n未查询到 X 内容。`;

  const lines = [`# ${title}`, '', `共返回 ${events.length} 条。`];
  events.forEach((event, index) => {
    const author = event.authorUsername ? `@${event.authorUsername}` : event.authorName;
    const meta = [author, event.postedAt].filter(Boolean).join(' · ');
    lines.push('', `## ${index + 1}. ${event.id}`);
    if (meta) lines.push(meta);
    const text = cleanText(event.text);
    if (text) lines.push('', text);
    lines.push('', `链接：${event.url}`);
  });
  return lines.join('\n');
}

export function formatUserMarkdown(user: XUser): string {
  const lines = [`# X 账号 @${user.username ?? user.id}`, '', user.name ?? ''];
  const description = cleanText(user.description);
  if (description) lines.push('', description);
  const metrics = user.public_metrics;
  if (metrics) {
    lines.push(
      '',
      `关注者 ${metrics.followers_count ?? 0} · 关注 ${metrics.following_count ?? 0} · Posts ${metrics.tweet_count ?? 0}`
    );
  }
  return lines.filter((line, index, arr) => line || arr[index - 1] !== '').join('\n');
}

export function formatSourceLinksFromPosts(response: XPostListResponse): string {
  return normalizePostEvents(response)
    .map(
      (event, index) =>
        `${index + 1}. ${event.authorUsername ? `@${event.authorUsername} ` : ''}${event.id} - ${event.url}`
    )
    .join('\n');
}

export function formatWatchSummary(username: string, count: number, newestPostId: string): string {
  if (!count) return `未发现 @${username} 的新增 X 内容。`;
  return `发现 @${username} 的 ${count} 条新增 X 内容。最新 Post ID：${newestPostId}`;
}
