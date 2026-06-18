import { getErrText } from '@tool/utils/err';
import { z } from 'zod';
import { buildCongressTradeEvents, normalizeCongressTradeRows } from '../../../lib/flow';
import {
  FlowConfigSchema,
  optionalJsonInput,
  parseList,
  stringifyJson,
  stringInput
} from '../../../lib/schemas';

export const InputType = FlowConfigSchema.and(
  z.object({
    politicians_or_symbols: stringInput(),
    congress_trades_json: optionalJsonInput,
    min_signal_score: z.coerce.number().min(0).max(100).default(45)
  })
);

export const OutputType = z.object({
  congress_events_json: z.string(),
  transactions_json: z.string(),
  summary_markdown: z.string(),
  count: z.number(),
  system_error: z.string().optional()
});

type In = z.infer<typeof InputType>;
type Out = z.infer<typeof OutputType>;

function emptyOutput(systemError?: string): Out {
  return {
    congress_events_json: '[]',
    transactions_json: '[]',
    summary_markdown: '',
    count: 0,
    system_error: systemError
  };
}

export async function tool(props: In): Promise<Out> {
  try {
    const input = InputType.parse(props);
    const subjects = parseList(input.politicians_or_symbols);
    if (!subjects.length) throw new Error('politicians_or_symbols is required');

    const rows = normalizeCongressTradeRows(input.congress_trades_json);
    const events = buildCongressTradeEvents({
      rows,
      minSignalScore: input.min_signal_score
    });

    return {
      congress_events_json: stringifyJson(events),
      transactions_json: stringifyJson(rows),
      summary_markdown: formatSummary(subjects, events.length, Boolean(input.congress_trades_json)),
      count: events.length
    };
  } catch (e: unknown) {
    return emptyOutput(getErrText(e));
  }
}

function formatSummary(subjects: string[], count: number, hasData: boolean): string {
  const lines = [`扫描 ${subjects.length} 个议员/股票：${subjects.join(', ')}`];
  if (!hasData) {
    lines.push(
      '',
      '未传入国会交易 JSON，当前仅完成目标解析。接入 Congress provider 后可输出政治资金流事件。'
    );
  } else {
    lines.push('', count ? `发现 ${count} 个国会交易事件。` : '未发现达到阈值的国会交易事件。');
  }
  return lines.join('\n');
}
