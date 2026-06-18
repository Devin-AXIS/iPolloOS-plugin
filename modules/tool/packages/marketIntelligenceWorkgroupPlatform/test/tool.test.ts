import { describe, expect, test, vi } from 'vitest';
import { tool as marketOpportunityDashboard } from '../children/market_opportunity_dashboard/src';
import { tool as smartMoneyDashboard } from '../children/smart_money_dashboard/src';
import { tool as tickerEventDashboard } from '../children/ticker_event_dashboard/src';

vi.mock('@tool/utils/uploadFile', () => ({
  uploadFile: vi.fn(async () => ({
    accessUrl: 'https://os.ipollo.net/market-intelligence-smoke.html',
    objectName: 'codex-smoke/market-intelligence-smoke.html',
    size: 12345
  }))
}));

const opportunityReport = {
  title: '今日 AI 机会雷达',
  subtitle: '机会、风险和观察信号 TOP 排序',
  asOf: '2026-06-18',
  preparedFor: 'iPollo Finance Alpha',
  marketContext: 'AI infrastructure and agent software remain the highest-density signal cluster.',
  summary: 'NVDA、PLTR 和 MSFT 相关信号集中在订单、财报预期和主题资金流。',
  signals: [
    {
      title: 'NVDA 数据中心订单信号继续放大',
      summary: '新闻和成交量共同指向 AI 基础设施需求仍是市场主线。',
      ticker: 'NVDA',
      eventType: 'theme_heat',
      label: 'opportunity',
      score: 91,
      direction: 'up',
      whyItMatters: '该信号同时影响半导体、云厂商和 AI Agent 产业链。',
      delayOrLimitation: '新闻和成交量为近实时/延迟数据，仍需公司 IR 或 SEC 文件确认。',
      nextVerification: '核验订单公告、财报指引和主要客户披露。',
      tags: ['AI', 'semis'],
      evidence: [
        {
          sourceName: 'fixture_news',
          sourceType: 'news',
          url: 'https://example.com/nvda',
          confidence: 78,
          delayLabel: 'delayed'
        }
      ]
    },
    {
      title: 'PLTR 政府订单讨论热度升高',
      summary: '主题热度较高，但缺少一手合同披露。',
      ticker: 'PLTR',
      eventType: 'major_news',
      label: 'watch',
      score: 73,
      tags: ['defense', 'AI'],
      evidence: [{ sourceName: 'fixture_search', sourceType: 'search', confidence: 62 }]
    }
  ],
  sections: [
    {
      title: '市场脉搏',
      subtitle: '按主题聚合后的信号密度',
      items: [
        { label: 'AI Infra', value: 91, tone: 'green' },
        { label: 'Defense AI', value: 73, tone: 'amber' }
      ]
    }
  ],
  dataGaps: ['Options Flow provider 未接入，期权流不参与本次排序。']
};

describe('market intelligence workgroup dashboards', () => {
  test('renders opportunity dashboard with stable HTML and page cover', async () => {
    const input = {
      report_json: JSON.stringify(opportunityReport),
      report_date: '2026-06-18',
      prepared_for: 'iPollo Finance Alpha',
      page_output_mode: 'raw_html' as const
    };
    const first = await marketOpportunityDashboard(input);
    const second = await marketOpportunityDashboard(input);
    const cover = JSON.parse(first.page_cover);

    expect(first.system_error).toBeUndefined();
    expect(first.page_html).toContain('今日 AI 机会雷达');
    expect(first.page_html).toContain('Signal Board');
    expect(first.page_html).toContain('Options Flow provider 未接入');
    expect(first.page_html).toBe(second.page_html);
    expect(cover.variant).toBe('market-intelligence');
    expect(cover.title).toBe('今日 AI 机会雷达');
  });

  test('renders smart money dashboard without claiming certainty', async () => {
    const result = await smartMoneyDashboard({
      report_json: JSON.stringify({
        title: 'Smart Money 资金雷达',
        asOf: '2026-06-18',
        summary: '期权和 ETF 信号集中，但 13F 与国会披露存在延迟。',
        signals: [
          {
            title: 'NVDA Call Sweep 溢价放大',
            summary: '大额 Call 活动超过阈值。',
            ticker: 'NVDA',
            eventType: 'options_flow',
            label: 'watch',
            score: 84,
            delayOrLimitation: 'Options flow 只能代表异常活动，不能证明机构方向。',
            evidence: [{ sourceName: 'fixture_options', sourceType: 'data_vendor', confidence: 72 }]
          }
        ],
        sections: [
          {
            title: '资金分层',
            items: [
              { label: 'Options premium', value: '$1.2M', tone: 'green' },
              { label: '13F delay', value: 'Quarterly', tone: 'amber' }
            ]
          }
        ]
      }),
      report_date: '2026-06-18',
      page_output_mode: 'raw_html'
    });

    expect(result.system_error).toBeUndefined();
    expect(result.page_html).toContain('Options flow 只能代表异常活动');
    expect(result.page_html).not.toContain('一定买入');
    expect(JSON.parse(result.page_cover).eyebrow).toBe('AI Market Intelligence');
  });

  test('renders ticker event dashboard and handles empty signal input', async () => {
    const result = await tickerEventDashboard({
      report_json: JSON.stringify({
        title: 'TSLA 单股事件复盘',
        asOf: '2026-06-18',
        summary: '行情异动需要继续核验财报、新闻和 SEC 证据。',
        dataGaps: ['未传入 SEC filing 事件。']
      }),
      report_date: '2026-06-18',
      page_output_mode: 'raw_html'
    });

    expect(result.system_error).toBeUndefined();
    expect(result.page_html).toContain('No ranked market signal was provided');
    expect(result.page_html).toContain('未传入 SEC filing 事件');
    expect(result.summary).toContain('0 个结构化信号');
  });

  test('publishes dashboard HTML by default and returns a page url', async () => {
    const result = await marketOpportunityDashboard({
      report_json: JSON.stringify(opportunityReport),
      report_date: '2026-06-18',
      prepared_for: 'iPollo Finance Alpha'
    });

    expect(result.system_error).toBeUndefined();
    expect(result.page_html).toBe('');
    expect(result.page_url).toBe('https://os.ipollo.net/market-intelligence-smoke.html');
    expect(result.page_storage_key).toBe('codex-smoke/market-intelligence-smoke.html');
    expect(result.page_storage_size).toBe(12345);
    expect(result.summary).toContain('已发布');
  });
});
