import { z } from 'zod';
import { buildQuery, manusGet, normalizeBaseUrl } from '../../../lib/client';
import { safeDetailJson } from '../../../lib/format';

export const InputType = z.object({
  manusApiKey: z.string().min(1),
  baseUrl: z.string().optional(),
  limit: z.coerce.number().int().min(1).max(100).optional(),
  cursor: z.string().optional(),
  startDate: z.coerce.number().int().optional(),
  endDate: z.coerce.number().int().optional(),
  sortBy: z.enum(['task_count', 'credits']).optional(),
  isAsc: z.boolean().optional()
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
    const q = buildQuery({
      limit: props.limit,
      cursor: props.cursor,
      start_date: props.startDate,
      end_date: props.endDate,
      sort_by: props.sortBy,
      is_asc: props.isAsc
    });
    const res = await manusGet<Record<string, unknown>>(
      props.manusApiKey,
      props.baseUrl ?? '',
      `/v2/usage.teamLog${q}`
    );
    return {
      summary: 'Team usage log.',
      detail_json: safeDetailJson(res, 64_000)
    };
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    return { summary: '', detail_json: 'null', system_error: msg };
  }
}
