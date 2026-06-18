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

export const FlowConfigSchema = z.object({
  optionsFlowProvider: z.string().optional(),
  optionsFlowApiKey: z.string().optional(),
  darkPoolApiKey: z.string().optional(),
  congressDataApiKey: z.string().optional(),
  fundFlowApiKey: z.string().optional()
});

export type FlowEvent = {
  eventId: string;
  eventType: string;
  title: string;
  summary: string;
  detectedAt: string;
  entities: Array<{
    type: 'ticker' | 'person' | 'institution' | 'fund' | 'contract' | 'venue';
    name: string;
    ticker?: string;
  }>;
  metrics: Record<string, number | string | boolean>;
  evidence: Array<{
    sourceName: string;
    sourceType: string;
    confidence: number;
    url?: string;
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
    if (Array.isArray(raw.trades)) return raw.trades.filter(isRecord);
    if (Array.isArray(raw.transactions)) return raw.transactions.filter(isRecord);
    if (Array.isArray(raw.flows)) return raw.flows.filter(isRecord);
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
  delayLabel?: string;
}) {
  return [
    {
      sourceName: input.sourceName || 'provided_flow_data',
      sourceType: input.sourceType || 'market_flow',
      confidence: input.confidence ?? 70,
      url: input.url,
      delayLabel: input.delayLabel
    }
  ];
}

export function clamp(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.max(0, Math.min(100, Math.round(value)));
}

export function formatCurrency(value: number): string {
  if (Math.abs(value) >= 1_000_000_000) return `$${(value / 1_000_000_000).toFixed(1)}B`;
  if (Math.abs(value) >= 1_000_000) return `$${(value / 1_000_000).toFixed(1)}M`;
  if (Math.abs(value) >= 1_000) return `$${(value / 1_000).toFixed(1)}K`;
  return `$${value.toFixed(0)}`;
}

export function signedPercent(value: number): string {
  return `${value >= 0 ? '+' : ''}${Number(value.toFixed(1))}%`;
}
