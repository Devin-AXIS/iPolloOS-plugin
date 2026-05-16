import { vercelJsonRequest, vercelUploadFile } from './http';
import { sha1Hex } from './sha1';
import type { VercelAuthFieldsIn } from './schemas';

const MAX_FILES = 120;
const MAX_TOTAL_BYTES = 22 * 1024 * 1024;

export type FileEntry = { path: string; text?: string; base64?: string };

export async function ensureProject(
  auth: VercelAuthFieldsIn,
  opts: { projectName: string; createIfMissing: boolean }
): Promise<{ ok: true; projectIdOrName: string } | { ok: false; error: string }> {
  const name = opts.projectName.trim();
  if (!name) return { ok: false, error: '项目名称为空' };

  const got = await vercelJsonRequest({
    token: auth.vercelToken,
    teamId: auth.vercelTeamId,
    method: 'GET',
    path: `/v9/projects/${encodeURIComponent(name)}`
  });
  if (got.ok && got.json && typeof got.json === 'object' && 'id' in (got.json as object)) {
    return { ok: true, projectIdOrName: (got.json as { id: string }).id };
  }

  if (!opts.createIfMissing) {
    return { ok: false, error: `项目不存在且未开启自动创建：${name}（HTTP ${got.status}）` };
  }

  const created = await vercelJsonRequest({
    token: auth.vercelToken,
    teamId: auth.vercelTeamId,
    method: 'POST',
    path: '/v11/projects',
    body: { name }
  });
  if (
    !created.ok ||
    !created.json ||
    typeof created.json !== 'object' ||
    !('id' in (created.json as object))
  ) {
    return {
      ok: false,
      error: `创建项目失败：${created.text.slice(0, 800)}`
    };
  }
  return { ok: true, projectIdOrName: (created.json as { id: string }).id };
}

export async function uploadFilesAndCreateDeployment(
  auth: VercelAuthFieldsIn,
  opts: {
    projectIdOrName: string;
    files: FileEntry[];
    target: 'production' | 'preview';
    waitForReady: boolean;
    redeployDeploymentId?: string;
    gitSource?: unknown;
  }
): Promise<{
  deploymentId: string;
  url: string;
  readyState: string;
  pollLog: string;
  rawCreate: unknown;
}> {
  if (opts.gitSource) {
    const body: Record<string, unknown> = {
      name: opts.projectIdOrName,
      project: opts.projectIdOrName,
      gitSource: opts.gitSource,
      target: opts.target
    };
    if (opts.redeployDeploymentId) body.deploymentId = opts.redeployDeploymentId;
    const created = await vercelJsonRequest({
      token: auth.vercelToken,
      teamId: auth.vercelTeamId,
      method: 'POST',
      path: '/v13/deployments',
      body
    });
    if (!created.ok) {
      throw new Error(`创建部署失败（git）：HTTP ${created.status} ${created.text.slice(0, 1200)}`);
    }
    const dep = created.json as { id?: string; url?: string; readyState?: string };
    const deploymentId = dep.id ?? '';
    if (!deploymentId) throw new Error('创建部署成功但未返回 id');
    const { readyState, pollLog } = await maybePoll(auth, deploymentId, opts.waitForReady);
    return {
      deploymentId,
      url: dep.url ?? '',
      readyState,
      pollLog,
      rawCreate: created.json
    };
  }

  if (opts.redeployDeploymentId && opts.files.length === 0) {
    const body = {
      name: opts.projectIdOrName,
      project: opts.projectIdOrName,
      deploymentId: opts.redeployDeploymentId,
      target: opts.target
    };
    const created = await vercelJsonRequest({
      token: auth.vercelToken,
      teamId: auth.vercelTeamId,
      method: 'POST',
      path: '/v13/deployments',
      body
    });
    if (!created.ok) {
      throw new Error(`重新部署失败：HTTP ${created.status} ${created.text.slice(0, 1200)}`);
    }
    const dep = created.json as { id?: string; url?: string; readyState?: string };
    const deploymentId = dep.id ?? '';
    if (!deploymentId) throw new Error('重新部署未返回 id');
    const { readyState, pollLog } = await maybePoll(auth, deploymentId, opts.waitForReady);
    return {
      deploymentId,
      url: dep.url ?? '',
      readyState,
      pollLog,
      rawCreate: created.json
    };
  }

  let total = 0;
  const fileDescriptors: { file: string; sha: string; size: number }[] = [];

  for (const f of opts.files) {
    let buf: Buffer;
    if (f.text !== undefined) {
      buf = Buffer.from(f.text, 'utf8');
    } else if (f.base64 !== undefined) {
      buf = Buffer.from(f.base64, 'base64');
    } else {
      throw new Error(`文件缺少 text/base64：${f.path}`);
    }
    total += buf.length;
    if (total > MAX_TOTAL_BYTES) {
      throw new Error(`文件总体积超过 ${MAX_TOTAL_BYTES / 1024 / 1024}MB 上限`);
    }
    const digest = sha1Hex(buf);
    const up = await vercelUploadFile({
      token: auth.vercelToken,
      teamId: auth.vercelTeamId,
      digestSha1Hex: digest,
      bytes: buf
    });
    if (!up.ok) {
      throw new Error(`上传文件失败 ${f.path}：HTTP ${up.status} ${up.text.slice(0, 400)}`);
    }
    fileDescriptors.push({ file: f.path.replace(/^\//, ''), sha: digest, size: buf.length });
  }

  const body: Record<string, unknown> = {
    name: opts.projectIdOrName,
    project: opts.projectIdOrName,
    files: fileDescriptors,
    target: opts.target
  };
  if (opts.redeployDeploymentId) body.deploymentId = opts.redeployDeploymentId;

  const created = await vercelJsonRequest({
    token: auth.vercelToken,
    teamId: auth.vercelTeamId,
    method: 'POST',
    path: '/v13/deployments',
    body
  });
  if (!created.ok) {
    throw new Error(`创建部署失败：HTTP ${created.status} ${created.text.slice(0, 1200)}`);
  }
  const dep = created.json as { id?: string; url?: string; readyState?: string };
  const deploymentId = dep.id ?? '';
  if (!deploymentId) throw new Error('创建部署成功但未返回 id');
  const { readyState, pollLog } = await maybePoll(auth, deploymentId, opts.waitForReady);
  return {
    deploymentId,
    url: dep.url ?? '',
    readyState,
    pollLog,
    rawCreate: created.json
  };
}

async function maybePoll(
  auth: VercelAuthFieldsIn,
  deploymentId: string,
  wait: boolean
): Promise<{ readyState: string; pollLog: string }> {
  if (!wait) {
    return { readyState: 'UNKNOWN', pollLog: '未轮询（wait_for_ready=false）' };
  }
  const lines: string[] = [];
  for (let i = 0; i < 45; i++) {
    const r = await vercelJsonRequest({
      token: auth.vercelToken,
      teamId: auth.vercelTeamId,
      method: 'GET',
      path: `/v13/deployments/${encodeURIComponent(deploymentId)}`
    });
    if (!r.ok || !r.json || typeof r.json !== 'object') {
      lines.push(`poll ${i}: HTTP ${r.status}`);
      await sleep(2500);
      continue;
    }
    const st =
      (r.json as { readyState?: string; state?: string }).readyState ??
      (r.json as { state?: string }).state ??
      '';
    lines.push(`poll ${i}: ${st || '?'}`);
    if (st === 'READY' || st === 'ERROR' || st === 'CANCELED') {
      return { readyState: st, pollLog: lines.join('\n') };
    }
    await sleep(2500);
  }
  return { readyState: 'TIMEOUT', pollLog: lines.join('\n') };
}

function sleep(ms: number) {
  return new Promise((res) => setTimeout(res, ms));
}

export function parseFilesJson(raw: string): FileEntry[] | { error: string } {
  let data: unknown;
  try {
    data = JSON.parse(raw.trim());
  } catch {
    return { error: 'files_json 不是合法 JSON' };
  }
  if (!Array.isArray(data)) return { error: 'files_json 须为数组' };
  if (data.length > MAX_FILES) return { error: `文件数超过 ${MAX_FILES}` };
  const out: FileEntry[] = [];
  for (const item of data) {
    if (!item || typeof item !== 'object') return { error: '条目格式错误' };
    const path = String((item as { path?: string }).path ?? '').replace(/^\//, '');
    if (!path || path.includes('..')) return { error: `非法路径：${path}` };
    const text = (item as { text?: string }).text;
    const base64 = (item as { base64?: string }).base64;
    if (text !== undefined && base64 !== undefined)
      return { error: `不能同时有 text 与 base64：${path}` };
    if (text === undefined && base64 === undefined) return { error: `缺少 text/base64：${path}` };
    out.push(text !== undefined ? { path, text } : { path, base64: base64! });
  }
  return out;
}
