import { z } from 'zod';
import { buildQuery, manusGet, normalizeBaseUrl } from '../../../lib/client';
import { safeDetailJson } from '../../../lib/format';

export const InputType = z.object({
  manusApiKey: z.string().min(1),
  baseUrl: z.string().optional(),
  limit: z.coerce.number().int().min(1).max(100).optional(),
  cursor: z.string().optional(),
  order: z.enum(['asc', 'desc']).optional(),
  scope: z.enum(['all', 'standard', 'project', 'agent_subtask']).optional(),
  agentId: z.string().optional(),
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
    const q = buildQuery({
      limit: props.limit,
      cursor: props.cursor,
      order: props.order,
      scope: props.scope,
      agent_id: props.agentId,
      project_id: props.projectId
    });

    const res = await manusGet<Record<string, unknown>>(
      props.manusApiKey,
      props.baseUrl ?? '',
      `/v2/task.list${q}`
    );
    const data = Array.isArray(res.data) ? res.data : [];
    const hasMore = res.has_more === true;
    const nextCursor = typeof res.next_cursor === 'string' ? res.next_cursor : undefined;

    return {
      summary: `Listed ${data.length} tasks. has_more=${hasMore}${nextCursor ? `. next_cursor=${nextCursor.slice(0, 80)}` : ''}`,
      detail_json: safeDetailJson(res, 64_000)
    };
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    return { summary: '', detail_json: 'null', system_error: msg };
  }
}
