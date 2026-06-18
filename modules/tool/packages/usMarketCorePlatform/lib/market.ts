import { type MarketSignalEvent, scoreEvent, sourceEvidence } from './schemas';

type AssetRow = {
  symbol?: string;
  ticker?: string;
  name?: string;
  price?: number;
  previousClose?: number;
  changePercent?: number;
  volume?: number;
  avgVolume?: number;
  fiftyTwoWeekHigh?: number;
  fiftyTwoWeekLow?: number;
  movingAverage50?: number;
  movingAverage200?: number;
  sourceName?: string;
};

type EarningsRow = {
  symbol?: string;
  ticker?: string;
  company?: string;
  reportDate?: string;
  epsActual?: number;
  epsEstimate?: number;
  revenueActual?: number;
  revenueEstimate?: number;
  guidance?: 'raised' | 'lowered' | 'reaffirmed' | string;
  sourceName?: string;
};

type BreakoutSignal = {
  kind: string;
  title: string;
  summary: string;
  magnitude: number;
  metrics: Record<string, string | number | boolean>;
};

export function normalizeAssetRows(raw: unknown, fallbackSymbols: string[]): AssetRow[] {
  const rows = extractRows(raw);
  if (rows.length) return rows as AssetRow[];
  return fallbackSymbols.map((symbol) => ({ symbol, sourceName: 'watchlist' }));
}

export function buildAssetEvents(input: {
  rows: AssetRow[];
  minSignalScore: number;
  priceMoveThreshold: number;
  volumeSpikeRatio: number;
}) {
  const detectedAt = new Date().toISOString();
  const events: MarketSignalEvent[] = [];

  for (const row of input.rows) {
    const symbol = String(row.symbol || row.ticker || '').toUpperCase();
    if (!symbol) continue;
    const changePercent = numberOrUndefined(row.changePercent) ?? deriveChangePercent(row);
    const volumeRatio =
      numberOrUndefined(row.volume) && numberOrUndefined(row.avgVolume)
        ? Number(row.volume) / Math.max(1, Number(row.avgVolume))
        : undefined;

    if (changePercent !== undefined && Math.abs(changePercent) >= input.priceMoveThreshold) {
      const score = scoreEvent({
        magnitude: Math.min(100, Math.abs(changePercent) * 10),
        novelty: volumeRatio ? Math.min(100, volumeRatio * 30) : 55,
        sourceQuality: row.sourceName === 'watchlist' ? 30 : 70,
        marketImpact: Math.min(100, Math.abs(changePercent) * 8),
        confidence: row.sourceName === 'watchlist' ? 30 : 70
      });
      if (score.finalScore >= input.minSignalScore) {
        events.push({
          eventId: `market:${symbol}:price_move:${detectedAt.slice(0, 10)}`,
          eventType: 'price_move',
          title: `${symbol} price move ${formatPercent(changePercent)}`,
          summary: `${symbol} moved ${formatPercent(changePercent)}${volumeRatio ? ` with ${volumeRatio.toFixed(1)}x relative volume` : ''}.`,
          detectedAt,
          entities: [{ type: 'ticker', name: symbol, ticker: symbol }],
          metrics: {
            changePercent,
            price: row.price ?? '',
            volume: row.volume ?? '',
            avgVolume: row.avgVolume ?? '',
            volumeRatio: volumeRatio ?? ''
          },
          evidence: sourceEvidence(row.sourceName),
          scores: score,
          labels: [changePercent > 0 ? 'opportunity' : 'risk'],
          compliance: {
            isInvestmentAdvice: false,
            limitation:
              'Market movement signal only; verify with current market data and company news.'
          }
        });
      }
    }

    if (volumeRatio !== undefined && volumeRatio >= input.volumeSpikeRatio) {
      const score = scoreEvent({
        magnitude: Math.min(100, volumeRatio * 25),
        novelty: Math.min(100, volumeRatio * 30),
        sourceQuality: row.sourceName === 'watchlist' ? 30 : 70,
        marketImpact: Math.min(100, volumeRatio * 20),
        confidence: row.sourceName === 'watchlist' ? 30 : 70
      });
      if (score.finalScore >= input.minSignalScore) {
        events.push({
          eventId: `market:${symbol}:volume_spike:${detectedAt.slice(0, 10)}`,
          eventType: 'volume_spike',
          title: `${symbol} relative volume ${volumeRatio.toFixed(1)}x`,
          summary: `${symbol} volume is ${volumeRatio.toFixed(1)}x its provided average volume.`,
          detectedAt,
          entities: [{ type: 'ticker', name: symbol, ticker: symbol }],
          metrics: {
            volume: row.volume ?? '',
            avgVolume: row.avgVolume ?? '',
            volumeRatio
          },
          evidence: sourceEvidence(row.sourceName),
          scores: score,
          labels: ['watch'],
          compliance: {
            isInvestmentAdvice: false,
            limitation: 'Volume anomaly does not identify buyer or seller intent.'
          }
        });
      }
    }

    const breakout = detectBreakout(row);
    if (breakout) {
      const score = scoreEvent({
        magnitude: breakout.magnitude,
        novelty: 65,
        sourceQuality: row.sourceName === 'watchlist' ? 30 : 70,
        marketImpact: 60,
        confidence: row.sourceName === 'watchlist' ? 30 : 70
      });
      if (score.finalScore >= input.minSignalScore) {
        events.push({
          eventId: `market:${symbol}:technical_breakout:${breakout.kind}:${detectedAt.slice(0, 10)}`,
          eventType: 'technical_breakout',
          title: `${symbol} ${breakout.title}`,
          summary: breakout.summary,
          detectedAt,
          entities: [{ type: 'ticker', name: symbol, ticker: symbol }],
          metrics: breakout.metrics,
          evidence: sourceEvidence(row.sourceName),
          scores: score,
          labels: ['watch'],
          compliance: {
            isInvestmentAdvice: false,
            limitation: 'Technical signal only; not a trading recommendation.'
          }
        });
      }
    }
  }

  return events.sort((a, b) => b.scores.finalScore - a.scores.finalScore);
}

export function normalizeEarningsRows(raw: unknown, fallbackSymbols: string[]): EarningsRow[] {
  const rows = extractRows(raw);
  if (rows.length) return rows as EarningsRow[];
  return fallbackSymbols.map((symbol) => ({ symbol, sourceName: 'watchlist' }));
}

export function buildEarningsEvents(rows: EarningsRow[], minSignalScore: number) {
  const detectedAt = new Date().toISOString();
  const events: MarketSignalEvent[] = [];

  for (const row of rows) {
    const symbol = String(row.symbol || row.ticker || '').toUpperCase();
    if (!symbol) continue;
    const epsSurprise = surprisePercent(row.epsActual, row.epsEstimate);
    const revenueSurprise = surprisePercent(row.revenueActual, row.revenueEstimate);
    const guidance = row.guidance ? String(row.guidance).toLowerCase() : '';
    const magnitude = Math.max(Math.abs(epsSurprise ?? 0), Math.abs(revenueSurprise ?? 0));

    if (epsSurprise !== undefined || revenueSurprise !== undefined || guidance) {
      const score = scoreEvent({
        magnitude: Math.min(100, magnitude * 8 + (guidance ? 20 : 0)),
        novelty: 70,
        sourceQuality: row.sourceName === 'watchlist' ? 30 : 75,
        marketImpact: guidance === 'raised' || guidance === 'lowered' ? 80 : 65,
        confidence: row.sourceName === 'watchlist' ? 30 : 70
      });
      if (score.finalScore >= minSignalScore) {
        events.push({
          eventId: `market:${symbol}:earnings:${row.reportDate ?? detectedAt.slice(0, 10)}`,
          eventType: guidance ? 'guidance_change' : 'earnings_surprise',
          title: `${symbol} earnings signal`,
          summary: earningsSummary(row, epsSurprise, revenueSurprise, guidance),
          detectedAt,
          entities: [{ type: 'ticker', name: symbol, ticker: symbol }],
          metrics: {
            epsActual: row.epsActual ?? '',
            epsEstimate: row.epsEstimate ?? '',
            epsSurprise: epsSurprise ?? '',
            revenueActual: row.revenueActual ?? '',
            revenueEstimate: row.revenueEstimate ?? '',
            revenueSurprise: revenueSurprise ?? '',
            guidance: guidance || ''
          },
          evidence: sourceEvidence(row.sourceName),
          scores: score,
          labels: guidance === 'lowered' ? ['risk'] : ['watch'],
          compliance: {
            isInvestmentAdvice: false,
            limitation:
              'Earnings signal requires transcript, guidance, and market reaction verification.'
          }
        });
      }
    }
  }

  return events.sort((a, b) => b.scores.finalScore - a.scores.finalScore);
}

function extractRows(raw: unknown): Record<string, any>[] {
  if (!raw) return [];
  if (Array.isArray(raw)) return raw.filter(isRecord);
  if (isRecord(raw)) {
    if (Array.isArray(raw.data)) return raw.data.filter(isRecord);
    if (Array.isArray(raw.results)) return raw.results.filter(isRecord);
    if (Array.isArray(raw.items)) return raw.items.filter(isRecord);
    return [raw];
  }
  return [];
}

function isRecord(value: unknown): value is Record<string, any> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function numberOrUndefined(value: unknown): number | undefined {
  const n = Number(value);
  return Number.isFinite(n) ? n : undefined;
}

function deriveChangePercent(row: AssetRow): number | undefined {
  const price = numberOrUndefined(row.price);
  const previousClose = numberOrUndefined(row.previousClose);
  if (price === undefined || previousClose === undefined || previousClose === 0) return undefined;
  return ((price - previousClose) / previousClose) * 100;
}

function detectBreakout(row: AssetRow): BreakoutSignal | undefined {
  const price = numberOrUndefined(row.price);
  if (price === undefined) return undefined;
  const high = numberOrUndefined(row.fiftyTwoWeekHigh);
  const low = numberOrUndefined(row.fiftyTwoWeekLow);
  const ma50 = numberOrUndefined(row.movingAverage50);
  const ma200 = numberOrUndefined(row.movingAverage200);

  if (high !== undefined && price >= high) {
    return {
      kind: '52w_high',
      title: 'at or above 52-week high',
      summary: `Price is at or above the provided 52-week high (${high}).`,
      magnitude: 75,
      metrics: { price, fiftyTwoWeekHigh: high }
    };
  }
  if (low !== undefined && price <= low) {
    return {
      kind: '52w_low',
      title: 'at or below 52-week low',
      summary: `Price is at or below the provided 52-week low (${low}).`,
      magnitude: 75,
      metrics: { price, fiftyTwoWeekLow: low }
    };
  }
  if (ma50 !== undefined && ma200 !== undefined && price > ma50 && ma50 > ma200) {
    return {
      kind: 'ma_stack',
      title: 'above rising moving-average stack',
      summary:
        'Price is above the 50-day average, and the 50-day average is above the 200-day average.',
      magnitude: 60,
      metrics: { price, movingAverage50: ma50, movingAverage200: ma200 }
    };
  }
  return undefined;
}

function surprisePercent(actual?: number, estimate?: number): number | undefined {
  const a = numberOrUndefined(actual);
  const e = numberOrUndefined(estimate);
  if (a === undefined || e === undefined || e === 0) return undefined;
  return ((a - e) / Math.abs(e)) * 100;
}

function earningsSummary(
  row: EarningsRow,
  eps?: number,
  revenue?: number,
  guidance?: string
): string {
  const parts: string[] = [];
  if (eps !== undefined) parts.push(`EPS surprise ${formatPercent(eps)}`);
  if (revenue !== undefined) parts.push(`revenue surprise ${formatPercent(revenue)}`);
  if (guidance) parts.push(`guidance ${guidance}`);
  return parts.length
    ? parts.join('; ') + '.'
    : `${row.symbol ?? row.ticker} has an earnings calendar/result signal.`;
}

function formatPercent(value: number): string {
  const sign = value > 0 ? '+' : '';
  return `${sign}${value.toFixed(1)}%`;
}
