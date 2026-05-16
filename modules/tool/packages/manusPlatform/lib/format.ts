export function truncateStringsInValue(
  value: unknown,
  maxLen: number,
  seen = new WeakSet<object>()
): unknown {
  if (value === null || value === undefined) return value;
  if (typeof value === 'string') {
    return value.length > maxLen
      ? `${value.slice(0, maxLen)}\n…[truncated ${value.length - maxLen} chars]`
      : value;
  }
  if (typeof value !== 'object') return value;
  if (seen.has(value as object)) return '[Circular]';
  seen.add(value as object);
  if (Array.isArray(value)) {
    return value.map((item) => truncateStringsInValue(item, maxLen, seen));
  }
  const obj = value as Record<string, unknown>;
  const out: Record<string, unknown> = {};
  for (const key of Object.keys(obj)) {
    out[key] = truncateStringsInValue(obj[key], maxLen, seen);
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
