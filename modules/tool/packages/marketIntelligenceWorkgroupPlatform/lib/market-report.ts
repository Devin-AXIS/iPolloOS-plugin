import { z } from 'zod';

export type MarketDashboardType =
  | 'market_opportunity'
  | 'smart_money'
  | 'ticker_event'
  | 'theme_industry'
  | 'people_institution';

export type MarketEvidence = {
  sourceName: string;
  sourceType?: string;
  url?: string;
  publishedAt?: string;
  confidence?: number;
  delayLabel?: string;
};

export type MarketDashboardSignal = {
  title: string;
  summary: string;
  entity?: string;
  ticker?: string;
  eventType?: string;
  label: 'opportunity' | 'risk' | 'watch' | 'neutral';
  score: number;
  direction?: 'up' | 'down' | 'mixed' | 'neutral';
  whyItMatters?: string;
  delayOrLimitation?: string;
  nextVerification?: string;
  metrics: Record<string, string | number | boolean>;
  evidence: MarketEvidence[];
  tags: string[];
};

export type MarketDashboardSection = {
  title: string;
  subtitle?: string;
  items: Array<{
    label: string;
    value?: string | number;
    note?: string;
    tone?: 'green' | 'red' | 'amber' | 'blue' | 'neutral';
  }>;
};

export type MarketDashboardReport = {
  reportType: MarketDashboardType;
  title: string;
  subtitle: string;
  asOf: string;
  preparedFor: string;
  marketContext: string;
  summary: string;
  signals: MarketDashboardSignal[];
  sections: MarketDashboardSection[];
  sources: MarketEvidence[];
  dataGaps: string[];
  accent: string;
};

const EvidenceSchema = z
  .object({
    sourceName: z.string().optional(),
    source_name: z.string().optional(),
    sourceType: z.string().optional(),
    source_type: z.string().optional(),
    url: z.string().optional(),
    publishedAt: z.string().optional(),
    published_at: z.string().optional(),
    confidence: z.coerce.number().min(0).max(100).optional(),
    delayLabel: z.string().optional(),
    delay_label: z.string().optional()
  })
  .passthrough();

const SignalSchema = z
  .object({
    title: z.string().optional(),
    summary: z.string().optional(),
    entity: z.string().optional(),
    ticker: z.string().optional(),
    symbol: z.string().optional(),
    eventType: z.string().optional(),
    event_type: z.string().optional(),
    label: z.string().optional(),
    score: z.coerce.number().optional(),
    finalScore: z.coerce.number().optional(),
    direction: z.string().optional(),
    whyItMatters: z.string().optional(),
    why_it_matters: z.string().optional(),
    delayOrLimitation: z.string().optional(),
    delay_or_limitation: z.string().optional(),
    nextVerification: z.string().optional(),
    next_verification: z.string().optional(),
    metrics: z.record(z.string(), z.union([z.string(), z.number(), z.boolean()])).optional(),
    evidence: z.array(EvidenceSchema).optional(),
    tags: z.array(z.string()).optional()
  })
  .passthrough();

const SectionSchema = z
  .object({
    title: z.string().optional(),
    subtitle: z.string().optional(),
    items: z
      .array(
        z
          .object({
            label: z.string().optional(),
            value: z.union([z.string(), z.number()]).optional(),
            note: z.string().optional(),
            tone: z.string().optional()
          })
          .passthrough()
      )
      .optional()
  })
  .passthrough();

const ReportSchema = z
  .object({
    reportType: z.string().optional(),
    report_type: z.string().optional(),
    title: z.string().optional(),
    subtitle: z.string().optional(),
    asOf: z.string().optional(),
    as_of: z.string().optional(),
    preparedFor: z.string().optional(),
    prepared_for: z.string().optional(),
    marketContext: z.string().optional(),
    market_context: z.string().optional(),
    summary: z.string().optional(),
    signals: z.array(SignalSchema).optional(),
    topSignals: z.array(SignalSchema).optional(),
    top_signals: z.array(SignalSchema).optional(),
    events: z.array(SignalSchema).optional(),
    sections: z.array(SectionSchema).optional(),
    sources: z.array(EvidenceSchema).optional(),
    dataGaps: z.array(z.string()).optional(),
    data_gaps: z.array(z.string()).optional()
  })
  .passthrough();

export function parseReportJson(value: unknown): Record<string, unknown> {
  if (typeof value === 'string') {
    const text = value.trim();
    if (!text) return {};
    return JSON.parse(text);
  }
  if (value && typeof value === 'object' && !Array.isArray(value))
    return value as Record<string, unknown>;
  return {};
}

export function normalizeMarketDashboardReport(params: {
  reportJson: unknown;
  reportType: MarketDashboardType;
  fallbackTitle: string;
  reportDate?: string;
  preparedFor?: string;
}): MarketDashboardReport {
  const parsed = ReportSchema.parse(parseReportJson(params.reportJson));
  const rawSignals =
    parsed.signals ?? parsed.topSignals ?? parsed.top_signals ?? parsed.events ?? [];
  const signals = rawSignals.map(normalizeSignal).filter((item) => item.title || item.summary);
  const sources = (parsed.sources ?? []).map(normalizeEvidence).filter((item) => item.sourceName);
  const sections = (parsed.sections ?? []).map(normalizeSection).filter((item) => item.title);
  const asOf =
    cleanText(parsed.asOf ?? parsed.as_of ?? params.reportDate) ||
    new Date().toISOString().slice(0, 10);
  const title = cleanText(parsed.title) || params.fallbackTitle;
  const subtitle =
    cleanText(parsed.subtitle) || defaultSubtitle(params.reportType, signals.length, asOf);
  const summary =
    cleanText(parsed.summary) ||
    (signals.length
      ? `${signals.length} 个市场信号已完成排序，页面按证据质量、影响范围和用户相关性组织。`
      : '当前输入没有可展示的市场信号。');

  return {
    reportType: params.reportType,
    title,
    subtitle,
    asOf,
    preparedFor:
      cleanText(parsed.preparedFor ?? parsed.prepared_for ?? params.preparedFor) ||
      'AI Market Intelligence',
    marketContext: cleanText(parsed.marketContext ?? parsed.market_context),
    summary,
    signals: signals.sort((a, b) => b.score - a.score).slice(0, 20),
    sections,
    sources,
    dataGaps: (parsed.dataGaps ?? parsed.data_gaps ?? []).map(cleanText).filter(Boolean),
    accent: accentFor(params.reportType, signals)
  };
}

function normalizeSignal(raw: z.infer<typeof SignalSchema>): MarketDashboardSignal {
  const label = normalizeLabel(raw.label);
  const score = clamp(raw.score ?? raw.finalScore ?? 50);
  const evidence = (raw.evidence ?? []).map(normalizeEvidence).filter((item) => item.sourceName);
  return {
    title: cleanText(raw.title) || cleanText(raw.summary) || 'Untitled signal',
    summary: cleanText(raw.summary),
    entity: cleanText(raw.entity),
    ticker: cleanText(raw.ticker ?? raw.symbol)
      .replace(/^\$/, '')
      .toUpperCase(),
    eventType: cleanText(raw.eventType ?? raw.event_type),
    label,
    score,
    direction: normalizeDirection(raw.direction),
    whyItMatters: cleanText(raw.whyItMatters ?? raw.why_it_matters),
    delayOrLimitation: cleanText(raw.delayOrLimitation ?? raw.delay_or_limitation),
    nextVerification: cleanText(raw.nextVerification ?? raw.next_verification),
    metrics: raw.metrics ?? {},
    evidence,
    tags: (raw.tags ?? []).map(cleanText).filter(Boolean).slice(0, 6)
  };
}

function normalizeEvidence(raw: z.infer<typeof EvidenceSchema>): MarketEvidence {
  return {
    sourceName: cleanText(raw.sourceName ?? raw.source_name) || 'Source',
    sourceType: cleanText(raw.sourceType ?? raw.source_type),
    url: cleanText(raw.url),
    publishedAt: cleanText(raw.publishedAt ?? raw.published_at),
    confidence: raw.confidence,
    delayLabel: cleanText(raw.delayLabel ?? raw.delay_label)
  };
}

function normalizeSection(raw: z.infer<typeof SectionSchema>): MarketDashboardSection {
  return {
    title: cleanText(raw.title),
    subtitle: cleanText(raw.subtitle),
    items: (raw.items ?? [])
      .map((item) => ({
        label: cleanText(item.label),
        value: item.value,
        note: cleanText(item.note),
        tone: normalizeTone(item.tone)
      }))
      .filter((item) => item.label)
      .slice(0, 12)
  };
}

function defaultSubtitle(reportType: MarketDashboardType, count: number, asOf: string): string {
  const name =
    reportType === 'smart_money'
      ? 'Smart Money'
      : reportType === 'ticker_event'
        ? 'Ticker Event'
        : reportType === 'theme_industry'
          ? 'Theme & Industry'
          : reportType === 'people_institution'
            ? 'People & Institution'
            : 'Opportunity Discovery';
  return `${name} dashboard · ${count} signals · as of ${asOf}`;
}

function accentFor(reportType: MarketDashboardType, signals: MarketDashboardSignal[]): string {
  if (signals.some((item) => item.label === 'risk')) return '#E35656';
  if (reportType === 'smart_money') return '#35C987';
  if (reportType === 'ticker_event') return '#4F8CFF';
  if (reportType === 'theme_industry') return '#D9A441';
  if (reportType === 'people_institution') return '#8A7CFF';
  return '#35C987';
}

function normalizeLabel(value: unknown): MarketDashboardSignal['label'] {
  const text = cleanText(value).toLowerCase();
  if (
    text.includes('risk') ||
    text.includes('bear') ||
    text.includes('sell') ||
    text.includes('down')
  )
    return 'risk';
  if (text.includes('watch') || text.includes('verify')) return 'watch';
  if (text.includes('neutral')) return 'neutral';
  return 'opportunity';
}

function normalizeDirection(value: unknown): MarketDashboardSignal['direction'] {
  const text = cleanText(value).toLowerCase();
  if (text === 'up' || text.includes('bull')) return 'up';
  if (text === 'down' || text.includes('bear')) return 'down';
  if (text === 'mixed') return 'mixed';
  return 'neutral';
}

function normalizeTone(value: unknown): MarketDashboardSection['items'][number]['tone'] {
  const text = cleanText(value).toLowerCase();
  if (['green', 'red', 'amber', 'blue', 'neutral'].includes(text)) return text as any;
  return 'neutral';
}

function cleanText(value: unknown): string {
  return String(value ?? '').trim();
}

function clamp(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.max(0, Math.min(100, Math.round(value)));
}
