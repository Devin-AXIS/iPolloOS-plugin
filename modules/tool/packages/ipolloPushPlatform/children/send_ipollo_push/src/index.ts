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

const DEFAULT_MONITOR_PUSH_TEXT = '本次监控内容已更新，查看卡片获取摘要和变化。';
const INTERNAL_LABELS = new Set(['ipolloos.push', 'agent.monitor', 'monitor.updated', 'ipolloos']);

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

function cleanMonitorLabel(value: string): string {
  const text = value.replace(/\s+/g, ' ').trim();
  return text && !INTERNAL_LABELS.has(text.toLowerCase()) ? text : '';
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
  if (typeof value === 'string')
    return splitMonitorLabelText(value).map(cleanMonitorLabel).filter(Boolean);
  if (typeof value === 'number' && Number.isFinite(value))
    return [cleanMonitorLabel(String(value))].filter(Boolean);
  if (Array.isArray(value)) return value.flatMap(monitorLabelsFromValue);
  if (value && typeof value === 'object') {
    const record = value as Record<string, unknown>;
    return monitorLabelsFromValue(
      record.name ??
        record.displayName ??
        record.display_name ??
        record.targetName ??
        record.target_name ??
        record.targetKey ??
        record.target_key ??
        record.symbol ??
        record.ticker
    );
  }
  return [];
}

function monitorLabelsFromContent(value: string): string[] {
  const labels: string[] = [];
  for (const line of value.split(/\n+/)) {
    const text = line.trim();
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
    input.ai_summary?.trim() ||
    input.summary?.trim() ||
    pickString(payload, [
      'ai_summary',
      'aiSummary',
      'summary',
      'changeSummary',
      'change_summary',
      'description'
    ]) ||
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
    input.push_content?.trim() ||
    input.text?.trim() ||
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
    ]) ||
    input.ai_summary?.trim() ||
    input.summary?.trim() ||
    input.title?.trim() ||
    pickString(payload, ['ai_summary', 'aiSummary', 'summary', 'title', 'description']) ||
    (hasPayload(payload) ? JSON.stringify(payload) : '')
  );
}

type StructuredPushItem = {
  displayName: string;
  postedAt: string;
  text: string;
};

function parseJsonLikeArray(value: unknown): unknown[] | undefined {
  if (Array.isArray(value)) return value;
  if (typeof value !== 'string') return undefined;
  const trimmed = value.trim();
  if (!trimmed.startsWith('[')) return undefined;
  try {
    const parsed = JSON.parse(trimmed);
    return Array.isArray(parsed) ? parsed : undefined;
  } catch {
    return undefined;
  }
}

function normalizeStructuredPushItems(value: unknown): StructuredPushItem[] {
  const items = parseJsonLikeArray(value);
  if (!items) return [];
  return items
    .map((item) => {
      if (!item || typeof item !== 'object' || Array.isArray(item)) return undefined;
      const record = item as Record<string, unknown>;
      const displayName = pickString(record, [
        'displayName',
        'display_name',
        'name',
        'author',
        'userName',
        'username'
      ]);
      const postedAt = pickString(record, [
        'postedAt',
        'posted_at',
        'time',
        'createdAt',
        'created_at'
      ]);
      const text = pickString(record, ['text', 'content', 'message', 'body']);
      if (!text) return undefined;
      return {
        displayName: displayName || '监控对象',
        postedAt,
        text
      };
    })
    .filter((item): item is StructuredPushItem => Boolean(item));
}

function resolveStructuredPushItems(
  input: In,
  payload: Record<string, unknown> | undefined
): StructuredPushItem[] {
  const candidates = [
    input.push_content,
    input.text,
    payload?.push_content,
    payload?.pushContent,
    payload?.change_content,
    payload?.changeContent,
    payload?.content,
    payload?.message,
    payload?.text,
    payload?.items,
    payload?.records
  ];
  for (const candidate of candidates) {
    const items = normalizeStructuredPushItems(candidate);
    if (items.length) return items;
  }
  return [];
}

function formatStructuredPushContent(items: StructuredPushItem[], aiSummary: string): string {
  if (!items.length) return '';
  const grouped = new Map<string, StructuredPushItem[]>();
  for (const item of items) {
    const current = grouped.get(item.displayName) ?? [];
    current.push(item);
    grouped.set(item.displayName, current);
  }

  const sections = Array.from(grouped.entries()).map(([displayName, personItems]) => {
    const lines = personItems.map((item, index) => {
      const timeSuffix = item.postedAt ? `（${item.postedAt}）` : '';
      return `（${index + 1}）${item.text}${timeSuffix}`;
    });
    return [displayName, ...lines].join('\n');
  });

  if (aiSummary.trim()) {
    sections.push(`整体总结：${aiSummary.trim()}`);
  }
  return sections.join('\n\n');
}

function resolveCardContent(
  input: In,
  payload: Record<string, unknown> | undefined,
  pushContent: string,
  aiSummary: string
): string {
  return (
    formatStructuredPushContent(resolveStructuredPushItems(input, payload), aiSummary) ||
    pushContent
  );
}

function buildMonitorAppCard(
  input: In,
  payload: Record<string, unknown> | undefined,
  pushContent: string
) {
  const monitorObjects = resolveMonitorObjects(input, payload);
  const monitorObject = monitorObjects[0] || resolveMonitorObject(input, payload);
  const aiSummary = resolveAiSummary(input, payload) || pushContent;
  const cardContent = resolveCardContent(input, payload, pushContent, aiSummary);
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
      summary: aiSummary,
      monitorObject,
      monitorObjectName: monitorObject,
      monitorObjects,
      monitorObjectNames: monitorObjects,
      eventTime,
      occurredAt: eventTime,
      generatedAt: eventTime,
      metrics: monitorObjects.length ? monitorObjects : monitorObject ? [monitorObject] : [],
      changeContent: cardContent,
      pushContent: cardContent,
      aiBlocks: [
        {
          title: 'AI 总结',
          summary: aiSummary,
          content: aiSummary
        }
      ],
      sourceMarkdown: cardContent
    }
  };
}

function enrichMonitorAppCard(
  appCard: Record<string, unknown>,
  input: In,
  payload: Record<string, unknown> | undefined,
  pushContent: string
) {
  if (appCard.componentName !== 'MarketMonitorEventCard') return appCard;
  const data = parseJsonObjectOrString(appCard.data, 'app_card_json.data') ?? {};
  const monitorObjects = resolveMonitorObjects(input, { ...payload, ...data });
  const monitorObject = monitorObjects[0] || resolveMonitorObject(input, { ...payload, ...data });
  const aiSummary = resolveAiSummary(input, { ...payload, ...data });
  const eventTime = resolveEventTime(input, { ...payload, ...data }) || new Date().toISOString();
  const cardContent = resolveCardContent(input, payload, pushContent, aiSummary);
  return {
    ...appCard,
    data: {
      ...data,
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
      changeContent: data.changeContent || cardContent,
      pushContent: data.pushContent || cardContent,
      sourceMarkdown: data.sourceMarkdown || cardContent
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
      summary: input.summary?.trim() || undefined,
      text,
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
    const input = InputType.parse(props);
    const payload = parseJsonObject(input.payload_json, 'payload_json');
    const pushContent = resolvePushContent(input, payload);
    if (!pushContent) {
      throw new Error(
        '缺少推送内容：请填写“监控内容”或“推送内容”，或提供标题、摘要、payload_json.text、payload_json.summary、payload_json.content。'
      );
    }
    const appCard = enrichMonitorAppCard(
      normalizeAppCard(input, payload) || buildMonitorAppCard(input, payload, pushContent),
      input,
      payload,
      pushContent
    );
    const text = resolveChatText(appCard, pushContent);
    const monitorObject = resolveMonitorObject(input, payload);
    const monitorObjects = resolveMonitorObjects(input, payload);
    const aiSummary = resolveAiSummary(input, payload);
    const eventTime = resolveEventTime(input, payload);
    const outboundPayload = {
      ...(payload ?? {}),
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
        summary: aiSummary || input.summary?.trim() || undefined,
        text,
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
