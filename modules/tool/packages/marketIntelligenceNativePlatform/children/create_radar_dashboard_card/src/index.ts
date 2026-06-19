import { getErrText } from '@tool/utils/err';
import { z } from 'zod';
import {
  MARKET_RADAR_DASHBOARD_COMPONENT,
  asArray,
  asRecord,
  buildAppCard,
  buildCardId,
  buildDeliveryRecord,
  normalizeAiBlocks,
  normalizeSignals,
  optionalJsonInput,
  parseJsonValue,
  stringifyJson
} from '../../../lib/native-card';

export const InputType = z.object({
  watchlist_json: optionalJsonInput,
  signals_json: optionalJsonInput,
  dashboard_json: optionalJsonInput,
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

export async function tool(props: In): Promise<Out> {
  try {
    const input = InputType.parse(props);
    const watchlist = asArray(input.watchlist_json);
    const signals = normalizeSignals(input.signals_json);
    const dashboard = asRecord(parseJsonValue(input.dashboard_json, {}));
    const aiBlocks = normalizeAiBlocks(input.ai_blocks_json, String(dashboard.summary || ''));
    const dataGaps = asArray(input.data_gaps_json).slice(0, 20);
    const generatedAt = new Date().toISOString();
    const snapshotDate = generatedAt.slice(0, 10);
    const cardId = buildCardId([
      'market-radar-dashboard',
      snapshotDate,
      signals.length,
      watchlist.length
    ]);
    const card = buildAppCard({
      id: cardId,
      componentName: MARKET_RADAR_DASHBOARD_COMPONENT,
      data: {
        kind: 'radar_dashboard',
        generatedAt,
        snapshotDate,
        watchlist,
        signals,
        dashboard,
        aiBlocks,
        dataGaps,
        quotePolicy: {
          mode: 'fetch_on_render',
          storePriceHistory: false
        }
      }
    });
    const snapshotRecord = {
      tableKey: 'market_dashboard_snapshot',
      mode: 'upsert_daily_snapshot',
      record: {
        snapshot_date: snapshotDate,
        summary: String(dashboard.summary || aiBlocks[0]?.content || ''),
        dashboard_json: stringifyJson({
          watchlist,
          signals,
          dashboard,
          dataGaps
        }),
        ai_blocks_json: stringifyJson(aiBlocks),
        card_id: cardId
      }
    };
    const deliveryRecord = buildDeliveryRecord({
      deliveryType: 'radar_dashboard',
      card,
      signalEventIds: signals.map((signal) => signal.id)
    });

    return {
      app_card: stringifyJson(card),
      record_json: stringifyJson(snapshotRecord),
      records_json: stringifyJson([snapshotRecord, deliveryRecord]),
      summary_markdown: `市场雷达已更新：${watchlist.length} 个关注对象，${signals.length} 个信号。`
    };
  } catch (error: unknown) {
    return emptyOutput(getErrText(error));
  }
}
