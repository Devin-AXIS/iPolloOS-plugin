import { SearchApiConfigSchema, type SearchApiConfig } from './schemas';

export type SearchApiParams = Record<string, string | number | boolean | undefined>;

export class SearchApiHttpError extends Error {
  constructor(
    message: string,
    public readonly status?: number
  ) {
    super(message);
    this.name = 'SearchApiHttpError';
  }
}

const RESULT_KEYS = [
  'organic_results',
  'images',
  'news_results',
  'videos',
  'shorts',
  'jobs',
  'events_results',
  'suggestions',
  'trends',
  'interest_over_time',
  'interest_by_region',
  'related_queries',
  'related_topics',
  'scholar_results',
  'discussions_and_forums',
  'patents',
  'books',
  'local_results',
  'place_results',
  'maps_results',
  'shopping_results',
  'flights',
  'best_flights',
  'hotels',
  'properties',
  'destinations',
  'visual_matches',
  'lens_results',
  'ads',
  'ad_creatives',
  'ai_mode_results',
  'results'
];

function normalizeBaseUrl(baseUrl: string) {
  return baseUrl.replace(/\/+$/, '');
}

function addParam(url: URL, key: string, value: unknown) {
  if (value === undefined || value === null || value === '') return;
  url.searchParams.set(key, String(value));
}

export function localizedParams(
  config: SearchApiConfig,
  input: { country?: string; language?: string; location?: string }
): SearchApiParams {
  return {
    gl: input.country || config.defaultCountry,
    hl: input.language || config.defaultLanguage,
    location: input.location
  };
}

export async function searchApiRequest(
  rawConfig: unknown,
  engine: string,
  params: SearchApiParams
): Promise<unknown> {
  const config = SearchApiConfigSchema.parse(rawConfig);
  const url = new URL(`${normalizeBaseUrl(config.baseUrl)}/api/v1/search`);
  addParam(url, 'api_key', config.apiKey);
  addParam(url, 'engine', engine);

  for (const [key, value] of Object.entries(params)) {
    addParam(url, key, value);
  }

  const res = await fetch(url.toString(), {
    headers: { Accept: 'application/json' }
  });
  const text = await res.text();

  let data: unknown;
  try {
    data = text ? JSON.parse(text) : {};
  } catch {
    data = { raw: text };
  }

  if (!res.ok) {
    throw new SearchApiHttpError(
      `SearchAPI 请求失败 HTTP ${res.status}${text ? `: ${text.slice(0, 1000)}` : ''}`,
      res.status
    );
  }

  return data;
}

export function extractRows(
  data: unknown,
  preferredKeys: string[] = []
): Record<string, unknown>[] {
  const record = isRecord(data) ? data : {};
  for (const key of [...preferredKeys, ...RESULT_KEYS]) {
    const value = record[key];
    if (Array.isArray(value)) return value.filter(isRecord);
  }
  return findFirstArray(record).filter(isRecord);
}

export function compactRows(rows: Record<string, unknown>[], num: number) {
  return rows.slice(0, num).map((row) => {
    const out: Record<string, unknown> = {};
    for (const key of [
      'title',
      'name',
      'link',
      'url',
      'displayed_link',
      'source',
      'snippet',
      'description',
      'date',
      'published_date',
      'thumbnail',
      'image',
      'original',
      'price',
      'rating',
      'reviews',
      'address',
      'phone',
      'extensions',
      'metadata',
      'position',
      'rank',
      'company_name',
      'location',
      'via',
      'job_id',
      'authors',
      'publication_info',
      'cited_by',
      'patent_id',
      'inventor',
      'assignee',
      'book_id',
      'place_id',
      'data_id'
    ]) {
      if (row[key] !== undefined && row[key] !== null && row[key] !== '') out[key] = row[key];
    }
    return Object.keys(out).length ? out : row;
  });
}

export function makeOutput(engine: string, data: unknown, rows: Record<string, unknown>[]) {
  return {
    result: rows,
    raw_json: JSON.stringify(data, null, 2),
    source_links: extractLinks(rows).join('\n'),
    count: rows.length,
    engine
  };
}

export async function runEngineTool(input: {
  props: unknown;
  parse: (props: unknown) => any;
  engine: string | ((parsed: any) => string);
  params: (parsed: any, config: SearchApiConfig, engine: string) => SearchApiParams;
  preferredKeys?: string[] | ((parsed: any, engine: string) => string[]);
  limit?: (parsed: any) => number;
}) {
  const parsed = input.parse(input.props);
  const engine = typeof input.engine === 'function' ? input.engine(parsed) : input.engine;
  const config = SearchApiConfigSchema.parse(parsed);
  const data = await searchApiRequest(parsed, engine, input.params(parsed, config, engine));
  const preferredKeys =
    typeof input.preferredKeys === 'function'
      ? input.preferredKeys(parsed, engine)
      : input.preferredKeys;
  const rows = compactRows(
    extractRows(data, preferredKeys),
    input.limit?.(parsed) ?? parsed.num ?? 20
  );
  return makeOutput(engine, data, rows);
}

export function errorOutput(errorText: string, engine = '') {
  return {
    result: [],
    raw_json: '{}',
    source_links: '',
    count: 0,
    engine,
    system_error: errorText
  };
}

export function filterDomainRank(rows: Record<string, unknown>[], domain: string) {
  const clean = domain
    .trim()
    .replace(/^https?:\/\//, '')
    .replace(/^www\./, '')
    .toLowerCase();
  if (!clean) return rows;

  return rows
    .map((row, index) => ({ row, index }))
    .filter(({ row }) => {
      const text = [row.link, row.url, row.displayed_link, row.domain]
        .map((value) =>
          String(value ?? '')
            .toLowerCase()
            .replace(/^https?:\/\//, '')
            .replace(/^www\./, '')
        )
        .join(' ');
      return text.includes(clean);
    })
    .map(({ row, index }) => ({ ...row, rank: index + 1 }));
}

export function getErrText(error: unknown) {
  if (error instanceof Error) return error.message;
  return String(error);
}

function extractLinks(rows: Record<string, unknown>[]) {
  return Array.from(
    new Set(
      rows
        .flatMap((row) => [
          row.link,
          row.url,
          row.source_link,
          row.thumbnail,
          row.image,
          row.original
        ])
        .map((value) => String(value ?? '').trim())
        .filter((value) => /^https?:\/\//i.test(value))
    )
  );
}

function findFirstArray(value: unknown): Record<string, unknown>[] {
  if (Array.isArray(value)) return value.filter(isRecord);
  if (!isRecord(value)) return [];
  for (const nested of Object.values(value)) {
    const found = findFirstArray(nested);
    if (found.length) return found;
  }
  return [];
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}
