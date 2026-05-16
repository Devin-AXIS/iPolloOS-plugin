import { z } from 'zod';
import { manusPost, normalizeBaseUrl } from '../../../lib/client';
import { safeDetailJson } from '../../../lib/format';

export const InputType = z.object({
  manusApiKey: z.string().min(1),
  baseUrl: z.string().optional(),
  filename: z.string().min(1)
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
    const res = await manusPost<
      Record<string, unknown> & { upload_url?: string; file?: { id?: string } }
    >(props.manusApiKey, props.baseUrl ?? '', '/v2/file.upload', {
      filename: props.filename
    });
    const fid =
      res.file && typeof res.file === 'object' && res.file !== null && 'id' in res.file
        ? String((res.file as { id?: string }).id ?? '')
        : '';
    return {
      summary: `Presigned upload URL returned.${fid ? ` file_id=${fid}.` : ''} PUT bytes to upload_url before expiry.`,
      detail_json: safeDetailJson(res, 48_000)
    };
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    return { summary: '', detail_json: 'null', system_error: msg };
  }
}
