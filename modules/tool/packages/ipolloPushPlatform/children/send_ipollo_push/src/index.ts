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

function resolvePushText(input: In, payload: Record<string, unknown> | undefined): string {
  return (
    input.text?.trim() ||
    input.summary?.trim() ||
    input.title?.trim() ||
    pickString(payload, ['text', 'summary', 'content', 'message', 'title', 'description']) ||
    (hasPayload(payload) ? JSON.stringify(payload) : '')
  );
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
    const appCard = normalizeAppCard(input, payload);
    const outboundPayload = {
      ...(payload ?? {}),
      ...(appCard ? { app_card: appCard } : {})
    };
    const text = resolvePushText(input, payload);
    if (!text) {
      throw new Error(
        '缺少推送内容：请填写“推送内容”，或提供标题、摘要、payload_json.text、payload_json.summary、payload_json.content。'
      );
    }

    if (input.hook_url?.trim()) return await postLegacyHook(input, eventId, outboundPayload, text);

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
        summary: input.summary?.trim() || undefined,
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
