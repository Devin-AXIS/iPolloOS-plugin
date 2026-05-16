import { vercelJsonRequest } from './http';
import type { VercelAuthFieldsIn } from './schemas';

export async function resolveProjectId(
  auth: VercelAuthFieldsIn,
  idOrName: string
): Promise<{ ok: true; id: string } | { ok: false; error: string }> {
  const r = await vercelJsonRequest({
    token: auth.vercelToken,
    teamId: auth.vercelTeamId,
    method: 'GET',
    path: `/v9/projects/${encodeURIComponent(idOrName)}`
  });
  if (!r.ok || !r.json || typeof r.json !== 'object' || !('id' in (r.json as object))) {
    return { ok: false, error: `无法解析项目：${idOrName}（HTTP ${r.status}）` };
  }
  return { ok: true, id: (r.json as { id: string }).id };
}
