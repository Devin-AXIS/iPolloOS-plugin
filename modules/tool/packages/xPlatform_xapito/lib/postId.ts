export function normalizePostId(rawId: unknown): string {
  const text = String(rawId ?? '').trim();
  if (!text) return '';

  const direct = text.match(/\d+/)?.[0];
  if (direct && text.startsWith(direct)) return direct;

  try {
    const decoded = Buffer.from(text, 'base64').toString('utf8');
    const decodedId = decoded.match(/\d+/)?.[0];
    if (decodedId) return decodedId;
  } catch {
    // Not a base64 value; fall through to the generic numeric extraction.
  }

  return direct ?? '';
}

export function comparePostIds(a: string | null | undefined, b: string | null | undefined): number {
  const left = normalizePostId(a);
  const right = normalizePostId(b);
  if (!left && !right) return 0;
  if (!left) return -1;
  if (!right) return 1;

  const ai = BigInt(left);
  const bi = BigInt(right);
  return ai === bi ? 0 : ai > bi ? 1 : -1;
}
