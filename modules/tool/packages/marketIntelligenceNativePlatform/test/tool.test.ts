import { describe, expect, it } from 'vitest';
import { tool as createMonitorEventCard } from '../children/create_monitor_event_card/src';
import { tool as createDailyReportCard } from '../children/create_daily_report_card/src';
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
      event_type: 'policy_news_catalyst',
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

  it('creates a daily report app card and report records', async () => {
    const result = await createDailyReportCard({
      watchlist_json: JSON.stringify([
        { targetType: 'ticker', targetKey: 'NVDA', name: 'NVDA' },
        { targetType: 'person', targetKey: 'elon_musk', name: 'Elon Musk' }
      ]),
      signals_json: JSON.stringify([
        {
          id: 'sig-daily-1',
          title: 'NVDA 放量突破',
          eventType: 'stock_price_action',
          target: { targetType: 'ticker', targetKey: 'NVDA', name: 'NVDA' },
          impactedTickers: ['NVDA'],
          importanceScore: 84,
          evidence: [{ title: 'Source', url: 'https://example.com/nvda' }]
        }
      ]),
      report_date: '2026-06-21',
      summary: '关注组合今日重点集中在 AI 计算链和人物公开发言。',
      ai_blocks_json: JSON.stringify([
        { title: 'AI 判断', content: '高分异动需要等待收盘价和成交量确认。' }
      ])
    });

    const card = JSON.parse(result.app_card);
    const records = JSON.parse(result.records_json);

    expect(card.componentName).toBe('MarketDailyReportCard');
    expect(card.data.kind).toBe('daily_report');
    expect(card.data.stats.watchCount).toBe(2);
    expect(card.data.stats.signalCount).toBe(1);
    expect(records.map((item: any) => item.tableKey)).toEqual([
      'market_daily_report',
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
      ai_blocks_json: JSON.stringify([
        { title: '机会', content: '资金继续偏向 AI 计算链。' },
        { title: '风险', content: '估值波动和财报预期过高仍需要跟踪。' }
      ])
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
    expect(JSON.parse(discovery.app_card).data.discoveryType).toBe('price_move');
    expect(JSON.parse(discovery.app_card).data.profile.label).toBe('异动雷达');
    expect(JSON.parse(discovery.app_card).data.signalCards[0].metrics).toBeDefined();
    expect(JSON.parse(discovery.app_card).data.contentSections).toHaveLength(2);
    expect(JSON.parse(discovery.app_card).data.categoryStats.risk).toBe(1);
    const analysisCard = JSON.parse(analysis.app_card);
    expect(analysisCard.componentName).toBe('MarketDeepAnalysisCard');
    expect(analysisCard.data.contentSections).toHaveLength(1);
    expect(analysisCard.data.overviewBlocks).toHaveLength(1);
    expect(analysisCard.data.viewModel.contentSections).toHaveLength(1);
    expect(analysisCard.data.summary).toContain('催化强');
    expect(JSON.parse(radar.app_card).componentName).toBe('MarketRadarDashboardCard');
    expect(JSON.parse(radar.record_json).tableKey).toBe('market_dashboard_snapshot');
  });

  it('creates famous institution activity native discovery view', async () => {
    const discovery = await createDiscoveryBoardCard({
      scan_mode: 'famous_institution_trade',
      universe: 'Buffett, Congress, ARK',
      signals_json: JSON.stringify([
        {
          id: 'sig-smart-money-1',
          title: 'Berkshire 披露增持能源股',
          eventType: 'famous_institution_trade',
          target: { targetType: 'institution', targetKey: 'berkshire', name: 'Berkshire Hathaway' },
          impactedTickers: ['OXY'],
          importanceScore: 81,
          confidence: 'medium',
          delayOrLimitation: '13F 为季度历史披露，不能视为实时持仓。',
          nextVerification: '核对最新 13F 季度、组合占比和后续 13D/G。'
        }
      ]),
      ai_blocks_json: JSON.stringify([
        { title: '解读', content: '这是聪明钱线索，需要标注披露滞后。' }
      ])
    });
    const card = JSON.parse(discovery.app_card);
    expect(card.data.discoveryType).toBe('famous_institution_trade');
    expect(card.data.profile.label).toBe('名人机构动向');
    expect(card.data.signalCards[0].delayOrLimitation).toContain('13F');
  });

  it('keeps signal lists out of discovery AI narrative when structured signals exist', async () => {
    const discovery = await createDiscoveryBoardCard({
      scan_mode: 'capital_flow',
      universe: 'NVDA, TSLA',
      signals_json: JSON.stringify([
        {
          id: 'sig-flow-1',
          title: 'TSLA CALL 放量',
          eventType: 'capital_flow',
          target: { targetType: 'ticker', targetKey: 'TSLA', name: 'TSLA' },
          impactedTickers: ['TSLA'],
          importanceScore: 82
        }
      ]),
      ai_blocks_json: JSON.stringify([
        {
          title: 'Top 信号 1：TSLA CALL 放量',
          type: 'signal_analysis',
          content: '这一段是重复的单条信号解释，应该由 signals_json 渲染。'
        },
        {
          title: '综合判断',
          type: 'synthesis',
          content: '本轮资金流线索更像风险偏好回升后的方向试探，需要等待成交量延续确认。'
        }
      ])
    });

    const card = JSON.parse(discovery.app_card);
    expect(card.data.aiBlocks).toHaveLength(1);
    expect(card.data.aiBlocks[0].title).toBe('综合判断');
    expect(card.data.contentSections.map((section: any) => section.title)).toEqual(['综合判断']);
  });

  it('creates theme industry heat native discovery view', async () => {
    const discovery = await createDiscoveryBoardCard({
      scan_mode: 'theme_industry_heat',
      universe: 'AI Agents, Semiconductors',
      signals_json: JSON.stringify([
        {
          id: 'sig-theme-1',
          title: 'AI Agents 主题热度升温',
          eventType: 'theme_industry_heat',
          target: { targetType: 'theme', targetKey: 'ai_agents', name: 'AI Agents' },
          impactedTickers: ['NVDA', 'MSFT'],
          importanceScore: 78
        }
      ]),
      ai_blocks_json: JSON.stringify([
        { title: '解读', content: '主题热度需要映射到真实收入链和可交易标的。' }
      ])
    });
    const card = JSON.parse(discovery.app_card);
    expect(card.data.discoveryType).toBe('theme_industry_heat');
    expect(card.data.profile.label).toBe('主题产业热度');
  });

  it('infers discovery mode when scan mode is omitted', async () => {
    const discovery = await createDiscoveryBoardCard({
      universe: 'Buffett, Congress, ARK',
      signals_json: JSON.stringify([
        {
          id: 'sig-missing-scan-mode',
          title: 'Berkshire 13F 持仓变化',
          eventType: 'famous_institution_trade',
          target: { targetType: 'institution', targetKey: 'berkshire', name: 'Berkshire Hathaway' },
          impactedTickers: ['OXY'],
          importanceScore: 72
        }
      ]),
      ai_blocks_json: JSON.stringify([
        { title: '解读', content: '13F 披露有滞后，需要结合后续文件验证。' }
      ])
    } as any);

    const card = JSON.parse(discovery.app_card);
    expect(discovery.system_error).toBeUndefined();
    expect(card.data.discoveryType).toBe('famous_institution_trade');
    expect(card.data.profile.label).toBe('名人机构动向');
  });

  it('builds rich discovery analysis from signals when ai blocks are omitted', async () => {
    const discovery = await createDiscoveryBoardCard({
      scan_mode: 'policy_news_catalyst',
      universe: 'NVDA, TSLA, META',
      signals_json: JSON.stringify([
        {
          id: 'sig-policy-1',
          title: 'TSLA 自动驾驶监管分歧升温',
          eventType: 'policy_news_catalyst',
          summary: '欧洲监管机构对 supervised self-driving 的审查分歧扩大。',
          why_it_matters: 'FSD 全球化节奏是 TSLA 软件收入和估值叙事的重要变量。',
          impactedTickers: ['TSLA'],
          stance: 'risk_watch',
          evidence: [
            {
              title: 'Reuters: Sweden may oppose Tesla supervised self-driving',
              url: 'https://example.com/tesla-regulation',
              quote: 'Sweden may oppose the rollout over speeding concerns.'
            }
          ],
          delay_or_limitation: '新闻源需要监管原文确认。',
          next_verification: '核对欧盟和瑞典交通监管文件。'
        },
        {
          id: 'sig-policy-2',
          title: 'NVDA 端侧 AI Agent SDK 发布',
          eventType: 'policy_news_catalyst',
          summary: 'NVIDIA 发布 ACE Game Agent SDK 与 UE5 插件。',
          why_it_matters: '把 AI Agent 叙事从数据中心延伸到端侧和游戏开发者生态。',
          impactedTickers: ['NVDA'],
          stance: 'opportunity_watch',
          evidence: ['https://example.com/nvidia-ace-agent-sdk'],
          next_verification: '观察开发者采用、游戏合作和 RTX 端侧 AI 需求。'
        }
      ]),
      sources_json: JSON.stringify([{ title: 'Google News RSS', type: 'news' }])
    });

    const card = JSON.parse(discovery.app_card);
    expect(card.data.aiBlocks.length).toBeGreaterThanOrEqual(3);
    expect(card.data.contentSections.length).toBeGreaterThanOrEqual(3);
    expect(card.data.sources.length).toBeGreaterThanOrEqual(3);
    expect(
      card.data.sources.some((source: any) => source.url === 'https://example.com/tesla-regulation')
    ).toBe(true);
    expect(card.data.overviewBlocks.length).toBeGreaterThan(0);
  });

  it('derives important signals from ai blocks when signals are omitted', async () => {
    const discovery = await createDiscoveryBoardCard({
      scan_mode: 'policy_news_catalyst',
      universe: 'NVDA, PLTR, META',
      ai_blocks_json: JSON.stringify({
        contentSections: [
          {
            title: '扫描结论：AI 基建催化正在外溢到电力、光子和监管执法',
            type: 'synthesis',
            content: '本轮扫描发现多个政策新闻催化，但结构化 signals_json 被模型漏传。'
          },
          {
            title: 'Top 信号 1：NVIDIA + Coherent 先进光子制造扩张',
            type: 'signal_analysis',
            content:
              'NVIDIA 将 Coherent 德州先进光子制造扩张放入 AI infrastructure 叙事。事件类型：公司新闻/美国制造。影响标的：NVDA、COHR。市场含义：AI 工厂的非 GPU 瓶颈可能转向光互连、激光和网络设备。置信度：中高。下一步验证：核对 Coherent IR、投产时间和 AI/Datacom 收入占比。',
            items: ['影响标的：NVDA、COHR', '机会路径：光互连与先进光子制造']
          },
          {
            title: 'Top 信号 2：FTC 对交易与订阅模式继续执法',
            type: 'signal_analysis',
            content:
              'FTC 对医药交易和互联网订阅模式继续执法。事件类型：监管执法。影响方向：医药并购、平台订阅和 META 隐私/计费合规。风险路径：交易剥离、合规成本上升。置信度：中高。下一步验证：跟踪 FTC complaint/order 和相关公司公告。'
          }
        ]
      }),
      sources_json: JSON.stringify([
        { title: 'NVIDIA official update', url: 'https://example.com/nvidia-coherent' },
        { title: 'FTC official update', url: 'https://example.com/ftc-enforcement' }
      ])
    });

    const card = JSON.parse(discovery.app_card);
    expect(discovery.count).toBe(2);
    expect(card.data.signals.length).toBe(2);
    expect(card.data.signalCards.length).toBe(2);
    expect(card.data.signalCards[0].title).toContain('NVIDIA');
    expect(card.data.signalCards[0].impactedTickers).toContain('NVDA');
    expect(card.data.signalCards[1].category).toBe('risk');
  });

  it('rejects unsupported discovery scan mode', async () => {
    const discovery = await createDiscoveryBoardCard({
      scan_mode: 'unsupported_mode',
      universe: 'Buffett',
      signals_json: '[]'
    } as any);

    expect(discovery.app_card).toBe('');
    expect(discovery.system_error).toContain('Unsupported');
  });
});
