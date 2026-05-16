export function truncateStringsInValue(
  value: unknown,
  maxLen: number,
  seen = new WeakSet<object>()
): unknown {
  if (value === null || value === undefined) return value;
  if (typeof value === 'string') {
    return value.length > maxLen ? `${value.slice(0, maxLen)}…[truncated]` : value;
  }
  if (typeof value !== 'object') return value;
  if (seen.has(value as object)) return '[Circular]';
  seen.add(value as object);
  if (Array.isArray(value)) {
    return value.map((x) => truncateStringsInValue(x, maxLen, seen));
  }
  const o = value as Record<string, unknown>;
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(o)) {
    out[k] = truncateStringsInValue(v, maxLen, seen);
  }
  return out;
}

export function safeDetailJson(value: unknown, maxStringLen: number): string {
  try {
    return JSON.stringify(truncateStringsInValue(value, maxStringLen));
  } catch {
    return '"[unserializable]"';
  }
}
