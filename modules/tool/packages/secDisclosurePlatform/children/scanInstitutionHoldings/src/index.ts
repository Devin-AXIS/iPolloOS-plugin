import { getErrText } from '@tool/utils/err';
import { z } from 'zod';
import { buildHoldingEvents, normalizeHoldingRows } from '../../../lib/sec';
import {
  optionalJsonInput,
  parseList,
  SecConfigSchema,
  stringifyJson,
  stringInput
} from '../../../lib/schemas';

export const InputType = SecConfigSchema.and(
  z.object({
    institutions: stringInput(),
    holdings_json: optionalJsonInput,
    min_signal_score: z.coerce.number().min(0).max(100).default(45)
  })
);

export const OutputType = z.object({
  holding_events_json: z.string(),
  positions_json: z.string(),
  summary_markdown: z.string(),
  count: z.number(),
  system_error: z.string().optional()
});

type In = z.infer<typeof InputType>;
type Out = z.infer<typeof OutputType>;

function emptyOutput(systemError?: string): Out {
  return {
    holding_events_json: '[]',
    positions_json: '[]',
    summary_markdown: '',
    count: 0,
    system_error: systemError
  };
}

export async function tool(props: In): Promise<Out> {
  try {
    const input = InputType.parse(props);
    const institutions = parseList(input.institutions);
    if (!institutions.length) throw new Error('institutions is required');

    const rows = normalizeHoldingRows(input.holdings_json);
    const events = buildHoldingEvents({
      rows,
      minSignalScore: input.min_signal_score
    });

    return {
      holding_events_json: stringifyJson(events),
      positions_json: stringifyJson(rows),
      summary_markdown: formatSummary(institutions, events.length, Boolean(input.holdings_json)),
      count: events.length
    };
  } catch (e: unknown) {
    return emptyOutput(getErrText(e));
  }
}

function formatSummary(institutions: string[], count: number, hasData: boolean): string {
  const lines = [`扫描 ${institutions.length} 个机构/基金经理：${institutions.join(', ')}`];
  if (!hasData) {
    lines.push(
      '',
      '未传入 13F 持仓 JSON，当前仅完成机构列表解析。接入 13F provider 后可输出新增、增持、减持和清仓事件。'
    );
  } else {
    lines.push(
      '',
      count ? `发现 ${count} 个机构持仓变化事件。` : '未发现达到阈值的机构持仓变化事件。'
    );
  }
  return lines.join('\n');
}
