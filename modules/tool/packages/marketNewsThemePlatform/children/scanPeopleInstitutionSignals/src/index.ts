import { getErrText } from '@tool/utils/err';
import { z } from 'zod';
import { buildPeopleInstitutionEvents, normalizeEntitySignalRows } from '../../../lib/newsTheme';
import {
  NewsThemeConfigSchema,
  optionalJsonInput,
  parseList,
  stringifyJson,
  stringInput
} from '../../../lib/schemas';

export const InputType = NewsThemeConfigSchema.and(
  z.object({
    entities: stringInput(),
    entity_signals_json: optionalJsonInput,
    min_signal_score: z.coerce.number().min(0).max(100).default(45)
  })
);

export const OutputType = z.object({
  entity_events_json: z.string(),
  summary_markdown: z.string(),
  count: z.number(),
  system_error: z.string().optional()
});

type In = z.infer<typeof InputType>;
type Out = z.infer<typeof OutputType>;

function emptyOutput(systemError?: string): Out {
  return {
    entity_events_json: '[]',
    summary_markdown: '',
    count: 0,
    system_error: systemError
  };
}

export async function tool(props: In): Promise<Out> {
  try {
    const input = InputType.parse(props);
    const entities = parseList(input.entities);
    if (!entities.length) throw new Error('entities is required');

    const rows = normalizeEntitySignalRows(input.entity_signals_json);
    const events = buildPeopleInstitutionEvents({
      rows,
      minSignalScore: input.min_signal_score
    });

    return {
      entity_events_json: stringifyJson(events),
      summary_markdown: formatSummary(entities, events.length, Boolean(input.entity_signals_json)),
      count: events.length
    };
  } catch (e: unknown) {
    return emptyOutput(getErrText(e));
  }
}

function formatSummary(entities: string[], count: number, hasData: boolean): string {
  const lines = [`扫描 ${entities.length} 个人物/机构：${entities.join(', ')}`];
  if (!hasData) {
    lines.push(
      '',
      '未传入人物机构动态 JSON，当前仅完成目标解析。接入 X/新闻/搜索/招聘/投资 provider 后可输出动态事件。'
    );
  } else {
    lines.push(
      '',
      count ? `发现 ${count} 个人物机构动态事件。` : '未发现达到阈值的人物机构动态事件。'
    );
  }
  return lines.join('\n');
}
