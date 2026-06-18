import { getErrText } from '@tool/utils/err';
import { z } from 'zod';
import {
  buildFilingEvents,
  defaultForms,
  fetchRecentSecFilings,
  normalizeFilingRows
} from '../../../lib/sec';
import {
  optionalJsonInput,
  parseList,
  SecConfigSchema,
  stringifyJson,
  stringInput
} from '../../../lib/schemas';

export const InputType = SecConfigSchema.and(
  z.object({
    entities: stringInput(),
    forms: stringInput().optional(),
    filings_json: optionalJsonInput,
    lookback_days: z.coerce.number().min(1).max(366).default(14),
    min_signal_score: z.coerce.number().min(0).max(100).default(45)
  })
);

export const OutputType = z.object({
  filing_events_json: z.string(),
  summary_markdown: z.string(),
  count: z.number(),
  system_error: z.string().optional()
});

type In = z.infer<typeof InputType>;
type Out = z.infer<typeof OutputType>;

function emptyOutput(systemError?: string): Out {
  return {
    filing_events_json: '[]',
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

    const forms = defaultForms(input.forms);
    const rows = input.filings_json
      ? normalizeFilingRows(input.filings_json)
      : await fetchRecentSecFilings({
          entities,
          forms,
          lookbackDays: input.lookback_days,
          userAgent: input.secUserAgent,
          apiBaseUrl: input.secApiBaseUrl,
          tickersUrl: input.secCompanyTickersUrl
        });
    const events = buildFilingEvents({
      rows,
      forms,
      minSignalScore: input.min_signal_score,
      lookbackDays: input.lookback_days
    });

    return {
      filing_events_json: stringifyJson(events),
      summary_markdown: formatSummary(
        entities,
        forms,
        events.length,
        Boolean(input.filings_json),
        Boolean(input.secUserAgent)
      ),
      count: events.length
    };
  } catch (e: unknown) {
    return emptyOutput(getErrText(e));
  }
}

function formatSummary(
  entities: string[],
  forms: string[],
  count: number,
  hasData: boolean,
  canFetch: boolean
): string {
  const lines = [
    `扫描 ${entities.length} 个实体的 SEC 文件：${entities.join(', ')}`,
    `文件类型：${forms.join(', ')}`
  ];
  if (!hasData && !canFetch) {
    lines.push(
      '',
      '未传入 SEC 文件 JSON，也未配置 SEC User-Agent，当前仅完成实体解析。配置后可查询 SEC submissions API。'
    );
  } else {
    lines.push('', count ? `发现 ${count} 个 SEC 披露事件。` : '未发现达到阈值的 SEC 披露事件。');
  }
  return lines.join('\n');
}
