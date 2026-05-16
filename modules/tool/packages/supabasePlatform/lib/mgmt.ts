/** Supabase Management API https://supabase.com/docs/reference/api */

export function normalizeMgmtBase(raw?: string): string {
  const d = 'https://api.supabase.com';
  const t = raw?.trim();
  return t ? t.replace(/\/+$/, '') : d;
}

export type MgmtResult = {
  ok: boolean;
  status: number;
  json: unknown;
  text: string;
};

export async function supabaseMgmt(
  token: string,
  baseUrl: string,
  method: string,
  path: string,
  options?: { query?: Record<string, string | undefined>; body?: unknown }
): Promise<MgmtResult> {
  const q = new URLSearchParams();
  if (options?.query) {
    for (const [k, v] of Object.entries(options.query)) {
      if (v !== undefined && v !== '') q.set(k, v);
    }
  }
  const p = path.startsWith('/') ? path : `/${path}`;
  const qs = q.toString();
  const url = `${baseUrl.replace(/\/+$/, '')}${p}${qs ? `?${qs}` : ''}`;

  const headers: Record<string, string> = {
    Authorization: `Bearer ${token}`,
    Accept: 'application/json'
  };

  const init: RequestInit = { method, headers };
  const m = method.toUpperCase();
  if (options?.body !== undefined && m !== 'GET' && m !== 'HEAD') {
    headers['Content-Type'] = 'application/json';
    init.body = typeof options.body === 'string' ? options.body : JSON.stringify(options.body);
  }

  const res = await fetch(url, init);
  const text = await res.text();
  let json: unknown = null;
  try {
    json = text ? JSON.parse(text) : null;
  } catch {
    json = { _raw: text.slice(0, 8000) };
  }
  return { ok: res.ok, status: res.status, json, text };
}

export function buildPath(template: string, vars: Record<string, string>): string {
  let out = template;
  for (const [k, v] of Object.entries(vars)) {
    out = out.split(`:${k}`).join(encodeURIComponent(v));
  }
  if (out.includes(':')) {
    throw new Error(`路径仍有未替换占位符: ${out}`);
  }
  return out;
}
