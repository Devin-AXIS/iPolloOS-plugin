import {
  type DisclosureEvent,
  extractRows,
  numberOrUndefined,
  parseTickerList,
  scoreEvent,
  sourceEvidence
} from './schemas';

type FilingRow = {
  symbol?: string;
  ticker?: string;
  cik?: string | number;
  company?: string;
  form?: string;
  filingDate?: string;
  reportDate?: string;
  accessionNumber?: string;
  description?: string;
  url?: string;
  sourceName?: string;
};

type FinancialRow = {
  symbol?: string;
  ticker?: string;
  company?: string;
  period?: string;
  revenue?: number;
  revenuePrevious?: number;
  grossMargin?: number;
  grossMarginPrevious?: number;
  operatingIncome?: number;
  operatingIncomePrevious?: number;
  operatingCashFlow?: number;
  operatingCashFlowPrevious?: number;
  debt?: number;
  debtPrevious?: number;
  shares?: number;
  sharesPrevious?: number;
  sourceName?: string;
};

type SecFactPoint = {
  val?: number | string;
  fy?: number | string;
  fp?: string;
  form?: string;
  filed?: string;
  end?: string;
};

type HoldingRow = {
  institution?: string;
  manager?: string;
  symbol?: string;
  ticker?: string;
  company?: string;
  reportDate?: string;
  shares?: number;
  previousShares?: number;
  marketValue?: number;
  previousMarketValue?: number;
  action?: string;
  sourceName?: string;
};

type InsiderRow = {
  symbol?: string;
  ticker?: string;
  company?: string;
  insider?: string;
  role?: string;
  transactionDate?: string;
  filingDate?: string;
  transactionCode?: string;
  transactionType?: string;
  shares?: number;
  price?: number;
  value?: number;
  ownershipType?: string;
  plannedSale?: boolean;
  sourceName?: string;
};

export function buildFinancialAnomalyEvents(input: {
  rows: FinancialRow[];
  minSignalScore: number;
  revenueChangeThreshold: number;
  marginChangeThreshold: number;
  debtChangeThreshold: number;
  shareChangeThreshold: number;
}) {
  const detectedAt = new Date().toISOString();
  const events: DisclosureEvent[] = [];

  for (const row of input.rows) {
    const symbol = String(row.symbol || row.ticker || '').toUpperCase();
    if (!symbol) continue;
    const candidates = [
      ratioSignal('revenue_change', row.revenue, row.revenuePrevious, input.revenueChangeThreshold),
      deltaSignal(
        'gross_margin_change',
        row.grossMargin,
        row.grossMarginPrevious,
        input.marginChangeThreshold
      ),
      ratioSignal(
        'operating_income_change',
        row.operatingIncome,
        row.operatingIncomePrevious,
        input.revenueChangeThreshold
      ),
      ratioSignal(
        'operating_cash_flow_change',
        row.operatingCashFlow,
        row.operatingCashFlowPrevious,
        input.revenueChangeThreshold
      ),
      ratioSignal('debt_change', row.debt, row.debtPrevious, input.debtChangeThreshold),
      ratioSignal('share_count_change', row.shares, row.sharesPrevious, input.shareChangeThreshold)
    ].filter(Boolean) as Array<{ type: string; value: number; threshold: number }>;

    for (const signal of candidates) {
      const score = scoreEvent({
        magnitude: Math.min(
          100,
          Math.abs(signal.value) * (signal.type.includes('margin') ? 12 : 2)
        ),
        novelty: 70,
        sourceQuality: row.sourceName ? 75 : 55,
        marketImpact: signal.type.includes('share') || signal.type.includes('debt') ? 65 : 75,
        confidence: row.sourceName ? 75 : 55
      });
      if (score.finalScore < input.minSignalScore) continue;

      const label =
        signal.value < 0 && !signal.type.includes('debt') && !signal.type.includes('share')
          ? 'risk'
          : 'watch';
      events.push({
        eventId: `sec:${symbol}:financial:${signal.type}:${row.period || detectedAt.slice(0, 10)}`,
        eventType: 'financial_anomaly',
        title: `${symbol} ${humanMetric(signal.type)} ${formatSigned(signal.value)}${signal.type.includes('margin') ? ' pts' : '%'}`,
        summary: `${symbol} ${humanMetric(signal.type)} changed by ${formatSigned(signal.value)}${signal.type.includes('margin') ? ' percentage points' : '%'} versus the prior comparable period.`,
        detectedAt,
        entities: [
          { type: 'ticker', name: symbol, ticker: symbol },
          { type: 'metric', name: signal.type }
        ],
        metrics: {
          metric: signal.type,
          change: signal.value,
          threshold: signal.threshold,
          period: row.period || ''
        },
        evidence: sourceEvidence({
          sourceName: row.sourceName,
          sourceType: 'financial_statement',
          confidence: row.sourceName ? 75 : 55
        }),
        scores: score,
        labels: [label, 'needs_verification'],
        compliance: {
          isInvestmentAdvice: false,
          limitation:
            'Financial anomaly requires source filing and accounting-context verification.'
        }
      });
    }
  }

  return events.sort((a, b) => b.scores.finalScore - a.scores.finalScore);
}

export function buildFilingEvents(input: {
  rows: FilingRow[];
  forms: string[];
  minSignalScore: number;
  lookbackDays: number;
}) {
  const detectedAt = new Date().toISOString();
  const formSet = new Set(input.forms.map((item) => item.toUpperCase()));
  const cutoff = Date.now() - input.lookbackDays * 24 * 60 * 60 * 1000;
  const events: DisclosureEvent[] = [];

  for (const row of input.rows) {
    const form = String(row.form || '').toUpperCase();
    if (!form || (formSet.size && !formSet.has(form))) continue;
    const filingDate = row.filingDate || row.reportDate || '';
    if (filingDate && Date.parse(filingDate) < cutoff) continue;
    const symbol = String(row.symbol || row.ticker || '').toUpperCase();
    const score = scoreEvent({
      magnitude: materialityByForm(form),
      novelty: materialityByForm(form),
      sourceQuality: 85,
      marketImpact: materialityByForm(form),
      confidence: 80
    });
    if (score.finalScore < input.minSignalScore) continue;

    events.push({
      eventId: `sec:${symbol || row.cik || 'unknown'}:filing:${form}:${filingDate || detectedAt.slice(0, 10)}:${row.accessionNumber || ''}`,
      eventType: 'sec_filing',
      title: `${symbol || row.company || row.cik || 'Company'} filed ${form}`,
      summary: `${symbol || row.company || row.cik || 'Company'} filed ${form}${filingDate ? ` on ${filingDate}` : ''}${row.description ? `: ${row.description}` : ''}.`,
      detectedAt,
      entities: [
        ...(symbol ? [{ type: 'ticker' as const, name: symbol, ticker: symbol }] : []),
        ...(row.company
          ? [{ type: 'company' as const, name: row.company, cik: String(row.cik || '') }]
          : []),
        { type: 'form', name: form }
      ],
      metrics: {
        form,
        filingDate,
        accessionNumber: row.accessionNumber || ''
      },
      evidence: sourceEvidence({
        sourceName: row.sourceName || 'SEC EDGAR',
        sourceType: 'sec_filing',
        confidence: 85,
        url: row.url
      }),
      scores: score,
      labels:
        form === '4' || form === '13D' || form === '13G' || form === '8-K'
          ? ['watch']
          : ['needs_verification'],
      compliance: {
        isInvestmentAdvice: false,
        limitation:
          'SEC filing signal requires reading the filing contents before drawing a market conclusion.'
      }
    });
  }

  return events.sort((a, b) => b.scores.finalScore - a.scores.finalScore);
}

export function buildHoldingEvents(input: { rows: HoldingRow[]; minSignalScore: number }) {
  const detectedAt = new Date().toISOString();
  const events: DisclosureEvent[] = [];

  for (const row of input.rows) {
    const symbol = String(row.symbol || row.ticker || '').toUpperCase();
    const institution = row.institution || row.manager || 'Institution';
    if (!symbol) continue;
    const shares = numberOrUndefined(row.shares);
    const previousShares = numberOrUndefined(row.previousShares);
    const marketValue = numberOrUndefined(row.marketValue);
    const previousMarketValue = numberOrUndefined(row.previousMarketValue);
    const shareChange = changePercent(shares, previousShares);
    const valueChange = changePercent(marketValue, previousMarketValue);
    const action = inferHoldingAction(row.action, shares, previousShares, shareChange);
    if (!action) continue;
    const magnitude = Math.max(
      Math.abs(shareChange ?? 0),
      Math.abs(valueChange ?? 0),
      action === 'new' || action === 'exited' ? 80 : 0
    );
    const score = scoreEvent({
      magnitude: Math.min(100, magnitude),
      novelty: action === 'new' || action === 'exited' ? 85 : 65,
      sourceQuality: row.sourceName ? 75 : 60,
      marketImpact: Math.min(100, magnitude * 0.8 + 20),
      confidence: row.sourceName ? 75 : 60
    });
    if (score.finalScore < input.minSignalScore) continue;

    events.push({
      eventId: `sec:${institution}:${symbol}:13f:${row.reportDate || detectedAt.slice(0, 10)}:${action}`,
      eventType: 'institution_holding_change',
      title: `${institution} ${action} ${symbol}`,
      summary: `${institution} disclosed a ${action} 13F position signal in ${symbol}${shareChange !== undefined ? `; share count changed ${formatSigned(shareChange)}%` : ''}.`,
      detectedAt,
      entities: [
        { type: 'institution', name: institution },
        { type: 'ticker', name: symbol, ticker: symbol }
      ],
      metrics: {
        action,
        reportDate: row.reportDate || '',
        shares: shares ?? '',
        previousShares: previousShares ?? '',
        shareChangePercent: shareChange ?? '',
        marketValue: marketValue ?? '',
        previousMarketValue: previousMarketValue ?? '',
        valueChangePercent: valueChange ?? ''
      },
      evidence: sourceEvidence({
        sourceName: row.sourceName || '13F disclosure',
        sourceType: '13f',
        confidence: row.sourceName ? 75 : 60,
        delayLabel: 'quarterly_historical_disclosure'
      }),
      scores: score,
      labels:
        action === 'reduced' || action === 'exited'
          ? ['risk', 'needs_verification']
          : ['watch', 'needs_verification'],
      compliance: {
        isInvestmentAdvice: false,
        limitation:
          '13F holdings are historical quarter-end disclosures and may not reflect current holdings.'
      }
    });
  }

  return events.sort((a, b) => b.scores.finalScore - a.scores.finalScore);
}

export function buildInsiderEvents(input: { rows: InsiderRow[]; minSignalScore: number }) {
  const detectedAt = new Date().toISOString();
  const events: DisclosureEvent[] = [];

  for (const row of input.rows) {
    const symbol = String(row.symbol || row.ticker || '').toUpperCase();
    const insider = row.insider || 'Insider';
    if (!symbol) continue;
    const code = String(row.transactionCode || '').toUpperCase();
    const txType = String(row.transactionType || '').toLowerCase();
    const value = numberOrUndefined(row.value) ?? valueFromShares(row);
    const direction = inferInsiderDirection(code, txType, row.plannedSale);
    if (!direction) continue;
    const score = scoreEvent({
      magnitude: Math.min(100, Math.log10(Math.max(1, Math.abs(value || 0))) * 12),
      novelty: direction === 'open_market_buy' ? 80 : 55,
      sourceQuality: row.sourceName ? 80 : 65,
      marketImpact: direction === 'open_market_buy' ? 70 : 55,
      confidence: row.sourceName ? 80 : 65
    });
    if (score.finalScore < input.minSignalScore) continue;

    events.push({
      eventId: `sec:${symbol}:insider:${insider}:${row.transactionDate || row.filingDate || detectedAt.slice(0, 10)}:${direction}`,
      eventType: 'insider_transaction',
      title: `${insider} ${direction.replace(/_/g, ' ')} in ${symbol}`,
      summary: `${insider}${row.role ? ` (${row.role})` : ''} disclosed ${direction.replace(/_/g, ' ')} in ${symbol}${value ? ` worth about ${formatCurrency(value)}` : ''}.`,
      detectedAt,
      entities: [
        { type: 'person', name: insider },
        { type: 'ticker', name: symbol, ticker: symbol }
      ],
      metrics: {
        transactionDate: row.transactionDate || '',
        filingDate: row.filingDate || '',
        transactionCode: code,
        shares: row.shares ?? '',
        price: row.price ?? '',
        value: value ?? '',
        plannedSale: Boolean(row.plannedSale)
      },
      evidence: sourceEvidence({
        sourceName: row.sourceName || 'Form 4 disclosure',
        sourceType: 'form_4',
        confidence: row.sourceName ? 80 : 65,
        delayLabel: 'form_4_delay'
      }),
      scores: score,
      labels: direction === 'open_market_buy' ? ['watch'] : ['needs_verification'],
      compliance: {
        isInvestmentAdvice: false,
        limitation:
          'Insider transactions require Form 4 context; planned sales, grants, and option exercises are weaker signals.'
      }
    });
  }

  return events.sort((a, b) => b.scores.finalScore - a.scores.finalScore);
}

export async function fetchRecentSecFilings(input: {
  entities: string[];
  forms: string[];
  lookbackDays: number;
  userAgent?: string;
  apiBaseUrl?: string;
  tickersUrl?: string;
}): Promise<FilingRow[]> {
  if (!input.userAgent) return [];
  const tickerMap = await fetchTickerMap(input.tickersUrl, input.userAgent);
  const rows: FilingRow[] = [];
  for (const entity of input.entities) {
    const normalized = entity.replace(/^\$/, '').toUpperCase();
    const cik = normalizeCik(
      normalized.match(/^\d+$/) ? normalized : tickerMap.get(normalized)?.cik
    );
    const ticker = normalized.match(/^\d+$/) ? tickerMapByCik(tickerMap, cik)?.ticker : normalized;
    const company = normalized.match(/^\d+$/)
      ? tickerMapByCik(tickerMap, cik)?.title
      : tickerMap.get(normalized)?.title;
    if (!cik) continue;
    const url = `${input.apiBaseUrl || 'https://data.sec.gov'}/submissions/CIK${cik}.json`;
    const json = await fetchJson(url, input.userAgent);
    const recent = json?.filings?.recent;
    if (!recent?.form) continue;
    for (let i = 0; i < recent.form.length; i++) {
      rows.push({
        symbol: ticker,
        cik,
        company,
        form: recent.form[i],
        filingDate: recent.filingDate?.[i],
        reportDate: recent.reportDate?.[i],
        accessionNumber: recent.accessionNumber?.[i],
        description: recent.primaryDocDescription?.[i],
        url: recent.accessionNumber?.[i]
          ? `https://www.sec.gov/Archives/edgar/data/${Number(cik)}/${String(recent.accessionNumber[i]).replace(/-/g, '')}/${recent.primaryDocument?.[i] || ''}`
          : url,
        sourceName: 'SEC EDGAR'
      });
    }
  }
  return rows;
}

export async function fetchSecFinancialRows(input: {
  symbols: string[];
  userAgent?: string;
  apiBaseUrl?: string;
  tickersUrl?: string;
}): Promise<FinancialRow[]> {
  if (!input.userAgent) return [];
  const tickerMap = await fetchTickerMap(input.tickersUrl, input.userAgent);
  const rows: FinancialRow[] = [];

  for (const symbolInput of input.symbols) {
    const normalized = symbolInput.replace(/^\$/, '').toUpperCase();
    const cik = normalizeCik(
      normalized.match(/^\d+$/) ? normalized : tickerMap.get(normalized)?.cik
    );
    const tickerInfo = normalized.match(/^\d+$/)
      ? tickerMapByCik(tickerMap, cik)
      : tickerMap.get(normalized);
    if (!cik) continue;

    const url = `${input.apiBaseUrl || 'https://data.sec.gov'}/api/xbrl/companyfacts/CIK${cik}.json`;
    const json = await fetchJson(url, input.userAgent);
    const row = buildSecFinancialRow(json, {
      symbol: tickerInfo?.ticker || normalized,
      company: tickerInfo?.title || json?.entityName || ''
    });
    if (row) rows.push(row);
  }

  return rows;
}

export function normalizeFinancialRows(raw: unknown, fallbackSymbols: string[]): FinancialRow[] {
  const rows = extractRows(raw) as FinancialRow[];
  if (rows.length) return rows;
  return fallbackSymbols.map((symbol) => ({ symbol, sourceName: 'watchlist' }));
}

export function normalizeFilingRows(raw: unknown): FilingRow[] {
  return extractRows(raw) as FilingRow[];
}

export function normalizeHoldingRows(raw: unknown): HoldingRow[] {
  return extractRows(raw) as HoldingRow[];
}

export function normalizeInsiderRows(raw: unknown): InsiderRow[] {
  return extractRows(raw) as InsiderRow[];
}

export function defaultForms(value: unknown): string[] {
  const list = parseTickerList(value || '8-K,10-Q,10-K,S-3,13D,13G,4,13F-HR', 50);
  return list.length ? list : ['8-K', '10-Q', '10-K', 'S-3', '13D', '13G', '4', '13F-HR'];
}

function ratioSignal(type: string, current: unknown, previous: unknown, threshold: number) {
  const cur = numberOrUndefined(current);
  const prev = numberOrUndefined(previous);
  if (cur === undefined || prev === undefined || prev === 0) return undefined;
  const value = ((cur - prev) / Math.abs(prev)) * 100;
  if (Math.abs(value) < threshold) return undefined;
  return { type, value, threshold };
}

function deltaSignal(type: string, current: unknown, previous: unknown, threshold: number) {
  const cur = numberOrUndefined(current);
  const prev = numberOrUndefined(previous);
  if (cur === undefined || prev === undefined) return undefined;
  const value = cur - prev;
  if (Math.abs(value) < threshold) return undefined;
  return { type, value, threshold };
}

function changePercent(current?: number, previous?: number) {
  if (current === undefined || previous === undefined || previous === 0) return undefined;
  return ((current - previous) / Math.abs(previous)) * 100;
}

function inferHoldingAction(
  action: unknown,
  shares?: number,
  previousShares?: number,
  change?: number
) {
  const raw = String(action || '').toLowerCase();
  if (['new', 'increased', 'reduced', 'exited', 'sold_out'].includes(raw))
    return raw === 'sold_out' ? 'exited' : raw;
  if (previousShares === 0 && shares && shares > 0) return 'new';
  if (shares === 0 && previousShares && previousShares > 0) return 'exited';
  if (change !== undefined && change >= 10) return 'increased';
  if (change !== undefined && change <= -10) return 'reduced';
  return undefined;
}

function inferInsiderDirection(code: string, txType: string, plannedSale?: boolean) {
  if (plannedSale) return 'planned_sale';
  if (code === 'P' || txType.includes('buy') || txType.includes('purchase'))
    return 'open_market_buy';
  if (code === 'S' || txType.includes('sell') || txType.includes('sale')) return 'open_market_sale';
  if (code === 'M' || txType.includes('exercise')) return 'option_exercise';
  if (code === 'A' || txType.includes('grant')) return 'grant_or_award';
  return undefined;
}

function valueFromShares(row: InsiderRow) {
  const shares = numberOrUndefined(row.shares);
  const price = numberOrUndefined(row.price);
  if (shares === undefined || price === undefined) return undefined;
  return shares * price;
}

function buildSecFinancialRow(
  json: any,
  entity: { symbol: string; company?: string }
): FinancialRow | undefined {
  const facts = json?.facts?.['us-gaap'];
  if (!facts) return undefined;

  const revenuePair = latestComparablePair(
    factPoints(
      facts,
      ['RevenueFromContractWithCustomerExcludingAssessedTax', 'Revenues', 'SalesRevenueNet'],
      'USD'
    )
  );
  const grossProfitPoints = factPoints(facts, ['GrossProfit'], 'USD');
  const operatingIncomePair = latestComparablePair(
    factPoints(facts, ['OperatingIncomeLoss'], 'USD')
  );
  const operatingCashFlowPair = latestComparablePair(
    factPoints(facts, ['NetCashProvidedByUsedInOperatingActivities'], 'USD')
  );
  const debtPair = latestComparablePair(
    factPoints(
      facts,
      [
        'LongTermDebtCurrentAndNoncurrent',
        'LongTermDebtAndFinanceLeaseObligationsCurrentAndNoncurrent',
        'DebtCurrent'
      ],
      'USD'
    )
  );
  const sharePair = latestComparablePair(
    factPoints(
      facts,
      ['WeightedAverageNumberOfDilutedSharesOutstanding', 'EntityCommonStockSharesOutstanding'],
      'shares'
    )
  );
  const firstPair =
    revenuePair || operatingIncomePair || operatingCashFlowPair || debtPair || sharePair;
  if (!firstPair) return undefined;

  const row: FinancialRow = {
    symbol: entity.symbol,
    company: entity.company,
    period: periodLabel(firstPair.current),
    sourceName: 'SEC Company Facts'
  };

  if (revenuePair) {
    row.revenue = revenuePair.current.value;
    row.revenuePrevious = revenuePair.previous.value;

    const grossCurrent = valueForComparablePeriod(grossProfitPoints, revenuePair.current);
    const grossPrevious = valueForComparablePeriod(grossProfitPoints, revenuePair.previous);
    if (
      grossCurrent !== undefined &&
      grossPrevious !== undefined &&
      revenuePair.current.value !== 0 &&
      revenuePair.previous.value !== 0
    ) {
      row.grossMargin = (grossCurrent / revenuePair.current.value) * 100;
      row.grossMarginPrevious = (grossPrevious / revenuePair.previous.value) * 100;
    }
  }

  if (operatingIncomePair) {
    row.operatingIncome = operatingIncomePair.current.value;
    row.operatingIncomePrevious = operatingIncomePair.previous.value;
  }
  if (operatingCashFlowPair) {
    row.operatingCashFlow = operatingCashFlowPair.current.value;
    row.operatingCashFlowPrevious = operatingCashFlowPair.previous.value;
  }
  if (debtPair) {
    row.debt = debtPair.current.value;
    row.debtPrevious = debtPair.previous.value;
  }
  if (sharePair) {
    row.shares = sharePair.current.value;
    row.sharesPrevious = sharePair.previous.value;
  }

  return row;
}

function factPoints(facts: Record<string, any>, tags: string[], preferredUnit: 'USD' | 'shares') {
  for (const tag of tags) {
    const units = facts?.[tag]?.units;
    if (!units) continue;
    const values = Array.isArray(units[preferredUnit])
      ? units[preferredUnit]
      : firstUnitValues(units);
    const points = values
      .map((item: SecFactPoint) => ({
        value: numberOrUndefined(item.val),
        fy: Number(item.fy),
        fp: String(item.fp || ''),
        form: String(item.form || '').toUpperCase(),
        filed: String(item.filed || ''),
        end: String(item.end || '')
      }))
      .filter(
        (item: any) =>
          item.value !== undefined && item.fy && item.fp && ['10-K', '10-Q'].includes(item.form)
      );
    if (points.length) return dedupeFactPoints(points as Array<ComparableFactPoint>);
  }
  return [];
}

type ComparableFactPoint = {
  value: number;
  fy: number;
  fp: string;
  form: string;
  filed: string;
  end: string;
};

function firstUnitValues(units: Record<string, SecFactPoint[]>) {
  return Object.values(units).find((items) => Array.isArray(items) && items.length) || [];
}

function dedupeFactPoints(points: ComparableFactPoint[]) {
  const latestByPeriod = new Map<string, ComparableFactPoint>();
  for (const point of points) {
    const key = `${point.form}:${point.fy}:${point.fp}:${point.end}`;
    const existing = latestByPeriod.get(key);
    if (!existing || Date.parse(point.filed || '') > Date.parse(existing.filed || '')) {
      latestByPeriod.set(key, point);
    }
  }
  return Array.from(latestByPeriod.values()).sort(compareFactPointDesc);
}

function latestComparablePair(points: ComparableFactPoint[]) {
  for (const current of points) {
    const previous =
      points.find(
        (point) =>
          point !== current &&
          point.form === current.form &&
          point.fp === current.fp &&
          point.fy < current.fy
      ) ||
      points.find(
        (point) => point !== current && Date.parse(point.end || '') < Date.parse(current.end || '')
      );
    if (previous) return { current, previous };
  }
  return undefined;
}

function valueForComparablePeriod(points: ComparableFactPoint[], target: ComparableFactPoint) {
  return points.find(
    (point) =>
      point.form === target.form &&
      point.fy === target.fy &&
      point.fp === target.fp &&
      point.end === target.end
  )?.value;
}

function compareFactPointDesc(a: ComparableFactPoint, b: ComparableFactPoint) {
  const endDiff = Date.parse(b.end || '') - Date.parse(a.end || '');
  if (endDiff) return endDiff;
  return Date.parse(b.filed || '') - Date.parse(a.filed || '');
}

function periodLabel(point: ComparableFactPoint) {
  return `${point.fy}${point.fp ? ` ${point.fp}` : ''}${point.end ? ` (${point.end})` : ''}`;
}

function materialityByForm(form: string) {
  if (form === '8-K') return 80;
  if (form === '4') return 70;
  if (['13D', '13G', '13F-HR'].includes(form)) return 75;
  if (['10-Q', '10-K'].includes(form)) return 65;
  if (['S-3', '424B5'].includes(form)) return 70;
  return 55;
}

function humanMetric(type: string) {
  return type.replace(/_/g, ' ');
}

function formatSigned(value: number) {
  return `${value >= 0 ? '+' : ''}${Number(value.toFixed(1))}`;
}

function formatCurrency(value: number) {
  if (Math.abs(value) >= 1_000_000_000) return `$${(value / 1_000_000_000).toFixed(1)}B`;
  if (Math.abs(value) >= 1_000_000) return `$${(value / 1_000_000).toFixed(1)}M`;
  if (Math.abs(value) >= 1_000) return `$${(value / 1_000).toFixed(1)}K`;
  return `$${value.toFixed(0)}`;
}

async function fetchTickerMap(
  url = 'https://www.sec.gov/files/company_tickers.json',
  userAgent: string
) {
  const json = await fetchJson(url, userAgent);
  const map = new Map<string, { cik: string; ticker: string; title: string }>();
  for (const item of Object.values(json || {}) as any[]) {
    if (!item?.ticker || !item?.cik_str) continue;
    map.set(String(item.ticker).toUpperCase(), {
      cik: normalizeCik(String(item.cik_str)),
      ticker: String(item.ticker).toUpperCase(),
      title: String(item.title || '')
    });
  }
  return map;
}

function tickerMapByCik(
  map: Map<string, { cik: string; ticker: string; title: string }>,
  cik?: string
) {
  if (!cik) return undefined;
  return Array.from(map.values()).find((item) => item.cik === normalizeCik(cik));
}

function normalizeCik(value?: string | number) {
  if (value === undefined || value === null || value === '') return '';
  return String(value).replace(/\D/g, '').padStart(10, '0');
}

async function fetchJson(url: string, userAgent: string) {
  const res = await fetch(url, {
    headers: {
      'User-Agent': userAgent,
      Accept: 'application/json'
    }
  });
  if (!res.ok) throw new Error(`SEC request failed ${res.status}: ${url}`);
  return res.json();
}
