import { z } from 'zod';
import { buildQuery, manusGet, normalizeBaseUrl } from '../../../lib/client';
import { safeDetailJson } from '../../../lib/format';
import { websiteXorPayload } from '../../../lib/websiteScope';

export const InputType = z.object({
  manusApiKey: z.string().min(1),
  baseUrl: z.string().optional(),
  taskId: z.string().optional(),
  websiteId: z.string().optional()
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
    const id = websiteXorPayload(props.taskId, props.websiteId);
    const q = buildQuery('task_id' in id ? { task_id: id.task_id } : { website_id: id.website_id });
    const res = await manusGet<Record<string, unknown>>(
      props.manusApiKey,
      props.baseUrl ?? '',
      `/v2/website.status${q}`
    );
    const st = typeof res.publish_status === 'string' ? res.publish_status : '';
    return {
      summary: st ? `publish_status=${st}` : 'Website status.',
      detail_json: safeDetailJson(res, 64_000)
    };
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    return { summary: '', detail_json: 'null', system_error: msg };
  }
}
