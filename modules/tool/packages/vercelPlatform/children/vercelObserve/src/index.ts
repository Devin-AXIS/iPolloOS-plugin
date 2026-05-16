import { z } from 'zod';
import { VercelAuthFields } from '../../../lib/schemas';
import { vercelJsonRequest } from '../../../lib/http';
import { resolveProjectId } from '../../../lib/resolveProject';

export const InputType = VercelAuthFields.and(
  z.object({
    action: z.string().min(1),
    project_id_or_name: z.string().optional(),
    deployment_id: z.string().min(1)
  })
);

export const OutputType = z.object({
  summary: z.string(),
  result_json: z.string(),
  system_error: z.string().optional()
});

type In = z.infer<typeof InputType>;
type Out = z.infer<typeof OutputType>;

function safeJson(x: unknown, max = 80_000): string {
  try {
    const s = JSON.stringify(x, null, 2);
    return s.length > max ? `${s.slice(0, max)}\n…(truncated)` : s;
  } catch {
    return '';
  }
}

export async function tool(props: In): Promise<Out> {
  const auth = {
    vercelToken: props.vercelToken,
    vercelTeamId: props.vercelTeamId?.trim() || undefined,
    defaultProjectIdOrName: props.defaultProjectIdOrName?.trim() || undefined
  };
  const action = props.action.trim().toLowerCase().replace(/\s+/g, '_');
  const dep = props.deployment_id.trim();
  const project = (props.project_id_or_name?.trim() || auth.defaultProjectIdOrName || '').trim();

  try {
    if (action === 'deployment_events') {
      const r = await vercelJsonRequest({
        token: auth.vercelToken,
        teamId: auth.vercelTeamId,
        method: 'GET',
        path: `/v3/deployments/${encodeURIComponent(dep)}/events`
      });
      if (!r.ok)
        return {
          summary: '',
          result_json: '',
          system_error: `HTTP ${r.status} ${r.text.slice(0, 800)}`
        };
      return { summary: `已拉取部署 ${dep} 的事件`, result_json: safeJson(r.json) };
    }

    if (action === 'runtime_logs') {
      if (!project) {
        return {
          summary: '',
          result_json: '',
          system_error: 'runtime_logs 需要 project_id_or_name 或插件默认项目'
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
        path: `/v1/projects/${encodeURIComponent(resolved.id)}/deployments/${encodeURIComponent(dep)}/runtime-logs`
      });
      if (!r.ok)
        return {
          summary: '',
          result_json: '',
          system_error: `HTTP ${r.status} ${r.text.slice(0, 800)}`
        };
      return { summary: `已拉取运行时日志`, result_json: safeJson(r.json) };
    }

    return {
      summary: '',
      result_json: '',
      system_error: '未知 action，支持 runtime_logs | deployment_events'
    };
  } catch (e: unknown) {
    return {
      summary: '',
      result_json: '',
      system_error: e instanceof Error ? e.message : String(e)
    };
  }
}
