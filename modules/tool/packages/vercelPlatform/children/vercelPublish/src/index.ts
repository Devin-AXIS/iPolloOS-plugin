import { z } from 'zod';
import { VercelAuthFields } from '../../../lib/schemas';
import {
  ensureProject,
  parseFilesJson,
  uploadFilesAndCreateDeployment
} from '../../../lib/deployFromFiles';

const SourceKind = z.enum(['files_json', 'git_json', 'redeploy_only']);

export const InputType = VercelAuthFields.and(
  z.object({
    source_kind: SourceKind,
    project_override: z.string().optional(),
    files_json: z.string().optional(),
    git_json: z.string().optional(),
    redeploy_deployment_id: z.string().optional(),
    create_project_if_missing: z.union([z.boolean(), z.string()]).optional(),
    new_project_name: z.string().optional(),
    target: z.enum(['preview', 'production']).optional(),
    wait_for_ready: z.union([z.boolean(), z.string()]).optional()
  })
);

export const OutputType = z.object({
  deployment_id: z.string(),
  url: z.string(),
  ready_state: z.string(),
  poll_log: z.string(),
  summary: z.string(),
  detail_json: z.string(),
  system_error: z.string().optional()
});

type In = z.infer<typeof InputType>;
type Out = z.infer<typeof OutputType>;

function asBool(v: unknown, defaultVal: boolean): boolean {
  if (v === undefined || v === null) return defaultVal;
  if (typeof v === 'boolean') return v;
  const s = String(v).toLowerCase();
  return s === 'true' || s === '1' || s === 'yes';
}

function safeJsonStringify(x: unknown, max = 24_000): string {
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

  const target = props.target ?? 'preview';
  const wait = asBool(props.wait_for_ready, true);
  const createIf = asBool(props.create_project_if_missing, false);

  const projHint = (
    props.project_override?.trim() ||
    auth.defaultProjectIdOrName ||
    props.new_project_name?.trim() ||
    ''
  ).trim();
  if (!projHint && props.source_kind !== 'redeploy_only') {
    return {
      deployment_id: '',
      url: '',
      ready_state: '',
      poll_log: '',
      summary: '',
      detail_json: '',
      system_error: '请配置插件默认项目，或填写 project_override / new_project_name'
    };
  }

  const projectSeed =
    props.project_override?.trim() ||
    auth.defaultProjectIdOrName?.trim() ||
    props.new_project_name?.trim() ||
    projHint;

  try {
    if (props.source_kind === 'git_json') {
      const raw = props.git_json?.trim() ?? '';
      if (!raw) {
        return {
          deployment_id: '',
          url: '',
          ready_state: '',
          poll_log: '',
          summary: '',
          detail_json: '',
          system_error: 'git_json 不能为空'
        };
      }
      let gitSource: unknown;
      try {
        gitSource = JSON.parse(raw);
      } catch {
        return {
          deployment_id: '',
          url: '',
          ready_state: '',
          poll_log: '',
          summary: '',
          detail_json: '',
          system_error: 'git_json 不是合法 JSON'
        };
      }
      const ensured = await ensureProject(auth, {
        projectName: projectSeed,
        createIfMissing: createIf
      });
      if (!ensured.ok) {
        return {
          deployment_id: '',
          url: '',
          ready_state: '',
          poll_log: '',
          summary: '',
          detail_json: '',
          system_error: ensured.error
        };
      }
      const res = await uploadFilesAndCreateDeployment(auth, {
        projectIdOrName: ensured.projectIdOrName,
        files: [],
        target,
        waitForReady: wait,
        redeployDeploymentId: props.redeploy_deployment_id?.trim() || undefined,
        gitSource
      });
      return {
        deployment_id: res.deploymentId,
        url: res.url,
        ready_state: res.readyState,
        poll_log: res.pollLog,
        summary: `Git 部署已触发：${res.deploymentId}，状态 ${res.readyState}`,
        detail_json: safeJsonStringify(res.rawCreate)
      };
    }

    if (props.source_kind === 'redeploy_only') {
      const rid = props.redeploy_deployment_id?.trim() ?? '';
      if (!rid) {
        return {
          deployment_id: '',
          url: '',
          ready_state: '',
          poll_log: '',
          summary: '',
          detail_json: '',
          system_error: 'redeploy_only 时必须填写 redeploy_deployment_id'
        };
      }
      const ensured = await ensureProject(auth, {
        projectName: projectSeed,
        createIfMissing: false
      });
      if (!ensured.ok) {
        return {
          deployment_id: '',
          url: '',
          ready_state: '',
          poll_log: '',
          summary: '',
          detail_json: '',
          system_error: ensured.error
        };
      }
      const res = await uploadFilesAndCreateDeployment(auth, {
        projectIdOrName: ensured.projectIdOrName,
        files: [],
        target,
        waitForReady: wait,
        redeployDeploymentId: rid
      });
      return {
        deployment_id: res.deploymentId,
        url: res.url,
        ready_state: res.readyState,
        poll_log: res.pollLog,
        summary: `已重新部署：${res.deploymentId}`,
        detail_json: safeJsonStringify(res.rawCreate)
      };
    }

    const rawFiles = props.files_json?.trim() ?? '';
    if (!rawFiles) {
      return {
        deployment_id: '',
        url: '',
        ready_state: '',
        poll_log: '',
        summary: '',
        detail_json: '',
        system_error: 'files_json 不能为空（source_kind=files_json）'
      };
    }
    const parsed = parseFilesJson(rawFiles);
    if ('error' in parsed) {
      return {
        deployment_id: '',
        url: '',
        ready_state: '',
        poll_log: '',
        summary: '',
        detail_json: '',
        system_error: parsed.error
      };
    }

    const ensured = await ensureProject(auth, {
      projectName: projectSeed,
      createIfMissing: createIf
    });
    if (!ensured.ok) {
      return {
        deployment_id: '',
        url: '',
        ready_state: '',
        poll_log: '',
        summary: '',
        detail_json: '',
        system_error: ensured.error
      };
    }

    const res = await uploadFilesAndCreateDeployment(auth, {
      projectIdOrName: ensured.projectIdOrName,
      files: parsed,
      target,
      waitForReady: wait,
      redeployDeploymentId: props.redeploy_deployment_id?.trim() || undefined
    });

    return {
      deployment_id: res.deploymentId,
      url: res.url,
      ready_state: res.readyState,
      poll_log: res.pollLog,
      summary: `已上传 ${parsed.length} 个文件并创建部署 ${res.deploymentId}，状态 ${res.readyState}`,
      detail_json: safeJsonStringify(res.rawCreate)
    };
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    return {
      deployment_id: '',
      url: '',
      ready_state: '',
      poll_log: '',
      summary: '',
      detail_json: '',
      system_error: msg
    };
  }
}
