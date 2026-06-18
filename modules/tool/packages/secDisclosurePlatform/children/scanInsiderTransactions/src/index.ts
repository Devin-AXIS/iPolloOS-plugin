import { getErrText } from '@tool/utils/err';
import { z } from 'zod';
import { buildInsiderEvents, normalizeInsiderRows } from '../../../lib/sec';
import {
  optionalJsonInput,
  parseList,
  SecConfigSchema,
  stringifyJson,
  stringInput
} from '../../../lib/schemas';

export const InputType = SecConfigSchema.and(
  z.object({
    symbols_or_people: stringInput(),
    insider_trades_json: optionalJsonInput,
    min_signal_score: z.coerce.number().min(0).max(100).default(45)
  })
);

export const OutputType = z.object({
  insider_events_json: z.string(),
  transactions_json: z.string(),
  summary_markdown: z.string(),
  count: z.number(),
  system_error: z.string().optional()
});

type In = z.infer<typeof InputType>;
type Out = z.infer<typeof OutputType>;

function emptyOutput(systemError?: string): Out {
  return {
    insider_events_json: '[]',
    transactions_json: '[]',
    summary_markdown: '',
    count: 0,
    system_error: systemError
  };
}

export async function tool(props: In): Promise<Out> {
  try {
    const input = InputType.parse(props);
    const subjects = parseList(input.symbols_or_people);
    if (!subjects.length) throw new Error('symbols_or_people is required');

    const rows = normalizeInsiderRows(input.insider_trades_json);
    const events = buildInsiderEvents({
      rows,
      minSignalScore: input.min_signal_score
    });

    return {
      insider_events_json: stringifyJson(events),
      transactions_json: stringifyJson(rows),
      summary_markdown: formatSummary(subjects, events.length, Boolean(input.insider_trades_json)),
      count: events.length
    };
  } catch (e: unknown) {
    return emptyOutput(getErrText(e));
  }
}

function formatSummary(subjects: string[], count: number, hasData: boolean): string {
  const lines = [`扫描 ${subjects.length} 个股票/人物：${subjects.join(', ')}`];
  if (!hasData) {
    lines.push(
      '',
      '未传入内部人交易 JSON，当前仅完成目标解析。接入 Form 4 provider 后可输出买入、卖出、行权和计划出售事件。'
    );
  } else {
    lines.push('', count ? `发现 ${count} 个内部人交易事件。` : '未发现达到阈值的内部人交易事件。');
  }
  return lines.join('\n');
}
