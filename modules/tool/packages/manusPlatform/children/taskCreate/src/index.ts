import { z } from 'zod';
import { manusPost, normalizeBaseUrl, splitCsv } from '../../../lib/client';
import { safeDetailJson } from '../../../lib/format';

const shareEnum = z.enum(['private', 'team', 'public']);
const agentEnum = z.enum(['manus-1.6', 'manus-1.6-lite', 'manus-1.6-max']);

export const InputType = z.object({
  manusApiKey: z.string().min(1),
  baseUrl: z.string().optional(),
  prompt: z.string().min(1),
  projectId: z.string().optional(),
  locale: z.string().optional(),
  title: z.string().optional(),
  interactiveMode: z.boolean().optional(),
  hideInTaskList: z.boolean().optional(),
  shareVisibility: shareEnum.optional(),
  agentProfile: agentEnum.optional(),
  connectorsCsv: z.string().optional(),
  enableSkillsCsv: z.string().optional(),
  forceSkillsCsv: z.string().optional(),
  structuredOutputSchemaJson: z.string().optional()
});

export const OutputType = z.object({
  summary: z.string(),
  detail_json: z.string(),
  task_id: z.string(),
  task_url: z.string(),
  system_error: z.string().optional()
});

type In = z.infer<typeof InputType>;
type Out = z.infer<typeof OutputType>;

export async function tool(props: In): Promise<Out> {
  normalizeBaseUrl(props.baseUrl);
  try {
    const message: Record<string, unknown> = { content: props.prompt };
    const conn = splitCsv(props.connectorsCsv);
    const en = splitCsv(props.enableSkillsCsv);
    const fo = splitCsv(props.forceSkillsCsv);
    if (conn) message.connectors = conn;
    if (en) message.enable_skills = en;
    if (fo) message.force_skills = fo;

    const body: Record<string, unknown> = { message };
    if (props.projectId) body.project_id = props.projectId;
    if (props.locale) body.locale = props.locale;
    if (props.title) body.title = props.title;
    if (props.interactiveMode !== undefined) body.interactive_mode = props.interactiveMode;
    if (props.hideInTaskList !== undefined) body.hide_in_task_list = props.hideInTaskList;
    if (props.shareVisibility) body.share_visibility = props.shareVisibility;
    if (props.agentProfile) body.agent_profile = props.agentProfile;
    if (props.structuredOutputSchemaJson?.trim()) {
      try {
        body.structured_output_schema = JSON.parse(props.structuredOutputSchemaJson.trim());
      } catch (pe) {
        const m = pe instanceof Error ? pe.message : String(pe);
        throw new Error(`structured_output_schema 不是合法 JSON: ${m}`);
      }
    }

    const res = await manusPost<
      Record<string, unknown> & {
        task_id?: string;
        task_url?: string;
        task_title?: string;
      }
    >(props.manusApiKey, props.baseUrl ?? '', '/v2/task.create', body);

    const tid = String(res.task_id ?? '');
    const url = String(res.task_url ?? '');

    return {
      summary: `Created Manus task ${tid}. ${url ? `Open: ${url}` : ''}`,
      detail_json: safeDetailJson(res, 48_000),
      task_id: tid,
      task_url: url
    };
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    return {
      summary: '',
      detail_json: 'null',
      task_id: '',
      task_url: '',
      system_error: msg
    };
  }
}
