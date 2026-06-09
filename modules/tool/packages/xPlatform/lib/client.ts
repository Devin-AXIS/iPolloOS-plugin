import {
  XConfigSchema,
  XPostListResponseSchema,
  XUserLookupResponseSchema,
  cleanUsername,
  type XConfig,
  type XPostListResponse,
  type XUser
} from './schemas';

const DEFAULT_TWEET_FIELDS = [
  'id',
  'text',
  'author_id',
  'created_at',
  'conversation_id',
  'lang',
  'public_metrics',
  'referenced_tweets'
].join(',');

const DEFAULT_USER_FIELDS = [
  'id',
  'name',
  'username',
  'description',
  'verified',
  'verified_type',
  'public_metrics'
].join(',');

export class XApiHttpError extends Error {
  constructor(
    message: string,
    public readonly status?: number
  ) {
    super(message);
    this.name = 'XApiHttpError';
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

function appendIfPresent(params: URLSearchParams, key: string, value: unknown) {
  const text = typeof value === 'string' ? value.trim() : value === undefined ? '' : String(value);
  if (text) params.set(key, text);
}

function appendCsv(params: URLSearchParams, key: string, value: string) {
  params.set(key, value);
}

function encodePathPart(value: string): string {
  return encodeURIComponent(value.trim());
}

async function requestJson(path: string, rawConfig: unknown): Promise<unknown> {
  const config = XConfigSchema.parse(rawConfig);
  const url = `${normalizeBaseUrl(config.baseUrl)}${path}`;
  const res = await fetch(url, {
    headers: {
      Accept: 'application/json',
      Authorization: `Bearer ${config.bearerToken}`
    },
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
    const body = text.slice(0, 1000);
    throw new XApiHttpError(
      `X API request failed HTTP ${res.status}${body ? `: ${body}` : ''}`,
      res.status
    );
  }

  return data;
}

export async function lookupUserByUsername(config: XConfig, username: string): Promise<XUser> {
  const handle = cleanUsername(username);
  if (!handle) throw new Error('username is required');

  const params = new URLSearchParams();
  appendCsv(params, 'user.fields', DEFAULT_USER_FIELDS);

  const data = await requestJson(
    `/2/users/by/username/${encodePathPart(handle)}?${params}`,
    config
  );
  const parsed = XUserLookupResponseSchema.parse(data);
  if (!parsed.data) {
    throw new Error(`X user @${handle} not found`);
  }
  return parsed.data;
}

export async function getUserPosts(
  config: XConfig,
  input: {
    userId: string;
    maxResults?: number;
    sinceId?: string;
    paginationToken?: string;
    startTime?: string;
    endTime?: string;
    includeReplies?: boolean;
    includeRetweets?: boolean;
  }
): Promise<XPostListResponse> {
  const params = new URLSearchParams();
  params.set(
    'max_results',
    String(Math.min(Math.max(input.maxResults ?? config.defaultMaxResults, 5), 100))
  );
  appendCsv(params, 'tweet.fields', DEFAULT_TWEET_FIELDS);
  appendCsv(params, 'user.fields', DEFAULT_USER_FIELDS);
  params.set('expansions', 'author_id');
  appendIfPresent(params, 'since_id', input.sinceId);
  appendIfPresent(params, 'pagination_token', input.paginationToken);
  appendIfPresent(params, 'start_time', input.startTime);
  appendIfPresent(params, 'end_time', input.endTime);

  const exclude = [
    input.includeRetweets === false ? 'retweets' : '',
    input.includeReplies === false ? 'replies' : ''
  ].filter(Boolean);
  if (exclude.length) params.set('exclude', exclude.join(','));

  const data = await requestJson(
    `/2/users/${encodePathPart(input.userId)}/tweets?${params}`,
    config
  );
  return XPostListResponseSchema.parse(data);
}

export async function searchRecentPosts(
  config: XConfig,
  input: {
    query: string;
    maxResults?: number;
    paginationToken?: string;
    startTime?: string;
    endTime?: string;
  }
): Promise<XPostListResponse> {
  const query = input.query.trim();
  if (!query) throw new Error('query is required');

  const params = new URLSearchParams();
  params.set('query', query);
  params.set(
    'max_results',
    String(Math.min(Math.max(input.maxResults ?? config.defaultMaxResults, 10), 100))
  );
  appendCsv(params, 'tweet.fields', DEFAULT_TWEET_FIELDS);
  appendCsv(params, 'user.fields', DEFAULT_USER_FIELDS);
  params.set('expansions', 'author_id');
  appendIfPresent(params, 'pagination_token', input.paginationToken);
  appendIfPresent(params, 'start_time', input.startTime);
  appendIfPresent(params, 'end_time', input.endTime);

  const data = await requestJson(`/2/tweets/search/recent?${params}`, config);
  return XPostListResponseSchema.parse(data);
}
