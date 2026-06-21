export function stringifyJson(value: unknown): string {
  return JSON.stringify(value, null, 2);
}

export function parseJsonObject(value: string | undefined, label: string): Record<string, unknown> {
  const text = String(value ?? '').trim();
  if (!text) return {};
  try {
    const parsed = JSON.parse(text) as unknown;
    if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
      return parsed as Record<string, unknown>;
    }
  } catch {
    // fall through
  }
  throw new Error(`${label} 必须是 JSON 对象。`);
}

export function parseJsonArray(
  value: string | undefined,
  label: string
): Array<Record<string, unknown>> {
  const text = String(value ?? '').trim();
  if (!text) return [];
  try {
    const parsed = JSON.parse(text) as unknown;
    if (Array.isArray(parsed)) {
      return parsed.filter(
        (item): item is Record<string, unknown> =>
          Boolean(item) && typeof item === 'object' && !Array.isArray(item)
      );
    }
  } catch {
    // fall through
  }
  throw new Error(`${label} 必须是 JSON 数组。`);
}

export function firstText(...values: unknown[]): string | undefined {
  for (const value of values) {
    if (typeof value === 'string' && value.trim()) return value.trim();
  }
  return undefined;
}

export function firstNumber(...values: unknown[]): number | undefined {
  for (const value of values) {
    if (typeof value === 'number' && Number.isFinite(value)) return value;
    if (typeof value === 'string' && value.trim()) {
      const n = Number(value);
      if (Number.isFinite(n)) return n;
    }
  }
  return undefined;
}

export function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}
