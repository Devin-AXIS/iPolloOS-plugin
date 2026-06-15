export function stringifyJson(value: unknown): string {
  return JSON.stringify(value, null, 2);
}

export function parseJsonObject(value: string, label: string): Record<string, unknown> {
  const raw = value.trim();
  if (!raw) return {};
  const fenced = raw.match(/```(?:json)?\s*([\s\S]*?)```/i);
  const candidate = fenced?.[1]?.trim() || raw;
  const parsed = JSON.parse(candidate);
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
    throw new Error(`${label} 必须是 JSON 对象。`);
  }
  return parsed as Record<string, unknown>;
}

export function extractRecords(value: unknown): unknown[] {
  if (Array.isArray(value)) return value;
  if (!value || typeof value !== 'object') return [];
  const record = value as Record<string, unknown>;
  for (const key of ['records', 'items', 'list', 'data']) {
    if (Array.isArray(record[key])) return record[key] as unknown[];
  }
  return [];
}

export function formatRecordsMarkdown(records: unknown[]): string {
  if (records.length === 0) return '暂无记录。';
  return records
    .slice(0, 20)
    .map((item, index) => {
      const record = item && typeof item === 'object' ? (item as Record<string, unknown>) : {};
      const id = String(
        record.id ?? record._recordId ?? record['记录 ID / Record ID'] ?? ''
      ).trim();
      const props =
        record.props && typeof record.props === 'object'
          ? (record.props as Record<string, unknown>)
          : record;
      const title =
        props.title ||
        props.name ||
        props.label ||
        props.goal ||
        props.summary ||
        id ||
        `记录 ${index + 1}`;
      return `${index + 1}. ${String(title)}${id ? ` (${id})` : ''}`;
    })
    .join('\n');
}
