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

export const SecConfigSchema = z.object({
  secUserAgent: z.string().optional(),
  secApiBaseUrl: z.string().optional(),
  secCompanyTickersUrl: z.string().optional()
});

export type SignalLabel = 'opportunity' | 'risk' | 'watch' | 'needs_verification';

export type DisclosureEvent = {
  eventId: string;
  eventType: string;
  title: string;
  summary: string;
  detectedAt: string;
  entities: Array<{
    type: 'ticker' | 'company' | 'person' | 'institution' | 'form' | 'metric';
    name: string;
    ticker?: string;
    cik?: string;
  }>;
  metrics: Record<string, number | string | boolean>;
  evidence: Array<{
    sourceName: string;
    sourceType: string;
    url?: string;
    confidence: number;
    delayLabel?: string;
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
  labels: SignalLabel[];
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
        .split(/[\s,，;；]+/)
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
    if (Array.isArray(raw.filings)) return raw.filings.filter(isRecord);
    if (Array.isArray(raw.transactions)) return raw.transactions.filter(isRecord);
    if (Array.isArray(raw.holdings)) return raw.holdings.filter(isRecord);
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

export function clamp(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.max(0, Math.min(100, Math.round(value)));
}

export function sourceEvidence(input: {
  sourceName?: string;
  sourceType?: string;
  confidence?: number;
  url?: string;
  delayLabel?: string;
}) {
  return [
    {
      sourceName: input.sourceName || 'provided_sec_data',
      sourceType: input.sourceType || 'filing',
      confidence: input.confidence ?? 75,
      url: input.url,
      delayLabel: input.delayLabel || 'filing_delay'
    }
  ];
}
