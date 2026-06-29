import {
  XActionConfigSchema,
  XConfigSchema,
  XGenericActionResponseSchema,
  XPostListResponseSchema,
  XReadConfigSchema,
  XTrendsResponseSchema,
  XUserLookupResponseSchema,
  cleanUsername,
  type XActionConfig,
  type XConfig,
  type XFollowManageAction,
  type XPostListResponse,
  type XPostManageAction,
  type XReadConfig,
  type XSearchScope,
  type XSearchView,
  type XTrendsResponse,
  type XUser
} from './schemas';
import { comparePostIds, normalizePostId } from './postId';
import { ProxyAgent, type Dispatcher } from 'undici';
import { createHmac, randomBytes } from 'node:crypto';

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

export class XApiNetworkError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'XApiNetworkError';
  }
}

function normalizeBaseUrl(baseUrl: string): string {
  return baseUrl.replace(/\/+$/, '');
}

type RequestAuthMode = 'read' | 'user';

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

function hasOAuth1UserConfig(config: XConfig): boolean {
  return Boolean(
    config.consumerKey &&
      config.consumerSecret &&
      config.userAccessToken &&
      config.userAccessTokenSecret
  );
}

function resolveToken(config: XConfig, auth: RequestAuthMode): string {
  const token =
    auth === 'user' ? config.userAccessToken : config.bearerToken || config.userAccessToken;
  if (!token) {
    throw new Error(
      auth === 'user' ? 'X user action token is required' : 'X read token is required'
    );
  }
  return token;
}

function percentEncode(value: string): string {
  return encodeURIComponent(value).replace(
    /[!'()*]/g,
    (char) => `%${char.charCodeAt(0).toString(16).toUpperCase()}`
  );
}

function getOAuth1SignatureUrl(rawUrl: string): string {
  const url = new URL(rawUrl);
  const apiV2Index = url.pathname.indexOf('/2/');
  if (url.origin !== 'https://api.x.com' && apiV2Index >= 0) {
    return `https://api.x.com${url.pathname.slice(apiV2Index)}${url.search}`;
  }
  return rawUrl;
}

function createOAuth1Header(config: XConfig, method: string, rawUrl: string): string {
  if (!hasOAuth1UserConfig(config)) {
    throw new Error('OAuth 1.0a credentials are incomplete');
  }

  const url = new URL(getOAuth1SignatureUrl(rawUrl));
  const oauthParams: Record<string, string> = {
    oauth_consumer_key: config.consumerKey!,
    oauth_nonce: randomBytes(16).toString('hex'),
    oauth_signature_method: 'HMAC-SHA1',
    oauth_timestamp: String(Math.floor(Date.now() / 1000)),
    oauth_token: config.userAccessToken!,
    oauth_version: '1.0'
  };

  const signatureParams = [
    ...Array.from(url.searchParams.entries()),
    ...Object.entries(oauthParams)
  ]
    .map(([key, value]) => [percentEncode(key), percentEncode(value)] as const)
    .sort(([leftKey, leftValue], [rightKey, rightValue]) =>
      leftKey === rightKey ? leftValue.localeCompare(rightValue) : leftKey.localeCompare(rightKey)
    )
    .map(([key, value]) => `${key}=${value}`)
    .join('&');

  const baseUrl = `${url.origin}${url.pathname}`;
  const signatureBase = [
    method.toUpperCase(),
    percentEncode(baseUrl),
    percentEncode(signatureParams)
  ].join('&');
  const signingKey = `${percentEncode(config.consumerSecret!)}&${percentEncode(
    config.userAccessTokenSecret!
  )}`;
  const signature = createHmac('sha1', signingKey).update(signatureBase).digest('base64');
  const headerParams = { ...oauthParams, oauth_signature: signature };

  return (
    'OAuth ' +
    Object.entries(headerParams)
      .sort(([left], [right]) => left.localeCompare(right))
      .map(([key, value]) => `${percentEncode(key)}="${percentEncode(value)}"`)
      .join(', ')
  );
}

function resolveAuthorizationHeader(
  config: XConfig,
  auth: RequestAuthMode,
  method: string,
  url: string
): string {
  if (hasOAuth1UserConfig(config) && (auth === 'user' || !config.bearerToken)) {
    return createOAuth1Header(config, method, url);
  }

  return `Bearer ${resolveToken(config, auth)}`;
}

const proxyAgents = new Map<string, Dispatcher>();

function getEnvProxyUrl(): string | undefined {
  const env = typeof process === 'undefined' ? undefined : process.env;
  return (
    env?.X_API_PROXY_URL ||
    env?.X_PROXY_URL ||
    env?.HTTPS_PROXY ||
    env?.https_proxy ||
    env?.HTTP_PROXY ||
    env?.http_proxy ||
    env?.ALL_PROXY ||
    env?.all_proxy ||
    undefined
  );
}

function getProxyUrl(config: XConfig): string | undefined {
  return config.proxyUrl || getEnvProxyUrl();
}

function getProxyDispatcher(proxyUrl: string): Dispatcher {
  const cached = proxyAgents.get(proxyUrl);
  if (cached) return cached;
  const agent = new ProxyAgent(proxyUrl);
  proxyAgents.set(proxyUrl, agent);
  return agent;
}

function describeFetchFailure(error: unknown, url: string, proxyUrl?: string): string {
  const err = error instanceof Error ? error : new Error(String(error));
  const cause = (err as Error & { cause?: unknown }).cause;
  const causeRecord =
    cause && typeof cause === 'object' ? (cause as Record<string, unknown>) : undefined;
  const code = causeRecord?.code || causeRecord?.errno;
  const causeMessage = causeRecord?.message;
  const parts = [
    `X API request failed before HTTP response`,
    `url=${url}`,
    `error=${err.name}: ${err.message}`
  ];

  if (code) parts.push(`causeCode=${String(code)}`);
  if (causeMessage) parts.push(`cause=${String(causeMessage)}`);
  parts.push(`proxy=${proxyUrl ? 'enabled' : 'disabled'}`);

  return parts.join('; ');
}

async function requestJson(
  path: string,
  rawConfig: unknown,
  options: {
    method?: string;
    body?: unknown;
    auth?: RequestAuthMode;
  } = {}
): Promise<unknown> {
  const config = XConfigSchema.parse(rawConfig);
  const url = `${normalizeBaseUrl(config.baseUrl)}${path}`;
  const method = options.method ?? 'GET';
  const headers: Record<string, string> = {
    Accept: 'application/json',
    Authorization: resolveAuthorizationHeader(config, options.auth ?? 'read', method, url)
  };
  if (options.body !== undefined) {
    headers['Content-Type'] = 'application/json';
  }

  const proxyUrl = getProxyUrl(config);
  const requestInit: RequestInit & { dispatcher?: Dispatcher } = {
    method,
    headers,
    body: options.body === undefined ? undefined : JSON.stringify(options.body),
    signal: withTimeout(config.timeoutMs)
  };

  if (proxyUrl) {
    requestInit.dispatcher = getProxyDispatcher(proxyUrl);
  }

  let res: Response;
  try {
    res = await fetch(url, requestInit);
  } catch (error) {
    throw new XApiNetworkError(describeFetchFailure(error, url, proxyUrl));
  }

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

function asRecord(value: unknown): Record<string, unknown> | undefined {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : undefined;
}

function asArray(value: unknown): unknown[] {
  return Array.isArray(value) ? value : [];
}

function getPath(value: unknown, path: string[]): unknown {
  return path.reduce<unknown>((current, key) => asRecord(current)?.[key], value);
}

function textValue(...values: unknown[]): string | undefined {
  for (const value of values) {
    if (typeof value === 'string' && value.trim()) return value.trim();
    if (typeof value === 'number' || typeof value === 'bigint') return String(value);
  }
  return undefined;
}

function numberValue(value: unknown): number | undefined {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string' && value.trim()) {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) return parsed;
  }
  return undefined;
}

function booleanValue(value: unknown): boolean | undefined {
  if (typeof value === 'boolean') return value;
  if (typeof value === 'string') {
    if (value.toLowerCase() === 'true') return true;
    if (value.toLowerCase() === 'false') return false;
  }
  return undefined;
}

function unwrapResult(value: unknown): unknown {
  let node = value;
  for (let i = 0; i < 8; i += 1) {
    const record = asRecord(node);
    const next =
      record?.result ??
      record?.tweet ??
      record?.user ??
      record?.tweet_result ??
      record?.user_result;
    if (!next || next === node) break;
    node = next;
  }
  return node;
}

function collectRecords(value: unknown, output: Record<string, unknown>[] = []) {
  const record = asRecord(value);
  if (record) {
    output.push(record);
    Object.values(record).forEach((child) => collectRecords(child, output));
    return output;
  }
  if (Array.isArray(value)) {
    value.forEach((child) => collectRecords(child, output));
  }
  return output;
}

function findXapiUserNode(raw: unknown): Record<string, unknown> | undefined {
  const directPaths = [
    ['data', 'user', 'result'],
    ['data', 'user'],
    ['user_result', 'result'],
    ['user_results', 'result'],
    ['result'],
    ['legacy']
  ];

  for (const path of directPaths) {
    const candidate = asRecord(unwrapResult(getPath(raw, path)));
    const user = normalizeXapiUser(candidate);
    if (user?.id) return candidate;
  }

  return collectRecords(raw).find((candidate) => Boolean(normalizeXapiUser(candidate)?.id));
}

function summarizeXapiResponse(raw: unknown): string {
  const root = asRecord(raw);
  if (!root) return `rawType=${typeof raw}`;

  const data = asRecord(root.data);
  const errors = asArray(root.errors)
    .map((item) => {
      const error = asRecord(item);
      return textValue(error?.code, error?.status, error?.message, error?.detail, error?.title);
    })
    .filter(Boolean)
    .slice(0, 3)
    .join(' | ');
  const keys = Object.keys(root).slice(0, 20).join(',');
  const dataKeys = data ? Object.keys(data).slice(0, 20).join(',') : '';
  const code = textValue(root.code, root.status, data?.code, data?.status);
  const msg = textValue(
    root.msg,
    root.message,
    root.detail,
    data?.msg,
    data?.message,
    data?.detail
  );

  return [
    code ? `code=${code}` : '',
    msg ? `msg=${msg}` : '',
    errors ? `errors=${errors}` : '',
    `keys=${keys || '(none)'}`,
    dataKeys ? `dataKeys=${dataKeys}` : ''
  ]
    .filter(Boolean)
    .join('; ');
}

function normalizeXapiUser(value: unknown): XUser | undefined {
  const node = asRecord(unwrapResult(value));
  if (!node) return undefined;
  const legacy = asRecord(node.legacy) ?? node;
  const id = textValue(node.rest_id, node.id, node.id_str, legacy.id_str, legacy.id);
  if (!id) return undefined;

  return {
    id,
    name: textValue(legacy.name, node.name),
    username: textValue(legacy.screen_name, legacy.username, node.screen_name, node.username),
    description: textValue(legacy.description, node.description),
    verified: booleanValue(legacy.verified) ?? booleanValue(node.verified),
    verified_type: textValue(legacy.verified_type, node.verified_type),
    public_metrics: {
      followers_count: numberValue(legacy.followers_count),
      following_count: numberValue(legacy.friends_count ?? legacy.following_count),
      tweet_count: numberValue(legacy.statuses_count ?? legacy.tweet_count),
      listed_count: numberValue(legacy.listed_count)
    }
  };
}

function normalizeReferencedTweets(legacy: Record<string, unknown>) {
  const refs: Array<{ type: string; id: string }> = [];
  const replyId = normalizePostId(
    textValue(legacy.in_reply_to_status_id_str, legacy.in_reply_to_status_id)
  );
  const retweetId = normalizePostId(
    textValue(
      legacy.retweeted_status_id_str,
      legacy.retweeted_status_id,
      asRecord(legacy.retweeted_status_result)?.rest_id
    )
  );
  const quoteId = normalizePostId(textValue(legacy.quoted_status_id_str, legacy.quoted_status_id));
  if (replyId) refs.push({ type: 'replied_to', id: replyId });
  if (retweetId) refs.push({ type: 'retweeted', id: retweetId });
  if (quoteId) refs.push({ type: 'quoted', id: quoteId });
  return refs;
}

function normalizeXapiMedia(value: unknown) {
  return asArray(value)
    .map((item) => {
      const media = asRecord(item);
      if (!media) return undefined;
      const type = textValue(media.type);
      return {
        type,
        altText: textValue(media.ext_alt_text, media.alt_text, media.altText),
        caption: textValue(media.caption),
        description: textValue(media.description, media.mediaDescription),
        ocrText: textValue(media.ocr_text, media.ocrText)
      };
    })
    .filter((item): item is NonNullable<typeof item> =>
      Boolean(item?.type || item?.altText || item?.caption || item?.description || item?.ocrText)
    );
}

function normalizeXapiPost(value: unknown): XPostListResponse['data'][number] | undefined {
  const node = asRecord(unwrapResult(value));
  if (!node) return undefined;
  const legacy = asRecord(node.legacy) ?? node;
  const id = normalizePostId(
    textValue(node.rest_id, node.id, node.id_str, legacy.id_str, legacy.id)
  );
  const text = textValue(
    legacy.full_text,
    legacy.text,
    node.full_text,
    node.text,
    asRecord(node.note_tweet)?.text
  );
  if (!id || text === undefined) return undefined;

  const coreUser = normalizeXapiUser(getPath(node, ['core', 'user_results', 'result']));
  const authorId = textValue(
    node.author_id,
    legacy.user_id_str,
    legacy.user_id,
    coreUser?.id,
    getPath(node, ['core', 'user_results', 'result', 'rest_id'])
  );
  const referencedTweets = normalizeReferencedTweets(legacy);
  const media = normalizeXapiMedia(
    getPath(legacy, ['extended_entities', 'media']) ??
      getPath(legacy, ['entities', 'media']) ??
      getPath(node, ['extended_entities', 'media']) ??
      getPath(node, ['entities', 'media'])
  );

  return {
    id,
    text,
    author_id: authorId,
    created_at: textValue(legacy.created_at, node.created_at),
    conversation_id: textValue(legacy.conversation_id_str, legacy.conversation_id, id),
    lang: textValue(legacy.lang, node.lang),
    public_metrics: {
      retweet_count: numberValue(legacy.retweet_count),
      reply_count: numberValue(legacy.reply_count),
      like_count: numberValue(legacy.favorite_count ?? legacy.like_count),
      quote_count: numberValue(legacy.quote_count),
      impression_count: numberValue(legacy.view_count ?? getPath(node, ['views', 'count']))
    },
    referenced_tweets: referencedTweets.length ? referencedTweets : undefined,
    media: media.length ? media : undefined
  };
}

function extractXapiTweetNodes(raw: unknown): unknown[] {
  const output: unknown[] = [];
  const seen = new Set<unknown>();

  function visit(value: unknown) {
    if (value === null || value === undefined || seen.has(value)) return;
    if (typeof value !== 'object') return;
    seen.add(value);

    const record = asRecord(value);
    if (!record) {
      asArray(value).forEach(visit);
      return;
    }

    const itemContent = asRecord(record.itemContent);
    const tweetResult = getPath(itemContent, ['tweet_results', 'result']);
    if (tweetResult) output.push(tweetResult);

    const direct = normalizeXapiPost(record);
    if (direct) output.push(record);

    Object.values(record).forEach(visit);
  }

  visit(raw);
  return output;
}

function normalizeXapiPosts(
  raw: unknown,
  input: {
    sinceId?: string;
    includeReplies?: boolean;
    includeRetweets?: boolean;
  }
): XPostListResponse {
  const postsById = new Map<string, XPostListResponse['data'][number]>();
  const usersById = new Map<string, XUser>();

  for (const node of extractXapiTweetNodes(raw)) {
    const post = normalizeXapiPost(node);
    if (!post) continue;

    if (input.sinceId && comparePostIds(post.id, input.sinceId) <= 0) continue;
    const refs = post.referenced_tweets ?? [];
    if (input.includeReplies === false && refs.some((ref) => ref.type === 'replied_to')) continue;
    if (input.includeRetweets === false && refs.some((ref) => ref.type === 'retweeted')) continue;

    postsById.set(post.id, post);
    const author = normalizeXapiUser(getPath(node, ['core', 'user_results', 'result']));
    if (author?.id) usersById.set(author.id, author);
  }

  const data = Array.from(postsById.values()).sort((a, b) => comparePostIds(b.id, a.id));
  const nextToken = textValue(
    getPath(raw, ['data', 'cursor', 'bottom']),
    getPath(raw, ['data', 'next_cursor']),
    getPath(raw, ['data', 'nextCursor']),
    getPath(raw, ['next_cursor']),
    getPath(raw, ['nextCursor'])
  );

  return XPostListResponseSchema.parse({
    data,
    includes: {
      users: Array.from(usersById.values())
    },
    meta: {
      result_count: data.length,
      newest_id: data[0]?.id,
      oldest_id: data[data.length - 1]?.id,
      next_token: nextToken
    }
  });
}

export async function lookupUserByUsername(config: XReadConfig, username: string): Promise<XUser> {
  const parsedConfig = XReadConfigSchema.parse(config);
  const handle = cleanUsername(username);
  if (!handle) throw new Error('username is required');

  const data = await requestJson(
    `/base/apitools/userByScreenNameV2?screenName=${encodePathPart(handle)}&resFormat=json`,
    parsedConfig
  );
  const user = normalizeXapiUser(findXapiUserNode(data));
  if (!user?.id) {
    throw new Error(
      `X user @${handle} not found via xapi.to userByScreenNameV2; ${summarizeXapiResponse(data)}`
    );
  }
  return user;
}

export async function getAuthenticatedUser(config: XActionConfig): Promise<XUser> {
  const parsedConfig = XActionConfigSchema.parse(config);
  const params = new URLSearchParams();
  appendCsv(params, 'user.fields', DEFAULT_USER_FIELDS);
  const data = await requestJson(`/2/users/me?${params}`, parsedConfig, { auth: 'user' });
  const parsed = XUserLookupResponseSchema.parse(data);
  if (!parsed.data) throw new Error('X authenticated user not found');
  return parsed.data;
}

export async function getUserPosts(
  config: XReadConfig,
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
  const parsedConfig = XReadConfigSchema.parse(config);
  const params = new URLSearchParams();
  params.set('userId', input.userId);
  params.set('cursor', input.paginationToken || '-1');
  params.set('resFormat', 'json');

  const data = await requestJson(`/base/apitools/userTweetsV2?${params}`, parsedConfig);
  const normalized = normalizeXapiPosts(data, input);
  return {
    ...normalized,
    data: normalized.data.slice(
      0,
      Math.min(Math.max(input.maxResults ?? config.defaultMaxResults, 5), 100)
    ),
    meta: {
      ...normalized.meta,
      result_count: Math.min(
        normalized.data.length,
        Math.min(Math.max(input.maxResults ?? config.defaultMaxResults, 5), 100)
      )
    }
  };
}

export async function searchRecentPosts(
  config: XReadConfig,
  input: {
    query: string;
    maxResults?: number;
    paginationToken?: string;
    startTime?: string;
    endTime?: string;
    sortOrder?: 'recency' | 'relevancy';
  }
): Promise<XPostListResponse> {
  const parsedConfig = XReadConfigSchema.parse(config);
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
  appendIfPresent(params, 'sort_order', input.sortOrder);

  const data = await requestJson(`/2/tweets/search/recent?${params}`, parsedConfig);
  return XPostListResponseSchema.parse(data);
}

export async function searchAllPosts(
  config: XReadConfig,
  input: {
    query: string;
    maxResults?: number;
    paginationToken?: string;
    startTime?: string;
    endTime?: string;
    sortOrder?: 'recency' | 'relevancy';
  }
): Promise<XPostListResponse> {
  const parsedConfig = XReadConfigSchema.parse(config);
  const query = input.query.trim();
  if (!query) throw new Error('query is required');

  const params = new URLSearchParams();
  params.set('query', query);
  params.set(
    'max_results',
    String(Math.min(Math.max(input.maxResults ?? config.defaultMaxResults, 10), 500))
  );
  appendCsv(params, 'tweet.fields', DEFAULT_TWEET_FIELDS);
  appendCsv(params, 'user.fields', DEFAULT_USER_FIELDS);
  params.set('expansions', 'author_id');
  appendIfPresent(params, 'pagination_token', input.paginationToken);
  appendIfPresent(params, 'start_time', input.startTime);
  appendIfPresent(params, 'end_time', input.endTime);
  appendIfPresent(params, 'sort_order', input.sortOrder);

  const data = await requestJson(`/2/tweets/search/all?${params}`, parsedConfig);
  return XPostListResponseSchema.parse(data);
}

export async function searchPosts(
  config: XReadConfig,
  input: {
    query: string;
    scope?: XSearchScope;
    view?: XSearchView;
    maxResults?: number;
  }
): Promise<XPostListResponse> {
  const view = input.view ?? 'latest';
  const sortOrder = view === 'relevant' ? 'relevancy' : 'recency';
  const maxResults = view === 'hot' ? Math.max(input.maxResults ?? 50, 50) : input.maxResults;

  const response =
    input.scope === 'all'
      ? await searchAllPosts(config, {
          query: input.query,
          maxResults,
          sortOrder
        })
      : await searchRecentPosts(config, {
          query: input.query,
          maxResults,
          sortOrder
        });

  if (view !== 'hot') return response;

  return {
    ...response,
    data: [...response.data]
      .sort((a, b) => engagementScore(b) - engagementScore(a))
      .slice(0, input.maxResults ?? 10)
  };
}

function engagementScore(post: { public_metrics?: Record<string, number | undefined> }) {
  const metrics = post.public_metrics ?? {};
  return (
    (metrics.like_count ?? 0) +
    (metrics.retweet_count ?? 0) * 2 +
    (metrics.reply_count ?? 0) * 2 +
    (metrics.quote_count ?? 0) * 3
  );
}

export async function getTrendsByWoeid(
  config: XReadConfig,
  input: {
    woeid: number;
    maxTrends?: number;
  }
): Promise<XTrendsResponse> {
  const parsedConfig = XReadConfigSchema.parse(config);
  const params = new URLSearchParams();
  params.set('max_trends', String(Math.min(Math.max(input.maxTrends ?? 20, 1), 50)));
  params.set('trend.fields', 'trend_name,tweet_count');

  const data = await requestJson(
    `/2/trends/by/woeid/${encodePathPart(String(input.woeid))}?${params}`,
    parsedConfig
  );
  return XTrendsResponseSchema.parse(data);
}

function parseActionResponse(data: unknown) {
  return XGenericActionResponseSchema.parse(data);
}

export async function createPost(
  config: XActionConfig,
  input: {
    text: string;
    quotePostId?: string;
    mediaIds?: string[];
  }
) {
  const parsedConfig = XActionConfigSchema.parse(config);
  const text = input.text.trim();
  if (!text) throw new Error('text is required');

  const body: Record<string, unknown> = { text };
  if (input.quotePostId?.trim()) body.quote_tweet_id = input.quotePostId.trim();
  const mediaIds = input.mediaIds?.map((id) => id.trim()).filter(Boolean) ?? [];
  if (mediaIds.length) body.media = { media_ids: mediaIds };

  return parseActionResponse(
    await requestJson('/2/tweets', parsedConfig, {
      method: 'POST',
      body,
      auth: 'user'
    })
  );
}

export async function replyToPost(
  config: XActionConfig,
  input: {
    text: string;
    replyToPostId: string;
    mediaIds?: string[];
  }
) {
  const parsedConfig = XActionConfigSchema.parse(config);
  const text = input.text.trim();
  const replyToPostId = input.replyToPostId.trim();
  if (!text) throw new Error('text is required');
  if (!replyToPostId) throw new Error('reply_to_post_id is required');

  const body: Record<string, unknown> = {
    text,
    reply: {
      in_reply_to_tweet_id: replyToPostId
    }
  };
  const mediaIds = input.mediaIds?.map((id) => id.trim()).filter(Boolean) ?? [];
  if (mediaIds.length) body.media = { media_ids: mediaIds };

  return parseActionResponse(
    await requestJson('/2/tweets', parsedConfig, {
      method: 'POST',
      body,
      auth: 'user'
    })
  );
}

export async function managePostAction(
  config: XActionConfig,
  input: {
    actorUserId: string;
    postId: string;
    action: XPostManageAction;
  }
) {
  const parsedConfig = XActionConfigSchema.parse(config);
  const actorUserId = input.actorUserId.trim();
  const postId = input.postId.trim();
  if (!actorUserId) throw new Error('actor_user_id is required');
  if (!postId) throw new Error('post_id is required');

  if (input.action === 'delete') {
    return parseActionResponse(
      await requestJson(`/2/tweets/${encodePathPart(postId)}`, parsedConfig, {
        method: 'DELETE',
        auth: 'user'
      })
    );
  }

  if (input.action === 'like') {
    return parseActionResponse(
      await requestJson(`/2/users/${encodePathPart(actorUserId)}/likes`, parsedConfig, {
        method: 'POST',
        body: { tweet_id: postId },
        auth: 'user'
      })
    );
  }

  if (input.action === 'unlike') {
    return parseActionResponse(
      await requestJson(
        `/2/users/${encodePathPart(actorUserId)}/likes/${encodePathPart(postId)}`,
        parsedConfig,
        {
          method: 'DELETE',
          auth: 'user'
        }
      )
    );
  }

  if (input.action === 'repost') {
    return parseActionResponse(
      await requestJson(`/2/users/${encodePathPart(actorUserId)}/retweets`, parsedConfig, {
        method: 'POST',
        body: { tweet_id: postId },
        auth: 'user'
      })
    );
  }

  return parseActionResponse(
    await requestJson(
      `/2/users/${encodePathPart(actorUserId)}/retweets/${encodePathPart(postId)}`,
      parsedConfig,
      {
        method: 'DELETE',
        auth: 'user'
      }
    )
  );
}

export async function manageFollowAction(
  config: XActionConfig,
  input: {
    actorUserId: string;
    targetUserId: string;
    action: XFollowManageAction;
  }
) {
  const parsedConfig = XActionConfigSchema.parse(config);
  const actorUserId = input.actorUserId.trim();
  const targetUserId = input.targetUserId.trim();
  if (!actorUserId) throw new Error('actor_user_id is required');
  if (!targetUserId) throw new Error('target_user_id is required');

  if (input.action === 'follow') {
    return parseActionResponse(
      await requestJson(`/2/users/${encodePathPart(actorUserId)}/following`, parsedConfig, {
        method: 'POST',
        body: { target_user_id: targetUserId },
        auth: 'user'
      })
    );
  }

  return parseActionResponse(
    await requestJson(
      `/2/users/${encodePathPart(actorUserId)}/following/${encodePathPart(targetUserId)}`,
      parsedConfig,
      {
        method: 'DELETE',
        auth: 'user'
      }
    )
  );
}
