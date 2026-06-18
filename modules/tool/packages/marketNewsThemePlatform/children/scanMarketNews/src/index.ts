import { getErrText } from '@tool/utils/err';
import { z } from 'zod';
import { buildMarketNewsEvents, normalizeNewsRows } from '../../../lib/newsTheme';
import {
  NewsThemeConfigSchema,
  optionalJsonInput,
  parseList,
  stringifyJson,
  stringInput
} from '../../../lib/schemas';

export const InputType = NewsThemeConfigSchema.and(
  z.object({
    query_or_symbols: stringInput(),
    news_json: optionalJsonInput,
    lookback_hours: z.coerce.number().min(1).max(720).default(24),
    min_signal_score: z.coerce.number().min(0).max(100).default(45)
  })
);

export const OutputType = z.object({
  news_events_json: z.string(),
  summary_markdown: z.string(),
  count: z.number(),
  system_error: z.string().optional()
});

type In = z.infer<typeof InputType>;
type Out = z.infer<typeof OutputType>;

function emptyOutput(systemError?: string): Out {
  return {
    news_events_json: '[]',
    summary_markdown: '',
    count: 0,
    system_error: systemError
  };
}

export async function tool(props: In): Promise<Out> {
  try {
    const input = InputType.parse(props);
    const queries = parseList(input.query_or_symbols);
    if (!queries.length) throw new Error('query_or_symbols is required');

    const rows = normalizeNewsRows(input.news_json);
    const events = buildMarketNewsEvents({
      rows,
      minSignalScore: input.min_signal_score,
      lookbackHours: input.lookback_hours
    });

    return {
      news_events_json: stringifyJson(events),
      summary_markdown: formatSummary(queries, events.length, Boolean(input.news_json)),
      count: events.length
    };
  } catch (e: unknown) {
    return emptyOutput(getErrText(e));
  }
}

function formatSummary(queries: string[], count: number, hasData: boolean): string {
  const lines = [`扫描 ${queries.length} 个新闻目标：${queries.join(', ')}`];
  if (!hasData) {
    lines.push(
      '',
      '未传入新闻 JSON，当前仅完成目标解析。接入新闻/搜索 provider 后可输出重大新闻事件。'
    );
  } else {
    lines.push('', count ? `发现 ${count} 个市场新闻事件。` : '未发现达到阈值的市场新闻事件。');
  }
  return lines.join('\n');
}
