import { z } from 'zod';
import { buildQuery, manusGet, normalizeBaseUrl } from '../../../lib/client';
import { safeDetailJson } from '../../../lib/format';

export const InputType = z.object({
  manusApiKey: z.string().min(1),
  baseUrl: z.string().optional(),
  fileId: z.string().min(1)
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
    const q = buildQuery({ file_id: props.fileId });
    const res = await manusGet<Record<string, unknown>>(
      props.manusApiKey,
      props.baseUrl ?? '',
      `/v2/file.detail${q}`
    );
    return {
      summary: `File ${props.fileId}`,
      detail_json: safeDetailJson(res, 64_000)
    };
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    return { summary: '', detail_json: 'null', system_error: msg };
  }
}
