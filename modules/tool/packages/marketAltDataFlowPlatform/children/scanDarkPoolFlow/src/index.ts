import { getErrText } from '@tool/utils/err';
import { z } from 'zod';
import { buildDarkPoolEvents, normalizeDarkPoolRows } from '../../../lib/flow';
import {
  FlowConfigSchema,
  optionalJsonInput,
  parseTickerList,
  stringifyJson,
  stringInput
} from '../../../lib/schemas';

export const InputType = FlowConfigSchema.and(
  z.object({
    symbols: stringInput(),
    dark_pool_json: optionalJsonInput,
    notional_threshold: z.coerce.number().min(10000).max(1000000000).default(1000000),
    min_signal_score: z.coerce.number().min(0).max(100).default(45)
  })
);

export const OutputType = z.object({
  dark_pool_events_json: z.string(),
  summary_markdown: z.string(),
  count: z.number(),
  system_error: z.string().optional()
});

type In = z.infer<typeof InputType>;
type Out = z.infer<typeof OutputType>;

function emptyOutput(systemError?: string): Out {
  return {
    dark_pool_events_json: '[]',
    summary_markdown: '',
    count: 0,
    system_error: systemError
  };
}

export async function tool(props: In): Promise<Out> {
  try {
    const input = InputType.parse(props);
    const symbols = parseTickerList(input.symbols);
    if (!symbols.length) throw new Error('symbols is required');

    const rows = normalizeDarkPoolRows(input.dark_pool_json);
    const events = buildDarkPoolEvents({
      rows,
      minSignalScore: input.min_signal_score,
      notionalThreshold: input.notional_threshold
    });

    return {
      dark_pool_events_json: stringifyJson(events),
      summary_markdown: formatSummary(symbols, events.length, Boolean(input.dark_pool_json)),
      count: events.length
    };
  } catch (e: unknown) {
    return emptyOutput(getErrText(e));
  }
}

function formatSummary(symbols: string[], count: number, hasData: boolean): string {
  const lines = [`扫描 ${symbols.length} 个股票的暗池/大宗成交：${symbols.join(', ')}`];
  if (!hasData) {
    lines.push(
      '',
      '未传入暗池数据 JSON，当前仅完成 watchlist 解析。接入 Dark Pool provider 后可输出 block print 事件。'
    );
  } else {
    lines.push('', count ? `发现 ${count} 个暗池大单事件。` : '未发现达到阈值的暗池大单事件。');
  }
  return lines.join('\n');
}
