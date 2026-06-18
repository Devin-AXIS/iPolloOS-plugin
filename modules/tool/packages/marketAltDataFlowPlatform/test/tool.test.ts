import { describe, expect, test } from 'vitest';
import { tool as scanCongressTrades } from '../children/scanCongressTrades/src';
import { tool as scanDarkPoolFlow } from '../children/scanDarkPoolFlow/src';
import { tool as scanEtfFundFlows } from '../children/scanEtfFundFlows/src';
import { tool as scanOptionsFlow } from '../children/scanOptionsFlow/src';

describe('market alt-data flow tools', () => {
  test('detects large options flow and sweeps', async () => {
    const result = await scanOptionsFlow({
      symbols: 'NVDA, TSLA',
      options_flow_json: JSON.stringify([
        {
          symbol: 'NVDA',
          optionType: 'call',
          premium: 1200000,
          sweep: true,
          strike: 180,
          expiration: '2026-08-21',
          sourceName: 'fixture'
        }
      ]),
      premium_threshold: 250000,
      min_signal_score: 40
    });

    const events = JSON.parse(result.options_events_json);

    expect(result.system_error).toBeUndefined();
    expect(events).toHaveLength(1);
    expect(events[0].eventType).toBe('options_flow');
    expect(events[0].title).toContain('CALL');
  });

  test('detects dark-pool blocks', async () => {
    const result = await scanDarkPoolFlow({
      symbols: 'TSLA',
      dark_pool_json: JSON.stringify([
        {
          symbol: 'TSLA',
          price: 300,
          shares: 200000,
          venue: 'ATS',
          sourceName: 'fixture'
        }
      ]),
      notional_threshold: 1000000,
      min_signal_score: 40
    });

    const events = JSON.parse(result.dark_pool_events_json);

    expect(result.system_error).toBeUndefined();
    expect(events).toHaveLength(1);
    expect(events[0].eventType).toBe('dark_pool_block');
  });

  test('detects Congress trades', async () => {
    const result = await scanCongressTrades({
      politicians_or_symbols: 'Nancy Pelosi, NVDA',
      congress_trades_json: JSON.stringify([
        {
          politician: 'Nancy Pelosi',
          symbol: 'NVDA',
          transactionType: 'Purchase',
          amountMin: 100000,
          amountMax: 500000,
          filingDate: '2026-06-01',
          sourceName: 'fixture'
        }
      ]),
      min_signal_score: 35
    });

    const events = JSON.parse(result.congress_events_json);

    expect(result.system_error).toBeUndefined();
    expect(events).toHaveLength(1);
    expect(events[0].eventType).toBe('congress_trade');
    expect(events[0].summary).toContain('NVDA');
  });

  test('detects ETF/fund flows', async () => {
    const result = await scanEtfFundFlows({
      funds_or_themes: 'SMH, AI',
      fund_flows_json: JSON.stringify([
        {
          symbol: 'SMH',
          fund: 'VanEck Semiconductor ETF',
          flow: 120000000,
          flowPercent: 1.8,
          period: '1D',
          sourceName: 'fixture'
        }
      ]),
      flow_threshold: 50000000,
      flow_percent_threshold: 1,
      min_signal_score: 40
    });

    const events = JSON.parse(result.fund_flow_events_json);

    expect(result.system_error).toBeUndefined();
    expect(events).toHaveLength(1);
    expect(events[0].eventType).toBe('fund_flow');
  });

  test('keeps options input simple when provider data is absent', async () => {
    const result = await scanOptionsFlow({
      symbols: 'NVDA TSLA PLTR'
    });

    expect(result.system_error).toBeUndefined();
    expect(result.count).toBe(0);
    expect(result.summary_markdown).toContain('未传入期权流 JSON');
  });
});
