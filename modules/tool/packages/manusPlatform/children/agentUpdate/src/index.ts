import { z } from 'zod';
import { manusPost, normalizeBaseUrl } from '../../../lib/client';
import { safeDetailJson } from '../../../lib/format';

export const InputType = z.object({
  manusApiKey: z.string().min(1),
  baseUrl: z.string().optional(),
  agentId: z.string().min(1),
  nickname: z.string().optional(),
  about: z.string().optional()
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
    const body: Record<string, unknown> = { agent_id: props.agentId };
    if (props.nickname?.trim()) body.nickname = props.nickname.trim();
    if (props.about?.trim()) body.about = props.about.trim();

    const res = await manusPost<Record<string, unknown>>(
      props.manusApiKey,
      props.baseUrl ?? '',
      '/v2/agent.update',
      body
    );
    return {
      summary: `Updated agent ${props.agentId}.`,
      detail_json: safeDetailJson(res, 48_000)
    };
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    return { summary: '', detail_json: 'null', system_error: msg };
  }
}
