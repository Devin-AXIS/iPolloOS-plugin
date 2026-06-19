import { escapeAttr, escapeHtml, safeHttpUrl } from './escape';
import type {
  MarketDashboardReport,
  MarketDashboardSignal,
  MarketDashboardType
} from './market-report';
import { renderMarketBaseCss } from './market-style';

type BodyBlock = 'signals' | 'sections' | 'narrative' | 'evidence';
type SignalMode = 'opportunity' | 'flow' | 'timeline' | 'exposure' | 'actor';

type RenderProfile = {
  masthead: string;
  eyebrow: string;
  sideTitle: string;
  sideDescription: string;
  statLabels: [string, string, string, string];
  signalTitle: string;
  signalDescription: string;
  emptySignalText: string;
  narrativeTitle: string;
  narrativeDescription: string;
  sectionsTitle: string;
  sectionsDescription: string;
  evidenceTitle: string;
  evidenceDescription: string;
  signalMode: SignalMode;
  bodyOrder: BodyBlock[];
};

type SignalRenderOptions = {
  profile: RenderProfile;
  index: number;
  primary: boolean;
};

export function renderMarketDashboardHtml(report: MarketDashboardReport): string {
  const profile = getRenderProfile(report);
  const top = report.signals[0];
  const avgScore = report.signals.length
    ? Math.round(report.signals.reduce((sum, item) => sum + item.score, 0) / report.signals.length)
    : 0;
  const evidenceCount =
    report.signals.reduce((sum, item) => sum + item.evidence.length, 0) + report.sources.length;
  const riskCount = report.signals.filter((item) => item.label === 'risk').length;

  return `<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${escapeHtml(report.title)} · Market Intelligence</title>
  <style>
    ${renderMarketBaseCss()}
    :root { --accent: ${escapeAttr(report.accent)}; }
  </style>
</head>
<body>
  <main class="page page--${escapeAttr(report.reportType)}">
    <header class="ticker-tape">
      <span>${escapeHtml(report.preparedFor)}</span>
      <strong class="center">${escapeHtml(profile.masthead)}</strong>
      <span class="right">${escapeHtml(report.asOf)}</span>
    </header>

    <section class="hero hero--${escapeAttr(profile.signalMode)}">
      <div class="hero-main">
        <span class="eyebrow">${escapeHtml(profile.eyebrow)}</span>
        <h1>${escapeHtml(report.title)}</h1>
        <p class="hero-summary">${escapeHtml(report.summary)}</p>
        <div class="hero-meta">
          ${renderHeroStat(report.signals.length, profile.statLabels[0])}
          ${renderHeroStat(top ? top.score : 0, profile.statLabels[1])}
          ${renderHeroStat(avgScore, profile.statLabels[2])}
          ${renderHeroStat(evidenceCount, profile.statLabels[3])}
        </div>
      </div>
      <aside class="brief">
        <h2>${escapeHtml(profile.sideTitle)}</h2>
        <p>${escapeHtml(profile.sideDescription)}</p>
        ${report.marketContext ? `<p>${escapeHtml(report.marketContext)}</p>` : ''}
        <div class="metrics metrics--brief">
          <div class="metric"><b>${riskCount}</b><span>风险线索</span></div>
          <div class="metric"><b>${report.sections.length}</b><span>结构模块</span></div>
          <div class="metric"><b>${report.dataGaps.length}</b><span>数据缺口</span></div>
          <div class="metric"><b>${report.sources.length}</b><span>直接来源</span></div>
        </div>
        ${renderDataGaps(report)}
      </aside>
    </section>

    ${renderBody(report, profile)}
  </main>
</body>
</html>`;
}

function renderHeroStat(value: string | number, label: string): string {
  return `<div class="hero-stat"><b>${escapeHtml(value)}</b><span>${escapeHtml(label)}</span></div>`;
}

function renderBody(report: MarketDashboardReport, profile: RenderProfile): string {
  const renderers: Record<BodyBlock, () => string> = {
    signals: () => renderSignals(report, profile),
    sections: () => renderSections(report, profile),
    narrative: () => renderNarrative(report, profile),
    evidence: () => renderEvidence(report, profile)
  };

  return profile.bodyOrder
    .map((block) => renderers[block]())
    .filter(Boolean)
    .join('\n');
}

function renderSignals(report: MarketDashboardReport, profile: RenderProfile): string {
  if (!report.signals.length) {
    return `<section class="section">
      <div class="section-head"><h2>${escapeHtml(profile.signalTitle)}</h2><p>${escapeHtml(profile.emptySignalText)}</p></div>
      <div class="empty">${escapeHtml(profile.emptySignalText)}</div>
    </section>`;
  }

  const denseClass = report.signals.length > 6 ? ' is-dense' : '';
  return `<section class="section section--${escapeAttr(profile.signalMode)}">
    <div class="section-head">
      <h2>${escapeHtml(profile.signalTitle)}</h2>
      <p>${escapeHtml(profile.signalDescription)}</p>
    </div>
    <div class="${signalContainerClass(profile.signalMode)}${denseClass}">
      ${report.signals
        .slice(0, 12)
        .map((signal, index) =>
          renderSignal(signal, {
            profile,
            index,
            primary: index === 0 && profile.signalMode === 'opportunity'
          })
        )
        .join('')}
    </div>
  </section>`;
}

function signalContainerClass(mode: SignalMode): string {
  if (mode === 'flow') return 'flow-ledger';
  if (mode === 'timeline') return 'timeline-list';
  if (mode === 'exposure') return 'exposure-grid';
  if (mode === 'actor') return 'actor-ledger';
  return 'signal-grid';
}

function renderSignal(signal: MarketDashboardSignal, options: SignalRenderOptions): string {
  if (options.profile.signalMode === 'flow') return renderFlowSignal(signal, options);
  if (options.profile.signalMode === 'timeline') return renderTimelineSignal(signal, options);
  if (options.profile.signalMode === 'exposure') return renderExposureSignal(signal, options);
  if (options.profile.signalMode === 'actor') return renderActorSignal(signal, options);
  return renderOpportunitySignal(signal, options);
}

function renderOpportunitySignal(
  signal: MarketDashboardSignal,
  { index, primary }: SignalRenderOptions
): string {
  return `<article class="${primary ? 'signal primary' : 'signal'}">
    <div class="signal-top">
      <span class="badge">${escapeHtml(signal.label)}</span>
      <b class="score">${signal.score}</b>
    </div>
    <small class="rank-label">候选 ${padRank(index)}</small>
    <h3>${escapeHtml(signal.title)}</h3>
    ${renderSignalText(signal)}
    ${renderSignalMetrics(signal)}
    ${renderSignalChips(signal)}
  </article>`;
}

function renderFlowSignal(signal: MarketDashboardSignal, { index }: SignalRenderOptions): string {
  return `<article class="flow-row">
    <div class="row-rank">${padRank(index)}</div>
    <div class="row-main">
      <div class="row-kicker">${renderInlineMeta(signal)}</div>
      <h3>${escapeHtml(signal.title)}</h3>
      ${renderSignalText(signal)}
      ${renderSignalMetrics(signal)}
      ${renderSignalChips(signal)}
    </div>
    <div class="row-score"><b>${signal.score}</b><span>关注度</span></div>
  </article>`;
}

function renderTimelineSignal(
  signal: MarketDashboardSignal,
  { index }: SignalRenderOptions
): string {
  return `<article class="timeline-item">
    <div class="timeline-marker">${padRank(index)}</div>
    <div class="timeline-body">
      <div class="row-kicker">${renderInlineMeta(signal)}</div>
      <h3>${escapeHtml(signal.title)}</h3>
      ${renderSignalText(signal)}
      ${renderSignalMetrics(signal)}
      ${renderSignalChips(signal)}
    </div>
    <div class="timeline-score"><b>${signal.score}</b><span>优先级</span></div>
  </article>`;
}

function renderExposureSignal(
  signal: MarketDashboardSignal,
  { index }: SignalRenderOptions
): string {
  return `<article class="exposure-card">
    <div class="signal-top">
      <span class="badge">${escapeHtml(signal.ticker ? `$${signal.ticker}` : signal.entity || signal.label)}</span>
      <b class="score">${signal.score}</b>
    </div>
    <small class="rank-label">暴露 ${padRank(index)}</small>
    <h3>${escapeHtml(signal.title)}</h3>
    ${renderSignalText(signal)}
    ${renderSignalMetrics(signal)}
    ${renderSignalChips(signal)}
  </article>`;
}

function renderActorSignal(signal: MarketDashboardSignal, { index }: SignalRenderOptions): string {
  return `<article class="actor-row">
    <div class="actor-index">${padRank(index)}</div>
    <div class="actor-copy">
      <div class="row-kicker">${renderInlineMeta(signal)}</div>
      <h3>${escapeHtml(signal.title)}</h3>
      ${renderSignalText(signal)}
      ${renderSignalMetrics(signal)}
      ${renderSignalChips(signal)}
    </div>
    <div class="actor-boundary">${escapeHtml(signal.delayOrLimitation || signal.nextVerification || '需保留披露边界')}</div>
  </article>`;
}

function renderSignalText(signal: MarketDashboardSignal): string {
  return [
    signal.summary ? `<p>${escapeHtml(signal.summary)}</p>` : '',
    signal.whyItMatters ? `<p><strong>重要性：</strong>${escapeHtml(signal.whyItMatters)}</p>` : '',
    signal.delayOrLimitation
      ? `<p><strong>延迟/限制：</strong>${escapeHtml(signal.delayOrLimitation)}</p>`
      : '',
    signal.nextVerification
      ? `<p><strong>下一步核验：</strong>${escapeHtml(signal.nextVerification)}</p>`
      : ''
  ].join('');
}

function renderInlineMeta(signal: MarketDashboardSignal): string {
  const values = [
    signal.ticker ? `$${signal.ticker}` : '',
    signal.entity,
    signal.eventType,
    signal.direction,
    signal.label
  ].filter(Boolean);
  return values.length ? values.map((item) => escapeHtml(item)).join(' · ') : 'market signal';
}

function renderSignalMetrics(signal: MarketDashboardSignal): string {
  const entries = Object.entries(signal.metrics)
    .filter(([, value]) => value != null && String(value).trim())
    .slice(0, 4);
  if (!entries.length) return '';

  return `<div class="mini-metrics">
    ${entries
      .map(
        ([label, value]) =>
          `<span><b>${escapeHtml(value)}</b><small>${escapeHtml(formatMetricLabel(label))}</small></span>`
      )
      .join('')}
  </div>`;
}

function renderSignalChips(signal: MarketDashboardSignal): string {
  const chips = [
    signal.ticker ? `$${signal.ticker}` : '',
    signal.entity,
    signal.eventType,
    signal.direction,
    ...signal.tags
  ].filter(Boolean);
  if (!chips.length) return '';

  return `<div class="chips">${chips
    .slice(0, 7)
    .map((chip) => `<span class="chip">${escapeHtml(chip)}</span>`)
    .join('')}</div>`;
}

function renderNarrative(report: MarketDashboardReport, profile: RenderProfile): string {
  if (!report.narrativeBlocks.length) return '';

  return `<section class="section">
    <div class="section-head">
      <h2>${escapeHtml(profile.narrativeTitle)}</h2>
      <p>${escapeHtml(profile.narrativeDescription)}</p>
    </div>
    <div class="narrative-list">
      ${report.narrativeBlocks
        .map(
          (block, index) => `<article class="narrative-card">
            <span>${escapeHtml(`研究 ${index + 1}`)}</span>
            <p>${escapeHtml(block)}</p>
          </article>`
        )
        .join('')}
    </div>
  </section>`;
}

function renderSections(report: MarketDashboardReport, profile: RenderProfile): string {
  if (!report.sections.length) return '';
  return `<section class="section">
    <div class="section-head">
      <h2>${escapeHtml(profile.sectionsTitle)}</h2>
      <p>${escapeHtml(profile.sectionsDescription)}</p>
    </div>
    <div class="block-grid">
      ${report.sections
        .map(
          (section) => `<article class="data-block">
            <div class="data-block-head">
              <h3>${escapeHtml(section.title)}</h3>
              ${section.subtitle ? `<p>${escapeHtml(section.subtitle)}</p>` : ''}
            </div>
            <div class="metrics metrics--block">
              ${section.items
                .slice(0, 10)
                .map(
                  (item) => `<div class="metric metric--${escapeAttr(item.tone || 'neutral')}">
                    <b>${escapeHtml(item.value ?? '—')}</b>
                    <span>${escapeHtml(item.label)}${item.note ? ` · ${escapeHtml(item.note)}` : ''}</span>
                  </div>`
                )
                .join('')}
            </div>
          </article>`
        )
        .join('')}
    </div>
  </section>`;
}

function renderEvidence(report: MarketDashboardReport, profile: RenderProfile): string {
  const rows = [
    ...report.sources,
    ...report.signals.flatMap((signal) =>
      signal.evidence.map((item) => ({
        ...item,
        signalTitle: signal.title
      }))
    )
  ].slice(0, 24);

  if (!rows.length) {
    return `<section class="section">
      <div class="section-head"><h2>${escapeHtml(profile.evidenceTitle)}</h2><p>No source evidence was provided.</p></div>
      <div class="empty">缺少来源证据。正式报告必须由上游插件保留 sourceName、url、confidence 和 delayLabel。</div>
    </section>`;
  }

  return `<section class="section">
    <div class="section-head">
      <h2>${escapeHtml(profile.evidenceTitle)}</h2>
      <p>${escapeHtml(profile.evidenceDescription)}</p>
    </div>
    <table class="evidence-table">
      <thead><tr><th>线索</th><th>来源</th><th>类型</th><th>置信度</th><th>延迟</th></tr></thead>
      <tbody>
        ${rows
          .map((row: any) => {
            const url = safeHttpUrl(row.url);
            const source = url
              ? `<a href="${escapeAttr(url)}" target="_blank" rel="noreferrer">${escapeHtml(row.sourceName)}</a>`
              : escapeHtml(row.sourceName);
            return `<tr>
              <td>${escapeHtml(row.signalTitle || report.title)}</td>
              <td>${source}</td>
              <td>${escapeHtml(row.sourceType || 'source')}</td>
              <td>${escapeHtml(row.confidence ?? '—')}</td>
              <td>${escapeHtml(row.delayLabel || row.publishedAt || 'unknown')}</td>
            </tr>`;
          })
          .join('')}
      </tbody>
    </table>
  </section>`;
}

function renderDataGaps(report: MarketDashboardReport): string {
  if (!report.dataGaps.length) return '';
  return `<div class="gap-list">${report.dataGaps
    .slice(0, 6)
    .map((gap) => `<span>${escapeHtml(gap)}</span>`)
    .join('')}</div>`;
}

function getRenderProfile(report: MarketDashboardReport): RenderProfile {
  if (isMonitoringReport(report)) return monitoringProfile;

  const profiles: Record<MarketDashboardType, RenderProfile> = {
    market_opportunity: {
      masthead: 'Opportunity Desk',
      eyebrow: '发现机会 · 扫描结果',
      sideTitle: '入选逻辑',
      sideDescription:
        '按异动幅度、证据质量、市场影响和用户相关性收敛候选，不把线索包装成买卖建议。',
      statLabels: ['入选线索', '最高分', '平均分', '证据点'],
      signalTitle: '机会候选池',
      signalDescription: '多线索扫描结果按优先级展示；信号越多时自动压缩为可快速扫读的候选池。',
      emptySignalText:
        '没有结构化机会线索。请让上游扫描插件输出 opportunities、signals 或 events。',
      narrativeTitle: '补充研究',
      narrativeDescription: '保留上游研究正文，但机会列表仍以结构化候选和证据为准。',
      sectionsTitle: '扫描分布',
      sectionsDescription: '展示扫描方式、主题簇、风险簇或候选来源分布。',
      evidenceTitle: '证据账本',
      evidenceDescription: '保留来源、延迟和置信度，便于回看为什么进入机会列表。',
      signalMode: 'opportunity',
      bodyOrder: ['signals', 'sections', 'narrative', 'evidence']
    },
    smart_money: {
      masthead: 'Smart Money Desk',
      eyebrow: '资金线索 · 披露边界',
      sideTitle: '解释边界',
      sideDescription:
        '期权、暗池、13F、内部人和国会披露只能说明异常活动或历史披露，不能证明确定性方向。',
      statLabels: ['资金线索', '最高关注', '平均关注', '证据点'],
      signalTitle: '资金线索分层',
      signalDescription: '把期权、暗池、ETF、13F、内部人等信号分层展示，并显式保留延迟和限制。',
      emptySignalText: '没有结构化资金线索。请上游输出 flowSignals、signals、alerts 或 events。',
      narrativeTitle: '资金解释',
      narrativeDescription: '用于承载资金异动的补充解释，不能替代原始成交、披露或来源字段。',
      sectionsTitle: '资金分布',
      sectionsDescription: '展示溢价、披露延迟、流向分层、来源覆盖或风险限制。',
      evidenceTitle: '资金来源账本',
      evidenceDescription: '资金类信号必须能追溯到供应商、SEC、披露或交易数据来源。',
      signalMode: 'flow',
      bodyOrder: ['sections', 'signals', 'evidence', 'narrative']
    },
    ticker_event: {
      masthead: 'Ticker Review',
      eyebrow: '股票深度 · 事件复盘',
      sideTitle: '复盘口径',
      sideDescription:
        '围绕单个标的拆解行情、财报、SEC、新闻和资金事件，区分事实、解释和待核验项。',
      statLabels: ['事件线索', '最高优先级', '平均优先级', '证据点'],
      signalTitle: '事件流',
      signalDescription: '按优先级组织股票相关事件；适合承载深度分析、监控告警和盘后复盘。',
      emptySignalText:
        '没有结构化事件线索。请上游输出 events、alerts、watchlistAlerts 或 signals。',
      narrativeTitle: '深度分析正文',
      narrativeDescription: '用于承载股票深度研究正文；结构化事件和证据仍决定复盘可信度。',
      sectionsTitle: '关键拆解',
      sectionsDescription: '展示财报差异、价格/成交量、SEC、新闻或资金维度的结构化拆解。',
      evidenceTitle: '事件证据账本',
      evidenceDescription: '股票复盘的高影响判断必须能回到公告、SEC、行情、新闻或数据供应商。',
      signalMode: 'timeline',
      bodyOrder: ['signals', 'sections', 'narrative', 'evidence']
    },
    theme_industry: {
      masthead: 'Industry Map',
      eyebrow: '主题产业 · 深度分析',
      sideTitle: '产业映射',
      sideDescription:
        '把主题热度拆成受益公司、供应商、客户、竞争者和风险暴露，不把关键词命中当成确定关系。',
      statLabels: ['暴露线索', '最高暴露', '平均强度', '证据点'],
      signalTitle: '产业关系与公司暴露',
      signalDescription: '展示主题/产业链中的公司暴露、受益路径、风险路径和仍需核验的连接。',
      emptySignalText:
        '没有结构化产业暴露。请上游输出 exposures、signals、findings 或 mapped companies。',
      narrativeTitle: '主题研究正文',
      narrativeDescription: '承载产业逻辑、供需链条和关键假设；公司暴露仍应由证据支撑。',
      sectionsTitle: '产业地图模块',
      sectionsDescription: '展示受益公司、供应链、客户、竞争、监管或风险暴露分层。',
      evidenceTitle: '产业证据账本',
      evidenceDescription: '主题关系必须保留公司披露、新闻、SEC、数据供应商或 X 公开来源。',
      signalMode: 'exposure',
      bodyOrder: ['sections', 'signals', 'narrative', 'evidence']
    },
    people_institution: {
      masthead: 'Actor Dossier',
      eyebrow: '人物机构 · 动作分解',
      sideTitle: '边界拆分',
      sideDescription:
        '分开公开发声、披露交易、机构持仓和股票桥接，不把观点、持仓和交易混成一个事实。',
      statLabels: ['动作线索', '最高优先级', '平均优先级', '证据点'],
      signalTitle: '人物机构动作分解',
      signalDescription: '按动作、披露和可验证股票桥接展示人物/机构信号，保留延迟和来源边界。',
      emptySignalText:
        '没有结构化人物机构动作。请上游输出 alerts、findings、signals 或 people/institution events。',
      narrativeTitle: '档案正文',
      narrativeDescription: '用于承载人物/机构背景和上下文；实际判断仍要分开披露、发声和推断关系。',
      sectionsTitle: '档案模块',
      sectionsDescription: '展示公开发声、披露、关联股票、机构动作和待核验来源。',
      evidenceTitle: '档案证据账本',
      evidenceDescription: '人物机构分析必须保留 X、SEC、新闻、年会、采访或官方材料来源。',
      signalMode: 'actor',
      bodyOrder: ['signals', 'sections', 'narrative', 'evidence']
    }
  };

  return profiles[report.reportType];
}

const monitoringProfile: RenderProfile = {
  masthead: 'Monitoring History',
  eyebrow: '监控历史 · 复盘记录',
  sideTitle: '监控口径',
  sideDescription:
    '把日报、监控告警和深度复盘按事件流沉淀，突出发生了什么、为什么重要、下一步核验。',
  statLabels: ['监控事件', '最高优先级', '平均优先级', '证据点'],
  signalTitle: '监控事件流',
  signalDescription: '来自日报、告警或复盘的事件按优先级排列；重复噪声应由上游去重。',
  emptySignalText:
    '没有结构化监控事件。请上游输出 alerts、monitorAlerts、watchlistAlerts 或 events。',
  narrativeTitle: '监控复盘正文',
  narrativeDescription: '保留日报/复盘正文，但监控历史仍应沉淀结构化事件和来源。',
  sectionsTitle: '监控汇总',
  sectionsDescription: '展示 watchlist、触发原因、频率、数据源覆盖或缺失项。',
  evidenceTitle: '监控证据账本',
  evidenceDescription: '监控历史需要能回溯触发来源、延迟和置信度。',
  signalMode: 'timeline',
  bodyOrder: ['signals', 'sections', 'narrative', 'evidence']
};

function isMonitoringReport(report: MarketDashboardReport): boolean {
  if (report.reportType === 'market_opportunity') return false;
  const text = [report.title, report.subtitle, report.summary, report.preparedFor]
    .join(' ')
    .toLowerCase();
  return /监控|告警|日报|周报|watchlist|monitor|alert|daily brief|weekly brief/.test(text);
}

function padRank(index: number): string {
  return String(index + 1).padStart(2, '0');
}

function formatMetricLabel(value: string): string {
  return value.replace(/_/g, ' ').replace(/\b\w/g, (letter) => letter.toUpperCase());
}
