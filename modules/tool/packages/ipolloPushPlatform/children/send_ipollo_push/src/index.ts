import { z } from 'zod';
import type { RunToolSecondParamsType } from '@tool/type/req';

const emptyToUndefined = (value: unknown) =>
  value === '' || value === null || value === undefined ? undefined : value;

const optionalText = z.preprocess(emptyToUndefined, z.string().max(100_000).optional());
const EMPTY_UPDATE_SKIP_POLICY = 'skip_empty_allowed_updates';
const EMPTY_UPDATE_SKIP_SOURCE_TOOLS = new Set(['xPlatform_xapito/checkAccountUpdates']);

export const InputType = z.object({
  agent_id: z.preprocess(emptyToUndefined, z.string().max(200).optional()),
  hook_url: z.preprocess(emptyToUndefined, z.string().max(4000).optional()),
  text: z.preprocess(emptyToUndefined, z.string().max(500_000).optional()),
  title: optionalText,
  summary: optionalText,
  event_type: z
    .preprocess(emptyToUndefined, z.string().max(200).optional())
    .default('ipolloos.push'),
  event_id: z.preprocess(emptyToUndefined, z.string().max(500).optional()),
  target_user_ids: z.preprocess(emptyToUndefined, z.string().max(20_000).optional()),
  payload_json: z.preprocess(emptyToUndefined, z.string().max(200_000).optional()),
  per_user_payload_json: z.preprocess(emptyToUndefined, z.string().max(500_000).optional()),
  push_policy: z.preprocess(emptyToUndefined, z.string().max(200).optional()),
  source_tool: z.preprocess(emptyToUndefined, z.string().max(500).optional()),
  count: z.preprocess(emptyToUndefined, z.union([z.string(), z.number()]).optional()),
  system_error: z.preprocess(emptyToUndefined, z.unknown().optional())
});

export const OutputType = z.object({
  ok: z.boolean(),
  status_code: z.string(),
  event_id: z.string(),
  matched_user_count: z.number(),
  delivered_count: z.number(),
  skipped_count: z.number(),
  response_text: z.string(),
  skipped: z.boolean().optional(),
  skip_reason: z.string().optional(),
  system_error: z.string().optional()
});

type In = z.infer<typeof InputType>;
type Out = z.infer<typeof OutputType>;

function getErrorText(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

function hasSystemError(value: unknown): boolean {
  if (value === undefined || value === null || value === '') return false;
  if (typeof value === 'string') return value.trim() !== '';
  if (Array.isArray(value)) return value.length > 0;
  if (typeof value === 'object') return Object.keys(value).length > 0;
  return Boolean(value);
}

function isZeroCount(value: In['count']): boolean {
  if (value === undefined || value === null || value === '') return false;
  const count = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(count) && count === 0;
}

function shouldSkipEmptyAllowedUpdate(input: In): boolean {
  return (
    input.push_policy === EMPTY_UPDATE_SKIP_POLICY &&
    EMPTY_UPDATE_SKIP_SOURCE_TOOLS.has(input.source_tool ?? '') &&
    !hasSystemError(input.system_error) &&
    isZeroCount(input.count)
  );
}

function formatSystemError(value: unknown): string {
  if (!hasSystemError(value)) return '';
  if (typeof value === 'string') return value.trim();
  try {
    return JSON.stringify(value);
  } catch {
    return String(value);
  }
}

function buildSkippedOutput(eventId: string): Out {
  return {
    ok: true,
    status_code: 'skipped',
    event_id: eventId,
    matched_user_count: 0,
    delivered_count: 0,
    skipped_count: 1,
    response_text: '',
    skipped: true,
    skip_reason: 'empty_update_for_allowed_source'
  };
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

function createEventId(): string {
  const random =
    typeof crypto !== 'undefined' && 'randomUUID' in crypto
      ? crypto.randomUUID()
      : `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
  return `ipolloos-${random}`;
}

function getCurrentIPolloApplicationId(systemVar?: RunToolSecondParamsType['systemVar']): string {
  const app = systemVar?.app as RunToolSecondParamsType['systemVar']['app'] & {
    applicationId?: string;
    iPolloApplicationId?: string;
  };
  const user = systemVar?.user as RunToolSecondParamsType['systemVar']['user'] & {
    iPolloApplicationId?: string;
  };
  return String(
    app?.iPolloApplicationId || app?.applicationId || user?.iPolloApplicationId || ''
  ).trim();
}

function getCurrentIPolloUserId(systemVar?: RunToolSecondParamsType['systemVar']): string {
  const user = systemVar?.user as RunToolSecondParamsType['systemVar']['user'] & {
    appUserId?: string;
  };
  return String(user?.appUserId || user?.id || '').trim();
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

function resolvePushText(input: In, payload: Record<string, unknown> | undefined): string {
  return (
    input.text?.trim() ||
    input.summary?.trim() ||
    input.title?.trim() ||
    pickString(payload, ['text', 'summary', 'content', 'message', 'title', 'description']) ||
    formatSystemError(input.system_error) ||
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
    if (shouldSkipEmptyAllowedUpdate(input)) return buildSkippedOutput(eventId);

    const payload = parseJsonObject(input.payload_json, 'payload_json');
    const text = resolvePushText(input, payload);
    if (!text) {
      throw new Error(
        '缺少推送内容：请填写“推送内容”，或提供标题、摘要、payload_json.text、payload_json.summary、payload_json.content。'
      );
    }

    if (input.hook_url?.trim()) return await postLegacyHook(input, eventId, payload, text);

    const agentId = input.agent_id?.trim();
    if (!agentId) throw new Error('缺少 Hook 地址');

    const baseUrl = resolvePushApiBaseUrl();
    const secret = resolvePushApiSecret();
    if (!baseUrl)
      throw new Error('缺少 IPOLLO_APP_TASK_API_BASE_URL，无法访问 iPollo App 推送接口。');
    if (!secret) throw new Error('缺少 IPOLLO_APP_TASK_API_SECRET，无法访问 iPollo App 推送接口。');

    const applicationId = getCurrentIPolloApplicationId(runtime?.systemVar);
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
        payload: payload ?? {},
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
