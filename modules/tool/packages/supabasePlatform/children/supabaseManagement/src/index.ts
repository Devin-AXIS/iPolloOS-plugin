import { z } from 'zod';
import { safeDetailJson } from '../../../lib/safeJson';
import { MANAGEMENT_OPERATIONS, type ManagementOperation } from '../../../lib/routeTable';
import {
  runManagementOperation,
  runRawMgmtRequest,
  type MgmtOpBaseProps
} from '../../../lib/runMgmtOperation';

const RAW = 'raw.request';

export const InputType = z.object({
  supabaseAccessToken: z.string().min(1),
  managementBaseUrl: z.string().optional(),
  defaultProjectRef: z.string().optional(),
  defaultOrganizationSlug: z.string().optional(),
  operation: z.string().min(1),
  projectRef: z.string().optional(),
  organizationSlug: z.string().optional(),
  branchId: z.string().optional(),
  apiKeyId: z.string().optional(),
  functionSlug: z.string().optional(),
  slug: z.string().optional(),
  bodyJson: z.string().optional(),
  httpMethod: z.enum(['GET', 'POST', 'PATCH', 'PUT', 'DELETE']).optional(),
  path: z.string().optional(),
  queryJson: z.string().optional()
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

function isMgmtOp(op: string): op is ManagementOperation {
  return op in MANAGEMENT_OPERATIONS;
}

export async function tool(
  props: In,
  _ctx: import('@tool/type/req').RunToolSecondParamsType
): Promise<Out> {
  void _ctx;
  try {
    if (props.operation === RAW) {
      if (!props.httpMethod || !props.path?.trim()) {
        return {
          summary: 'Error: raw.request 需要 httpMethod 与 path（/v1/...）',
          detail_json: '{}',
          http_status: 0,
          system_error: 'raw'
        };
      }
      const r = await runRawMgmtRequest({
        supabaseAccessToken: props.supabaseAccessToken,
        managementBaseUrl: props.managementBaseUrl,
        httpMethod: props.httpMethod,
        path: props.path.trim(),
        queryJson: props.queryJson,
        bodyJson: props.bodyJson
      });
      const summary = r.ok ? `OK HTTP ${r.status}` : `HTTP ${r.status}`;
      const out: Out = {
        summary,
        detail_json: safeDetailJson(r.json, 120_000),
        http_status: r.status
      };
      if (!r.ok) out.system_error = errMsg(r.json, r.text) ?? `HTTP ${r.status}`;
      return out;
    }

    if (!isMgmtOp(props.operation)) {
      return {
        summary: `Error: 未知 operation: ${props.operation}`,
        detail_json: '{}',
        http_status: 0,
        system_error: 'operation'
      };
    }

    const baseProps: MgmtOpBaseProps = {
      supabaseAccessToken: props.supabaseAccessToken,
      managementBaseUrl: props.managementBaseUrl,
      defaultProjectRef: props.defaultProjectRef,
      defaultOrganizationSlug: props.defaultOrganizationSlug,
      projectRef: props.projectRef,
      organizationSlug: props.organizationSlug,
      branchId: props.branchId,
      apiKeyId: props.apiKeyId,
      functionSlug: props.functionSlug,
      slug: props.slug,
      bodyJson: props.bodyJson
    };

    const r = await runManagementOperation(props.operation, baseProps);
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
