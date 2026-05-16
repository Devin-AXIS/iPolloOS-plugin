/** 阿里云 SDK Tea Model → 尽量可 JSON.stringify */
export function toPlain(v: unknown): unknown {
  if (v === null || typeof v !== 'object') return v;
  if (typeof (v as { toMap?: () => unknown }).toMap === 'function') {
    return (v as { toMap: () => unknown }).toMap();
  }
  if (Array.isArray(v)) return v.map(toPlain);
  const out: Record<string, unknown> = {};
  for (const [k, val] of Object.entries(v)) out[k] = toPlain(val);
  return out;
}

export function safeDetailJson(data: unknown, max: number): string {
  try {
    const plain = typeof data === 'object' ? toPlain(data) : data;
    const s = JSON.stringify(plain, null, 0);
    if (s.length <= max) return s;
    return `${s.slice(0, max)}…`;
  } catch {
    return '"[unserializable]"';
  }
}
