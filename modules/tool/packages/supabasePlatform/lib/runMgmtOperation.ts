import { normalizeMgmtBase, supabaseMgmt, buildPath } from './mgmt';
import type { BodyKind, ManagementOperation } from './routeTable';
import { MANAGEMENT_OPERATIONS } from './routeTable';

export type MgmtOpBaseProps = {
  supabaseAccessToken: string;
  managementBaseUrl?: string;
  /** 插件级默认，可与节点 projectRef 合并 */
  defaultProjectRef?: string;
  defaultOrganizationSlug?: string;
  projectRef?: string;
  organizationSlug?: string;
  branchId?: string;
  apiKeyId?: string;
  functionSlug?: string;
  /** function.deploy 可选 query */
  slug?: string;
  bodyJson?: string;
};

function resolveVar(key: string, props: MgmtOpBaseProps): string | undefined {
  if (key === 'projectRef') {
    const v = props.projectRef?.trim() || props.defaultProjectRef?.trim();
    return v || undefined;
  }
  if (key === 'organizationSlug') {
    const v = props.organizationSlug?.trim() || props.defaultOrganizationSlug?.trim();
    return v || undefined;
  }
  if (key === 'branchId') return props.branchId?.trim() || undefined;
  if (key === 'apiKeyId') return props.apiKeyId?.trim() || undefined;
  if (key === 'functionSlug') return props.functionSlug?.trim() || undefined;
  return undefined;
}

function bodyFor(kind: BodyKind | undefined, bodyJson: string | undefined): unknown {
  if (!kind || kind === 'none') return undefined;
  if (kind === 'empty') return {};
  if (kind === 'json') {
    if (!bodyJson?.trim()) throw new Error('bodyJson 必填');
    return JSON.parse(bodyJson);
  }
  if (kind === 'jsonOpt') {
    if (!bodyJson?.trim()) return undefined;
    return JSON.parse(bodyJson);
  }
  return undefined;
}

export async function runManagementOperation(
  operation: ManagementOperation,
  props: MgmtOpBaseProps
): Promise<{ ok: boolean; status: number; json: unknown; text: string }> {
  const def = MANAGEMENT_OPERATIONS[operation];
  const base = normalizeMgmtBase(props.managementBaseUrl);
  const vars: Record<string, string> = {};
  const pathVars = 'pathVars' in def ? def.pathVars : [];
  for (const key of pathVars) {
    const val = resolveVar(key, props);
    if (!val) throw new Error(`operation ${operation} 需要参数: ${key}`);
    vars[key] = val;
  }
  const path = buildPath(def.path, vars);

  const queryKeys = 'queryKeys' in def ? def.queryKeys : [];
  const query: Record<string, string | undefined> | undefined = queryKeys.length
    ? Object.fromEntries(
        queryKeys.map((k) => [k, props[k as keyof MgmtOpBaseProps] as string | undefined])
      )
    : undefined;

  const body = bodyFor('body' in def ? def.body : undefined, props.bodyJson);
  const init: { query?: Record<string, string | undefined>; body?: unknown } = {};
  if (query && Object.keys(query).length) init.query = query;
  if (body !== undefined) init.body = body;

  return supabaseMgmt(props.supabaseAccessToken, base, def.method, path, init);
}

export async function runRawMgmtRequest(props: {
  supabaseAccessToken: string;
  managementBaseUrl?: string;
  httpMethod: 'GET' | 'POST' | 'PATCH' | 'PUT' | 'DELETE';
  path: string;
  queryJson?: string;
  bodyJson?: string;
}): Promise<{ ok: boolean; status: number; json: unknown; text: string }> {
  const base = normalizeMgmtBase(props.managementBaseUrl);
  if (!props.path.startsWith('/v1/')) throw new Error('path 必须以 /v1/ 开头');
  let q: Record<string, string> | undefined;
  if (props.queryJson?.trim()) {
    const o = JSON.parse(props.queryJson) as Record<string, unknown>;
    q = {};
    for (const [k, v] of Object.entries(o)) {
      if (v === undefined || v === null) continue;
      q[k] = String(v);
    }
  }
  let body: unknown;
  if (props.bodyJson?.trim()) body = JSON.parse(props.bodyJson);
  return supabaseMgmt(props.supabaseAccessToken, base, props.httpMethod, props.path, {
    query: q,
    body
  });
}
