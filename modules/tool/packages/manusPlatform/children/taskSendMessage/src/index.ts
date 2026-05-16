import { z } from 'zod';
import { manusPost, normalizeBaseUrl, splitCsv } from '../../../lib/client';
import { safeDetailJson } from '../../../lib/format';

export const InputType = z.object({
  manusApiKey: z.string().min(1),
  baseUrl: z.string().optional(),
  taskId: z.string().min(1),
  content: z.string().min(1),
  agentProfile: z
    .string()
    .optional()
    .transform((v) => (v === '' ? undefined : v)),
  connectorsCsv: z.string().optional(),
  enableSkillsCsv: z.string().optional(),
  forceSkillsCsv: z.string().optional(),
  structuredOutputSchemaJson: z.string().optional()
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
    const message: Record<string, unknown> = { content: props.content };
    const conn = splitCsv(props.connectorsCsv);
    const en = splitCsv(props.enableSkillsCsv);
    const fo = splitCsv(props.forceSkillsCsv);
    if (conn) message.connectors = conn;
    if (en) message.enable_skills = en;
    if (fo) message.force_skills = fo;

    const body: Record<string, unknown> = {
      task_id: props.taskId,
      message
    };
    if (props.agentProfile?.trim()) body.agent_profile = props.agentProfile.trim();

    if (props.structuredOutputSchemaJson?.trim()) {
      try {
        body.structured_output_schema = JSON.parse(props.structuredOutputSchemaJson.trim());
      } catch (pe) {
        const m = pe instanceof Error ? pe.message : String(pe);
        throw new Error(`structured_output_schema JSON 无效: ${m}`);
      }
    }

    const res = await manusPost<Record<string, unknown>>(
      props.manusApiKey,
      props.baseUrl ?? '',
      '/v2/task.sendMessage',
      body
    );

    return {
      summary: `Message sent to task ${props.taskId}.`,
      detail_json: safeDetailJson(res, 48_000)
    };
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    return { summary: '', detail_json: 'null', system_error: msg };
  }
}
