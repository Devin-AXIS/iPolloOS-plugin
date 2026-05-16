/** Manus API v2：https://open.manus.ai/docs/v2/introduction */
export function normalizeBaseUrl(raw?: string): string {
  const d = 'https://api.manus.ai';
  const t = raw?.trim();
  if (!t) return d;
  return t.replace(/\/+$/, '');
}

export function splitCsv(s?: string): string[] | undefined {
  const xs = (s ?? '')
    .split(',')
    .map((x) => x.trim())
    .filter(Boolean);
  return xs.length ? xs : undefined;
}

async function parseJson(res: Response): Promise<unknown> {
  try {
    return await res.json();
  } catch {
    const txt = await res.text();
    throw new Error(txt || `HTTP ${res.status}`);
  }
}

export async function manusPost<T extends Record<string, unknown>>(
  apiKey: string,
  baseUrl: string,
  path: string,
  body: unknown
): Promise<T> {
  const url = `${normalizeBaseUrl(baseUrl)}${path.startsWith('/') ? path : `/${path}`}`;
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-manus-api-key': apiKey
    },
    body: JSON.stringify(body ?? {})
  });
  const json = (await parseJson(res)) as {
    ok?: boolean;
    error?: { message?: string; code?: string };
  };
  if (!res.ok || json.ok === false) {
    const msg =
      typeof json?.error?.message === 'string'
        ? json.error.message
        : typeof (json as { message?: string }).message === 'string'
          ? (json as { message: string }).message
          : `HTTP ${res.status}`;
    throw new Error(msg);
  }
  return json as T;
}

export async function manusGet<T extends Record<string, unknown>>(
  apiKey: string,
  baseUrl: string,
  pathWithQuery: string
): Promise<T> {
  const url = `${normalizeBaseUrl(baseUrl)}${
    pathWithQuery.startsWith('/') ? pathWithQuery : `/${pathWithQuery}`
  }`;
  const res = await fetch(url, {
    method: 'GET',
    headers: {
      'x-manus-api-key': apiKey
    }
  });
  const json = (await parseJson(res)) as { ok?: boolean; error?: { message?: string } };
  if (!res.ok || json.ok === false) {
    const msg =
      typeof json?.error?.message === 'string' ? json.error.message : `HTTP ${res.status}`;
    throw new Error(msg);
  }
  return json as T;
}

export function buildQuery(params: Record<string, string | number | boolean | undefined>): string {
  const sp = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) {
    if (v === undefined || v === '') continue;
    sp.set(k, String(v));
  }
  const qs = sp.toString();
  return qs ? `?${qs}` : '';
}
