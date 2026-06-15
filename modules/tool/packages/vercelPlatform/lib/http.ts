const VERCEL_API = 'https://api.vercel.com';

export type VercelHttpResult = {
  ok: boolean;
  status: number;
  json: unknown;
  text: string;
};

function buildUrl(
  path: string,
  teamId: string | undefined,
  query?: Record<string, string | undefined>
) {
  const u = new URL(
    path.startsWith('http') ? path : `${VERCEL_API}${path.startsWith('/') ? path : `/${path}`}`
  );
  if (teamId) u.searchParams.set('teamId', teamId);
  if (query) {
    for (const [k, v] of Object.entries(query)) {
      if (v !== undefined && v !== '') u.searchParams.set(k, v);
    }
  }
  return u;
}

export async function vercelJsonRequest(opts: {
  token: string;
  teamId?: string;
  method: string;
  path: string;
  query?: Record<string, string | undefined>;
  body?: unknown;
}): Promise<VercelHttpResult> {
  const u = buildUrl(opts.path, opts.teamId, opts.query);
  const headers: Record<string, string> = {
    Authorization: `Bearer ${opts.token}`
  };
  let body: string | undefined;
  if (opts.body !== undefined) {
    headers['Content-Type'] = 'application/json';
    body = typeof opts.body === 'string' ? opts.body : JSON.stringify(opts.body);
  }
  const res = await fetch(u, { method: opts.method.toUpperCase(), headers, body });
  const text = await res.text();
  let json: unknown = null;
  try {
    json = text ? JSON.parse(text) : null;
  } catch {
    json = null;
  }
  return { ok: res.ok, status: res.status, json, text };
}

export async function vercelUploadFile(opts: {
  token: string;
  teamId?: string;
  digestSha1Hex: string;
  bytes: Buffer;
}): Promise<VercelHttpResult> {
  const u = buildUrl('/v2/files', opts.teamId);
  const res = await fetch(u, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${opts.token}`,
      'Content-Type': 'application/octet-stream',
      'x-vercel-digest': opts.digestSha1Hex,
      'Content-Length': String(opts.bytes.length)
    },
    body: new Uint8Array(opts.bytes)
  });
  const text = await res.text();
  let json: unknown = null;
  try {
    json = text ? JSON.parse(text) : null;
  } catch {
    json = null;
  }
  return { ok: res.ok, status: res.status, json, text };
}
