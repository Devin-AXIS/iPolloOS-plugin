import {
  AihotConfigSchema,
  DailyResponseSchema,
  DailiesResponseSchema,
  ItemsResponseSchema,
  type AihotConfig,
  type DailyResponse,
  type DailiesResponse,
  type ItemsResponse
} from './schemas';

export class AihotHttpError extends Error {
  constructor(
    message: string,
    public readonly status?: number
  ) {
    super(message);
    this.name = 'AihotHttpError';
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

async function requestJson(path: string, rawConfig: unknown): Promise<unknown> {
  const config = AihotConfigSchema.parse(rawConfig);
  const url = `${normalizeBaseUrl(config.baseUrl)}${path}`;
  const res = await fetch(url, {
    headers: {
      Accept: 'application/json',
      'User-Agent': config.userAgent
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
    throw new AihotHttpError(
      `AI HOT 请求失败 HTTP ${res.status}${body ? `: ${body}` : ''}`,
      res.status
    );
  }

  return data;
}

function appendIfPresent(params: URLSearchParams, key: string, value: unknown) {
  const text = typeof value === 'string' ? value.trim() : value === undefined ? '' : String(value);
  if (text) params.set(key, text);
}

export async function fetchItems(
  config: AihotConfig,
  input: {
    mode: 'selected' | 'all';
    take: number;
    q?: string;
    category?: string;
    since?: string;
    cursor?: string;
  }
): Promise<ItemsResponse> {
  const params = new URLSearchParams();
  params.set('mode', input.mode);
  params.set('take', String(Math.min(Math.max(input.take, 1), config.maxItems)));
  appendIfPresent(params, 'q', input.q);
  appendIfPresent(params, 'category', input.category);
  appendIfPresent(params, 'since', input.since);
  appendIfPresent(params, 'cursor', input.cursor);

  const data = await requestJson(`/api/public/items?${params.toString()}`, config);
  return ItemsResponseSchema.parse(data);
}

export async function fetchDaily(config: AihotConfig, date?: string): Promise<DailyResponse> {
  const cleanDate = date?.trim();
  const path = cleanDate
    ? `/api/public/daily/${encodeURIComponent(cleanDate)}`
    : '/api/public/daily';
  const data = await requestJson(path, config);
  return DailyResponseSchema.parse(data);
}

export async function fetchDailies(config: AihotConfig, take: number): Promise<DailiesResponse> {
  const params = new URLSearchParams();
  params.set('take', String(Math.min(Math.max(take, 1), config.maxItems)));
  const data = await requestJson(`/api/public/dailies?${params.toString()}`, config);
  return DailiesResponseSchema.parse(data);
}
