import { getErrText } from '@tool/utils/err';
import { z } from 'zod';
import { buildFundFlowEvents, normalizeFundFlowRows } from '../../../lib/flow';
import {
  FlowConfigSchema,
  optionalJsonInput,
  parseList,
  stringifyJson,
  stringInput
} from '../../../lib/schemas';

export const InputType = FlowConfigSchema.and(
  z.object({
    funds_or_themes: stringInput(),
    fund_flows_json: optionalJsonInput,
    flow_threshold: z.coerce.number().min(100000).max(10000000000).default(50000000),
    flow_percent_threshold: z.coerce.number().min(0.1).max(50).default(1),
    min_signal_score: z.coerce.number().min(0).max(100).default(45)
  })
);

export const OutputType = z.object({
  fund_flow_events_json: z.string(),
  flows_json: z.string(),
  summary_markdown: z.string(),
  count: z.number(),
  system_error: z.string().optional()
});

type In = z.infer<typeof InputType>;
type Out = z.infer<typeof OutputType>;

function emptyOutput(systemError?: string): Out {
  return {
    fund_flow_events_json: '[]',
    flows_json: '[]',
    summary_markdown: '',
    count: 0,
    system_error: systemError
  };
}

export async function tool(props: In): Promise<Out> {
  try {
    const input = InputType.parse(props);
    const subjects = parseList(input.funds_or_themes);
    if (!subjects.length) throw new Error('funds_or_themes is required');

    const rows = normalizeFundFlowRows(input.fund_flows_json);
    const events = buildFundFlowEvents({
      rows,
      minSignalScore: input.min_signal_score,
      flowThreshold: input.flow_threshold,
      flowPercentThreshold: input.flow_percent_threshold
    });

    return {
      fund_flow_events_json: stringifyJson(events),
      flows_json: stringifyJson(rows),
      summary_markdown: formatSummary(subjects, events.length, Boolean(input.fund_flows_json)),
      count: events.length
    };
  } catch (e: unknown) {
    return emptyOutput(getErrText(e));
  }
}

function formatSummary(subjects: string[], count: number, hasData: boolean): string {
  const lines = [`扫描 ${subjects.length} 个基金/主题：${subjects.join(', ')}`];
  if (!hasData) {
    lines.push(
      '',
      '未传入基金流向 JSON，当前仅完成目标解析。接入 ETF/fund-flow provider 后可输出资金流入流出事件。'
    );
  } else {
    lines.push('', count ? `发现 ${count} 个基金流向事件。` : '未发现达到阈值的基金流向事件。');
  }
  return lines.join('\n');
}
