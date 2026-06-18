import { z } from 'zod';

export const stringInput = (max = 8192) =>
  z.preprocess((value) => {
    if (value === null || value === undefined) return '';
    if (Array.isArray(value)) return value.join(',');
    return String(value);
  }, z.string().max(max).default(''));

export const optionalJsonInput = z.preprocess((value) => {
  if (value === null || value === undefined || value === '') return undefined;
  if (typeof value === 'string') return JSON.parse(value);
  return value;
}, z.any().optional());

export const NewsThemeConfigSchema = z.object({
  newsProvider: z.string().optional(),
  newsApiKey: z.string().optional(),
  searchApiKey: z.string().optional(),
  socialApiKey: z.string().optional()
});

export type NewsThemeEvent = {
  eventId: string;
  eventType: string;
  title: string;
  summary: string;
  detectedAt: string;
  entities: Array<{
    type: 'ticker' | 'company' | 'person' | 'institution' | 'theme' | 'industry' | 'source';
    name: string;
    ticker?: string;
  }>;
  metrics: Record<string, number | string | boolean>;
  evidence: Array<{
    sourceName: string;
    sourceType: string;
    confidence: number;
    url?: string;
    publishedAt?: string;
  }>;
  scores: {
    magnitude: number;
    novelty: number;
    sourceQuality: number;
    marketImpact: number;
    userRelevance: number;
    confidence: number;
    finalScore: number;
  };
  labels: Array<'opportunity' | 'risk' | 'watch' | 'needs_verification'>;
  compliance: {
    isInvestmentAdvice: false;
    limitation?: string;
  };
};

export function stringifyJson(value: unknown): string {
  return JSON.stringify(value, null, 2);
}

export function parseList(value: unknown, max = 100): string[] {
  const raw = String(value ?? '');
  return Array.from(
    new Set(
      raw
        .split(/[\n,，;；]+/)
        .flatMap((chunk) => chunk.split(/\s{2,}/))
        .map((item) => item.trim())
        .filter(Boolean)
    )
  ).slice(0, max);
}

export function parseTickerList(value: unknown, max = 100): string[] {
  return parseList(value, max).map((item) => item.replace(/^\$/, '').toUpperCase());
}

export function extractRows(raw: unknown): Record<string, any>[] {
  if (!raw) return [];
  if (Array.isArray(raw)) return raw.filter(isRecord);
  if (isRecord(raw)) {
    if (Array.isArray(raw.data)) return raw.data.filter(isRecord);
    if (Array.isArray(raw.results)) return raw.results.filter(isRecord);
    if (Array.isArray(raw.items)) return raw.items.filter(isRecord);
    if (Array.isArray(raw.articles)) return raw.articles.filter(isRecord);
    if (Array.isArray(raw.news)) return raw.news.filter(isRecord);
    if (Array.isArray(raw.signals)) return raw.signals.filter(isRecord);
    if (Array.isArray(raw.relations)) return raw.relations.filter(isRecord);
    return [raw];
  }
  return [];
}

export function isRecord(value: unknown): value is Record<string, any> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

export function numberOrUndefined(value: unknown): number | undefined {
  const n = Number(value);
  return Number.isFinite(n) ? n : undefined;
}

export function scoreEvent(input: {
  magnitude: number;
  novelty?: number;
  sourceQuality?: number;
  marketImpact?: number;
  userRelevance?: number;
  confidence?: number;
}) {
  const magnitude = clamp(input.magnitude);
  const novelty = clamp(input.novelty ?? 60);
  const sourceQuality = clamp(input.sourceQuality ?? 70);
  const marketImpact = clamp(input.marketImpact ?? 60);
  const userRelevance = clamp(input.userRelevance ?? 70);
  const confidence = clamp(input.confidence ?? sourceQuality);
  const finalScore = Math.round(
    0.25 * magnitude +
      0.2 * novelty +
      0.2 * sourceQuality +
      0.2 * marketImpact +
      0.15 * userRelevance
  );
  return { magnitude, novelty, sourceQuality, marketImpact, userRelevance, confidence, finalScore };
}

export function sourceEvidence(input: {
  sourceName?: string;
  sourceType?: string;
  confidence?: number;
  url?: string;
  publishedAt?: string;
}) {
  return [
    {
      sourceName: input.sourceName || 'provided_news_data',
      sourceType: input.sourceType || 'news',
      confidence: input.confidence ?? 70,
      url: input.url,
      publishedAt: input.publishedAt
    }
  ];
}

export function clamp(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.max(0, Math.min(100, Math.round(value)));
}
