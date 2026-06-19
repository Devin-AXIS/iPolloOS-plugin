import { describe, expect, it } from 'bun:test';
import { tool as createMonitorEventCard } from '../children/create_monitor_event_card/src';
import { tool as createDiscoveryBoardCard } from '../children/create_discovery_board_card/src';
import { tool as createDeepAnalysisCard } from '../children/create_deep_analysis_card/src';
import { tool as createRadarDashboardCard } from '../children/create_radar_dashboard_card/src';

describe('marketIntelligenceNativePlatform', () => {
  it('creates a monitor event app card and write records', async () => {
    const result = await createMonitorEventCard({
      target_json: JSON.stringify({
        targetType: 'person',
        targetKey: 'elon_musk',
        name: 'Elon Musk'
      }),
      event_type: 'news_catalyst',
      change_summary: '公开发声带动 TSLA 盘前波动。',
      impacted_tickers: 'TSLA',
      importance_score: 82,
      sources_json: JSON.stringify([{ title: 'Source', url: 'https://example.com' }]),
      ai_blocks_json: JSON.stringify([
        { type: 'risk', title: '风险', content: '需要跟踪二次传播。' }
      ])
    });

    const card = JSON.parse(result.app_card);
    const records = JSON.parse(result.records_json);

    expect(card.componentName).toBe('MarketMonitorEventCard');
    expect(card.data.target.name).toBe('Elon Musk');
    expect(card.data.impactedTickers).toEqual(['TSLA']);
    expect(records.map((item: any) => item.tableKey)).toEqual([
      'market_signal_event',
      'market_delivery_record'
    ]);
  });

  it('creates discovery, analysis, and radar native cards', async () => {
    const signals = JSON.stringify([
      {
        id: 'sig-1',
        title: 'NVDA 放量突破',
        eventType: 'price_move',
        target: { targetType: 'ticker', targetKey: 'NVDA', name: 'NVDA' },
        impactedTickers: ['NVDA'],
        importanceScore: 76
      }
    ]);

    const discovery = await createDiscoveryBoardCard({
      scan_mode: 'price_move',
      universe: 'AI Agents',
      signals_json: signals,
      ai_blocks_json: JSON.stringify([{ title: '机会', content: '资金继续偏向 AI 计算链。' }])
    });
    const analysis = await createDeepAnalysisCard({
      analysis_type: 'ticker',
      targets_json: JSON.stringify([{ targetType: 'ticker', targetKey: 'NVDA', name: 'NVDA' }]),
      analysis_focus: 'opportunity_risk',
      signals_json: signals,
      ai_blocks_json: JSON.stringify([{ title: '结论', content: '催化强，但估值波动风险高。' }])
    });
    const radar = await createRadarDashboardCard({
      watchlist_json: JSON.stringify([{ targetType: 'ticker', targetKey: 'NVDA', name: 'NVDA' }]),
      signals_json: signals,
      dashboard_json: JSON.stringify({ summary: 'AI 计算链保持强势。' })
    });

    expect(JSON.parse(discovery.app_card).componentName).toBe('MarketDiscoveryBoardCard');
    expect(JSON.parse(analysis.app_card).componentName).toBe('MarketDeepAnalysisCard');
    expect(JSON.parse(radar.app_card).componentName).toBe('MarketRadarDashboardCard');
    expect(JSON.parse(radar.record_json).tableKey).toBe('market_dashboard_snapshot');
  });
});
