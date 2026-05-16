import { z } from 'zod';
import { buildQuery, manusGet, normalizeBaseUrl } from '../../../lib/client';
import { safeDetailJson } from '../../../lib/format';

export const InputType = z.object({
  manusApiKey: z.string().min(1),
  baseUrl: z.string().optional(),
  projectId: z.string().optional()
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
    const q = buildQuery({ project_id: props.projectId });
    const res = await manusGet<Record<string, unknown>>(
      props.manusApiKey,
      props.baseUrl ?? '',
      `/v2/skill.list${q}`
    );
    const data = Array.isArray(res.data) ? res.data : [];
    return {
      summary: `Skills: ${data.length}.`,
      detail_json: safeDetailJson(res, 64_000)
    };
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    return { summary: '', detail_json: 'null', system_error: msg };
  }
}
