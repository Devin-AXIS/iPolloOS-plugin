import { getErrText } from '@tool/utils/err';
import type { RunToolSecondParamsType } from '@tool/type/req';
import { z } from 'zod';
import {
  buildScheduleListAppCard,
  buildScheduleTaskAppCard,
  formatTasksMarkdown
} from '../../../lib/format';
import { resolveRuntimeIdentity } from '../../../lib/runtime';
import { queryScheduleTasks } from '../../../lib/api';
import { DispatchChannelSchema, emptyToUndefined, stringifyJson } from '../../../lib/schema';

export const InputType = z.object({
  from: z.preprocess(emptyToUndefined, z.string().optional()).optional(),
  to: z.preprocess(emptyToUndefined, z.string().optional()).optional(),
  keyword: z.preprocess(emptyToUndefined, z.string().optional()).optional(),
  assignee_name: z.preprocess(emptyToUndefined, z.string().optional()).optional(),
  assignee_type: z.preprocess(emptyToUndefined, z.enum(['user', 'agent']).optional()).optional(),
  assignee_id: z.preprocess(emptyToUndefined, z.string().optional()).optional(),
  status: z.preprocess(emptyToUndefined, z.string().optional()).optional(),
  include_completed: z.boolean().default(false),
  dispatch_channel: DispatchChannelSchema,
  limit: z.coerce.number().int().min(1).max(100).default(20)
});

export const OutputType = z.object({
  ok: z.boolean(),
  tasks_json: z.string(),
  tasks_markdown: z.string(),
  app_card: z.string(),
  action_json: z.string(),
  count: z.number(),
  system_error: z.string().optional()
});

type In = Record<string, unknown>;
type Out = z.output<typeof OutputType>;

function parseTime(value: string | undefined): number | null {
  if (!value) return null;
  const time = new Date(value).getTime();
  return Number.isFinite(time) ? time : null;
}

function isFocusedTimeWindow(from: string | undefined, to: string | undefined): boolean {
  const start = parseTime(from);
  const end = parseTime(to);
  if (start == null || end == null || end <= start) return false;
  return end - start <= 2 * 60 * 60 * 1000;
}

function getTaskTime(value: unknown): number | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
  const record = value as Record<string, unknown>;
  for (const key of [
    'dueAt',
    'due_at',
    'nextRunAt',
    'next_run_at',
    'scheduledAt',
    'scheduled_at'
  ]) {
    const time = parseTime(typeof record[key] === 'string' ? record[key] : undefined);
    if (time != null) return time;
  }
  const schedule = record.schedule;
  if (schedule && typeof schedule === 'object' && !Array.isArray(schedule)) {
    const scheduleRecord = schedule as Record<string, unknown>;
    for (const key of ['dueAt', 'startAt', 'nextRunAt']) {
      const time = parseTime(
        typeof scheduleRecord[key] === 'string' ? scheduleRecord[key] : undefined
      );
      if (time != null) return time;
    }
  }
  return null;
}

function filterItemsForFocusedTimeWindow(input: {
  items: unknown[];
  from?: string;
  to?: string;
}): unknown[] {
  if (!isFocusedTimeWindow(input.from, input.to)) return input.items;
  const start = parseTime(input.from);
  const end = parseTime(input.to);
  if (start == null || end == null) return input.items;

  const inRange = input.items.filter((item) => {
    const time = getTaskTime(item);
    return time != null && time >= start && time <= end;
  });

  const exactStart = inRange.filter((item) => {
    const time = getTaskTime(item);
    return time != null && Math.abs(time - start) < 60 * 1000;
  });

  return exactStart.length > 0 ? exactStart : inRange;
}

function buildQueryAppCard(input: {
  items: unknown[];
  from?: string;
  to?: string;
  keyword?: string;
  limit?: number;
}) {
  const keyword = String(input.keyword ?? '').trim();
  if (keyword && input.items.length === 1) {
    return buildScheduleTaskAppCard({
      kind: 'detail',
      title: '查到这个日程',
      task: input.items[0]
    });
  }

  if (keyword && input.limit === 1 && input.items.length > 0) {
    return buildScheduleTaskAppCard({
      kind: 'detail',
      title: '查到这个日程',
      task: input.items[0]
    });
  }

  if (isFocusedTimeWindow(input.from, input.to) && input.items.length === 1) {
    return buildScheduleTaskAppCard({
      kind: 'detail',
      title: '查到这个日程',
      task: input.items[0]
    });
  }

  return buildScheduleListAppCard({
    title: isFocusedTimeWindow(input.from, input.to) ? '该时间段日程' : '日程查询结果',
    items: input.items,
    from: input.from,
    to: input.to
  });
}

export async function tool(props: In, runtime?: RunToolSecondParamsType): Promise<Out> {
  try {
    const input = InputType.parse(props);
    const identity = resolveRuntimeIdentity(
      { dispatchChannel: input.dispatch_channel },
      runtime?.systemVar
    );
    const filters = {
      applicationId: identity.applicationId,
      userId: identity.userId,
      from: input.from,
      to: input.to,
      keyword: input.keyword,
      assigneeName: input.assignee_name,
      assigneeType: input.assignee_type,
      assigneeId: input.assignee_id,
      status: input.status,
      includeCompleted: input.include_completed,
      limit: input.limit
    };
    const action = {
      action: 'query_tasks',
      dispatchChannel: input.dispatch_channel,
      filters,
      identitySource: identity.identitySource,
      submitMode: input.dispatch_channel === 'local' ? 'local_test_payload' : 'ipollo_app_api'
    };

    if (input.dispatch_channel === 'local') {
      return {
        ok: true,
        tasks_json: stringifyJson([]),
        tasks_markdown: '本地测试模式：已返回查询动作 JSON，未访问 iPollo App 数据库。',
        app_card: stringifyJson(
          buildQueryAppCard({
            items: [],
            from: input.from,
            to: input.to,
            keyword: input.keyword,
            limit: input.limit
          })
        ),
        action_json: stringifyJson(action),
        count: 0
      };
    }

    const result = await queryScheduleTasks({
      applicationId: identity.applicationId,
      userId: identity.userId,
      from: input.from,
      to: input.to,
      keyword: input.keyword,
      assigneeName: input.assignee_name,
      assigneeType: input.assignee_type,
      assigneeId: input.assignee_id,
      status: input.status,
      includeCompleted: input.include_completed,
      limit: input.limit
    });
    const items = filterItemsForFocusedTimeWindow({
      items: result.items,
      from: input.from,
      to: input.to
    });

    return {
      ok: true,
      tasks_json: stringifyJson(items),
      tasks_markdown: formatTasksMarkdown(items),
      app_card: stringifyJson(
        buildQueryAppCard({
          items,
          from: input.from,
          to: input.to,
          keyword: input.keyword,
          limit: input.limit
        })
      ),
      action_json: stringifyJson(action),
      count: items.length
    };
  } catch (error: unknown) {
    return {
      ok: false,
      tasks_json: '[]',
      tasks_markdown: '',
      app_card: '',
      action_json: '',
      count: 0,
      system_error: getErrText(error)
    };
  }
}
