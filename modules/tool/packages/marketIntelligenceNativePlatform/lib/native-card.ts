import { z } from 'zod';

export const MARKET_NATIVE_CARD_OUTPUT_KEY = 'app_card';
export const MARKET_MONITOR_EVENT_COMPONENT = 'MarketMonitorEventCard';
export const MARKET_DAILY_REPORT_COMPONENT = 'MarketDailyReportCard';
export const MARKET_DISCOVERY_BOARD_COMPONENT = 'MarketDiscoveryBoardCard';
export const MARKET_DEEP_ANALYSIS_COMPONENT = 'MarketDeepAnalysisCard';
export const MARKET_RADAR_DASHBOARD_COMPONENT = 'MarketRadarDashboardCard';

export const optionalJsonInput = z
  .union([z.string(), z.record(z.string(), z.any()), z.array(z.any())])
  .optional()
  .default('');

export const textInput = () => z.string().optional().default('');

export function parseJsonValue(value: unknown, fallback: unknown) {
  if (value === undefined || value === null || value === '') return fallback;
  if (typeof value !== 'string') return value;
  try {
    return JSON.parse(value);
  } catch {
    return fallback;
  }
}

export function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

export function asArray(value: unknown): unknown[] {
  const parsed = parseJsonValue(value, value);
  if (Array.isArray(parsed)) return parsed;
  const record = asRecord(parsed);
  for (const key of [
    'items',
    'data',
    'results',
    'signals',
    'events',
    'blocks',
    'aiBlocks',
    'ai_blocks',
    'contentSections',
    'content_sections',
    'analysisSections',
    'analysis_sections',
    'sources'
  ]) {
    if (Array.isArray(record[key])) return record[key] as unknown[];
  }
  return [];
}

export function firstString(...values: unknown[]): string {
  for (const value of values) {
    if (typeof value === 'string' && value.trim()) return value.trim();
    if (typeof value === 'number' && Number.isFinite(value)) return String(value);
  }
  return '';
}

export function toNumber(value: unknown, fallback = 0): number {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string') {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) return parsed;
  }
  return fallback;
}

export function splitTags(value: unknown): string[] {
  if (Array.isArray(value)) return value.map((item) => String(item).trim()).filter(Boolean);
  return String(value || '')
    .split(/[,，;\s]+/)
    .map((item) => item.trim())
    .filter(Boolean);
}

function compactIdPart(value: string, fallback = 'none') {
  const text = value.trim();
  if (!text) return fallback;
  return text.replace(/[^A-Za-z0-9_.:-]+/g, '_').slice(0, 120);
}

export function buildCardId(parts: unknown[]) {
  return parts.map((part) => compactIdPart(String(part || ''))).join(':');
}

export function stringifyJson(value: unknown): string {
  return JSON.stringify(value);
}

export function normalizeTarget(value: unknown, fallbackType = 'ticker') {
  const record = asRecord(parseJsonValue(value, value));
  const targetType =
    firstString(record.targetType, record.target_type, record.type) || fallbackType;
  const targetKey = firstString(
    record.targetKey,
    record.target_key,
    record.symbol,
    record.ticker,
    record.id
  );
  const name =
    firstString(record.name, record.displayName, record.display_name, record.title) || targetKey;
  return {
    targetType,
    targetKey,
    name,
    symbol: firstString(record.symbol, record.ticker) || (targetType === 'ticker' ? targetKey : ''),
    metadata: asRecord(record.metadata)
  };
}

export function normalizeSources(value: unknown) {
  return asArray(value)
    .map((item, index) => {
      if (typeof item === 'string') {
        const text = item.trim();
        const url = /^https?:\/\//i.test(text) ? text : '';
        return {
          id: url || `source-${index + 1}`,
          title: url ? url : text || `来源 ${index + 1}`,
          url,
          publisher: url ? '引用链接' : '引用材料',
          publishedAt: '',
          type: '',
          snippet: text,
          quote: '',
          usedFor: ''
        };
      }
      const record = asRecord(item);
      return {
        id: firstString(record.id, record.url, record.link, `source-${index + 1}`),
        title: firstString(record.title, record.name, record.publisher) || `来源 ${index + 1}`,
        url: firstString(record.url, record.link, record.href, record.fileUrl, record.file_url),
        publisher: firstString(record.publisher, record.source),
        publishedAt: firstString(record.publishedAt, record.published_at, record.time),
        type: firstString(record.type, record.sourceType, record.source_type),
        snippet: firstString(
          record.snippet,
          record.summary,
          record.description,
          record.content,
          record.text
        ),
        quote: firstString(
          record.quote,
          record.citation,
          record.evidencePoint,
          record.evidence_point
        ),
        usedFor: firstString(record.usedFor, record.used_for, record.claim)
      };
    })
    .slice(0, 160);
}

export function normalizeAiBlocks(value: unknown, fallbackSummary = '') {
  const blocks = asArray(value)
    .map((item, index) => {
      if (typeof item === 'string') {
        return {
          id: `ai-block-${index + 1}`,
          type: 'text',
          title: '',
          content: item
        };
      }
      const record = asRecord(item);
      return {
        id: firstString(record.id, `ai-block-${index + 1}`),
        type: firstString(record.type, record.kind) || 'text',
        title: firstString(record.title, record.label),
        content: firstString(record.content, record.body, record.summary, record.text),
        items: Array.isArray(record.items) ? record.items : undefined,
        bullets: Array.isArray(record.bullets) ? record.bullets : undefined,
        points: Array.isArray(record.points) ? record.points : undefined,
        findings: Array.isArray(record.findings) ? record.findings : undefined,
        highlights: Array.isArray(record.highlights) ? record.highlights : undefined,
        sources: Array.isArray(record.sources) ? record.sources : undefined,
        citations: Array.isArray(record.citations) ? record.citations : undefined,
        references: Array.isArray(record.references) ? record.references : undefined
      };
    })
    .filter((block) => block.content || block.title || (block.items?.length || 0) > 0)
    .slice(0, 40);

  if (blocks.length > 0) return blocks;
  return fallbackSummary
    ? [{ id: 'ai-block-summary', type: 'summary', title: 'AI 判断', content: fallbackSummary }]
    : [];
}

function signalText(signal: Record<string, unknown>, ...keys: string[]) {
  return firstString(...keys.map((key) => signal[key]));
}

function signalSourceItems(signal: Record<string, unknown>) {
  return [
    ...asArray(signal.evidence),
    ...asArray(signal.sources),
    ...asArray(signal.citations),
    ...asArray(signal.references)
  ];
}

export function deriveSourcesFromSignals(signals: Record<string, unknown>[]) {
  const seen = new Set<string>();
  const sources: ReturnType<typeof normalizeSources> = [];

  signals.forEach((signal, signalIndex) => {
    signalSourceItems(signal).forEach((item, itemIndex) => {
      const normalized = normalizeSources([item])[0];
      if (!normalized) return;

      const title =
        normalized.title ||
        firstString(signal.title) ||
        `信号 ${signalIndex + 1} 来源 ${itemIndex + 1}`;
      const usedFor =
        normalized.usedFor ||
        firstString(signal.title, signal.eventType, signal.event_type) ||
        `信号 ${signalIndex + 1}`;
      const key = `${normalized.url || ''}|${title}|${normalized.snippet || normalized.quote || ''}`;
      if (seen.has(key)) return;
      seen.add(key);

      sources.push({
        ...normalized,
        id: firstString(normalized.id, `signal-${signalIndex + 1}-source-${itemIndex + 1}`),
        title,
        usedFor
      });
    });
  });

  return sources.slice(0, 160);
}

export function mergeSources(...groups: ReturnType<typeof normalizeSources>[]) {
  const seen = new Set<string>();
  return groups
    .flat()
    .filter((source, index) => {
      const key = `${source.url || ''}|${source.title}|${source.snippet || source.quote || ''}`;
      if (seen.has(key)) return false;
      seen.add(key);
      source.id = firstString(source.id, source.url, `source-${index + 1}`);
      return true;
    })
    .slice(0, 160);
}

export function buildSignalFallbackAiBlocks(signals: Record<string, unknown>[], scanMode?: string) {
  if (!signals.length) return [];

  const topSignals = signals.slice(0, 8);
  const categoryCounts = topSignals.reduce<Record<MarketSignalCategory, number>>(
    (acc, signal) => {
      const category = signalCategory(signal);
      acc[category] = (acc[category] ?? 0) + 1;
      return acc;
    },
    { opportunity: 0, risk: 0, watch: 0 }
  );
  const impactedTickers = Array.from(
    new Set(
      topSignals.flatMap((signal) =>
        splitTags(signal.impactedTickers ?? signal.impacted_tickers ?? signal.symbols)
      )
    )
  ).slice(0, 8);
  const opportunityItems = topSignals
    .filter((signal) => signalCategory(signal) === 'opportunity')
    .map((signal) => ({
      title: firstString(signal.title),
      content:
        signalText(signal, 'whyItMatters', 'why_it_matters', 'summary') ||
        signalText(signal, 'nextVerification', 'next_verification')
    }))
    .filter((item) => item.title || item.content);
  const riskItems = topSignals
    .filter((signal) => signalCategory(signal) === 'risk')
    .map((signal) => ({
      title: firstString(signal.title),
      content:
        signalText(signal, 'delayOrLimitation', 'delay_or_limitation', 'summary') ||
        signalText(signal, 'whyItMatters', 'why_it_matters')
    }))
    .filter((item) => item.title || item.content);
  const verificationItems = topSignals
    .map((signal) => ({
      title: firstString(signal.title),
      content:
        signalText(signal, 'nextVerification', 'next_verification') ||
        signalText(signal, 'delayOrLimitation', 'delay_or_limitation')
    }))
    .filter((item) => item.title || item.content);
  const blocks = [
    {
      id: 'ai-block-signal-synthesis',
      type: 'summary',
      title: 'AI 综合判断',
      content: `本轮 ${scanMode || '发现机会'} 扫描共识别 ${signals.length} 条重点信号，其中机会 ${categoryCounts.opportunity} 条、风险 ${categoryCounts.risk} 条、观察 ${categoryCounts.watch} 条。整体重点应放在信号是否能被价格、披露、新闻原文和后续事件继续确认，而不是把注意力或延迟披露直接当成确定性方向。${impactedTickers.length ? `影响标的主要集中在 ${impactedTickers.join('、')}。` : ''}`,
      items: []
    },
    topSignals.length
      ? {
          id: 'ai-block-opportunity-path',
          type: 'opportunity',
          title: '机会路径',
          content: opportunityItems.length
            ? `机会侧共有 ${opportunityItems.length} 条线索，重点看后续是否出现价格确认、成交量延续、公司公告或财报口径承接。`
            : '机会侧暂未形成明确单向结论，重点看后续是否出现价格确认、成交量延续、公司公告或财报口径承接。',
          items: []
        }
      : null,
    topSignals.length
      ? {
          id: 'ai-block-risk-counter',
          type: 'risk',
          title: '风险与反证',
          content: riskItems.length
            ? `风险侧共有 ${riskItems.length} 条线索，主要约束来自披露滞后、单一来源、叙事拥挤、对冲需求或缺少基本面确认。`
            : '风险侧暂未形成明确单向结论，但仍需要检查披露滞后、单一来源、叙事拥挤、对冲需求或缺少基本面确认等反证。',
          items: []
        }
      : null,
    verificationItems.length
      ? {
          id: 'ai-block-next-verification',
          type: 'scenario',
          title: '下一步验证',
          content: `优先补原始文件、权威新闻正文、行情确认和二阶影响链路；有 ${verificationItems.length} 条信号需要继续追踪验证点。`,
          items: []
        }
      : null
  ].filter(Boolean);

  return blocks;
}

export function normalizeSignals(value: unknown) {
  return asArray(value)
    .map((item, index) => {
      const record = asRecord(item);
      const target = normalizeTarget(
        record.target || record,
        firstString(record.targetType) || 'ticker'
      );
      const eventType = firstString(record.eventType, record.event_type, record.type);
      const impactedTickers = splitTags(
        record.impactedTickers ?? record.impacted_tickers ?? record.symbols
      );
      const importanceScore = Math.max(
        0,
        Math.min(100, toNumber(record.importanceScore ?? record.score, 50))
      );
      return {
        ...record,
        id: firstString(record.id, record.eventId, `signal-${index + 1}`),
        title: firstString(record.title, record.name) || target.name || `信号 ${index + 1}`,
        summary: firstString(record.summary, record.description, record.reason),
        eventType,
        target,
        impactedTickers,
        importanceScore,
        eventTime: firstString(record.eventTime, record.event_time, record.time),
        metrics: asRecord(record.metrics),
        whyItMatters: firstString(
          record.whyItMatters,
          record.why_it_matters,
          record.marketImplication,
          record.market_implication
        ),
        confidence: firstString(record.confidence, record.confidenceLabel, record.confidence_label),
        delayOrLimitation: firstString(
          record.delayOrLimitation,
          record.delay_or_limitation,
          record.limitation,
          asRecord(record.compliance).limitation
        ),
        nextVerification: firstString(
          record.nextVerification,
          record.next_verification,
          record.nextCheck,
          record.next_check
        )
      };
    })
    .slice(0, 50);
}

function aiBlockItems(block: Record<string, unknown>) {
  return [
    ...asArray(block.items),
    ...asArray(block.bullets),
    ...asArray(block.points),
    ...asArray(block.findings),
    ...asArray(block.highlights)
  ];
}

function compactSignalSummary(text: string) {
  return text.replace(/\s+/g, ' ').trim().slice(0, 420);
}

function inferSignalCategoryFromText(text: string): MarketSignalCategory {
  const normalized = text.toLowerCase();
  if (/风险|反方|限制|监管|调查|诉讼|bear|risk|negative|downside|sell|reduce/.test(normalized)) {
    return 'risk';
  }
  if (
    /机会|受益|利好|上行|突破|扩张|订单|bull|opportun|positive|upside|increase/.test(normalized)
  ) {
    return 'opportunity';
  }
  return 'watch';
}

function extractTickersFromText(text: string) {
  const tickers = new Set<string>();
  const explicit = text.match(/\b[A-Z]{2,6}\b/g) || [];
  for (const token of explicit) {
    if (
      [
        'AI',
        'CEO',
        'SEC',
        'FTC',
        'DOE',
        'DOJ',
        'ETF',
        'EPS',
        'IR',
        'X',
        'US',
        'USA',
        'API',
        'URL',
        'RSS'
      ].includes(token)
    ) {
      continue;
    }
    tickers.add(token);
  }
  return Array.from(tickers).slice(0, 8);
}

function extractSignalRank(text: string, fallback: number) {
  const match =
    text.match(/(?:Top\s*)?(?:信号|signal)\s*#?\s*(\d{1,2})/i) ||
    text.match(/^(\d{1,2})[）).、\s]/);
  const rank = match?.[1] ? Number(match[1]) : fallback;
  return Number.isFinite(rank) && rank > 0 ? rank : fallback;
}

function cleanDerivedSignalTitle(title: string, fallback: string) {
  const text = firstString(title)
    .replace(/^(?:Top\s*)?(?:信号|signal)\s*#?\s*\d{1,2}\s*[：:.\-—、]?\s*/i, '')
    .replace(/^\d{1,2}[）).、\s-]+/, '')
    .trim();
  return text || fallback;
}

export function deriveSignalsFromAiBlocks(aiBlocks: Record<string, unknown>[], scanMode: string) {
  const candidates = aiBlocks
    .map((block, index) => {
      const title = firstString(block.title, block.label);
      const content = firstString(block.content, block.body, block.summary, block.text);
      const items = aiBlockItems(block)
        .map((item) =>
          firstString(
            typeof item === 'string' ? item : asRecord(item).title,
            asRecord(item).content,
            asRecord(item).summary,
            asRecord(item).text
          )
        )
        .filter(Boolean);
      const haystack = [title, content, ...items].join('\n');
      const looksLikeSignal =
        /(?:Top\s*)?(?:信号|signal)\s*#?\s*\d{0,2}/i.test(title) ||
        /事件类型|影响标的|相关标的|市场含义|置信度|下一步|为什么重要|机会路径|风险路径/.test(
          haystack
        );
      if (!looksLikeSignal) return null;
      const rank = extractSignalRank(title, index + 1);
      const signalTitle = cleanDerivedSignalTitle(title, `重点信号 ${rank}`);
      const summary = compactSignalSummary(content || items.join('；'));
      const tickers = extractTickersFromText(haystack);
      return {
        id: `derived-signal-${rank}`,
        title: signalTitle,
        summary,
        eventType: scanMode,
        target: normalizeTarget(
          tickers[0]
            ? { targetType: 'ticker', targetKey: tickers[0], name: tickers[0], symbol: tickers[0] }
            : { targetType: 'theme', targetKey: scanMode, name: signalTitle },
          tickers[0] ? 'ticker' : 'theme'
        ),
        impactedTickers: tickers,
        importanceScore: Math.max(55, 88 - index * 4),
        category: inferSignalCategoryFromText(haystack),
        whyItMatters: compactSignalSummary(content),
        confidence: firstString(
          haystack.match(/置信度[：:]\s*([^\n；。]+)/)?.[1],
          haystack.match(/confidence[：:]\s*([^\n;\\.]+)/i)?.[1]
        ),
        nextVerification: firstString(
          haystack.match(/下一步(?:验证)?[：:]\s*([^\n]+)/)?.[1],
          haystack.match(/next verification[：:]\s*([^\n]+)/i)?.[1]
        )
      };
    })
    .filter(Boolean) as Record<string, unknown>[];

  const seen = new Set<string>();
  return candidates
    .filter((signal) => {
      const key = firstString(signal.title).toLowerCase();
      if (!key || seen.has(key)) return false;
      seen.add(key);
      return true;
    })
    .slice(0, 10);
}

export const MARKET_DISCOVERY_TYPES = [
  'price_move',
  'earnings',
  'insider',
  'famous_institution_trade',
  'capital_flow',
  'policy_news_catalyst',
  'sentiment_theme_heat',
  'theme_industry_heat'
] as const;

export type MarketDiscoveryType = (typeof MARKET_DISCOVERY_TYPES)[number];

type MarketSignalCategory = 'opportunity' | 'risk' | 'watch';
type MarketContentTone =
  | 'summary'
  | 'opportunity'
  | 'risk'
  | 'scenario'
  | 'evidence'
  | 'gap'
  | 'neutral';

const discoveryProfiles: Record<
  MarketDiscoveryType,
  {
    key: MarketDiscoveryType;
    label: string;
    shortLabel: string;
    icon: string;
    signalNoun: string;
    primaryLens: string;
    secondLens: string;
    thirdLens: string;
    coverSubtitle: string;
    bridgeTitle: string;
    verificationTitle: string;
    emptyEvidence: string;
    emptyVerification: string;
  }
> = {
  price_move: {
    key: 'price_move',
    label: '异动雷达',
    shortLabel: '异动',
    icon: 'radar',
    signalNoun: '异动',
    primaryLens: '价格/成交量',
    secondLens: '相对强弱',
    thirdLens: '催化解释',
    coverSubtitle: '价格、成交量、相对强弱和技术位置的确认页',
    bridgeTitle: '行情到基本面桥梁',
    verificationTitle: '下一步行情验证',
    emptyEvidence: '需要行情、成交量、相对指数/行业表现和新闻来源确认。',
    emptyVerification: '检查涨跌幅、成交量倍数、相对 QQQ/行业指数表现和是否突破关键位置。'
  },
  earnings: {
    key: 'earnings',
    label: '财报指引',
    shortLabel: '财报',
    icon: 'calendar',
    signalNoun: '财报',
    primaryLens: '预期差',
    secondLens: '指引变化',
    thirdLens: '盘面反应',
    coverSubtitle: 'EPS、收入、利润率、指引和盘后反应的事件页',
    bridgeTitle: '业绩到估值桥梁',
    verificationTitle: '下一步财报验证',
    emptyEvidence: '需要 actual/consensus、指引、分部、管理层口径和盘面反应。',
    emptyVerification: '核对 EPS、Revenue、Margin、Guidance、Backlog、Capex 和电话会管理层语气。'
  },
  insider: {
    key: 'insider',
    label: '内部人交易',
    shortLabel: '内部人',
    icon: 'users',
    signalNoun: '交易',
    primaryLens: '角色/方向',
    secondLens: '金额/比例',
    thirdLens: '计划交易',
    coverSubtitle: 'Form 4、角色、方向、金额、10b5-1 和集群交易的解释页',
    bridgeTitle: '内部人行为桥梁',
    verificationTitle: '下一步 Form 4 验证',
    emptyEvidence: '需要交易人角色、买卖方向、金额、持股变化、10b5-1 标记和披露时间。',
    emptyVerification: '核对 Form 4 原文、交易代码、是否 open-market、是否 10b5-1、金额占持股比例。'
  },
  famous_institution_trade: {
    key: 'famous_institution_trade',
    label: '名人机构动向',
    shortLabel: '名人机构',
    icon: 'building',
    signalNoun: '动向',
    primaryLens: '主体/事件',
    secondLens: '持仓/观点变化',
    thirdLens: '披露滞后',
    coverSubtitle: '巴菲特、国会交易、明星基金、13F/13D/G、公开讲话和组合变化的聪明钱页',
    bridgeTitle: '名人机构到股票桥梁',
    verificationTitle: '披露与公开信号验证',
    emptyEvidence:
      '需要主体、披露/发言/调仓来源、季度或披露日、方向、金额区间、组合占比或公开观点。',
    emptyVerification:
      '核对 13F/13D/G、Form 4、国会披露、基金公开持仓、访谈/X/公开信号，并标明披露滞后。'
  },
  capital_flow: {
    key: 'capital_flow',
    label: '资金流向',
    shortLabel: '资金',
    icon: 'chart',
    signalNoun: '资金',
    primaryLens: '规模/分母',
    secondLens: '方向/结构',
    thirdLens: '替代解释',
    coverSubtitle: '期权、暗池、ETF/基金流和大额交易的证据权重页',
    bridgeTitle: '资金到行情桥梁',
    verificationTitle: '下一步资金验证',
    emptyEvidence: '需要来源类型、时间、金额、premium/notional、OI/ADV/float 分母和标的同步表现。',
    emptyVerification:
      '核对期权合约、premium、expiry、OI、暗池时间/场所、ETF flow 和标的价格成交量。'
  },
  policy_news_catalyst: {
    key: 'policy_news_catalyst',
    label: '新闻政策催化',
    shortLabel: '催化',
    icon: 'news',
    signalNoun: '催化',
    primaryLens: '事件来源',
    secondLens: '政策/业务路径',
    thirdLens: '影响范围',
    coverSubtitle: '宏观政策、监管、订单、产品、诉讼、M&A 和新闻事件的催化页',
    bridgeTitle: '事件到股票桥梁',
    verificationTitle: '下一步催化验证',
    emptyEvidence: '需要原始公告、监管/法院/公司来源、权威媒体、发布时间和重复报道聚类。',
    emptyVerification:
      '追原始公告或权威报道，核对是否影响收入、利润率、监管、竞争格局、供应链或估值叙事。'
  },
  sentiment_theme_heat: {
    key: 'sentiment_theme_heat',
    label: '媒体社区热度',
    shortLabel: '社区',
    icon: 'target',
    signalNoun: '热度',
    primaryLens: '热度变化',
    secondLens: '股票桥梁',
    thirdLens: '来源质量',
    coverSubtitle: 'X、Reddit、Stocktwits、Google Trends、新闻速度和社区讨论到股票桥梁的热度页',
    bridgeTitle: '媒体社区到股票桥梁',
    verificationTitle: '下一步热度验证',
    emptyEvidence:
      '需要来源身份、账号/媒体/社区可信度、主题词、互动基线、新闻速度、搜索热度和上市公司映射。',
    emptyVerification:
      '核对 X、Reddit/WSB、Stocktwits、Google Trends、Google News 与权威媒体，再用行情和公司事实验证 ticker bridge。'
  },
  theme_industry_heat: {
    key: 'theme_industry_heat',
    label: '主题产业热度',
    shortLabel: '主题',
    icon: 'sparkles',
    signalNoun: '主题',
    primaryLens: '主题热度',
    secondLens: '公司映射',
    thirdLens: '产业催化',
    coverSubtitle: 'AI Agents、半导体、核能、机器人等主题热度、公司映射和产业链变化的产业页',
    bridgeTitle: '主题产业到股票桥梁',
    verificationTitle: '主题产业验证',
    emptyEvidence:
      '需要主题词、产业链位置、相关 ticker/ETF、新闻速度、资金或订单催化和公司映射逻辑。',
    emptyVerification:
      '核对主题新闻、Google Trends、行业 ETF、供应链/客户关系、公司公告和相关标的行情，不把热度直接等同于投资机会。'
  }
};

function normalizeKey(value: unknown) {
  return String(value || '')
    .trim()
    .toLowerCase()
    .replace(/[\s-]+/g, '_');
}

export function normalizeDiscoveryType(scanMode: unknown) {
  const key = normalizeKey(scanMode);
  if (MARKET_DISCOVERY_TYPES.includes(key as MarketDiscoveryType)) {
    return key as MarketDiscoveryType;
  }
  throw new Error(
    `Unsupported scan_mode "${String(scanMode || '')}". Use one of: ${MARKET_DISCOVERY_TYPES.join(', ')}`
  );
}

function signalCategory(signal: Record<string, unknown>): MarketSignalCategory {
  const explicit = normalizeKey(
    firstString(signal.stance, signal.category, signal.signalCategory, signal.signal_category)
  );
  if (['opportunity', 'bullish', 'positive', 'upside', '机会', '利好'].includes(explicit))
    return 'opportunity';
  if (['risk', 'bearish', 'negative', 'downside', '风险', '利空'].includes(explicit)) return 'risk';
  if (['watch', 'neutral', 'observe', '观察', '中性'].includes(explicit)) return 'watch';
  const text =
    `${firstString(signal.eventType, signal.event_type, signal.type)} ${firstString(signal.title)} ${firstString(signal.summary, signal.description, signal.reason)}`.toLowerCase();
  if (/risk|bear|downside|negative|sell|reduce|回撤|风险|利空|减持|卖出/.test(text)) return 'risk';
  if (
    /opportun|bull|upside|positive|buy|increase|breakout|机会|利好|突破|买入|增持|新进/.test(text)
  )
    return 'opportunity';
  return 'watch';
}

function contentTone(value: unknown): MarketContentTone {
  const record = asRecord(value);
  const explicitText = [
    firstString(record.type, record.kind),
    firstString(record.title, record.label)
  ]
    .join(' ')
    .toLowerCase();
  if (/risk|bear|downside|negative|风险|利空|回撤|下行|反证/.test(explicitText)) return 'risk';
  if (/opportun|bull|upside|positive|机会|利好|上行/.test(explicitText)) return 'opportunity';
  if (/scenario|path|推演|情景|路径/.test(explicitText)) return 'scenario';
  if (/evidence|source|证据|来源/.test(explicitText)) return 'evidence';
  if (/gap|limit|missing|缺口|限制|不足/.test(explicitText)) return 'gap';
  if (/summary|conclusion|结论|摘要|判断|复盘/.test(explicitText)) return 'summary';

  const text = [
    firstString(record.type, record.kind),
    firstString(record.title, record.label),
    firstString(record.content, record.body, record.summary, record.text)
  ]
    .join(' ')
    .toLowerCase();
  if (/risk|bear|downside|negative|风险|利空|回撤|下行/.test(text)) return 'risk';
  if (/opportun|bull|upside|positive|机会|利好|上行/.test(text)) return 'opportunity';
  if (/scenario|path|推演|情景|路径/.test(text)) return 'scenario';
  if (/evidence|source|证据|来源/.test(text)) return 'evidence';
  if (/gap|limit|missing|缺口|限制|不足/.test(text)) return 'gap';
  if (/summary|conclusion|结论|摘要|判断|复盘/.test(text)) return 'summary';
  return 'neutral';
}

function isDuplicateSignalNarrativeBlock(block: unknown) {
  const record = asRecord(block);
  const title = firstString(record.title, record.label);
  const type = firstString(record.type, record.kind);
  const text = `${type} ${title}`.toLowerCase();

  return (
    /signal[_ -]?analysis|ranked[_ -]?signals|key\s*signals|top\s*(?:\d+\s*)?signals?/.test(text) ||
    /(?:top\s*)?信号\s*\d*|重点信号|重要信号|信号清单|信号列表/.test(text)
  );
}

function filterNarrativeAiBlocks(aiBlocks: unknown[], hasStructuredSignals: boolean) {
  if (!hasStructuredSignals) return aiBlocks;

  return aiBlocks.filter((block) => !isDuplicateSignalNarrativeBlock(block));
}

export function buildContentSections(aiBlocks: unknown[], hasStructuredSignals = false) {
  return aiBlocks
    .filter((block) => !isDuplicateSignalNarrativeBlock(block) || !hasStructuredSignals)
    .map((block, index) => {
      const record = asRecord(block);
      const title = firstString(record.title, record.label) || `分析 ${index + 1}`;
      const content = firstString(record.content, record.body, record.summary, record.text);
      const items = [
        ...(Array.isArray(record.items) ? record.items : []),
        ...(Array.isArray(record.bullets) ? record.bullets : []),
        ...(Array.isArray(record.points) ? record.points : []),
        ...(Array.isArray(record.findings) ? record.findings : []),
        ...(Array.isArray(record.highlights) ? record.highlights : [])
      ];
      const tone = contentTone(record);
      return {
        id: firstString(record.id, `analysis-${index + 1}`),
        title,
        tone,
        content,
        items,
        type: firstString(record.type, record.kind) || tone,
        order: toNumber(record.order, index + 1)
      };
    })
    .filter((section) => section.title || section.content || section.items.length > 0)
    .sort((a, b) => a.order - b.order)
    .slice(0, 40);
}

export function buildOverviewBlocks(sections: ReturnType<typeof buildContentSections>) {
  const priority = ['summary', 'opportunity', 'risk', 'scenario'];
  const selected = [
    ...priority.map((tone) => sections.find((section) => section.tone === tone)).filter(Boolean),
    ...sections.filter(
      (section) =>
        !['summary', 'opportunity', 'risk', 'scenario', 'gap', 'evidence'].includes(section.tone)
    )
  ].slice(0, 4);
  return selected
    .map((section) => ({
      type: section!.tone,
      title: section!.title,
      content: section!.content,
      items: section!.items
    }))
    .filter((block) => firstString(block.content) || block.items.length > 0);
}

function metricLabel(key: string) {
  const normalized = normalizeKey(key);
  const labels: Record<string, string> = {
    changepercent: '涨跌幅',
    change_percent: '涨跌幅',
    price: '价格',
    volume: '成交量',
    avgvolume: '均量',
    avg_volume: '均量',
    volumeratio: '量比',
    volume_ratio: '量比',
    revenue: '收入',
    eps: 'EPS',
    guidance: '指引',
    premium: '权利金',
    notional: '名义金额',
    marketcap: '市值',
    market_cap: '市值',
    positionvalue: '仓位市值',
    position_value: '仓位市值',
    mentiondelta: '提及变化',
    mention_delta: '提及变化',
    sentiment: '情绪'
  };
  return labels[normalized] || key;
}

function formatMetricValue(value: unknown) {
  if (typeof value === 'number' && Number.isFinite(value)) {
    if (Math.abs(value) >= 1_000_000_000) return `${(value / 1_000_000_000).toFixed(1)}B`;
    if (Math.abs(value) >= 1_000_000) return `${(value / 1_000_000).toFixed(1)}M`;
    if (Math.abs(value) > 0 && Math.abs(value) < 1) return value.toFixed(2);
    return Number.isInteger(value) ? String(value) : value.toFixed(2);
  }
  return firstString(value);
}

function buildMetricChips(value: unknown) {
  const metrics = asRecord(value);
  return Object.entries(metrics)
    .map(([key, metricValue]) => {
      const label = metricLabel(key);
      const formatted = formatMetricValue(metricValue);
      return formatted ? { label, value: formatted, key } : null;
    })
    .filter(Boolean)
    .slice(0, 8);
}

function buildTickerStats(signals: Record<string, unknown>[]) {
  const map = new Map<
    string,
    {
      ticker: string;
      count: number;
      opportunity: number;
      risk: number;
      watch: number;
      maxScore: number;
    }
  >();
  for (const signal of signals) {
    const target = asRecord(signal.target);
    const tickers = splitTags(signal.impactedTickers ?? signal.impacted_tickers ?? signal.symbols);
    const targetTicker = firstString(target.symbol, target.ticker, signal.symbol, signal.ticker);
    if (targetTicker) tickers.push(targetTicker);
    const category = signalCategory(signal);
    const score = toNumber(signal.importanceScore ?? signal.importance_score ?? signal.score, 50);
    for (const ticker of Array.from(new Set(tickers))) {
      const current = map.get(ticker) || {
        ticker,
        count: 0,
        opportunity: 0,
        risk: 0,
        watch: 0,
        maxScore: 0
      };
      current.count += 1;
      current[category] += 1;
      current.maxScore = Math.max(current.maxScore, Math.max(0, Math.min(100, score)));
      map.set(ticker, current);
    }
  }
  return Array.from(map.values())
    .sort(
      (a, b) => b.count - a.count || b.maxScore - a.maxScore || a.ticker.localeCompare(b.ticker)
    )
    .slice(0, 12);
}

function compactDataGap(value: unknown, index: number) {
  if (typeof value === 'string')
    return { id: `gap-${index + 1}`, title: value, severity: 'medium' };
  const record = asRecord(value);
  return {
    id: firstString(record.id, `gap-${index + 1}`),
    title:
      firstString(record.title, record.name, record.summary, record.description) ||
      `数据缺口 ${index + 1}`,
    severity: firstString(record.severity, record.level) || 'medium'
  };
}

export function buildDiscoveryViewModel(input: {
  scanMode: string;
  universe: string;
  generatedAt: string;
  signals: Record<string, unknown>[];
  aiBlocks: unknown[];
  sources: unknown[];
  dataGaps: unknown[];
}) {
  const discoveryType = normalizeDiscoveryType(input.scanMode);
  const profile = discoveryProfiles[discoveryType];
  const displayAiBlocks = filterNarrativeAiBlocks(input.aiBlocks, input.signals.length > 0);
  const contentSections = buildContentSections(displayAiBlocks, input.signals.length > 0);
  const categoryStats = input.signals.reduce<Record<MarketSignalCategory, number>>(
    (acc, signal) => {
      const category = signalCategory(signal);
      acc[category] = (acc[category] ?? 0) + 1;
      return acc;
    },
    { opportunity: 0, risk: 0, watch: 0 }
  );
  if (categoryStats.opportunity === 0) {
    categoryStats.opportunity = contentSections.filter(
      (section) => section.tone === 'opportunity'
    ).length;
  }
  if (categoryStats.risk === 0) {
    categoryStats.risk = contentSections.filter((section) => section.tone === 'risk').length;
  }
  const avgScore = input.signals.length
    ? Math.round(
        input.signals.reduce(
          (sum, signal) =>
            sum + toNumber(signal.importanceScore ?? signal.importance_score ?? signal.score, 50),
          0
        ) / input.signals.length
      )
    : 0;
  const signalCards = input.signals.map((signal, index) => {
    const target = asRecord(signal.target);
    const category = signalCategory(signal);
    const title =
      firstString(signal.title, signal.name) ||
      firstString(target.name, target.symbol, target.targetKey, target.target_key) ||
      `${profile.signalNoun} ${index + 1}`;
    return {
      id: firstString(signal.id, signal.eventId, `signal-${index + 1}`),
      rank: index + 1,
      title,
      summary: firstString(signal.summary, signal.description, signal.reason),
      category,
      eventType: firstString(signal.eventType, signal.event_type, signal.type) || input.scanMode,
      target,
      impactedTickers: splitTags(
        signal.impactedTickers ?? signal.impacted_tickers ?? signal.symbols
      ),
      score: Math.max(
        0,
        Math.min(
          100,
          toNumber(signal.importanceScore ?? signal.importance_score ?? signal.score, 50)
        )
      ),
      metrics: buildMetricChips(signal.metrics),
      rawMetrics: asRecord(signal.metrics),
      evidence: signal.evidence || [],
      sourceCount: asArray(signal.evidence).length || input.sources.length,
      confidence: firstString(signal.confidence, signal.confidenceLabel, signal.confidence_label),
      whyItMatters: firstString(
        signal.whyItMatters,
        signal.why_it_matters,
        signal.marketImplication,
        signal.market_implication
      ),
      delayOrLimitation: firstString(
        signal.delayOrLimitation,
        signal.delay_or_limitation,
        signal.limitation,
        asRecord(signal.compliance).limitation
      ),
      nextVerification: firstString(
        signal.nextVerification,
        signal.next_verification,
        signal.nextCheck,
        signal.next_check
      )
    };
  });

  return {
    discoveryType,
    aiBlocks: displayAiBlocks,
    profile,
    kpis: [
      { key: 'signals', label: '信号', value: input.signals.length },
      { key: 'opportunity', label: '机会', value: categoryStats.opportunity },
      { key: 'risk', label: '风险', value: categoryStats.risk },
      { key: 'score', label: '强度', value: input.signals.length ? avgScore : '--' }
    ],
    categoryStats,
    tickerStats: buildTickerStats(input.signals),
    signalCards,
    contentSections,
    overviewBlocks: buildOverviewBlocks(contentSections),
    dataGaps: input.dataGaps.map(compactDataGap).slice(0, 12),
    tabs: [
      {
        key: 'overview',
        title: '概览',
        blocks: buildOverviewBlocks(contentSections)
      },
      { key: 'signals', title: profile.signalNoun, count: input.signals.length },
      { key: 'analysis', title: 'AI 分析', count: contentSections.length },
      { key: 'evidence', title: '证据', count: input.sources.length + input.dataGaps.length }
    ],
    generatedAt: input.generatedAt,
    universe: input.universe
  };
}

export function buildAppCard(input: {
  id: string;
  componentName: string;
  data: Record<string, unknown>;
}) {
  return {
    id: input.id,
    componentName: input.componentName,
    data: input.data
  };
}

export function buildSignalRecord(input: {
  signal: Record<string, unknown>;
  cardId?: string;
  aiBlocks?: unknown[];
  sources?: unknown[];
}) {
  const target = normalizeTarget(input.signal.target || input.signal);
  return {
    tableKey: 'market_signal_event',
    mode: 'insert_record',
    record: {
      event_type: firstString(input.signal.eventType, input.signal.event_type, input.signal.type),
      target_type: target.targetType,
      target_key: target.targetKey,
      title: firstString(input.signal.title),
      summary: firstString(input.signal.summary),
      impacted_tickers: splitTags(input.signal.impactedTickers ?? input.signal.impacted_tickers),
      importance_score: toNumber(input.signal.importanceScore ?? input.signal.importance_score, 50),
      event_time: firstString(input.signal.eventTime, input.signal.event_time),
      card_id: input.cardId || '',
      metrics_json: stringifyJson(asRecord(input.signal.metrics)),
      evidence_json: stringifyJson(input.signal.evidence || []),
      scores_json: stringifyJson(asRecord(input.signal.scores)),
      labels_json: stringifyJson(input.signal.labels || []),
      confidence: firstString(input.signal.confidence),
      delay_or_limitation: firstString(
        input.signal.delayOrLimitation,
        input.signal.delay_or_limitation
      ),
      next_verification: firstString(input.signal.nextVerification, input.signal.next_verification),
      sources_json: stringifyJson(input.sources || []),
      ai_blocks_json: stringifyJson(input.aiBlocks || [])
    }
  };
}

export function buildDeliveryRecord(input: {
  deliveryType: string;
  card: Record<string, unknown>;
  signalEventIds?: string[];
}) {
  return {
    tableKey: 'market_delivery_record',
    mode: 'insert_record',
    record: {
      delivery_type: input.deliveryType,
      status: 'generated',
      card_component: firstString(input.card.componentName),
      card_json: stringifyJson(input.card),
      signal_event_ids: input.signalEventIds || [],
      delivered_at: new Date().toISOString()
    }
  };
}

export function buildDailyReportRecord(input: {
  reportDate: string;
  title: string;
  summary: string;
  watchCount: number;
  card: Record<string, unknown>;
  signalEventIds?: string[];
  targetSummaries?: unknown[];
  sources?: unknown[];
  aiBlocks?: unknown[];
  generatedAt?: string;
}) {
  return {
    tableKey: 'market_daily_report',
    mode: 'upsert_daily_snapshot',
    record: {
      report_date: input.reportDate,
      report_type: 'daily_report',
      title: input.title,
      summary: input.summary,
      watch_count: input.watchCount,
      signal_event_ids: input.signalEventIds || [],
      card_component: firstString(input.card.componentName),
      card_json: stringifyJson(input.card),
      target_summaries_json: stringifyJson(input.targetSummaries || []),
      sources_json: stringifyJson(input.sources || []),
      ai_blocks_json: stringifyJson(input.aiBlocks || []),
      generated_at: input.generatedAt || new Date().toISOString()
    }
  };
}
