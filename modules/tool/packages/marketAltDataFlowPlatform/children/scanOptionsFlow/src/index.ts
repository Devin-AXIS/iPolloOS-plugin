import { getErrText } from '@tool/utils/err';
import { z } from 'zod';
import { buildOptionsFlowEvents, normalizeOptionsFlowRows } from '../../../lib/flow';
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
    options_flow_json: optionalJsonInput,
    premium_threshold: z.coerce.number().min(1000).max(100000000).default(250000),
    min_signal_score: z.coerce.number().min(0).max(100).default(45)
  })
);

export const OutputType = z.object({
  options_events_json: z.string(),
  summary_markdown: z.string(),
  count: z.number(),
  system_error: z.string().optional()
});

type In = z.infer<typeof InputType>;
type Out = z.infer<typeof OutputType>;

function emptyOutput(systemError?: string): Out {
  return {
    options_events_json: '[]',
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

    const rows = normalizeOptionsFlowRows(input.options_flow_json);
    const events = buildOptionsFlowEvents({
      rows,
      minSignalScore: input.min_signal_score,
      premiumThreshold: input.premium_threshold
    });

    return {
      options_events_json: stringifyJson(events),
      summary_markdown: formatSummary(symbols, events.length, Boolean(input.options_flow_json)),
      count: events.length
    };
  } catch (e: unknown) {
    return emptyOutput(getErrText(e));
  }
}

function formatSummary(symbols: string[], count: number, hasData: boolean): string {
  const lines = [`扫描 ${symbols.length} 个股票的期权流：${symbols.join(', ')}`];
  if (!hasData) {
    lines.push(
      '',
      '未传入期权流 JSON，当前仅完成 watchlist 解析。接入 options-flow provider 后可输出大额 Call/Put/Sweep 事件。'
    );
  } else {
    lines.push('', count ? `发现 ${count} 个期权流事件。` : '未发现达到阈值的期权流事件。');
  }
  return lines.join('\n');
}
