import { afterEach, describe, expect, test } from 'vitest';
import { tool as scanFinancialAnomalies } from '../children/scanFinancialAnomalies/src';
import { tool as scanInstitutionHoldings } from '../children/scanInstitutionHoldings/src';
import { tool as scanInsiderTransactions } from '../children/scanInsiderTransactions/src';
import { tool as scanSecFilings } from '../children/scanSecFilings/src';

describe('SEC disclosure tools', () => {
  const originalFetch = globalThis.fetch;

  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  test('detects financial anomalies from provider-shaped JSON', async () => {
    const result = await scanFinancialAnomalies({
      symbols: 'NVDA',
      financials_json: JSON.stringify([
        {
          symbol: 'NVDA',
          period: '2026Q1',
          revenue: 30000000000,
          revenuePrevious: 24000000000,
          grossMargin: 76,
          grossMarginPrevious: 68,
          debt: 16000000000,
          debtPrevious: 10000000000,
          sourceName: 'fixture'
        }
      ]),
      revenue_change_threshold: 10,
      margin_change_threshold: 5,
      debt_change_threshold: 20,
      share_change_threshold: 5,
      min_signal_score: 40
    });

    const events = JSON.parse(result.financial_events_json);

    expect(result.system_error).toBeUndefined();
    expect(events.length).toBeGreaterThanOrEqual(2);
    expect(events.some((event: any) => event.metrics.metric === 'revenue_change')).toBe(true);
    expect(events.some((event: any) => event.metrics.metric === 'gross_margin_change')).toBe(true);
  });

  test('detects financial anomalies from official SEC company facts', async () => {
    globalThis.fetch = (async (url: string | URL | Request) => {
      const requestUrl = String(url);
      if (requestUrl.includes('company_tickers.json')) {
        return new Response(
          JSON.stringify({
            0: {
              cik_str: 320193,
              ticker: 'AAPL',
              title: 'Apple Inc.'
            }
          }),
          { status: 200 }
        );
      }

      return new Response(
        JSON.stringify({
          entityName: 'Apple Inc.',
          facts: {
            'us-gaap': {
              RevenueFromContractWithCustomerExcludingAssessedTax: {
                units: {
                  USD: [
                    {
                      fy: 2025,
                      fp: 'FY',
                      form: '10-K',
                      filed: '2026-01-31',
                      end: '2025-12-31',
                      val: 130
                    },
                    {
                      fy: 2024,
                      fp: 'FY',
                      form: '10-K',
                      filed: '2025-01-31',
                      end: '2024-12-31',
                      val: 100
                    }
                  ]
                }
              },
              GrossProfit: {
                units: {
                  USD: [
                    {
                      fy: 2025,
                      fp: 'FY',
                      form: '10-K',
                      filed: '2026-01-31',
                      end: '2025-12-31',
                      val: 78
                    },
                    {
                      fy: 2024,
                      fp: 'FY',
                      form: '10-K',
                      filed: '2025-01-31',
                      end: '2024-12-31',
                      val: 50
                    }
                  ]
                }
              }
            }
          }
        }),
        { status: 200 }
      );
    }) as typeof fetch;

    const result = await scanFinancialAnomalies({
      symbols: 'AAPL',
      secUserAgent: 'iPollo test contact@example.com',
      revenue_change_threshold: 10,
      margin_change_threshold: 5,
      debt_change_threshold: 20,
      share_change_threshold: 5,
      min_signal_score: 40
    });

    const events = JSON.parse(result.financial_events_json);

    expect(result.system_error).toBeUndefined();
    expect(result.summary_markdown).toContain('SEC Company Facts');
    expect(events.some((event: any) => event.metrics.metric === 'revenue_change')).toBe(true);
    expect(events.some((event: any) => event.metrics.metric === 'gross_margin_change')).toBe(true);
  });

  test('detects material SEC filings from provider-shaped JSON', async () => {
    const result = await scanSecFilings({
      entities: 'TSLA',
      filings_json: JSON.stringify([
        {
          symbol: 'TSLA',
          company: 'Tesla, Inc.',
          form: '8-K',
          filingDate: new Date().toISOString().slice(0, 10),
          description: 'Material agreement',
          accessionNumber: '0000000000-26-000001',
          sourceName: 'SEC EDGAR'
        }
      ]),
      forms: '8-K,10-Q',
      lookback_days: 30,
      min_signal_score: 40
    });

    const events = JSON.parse(result.filing_events_json);

    expect(result.system_error).toBeUndefined();
    expect(events).toHaveLength(1);
    expect(events[0].eventType).toBe('sec_filing');
    expect(events[0].title).toContain('8-K');
  });

  test('detects 13F holding changes', async () => {
    const result = await scanInstitutionHoldings({
      institutions: 'Berkshire Hathaway',
      holdings_json: JSON.stringify([
        {
          institution: 'Berkshire Hathaway',
          symbol: 'AAPL',
          shares: 500000000,
          previousShares: 900000000,
          marketValue: 100000000000,
          previousMarketValue: 180000000000,
          reportDate: '2026-03-31',
          sourceName: 'fixture'
        }
      ]),
      min_signal_score: 40
    });

    const events = JSON.parse(result.holding_events_json);

    expect(result.system_error).toBeUndefined();
    expect(events).toHaveLength(1);
    expect(events[0].eventType).toBe('institution_holding_change');
    expect(events[0].metrics.action).toBe('reduced');
  });

  test('detects insider transactions', async () => {
    const result = await scanInsiderTransactions({
      symbols_or_people: 'NVDA, Jensen Huang',
      insider_trades_json: JSON.stringify([
        {
          symbol: 'NVDA',
          insider: 'Director Example',
          role: 'Director',
          transactionCode: 'P',
          shares: 10000,
          price: 120,
          transactionDate: '2026-06-01',
          sourceName: 'fixture'
        }
      ]),
      min_signal_score: 35
    });

    const events = JSON.parse(result.insider_events_json);

    expect(result.system_error).toBeUndefined();
    expect(events).toHaveLength(1);
    expect(events[0].eventType).toBe('insider_transaction');
    expect(events[0].title).toContain('open market buy');
  });

  test('keeps institution input simple when 13F data is absent', async () => {
    const result = await scanInstitutionHoldings({
      institutions: 'Bridgewater, Scion'
    });

    expect(result.system_error).toBeUndefined();
    expect(result.count).toBe(0);
    expect(result.summary_markdown).toContain('未传入 13F 持仓 JSON');
  });
});
