import { z } from 'zod';
import { VercelAuthFields } from '../../../lib/schemas';
import { vercelJsonRequest } from '../../../lib/http';
import { resolveProjectId } from '../../../lib/resolveProject';

export const InputType = VercelAuthFields.and(
  z.object({
    action: z.string().min(1),
    project_id_or_name: z.string().optional(),
    deployment_id: z.string().optional(),
    alias_hostname: z.string().optional(),
    list_limit: z.union([z.number(), z.string()]).optional()
  })
);

export const OutputType = z.object({
  summary: z.string(),
  result_json: z.string(),
  system_error: z.string().optional()
});

type In = z.infer<typeof InputType>;
type Out = z.infer<typeof OutputType>;

function safeJson(x: unknown, max = 48_000): string {
  try {
    const s = JSON.stringify(x, null, 2);
    return s.length > max ? `${s.slice(0, max)}\n…(truncated)` : s;
  } catch {
    return '';
  }
}

function resolveProject(p: In): string | undefined {
  return (
    (p.project_id_or_name?.trim() || p.defaultProjectIdOrName?.trim() || '').trim() || undefined
  );
}

export async function tool(props: In): Promise<Out> {
  const auth = {
    vercelToken: props.vercelToken,
    vercelTeamId: props.vercelTeamId?.trim() || undefined,
    defaultProjectIdOrName: props.defaultProjectIdOrName?.trim() || undefined
  };
  const action = props.action.trim().toLowerCase().replace(/\s+/g, '_');
  const project = resolveProject(props);
  const dep = props.deployment_id?.trim();

  const limitRaw = props.list_limit ?? 20;
  const limit = Math.min(100, Math.max(1, Number(limitRaw) || 20));

  try {
    if (action === 'list_deployments') {
      if (!project) {
        return {
          summary: '',
          result_json: '',
          system_error: 'list_deployments 需要 project_id_or_name 或插件默认项目'
        };
      }
      const resolved = await resolveProjectId(auth, project);
      if (!resolved.ok) {
        return { summary: '', result_json: '', system_error: resolved.error };
      }
      const r = await vercelJsonRequest({
        token: auth.vercelToken,
        teamId: auth.vercelTeamId,
        method: 'GET',
        path: '/v6/deployments',
        query: { projectId: resolved.id, limit: String(limit) }
      });
      if (!r.ok)
        return {
          summary: '',
          result_json: '',
          system_error: `HTTP ${r.status} ${r.text.slice(0, 800)}`
        };
      return {
        summary: `已列出最多 ${limit} 条部署`,
        result_json: safeJson(r.json)
      };
    }

    if (action === 'promote') {
      if (!project || !dep) {
        return {
          summary: '',
          result_json: '',
          system_error: 'promote 需要 project_id_or_name 与 deployment_id'
        };
      }
      const resolved = await resolveProjectId(auth, project);
      if (!resolved.ok) {
        return { summary: '', result_json: '', system_error: resolved.error };
      }
      const r = await vercelJsonRequest({
        token: auth.vercelToken,
        teamId: auth.vercelTeamId,
        method: 'POST',
        path: `/v10/projects/${encodeURIComponent(resolved.id)}/promote/${encodeURIComponent(dep)}`
      });
      if (!r.ok)
        return {
          summary: '',
          result_json: '',
          system_error: `HTTP ${r.status} ${r.text.slice(0, 800)}`
        };
      return { summary: `已将 ${dep} 晋级到生产`, result_json: safeJson(r.json) };
    }

    if (action === 'rollback') {
      if (!project || !dep) {
        return {
          summary: '',
          result_json: '',
          system_error: 'rollback 需要 project_id_or_name 与 deployment_id'
        };
      }
      const resolved = await resolveProjectId(auth, project);
      if (!resolved.ok) {
        return { summary: '', result_json: '', system_error: resolved.error };
      }
      const r = await vercelJsonRequest({
        token: auth.vercelToken,
        teamId: auth.vercelTeamId,
        method: 'POST',
        path: `/v1/projects/${encodeURIComponent(resolved.id)}/rollback/${encodeURIComponent(dep)}`
      });
      if (!r.ok)
        return {
          summary: '',
          result_json: '',
          system_error: `HTTP ${r.status} ${r.text.slice(0, 800)}`
        };
      return { summary: `已回滚到部署 ${dep}`, result_json: safeJson(r.json) };
    }

    if (action === 'cancel_deployment') {
      if (!dep)
        return {
          summary: '',
          result_json: '',
          system_error: 'cancel_deployment 需要 deployment_id'
        };
      const r = await vercelJsonRequest({
        token: auth.vercelToken,
        teamId: auth.vercelTeamId,
        method: 'PATCH',
        path: `/v12/deployments/${encodeURIComponent(dep)}/cancel`
      });
      if (!r.ok)
        return {
          summary: '',
          result_json: '',
          system_error: `HTTP ${r.status} ${r.text.slice(0, 800)}`
        };
      return { summary: `已取消部署 ${dep}`, result_json: safeJson(r.json) };
    }

    if (action === 'delete_deployment') {
      if (!dep)
        return {
          summary: '',
          result_json: '',
          system_error: 'delete_deployment 需要 deployment_id'
        };
      const r = await vercelJsonRequest({
        token: auth.vercelToken,
        teamId: auth.vercelTeamId,
        method: 'DELETE',
        path: `/v13/deployments/${encodeURIComponent(dep)}`
      });
      if (!r.ok)
        return {
          summary: '',
          result_json: '',
          system_error: `HTTP ${r.status} ${r.text.slice(0, 800)}`
        };
      return { summary: `已删除部署 ${dep}`, result_json: safeJson(r.json) };
    }

    if (action === 'assign_alias') {
      if (!dep || !props.alias_hostname?.trim()) {
        return {
          summary: '',
          result_json: '',
          system_error: 'assign_alias 需要 deployment_id 与 alias_hostname'
        };
      }
      const r = await vercelJsonRequest({
        token: auth.vercelToken,
        teamId: auth.vercelTeamId,
        method: 'POST',
        path: `/v2/deployments/${encodeURIComponent(dep)}/aliases`,
        body: { alias: props.alias_hostname.trim() }
      });
      if (!r.ok)
        return {
          summary: '',
          result_json: '',
          system_error: `HTTP ${r.status} ${r.text.slice(0, 800)}`
        };
      return {
        summary: `已为 ${dep} 分配别名 ${props.alias_hostname.trim()}`,
        result_json: safeJson(r.json)
      };
    }

    return {
      summary: '',
      result_json: '',
      system_error: `未知 action：${props.action}。支持 list_deployments | promote | rollback | cancel_deployment | delete_deployment | assign_alias`
    };
  } catch (e: unknown) {
    return {
      summary: '',
      result_json: '',
      system_error: e instanceof Error ? e.message : String(e)
    };
  }
}
