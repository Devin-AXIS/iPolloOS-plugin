import { getErrText } from '@tool/utils/err';
import type { RunToolSecondParamsType } from '@tool/type/req';
import { z } from 'zod';
import {
  buildConfirmCard,
  buildExecutionPackages,
  buildScheduleTaskAppCard
} from '../../../lib/format';
import { resolveRuntimeIdentity } from '../../../lib/runtime';
import { createScheduleTask } from '../../../lib/api';
import { DispatchChannelSchema, TaskPayloadSchema, stringifyJson } from '../../../lib/schema';
import { withAgentSubtaskExecutors, withRuntimeUserOwner } from '../../../lib/assignees';

function parseJson(value: unknown, fallback: unknown) {
  if (value === undefined || value === null || value === '') return fallback;
  if (typeof value !== 'string') return value;
  try {
    return JSON.parse(value);
  } catch {
    return fallback;
  }
}

export const InputType = z.object({
  title: z.string().min(1),
  content: z.string().optional().default(''),
  goal: z.string().optional().default(''),
  schedule_json: z.string().optional().default(''),
  assignees_json: z.string().optional().default(''),
  subtasks_json: z.string().optional().default(''),
  attachments_json: z.string().optional().default(''),
  dispatch_channel: DispatchChannelSchema,
  require_user_confirm: z.boolean().default(false)
});

export const OutputType = z.object({
  ok: z.boolean(),
  task_id: z.string(),
  task_json: z.string(),
  execution_packages_json: z.string(),
  confirm_card_json: z.string(),
  app_card: z.string(),
  action_json: z.string(),
  system_error: z.string().optional()
});

type In = z.input<typeof InputType>;
type Out = z.output<typeof OutputType>;

export async function tool(props: In, runtime?: RunToolSecondParamsType): Promise<Out> {
  try {
    const input = InputType.parse(props);
    const identity = resolveRuntimeIdentity(
      { dispatchChannel: input.dispatch_channel },
      runtime?.systemVar
    );
    const subtasks = parseJson(input.subtasks_json, []);
    const assignees = withAgentSubtaskExecutors(parseJson(input.assignees_json, []), subtasks);
    const task = TaskPayloadSchema.parse({
      applicationId: identity.applicationId,
      userId: identity.userId,
      title: input.title,
      content: input.content,
      goal: input.goal,
      schedule: parseJson(input.schedule_json, undefined),
      assignees: withRuntimeUserOwner(assignees, identity.userId),
      subtasks,
      attachments: parseJson(input.attachments_json, []),
      source: 'agent',
      requireUserConfirm: input.require_user_confirm
    });
    const confirmCard = buildConfirmCard(task);
    const executionPackages = buildExecutionPackages(task);
    const action = {
      action: 'create_task',
      dispatchChannel: input.dispatch_channel,
      applicationId: task.applicationId,
      userId: task.userId,
      identitySource: identity.identitySource,
      task,
      executionPackages,
      submitMode:
        input.dispatch_channel === 'local'
          ? 'local_test_payload'
          : input.require_user_confirm
            ? 'confirm_card'
            : 'ipollo_app_api'
    };

    if (input.dispatch_channel !== 'local' && !input.require_user_confirm) {
      const created = await createScheduleTask({
        applicationId: task.applicationId,
        userId: task.userId,
        task
      });
      return {
        ok: true,
        task_id: created.id,
        task_json: stringifyJson({ ...task, id: created.id || undefined }),
        execution_packages_json: stringifyJson(executionPackages),
        confirm_card_json: '',
        app_card: stringifyJson(
          buildScheduleTaskAppCard({
            kind: 'created',
            task: { ...task, id: created.id || undefined },
            taskId: created.id,
            title: '日程已创建'
          })
        ),
        action_json: stringifyJson({ ...action, taskId: created.id, apiResult: created.raw })
      };
    }

    return {
      ok: true,
      task_id: '',
      task_json: stringifyJson(task),
      execution_packages_json: stringifyJson(executionPackages),
      confirm_card_json: stringifyJson(confirmCard),
      app_card: stringifyJson(
        buildScheduleTaskAppCard({
          kind: 'confirm',
          task,
          title: '确认创建日程'
        })
      ),
      action_json: stringifyJson(action)
    };
  } catch (error: unknown) {
    return {
      ok: false,
      task_id: '',
      task_json: '',
      execution_packages_json: '',
      confirm_card_json: '',
      app_card: '',
      action_json: '',
      system_error: getErrText(error)
    };
  }
}
