import {
  type FlowEvent,
  extractRows,
  formatCurrency,
  numberOrUndefined,
  scoreEvent,
  signedPercent,
  sourceEvidence
} from './schemas';

type OptionsFlowRow = {
  symbol?: string;
  ticker?: string;
  contractSymbol?: string;
  optionType?: string;
  putCall?: string;
  side?: string;
  premium?: number;
  notional?: number;
  size?: number;
  volume?: number;
  openInterest?: number;
  strike?: number;
  expiration?: string;
  tradeTime?: string;
  sweep?: boolean;
  sourceName?: string;
  url?: string;
};

type DarkPoolRow = {
  symbol?: string;
  ticker?: string;
  venue?: string;
  price?: number;
  shares?: number;
  notional?: number;
  value?: number;
  tradeTime?: string;
  sourceName?: string;
  url?: string;
};

type CongressTradeRow = {
  politician?: string;
  representative?: string;
  chamber?: string;
  party?: string;
  symbol?: string;
  ticker?: string;
  transactionType?: string;
  type?: string;
  amountMin?: number;
  amountMax?: number;
  amount?: number;
  transactionDate?: string;
  filingDate?: string;
  sourceName?: string;
  url?: string;
};

type FundFlowRow = {
  symbol?: string;
  ticker?: string;
  fund?: string;
  flow?: number;
  netFlow?: number;
  flowPercent?: number;
  aum?: number;
  period?: string;
  sourceName?: string;
  url?: string;
};

export function normalizeOptionsFlowRows(raw: unknown): OptionsFlowRow[] {
  return extractRows(raw) as OptionsFlowRow[];
}

export function normalizeDarkPoolRows(raw: unknown): DarkPoolRow[] {
  return extractRows(raw) as DarkPoolRow[];
}

export function normalizeCongressTradeRows(raw: unknown): CongressTradeRow[] {
  return extractRows(raw) as CongressTradeRow[];
}

export function normalizeFundFlowRows(raw: unknown): FundFlowRow[] {
  return extractRows(raw) as FundFlowRow[];
}

export function buildOptionsFlowEvents(input: {
  rows: OptionsFlowRow[];
  minSignalScore: number;
  premiumThreshold: number;
}) {
  const detectedAt = new Date().toISOString();
  const events: FlowEvent[] = [];

  for (const row of input.rows) {
    const symbol = String(row.symbol || row.ticker || '').toUpperCase();
    if (!symbol) continue;
    const premium = numberOrUndefined(row.premium) ?? numberOrUndefined(row.notional) ?? 0;
    const optionType = normalizeOptionType(row.optionType || row.putCall || row.contractSymbol);
    const isSweep =
      Boolean(row.sweep) ||
      String(row.side || '')
        .toLowerCase()
        .includes('sweep');
    if (premium < input.premiumThreshold && !isSweep) continue;

    const score = scoreEvent({
      magnitude: Math.min(100, Math.log10(Math.max(1, premium)) * 11 + (isSweep ? 15 : 0)),
      novelty: isSweep ? 80 : 65,
      sourceQuality: row.sourceName ? 75 : 60,
      marketImpact: optionType === 'call' ? 72 : 68,
      confidence: row.sourceName ? 75 : 60
    });
    if (score.finalScore < input.minSignalScore) continue;

    events.push({
      eventId: `flow:${symbol}:options:${optionType}:${row.tradeTime || detectedAt}:${premium}`,
      eventType: 'options_flow',
      title: `${symbol} ${formatCurrency(premium)} ${optionType.toUpperCase()} ${isSweep ? 'sweep' : 'flow'}`,
      summary: `${symbol} had ${formatCurrency(premium)} ${optionType} options flow${isSweep ? ' marked as sweep' : ''}${row.expiration ? ` expiring ${row.expiration}` : ''}.`,
      detectedAt,
      entities: [
        { type: 'ticker', name: symbol, ticker: symbol },
        ...(row.contractSymbol ? [{ type: 'contract' as const, name: row.contractSymbol }] : [])
      ],
      metrics: {
        optionType,
        premium,
        size: row.size ?? '',
        volume: row.volume ?? '',
        openInterest: row.openInterest ?? '',
        strike: row.strike ?? '',
        expiration: row.expiration || '',
        sweep: isSweep
      },
      evidence: sourceEvidence({
        sourceName: row.sourceName,
        sourceType: 'options_flow',
        confidence: row.sourceName ? 75 : 60,
        url: row.url
      }),
      scores: score,
      labels:
        optionType === 'call' ? ['watch', 'needs_verification'] : ['risk', 'needs_verification'],
      compliance: {
        isInvestmentAdvice: false,
        limitation:
          'Options flow is not proof of directional intent; hedges and spreads can invert the signal.'
      }
    });
  }

  return events.sort((a, b) => b.scores.finalScore - a.scores.finalScore);
}

export function buildDarkPoolEvents(input: {
  rows: DarkPoolRow[];
  minSignalScore: number;
  notionalThreshold: number;
}) {
  const detectedAt = new Date().toISOString();
  const events: FlowEvent[] = [];

  for (const row of input.rows) {
    const symbol = String(row.symbol || row.ticker || '').toUpperCase();
    if (!symbol) continue;
    const notional =
      numberOrUndefined(row.notional) ?? numberOrUndefined(row.value) ?? darkPoolNotional(row);
    if (!notional || notional < input.notionalThreshold) continue;
    const score = scoreEvent({
      magnitude: Math.min(100, Math.log10(Math.max(1, notional)) * 10),
      novelty: 70,
      sourceQuality: row.sourceName ? 75 : 60,
      marketImpact: 72,
      confidence: row.sourceName ? 75 : 60
    });
    if (score.finalScore < input.minSignalScore) continue;

    events.push({
      eventId: `flow:${symbol}:dark_pool:${row.tradeTime || detectedAt}:${notional}`,
      eventType: 'dark_pool_block',
      title: `${symbol} dark-pool block ${formatCurrency(notional)}`,
      summary: `${symbol} printed a dark-pool/ATS block of about ${formatCurrency(notional)}${row.venue ? ` on ${row.venue}` : ''}.`,
      detectedAt,
      entities: [
        { type: 'ticker', name: symbol, ticker: symbol },
        ...(row.venue ? [{ type: 'venue' as const, name: row.venue }] : [])
      ],
      metrics: {
        notional,
        price: row.price ?? '',
        shares: row.shares ?? '',
        venue: row.venue || '',
        tradeTime: row.tradeTime || ''
      },
      evidence: sourceEvidence({
        sourceName: row.sourceName,
        sourceType: 'dark_pool',
        confidence: row.sourceName ? 75 : 60,
        url: row.url
      }),
      scores: score,
      labels: ['watch', 'needs_verification'],
      compliance: {
        isInvestmentAdvice: false,
        limitation:
          'Dark-pool blocks do not identify buyer/seller direction without additional tape context.'
      }
    });
  }

  return events.sort((a, b) => b.scores.finalScore - a.scores.finalScore);
}

export function buildCongressTradeEvents(input: {
  rows: CongressTradeRow[];
  minSignalScore: number;
}) {
  const detectedAt = new Date().toISOString();
  const events: FlowEvent[] = [];

  for (const row of input.rows) {
    const symbol = String(row.symbol || row.ticker || '').toUpperCase();
    const politician = row.politician || row.representative || 'Politician';
    if (!symbol) continue;
    const transactionType = String(row.transactionType || row.type || '').toLowerCase();
    const amountMax = numberOrUndefined(row.amountMax) ?? numberOrUndefined(row.amount) ?? 0;
    const amountMin = numberOrUndefined(row.amountMin) ?? amountMax;
    const score = scoreEvent({
      magnitude: Math.min(100, Math.log10(Math.max(1, amountMax)) * 10),
      novelty: 75,
      sourceQuality: row.sourceName ? 70 : 55,
      marketImpact: 62,
      confidence: row.sourceName ? 70 : 55
    });
    if (score.finalScore < input.minSignalScore) continue;

    events.push({
      eventId: `flow:${politician}:${symbol}:congress:${row.filingDate || row.transactionDate || detectedAt}`,
      eventType: 'congress_trade',
      title: `${politician} disclosed ${transactionType || 'transaction'} in ${symbol}`,
      summary: `${politician}${row.chamber ? ` (${row.chamber})` : ''} disclosed a ${transactionType || 'transaction'} in ${symbol}${amountMax ? `, range up to ${formatCurrency(amountMax)}` : ''}.`,
      detectedAt,
      entities: [
        { type: 'person', name: politician },
        { type: 'ticker', name: symbol, ticker: symbol }
      ],
      metrics: {
        transactionType,
        amountMin,
        amountMax,
        transactionDate: row.transactionDate || '',
        filingDate: row.filingDate || '',
        chamber: row.chamber || '',
        party: row.party || ''
      },
      evidence: sourceEvidence({
        sourceName: row.sourceName || 'Congress trade disclosure',
        sourceType: 'congress_trade',
        confidence: row.sourceName ? 70 : 55,
        url: row.url,
        delayLabel: 'disclosure_delay'
      }),
      scores: score,
      labels:
        transactionType.includes('sale') || transactionType.includes('sell')
          ? ['risk', 'needs_verification']
          : ['watch', 'needs_verification'],
      compliance: {
        isInvestmentAdvice: false,
        limitation:
          'Congress trades are disclosed with delays and ranges; they are political-flow signals, not current positioning.'
      }
    });
  }

  return events.sort((a, b) => b.scores.finalScore - a.scores.finalScore);
}

export function buildFundFlowEvents(input: {
  rows: FundFlowRow[];
  minSignalScore: number;
  flowThreshold: number;
  flowPercentThreshold: number;
}) {
  const detectedAt = new Date().toISOString();
  const events: FlowEvent[] = [];

  for (const row of input.rows) {
    const symbol = String(row.symbol || row.ticker || row.fund || '').toUpperCase();
    if (!symbol) continue;
    const flow = numberOrUndefined(row.flow) ?? numberOrUndefined(row.netFlow) ?? 0;
    const flowPercent = numberOrUndefined(row.flowPercent);
    const passAmount = Math.abs(flow) >= input.flowThreshold;
    const passPercent =
      flowPercent !== undefined && Math.abs(flowPercent) >= input.flowPercentThreshold;
    if (!passAmount && !passPercent) continue;
    const score = scoreEvent({
      magnitude: Math.min(
        100,
        Math.max(Math.log10(Math.max(1, Math.abs(flow))) * 9, Math.abs(flowPercent || 0) * 8)
      ),
      novelty: 70,
      sourceQuality: row.sourceName ? 75 : 60,
      marketImpact: flow >= 0 ? 65 : 62,
      confidence: row.sourceName ? 75 : 60
    });
    if (score.finalScore < input.minSignalScore) continue;

    events.push({
      eventId: `flow:${symbol}:fund:${row.period || detectedAt}:${flow}`,
      eventType: 'fund_flow',
      title: `${symbol} ${flow >= 0 ? 'inflow' : 'outflow'} ${formatCurrency(Math.abs(flow))}`,
      summary: `${symbol} saw ${flow >= 0 ? 'inflow' : 'outflow'} of ${formatCurrency(Math.abs(flow))}${flowPercent !== undefined ? ` (${signedPercent(flowPercent)})` : ''}${row.period ? ` during ${row.period}` : ''}.`,
      detectedAt,
      entities: [{ type: 'fund', name: row.fund || symbol, ticker: symbol }],
      metrics: {
        flow,
        flowPercent: flowPercent ?? '',
        aum: row.aum ?? '',
        period: row.period || ''
      },
      evidence: sourceEvidence({
        sourceName: row.sourceName,
        sourceType: 'fund_flow',
        confidence: row.sourceName ? 75 : 60,
        url: row.url
      }),
      scores: score,
      labels: flow >= 0 ? ['watch'] : ['risk'],
      compliance: {
        isInvestmentAdvice: false,
        limitation:
          'Fund-flow data can be delayed, revised, and detached from single-stock fundamentals.'
      }
    });
  }

  return events.sort((a, b) => b.scores.finalScore - a.scores.finalScore);
}

function normalizeOptionType(value: unknown): 'call' | 'put' | 'unknown' {
  const text = String(value || '').toLowerCase();
  if (text.includes('call') || /\bc\b/.test(text)) return 'call';
  if (text.includes('put') || /\bp\b/.test(text)) return 'put';
  return 'unknown';
}

function darkPoolNotional(row: DarkPoolRow) {
  const price = numberOrUndefined(row.price);
  const shares = numberOrUndefined(row.shares);
  if (price === undefined || shares === undefined) return undefined;
  return price * shares;
}
