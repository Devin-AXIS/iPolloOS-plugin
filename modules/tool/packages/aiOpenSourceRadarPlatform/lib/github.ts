import {
  GithubCommitSchema,
  GithubContentSchema,
  GithubContributorSchema,
  GithubReleaseSchema,
  GithubRepoSchema,
  GithubSearchResponseSchema,
  GithubTreeResponseSchema,
  HnSearchResponseSchema,
  RadarConfigSchema,
  type GithubCommit,
  type GithubContent,
  type GithubContributor,
  type GithubRelease,
  type GithubRepo,
  type GithubTreeItem,
  type HnHit,
  type RadarConfig
} from './schemas';

export class RadarHttpError extends Error {
  constructor(
    message: string,
    public readonly status?: number
  ) {
    super(message);
    this.name = 'RadarHttpError';
  }
}

function normalizeBaseUrl(baseUrl: string): string {
  return baseUrl.replace(/\/+$/, '');
}

function withTimeout(ms: number): AbortSignal {
  const controller = new AbortController();
  setTimeout(() => controller.abort(), ms).unref?.();
  return controller.signal;
}

async function requestJson(
  url: string,
  config: RadarConfig,
  extraHeaders?: Record<string, string>
) {
  const headers: Record<string, string> = {
    Accept: 'application/vnd.github+json',
    'User-Agent': config.userAgent,
    'X-GitHub-Api-Version': '2022-11-28',
    ...extraHeaders
  };
  if (config.githubToken?.trim()) {
    headers.Authorization = `Bearer ${config.githubToken.trim()}`;
  }

  const res = await fetch(url, {
    headers,
    signal: withTimeout(config.timeoutMs)
  });
  const text = await res.text();
  let data: unknown = null;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = null;
  }
  if (!res.ok) {
    const message =
      data && typeof data === 'object' && 'message' in data
        ? String((data as { message?: unknown }).message)
        : text.slice(0, 1000);
    throw new RadarHttpError(`GitHub 请求失败 HTTP ${res.status}: ${message}`, res.status);
  }
  return data;
}

export function parseRepoSlug(input: string): string {
  const text = input.trim();
  const githubUrl = text.match(/github\.com[:/]+([^/\s]+)\/([^/\s#?]+)/i);
  if (githubUrl) return `${githubUrl[1]}/${githubUrl[2].replace(/\.git$/, '')}`;
  const slug = text.match(/^([A-Za-z0-9_.-]+)\/([A-Za-z0-9_.-]+)$/);
  if (slug) return `${slug[1]}/${slug[2].replace(/\.git$/, '')}`;
  throw new Error('请传入 GitHub 仓库链接或 owner/repo，例如 microsoft/autogen。');
}

export function daysFromRange(range: '24h' | '7d' | '15d' | '30d' | '90d' | '180d'): number {
  return range === '24h'
    ? 1
    : range === '7d'
      ? 7
      : range === '15d'
        ? 15
        : range === '30d'
          ? 30
          : range === '180d'
            ? 180
            : 90;
}

export function todayDate(): string {
  return new Date().toISOString().slice(0, 10);
}

export function dateDaysAgo(days: number): string {
  const d = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
  return d.toISOString().slice(0, 10);
}

function encodeQuery(q: string): string {
  return encodeURIComponent(q.replace(/\s+/g, ' ').trim());
}

export function buildAiSearchQuery(input: {
  query?: string;
  direction?: string;
  language?: string;
  minStars?: number;
  timeRange: 'today' | '24h' | '7d' | '15d' | '30d' | '90d' | '180d';
  discoveryMode?: 'recent_new' | 'recent_active' | 'broad_ai';
}): string {
  const parts: string[] = [];
  const userQuery = input.query?.trim();
  const direction = input.direction?.trim();

  if (userQuery) parts.push(userQuery);
  if (direction) parts.push(direction);
  if (!userQuery && !direction) {
    parts.push('AI OR LLM OR agent OR RAG');
  }

  const since =
    input.timeRange === 'today' ? todayDate() : dateDaysAgo(daysFromRange(input.timeRange));
  if (input.discoveryMode === 'recent_active') {
    parts.push('pushed:>=' + since);
  } else if (input.discoveryMode === 'broad_ai') {
    parts.push('pushed:>=' + dateDaysAgo(180));
  } else {
    parts.push('created:>=' + since);
    parts.push('pushed:>=' + since);
  }
  parts.push(`stars:>=${Math.max(input.minStars ?? 20, 0)}`);
  if (input.language?.trim()) parts.push(`language:${input.language.trim()}`);
  parts.push('archived:false');

  return parts.join(' ');
}

export function buildRecentUpdateQuery(input: {
  query?: string;
  direction?: string;
  language?: string;
  minStars?: number;
  timeRange: 'today' | '24h' | '7d' | '15d' | '30d' | '90d' | '180d';
}): string {
  const parts: string[] = [];
  const userQuery = input.query?.trim();
  const direction = input.direction?.trim();
  if (userQuery) parts.push(userQuery);
  if (direction) parts.push(direction);
  if (!userQuery && !direction) parts.push('AI OR LLM OR agent OR RAG');

  const since =
    input.timeRange === 'today' ? todayDate() : dateDaysAgo(daysFromRange(input.timeRange));
  parts.push('pushed:>=' + since);
  parts.push(`stars:>=${Math.max(input.minStars ?? 100, 0)}`);
  if (input.language?.trim()) parts.push(`language:${input.language.trim()}`);
  parts.push('archived:false');
  return parts.join(' ');
}

export async function searchRepos(
  rawConfig: unknown,
  params: {
    q: string;
    sort?: 'stars' | 'updated' | 'forks' | 'help-wanted-issues';
    order?: 'desc' | 'asc';
    perPage: number;
  }
): Promise<{ totalCount: number; incomplete: boolean; items: GithubRepo[] }> {
  const config = RadarConfigSchema.parse(rawConfig);
  const perPage = Math.min(Math.max(params.perPage, 1), config.maxResults);
  const url = `${normalizeBaseUrl(config.githubApiBaseUrl)}/search/repositories?q=${encodeQuery(
    params.q
  )}&sort=${params.sort ?? 'stars'}&order=${params.order ?? 'desc'}&per_page=${perPage}`;
  const data = GithubSearchResponseSchema.parse(await requestJson(url, config));
  return { totalCount: data.total_count, incomplete: data.incomplete_results, items: data.items };
}

export async function getRepo(rawConfig: unknown, slugOrUrl: string): Promise<GithubRepo> {
  const config = RadarConfigSchema.parse(rawConfig);
  const slug = parseRepoSlug(slugOrUrl);
  const data = await requestJson(
    `${normalizeBaseUrl(config.githubApiBaseUrl)}/repos/${slug}`,
    config
  );
  return GithubRepoSchema.parse(data);
}

export async function getReadme(rawConfig: unknown, slugOrUrl: string): Promise<string> {
  const config = RadarConfigSchema.parse(rawConfig);
  const slug = parseRepoSlug(slugOrUrl);
  const data = await requestJson(
    `${normalizeBaseUrl(config.githubApiBaseUrl)}/repos/${slug}/readme`,
    config
  );
  const encoded =
    typeof (data as { content?: unknown }).content === 'string'
      ? (data as { content: string }).content
      : '';
  if (!encoded) return '';
  return Buffer.from(encoded.replace(/\n/g, ''), 'base64').toString('utf8').slice(0, 30_000);
}

export async function listRootContents(
  rawConfig: unknown,
  slugOrUrl: string
): Promise<GithubContent[]> {
  const config = RadarConfigSchema.parse(rawConfig);
  const slug = parseRepoSlug(slugOrUrl);
  const data = await requestJson(
    `${normalizeBaseUrl(config.githubApiBaseUrl)}/repos/${slug}/contents`,
    config
  );
  if (!Array.isArray(data)) return [];
  return data.map((item) => GithubContentSchema.parse(item)).slice(0, 80);
}

export async function listRepoTree(
  rawConfig: unknown,
  slugOrUrl: string,
  branch?: string
): Promise<{
  truncated: boolean;
  tree: GithubTreeItem[];
}> {
  const config = RadarConfigSchema.parse(rawConfig);
  const slug = parseRepoSlug(slugOrUrl);
  const ref = encodeURIComponent(branch || 'HEAD');
  const data = await requestJson(
    `${normalizeBaseUrl(config.githubApiBaseUrl)}/repos/${slug}/git/trees/${ref}?recursive=1`,
    config
  );
  const parsed = GithubTreeResponseSchema.parse(data);
  return { truncated: parsed.truncated, tree: parsed.tree.slice(0, 2000) };
}

export async function getLanguages(
  rawConfig: unknown,
  slugOrUrl: string
): Promise<Record<string, number>> {
  const config = RadarConfigSchema.parse(rawConfig);
  const slug = parseRepoSlug(slugOrUrl);
  const data = await requestJson(
    `${normalizeBaseUrl(config.githubApiBaseUrl)}/repos/${slug}/languages`,
    config
  );
  return data && typeof data === 'object' && !Array.isArray(data)
    ? (data as Record<string, number>)
    : {};
}

export async function listContributors(
  rawConfig: unknown,
  slugOrUrl: string,
  perPage = 10
): Promise<GithubContributor[]> {
  const config = RadarConfigSchema.parse(rawConfig);
  const slug = parseRepoSlug(slugOrUrl);
  const data = await requestJson(
    `${normalizeBaseUrl(config.githubApiBaseUrl)}/repos/${slug}/contributors?per_page=${Math.min(
      Math.max(perPage, 1),
      30
    )}`,
    config
  );
  return Array.isArray(data) ? data.map((item) => GithubContributorSchema.parse(item)) : [];
}

export async function getTextFile(
  rawConfig: unknown,
  slugOrUrl: string,
  path: string
): Promise<string> {
  const config = RadarConfigSchema.parse(rawConfig);
  const slug = parseRepoSlug(slugOrUrl);
  const data = await requestJson(
    `${normalizeBaseUrl(config.githubApiBaseUrl)}/repos/${slug}/contents/${encodeURIComponent(path).replace(/%2F/g, '/')}`,
    config
  );
  const encoded =
    typeof (data as { content?: unknown }).content === 'string'
      ? (data as { content: string }).content
      : '';
  if (!encoded) return '';
  return Buffer.from(encoded.replace(/\n/g, ''), 'base64').toString('utf8').slice(0, 20_000);
}

export async function listRecentCommits(
  rawConfig: unknown,
  slugOrUrl: string,
  perPage = 5
): Promise<GithubCommit[]> {
  const config = RadarConfigSchema.parse(rawConfig);
  const slug = parseRepoSlug(slugOrUrl);
  const url = `${normalizeBaseUrl(config.githubApiBaseUrl)}/repos/${slug}/commits?per_page=${Math.min(
    Math.max(perPage, 1),
    10
  )}`;
  const data = await requestJson(url, config);
  return Array.isArray(data) ? data.map((item) => GithubCommitSchema.parse(item)) : [];
}

export async function listRecentReleases(
  rawConfig: unknown,
  slugOrUrl: string,
  perPage = 3
): Promise<GithubRelease[]> {
  const config = RadarConfigSchema.parse(rawConfig);
  const slug = parseRepoSlug(slugOrUrl);
  const url = `${normalizeBaseUrl(config.githubApiBaseUrl)}/repos/${slug}/releases?per_page=${Math.min(
    Math.max(perPage, 1),
    5
  )}`;
  const data = await requestJson(url, config);
  return Array.isArray(data) ? data.map((item) => GithubReleaseSchema.parse(item)) : [];
}

export async function searchHackerNews(
  rawConfig: unknown,
  query: string,
  hits = 5
): Promise<HnHit[]> {
  const config = RadarConfigSchema.parse(rawConfig);
  const url = `https://hn.algolia.com/api/v1/search?query=${encodeURIComponent(query)}&tags=story&hitsPerPage=${Math.min(
    Math.max(hits, 1),
    10
  )}`;
  const res = await fetch(url, {
    headers: { Accept: 'application/json', 'User-Agent': config.userAgent },
    signal: withTimeout(config.timeoutMs)
  });
  if (!res.ok) return [];
  const data = HnSearchResponseSchema.parse(await res.json());
  return data.hits;
}
