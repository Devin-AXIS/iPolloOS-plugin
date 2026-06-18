import { describe, expect, test } from 'vitest';
import { tool as mapThemeCompanies } from '../children/mapThemeCompanies/src';
import { tool as scanMarketNews } from '../children/scanMarketNews/src';
import { tool as scanPeopleInstitutionSignals } from '../children/scanPeopleInstitutionSignals/src';
import { tool as scanThemeMomentum } from '../children/scanThemeMomentum/src';

describe('market news and theme tools', () => {
  test('detects material market news', async () => {
    const result = await scanMarketNews({
      query_or_symbols: 'NVDA, AI',
      news_json: JSON.stringify([
        {
          symbols: ['NVDA'],
          title: 'Nvidia wins multi-year AI infrastructure order',
          summary: 'Large customer order for AI systems.',
          eventType: 'customer_order',
          relevance: 95,
          publishedAt: new Date().toISOString(),
          sourceName: 'fixture'
        }
      ]),
      lookback_hours: 48,
      min_signal_score: 40
    });

    const events = JSON.parse(result.news_events_json);

    expect(result.system_error).toBeUndefined();
    expect(events).toHaveLength(1);
    expect(events[0].eventType).toBe('market_news');
    expect(events[0].metrics.newsType).toBe('customer_order');
  });

  test('detects theme momentum', async () => {
    const result = await scanThemeMomentum({
      themes: 'AI Agent',
      theme_signals_json: JSON.stringify([
        {
          theme: 'AI Agent',
          mentions: 1000,
          previousMentions: 250,
          engagement: 50000,
          sentiment: 0.5,
          sourceName: 'fixture'
        }
      ]),
      mention_spike_ratio: 2,
      min_signal_score: 40
    });

    const events = JSON.parse(result.theme_events_json);

    expect(result.system_error).toBeUndefined();
    expect(events).toHaveLength(1);
    expect(events[0].eventType).toBe('theme_momentum');
  });

  test('maps theme companies', async () => {
    const result = await mapThemeCompanies({
      theme: 'AI Agent',
      company_relations_json: JSON.stringify([
        {
          theme: 'AI Agent',
          company: 'Microsoft',
          symbol: 'MSFT',
          relationship: 'distribution and cloud infrastructure',
          exposureScore: 85,
          sourceName: 'fixture'
        },
        {
          theme: 'AI Agent',
          company: 'Small vendor',
          symbol: 'SMOL',
          exposureScore: 20
        }
      ]),
      min_exposure_score: 40
    });

    const relations = JSON.parse(result.relations_json);

    expect(result.system_error).toBeUndefined();
    expect(relations).toHaveLength(1);
    expect(relations[0].symbol).toBe('MSFT');
  });

  test('detects people and institution signals', async () => {
    const result = await scanPeopleInstitutionSignals({
      entities: 'Warren Buffett, Berkshire',
      entity_signals_json: JSON.stringify([
        {
          entity: 'Berkshire Hathaway',
          entityType: 'institution',
          signalType: 'investment',
          title: 'Berkshire increases energy infrastructure investment',
          summary: 'Berkshire disclosed a strategic investment update.',
          relatedSymbols: 'OXY',
          marketImpact: 80,
          sourceName: 'fixture'
        }
      ]),
      min_signal_score: 40
    });

    const events = JSON.parse(result.entity_events_json);

    expect(result.system_error).toBeUndefined();
    expect(events).toHaveLength(1);
    expect(events[0].eventType).toBe('people_institution_signal');
    expect(events[0].entities.some((entity: any) => entity.ticker === 'OXY')).toBe(true);
  });

  test('keeps theme input simple when provider data is absent', async () => {
    const result = await scanThemeMomentum({
      themes: 'robotics, quantum computing'
    });

    expect(result.system_error).toBeUndefined();
    expect(result.count).toBe(0);
    expect(result.summary_markdown).toContain('未传入主题信号 JSON');
  });
});
