import { getErrText } from '@tool/utils/err';
import { z } from 'zod';
import {
  MARKET_DISCOVERY_BOARD_COMPONENT,
  asArray,
  buildAppCard,
  buildCardId,
  buildDeliveryRecord,
  buildSignalRecord,
  normalizeAiBlocks,
  normalizeSignals,
  normalizeSources,
  optionalJsonInput,
  stringifyJson,
  textInput
} from '../../../lib/native-card';

export const InputType = z.object({
  scan_mode: z.string().min(1),
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

export async function tool(props: In): Promise<Out> {
  try {
    const input = InputType.parse(props);
    const signals = normalizeSignals(input.signals_json);
    const sources = normalizeSources(input.sources_json);
    const aiBlocks = normalizeAiBlocks(input.ai_blocks_json, signals[0]?.summary || '');
    const dataGaps = asArray(input.data_gaps_json).slice(0, 20);
    const generatedAt = new Date().toISOString();
    const cardId = buildCardId([
      'market-discovery-board',
      input.scan_mode,
      input.universe,
      generatedAt
    ]);
    const card = buildAppCard({
      id: cardId,
      componentName: MARKET_DISCOVERY_BOARD_COMPONENT,
      data: {
        kind: 'discovery_board',
        scanMode: input.scan_mode,
        universe: input.universe,
        generatedAt,
        count: signals.length,
        signals,
        aiBlocks,
        sources,
        dataGaps,
        emptyText: '暂未发现达到阈值的机会信号'
      }
    });
    const signalRecords = signals.map((signal) =>
      buildSignalRecord({
        signal: {
          ...signal,
          eventType: signal.eventType || input.scan_mode
        },
        cardId,
        aiBlocks,
        sources
      })
    );
    const deliveryRecord = buildDeliveryRecord({
      deliveryType: 'discovery_board',
      card,
      signalEventIds: signals.map((signal) => signal.id)
    });

    return {
      app_card: stringifyJson(card),
      records_json: stringifyJson([...signalRecords, deliveryRecord]),
      summary_markdown: `发现机会扫描完成：${input.scan_mode}，共 ${signals.length} 个信号。`,
      count: signals.length
    };
  } catch (error: unknown) {
    return emptyOutput(getErrText(error));
  }
}
