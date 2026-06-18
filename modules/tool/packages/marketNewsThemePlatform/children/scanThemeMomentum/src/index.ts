import { getErrText } from '@tool/utils/err';
import { z } from 'zod';
import { buildThemeMomentumEvents, normalizeThemeRows } from '../../../lib/newsTheme';
import {
  NewsThemeConfigSchema,
  optionalJsonInput,
  parseList,
  stringifyJson,
  stringInput
} from '../../../lib/schemas';

export const InputType = NewsThemeConfigSchema.and(
  z.object({
    themes: stringInput(),
    theme_signals_json: optionalJsonInput,
    mention_spike_ratio: z.coerce.number().min(1).max(50).default(2),
    min_signal_score: z.coerce.number().min(0).max(100).default(45)
  })
);

export const OutputType = z.object({
  theme_events_json: z.string(),
  theme_scores_json: z.string(),
  summary_markdown: z.string(),
  count: z.number(),
  system_error: z.string().optional()
});

type In = z.infer<typeof InputType>;
type Out = z.infer<typeof OutputType>;

function emptyOutput(systemError?: string): Out {
  return {
    theme_events_json: '[]',
    theme_scores_json: '[]',
    summary_markdown: '',
    count: 0,
    system_error: systemError
  };
}

export async function tool(props: In): Promise<Out> {
  try {
    const input = InputType.parse(props);
    const themes = parseList(input.themes);
    if (!themes.length) throw new Error('themes is required');

    const rows = normalizeThemeRows(input.theme_signals_json);
    const events = buildThemeMomentumEvents({
      rows,
      targetThemes: themes,
      minSignalScore: input.min_signal_score,
      mentionSpikeRatio: input.mention_spike_ratio
    });

    return {
      theme_events_json: stringifyJson(events),
      theme_scores_json: stringifyJson(
        events.map((event) => ({
          theme: event.entities[0]?.name,
          scores: event.scores,
          metrics: event.metrics
        }))
      ),
      summary_markdown: formatSummary(themes, events.length, Boolean(input.theme_signals_json)),
      count: events.length
    };
  } catch (e: unknown) {
    return emptyOutput(getErrText(e));
  }
}

function formatSummary(themes: string[], count: number, hasData: boolean): string {
  const lines = [`扫描 ${themes.length} 个主题：${themes.join(', ')}`];
  if (!hasData) {
    lines.push(
      '',
      '未传入主题信号 JSON，当前仅完成主题解析。接入新闻/X/趋势 provider 后可输出主题热度事件。'
    );
  } else {
    lines.push('', count ? `发现 ${count} 个主题热度事件。` : '未发现达到阈值的主题热度事件。');
  }
  return lines.join('\n');
}
