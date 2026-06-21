import { getErrText } from '@tool/utils/err';
import { z } from 'zod';
import {
  formatSummary,
  normalizeSourceEvents,
  parseJsonValue,
  parseMonitorState,
  parseWatchSubjects,
  runMonitorAggregation,
  stringifyJson
} from '../../../lib/monitor';

const optionalJsonInput = z.preprocess((value) => {
  if (value === null || value === undefined || value === '') return undefined;
  if (typeof value === 'string') return parseJsonValue(value, undefined);
  return value;
}, z.any().optional());

export const InputType = z.object({
  watch_subjects_json: optionalJsonInput,
  state_json: optionalJsonInput,
  market_events_json: optionalJsonInput,
  sec_events_json: optionalJsonInput,
  news_events_json: optionalJsonInput,
  x_events_json: optionalJsonInput,
  flow_events_json: optionalJsonInput,
  source_events_json: optionalJsonInput,
  min_importance_score: z.coerce.number().min(0).max(100).default(55),
  lookback_hours: z.coerce.number().min(1).max(720).default(72),
  max_events: z.coerce.number().int().min(1).max(200).default(50)
});

export const OutputType = z.object({
  events_json: z.string(),
  card_inputs_json: z.string(),
  records_json: z.string(),
  cursor_records_json: z.string(),
  next_state_json: z.string(),
  summary_markdown: z.string(),
  count: z.number(),
  system_error: z.string().optional()
});

type In = z.output<typeof InputType>;
type Out = z.output<typeof OutputType>;

function emptyOutput(summary: string, state: unknown, systemError?: string): Out {
  return {
    events_json: '[]',
    card_inputs_json: '[]',
    records_json: '[]',
    cursor_records_json: '[]',
    next_state_json: stringifyJson(state || {}),
    summary_markdown: summary,
    count: 0,
    system_error: systemError
  };
}

export async function tool(props: In): Promise<Out> {
  try {
    const input = InputType.parse(props);
    const watchSubjects = parseWatchSubjects(input.watch_subjects_json);
    const sourceEvents = [
      ...normalizeSourceEvents('market', input.market_events_json),
      ...normalizeSourceEvents('sec', input.sec_events_json),
      ...normalizeSourceEvents('news', input.news_events_json),
      ...normalizeSourceEvents('x', input.x_events_json),
      ...normalizeSourceEvents('flow', input.flow_events_json),
      ...normalizeSourceEvents('provided', input.source_events_json)
    ];
    const previousState = parseMonitorState(input.state_json);

    if (!watchSubjects.length) {
      return emptyOutput(formatSummary(0, 0, sourceEvents.length), previousState);
    }

    const result = runMonitorAggregation({
      watchSubjects,
      sourceEvents,
      previousState,
      minImportanceScore: input.min_importance_score,
      lookbackHours: input.lookback_hours,
      maxEvents: input.max_events
    });

    return {
      events_json: stringifyJson(result.events),
      card_inputs_json: stringifyJson(result.cardInputs),
      records_json: stringifyJson(result.records),
      cursor_records_json: stringifyJson(result.cursorRecords),
      next_state_json: stringifyJson(result.nextState),
      summary_markdown: formatSummary(
        watchSubjects.length,
        result.events.length,
        sourceEvents.length
      ),
      count: result.events.length,
      system_error: undefined
    };
  } catch (error: unknown) {
    return emptyOutput(
      `美股聚合监控检查失败：${getErrText(error)}`,
      parseMonitorState((props as { state_json?: unknown }).state_json),
      getErrText(error)
    );
  }
}
