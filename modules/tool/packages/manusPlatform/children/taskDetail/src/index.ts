import { z } from 'zod';
import { buildQuery, manusGet, normalizeBaseUrl } from '../../../lib/client';
import { safeDetailJson } from '../../../lib/format';

export const InputType = z.object({
  manusApiKey: z.string().min(1),
  baseUrl: z.string().optional(),
  taskId: z.string().min(1)
});

export const OutputType = z.object({
  summary: z.string(),
  detail_json: z.string(),
  status: z.string(),
  system_error: z.string().optional()
});

type In = z.infer<typeof InputType>;
type Out = z.infer<typeof OutputType>;

export async function tool(props: In): Promise<Out> {
  normalizeBaseUrl(props.baseUrl);
  try {
    const q = buildQuery({ task_id: props.taskId });
    const res = await manusGet<Record<string, unknown>>(
      props.manusApiKey,
      props.baseUrl ?? '',
      `/v2/task.detail${q}`
    );
    const task = res.task as { status?: string; title?: string; id?: string } | undefined;
    const status = typeof task?.status === 'string' ? task.status : '';

    return {
      summary:
        typeof task?.title === 'string' && task.title
          ? `Task "${task.title}" (${task.id ?? props.taskId}): ${status}`
          : `Task ${props.taskId}: ${status}`,
      detail_json: safeDetailJson(res, 48_000),
      status
    };
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    return { summary: '', detail_json: 'null', status: '', system_error: msg };
  }
}
