import { getErrText } from '@tool/utils/err';
import { z } from 'zod';
import { getAuthenticatedUser, managePostAction } from '../../../lib/client';
import { stringifyJson } from '../../../lib/format';
import { XConfigSchema, XPostManageActionSchema } from '../../../lib/schemas';

const POST_ACTION_ALIASES: Record<string, z.infer<typeof XPostManageActionSchema>> = {
  delete: 'delete',
  like: 'like',
  unlike: 'unlike',
  repost: 'repost',
  retweet: 'repost',
  undo_repost: 'undo_repost',
  unrepost: 'undo_repost',
  unretweet: 'undo_repost',
  undo_retweet: 'undo_repost'
};

const normalizePostAction = (value: unknown) => {
  if (value === undefined || value === null || value === '') return 'like';
  const key = String(value)
    .trim()
    .toLowerCase()
    .replace(/[\s-]+/g, '_');
  return POST_ACTION_ALIASES[key] ?? value;
};

const PostActionInputSchema = z.preprocess(
  normalizePostAction,
  z
    .string()
    .refine(
      (value): value is z.infer<typeof XPostManageActionSchema> =>
        XPostManageActionSchema.safeParse(value).success,
      {
        message:
          'action must be one of: delete, like, unlike, repost, undo_repost. Aliases: retweet=repost, unretweet/unrepost=undo_repost.'
      }
    )
    .transform((value) => value as z.infer<typeof XPostManageActionSchema>)
);

export const InputType = XConfigSchema.and(
  z.object({
    action: PostActionInputSchema.default('like'),
    post_id: z.string().trim().min(1, 'post_id is required').max(40),
    actor_user_id: z.string().max(40).optional()
  })
);

export const OutputType = z.object({
  success: z.boolean(),
  action: z.string(),
  post_id: z.string(),
  summary: z.string(),
  result_json: z.string(),
  system_error: z.string().optional()
});

type In = z.infer<typeof InputType>;
type Out = z.infer<typeof OutputType>;

const actionLabel: Record<string, string> = {
  delete: '删除',
  like: '点赞',
  unlike: '取消点赞',
  repost: '转发',
  undo_repost: '取消转发'
};

function emptyOutput(systemError?: string): Out {
  return {
    success: false,
    action: '',
    post_id: '',
    summary: '',
    result_json: '{}',
    system_error: systemError
  };
}

export async function tool(props: In): Promise<Out> {
  try {
    const input = InputType.parse(props);
    const actorUserId = input.actor_user_id?.trim() || (await getAuthenticatedUser(input)).id;
    const result = await managePostAction(input, {
      actorUserId,
      postId: input.post_id,
      action: input.action
    });

    return {
      success: true,
      action: input.action,
      post_id: input.post_id,
      summary: `X 帖子已执行${actionLabel[input.action] ?? input.action}：${input.post_id}`,
      result_json: stringifyJson(result)
    };
  } catch (e: unknown) {
    return emptyOutput(getErrText(e));
  }
}
