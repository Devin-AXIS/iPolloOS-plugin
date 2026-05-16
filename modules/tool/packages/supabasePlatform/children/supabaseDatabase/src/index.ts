import { z } from 'zod';
import { normalizeMgmtBase, supabaseMgmt } from '../../../lib/mgmt';
import { safeDetailJson } from '../../../lib/safeJson';

export const InputType = z.object({
  supabaseAccessToken: z.string().min(1),
  managementBaseUrl: z.string().optional(),
  defaultProjectRef: z.string().optional(),
  projectRef: z.string().optional(),
  sqlMode: z.enum(['readOnly', 'readWrite']),
  sqlQuery: z.string().min(1),
  parametersJson: z.string().optional(),
  /** 仅 readWrite 端点：映射 body.read_only */
  readOnly: z.boolean().optional()
});

export const OutputType = z.object({
  summary: z.string(),
  detail_json: z.string(),
  http_status: z.number(),
  system_error: z.string().optional()
});

type In = z.infer<typeof InputType>;
type Out = z.infer<typeof OutputType>;

function errMsg(json: unknown, text: string): string | undefined {
  if (typeof json === 'object' && json !== null && 'message' in json)
    return String((json as { message?: string }).message);
  return text ? text.slice(0, 800) : undefined;
}

export async function tool(
  props: In,
  _ctx: import('@tool/type/req').RunToolSecondParamsType
): Promise<Out> {
  void _ctx;
  const base = normalizeMgmtBase(props.managementBaseUrl);
  const ref = props.projectRef?.trim() || props.defaultProjectRef?.trim();
  if (!ref) {
    return {
      summary: 'Error: 缺少 projectRef（节点填写或插件默认 defaultProjectRef）',
      detail_json: '{}',
      http_status: 0,
      system_error: 'projectRef'
    };
  }
  const pathBase = `/v1/projects/${encodeURIComponent(ref)}/database/query`;
  const path = props.sqlMode === 'readOnly' ? `${pathBase}/read-only` : pathBase;

  try {
    const body: Record<string, unknown> = { query: props.sqlQuery };
    if (props.parametersJson?.trim()) body.parameters = JSON.parse(props.parametersJson);
    if (props.sqlMode === 'readWrite' && props.readOnly === true) body.read_only = true;

    const r = await supabaseMgmt(props.supabaseAccessToken, base, 'POST', path, { body });
    const summary = r.ok ? `OK HTTP ${r.status}` : `HTTP ${r.status}`;
    const out: Out = {
      summary,
      detail_json: safeDetailJson(r.json, 120_000),
      http_status: r.status
    };
    if (!r.ok) out.system_error = errMsg(r.json, r.text) ?? `HTTP ${r.status}`;
    return out;
  } catch (e) {
    const m = e instanceof Error ? e.message : String(e);
    return { summary: `Error: ${m}`, detail_json: '{}', http_status: 0, system_error: m };
  }
}
