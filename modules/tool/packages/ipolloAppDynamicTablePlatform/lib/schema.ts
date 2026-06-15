import { z } from 'zod';

export const emptyToUndefined = (value: unknown) =>
  value === '' || value === null || value === undefined ? undefined : value;

export const DynamicTableFieldSchema = z
  .object({
    key: z.string().min(1),
    label: z.string().min(1),
    type: z.string().min(1).default('text'),
    description: z.string().optional(),
    required: z.boolean().optional(),
    showInList: z.boolean().optional(),
    showInForm: z.boolean().optional(),
    showInDetail: z.boolean().optional(),
    placeholder: z.string().optional(),
    options: z
      .array(z.union([z.string(), z.object({ label: z.string(), value: z.any() })]))
      .optional(),
    preset: z.string().optional(),
    validators: z.record(z.string(), z.any()).optional(),
    config: z.record(z.string(), z.any()).optional()
  })
  .passthrough();

export const DynamicTableSchema = z
  .object({
    key: z.string().optional(),
    name: z.string().min(1),
    nameEn: z.string().optional(),
    slug: z.string().optional(),
    description: z.string().optional(),
    kind: z.string().optional(),
    fields: z.array(DynamicTableFieldSchema).min(1)
  })
  .passthrough();

export const DynamicTablesPlanSchema = z
  .object({
    moduleName: z.string().optional(),
    moduleKey: z.string().optional(),
    tables: z.array(DynamicTableSchema).min(1)
  })
  .passthrough();

export type DynamicTablesPlan = z.infer<typeof DynamicTablesPlanSchema>;
export type DynamicTable = z.infer<typeof DynamicTableSchema>;
export type DynamicTableField = z.infer<typeof DynamicTableFieldSchema>;

export function stringifyJson(value: unknown): string {
  return JSON.stringify(value, null, 2);
}

export function parseJsonInput(value: string): unknown {
  const raw = value.trim();
  if (!raw) throw new Error('建表内容不能为空。');

  const fenced = raw.match(/```(?:json)?\s*([\s\S]*?)```/i);
  const candidate = fenced?.[1]?.trim() || raw;
  try {
    return JSON.parse(candidate);
  } catch {
    throw new Error(
      '建表内容需要是 JSON。建议传入 {"tables":[{"name":"健身档案","fields":[...]}]}。'
    );
  }
}

export function normalizeDynamicTablesPlan(value: string): DynamicTablesPlan {
  const parsed = parseJsonInput(value);
  if (Array.isArray(parsed)) {
    return DynamicTablesPlanSchema.parse({ tables: parsed });
  }
  if (
    parsed &&
    typeof parsed === 'object' &&
    Array.isArray((parsed as Record<string, unknown>).tables)
  ) {
    return DynamicTablesPlanSchema.parse(parsed);
  }
  if (
    parsed &&
    typeof parsed === 'object' &&
    Array.isArray((parsed as Record<string, unknown>).fields)
  ) {
    return DynamicTablesPlanSchema.parse({ tables: [parsed] });
  }
  throw new Error('建表内容必须包含 tables 数组，或是一张表对象。');
}

export function safeSlug(value: string, fallback = 'table'): string {
  const slug = value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9_\-\u4e00-\u9fa5]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60);
  return slug || fallback;
}

const storageTypeMap: Record<string, string> = {
  textarea: 'text',
  phone: 'text',
  email: 'text',
  time: 'text',
  datetime: 'text',
  date_range: 'json',
  time_range: 'json',
  city_select: 'json',
  schedule_rule: 'json',
  country_select: 'select',
  timezone_select: 'select',
  radio: 'select',
  multi_select: 'multiselect',
  checkbox: 'boolean',
  switch: 'boolean',
  icon_select: 'select',
  icon_multi_select: 'multiselect',
  color: 'text',
  color_palette: 'multiselect',
  template_cards: 'json',
  dynamic_select: 'select',
  dynamic_multi_select: 'multiselect',
  cover: 'image'
};

export function normalizeStorageFieldType(type: string): string {
  const normalized = type.trim();
  return storageTypeMap[normalized] || normalized || 'text';
}

export function getTableKey(table: DynamicTable): string {
  return safeSlug(table.key || table.slug || table.name, 'agent_table');
}
