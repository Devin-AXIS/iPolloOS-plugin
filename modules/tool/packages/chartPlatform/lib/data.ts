export type ChartPoint = {
  name: string;
  value: number;
  value2?: number;
  group?: string;
};

export function parsePoints(raw: string | undefined): ChartPoint[] {
  const text = raw?.trim();
  if (!text) return demoPoints();

  try {
    const parsed = JSON.parse(text) as unknown;
    if (Array.isArray(parsed)) {
      return parsed
        .map((item, index) => {
          if (typeof item === 'number') return { name: `Item ${index + 1}`, value: item };
          if (Array.isArray(item)) {
            return {
              name: String(item[0] ?? `Item ${index + 1}`),
              value: Number(item[1] ?? 0),
              value2: item[2] == null ? undefined : Number(item[2])
            };
          }
          if (item && typeof item === 'object') {
            const obj = item as Record<string, unknown>;
            return {
              name: String(obj.name ?? obj.label ?? obj.x ?? `Item ${index + 1}`),
              value: Number(obj.value ?? obj.y ?? 0),
              value2: obj.value2 == null ? undefined : Number(obj.value2),
              group: obj.group == null ? undefined : String(obj.group)
            };
          }
          return undefined;
        })
        .filter((item): item is ChartPoint => !!item && Number.isFinite(item.value));
    }
  } catch {
    // Plain text table is supported below.
  }

  return text
    .split(/\r?\n/)
    .map((line, index) => {
      const parts = line
        .split(/[,，|\t]/)
        .map((part) => part.trim())
        .filter(Boolean);
      if (!parts.length) return undefined;
      return {
        name: parts[0] || `Item ${index + 1}`,
        value: Number(parts[1] ?? 0),
        value2: parts[2] == null ? undefined : Number(parts[2]),
        group: parts[3]
      };
    })
    .filter((item): item is ChartPoint => !!item && Number.isFinite(item.value));
}

export function demoPoints(): ChartPoint[] {
  return [
    { name: 'Jan', value: 42, value2: 28 },
    { name: 'Feb', value: 58, value2: 33 },
    { name: 'Mar', value: 47, value2: 40 },
    { name: 'Apr', value: 76, value2: 52 },
    { name: 'May', value: 69, value2: 61 },
    { name: 'Jun', value: 88, value2: 72 }
  ];
}
