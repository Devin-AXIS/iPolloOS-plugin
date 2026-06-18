import { getErrText } from '@tool/utils/err';
import { z } from 'zod';
import { buildAssetEvents, normalizeAssetRows } from '../../../lib/market';
import {
  MarketCoreConfigSchema,
  optionalJsonInput,
  parseSymbols,
  stringifyJson,
  stringInput
} from '../../../lib/schemas';

export const InputType = MarketCoreConfigSchema.and(
  z.object({
    symbols: stringInput(),
    market_data_json: optionalJsonInput,
    price_move_threshold: z.coerce.number().min(0.5).max(50).default(3),
    volume_spike_ratio: z.coerce.number().min(1).max(20).default(2),
    min_signal_score: z.coerce.number().min(0).max(100).default(45)
  })
);

export const OutputType = z.object({
  events_json: z.string(),
  signals_json: z.string(),
  summary_markdown: z.string(),
  count: z.number(),
  system_error: z.string().optional()
});

type In = z.infer<typeof InputType>;
type Out = z.infer<typeof OutputType>;

function emptyOutput(systemError?: string): Out {
  return {
    events_json: '[]',
    signals_json: '[]',
    summary_markdown: '',
    count: 0,
    system_error: systemError
  };
}

export async function tool(props: In): Promise<Out> {
  try {
    const input = InputType.parse(props);
    const symbols = parseSymbols(input.symbols);
    if (!symbols.length) throw new Error('symbols is required');

    const rows = normalizeAssetRows(input.market_data_json, symbols);
    const events = buildAssetEvents({
      rows,
      minSignalScore: input.min_signal_score,
      priceMoveThreshold: input.price_move_threshold,
      volumeSpikeRatio: input.volume_spike_ratio
    });

    return {
      events_json: stringifyJson(events),
      signals_json: stringifyJson(events),
      summary_markdown: formatSummary(symbols, events.length, Boolean(input.market_data_json)),
      count: events.length
    };
  } catch (e: unknown) {
    return emptyOutput(getErrText(e));
  }
}

function formatSummary(symbols: string[], count: number, hasData: boolean): string {
  const lines = [`扫描 ${symbols.length} 个股票：${symbols.join(', ')}`];
  if (!hasData) {
    lines.push(
      '',
      '未传入行情数据 JSON，当前仅完成 watchlist 解析。接入 provider 后可输出实时/延迟市场事件。'
    );
  } else {
    lines.push('', count ? `发现 ${count} 个市场异动事件。` : '未发现达到阈值的市场异动事件。');
  }
  return lines.join('\n');
}
