import { z } from 'zod';
import { manusPost, normalizeBaseUrl } from '../../../lib/client';
import { safeDetailJson } from '../../../lib/format';

export const InputType = z.object({
  manusApiKey: z.string().min(1),
  baseUrl: z.string().optional(),
  taskId: z.string().min(1),
  eventId: z.string().min(1),
  inputJson: z.string().optional()
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
    const body: Record<string, unknown> = {
      task_id: props.taskId,
      event_id: props.eventId
    };
    if (props.inputJson?.trim()) {
      try {
        body.input = JSON.parse(props.inputJson.trim());
      } catch (pe) {
        const m = pe instanceof Error ? pe.message : String(pe);
        throw new Error(`input JSON 无效: ${m}`);
      }
    }

    const res = await manusPost<Record<string, unknown>>(
      props.manusApiKey,
      props.baseUrl ?? '',
      '/v2/task.confirmAction',
      body
    );
    return {
      summary: `Confirmed action for task ${props.taskId}.`,
      detail_json: safeDetailJson(res, 48_000)
    };
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    return { summary: '', detail_json: 'null', system_error: msg };
  }
}
