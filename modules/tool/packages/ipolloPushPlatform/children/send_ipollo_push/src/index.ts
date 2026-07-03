import { z } from 'zod';
import type { RunToolSecondParamsType } from '@tool/type/req';

const emptyToUndefined = (value: unknown) =>
  value === '' || value === null || value === undefined ? undefined : value;

const optionalText = z.preprocess(emptyToUndefined, z.string().max(100_000).optional());

export const InputType = z.object({
  agent_id: z.preprocess(emptyToUndefined, z.string().max(200).optional()),
  application_id: z.preprocess(emptyToUndefined, z.string().max(200).optional()),
  hook_url: z.preprocess(emptyToUndefined, z.string().max(4000).optional()),
  text: z.preprocess(emptyToUndefined, z.string().max(500_000).optional()),
  push_content: z.preprocess(emptyToUndefined, z.string().max(500_000).optional()),
  monitor_object: z.preprocess(emptyToUndefined, z.string().max(4000).optional()),
  monitor_object_name: z.preprocess(emptyToUndefined, z.string().max(4000).optional()),
  ai_summary: optionalText,
  event_time: z.preprocess(emptyToUndefined, z.string().max(200).optional()),
  title: optionalText,
  summary: optionalText,
  event_type: z
    .preprocess(emptyToUndefined, z.string().max(200).optional())
    .default('ipolloos.push'),
  event_id: z.preprocess(emptyToUndefined, z.string().max(500).optional()),
  target_user_ids: z.preprocess(emptyToUndefined, z.string().max(20_000).optional()),
  app_card_json: z.preprocess(emptyToUndefined, z.string().max(500_000).optional()),
  payload_json: z.preprocess(emptyToUndefined, z.string().max(200_000).optional()),
  per_user_payload_json: z.preprocess(emptyToUndefined, z.string().max(500_000).optional())
});

export const OutputType = z.object({
  ok: z.boolean(),
  status_code: z.string(),
  event_id: z.string(),
  matched_user_count: z.number(),
  delivered_count: z.number(),
  skipped_count: z.number(),
  response_text: z.string(),
  system_error: z.string().optional()
});

type In = z.infer<typeof InputType>;
type Out = z.infer<typeof OutputType>;

type MonitorSourceItem = {
  id: string;
  objectId?: string;
  timeId?: string;
  objectName?: string;
  timeValue?: string;
  content: string;
  aiSummary?: string;
};

type StandardMonitorPayload = {
  items: Array<{ id: string; objectId?: string; timeId?: string; content: string }>;
  monitorObjects: Array<{ id: string; name: string }>;
  times: Array<{ id: string; value: string }>;
  summaries: Array<{
    id: string;
    itemId: string;
    objectId?: string;
    timeId?: string;
    summary: string;
  }>;
};

const DEFAULT_MONITOR_PUSH_TEXT = '本次监控内容已更新，查看卡片获取摘要和变化。';
const SUBSCRIPTION_ONLY_DELIVERY_MODE = 'subscription_only';
const INTERNAL_LABELS = new Set([
  'ipolloos.push',
  'agent.monitor',
  'monitor.updated',
  'ipolloos',
  'monitor object',
  'monitor objects',
  'monitor_object',
  'monitor_objects',
  'monitor object name',
  'monitor_object_name',
  '监控对象',
  '监控对象名称',
  '对象',
  '对象名称'
]);

function getErrorText(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

function readEnv(key: string): string {
  return String(process.env[key] ?? '').trim();
}

function normalizeBaseUrl(raw: string): string {
  const url = new URL(raw.trim());
  url.pathname = url.pathname.replace(/\/+$/, '');
  if (url.pathname === '/api') url.pathname = '';
  return url.toString().replace(/\/+$/, '');
}

function resolvePushApiBaseUrl(): string {
  return readEnv('IPOLLO_APP_TASK_API_BASE_URL');
}

function resolvePushApiSecret(): string {
  return (
    readEnv('IPOLLO_APP_TASK_API_SECRET') ||
    readEnv('APP_DATA_CONTEXT_SECRET') ||
    readEnv('APP_BOT_REGISTER_SECRET')
  );
}

function readEnvUrlSearchParam(envKey: string, paramKey: string): string {
  const raw = readEnv(envKey);
  if (!raw) return '';
  try {
    return new URL(raw).searchParams.get(paramKey)?.trim() || '';
  } catch {
    return '';
  }
}

function createEventId(): string {
  const random =
    typeof crypto !== 'undefined' && 'randomUUID' in crypto
      ? crypto.randomUUID()
      : `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
  return `ipolloos-${random}`;
}

function getCurrentIPolloApplicationId(
  input: In,
  payload: Record<string, unknown> | undefined,
  systemVar?: RunToolSecondParamsType['systemVar']
): string {
  const app = systemVar?.app as RunToolSecondParamsType['systemVar']['app'] & {
    applicationId?: string;
    iPolloApplicationId?: string;
  };
  const user = systemVar?.user as RunToolSecondParamsType['systemVar']['user'] & {
    iPolloApplicationId?: string;
  };
  return String(
    input.application_id ||
      payload?.application_id ||
      payload?.applicationId ||
      app?.iPolloApplicationId ||
      app?.applicationId ||
      user?.iPolloApplicationId ||
      readEnv('IPOLLO_APP_APPLICATION_ID') ||
      readEnvUrlSearchParam('IPOLLO_APP_REGISTER_URL', 'applicationId') ||
      ''
  ).trim();
}

function getCurrentIPolloUserId(systemVar?: RunToolSecondParamsType['systemVar']): string {
  const user = systemVar?.user as RunToolSecondParamsType['systemVar']['user'] & {
    appUserId?: string;
  };
  return String(user?.appUserId || user?.id || '').trim();
}

function getCurrentIPolloAgentId(systemVar?: RunToolSecondParamsType['systemVar']): string {
  const app = systemVar?.app as RunToolSecondParamsType['systemVar']['app'] & {
    agentId?: string;
    appBotId?: string;
    upstreamAppId?: string;
  };
  return String(app?.agentId || app?.appBotId || app?.upstreamAppId || app?.id || '').trim();
}

function parseJsonObject(
  raw: string | undefined,
  label: string
): Record<string, unknown> | undefined {
  if (!raw?.trim()) return undefined;
  try {
    const parsed = JSON.parse(raw);
    if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
      return parsed as Record<string, unknown>;
    }
    throw new Error(`${label} 必须是 JSON 对象`);
  } catch (error: unknown) {
    throw new Error(`${label} 解析失败：${getErrorText(error)}`);
  }
}

function pickString(payload: Record<string, unknown> | undefined, keys: string[]): string {
  if (!payload) return '';
  for (const key of keys) {
    const value = payload[key];
    if (typeof value === 'string' && value.trim()) return value.trim();
    if (typeof value === 'number' && Number.isFinite(value)) return String(value);
  }
  return '';
}

function parseJsonLikeValue(value: unknown): unknown {
  if (typeof value !== 'string') return value;
  const text = value
    .trim()
    .replace(/^```(?:json)?\s*/i, '')
    .replace(/```$/i, '')
    .trim();
  if (!text || (!text.startsWith('[') && !text.startsWith('{'))) return value;
  try {
    return JSON.parse(text);
  } catch {
    return value;
  }
}

function isWorkflowReferenceLabel(value: string): boolean {
  const text = value.trim().replace(/^["']|["']$/g, '');
  if (!text) return false;
  if (/^\[\s*["']?[A-Za-z0-9_-]{8,}["']?\s*(?:,|、)/.test(text)) return true;
  if (/^[A-Za-z0-9_-]{16,}$/.test(text)) return true;
  return false;
}

function isWorkflowReferenceArray(value: unknown[]): boolean {
  const parts = value.map((item) => (typeof item === 'string' ? item.trim() : '')).filter(Boolean);
  if (parts.length === 0 || parts.length !== value.length) return false;
  if (parts.some(isWorkflowReferenceLabel)) return true;
  return parts.length <= 3 && /^[A-Za-z0-9_-]{16,}$/.test(parts[0]);
}

function isWorkflowReferenceValue(value: unknown): boolean {
  const parsed = parseJsonLikeValue(value);
  if (parsed !== value) return isWorkflowReferenceValue(parsed);
  if (typeof value === 'string') return isWorkflowReferenceLabel(value);
  if (Array.isArray(value)) return isWorkflowReferenceArray(value);
  return false;
}

function normalizeContentText(value: string | undefined): string {
  const text = value?.trim() ?? '';
  if (!text) return '';
  if (['[]', '{}', 'null', 'undefined', 'no_push', 'nopush'].includes(text.toLowerCase()))
    return '';
  if (isWorkflowReferenceValue(text)) return '';
  return text;
}

function isPlainRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value && typeof value === 'object' && !Array.isArray(value));
}

function valueToString(value: unknown): string {
  if (typeof value === 'string') return value.trim();
  if (typeof value === 'number' && Number.isFinite(value)) return String(value);
  if (typeof value === 'boolean') return String(value);
  return '';
}

function readString(record: Record<string, unknown> | undefined, keys: string[]): string {
  if (!record) return '';
  for (const key of keys) {
    const text = valueToString(record[key]);
    if (text) return text;
  }
  return '';
}

function readCleanString(record: Record<string, unknown> | undefined, keys: string[]): string {
  return normalizeContentText(readString(record, keys));
}

function parseRecordArray(value: unknown): Record<string, unknown>[] {
  const parsed = parseJsonLikeValue(value);
  return Array.isArray(parsed) ? parsed.filter(isPlainRecord) : [];
}

function parseLooseStringArray(value: unknown): string[] {
  const parsed = parseJsonLikeValue(value);
  if (Array.isArray(parsed)) {
    return parsed.map((item) => normalizeContentText(valueToString(item))).filter(Boolean);
  }
  if (typeof parsed === 'string') {
    return parsed
      .split(/[,，、\n]/)
      .map((item) => normalizeContentText(item))
      .filter(Boolean);
  }
  return [];
}

const MONITOR_ITEM_ARRAY_KEYS = [
  'items',
  'contents',
  'contentItems',
  'content_items',
  'posts',
  'events',
  'events_json',
  'records',
  'changes',
  'updates'
];

const MONITOR_OBJECT_ARRAY_KEYS = [
  'monitorObjects',
  'monitor_objects',
  'objects',
  'targets',
  'accounts',
  'authors',
  'users'
];

const MONITOR_TIME_ARRAY_KEYS = ['times', 'timeList', 'time_list', 'timestamps'];

const MONITOR_SUMMARY_ARRAY_KEYS = [
  'summaries',
  'summaryList',
  'summary_list',
  'aiSummaries',
  'ai_summaries'
];

const MONITOR_CONTENT_KEYS = [
  'content',
  'text',
  'body',
  'message',
  'pushContent',
  'push_content',
  'changeContent',
  'change_content',
  'sourceMarkdown',
  'source_markdown',
  'latest_content_text',
  'postText',
  'post_text'
];

const MONITOR_OBJECT_ID_KEYS = [
  'objectId',
  'object_id',
  'monitorObjectId',
  'monitor_object_id',
  'targetId',
  'target_id',
  'accountId',
  'account_id',
  'authorId',
  'author_id',
  'userId',
  'user_id'
];

const MONITOR_OBJECT_NAME_KEYS = [
  'objectName',
  'object_name',
  'monitorObjectName',
  'monitor_object_name',
  'authorName',
  'author_name',
  'author',
  'authorUsername',
  'author_username',
  'accountUsername',
  'account_username',
  'latest_author_username',
  'latest_account_username',
  'username',
  'handle',
  'name',
  'displayName',
  'display_name',
  'targetName',
  'target_name',
  'symbol',
  'ticker'
];

const MONITOR_TIME_ID_KEYS = ['timeId', 'time_id', 'timestampId', 'timestamp_id'];

const MONITOR_TIME_VALUE_KEYS = [
  'value',
  'time',
  'timestamp',
  'eventTime',
  'event_time',
  'occurredAt',
  'occurred_at',
  'publishedAt',
  'published_at',
  'postCreatedAt',
  'post_created_at',
  'latest_post_created_at',
  'createdAt',
  'created_at'
];

const MONITOR_ITEM_ID_KEYS = [
  'id',
  'itemId',
  'item_id',
  'contentId',
  'content_id',
  'eventId',
  'event_id',
  'postId',
  'post_id',
  'latest_post_id'
];

const MONITOR_EXPLICIT_AI_SUMMARY_KEYS = ['aiSummary', 'ai_summary'];
const MONITOR_SUMMARY_TEXT_KEYS = ['summary', 'aiSummary', 'ai_summary'];

const MONITOR_DATE_PATTERN =
  '(?:(?:Mon|Tue|Wed|Thu|Fri|Sat|Sun)\\s+\\w+\\s+\\d{1,2}\\s+\\d{2}:\\d{2}:\\d{2}\\s+(?:\\+?\\d{4}\\s+)?\\d{4}|\\d{4}[-/]\\d{1,2}[-/]\\d{1,2}[ T]\\d{1,2}:\\d{2}(?::\\d{2})?(?:\\s*(?:UTC|Z))?|\\d{4}[-/]\\d{1,2}[-/]\\d{1,2}|\\d{8}\\s+\\d{1,2}:\\d{2}(?::\\d{2})?\\s*(?:UTC)?)';

function readRecordArrayFromSources(sources: unknown[], keys: string[]): Record<string, unknown>[] {
  for (const source of sources) {
    const direct = parseRecordArray(source);
    if (direct.length > 0) return direct;
    const sourceRecord = isPlainRecord(source) ? source : undefined;
    if (!sourceRecord) continue;
    for (const key of keys) {
      const records = parseRecordArray(sourceRecord[key]);
      if (records.length > 0) return records;
    }
  }
  return [];
}

function readMonitorObjectRecordsFromSources(
  sources: unknown[]
): Array<{ id: string; name: string }> {
  for (const source of sources) {
    const sourceRecord = isPlainRecord(source) ? source : undefined;
    if (!sourceRecord) continue;
    for (const key of MONITOR_OBJECT_ARRAY_KEYS) {
      const rawRecords = parseRecordArray(sourceRecord[key]);
      if (rawRecords.length > 0) {
        const records = rawRecords
          .map((record, index) => {
            const name = monitorLabelsFromValue(record)[0];
            if (!name) return undefined;
            return {
              id: readString(record, ['id', ...MONITOR_OBJECT_ID_KEYS]) || `o${index + 1}`,
              name
            };
          })
          .filter((item): item is { id: string; name: string } => Boolean(item));
        if (records.length > 0) return records;
      }
      const names = parseLooseStringArray(sourceRecord[key]).flatMap(monitorLabelsFromValue);
      if (names.length > 0) {
        return Array.from(new Set(names)).map((name, index) => ({ id: `o${index + 1}`, name }));
      }
    }
  }
  return [];
}

function readMonitorTimeRecordsFromSources(
  sources: unknown[]
): Array<{ id: string; value: string }> {
  for (const source of sources) {
    const sourceRecord = isPlainRecord(source) ? source : undefined;
    if (!sourceRecord) continue;
    for (const key of MONITOR_TIME_ARRAY_KEYS) {
      const rawRecords = parseRecordArray(sourceRecord[key]);
      if (rawRecords.length > 0) {
        const records = rawRecords
          .map((record, index) => {
            const value = readCleanString(record, MONITOR_TIME_VALUE_KEYS);
            if (!value) return undefined;
            return {
              id: readString(record, ['id', ...MONITOR_TIME_ID_KEYS]) || `t${index + 1}`,
              value
            };
          })
          .filter((item): item is { id: string; value: string } => Boolean(item));
        if (records.length > 0) return records;
      }
      const values = parseLooseStringArray(sourceRecord[key]);
      if (values.length > 0) {
        return values.map((value, index) => ({ id: `t${index + 1}`, value }));
      }
    }
  }
  return [];
}

function collectMonitorSources(input: In, payload: Record<string, unknown> | undefined): unknown[] {
  const roots = [
    payload,
    parseJsonLikeValue(input.push_content),
    parseJsonLikeValue(input.text),
    parseJsonLikeValue(input.payload_json),
    parseJsonLikeValue(input.app_card_json)
  ].filter((item) => item !== undefined && item !== null);
  const sources: unknown[] = [];
  const queue = roots.map((value) => ({ value, depth: 0 }));
  const nestedKeys = [
    'data',
    'result',
    'payload',
    'body',
    'output',
    'event',
    'latest_event_json',
    'response',
    'app_card',
    'appCard',
    'aiCardData'
  ];
  while (queue.length > 0 && sources.length < 30) {
    const current = queue.shift();
    if (!current) break;
    const parsed = parseJsonLikeValue(current.value);
    sources.push(parsed);
    if (current.depth >= 3 || !isPlainRecord(parsed)) continue;
    for (const key of nestedKeys) {
      const next = parsed[key];
      if (next !== undefined && next !== null)
        queue.push({ value: next, depth: current.depth + 1 });
    }
  }
  return sources;
}

function extractMonitorMetadataFromText(value: string): {
  objectName?: string;
  timeValue?: string;
} {
  const text = stripMonitorTextMarkup(value).replace(/\s+/g, ' ').trim();
  if (!text) return {};
  const dotPattern = new RegExp(`([^。.!！？?\\n·]{1,80}?)\\s*·\\s*(${MONITOR_DATE_PATTERN})`, 'u');
  const dotMatch = text.match(dotPattern);
  if (dotMatch) {
    return {
      objectName: cleanMonitorLabel(dotMatch[1].replace(/^\d+[.、]\s*/, '')),
      timeValue: normalizeContentText(dotMatch[2])
    };
  }
  const linePattern = new RegExp(
    `^(?:\\d+[.、]\\s*)?(@?[\\p{L}][\\p{L}\\p{N}_.\\-\\s]{0,80}?)\\s+(${MONITOR_DATE_PATTERN})\\s*(?:发了[:：]?|发布[:：]?|[:：])?`,
    'u'
  );
  const lineMatch = text.match(linePattern);
  if (lineMatch) {
    return {
      objectName: cleanMonitorLabel(lineMatch[1]),
      timeValue: normalizeContentText(lineMatch[2])
    };
  }
  return {};
}

function extractLineMonitorItems(value: string): MonitorSourceItem[] {
  const linePattern = new RegExp(
    `^(?:\\d+[.、]\\s*)?(@?[\\p{L}][\\p{L}\\p{N}_.\\-\\s]{0,80}?)\\s+(${MONITOR_DATE_PATTERN})\\s*(?:发了[:：]?|发布[:：]?|[:：])?\\s*(.+)$`,
    'u'
  );
  return value
    .split(/\n+/)
    .map<MonitorSourceItem | undefined>((line, index) => {
      const text = stripMonitorTextMarkup(line);
      const match = text.match(linePattern);
      if (!match) return undefined;
      const objectName = cleanMonitorLabel(match[1]);
      const timeValue = normalizeContentText(match[2]);
      const content = normalizeContentText(match[3]) || normalizeContentText(text);
      if (/^\d{1,2}:\d{2}(?::\d{2})?(?:\s*(?:UTC|Z))?$/i.test(content)) return undefined;
      if (!content) return undefined;
      return {
        id: `c${index + 1}`,
        objectName,
        timeValue,
        content
      };
    })
    .filter((item): item is MonitorSourceItem => Boolean(item));
}

function buildStandardMonitorPayloadFromItems(items: MonitorSourceItem[]): StandardMonitorPayload {
  const objectIdByName = new Map<string, string>();
  const timeIdByValue = new Map<string, string>();
  const monitorObjects: StandardMonitorPayload['monitorObjects'] = [];
  const times: StandardMonitorPayload['times'] = [];
  const summaries: StandardMonitorPayload['summaries'] = [];
  const normalizedItems = items.map((item, index) => {
    const id = item.id || `c${index + 1}`;
    let objectId = item.objectId;
    const objectName = cleanMonitorLabel(item.objectName ?? '');
    if (objectName) {
      const key = objectName.toLowerCase();
      objectId = objectId || objectIdByName.get(key) || `o${objectIdByName.size + 1}`;
      if (!objectIdByName.has(key)) {
        objectIdByName.set(key, objectId);
        monitorObjects.push({ id: objectId, name: objectName });
      }
    }

    let timeId = item.timeId;
    const timeValue = normalizeContentText(item.timeValue);
    if (timeValue) {
      timeId = timeId || timeIdByValue.get(timeValue) || `t${timeIdByValue.size + 1}`;
      if (!timeIdByValue.has(timeValue)) {
        timeIdByValue.set(timeValue, timeId);
        times.push({ id: timeId, value: timeValue });
      }
    }

    const aiSummary = normalizeContentText(item.aiSummary);
    if (aiSummary) {
      summaries.push({
        id: `s${summaries.length + 1}`,
        itemId: id,
        ...(objectId ? { objectId } : {}),
        ...(timeId ? { timeId } : {}),
        summary: aiSummary
      });
    }

    return {
      id,
      ...(objectId ? { objectId } : {}),
      ...(timeId ? { timeId } : {}),
      content: item.content
    };
  });

  return {
    items: normalizedItems,
    monitorObjects,
    times,
    summaries
  };
}

function buildStructuredMonitorItems(
  input: In,
  payload: Record<string, unknown> | undefined,
  sources: unknown[]
): MonitorSourceItem[] {
  const itemRecords = readRecordArrayFromSources(sources, MONITOR_ITEM_ARRAY_KEYS);
  if (itemRecords.length === 0) return [];

  const objectRecords = readMonitorObjectRecordsFromSources(sources);
  const timeRecords = readMonitorTimeRecordsFromSources(sources);
  const summaryRecords = readRecordArrayFromSources(sources, MONITOR_SUMMARY_ARRAY_KEYS);
  const objectById = new Map(objectRecords.map((record) => [record.id, record]));
  const timeById = new Map(timeRecords.map((record) => [record.id, record]));
  const explicitObjects = resolveMonitorObjects(input, payload);
  const summaryByItemId = new Map<string, Record<string, unknown>>();
  const summaryByObjectAndTime = new Map<string, Record<string, unknown>>();
  summaryRecords.forEach((summary) => {
    const itemId = readString(summary, ['itemId', 'item_id', 'contentId', 'content_id', 'id']);
    if (itemId) summaryByItemId.set(itemId, summary);
    const objectId = readString(summary, MONITOR_OBJECT_ID_KEYS);
    const timeId = readString(summary, MONITOR_TIME_ID_KEYS);
    if (objectId && timeId) summaryByObjectAndTime.set(`${objectId}:${timeId}`, summary);
  });

  return itemRecords
    .map<MonitorSourceItem | undefined>((record, index) => {
      const content = readCleanString(record, MONITOR_CONTENT_KEYS);
      if (!content) return undefined;
      const id = readString(record, MONITOR_ITEM_ID_KEYS) || `c${index + 1}`;
      const objectId = readString(record, MONITOR_OBJECT_ID_KEYS);
      const timeId = readString(record, MONITOR_TIME_ID_KEYS);
      const objectRecord = objectId ? objectById.get(objectId) : objectRecords[index];
      const timeRecord = timeId ? timeById.get(timeId) : timeRecords[index];
      const summaryRecord =
        summaryByItemId.get(id) ||
        (objectId && timeId ? summaryByObjectAndTime.get(`${objectId}:${timeId}`) : undefined) ||
        summaryRecords[index];
      const metadata = extractMonitorMetadataFromText(content);
      const objectName =
        monitorLabelsFromValue(record).find(Boolean) ||
        objectRecord?.name ||
        metadata.objectName ||
        (itemRecords.length === 1 ? explicitObjects[0] : explicitObjects[index]) ||
        '';
      const timeValue =
        readCleanString(record, MONITOR_TIME_VALUE_KEYS) ||
        timeRecord?.value ||
        metadata.timeValue ||
        (itemRecords.length === 1 ? resolveEventTime(input, payload) : '');
      const aiSummary =
        readCleanString(record, MONITOR_EXPLICIT_AI_SUMMARY_KEYS) ||
        normalizeContentText(readString(summaryRecord, MONITOR_SUMMARY_TEXT_KEYS)) ||
        (itemRecords.length === 1 ? resolveAiSummary(input, payload) : '');
      return {
        id,
        objectId,
        timeId,
        objectName,
        timeValue,
        content,
        aiSummary
      };
    })
    .filter((item): item is MonitorSourceItem => Boolean(item));
}

function buildFallbackMonitorItems(
  input: In,
  payload: Record<string, unknown> | undefined,
  pushContent: string
): MonitorSourceItem[] {
  const lineItems = extractLineMonitorItems(pushContent);
  if (lineItems.length > 0) return lineItems;
  const metadata = extractMonitorMetadataFromText(pushContent);
  const explicitObjects = resolveMonitorObjects(input, payload);
  const content = normalizeContentText(pushContent);
  if (!content) return [];
  return [
    {
      id: 'c1',
      objectName: explicitObjects[0] || metadata.objectName || '',
      timeValue: metadata.timeValue || resolveEventTime(input, payload),
      content,
      aiSummary: resolveAiSummary(input, payload)
    }
  ];
}

function buildStandardMonitorPayload(
  input: In,
  payload: Record<string, unknown> | undefined,
  pushContent: string
): StandardMonitorPayload {
  const sources = collectMonitorSources(input, payload);
  const structuredItems = buildStructuredMonitorItems(input, payload, sources);
  const items =
    structuredItems.length > 0
      ? structuredItems
      : buildFallbackMonitorItems(input, payload, pushContent);
  const standard = buildStandardMonitorPayloadFromItems(items);
  if (structuredItems.length === 0 && standard.items.length === 1) {
    const knownNames = new Set(standard.monitorObjects.map((item) => item.name.toLowerCase()));
    for (const name of resolveMonitorObjects(input, payload)) {
      const cleanName = cleanMonitorLabel(name);
      if (!cleanName || knownNames.has(cleanName.toLowerCase())) continue;
      const id = `o${standard.monitorObjects.length + 1}`;
      knownNames.add(cleanName.toLowerCase());
      standard.monitorObjects.push({ id, name: cleanName });
    }
    if (!standard.items[0].objectId && standard.monitorObjects[0]) {
      standard.items[0] = {
        ...standard.items[0],
        objectId: standard.monitorObjects[0].id
      };
    }
  }
  return standard;
}

function isAgentHookUrl(value: string | undefined): boolean {
  const text = value?.trim();
  if (!text) return false;
  try {
    const url = new URL(text);
    return /\/api\/app\/agent-?hooks?\//i.test(url.pathname);
  } catch {
    return false;
  }
}

function normalizeHookUrlInput(input: In): In {
  const pushContent = input.push_content?.trim();
  const text = input.text?.trim();
  const hookUrlFromContent = isAgentHookUrl(pushContent)
    ? pushContent
    : isAgentHookUrl(text)
      ? text
      : undefined;
  if (!hookUrlFromContent) return input;
  return {
    ...input,
    hook_url: input.hook_url?.trim() || hookUrlFromContent,
    push_content: isAgentHookUrl(pushContent) ? undefined : input.push_content,
    text: isAgentHookUrl(text) ? undefined : input.text
  };
}

function cleanMonitorLabel(value: string): string {
  const text = value.replace(/\s+/g, ' ').trim();
  if (!text || INTERNAL_LABELS.has(text.toLowerCase())) return '';
  if (!normalizeContentText(text)) return '';
  return text;
}

function stripMonitorTextMarkup(value: string): string {
  return value
    .replace(/\*\*([^*]+)\*\*/g, '$1')
    .replace(/__([^_]+)__/g, '$1')
    .replace(/`([^`]+)`/g, '$1')
    .replace(/^\s*[>#*-]+\s*/, '')
    .trim();
}

function splitMonitorLabelText(value: string): string[] {
  const text = value.trim();
  if (!text) return [];
  const delimiterParts = text
    .split(/[\n,，;；|]+/)
    .map((item) => item.trim())
    .filter(Boolean);
  const parts = delimiterParts.length > 1 ? delimiterParts : [text];
  return parts.flatMap((part) => {
    const words = part
      .split(/\s+/)
      .map((item) => item.trim())
      .filter(Boolean);
    const looksLikeHandleList =
      words.length > 1 && words.filter((item) => item.startsWith('@')).length >= 2;
    const looksLikeTickerList =
      words.length > 1 && words.every((item) => /^[A-Z][A-Z0-9.:-]{0,12}$/.test(item));
    return looksLikeHandleList || looksLikeTickerList ? words : [part];
  });
}

function monitorLabelsFromValue(value: unknown): string[] {
  const parsed = parseJsonLikeValue(value);
  if (parsed !== value) return monitorLabelsFromValue(parsed);
  if (typeof value === 'string')
    return splitMonitorLabelText(value).map(cleanMonitorLabel).filter(Boolean);
  if (typeof value === 'number' && Number.isFinite(value))
    return [cleanMonitorLabel(String(value))].filter(Boolean);
  if (Array.isArray(value))
    return isWorkflowReferenceArray(value) ? [] : value.flatMap(monitorLabelsFromValue);
  if (value && typeof value === 'object') {
    const record = value as Record<string, unknown>;
    return monitorLabelsFromValue(
      record.name ??
        record.displayName ??
        record.display_name ??
        record.objectName ??
        record.object_name ??
        record.monitorObjectName ??
        record.monitor_object_name ??
        record.authorName ??
        record.author_name ??
        record.authorUsername ??
        record.author_username ??
        record.accountUsername ??
        record.account_username ??
        record.latest_author_username ??
        record.latest_account_username ??
        record.targetName ??
        record.target_name ??
        record.targetKey ??
        record.target_key ??
        record.username ??
        record.handle ??
        record.symbol ??
        record.ticker
    );
  }
  return [];
}

function monitorLabelsFromContent(value: string): string[] {
  const labels: string[] = [];
  for (const line of value.split(/\n+/)) {
    const text = stripMonitorTextMarkup(line);
    const match = text.match(
      /^(@?[A-Za-z][A-Za-z0-9_.-]{1,40})\s+(?:Mon|Tue|Wed|Thu|Fri|Sat|Sun|\d{4}-\d{2}-\d{2})\b/
    );
    const label = match ? cleanMonitorLabel(match[1]) : '';
    if (label) labels.push(label);
  }
  return labels;
}

function resolveMonitorObjects(input: In, payload: Record<string, unknown> | undefined): string[] {
  const values = [
    input.monitor_object_name,
    input.monitor_object,
    payload?.monitor_object_names,
    payload?.monitorObjectNames,
    payload?.monitor_objects,
    payload?.monitorObjects,
    payload?.monitor_object_name,
    payload?.monitorObjectName,
    payload?.monitor_object,
    payload?.monitorObject,
    payload?.target_name,
    payload?.targetName,
    payload?.target,
    payload?.targets,
    payload?.symbol,
    payload?.ticker,
    payload?.name
  ];
  const explicit = values.flatMap(monitorLabelsFromValue);
  const content = [
    input.push_content,
    input.text,
    payload?.push_content,
    payload?.pushContent,
    payload?.changeContent,
    payload?.change_content,
    payload?.sourceMarkdown,
    payload?.source_markdown
  ]
    .filter((item): item is string => typeof item === 'string')
    .join('\n');
  return Array.from(new Set([...explicit, ...monitorLabelsFromContent(content)])).slice(0, 50);
}

function pickNestedString(
  payload: Record<string, unknown> | undefined,
  key: string,
  nestedKeys: string[]
): string {
  const value = payload?.[key];
  if (!value || typeof value !== 'object' || Array.isArray(value)) return '';
  return pickString(value as Record<string, unknown>, nestedKeys);
}

function isInternalTitle(value: string): boolean {
  const normalized = value.trim().toLowerCase();
  return !normalized || normalized === 'ipolloos.push' || normalized === 'agent.monitor';
}

function hasPayload(
  payload: Record<string, unknown> | undefined
): payload is Record<string, unknown> {
  return Boolean(payload && Object.keys(payload).length > 0);
}

function parseJsonObjectOrString(
  value: unknown,
  label: string
): Record<string, unknown> | undefined {
  if (value === undefined || value === null || value === '') return undefined;
  if (typeof value === 'string') return parseJsonObject(value, label);
  if (value && typeof value === 'object' && !Array.isArray(value)) {
    return value as Record<string, unknown>;
  }
  throw new Error(`${label} 必须是 JSON 对象`);
}

function normalizeAppCard(input: In, payload: Record<string, unknown> | undefined) {
  const fromInput = parseJsonObjectOrString(input.app_card_json, 'app_card_json');
  const fromPayload = parseJsonObjectOrString(
    payload?.app_card ?? payload?.appCard ?? payload?.aiCardData,
    'payload_json.app_card'
  );
  const appCard = fromInput ?? fromPayload;
  if (!appCard) return undefined;

  const componentName =
    typeof appCard.componentName === 'string'
      ? appCard.componentName.trim()
      : typeof appCard.component_name === 'string'
        ? appCard.component_name.trim()
        : '';
  const data = parseJsonObjectOrString(appCard.data, 'app_card_json.data');
  if (!componentName || !data) {
    throw new Error('app_card_json 必须包含 componentName 和 data。');
  }

  return {
    ...appCard,
    componentName,
    data
  };
}

function resolveMonitorObject(input: In, payload: Record<string, unknown> | undefined): string {
  return (
    resolveMonitorObjects(input, payload)[0] ||
    pickNestedString(payload, 'target', [
      'name',
      'displayName',
      'targetName',
      'targetKey',
      'symbol'
    ]) ||
    pickNestedString(payload, 'alert', ['target', 'name', 'symbol']) ||
    ''
  );
}

function resolveAiSummary(input: In, payload: Record<string, unknown> | undefined): string {
  return (
    normalizeContentText(input.ai_summary) ||
    normalizeContentText(pickString(payload, ['ai_summary', 'aiSummary'])) ||
    ''
  );
}

function resolveEventTime(input: In, payload: Record<string, unknown> | undefined): string {
  return (
    input.event_time?.trim() ||
    pickString(payload, [
      'event_time',
      'eventTime',
      'occurred_at',
      'occurredAt',
      'generated_at',
      'generatedAt',
      'created_at',
      'createdAt'
    ]) ||
    ''
  );
}

function resolvePushContent(input: In, payload: Record<string, unknown> | undefined): string {
  return (
    normalizeContentText(input.push_content) ||
    normalizeContentText(input.text) ||
    normalizeContentText(
      pickString(payload, [
        'push_content',
        'pushContent',
        'change_content',
        'changeContent',
        'content',
        'message',
        'text',
        'sourceMarkdown',
        'source_markdown'
      ])
    ) ||
    normalizeContentText(input.summary) ||
    normalizeContentText(input.title) ||
    normalizeContentText(pickString(payload, ['summary', 'title', 'description'])) ||
    (input.hook_url?.trim() ? resolveAiSummary(input, payload) : '') ||
    (hasPayload(payload) ? JSON.stringify(payload) : '')
  );
}

function buildMonitorAppCard(
  input: In,
  payload: Record<string, unknown> | undefined,
  pushContent: string,
  standardMonitor: StandardMonitorPayload
) {
  const monitorObjects = standardMonitor.monitorObjects.map((item) => item.name);
  const monitorObject = monitorObjects[0] || resolveMonitorObject(input, payload);
  const aiSummary = resolveAiSummary(input, payload);
  const eventTime = resolveEventTime(input, payload) || new Date().toISOString();
  const rawTitle =
    input.title?.trim() || pickString(payload, ['title', 'eventTitle', 'event_title']);
  const title =
    rawTitle && !isInternalTitle(rawTitle)
      ? rawTitle
      : monitorObject
        ? `${monitorObject} 监控变化`
        : '监控变化';

  return {
    componentName: 'MarketMonitorEventCard',
    data: {
      title,
      ...(aiSummary ? { summary: aiSummary, aiSummary, ai_summary: aiSummary } : {}),
      monitorObject,
      monitorObjectName: monitorObject,
      monitorObjectNames: monitorObjects,
      eventTime,
      occurredAt: eventTime,
      generatedAt: eventTime,
      metrics: monitorObjects.length ? monitorObjects : monitorObject ? [monitorObject] : [],
      changeContent: pushContent,
      pushContent,
      items: standardMonitor.items,
      times: standardMonitor.times,
      monitorObjects: standardMonitor.monitorObjects,
      summaries: standardMonitor.summaries,
      ...(aiSummary
        ? {
            aiBlocks: [
              {
                title: 'AI 总结',
                summary: aiSummary,
                content: aiSummary
              }
            ]
          }
        : {}),
      sourceMarkdown: pushContent
    }
  };
}

function enrichMonitorAppCard(
  appCard: Record<string, unknown>,
  input: In,
  payload: Record<string, unknown> | undefined,
  pushContent: string,
  standardMonitor: StandardMonitorPayload
) {
  if (appCard.componentName !== 'MarketMonitorEventCard') return appCard;
  const data = parseJsonObjectOrString(appCard.data, 'app_card_json.data') ?? {};
  const monitorObjects =
    standardMonitor.monitorObjects.length > 0
      ? standardMonitor.monitorObjects.map((item) => item.name)
      : resolveMonitorObjects(input, { ...payload, ...data });
  const monitorObject = monitorObjects[0] || resolveMonitorObject(input, { ...payload, ...data });
  const aiSummary = resolveAiSummary(input, { ...payload, ...data });
  const eventTime = resolveEventTime(input, { ...payload, ...data }) || new Date().toISOString();
  const nextData = { ...data } as Record<string, unknown>;
  if (!aiSummary) {
    delete nextData.aiSummary;
    delete nextData.ai_summary;
    delete nextData.summary;
    delete nextData.aiBlocks;
  }
  return {
    ...appCard,
    data: {
      ...nextData,
      ...(monitorObject ? { monitorObject, monitorObjectName: monitorObject } : {}),
      ...(monitorObjects.length
        ? { monitorObjects, monitorObjectNames: monitorObjects, metrics: monitorObjects }
        : {}),
      ...(aiSummary
        ? { aiSummary, ai_summary: aiSummary, summary: data.summary || aiSummary }
        : {}),
      eventTime: data.eventTime || eventTime,
      occurredAt: data.occurredAt || eventTime,
      generatedAt: data.generatedAt || eventTime,
      changeContent: data.changeContent || pushContent,
      pushContent: data.pushContent || pushContent,
      items: standardMonitor.items,
      times: standardMonitor.times,
      monitorObjects: standardMonitor.monitorObjects,
      summaries: standardMonitor.summaries,
      sourceMarkdown: data.sourceMarkdown || pushContent
    }
  };
}

function resolveChatText(
  appCard: Record<string, unknown> | undefined,
  pushContent: string
): string {
  return appCard ? DEFAULT_MONITOR_PUSH_TEXT : pushContent;
}

async function postLegacyHook(
  input: In,
  eventId: string,
  payload: Record<string, unknown> | undefined,
  text: string
): Promise<Out> {
  const hookUrl = input.hook_url?.trim();
  if (!hookUrl) throw new Error('缺少 Hook 地址');
  const response = await fetch(hookUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      eventId,
      eventType: input.event_type?.trim() || 'ipolloos.push',
      title: input.title?.trim() || undefined,
      summary: pickString(payload, ['ai_summary', 'aiSummary']) || undefined,
      text,
      deliveryMode: SUBSCRIPTION_ONLY_DELIVERY_MODE,
      delivery_mode: SUBSCRIPTION_ONLY_DELIVERY_MODE,
      payload: hasPayload(payload) ? payload : undefined,
      source: 'ipolloos_plugin'
    })
  });
  const responseText = await response.text();
  return {
    ok: response.ok,
    status_code: String(response.status),
    event_id: eventId,
    matched_user_count: response.ok ? 1 : 0,
    delivered_count: response.ok ? 1 : 0,
    skipped_count: response.ok ? 0 : 1,
    response_text: responseText.slice(0, 200_000),
    system_error: response.ok
      ? undefined
      : `HTTP ${response.status}: ${responseText.slice(0, 2000)}`
  };
}

export async function tool(props: In, runtime?: RunToolSecondParamsType): Promise<Out> {
  const eventId =
    typeof props.event_id === 'string' && props.event_id.trim()
      ? props.event_id.trim()
      : createEventId();
  try {
    const input = normalizeHookUrlInput(InputType.parse(props));
    const payload = parseJsonObject(input.payload_json, 'payload_json');
    const pushContent = resolvePushContent(input, payload);
    if (!pushContent) {
      throw new Error(
        '缺少推送内容：请填写“监控内容”或“推送内容”，或提供标题、摘要、payload_json.text、payload_json.summary、payload_json.content。'
      );
    }
    const standardMonitor = buildStandardMonitorPayload(input, payload, pushContent);
    const appCard = enrichMonitorAppCard(
      normalizeAppCard(input, payload) ||
        buildMonitorAppCard(input, payload, pushContent, standardMonitor),
      input,
      payload,
      pushContent,
      standardMonitor
    );
    const text = resolveChatText(appCard, pushContent);
    const monitorObjects =
      standardMonitor.monitorObjects.length > 0
        ? standardMonitor.monitorObjects.map((item) => item.name)
        : resolveMonitorObjects(input, payload);
    const monitorObject = monitorObjects[0] || resolveMonitorObject(input, payload);
    const aiSummary = resolveAiSummary(input, payload);
    const eventTime = resolveEventTime(input, payload);
    const outboundPayload = {
      ...(payload ?? {}),
      items: standardMonitor.items,
      times: standardMonitor.times,
      monitorObjects: standardMonitor.monitorObjects,
      summaries: standardMonitor.summaries,
      deliveryMode: SUBSCRIPTION_ONLY_DELIVERY_MODE,
      delivery_mode: SUBSCRIPTION_ONLY_DELIVERY_MODE,
      ...(monitorObject ? { monitor_object: monitorObject, monitorObject } : {}),
      ...(monitorObject
        ? { monitor_object_name: monitorObject, monitorObjectName: monitorObject }
        : {}),
      ...(monitorObjects.length
        ? { monitor_objects: monitorObjects, monitorObjectNames: monitorObjects }
        : {}),
      ...(aiSummary ? { ai_summary: aiSummary, aiSummary } : {}),
      ...(eventTime ? { event_time: eventTime, eventTime } : {}),
      push_content: pushContent,
      pushContent,
      ...(appCard ? { app_card: appCard } : {})
    };

    if (input.hook_url?.trim())
      return await postLegacyHook(input, eventId, outboundPayload, pushContent);

    const agentId = input.agent_id?.trim() || getCurrentIPolloAgentId(runtime?.systemVar);
    if (!agentId) throw new Error('缺少当前 iPollo App Agent ID。');

    const baseUrl = resolvePushApiBaseUrl();
    const secret = resolvePushApiSecret();
    if (!baseUrl)
      throw new Error('缺少 IPOLLO_APP_TASK_API_BASE_URL，无法访问 iPollo App 推送接口。');
    if (!secret) throw new Error('缺少 IPOLLO_APP_TASK_API_SECRET，无法访问 iPollo App 推送接口。');

    const applicationId = getCurrentIPolloApplicationId(input, payload, runtime?.systemVar);
    if (!applicationId) throw new Error('缺少当前 iPollo App applicationId。');
    const currentUserId = getCurrentIPolloUserId(runtime?.systemVar);
    const url = new URL(`${normalizeBaseUrl(baseUrl)}/api/ai/agent/push-events`);
    url.searchParams.set('applicationId', applicationId);

    const response = await fetch(url.toString(), {
      method: 'POST',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
        'x-application-id': applicationId,
        ...(currentUserId ? { 'x-current-user-id': currentUserId } : {}),
        Authorization: `Bearer ${secret}`
      },
      body: JSON.stringify({
        applicationId,
        agentId,
        eventId,
        eventType: input.event_type?.trim() || 'ipolloos.push',
        title: input.title?.trim() || undefined,
        summary: aiSummary || undefined,
        text,
        deliveryMode: SUBSCRIPTION_ONLY_DELIVERY_MODE,
        delivery_mode: SUBSCRIPTION_ONLY_DELIVERY_MODE,
        payload: outboundPayload,
        ...(appCard ? { appCard } : {}),
        targetUserIds: input.target_user_ids,
        perUserPayload: parseJsonObject(input.per_user_payload_json, 'per_user_payload_json')
      })
    });

    const responseText = await response.text();
    let parsed: Record<string, unknown> = {};
    try {
      parsed = responseText ? (JSON.parse(responseText) as Record<string, unknown>) : {};
    } catch {
      parsed = {};
    }
    const ok = response.ok && parsed.success !== false;
    return {
      ok,
      status_code: String(response.status),
      event_id: String(parsed.eventId || eventId),
      matched_user_count: Number(parsed.matchedUserCount ?? 0),
      delivered_count: Number(parsed.deliveredCount ?? 0),
      skipped_count: Number(parsed.skippedCount ?? 0),
      response_text: responseText.slice(0, 200_000),
      system_error: ok
        ? undefined
        : `HTTP ${response.status}: ${String(parsed.error || responseText).slice(0, 2000)}`
    };
  } catch (error: unknown) {
    return {
      ok: false,
      status_code: '',
      event_id: eventId,
      matched_user_count: 0,
      delivered_count: 0,
      skipped_count: 0,
      response_text: '',
      system_error: getErrorText(error)
    };
  }
}
