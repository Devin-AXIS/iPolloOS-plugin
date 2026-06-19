import { getErrText } from '@tool/utils/err';
import type { RunToolSecondParamsType } from '@tool/type/req';
import { z } from 'zod';
import { resolveRuntimeIdentity } from '../../../lib/runtime';
import { updateScheduleTask } from '../../../lib/api';
import { DispatchChannelSchema, TaskPatchSchema, stringifyJson } from '../../../lib/schema';

export const InputType = z.object({
  task_id: z.string().min(1),
  patch_json: z.string().min(1),
  dispatch_channel: DispatchChannelSchema,
  require_user_confirm: z.boolean().default(false)
});

export const OutputType = z.object({
  ok: z.boolean(),
  action_json: z.string(),
  confirm_card_json: z.string(),
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
    const patch = TaskPatchSchema.parse(JSON.parse(input.patch_json));
    const action = {
      action: 'update_task',
      dispatchChannel: input.dispatch_channel,
      applicationId: identity.applicationId,
      userId: identity.userId,
      identitySource: identity.identitySource,
      taskId: input.task_id,
      patch,
      submitMode:
        input.dispatch_channel === 'local'
          ? 'local_test_payload'
          : input.require_user_confirm
            ? 'confirm_card'
            : 'ipollo_app_api'
    };
    const confirmCard = {
      type: 'ipollo_task_update_confirm',
      title: '确认更新任务',
      taskId: input.task_id,
      patch,
      primaryAction: { label: '确认更新', action: 'update_ipollo_task' }
    };
    if (input.dispatch_channel !== 'local' && !input.require_user_confirm) {
      const apiResult = await updateScheduleTask({
        applicationId: identity.applicationId,
        userId: identity.userId,
        taskId: input.task_id,
        patch
      });
      return {
        ok: true,
        action_json: stringifyJson({ ...action, apiResult }),
        confirm_card_json: ''
      };
    }

    return {
      ok: true,
      action_json: stringifyJson(action),
      confirm_card_json: stringifyJson(confirmCard)
    };
  } catch (error: unknown) {
    return { ok: false, action_json: '', confirm_card_json: '', system_error: getErrText(error) };
  }
}
