import { describe, expect, test } from 'vitest';
import { tool as scanEarningsEvents } from '../children/scanEarningsEvents/src';
import { tool as scanMarketAssets } from '../children/scanMarketAssets/src';

describe('US market core tools', () => {
  test('scans market assets from provider-shaped JSON', async () => {
    const result = await scanMarketAssets({
      symbols: 'NVDA, TSLA',
      market_data_json: JSON.stringify([
        {
          symbol: 'NVDA',
          price: 150,
          previousClose: 140,
          volume: 300000000,
          avgVolume: 100000000,
          fiftyTwoWeekHigh: 149,
          sourceName: 'fixture'
        },
        {
          symbol: 'TSLA',
          price: 300,
          previousClose: 298,
          volume: 50000000,
          avgVolume: 45000000,
          sourceName: 'fixture'
        }
      ]),
      price_move_threshold: 3,
      volume_spike_ratio: 2,
      min_signal_score: 40
    });

    const events = JSON.parse(result.events_json);

    expect(result.system_error).toBeUndefined();
    expect(events.length).toBeGreaterThanOrEqual(2);
    expect(events.some((event: any) => event.eventType === 'price_move')).toBe(true);
    expect(events.some((event: any) => event.eventType === 'volume_spike')).toBe(true);
    expect(result.summary_markdown).toContain('发现');
  });

  test('scans earnings surprises from provider-shaped JSON', async () => {
    const result = await scanEarningsEvents({
      symbols: 'NVDA',
      earnings_data_json: JSON.stringify([
        {
          symbol: 'NVDA',
          reportDate: '2026-05-20',
          epsActual: 1.2,
          epsEstimate: 1.0,
          revenueActual: 30000000000,
          revenueEstimate: 28000000000,
          guidance: 'raised',
          sourceName: 'fixture'
        }
      ]),
      min_signal_score: 40
    });

    const events = JSON.parse(result.earnings_events_json);

    expect(result.system_error).toBeUndefined();
    expect(events).toHaveLength(1);
    expect(events[0].eventType).toBe('guidance_change');
    expect(events[0].summary).toContain('EPS surprise');
  });

  test('keeps user input simple when provider data is absent', async () => {
    const result = await scanMarketAssets({
      symbols: 'NVDA TSLA PLTR',
      price_move_threshold: 3,
      volume_spike_ratio: 2,
      min_signal_score: 45
    });

    expect(result.system_error).toBeUndefined();
    expect(result.count).toBe(0);
    expect(result.summary_markdown).toContain('未传入行情数据 JSON');
  });
});
