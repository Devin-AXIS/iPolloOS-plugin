import { getErrText } from '@tool/utils/err';
import { z } from 'zod';
import {
  MARKET_MONITOR_EVENT_COMPONENT,
  asRecord,
  buildAppCard,
  buildCardId,
  buildDeliveryRecord,
  buildSignalRecord,
  normalizeAiBlocks,
  normalizeSources,
  normalizeTarget,
  optionalJsonInput,
  parseJsonValue,
  splitTags,
  stringifyJson,
  textInput,
  toNumber
} from '../../../lib/native-card';

export const InputType = z.object({
  target_json: optionalJsonInput,
  event_type: z.string().min(1),
  change_summary: z.string().min(1),
  impacted_tickers: textInput(),
  importance_score: z.coerce.number().min(0).max(100).default(50),
  event_time: textInput(),
  sources_json: optionalJsonInput,
  ai_blocks_json: optionalJsonInput,
  mini_visual_json: optionalJsonInput
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

export async function tool(props: In): Promise<Out> {
  try {
    const input = InputType.parse(props);
    const target = normalizeTarget(input.target_json);
    const sources = normalizeSources(input.sources_json);
    const aiBlocks = normalizeAiBlocks(input.ai_blocks_json, input.change_summary);
    const impactedTickers = splitTags(input.impacted_tickers);
    const importanceScore = toNumber(input.importance_score, 50);
    const eventTime = input.event_time || new Date().toISOString();
    const miniVisual = asRecord(parseJsonValue(input.mini_visual_json, {}));
    const cardId = buildCardId([
      'market-monitor-event',
      target.targetType,
      target.targetKey || target.name,
      input.event_type,
      eventTime
    ]);
    const signal = {
      id: cardId,
      title: `${target.name || target.targetKey} · ${input.event_type}`,
      summary: input.change_summary,
      eventType: input.event_type,
      target,
      impactedTickers,
      importanceScore,
      eventTime
    };
    const card = buildAppCard({
      id: cardId,
      componentName: MARKET_MONITOR_EVENT_COMPONENT,
      data: {
        kind: 'monitor_event',
        target,
        eventType: input.event_type,
        changeSummary: input.change_summary,
        impactedTickers,
        importanceScore,
        importanceLevel: importanceScore >= 80 ? 'high' : importanceScore >= 55 ? 'medium' : 'low',
        sourceCount: sources.length,
        sources,
        aiBlocks,
        aiReason: aiBlocks[0]?.content || input.change_summary,
        eventTime,
        miniVisual,
        actions: [
          { label: '深度分析', action: 'market_deep_analysis' },
          { label: '继续跟踪', action: 'follow_up' },
          { label: '查看证据', action: 'view_sources' }
        ]
      }
    });
    const signalRecord = buildSignalRecord({
      signal,
      cardId,
      aiBlocks,
      sources
    });
    const deliveryRecord = buildDeliveryRecord({
      deliveryType: 'monitor_event',
      card,
      signalEventIds: [cardId]
    });

    return {
      app_card: stringifyJson(card),
      record_json: stringifyJson(signalRecord),
      records_json: stringifyJson([signalRecord, deliveryRecord]),
      summary_markdown: `${target.name || target.targetKey} 发生 ${input.event_type}：${input.change_summary}`,
      system_error: undefined
    };
  } catch (error: unknown) {
    return emptyOutput(getErrText(error));
  }
}
