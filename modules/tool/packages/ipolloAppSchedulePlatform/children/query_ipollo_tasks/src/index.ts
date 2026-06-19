import { getErrText } from '@tool/utils/err';
import type { RunToolSecondParamsType } from '@tool/type/req';
import { z } from 'zod';
import { formatTasksMarkdown } from '../../../lib/format';
import { resolveRuntimeIdentity } from '../../../lib/runtime';
import { queryScheduleTasks } from '../../../lib/api';
import { DispatchChannelSchema, emptyToUndefined, stringifyJson } from '../../../lib/schema';

export const InputType = z.object({
  from: z.preprocess(emptyToUndefined, z.string().optional()).optional(),
  to: z.preprocess(emptyToUndefined, z.string().optional()).optional(),
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
  action_json: z.string(),
  count: z.number(),
  system_error: z.string().optional()
});

type In = Record<string, unknown>;
type Out = z.output<typeof OutputType>;

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
        action_json: stringifyJson(action),
        count: 0
      };
    }

    const result = await queryScheduleTasks({
      applicationId: identity.applicationId,
      userId: identity.userId,
      from: input.from,
      to: input.to,
      assigneeType: input.assignee_type,
      assigneeId: input.assignee_id,
      status: input.status,
      includeCompleted: input.include_completed,
      limit: input.limit
    });

    return {
      ok: true,
      tasks_json: stringifyJson(result.items),
      tasks_markdown: formatTasksMarkdown(result.items),
      action_json: stringifyJson(action),
      count: result.items.length
    };
  } catch (error: unknown) {
    return {
      ok: false,
      tasks_json: '[]',
      tasks_markdown: '',
      action_json: '',
      count: 0,
      system_error: getErrText(error)
    };
  }
}
