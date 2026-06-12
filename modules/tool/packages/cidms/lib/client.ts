import type { CidmsAuth } from './schemas';

export function normalizeCidmsBaseUrl(baseUrl: string): string {
  return baseUrl.trim().replace(/\/+$/, '');
}

export function cidmsUrl(auth: CidmsAuth, path: string): string {
  const normalizedPath = path.startsWith('/') ? path : `/${path}`;
  return `${normalizeCidmsBaseUrl(auth.cidms_base_url)}${normalizedPath}`;
}

export function cidmsApiKey(auth: CidmsAuth): string {
  return (auth.seedance_api_key || auth.cidms_api_key).trim();
}

export async function cidmsJsonRequest<T>({
  auth,
  path,
  method,
  body,
  timeoutMs = 180_000
}: {
  auth: CidmsAuth;
  path: string;
  method: 'GET' | 'POST';
  body?: unknown;
  timeoutMs?: number;
}): Promise<T> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const res = await fetch(cidmsUrl(auth, path), {
      method,
      headers: {
        Authorization: `Bearer ${cidmsApiKey(auth)}`,
        Accept: 'application/json',
        ...(body === undefined ? {} : { 'Content-Type': 'application/json' })
      },
      body: body === undefined ? undefined : JSON.stringify(body),
      signal: controller.signal
    });

    const text = await res.text();
    const data = parseJson(text);

    if (!res.ok) {
      throw new Error(formatCidmsError(res.status, data, text));
    }

    return data as T;
  } finally {
    clearTimeout(timer);
  }
}

function parseJson(text: string): unknown {
  if (!text.trim()) return null;
  try {
    return JSON.parse(text);
  } catch {
    return { raw: text.slice(0, 4000) };
  }
}

export function formatCidmsError(status: number, data: unknown, fallbackText: string): string {
  if (data && typeof data === 'object') {
    const err = (data as Record<string, unknown>).error;
    if (err && typeof err === 'object') {
      const e = err as Record<string, unknown>;
      const code = typeof e.code === 'string' ? e.code : '';
      const message = typeof e.message === 'string' ? e.message : '';
      const param = typeof e.param === 'string' ? ` (${e.param})` : '';
      return `CIDMS HTTP ${status}${code ? ` ${code}` : ''}: ${message || fallbackText.slice(0, 1000)}${param}`;
    }
  }
  return `CIDMS HTTP ${status}: ${fallbackText.slice(0, 1000)}`;
}

export function safeJson(data: unknown, max = 24_000): string {
  const text = JSON.stringify(data ?? null);
  return text.length > max ? `${text.slice(0, max)}...` : text;
}
