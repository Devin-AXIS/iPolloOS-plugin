import { z } from 'zod';

export const stringInput = (max = 4096) =>
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

export const MarketCoreConfigSchema = z.object({
  marketDataProvider: z.string().optional(),
  fmpApiKey: z.string().optional(),
  finnhubApiKey: z.string().optional(),
  alphaVantageApiKey: z.string().optional()
});

export type SignalLabel = 'opportunity' | 'risk' | 'watch' | 'needs_verification';

export type MarketSignalEvent = {
  eventId: string;
  eventType: string;
  title: string;
  summary: string;
  detectedAt: string;
  entities: Array<{
    type: 'ticker' | 'company' | 'person' | 'institution' | 'theme' | 'industry';
    name: string;
    ticker?: string;
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

export function parseSymbols(value: unknown): string[] {
  const raw = String(value ?? '');
  return Array.from(
    new Set(
      raw
        .split(/[\s,，;；]+/)
        .map((item) => item.trim().replace(/^\$/, '').toUpperCase())
        .filter(Boolean)
    )
  ).slice(0, 100);
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
  const sourceQuality = clamp(input.sourceQuality ?? 60);
  const marketImpact = clamp(input.marketImpact ?? 60);
  const userRelevance = clamp(input.userRelevance ?? 70);
  const confidence = clamp(input.confidence ?? 60);
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

export function sourceEvidence(sourceName = 'provided_market_data', confidence = 70) {
  return [
    {
      sourceName,
      sourceType: 'data_vendor',
      confidence,
      delayLabel: 'unknown'
    }
  ];
}
