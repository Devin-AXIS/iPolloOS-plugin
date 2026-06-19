import { describe, expect, test, vi } from 'vitest';
import { tool as marketOpportunityDashboard } from '../children/market_opportunity_dashboard/src';
import { tool as peopleInstitutionDashboard } from '../children/people_institution_dashboard/src';
import { tool as smartMoneyDashboard } from '../children/smart_money_dashboard/src';
import { tool as themeIndustryDashboard } from '../children/theme_industry_dashboard/src';
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
    expect(first.page_html).toContain('机会候选池');
    expect(first.page_html).toContain('Options Flow provider 未接入');
    expect(first.page_html).not.toContain('未来洞察系统');
    expect(first.page_html).toBe(second.page_html);
    expect(cover.variant).toBe('market-intelligence');
    expect(cover.title).toBe('今日 AI 机会雷达');
  });

  test('normalizes actual opportunity aliases into an adaptive candidate pool', async () => {
    const result = await marketOpportunityDashboard({
      report_json: JSON.stringify({
        title: '发现机会扫描结果',
        asOf: '2026-06-18',
        summary: '扫描结果来自机会、风险和观察字段，而不是单一固定 signals 字段。',
        metrics: {
          scan_mode: '新闻催化',
          universe: 'watchlist'
        },
        opportunities: [
          {
            title: 'AVGO AI 网络订单预期升温',
            summary: '新闻催化和成交量同时升温。',
            ticker: 'AVGO',
            score: 86,
            metrics: { volume_ratio: '2.4x', source_count: 3 },
            evidence: [{ sourceName: 'fixture_news', sourceType: 'news', confidence: 70 }]
          }
        ],
        risks: [
          {
            title: 'SMCI 毛利率争议仍需核验',
            summary: '供应链讨论升温，但缺少公司披露。',
            ticker: 'SMCI',
            score: 66
          }
        ],
        watch_items: [
          {
            title: 'MSFT Copilot 更新关注度抬升',
            summary: '产品更新可能影响软件链条。',
            ticker: 'MSFT',
            score: 61
          }
        ]
      }),
      report_date: '2026-06-18',
      page_output_mode: 'raw_html'
    });

    expect(result.system_error).toBeUndefined();
    expect(result.page_html).toContain('机会候选池');
    expect(result.page_html).toContain('AVGO AI 网络订单预期升温');
    expect(result.page_html).toContain('SMCI 毛利率争议仍需核验');
    expect(result.summary).toContain('3 个结构化信号');
  });

  test('renders smart money dashboard without claiming certainty', async () => {
    const result = await smartMoneyDashboard({
      report_json: JSON.stringify({
        title: 'Smart Money 资金雷达',
        asOf: '2026-06-18',
        summary: '期权和 ETF 信号集中，但 13F 与国会披露存在延迟。',
        flowSignals: [
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
    expect(result.page_html).toContain('资金线索分层');
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
    expect(result.page_html).toContain('没有结构化事件线索');
    expect(result.page_html).toContain('未传入 SEC filing 事件');
    expect(result.summary).toContain('0 个结构化信号');
  });

  test('renders monitoring history as an event stream when report content is a brief or alert', async () => {
    const result = await tickerEventDashboard({
      report_json: JSON.stringify({
        title: 'NVDA 监控日报',
        asOf: '2026-06-18',
        summary: '监控日报只沉淀发生变化的股票事件。',
        monitorAlerts: [
          {
            title: 'NVDA 盘前量能放大',
            summary: '相对成交量超过阈值，需要核验新闻和期权流。',
            ticker: 'NVDA',
            eventType: 'price_move',
            score: 77,
            evidence: [{ sourceName: 'fixture_market', sourceType: 'market_data', confidence: 74 }]
          }
        ],
        sections: [{ title: '监控范围', items: [{ label: 'watchlist', value: 'NVDA, AVGO' }] }]
      }),
      report_date: '2026-06-18',
      page_output_mode: 'raw_html'
    });

    expect(result.system_error).toBeUndefined();
    expect(result.page_html).toContain('Monitoring History');
    expect(result.page_html).toContain('监控事件流');
    expect(result.page_html).toContain('NVDA 盘前量能放大');
  });

  test('renders theme industry dashboard for one-shot deep analysis', async () => {
    const result = await themeIndustryDashboard({
      report_json: JSON.stringify({
        title: 'AI Agent 主题产业分析',
        asOf: '2026-06-18',
        summary: '主题热度需要拆分为受益公司、供应商、客户和风险暴露公司。',
        signals: [
          {
            title: 'AI Agent 基础设施需求外溢',
            summary: '云、GPU、数据平台和企业软件均出现主题暴露。',
            ticker: 'NVDA',
            eventType: 'theme_industry',
            label: 'opportunity',
            score: 88,
            tags: ['beneficiary', 'supplier'],
            whyItMatters: '主题机会需要通过公司收入、订单或客户关系核验。',
            evidence: [{ sourceName: 'fixture_theme_map', sourceType: 'provider', confidence: 76 }]
          }
        ],
        sections: [
          {
            title: '关系分层',
            items: [
              { label: '受益公司', value: 'NVDA, MSFT', tone: 'green' },
              { label: '风险暴露', value: 'Legacy SaaS', tone: 'amber' }
            ]
          }
        ],
        dataGaps: ['部分公司仅为 attention_only，需要公司披露确认。']
      }),
      report_date: '2026-06-18',
      page_output_mode: 'raw_html'
    });
    const cover = JSON.parse(result.page_cover);

    expect(result.system_error).toBeUndefined();
    expect(result.page_html).toContain('AI Agent 主题产业分析');
    expect(result.page_html).toContain('产业关系与公司暴露');
    expect(result.page_html).toContain('attention_only');
    expect(cover.chips).toContain('theme industry');
  });

  test('renders people institution dashboard with disclosure boundaries', async () => {
    const result = await peopleInstitutionDashboard({
      report_json: JSON.stringify({
        title: 'Berkshire 人物机构复盘',
        asOf: '2026-06-18',
        summary: '人物机构分析需要分开公开发声、披露持仓和可验证股票桥接。',
        signals: [
          {
            title: 'Berkshire 13F 持仓变化需要按季度延迟解释',
            summary: '披露持仓是历史快照，不代表当前意图。',
            entity: 'Berkshire Hathaway',
            ticker: 'BRK.B',
            eventType: 'institution_holding',
            label: 'watch',
            score: 82,
            delayOrLimitation: '13F 为季度历史披露，不能当作当前持仓。',
            tags: ['institution', '13F'],
            evidence: [{ sourceName: 'fixture_13f', sourceType: 'SEC', confidence: 88 }]
          }
        ],
        dataGaps: ['未提供最新股东信或年会材料。']
      }),
      report_date: '2026-06-18',
      page_output_mode: 'raw_html'
    });
    const cover = JSON.parse(result.page_cover);

    expect(result.system_error).toBeUndefined();
    expect(result.page_html).toContain('Berkshire 人物机构复盘');
    expect(result.page_html).toContain('人物机构动作分解');
    expect(result.page_html).toContain('不能当作当前持仓');
    expect(cover.chips).toContain('people institution');
  });

  test('keeps long loose research content renderable as an HTML page', async () => {
    const result = await marketOpportunityDashboard({
      report_json: [
        '# 今日机会初稿',
        '',
        'AI 基础设施链条仍然是今日最强的研究方向，但当前输入还没有完全整理成 signals。',
        '',
        '需要继续核验 NVDA、AVGO、SMCI 的订单、财报指引、新闻来源和期权流延迟。'
      ].join('\n'),
      report_date: '2026-06-18',
      page_output_mode: 'raw_html'
    });

    expect(result.system_error).toBeUndefined();
    expect(result.page_html).toContain('今日机会初稿');
    expect(result.page_html).toContain('补充研究');
    expect(result.page_html).toContain('输入为非结构化研究文本');
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
