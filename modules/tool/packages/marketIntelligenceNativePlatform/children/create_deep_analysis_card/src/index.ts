import { getErrText } from '@tool/utils/err';
import { z } from 'zod';
import {
  MARKET_DEEP_ANALYSIS_COMPONENT,
  asArray,
  asRecord,
  buildAppCard,
  buildCardId,
  buildContentSections,
  buildDeliveryRecord,
  buildOverviewBlocks,
  buildSignalRecord,
  deriveSourcesFromSignals,
  mergeSources,
  normalizeAiBlocks,
  normalizeSignals,
  normalizeSources,
  normalizeTarget,
  optionalJsonInput,
  parseJsonValue,
  stringifyJson,
  textInput
} from '../../../lib/native-card';

export const InputType = z.object({
  analysis_type: z.string().min(1),
  targets_json: optionalJsonInput,
  analysis_focus: textInput(),
  metrics_json: optionalJsonInput,
  signals_json: optionalJsonInput,
  ai_blocks_json: optionalJsonInput,
  sources_json: optionalJsonInput
});

export const OutputType = z.object({
  app_card: z.string(),
  records_json: z.string(),
  summary_markdown: z.string(),
  system_error: z.string().optional()
});

type In = z.input<typeof InputType>;
type Out = z.output<typeof OutputType>;

function emptyOutput(systemError?: string): Out {
  return {
    app_card: '',
    records_json: '[]',
    summary_markdown: '',
    system_error: systemError
  };
}

export async function tool(props: In): Promise<Out> {
  try {
    const input = InputType.parse(props);
    const rawTargets = asArray(input.targets_json);
    const targets =
      rawTargets.length > 0
        ? rawTargets.map((item) => normalizeTarget(item, input.analysis_type))
        : [normalizeTarget(input.targets_json, input.analysis_type)];
    const signals = normalizeSignals(input.signals_json);
    const sources = mergeSources(
      normalizeSources(input.sources_json),
      deriveSourcesFromSignals(signals)
    );
    const aiBlocks = normalizeAiBlocks(input.ai_blocks_json);
    const metrics = asRecord(parseJsonValue(input.metrics_json, {}));
    const contentSections = buildContentSections(aiBlocks, signals.length > 0);
    const overviewBlocks = buildOverviewBlocks(contentSections);
    const generatedAt = new Date().toISOString();
    const cardId = buildCardId([
      'market-deep-analysis',
      input.analysis_type,
      targets.map((target) => target.targetKey || target.name).join('|'),
      input.analysis_focus,
      generatedAt
    ]);
    const title = targets.map((target) => target.name || target.targetKey).join(', ') || '深度分析';
    const summary =
      contentSections.find((section) => section.content)?.content ||
      signals.find((signal) => signal.summary)?.summary ||
      `已生成 ${title} 的${input.analysis_focus || '深度'}分析。`;
    const tabs = [
      { key: 'overview', title: '概览', count: overviewBlocks.length },
      { key: 'signals', title: '关键信号', count: signals.length },
      { key: 'analysis', title: '深度分析', count: contentSections.length },
      { key: 'evidence', title: '证据', count: sources.length }
    ];
    const card = buildAppCard({
      id: cardId,
      componentName: MARKET_DEEP_ANALYSIS_COMPONENT,
      data: {
        kind: 'deep_analysis',
        title,
        analysisType: input.analysis_type,
        analysisFocus: input.analysis_focus || 'opportunity_risk',
        generatedAt,
        summary,
        targets,
        metrics,
        signals,
        aiBlocks,
        contentSections,
        overviewBlocks,
        tabs,
        viewModel: {
          title,
          summary,
          analysisType: input.analysis_type,
          analysisFocus: input.analysis_focus || 'opportunity_risk',
          targets,
          metrics,
          signals,
          contentSections,
          overviewBlocks,
          sources,
          tabs
        },
        sources
      }
    });
    const signalRecords = signals.map((signal) =>
      buildSignalRecord({
        signal,
        cardId,
        aiBlocks,
        sources
      })
    );
    const deliveryRecord = buildDeliveryRecord({
      deliveryType: 'deep_analysis',
      card,
      signalEventIds: signals.map((signal) => signal.id)
    });

    return {
      app_card: stringifyJson(card),
      records_json: stringifyJson([...signalRecords, deliveryRecord]),
      summary_markdown: `已生成 ${title} 的${input.analysis_focus || '深度'}分析。`
    };
  } catch (error: unknown) {
    return emptyOutput(getErrText(error));
  }
}
