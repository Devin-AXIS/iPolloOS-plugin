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

const ActionSchema = z.enum(['query', 'insert', 'update', 'upsert', 'delete']);

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

type RuntimeContext = ReturnType<typeof resolveDynamicTableRuntimeContext>;
type RuntimeDirectory = Awaited<ReturnType<typeof resolveDynamicTableDirectory>>;

const lifeAssistantTableKeys = new Set(['life_profile', 'life_log', 'life_daily_report']);

function requireString(value: string | undefined, label: string): string {
  const text = String(value ?? '').trim();
  if (!text) throw new Error(`${label}不能为空。`);
  return text;
}

function normalizeText(value: unknown): string {
  return String(value ?? '')
    .trim()
    .toLowerCase();
}

function getDirectoryConfig(directory: RuntimeDirectory): Record<string, unknown> {
  return directory.config && typeof directory.config === 'object' ? directory.config : {};
}

function getDirectoryTableKey(directory: RuntimeDirectory, fallback: string): string {
  const config = getDirectoryConfig(directory);
  return String(config.agentDataTableKey || directory.slug || directory.name || fallback).trim();
}

function getDirectoryOwnership(directory: RuntimeDirectory, fallbackTable: string): string {
  const config = getDirectoryConfig(directory);
  const ownership = normalizeText(config.ownership || config.agentDataOwnership);
  if (ownership) return ownership;

  const tableKey = getDirectoryTableKey(directory, fallbackTable);
  return lifeAssistantTableKeys.has(normalizeText(tableKey)) ? 'per_app_user' : '';
}

function shouldScopeToAppUser(directory: RuntimeDirectory, table: string): boolean {
  return getDirectoryOwnership(directory, table) === 'per_app_user';
}

function requireRuntimeAppUser(
  context: RuntimeContext,
  directory: RuntimeDirectory,
  table: string
): string {
  if (!shouldScopeToAppUser(directory, table)) return '';
  const userId = String(context.userId || '').trim();
  if (!userId) {
    throw new Error('当前动态表按 App 用户隔离，但运行时缺少 App 用户信息，已拒绝读写。');
  }
  return userId;
}

function buildRuntimeOwnerFields(
  context: RuntimeContext,
  directory: RuntimeDirectory,
  table: string
): Record<string, unknown> {
  const appUserId = requireRuntimeAppUser(context, directory, table);
  if (!appUserId) return {};

  return {
    app_user_id: appUserId,
    ...(context.userName ? { app_user_name: context.userName } : {}),
    application_id: context.applicationId,
    ...(context.agentId ? { agent_id: context.agentId } : {})
  };
}

function applyRuntimeScopeFilter(
  filter: Record<string, unknown> | undefined,
  context: RuntimeContext,
  directory: RuntimeDirectory,
  table: string
): Record<string, unknown> | undefined {
  const ownerFields = buildRuntimeOwnerFields(context, directory, table);
  if (!ownerFields.app_user_id) return filter;
  return {
    ...(filter ?? {}),
    app_user_id: ownerFields.app_user_id
  };
}

function applyRuntimeOwnerFields(
  record: Record<string, unknown>,
  context: RuntimeContext,
  directory: RuntimeDirectory,
  table: string
): Record<string, unknown> {
  const ownerFields = buildRuntimeOwnerFields(context, directory, table);
  return {
    ...record,
    ...ownerFields
  };
}

function getRecordId(record: unknown): string {
  if (!record || typeof record !== 'object') return '';
  const item = record as Record<string, unknown>;
  return String(
    item.id ??
      item._id ??
      item.record_id ??
      item.recordId ??
      item._recordId ??
      item['记录 ID / Record ID'] ??
      ''
  ).trim();
}

function pickFirstTextField(
  record: Record<string, unknown>,
  keys: string[]
): Record<string, unknown> | undefined {
  for (const key of keys) {
    const value = record[key];
    const text = String(value ?? '').trim();
    if (text) return { [key]: value };
  }
  return undefined;
}

function inferUpsertFilter(
  table: string,
  record: Record<string, unknown>,
  explicitFilter?: Record<string, unknown>
): Record<string, unknown> {
  if (explicitFilter && Object.keys(explicitFilter).length > 0) return explicitFilter;

  const tableKey = normalizeText(table);
  if (tableKey.includes('profile')) {
    return pickFirstTextField(record, ['id', 'profile_key', 'key']) ?? { id: 'default' };
  }
  if (tableKey.includes('subscription')) {
    return (
      pickFirstTextField(record, ['subscription_key', 'subject_key', 'target_key', 'id', 'key']) ??
      {}
    );
  }
  if (tableKey.includes('target')) {
    return pickFirstTextField(record, ['target_key', 'subject_key', 'id', 'key']) ?? {};
  }
  if (tableKey.includes('subject')) {
    return pickFirstTextField(record, ['subject_key', 'target_key', 'id', 'key']) ?? {};
  }
  if (tableKey.includes('cursor')) {
    const subjectKey = String(record.subject_key ?? '').trim();
    const sourceKey = String(record.source_key ?? '').trim();
    if (subjectKey && sourceKey) return { subject_key: subjectKey, source_key: sourceKey };
    return pickFirstTextField(record, ['cursor_key', 'subject_key', 'id', 'key']) ?? {};
  }
  if (tableKey.includes('report') || tableKey.includes('snapshot')) {
    return pickFirstTextField(record, ['snapshot_date', 'report_date', 'date', 'id', 'key']) ?? {};
  }

  return (
    pickFirstTextField(record, ['id', 'key', 'record_key', 'external_id', 'source_id', 'title']) ??
    {}
  );
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
      directoryId: directory.id,
      ownership: getDirectoryOwnership(directory, input.table) || 'unspecified',
      scopedByAppUser: shouldScopeToAppUser(directory, input.table)
    };

    if (input.action === 'query') {
      const filter = input.filter_json ? parseJsonObject(input.filter_json, '筛选条件') : undefined;
      const scopedFilter = applyRuntimeScopeFilter(filter, context, directory, input.table);
      const raw = await queryDynamicTableRecords(context, {
        directoryId: directory.id,
        filter: scopedFilter,
        search: input.search,
        limit: input.limit
      });
      const records = extractRecords(raw);
      const actionJson = { ...baseAction, filter: scopedFilter, count: records.length };

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
      const record = applyRuntimeOwnerFields(
        parseJsonObject(requireString(input.record_json, '记录内容'), '记录内容'),
        context,
        directory,
        input.table
      );
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
      const patch = applyRuntimeOwnerFields(
        parseJsonObject(requireString(input.patch_json, '更新内容'), '更新内容'),
        context,
        directory,
        input.table
      );
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

    if (input.action === 'upsert') {
      const explicitFilter = input.filter_json
        ? parseJsonObject(input.filter_json, '筛选条件')
        : undefined;
      const record = applyRuntimeOwnerFields(
        parseJsonObject(requireString(input.record_json, '记录内容'), '记录内容'),
        context,
        directory,
        input.table
      );
      const inferredFilter = inferUpsertFilter(input.table, record, explicitFilter);
      const scopedFilter = applyRuntimeScopeFilter(inferredFilter, context, directory, input.table);
      const rawRecords = await queryDynamicTableRecords(context, {
        directoryId: directory.id,
        filter: scopedFilter,
        limit: 1
      });
      const existingRecord = extractRecords(rawRecords).find((item) => getRecordId(item));
      const existingRecordId = input.record_id || getRecordId(existingRecord);

      if (existingRecordId) {
        const raw = await updateDynamicTableRecord(context, {
          directoryId: directory.id,
          recordId: existingRecordId,
          patch: record
        });
        return {
          ok: true,
          operation: input.action,
          records_json: stringifyJson(existingRecord ? [existingRecord] : []),
          records_markdown: formatRecordsMarkdown(existingRecord ? [existingRecord] : []),
          record_json: stringifyJson(raw),
          count: 1,
          action_json: stringifyJson({
            ...baseAction,
            mode: 'update',
            recordId: existingRecordId,
            filter: scopedFilter
          })
        };
      }

      const raw = await insertDynamicTableRecord(context, { directoryId: directory.id, record });
      return {
        ok: true,
        operation: input.action,
        records_json: '[]',
        records_markdown: '',
        record_json: stringifyJson(raw),
        count: 1,
        action_json: stringifyJson({ ...baseAction, mode: 'insert', filter: scopedFilter })
      };
    }

    const recordId = requireString(input.record_id, '记录 ID');
    requireRuntimeAppUser(context, directory, input.table);
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
