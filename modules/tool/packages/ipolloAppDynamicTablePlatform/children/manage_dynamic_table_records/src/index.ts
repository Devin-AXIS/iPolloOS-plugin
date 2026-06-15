import { getErrText } from '@tool/utils/err';
import type { RunToolSecondParamsType } from '@tool/type/req';
import { z } from 'zod';
import {
  deleteDynamicTableRecord,
  insertDynamicTableRecord,
  queryDynamicTableRecords,
  resolveDynamicTableDirectory,
  updateDynamicTableRecord
} from '../../../lib/api';
import {
  extractRecords,
  formatRecordsMarkdown,
  parseJsonObject,
  stringifyJson
} from '../../../lib/format';
import { resolveDynamicTableRuntimeContext } from '../../../lib/runtime';
import { emptyToUndefined } from '../../../lib/schema';

const ActionSchema = z.enum(['query', 'insert', 'update', 'delete']);

export const InputType = z.object({
  action: ActionSchema.default('query'),
  table: z.string().min(1),
  filter_json: z.preprocess(emptyToUndefined, z.string().optional()),
  search: z.preprocess(emptyToUndefined, z.string().optional()),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  record_json: z.preprocess(emptyToUndefined, z.string().optional()),
  record_id: z.preprocess(emptyToUndefined, z.string().optional()),
  patch_json: z.preprocess(emptyToUndefined, z.string().optional())
});

export const OutputType = z.object({
  ok: z.boolean(),
  operation: z.string(),
  records_json: z.string(),
  records_markdown: z.string(),
  record_json: z.string(),
  count: z.number(),
  action_json: z.string(),
  system_error: z.string().optional()
});

type In = z.infer<typeof InputType>;
type Out = z.infer<typeof OutputType>;

function requireString(value: string | undefined, label: string): string {
  const text = String(value ?? '').trim();
  if (!text) throw new Error(`${label}不能为空。`);
  return text;
}

const emptyResult = (action = ''): Out => ({
  ok: false,
  operation: action,
  records_json: '[]',
  records_markdown: '',
  record_json: '',
  count: 0,
  action_json: ''
});

export async function tool(props: In, runtime?: RunToolSecondParamsType): Promise<Out> {
  const action = String(props.action || 'query');

  try {
    const input = InputType.parse(props);
    const context = resolveDynamicTableRuntimeContext({ requireUser: false }, runtime?.systemVar);
    const directory = await resolveDynamicTableDirectory(context, input.table);
    const baseAction = {
      action: input.action,
      applicationId: context.applicationId,
      agentId: context.agentId,
      table: input.table,
      directoryId: directory.id
    };

    if (input.action === 'query') {
      const filter = input.filter_json ? parseJsonObject(input.filter_json, '筛选条件') : undefined;
      const raw = await queryDynamicTableRecords(context, {
        directoryId: directory.id,
        filter,
        search: input.search,
        limit: input.limit
      });
      const records = extractRecords(raw);
      const actionJson = { ...baseAction, filter, count: records.length };

      return {
        ok: true,
        operation: input.action,
        records_json: stringifyJson(records),
        records_markdown: formatRecordsMarkdown(records),
        record_json: '',
        count: records.length,
        action_json: stringifyJson(actionJson)
      };
    }

    if (input.action === 'insert') {
      const record = parseJsonObject(requireString(input.record_json, '记录内容'), '记录内容');
      const raw = await insertDynamicTableRecord(context, { directoryId: directory.id, record });

      return {
        ok: true,
        operation: input.action,
        records_json: '[]',
        records_markdown: '',
        record_json: stringifyJson(raw),
        count: 1,
        action_json: stringifyJson(baseAction)
      };
    }

    if (input.action === 'update') {
      const recordId = requireString(input.record_id, '记录 ID');
      const patch = parseJsonObject(requireString(input.patch_json, '更新内容'), '更新内容');
      const raw = await updateDynamicTableRecord(context, {
        directoryId: directory.id,
        recordId,
        patch
      });

      return {
        ok: true,
        operation: input.action,
        records_json: '[]',
        records_markdown: '',
        record_json: stringifyJson(raw),
        count: 1,
        action_json: stringifyJson({ ...baseAction, recordId })
      };
    }

    const recordId = requireString(input.record_id, '记录 ID');
    const raw = await deleteDynamicTableRecord(context, {
      directoryId: directory.id,
      recordId
    });

    return {
      ok: true,
      operation: input.action,
      records_json: '[]',
      records_markdown: '',
      record_json: stringifyJson(raw),
      count: 1,
      action_json: stringifyJson({ ...baseAction, recordId })
    };
  } catch (error: unknown) {
    return {
      ...emptyResult(action),
      system_error: getErrText(error)
    };
  }
}
