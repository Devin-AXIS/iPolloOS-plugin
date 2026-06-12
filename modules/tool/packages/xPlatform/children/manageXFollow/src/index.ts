import { getErrText } from '@tool/utils/err';
import { z } from 'zod';
import {
  getAuthenticatedUser,
  lookupUserByUsername,
  manageFollowAction
} from '../../../lib/client';
import { stringifyJson } from '../../../lib/format';
import {
  XActionConfigSchema,
  XFollowManageActionSchema,
  cleanUsername
} from '../../../lib/schemas';

const emptyToUndefined = (value: unknown) =>
  value === '' || value === null || value === undefined ? undefined : value;

export const InputType = XActionConfigSchema.and(
  z.object({
    action: XFollowManageActionSchema.default('follow'),
    target_username: z.preprocess(emptyToUndefined, z.string().max(80).optional()),
    actor_user_id: z.string().max(40).optional()
  })
);

export const OutputType = z.object({
  success: z.boolean(),
  action: z.string(),
  target_user_id: z.string(),
  summary: z.string(),
  result_json: z.string(),
  system_error: z.string().optional()
});

type In = z.infer<typeof InputType>;
type Out = z.infer<typeof OutputType>;

const actionLabel: Record<string, string> = {
  follow: '关注',
  unfollow: '取关'
};

function emptyOutput(systemError?: string): Out {
  return {
    success: false,
    action: '',
    target_user_id: '',
    summary: '',
    result_json: '{}',
    system_error: systemError
  };
}

export async function tool(props: In): Promise<Out> {
  try {
    const input = InputType.parse(props);
    const actorUserId = input.actor_user_id?.trim() || (await getAuthenticatedUser(input)).id;
    const targetUsername = cleanUsername(input.target_username);
    if (!targetUsername) throw new Error('target_username is required');
    const targetUser = await lookupUserByUsername(input, targetUsername);
    const targetUserId = targetUser.id;

    const result = await manageFollowAction(input, {
      actorUserId,
      targetUserId,
      action: input.action
    });

    return {
      success: true,
      action: input.action,
      target_user_id: targetUserId,
      summary: `X 用户已执行${actionLabel[input.action] ?? input.action}：${
        targetUsername ? `@${targetUsername}` : targetUserId
      }`,
      result_json: stringifyJson(result)
    };
  } catch (e: unknown) {
    return emptyOutput(getErrText(e));
  }
}
