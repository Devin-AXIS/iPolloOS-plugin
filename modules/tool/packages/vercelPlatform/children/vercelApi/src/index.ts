import { z } from 'zod';
import { VercelAuthFields } from '../../../lib/schemas';
import { vercelJsonRequest } from '../../../lib/http';

export const InputType = VercelAuthFields.and(
  z.object({
    http_method: z.string().min(1),
    path: z.string().min(1),
    query_json: z.string().optional(),
    body_json: z.string().optional()
  })
);

export const OutputType = z.object({
  status: z.string(),
  result_json: z.string(),
  result_text: z.string(),
  system_error: z.string().optional()
});

type In = z.infer<typeof InputType>;
type Out = z.infer<typeof OutputType>;

const ALLOWED_PATH = /^\/v[0-9]+\//;
const METHODS = new Set(['GET', 'POST', 'PUT', 'PATCH', 'DELETE']);

function safeJson(x: unknown, max = 120_000): string {
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

  const method = props.http_method.trim().toUpperCase();
  const path = props.path.trim().split('?')[0];

  if (!ALLOWED_PATH.test(path)) {
    return {
      status: '',
      result_json: '',
      result_text: '',
      system_error: 'path 必须以 /v数字/ 开头（官方 REST 版本前缀）'
    };
  }
  if (path.includes('..')) {
    return { status: '', result_json: '', result_text: '', system_error: '非法 path' };
  }
  if (!METHODS.has(method)) {
    return {
      status: '',
      result_json: '',
      result_text: '',
      system_error: `不支持的 HTTP 方法：${method}`
    };
  }

  let query: Record<string, string | undefined> | undefined;
  const qraw = props.query_json?.trim();
  if (qraw) {
    try {
      const o = JSON.parse(qraw) as Record<string, unknown>;
      query = {};
      for (const [k, v] of Object.entries(o)) {
        if (v === undefined || v === null) continue;
        query[k] = String(v);
      }
    } catch {
      return {
        status: '',
        result_json: '',
        result_text: '',
        system_error: 'query_json 不是合法 JSON'
      };
    }
  }

  let body: unknown = undefined;
  const braw = props.body_json?.trim();
  if (braw) {
    try {
      body = JSON.parse(braw);
    } catch {
      return {
        status: '',
        result_json: '',
        result_text: '',
        system_error: 'body_json 不是合法 JSON'
      };
    }
  }

  if (method === 'GET' && body !== undefined) {
    return {
      status: '',
      result_json: '',
      result_text: '',
      system_error: `GET 不应携带 body_json`
    };
  }

  try {
    const r = await vercelJsonRequest({
      token: auth.vercelToken,
      teamId: auth.vercelTeamId,
      method,
      path,
      query,
      body: body !== undefined ? body : undefined
    });
    return {
      status: String(r.status),
      result_json: r.json !== null ? safeJson(r.json) : '',
      result_text: r.text.slice(0, 200_000),
      system_error: r.ok ? undefined : `HTTP ${r.status}`
    };
  } catch (e: unknown) {
    return {
      status: '',
      result_json: '',
      result_text: '',
      system_error: e instanceof Error ? e.message : String(e)
    };
  }
}
