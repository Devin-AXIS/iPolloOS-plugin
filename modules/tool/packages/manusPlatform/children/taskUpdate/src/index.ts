import { z } from 'zod';
import { manusPost, normalizeBaseUrl } from '../../../lib/client';
import { safeDetailJson } from '../../../lib/format';

const shareEnum = z.enum(['private', 'team', 'public']);

export const InputType = z.object({
  manusApiKey: z.string().min(1),
  baseUrl: z.string().optional(),
  taskId: z.string().min(1),
  title: z.string().optional(),
  shareVisibility: shareEnum.optional(),
  enableVisibleInTaskList: z.boolean().optional()
});

export const OutputType = z.object({
  summary: z.string(),
  detail_json: z.string(),
  system_error: z.string().optional()
});

type In = z.infer<typeof InputType>;
type Out = z.infer<typeof OutputType>;

export async function tool(props: In): Promise<Out> {
  normalizeBaseUrl(props.baseUrl);
  try {
    const body: Record<string, unknown> = { task_id: props.taskId };
    if (props.title?.trim()) body.title = props.title.trim();
    if (props.shareVisibility) body.share_visibility = props.shareVisibility;
    if (props.enableVisibleInTaskList !== undefined)
      body.enable_visible_in_task_list = props.enableVisibleInTaskList;

    const res = await manusPost<Record<string, unknown>>(
      props.manusApiKey,
      props.baseUrl ?? '',
      '/v2/task.update',
      body
    );
    return {
      summary: `Updated task ${props.taskId}.`,
      detail_json: safeDetailJson(res, 48_000)
    };
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    return { summary: '', detail_json: 'null', system_error: msg };
  }
}
