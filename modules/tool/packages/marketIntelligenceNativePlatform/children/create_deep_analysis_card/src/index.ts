import { getErrText } from '@tool/utils/err';
import { z } from 'zod';
import {
  MARKET_DEEP_ANALYSIS_COMPONENT,
  asArray,
  asRecord,
  buildAppCard,
  buildCardId,
  buildDeliveryRecord,
  buildSignalRecord,
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
    const sources = normalizeSources(input.sources_json);
    const aiBlocks = normalizeAiBlocks(input.ai_blocks_json);
    const metrics = asRecord(parseJsonValue(input.metrics_json, {}));
    const generatedAt = new Date().toISOString();
    const cardId = buildCardId([
      'market-deep-analysis',
      input.analysis_type,
      targets.map((target) => target.targetKey || target.name).join('|'),
      input.analysis_focus,
      generatedAt
    ]);
    const title = targets.map((target) => target.name || target.targetKey).join(', ') || '深度分析';
    const card = buildAppCard({
      id: cardId,
      componentName: MARKET_DEEP_ANALYSIS_COMPONENT,
      data: {
        kind: 'deep_analysis',
        title,
        analysisType: input.analysis_type,
        analysisFocus: input.analysis_focus || 'opportunity_risk',
        generatedAt,
        targets,
        metrics,
        signals,
        aiBlocks,
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
