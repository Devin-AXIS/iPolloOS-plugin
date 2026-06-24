import { describe, expect, it } from 'vitest';
import { tool as checkWatchSubjects } from '../children/checkWatchSubjects/src';

describe('marketIntelligenceMonitorPlatform', () => {
  it('matches source events to watch subjects and emits card inputs', async () => {
    const result = await checkWatchSubjects({
      watch_subjects_json: JSON.stringify([
        {
          subject_type: 'ticker',
          subject_key: 'NVDA',
          display_name: 'NVDA',
          primary_ticker: 'NVDA',
          enabled: true
        },
        {
          subject_type: 'person',
          subject_key: 'elon_musk',
          display_name: 'Elon Musk',
          aliases_json: JSON.stringify(['elonmusk', 'Tesla CEO']),
          enabled: true
        }
      ]),
      market_events_json: JSON.stringify([
        {
          eventId: 'market-nvda-1',
          eventType: 'price_move',
          title: 'NVDA price move +5.2%',
          summary: 'NVDA moved +5.2% with 2.8x relative volume.',
          impactedTickers: ['NVDA'],
          scores: { finalScore: 83 },
          detectedAt: new Date().toISOString(),
          evidence: [{ title: 'Market data', sourceName: 'provider' }]
        }
      ]),
      x_events_json: JSON.stringify([
        {
          dedupeKey: 'x-elon-1',
          eventType: 'person_public_comments',
          title: 'Elon Musk discussed Tesla autonomy',
          summary: 'Elon Musk posted about Tesla autonomy progress.',
          postedAt: new Date().toISOString(),
          entities: [{ type: 'person', name: 'Elon Musk', username: 'elonmusk' }],
          impactedTickers: ['TSLA'],
          score: 72,
          url: 'https://x.com/elonmusk/status/1'
        }
      ])
    });

    const events = JSON.parse(result.events_json);
    const cardInputs = JSON.parse(result.card_inputs_json);
    const records = JSON.parse(result.records_json);
    const cursorRecords = JSON.parse(result.cursor_records_json);

    expect(result.count).toBe(2);
    expect(events.map((event: any) => event.target.targetKey)).toEqual(['nvda', 'elon_musk']);
    expect(cardInputs).toHaveLength(2);
    expect(cardInputs[0].event_type).toBe('price_move');
    expect(records.map((record: any) => record.tableKey)).toEqual([
      'market_signal_event',
      'market_signal_event'
    ]);
    expect(cursorRecords.map((record: any) => record.tableKey)).toEqual([
      'market_watch_cursor',
      'market_watch_cursor'
    ]);
  });

  it('deduplicates events with next state', async () => {
    const first = await checkWatchSubjects({
      watch_subjects_json: JSON.stringify([
        {
          subject_type: 'ticker',
          subject_key: 'NVDA',
          display_name: 'NVDA',
          primary_ticker: 'NVDA',
          enabled: true
        }
      ]),
      market_events_json: JSON.stringify([
        {
          eventId: 'market-nvda-1',
          eventType: 'price_move',
          title: 'NVDA price move +5.2%',
          summary: 'NVDA moved +5.2%.',
          impactedTickers: ['NVDA'],
          scores: { finalScore: 83 },
          detectedAt: new Date().toISOString()
        }
      ])
    });

    const second = await checkWatchSubjects({
      watch_subjects_json: JSON.stringify([
        {
          subject_type: 'ticker',
          subject_key: 'NVDA',
          display_name: 'NVDA',
          primary_ticker: 'NVDA',
          enabled: true
        }
      ]),
      state_json: first.next_state_json,
      market_events_json: JSON.stringify([
        {
          eventId: 'market-nvda-1',
          eventType: 'price_move',
          title: 'NVDA price move +5.2%',
          summary: 'NVDA moved +5.2%.',
          impactedTickers: ['NVDA'],
          scores: { finalScore: 83 },
          detectedAt: new Date().toISOString()
        }
      ])
    });

    expect(first.count).toBe(1);
    expect(second.count).toBe(0);
    expect(JSON.parse(second.events_json)).toEqual([]);
  });

  it('filters low-score and unrelated events', async () => {
    const result = await checkWatchSubjects({
      watch_subjects_json: JSON.stringify([
        {
          subject_type: 'ticker',
          subject_key: 'NVDA',
          display_name: 'NVDA',
          primary_ticker: 'NVDA',
          enabled: true
        }
      ]),
      market_events_json: JSON.stringify([
        {
          eventId: 'low-score',
          title: 'NVDA tiny move',
          summary: 'NVDA moved 0.2%.',
          impactedTickers: ['NVDA'],
          score: 20,
          detectedAt: new Date().toISOString()
        },
        {
          eventId: 'unrelated',
          title: 'TSLA price move',
          summary: 'TSLA moved 5%.',
          impactedTickers: ['TSLA'],
          score: 90,
          detectedAt: new Date().toISOString()
        }
      ])
    });

    expect(result.count).toBe(0);
    expect(JSON.parse(result.card_inputs_json)).toEqual([]);
  });
});
