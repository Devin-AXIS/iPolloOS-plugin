import { getErrText } from '@tool/utils/err';
import { z } from 'zod';
import {
  MARKET_DISCOVERY_BOARD_COMPONENT,
  MARKET_DISCOVERY_TYPES,
  asArray,
  buildAppCard,
  buildCardId,
  buildDeliveryRecord,
  buildDiscoveryViewModel,
  buildSignalFallbackAiBlocks,
  buildSignalRecord,
  deriveSignalsFromAiBlocks,
  deriveSourcesFromSignals,
  mergeSources,
  normalizeAiBlocks,
  normalizeDiscoveryType,
  normalizeSignals,
  normalizeSources,
  optionalJsonInput,
  stringifyJson,
  textInput
} from '../../../lib/native-card';

export const InputType = z.object({
  scan_mode: textInput(),
  universe: textInput(),
  signals_json: optionalJsonInput,
  ai_blocks_json: optionalJsonInput,
  sources_json: optionalJsonInput,
  data_gaps_json: optionalJsonInput
});

export const OutputType = z.object({
  app_card: z.string(),
  records_json: z.string(),
  summary_markdown: z.string(),
  count: z.number(),
  system_error: z.string().optional()
});

type In = z.input<typeof InputType>;
type Out = z.output<typeof OutputType>;

function emptyOutput(systemError?: string): Out {
  return {
    app_card: '',
    records_json: '[]',
    summary_markdown: '',
    count: 0,
    system_error: systemError
  };
}

function inferDiscoveryScanMode(input: {
  scanMode: string;
  universe: string;
  signals: Record<string, unknown>[];
  aiBlocks: unknown[];
}): string {
  const candidates = input.signals.flatMap((signal) => [
    signal.eventType,
    signal.event_type,
    signal.type,
    signal.scanMode,
    signal.scan_mode,
    signal.category
  ]);
  for (const candidate of candidates) {
    if (typeof candidate !== 'string' || !candidate.trim()) continue;
    try {
      return normalizeDiscoveryType(candidate);
    } catch {
      // Keep scanning explicit fields before falling back to text heuristics.
    }
  }

  const text = [
    input.scanMode,
    input.universe,
    ...input.signals.flatMap((signal) => [signal.title, signal.summary, signal.description]),
    ...input.aiBlocks.flatMap((block) => {
      if (!block || typeof block !== 'object') return [];
      const record = block as Record<string, unknown>;
      return [record.title, record.content, record.type];
    })
  ]
    .map((value) => String(value || '').toLowerCase())
    .join(' ');

  if (/earnings|guidance|eps|revenue|财报|业绩|指引/.test(text)) return 'earnings';
  if (/insider|form 4|10b5|内部人|高管|董事/.test(text)) return 'insider';
  if (
    /13f|13d|13g|congress|buffett|berkshire|ark|blackrock|bridgewater|pelosi|fund|institution|名人|机构|巴菲特|国会|基金|持仓/.test(
      text
    )
  ) {
    return 'famous_institution_trade';
  }
  if (/option|dark pool|etf|flow|fund flow|资金|期权|暗池|大单|流向/.test(text))
    return 'capital_flow';
  if (
    /policy|regulat|court|lawsuit|m&a|merger|order|launch|news|政策|监管|诉讼|订单|新闻|催化/.test(
      text
    )
  ) {
    return 'policy_news_catalyst';
  }
  if (
    /reddit|stocktwits|google trends|x |twitter|social|community|sentiment|媒体|社区|舆情|热度/.test(
      text
    )
  ) {
    return 'sentiment_theme_heat';
  }
  if (/theme|industry|sector|supply chain|主题|产业|板块|行业|供应链/.test(text))
    return 'theme_industry_heat';

  if (input.scanMode && MARKET_DISCOVERY_TYPES.includes(input.scanMode as any))
    return input.scanMode;
  return 'price_move';
}

export async function tool(props: In): Promise<Out> {
  try {
    const input = InputType.parse(props);
    const providedSignals = normalizeSignals(input.signals_json);
    const explicitSources = normalizeSources(input.sources_json);
    const providedAiBlocks = normalizeAiBlocks(input.ai_blocks_json);
    const dataGaps = asArray(input.data_gaps_json).slice(0, 20);
    const generatedAt = new Date().toISOString();
    const scanMode =
      input.scan_mode ||
      inferDiscoveryScanMode({
        scanMode: input.scan_mode,
        universe: input.universe,
        signals: providedSignals,
        aiBlocks: providedAiBlocks
      });
    const discoveryType = normalizeDiscoveryType(scanMode);
    const signals =
      providedSignals.length > 0
        ? providedSignals
        : deriveSignalsFromAiBlocks(providedAiBlocks as Record<string, unknown>[], discoveryType);
    const signalSources = deriveSourcesFromSignals(signals);
    const sources = mergeSources(signalSources, explicitSources);
    const aiBlocks =
      providedAiBlocks.length > 0
        ? providedAiBlocks
        : buildSignalFallbackAiBlocks(signals, discoveryType);
    const viewModel = buildDiscoveryViewModel({
      scanMode,
      universe: input.universe,
      generatedAt,
      signals,
      aiBlocks,
      sources,
      dataGaps
    });
    const cardId = buildCardId([
      'market-discovery-board',
      discoveryType,
      input.universe,
      generatedAt
    ]);
    const card = buildAppCard({
      id: cardId,
      componentName: MARKET_DISCOVERY_BOARD_COMPONENT,
      data: {
        kind: 'discovery_board',
        scanMode,
        discoveryType,
        universe: input.universe,
        generatedAt,
        count: signals.length,
        profile: viewModel.profile,
        kpis: viewModel.kpis,
        categoryStats: viewModel.categoryStats,
        tickerStats: viewModel.tickerStats,
        signalCards: viewModel.signalCards,
        contentSections: viewModel.contentSections,
        overviewBlocks: viewModel.overviewBlocks,
        tabs: viewModel.tabs,
        viewModel,
        signals,
        aiBlocks: viewModel.aiBlocks,
        sources,
        dataGaps,
        emptyText: '暂未发现达到阈值的机会信号'
      }
    });
    const signalRecords = signals.map((signal) =>
      buildSignalRecord({
        signal: {
          ...signal,
          eventType: signal.eventType || scanMode
        },
        cardId,
        aiBlocks,
        sources
      })
    );
    const deliveryRecord = buildDeliveryRecord({
      deliveryType: 'discovery_board',
      card,
      signalEventIds: signals.map((signal) => String(signal.id || '')).filter(Boolean)
    });

    return {
      app_card: stringifyJson(card),
      records_json: stringifyJson([...signalRecords, deliveryRecord]),
      summary_markdown: `发现机会扫描完成：${scanMode}，共 ${signals.length} 个信号。`,
      count: signals.length
    };
  } catch (error: unknown) {
    return emptyOutput(getErrText(error));
  }
}
