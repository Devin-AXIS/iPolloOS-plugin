import { getErrText } from '@tool/utils/err';
import { z } from 'zod';
import { buildEarningsEvents, normalizeEarningsRows } from '../../../lib/market';
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
    earnings_data_json: optionalJsonInput,
    min_signal_score: z.coerce.number().min(0).max(100).default(45)
  })
);

export const OutputType = z.object({
  earnings_events_json: z.string(),
  surprises_json: z.string(),
  summary_markdown: z.string(),
  count: z.number(),
  system_error: z.string().optional()
});

type In = z.infer<typeof InputType>;
type Out = z.infer<typeof OutputType>;

function emptyOutput(systemError?: string): Out {
  return {
    earnings_events_json: '[]',
    surprises_json: '[]',
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

    const rows = normalizeEarningsRows(input.earnings_data_json, symbols);
    const events = buildEarningsEvents(rows, input.min_signal_score);

    return {
      earnings_events_json: stringifyJson(events),
      surprises_json: stringifyJson(events),
      summary_markdown: formatSummary(symbols, events.length, Boolean(input.earnings_data_json)),
      count: events.length
    };
  } catch (e: unknown) {
    return emptyOutput(getErrText(e));
  }
}

function formatSummary(symbols: string[], count: number, hasData: boolean): string {
  const lines = [`扫描 ${symbols.length} 个股票的财报事件：${symbols.join(', ')}`];
  if (!hasData) {
    lines.push(
      '',
      '未传入财报数据 JSON，当前仅完成 watchlist 解析。接入 provider 后可输出财报日历和 surprise 事件。'
    );
  } else {
    lines.push('', count ? `发现 ${count} 个财报相关事件。` : '未发现达到阈值的财报事件。');
  }
  return lines.join('\n');
}
