import { getErrText } from '@tool/utils/err';
import { z } from 'zod';
import {
  MARKET_DAILY_REPORT_COMPONENT,
  asArray,
  buildAppCard,
  buildCardId,
  buildDailyReportRecord,
  buildDeliveryRecord,
  deriveSourcesFromSignals,
  firstString,
  mergeSources,
  normalizeAiBlocks,
  normalizeSignals,
  normalizeSources,
  optionalJsonInput,
  stringifyJson,
  textInput
} from '../../../lib/native-card';

export const InputType = z.object({
  watchlist_json: optionalJsonInput,
  signals_json: optionalJsonInput,
  report_date: textInput(),
  report_title: textInput(),
  summary: textInput(),
  target_summaries_json: optionalJsonInput,
  sources_json: optionalJsonInput,
  ai_blocks_json: optionalJsonInput,
  data_gaps_json: optionalJsonInput
});

export const OutputType = z.object({
  app_card: z.string(),
  record_json: z.string(),
  records_json: z.string(),
  summary_markdown: z.string(),
  system_error: z.string().optional()
});

type In = z.input<typeof InputType>;
type Out = z.output<typeof OutputType>;

function emptyOutput(systemError?: string): Out {
  return {
    app_card: '',
    record_json: '',
    records_json: '[]',
    summary_markdown: '',
    system_error: systemError
  };
}

function buildTargetSummaries({
  explicit,
  watchlist,
  signals
}: {
  explicit: unknown[];
  watchlist: unknown[];
  signals: ReturnType<typeof normalizeSignals>;
}) {
  if (explicit.length) return explicit.slice(0, 80);

  return watchlist.slice(0, 80).map((target, index) => {
    const record = target && typeof target === 'object' ? (target as Record<string, unknown>) : {};
    const targetKey = firstString(
      record.targetKey,
      record.target_key,
      record.symbol,
      record.ticker,
      record.name
    );
    const targetSignals = signals.filter((signal) => {
      const signalTarget = signal.target as Record<string, unknown>;
      return (
        firstString(signalTarget.targetKey, signalTarget.target_key, signalTarget.symbol) ===
          targetKey || signal.impactedTickers.includes(targetKey)
      );
    });

    return {
      id: firstString(record.id, targetKey, `target-${index + 1}`),
      targetType: firstString(record.targetType, record.target_type, record.type),
      targetKey,
      name: firstString(record.name, record.displayName, record.display_name, targetKey),
      signalCount: targetSignals.length,
      topChanges: targetSignals.slice(0, 5).map((signal) => ({
        id: signal.id,
        title: signal.title,
        summary: signal.summary,
        eventType: signal.eventType,
        importanceScore: signal.importanceScore
      }))
    };
  });
}

export async function tool(props: In): Promise<Out> {
  try {
    const input = InputType.parse(props);
    const generatedAt = new Date().toISOString();
    const reportDate = input.report_date || generatedAt.slice(0, 10);
    const watchlist = asArray(input.watchlist_json);
    const signals = normalizeSignals(input.signals_json);
    const targetSummaries = buildTargetSummaries({
      explicit: asArray(input.target_summaries_json),
      watchlist,
      signals
    });
    const sources = mergeSources(
      normalizeSources(input.sources_json),
      deriveSourcesFromSignals(signals)
    );
    const summary =
      input.summary ||
      `${reportDate} 共跟踪 ${watchlist.length} 个关注对象，识别 ${signals.length} 条重点变化。`;
    const aiBlocks = normalizeAiBlocks(input.ai_blocks_json, summary);
    const dataGaps = asArray(input.data_gaps_json).slice(0, 20);
    const title = input.report_title || `${reportDate} 美股监控报告`;
    const signalEventIds = signals.map((signal) => String(signal.id || '')).filter(Boolean);
    const cardId = buildCardId([
      'market-daily-report',
      reportDate,
      watchlist.length,
      signals.length
    ]);
    const stats = {
      watchCount: watchlist.length,
      signalCount: signals.length,
      sourceCount: sources.length,
      highImportanceCount: signals.filter((signal) => signal.importanceScore >= 80).length
    };
    const card = buildAppCard({
      id: cardId,
      componentName: MARKET_DAILY_REPORT_COMPONENT,
      data: {
        kind: 'daily_report',
        reportType: 'daily_report',
        title,
        summary,
        reportDate,
        generatedAt,
        watchlist,
        targetSummaries,
        signals,
        stats,
        aiBlocks,
        sources,
        dataGaps,
        tabs: [
          { key: 'summary', title: '摘要', count: aiBlocks.length },
          { key: 'targets', title: '关注对象', count: targetSummaries.length },
          { key: 'signals', title: '变化', count: signals.length },
          { key: 'sources', title: '来源', count: sources.length }
        ]
      }
    });
    const reportRecord = buildDailyReportRecord({
      reportDate,
      title,
      summary,
      watchCount: watchlist.length,
      card,
      signalEventIds,
      targetSummaries,
      sources,
      aiBlocks,
      generatedAt
    });
    const deliveryRecord = buildDeliveryRecord({
      deliveryType: 'daily_report',
      card,
      signalEventIds
    });

    return {
      app_card: stringifyJson(card),
      record_json: stringifyJson(reportRecord),
      records_json: stringifyJson([reportRecord, deliveryRecord]),
      summary_markdown: `${title} 已生成：${watchlist.length} 个关注对象，${signals.length} 条变化。`
    };
  } catch (error: unknown) {
    return emptyOutput(getErrText(error));
  }
}
