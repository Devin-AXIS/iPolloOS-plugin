const SEGMENT_MAX = 200;

export function sanitizeSegment(raw: string): string {
  const t = raw.trim();
  if (!t) return '_';
  const s = t.replace(/[^a-zA-Z0-9._-]/g, '_').slice(0, SEGMENT_MAX);
  return s || '_';
}

export function normalizeRelativeKey(relativeKey: string): string {
  const t = relativeKey.trim().replace(/^\/+/, '');
  if (!t) throw new Error('保存路径不能为空');
  const parts = t.split(/\/+/).filter(Boolean);
  for (const p of parts) {
    if (p === '..' || p === '.') throw new Error('路径不能包含 . 或 ..');
  }
  return parts.join('/');
}

export type IsolationScope = 'sites' | 'files';

export function buildIsolationPrefix(params: {
  appId: string;
  userId: string;
  chatId: string;
  scope: IsolationScope;
}): string {
  const base = [
    'ipolloos',
    sanitizeSegment(params.appId),
    sanitizeSegment(params.userId),
    sanitizeSegment(params.chatId),
    params.scope
  ].join('/');
  return `${base}/`;
}

export function buildObjectKey(prefix: string, relativeKey: string): string {
  return `${prefix}${normalizeRelativeKey(relativeKey)}`;
}
