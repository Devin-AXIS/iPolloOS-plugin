import type { TaskPayload } from './schema';

type RequestConfig = {
  applicationId: string;
  userId: string;
  authToken?: string;
};

type QueryTasksInput = RequestConfig & {
  from?: string;
  to?: string;
  assigneeType?: string;
  assigneeId?: string;
  status?: string;
  includeCompleted?: boolean;
  limit?: number;
};

type ApiResult = {
  raw: unknown;
  items: unknown[];
};

const DEFAULT_ONLINE_SCHEDULE_API_BASE_URL = 'https://core.metaio.cc';
const DEFAULT_SCHEDULE_API_TIMEOUT_MS = 15000;
const DEFAULT_LOCAL_SCHEDULE_API_BASE_URLS = [
  'http://host.docker.internal:3007',
  'http://127.0.0.1:3007',
  'http://localhost:3007'
];
const LEGACY_BASE_URL_ENV = ['FAST', 'GPT_BASE_URL'].join('');
const LEGACY_APP_HOST = ['fast', 'gpt-app'].join('');

const firstNonEmpty = (...values: unknown[]): string => {
  for (const value of values) {
    const text = String(value ?? '').trim();
    if (text) return text;
  }
  return '';
};

function readEnv(key: string): string {
  return String(process.env[key] ?? '').trim();
}

function normalizeBaseUrl(raw: string): string {
  const url = new URL(raw.trim());
  url.pathname = url.pathname.replace(/\/+$/, '');
  if (url.pathname === '/api') url.pathname = '';
  return url.toString().replace(/\/+$/, '');
}

function deriveBaseFromKnownUrl(raw: string): string {
  const url = new URL(raw.trim());
  url.pathname = url.pathname
    .replace(/\/api\/app\/app-data\/context\/?$/, '')
    .replace(/\/app-data\/context\/?$/, '')
    .replace(/\/api\/app-publish-callback\/?$/, '')
    .replace(/\/app-publish-callback\/?$/, '')
    .replace(/\/lumi-publish-callback\/?$/, '');
  url.search = '';
  url.hash = '';
  return url.toString().replace(/\/+$/, '');
}

const isLocalUrl = (raw: string): boolean => {
  const text = raw.trim().toLowerCase();
  return (
    text.includes('localhost') ||
    text.includes('127.0.0.1') ||
    text.includes('host.docker.internal') ||
    text.includes('ipolloos-app') ||
    text.includes(LEGACY_APP_HOST) ||
    text.includes('ipolloos-plugin')
  );
};

function isLocalIpolloRuntime(): boolean {
  const explicit = firstNonEmpty(
    readEnv('IPOLLO_APP_SCHEDULE_RUNTIME'),
    readEnv('IPOLLO_RUNTIME_ENV'),
    readEnv('AINO_RUNTIME_ENV')
  ).toLowerCase();
  if (['local', 'development', 'dev'].includes(explicit)) return true;
  if (['online', 'production', 'prod'].includes(explicit)) return false;

  const nodeEnv = readEnv('NODE_ENV').toLowerCase();
  if (nodeEnv === 'production') return false;

  const runtimeUrls = [
    LEGACY_BASE_URL_ENV,
    'IPOLLOOS_BASE_URL',
    'HTML_ANYTHING_AI_APP_URL',
    'MOBILE_AI_SERVICE_AI_APP_URL',
    'FE_DOMAIN',
    'NEXT_PUBLIC_BASE_URL'
  ].map(readEnv);
  if (runtimeUrls.some(isLocalUrl)) return true;

  return nodeEnv !== 'production';
}

function uniqueUrls(urls: string[]): string[] {
  return [
    ...new Set(
      urls
        .map((url) => url.trim())
        .filter(Boolean)
        .map((url) => normalizeBaseUrl(url))
    )
  ];
}

export function resolveScheduleApiBaseUrls(): string[] {
  const direct = firstNonEmpty(
    readEnv('IPOLLO_APP_SCHEDULE_API_BASE_URL'),
    readEnv('IPOLLO_APP_API_BASE_URL'),
    readEnv('AINO_API_BASE_URL'),
    readEnv('NEXT_PUBLIC_CORE_API_URL')
  );
  if (direct) return uniqueUrls([direct]);

  const knownUrl = firstNonEmpty(
    readEnv('LUMI_APP_DATA_CONTEXT_URL'),
    readEnv('LUMI_APP_BOT_CONTEXT_URL'),
    readEnv('LUMI_APP_BOT_REGISTER_URL')
  );
  if (knownUrl) return uniqueUrls([deriveBaseFromKnownUrl(knownUrl)]);

  if (isLocalIpolloRuntime()) {
    return uniqueUrls([
      readEnv('IPOLLO_APP_LOCAL_API_BASE_URL'),
      readEnv('AINO_LOCAL_API_BASE_URL'),
      ...DEFAULT_LOCAL_SCHEDULE_API_BASE_URLS
    ]);
  }

  return uniqueUrls([DEFAULT_ONLINE_SCHEDULE_API_BASE_URL]);
}

export function resolveScheduleApiBaseUrl(): string {
  return resolveScheduleApiBaseUrls()[0] ?? '';
}

export function resolveScheduleApiSecret(): string {
  return firstNonEmpty(
    readEnv('IPOLLO_APP_SCHEDULE_API_SECRET'),
    readEnv('APP_TASKS_SECRET'),
    readEnv('APP_DATA_CONTEXT_SECRET'),
    readEnv('LUMI_APP_DATA_CONTEXT_SECRET'),
    readEnv('APP_BOT_REGISTER_SECRET'),
    readEnv('LUMI_APP_BOT_REGISTER_SECRET')
  );
}

function buildTasksUrl(baseUrl: string, applicationId: string): URL {
  const url = new URL(`${baseUrl.replace(/\/+$/, '')}/api/ai/agent/tasks`);
  url.searchParams.set('applicationId', applicationId);
  return url;
}

function resolveScheduleApiTimeoutMs(): number {
  const raw = firstNonEmpty(
    readEnv('IPOLLO_APP_SCHEDULE_API_TIMEOUT_MS'),
    readEnv('AINO_API_TIMEOUT_MS')
  );
  const timeout = Number(raw);
  return Number.isFinite(timeout) && timeout > 0 ? timeout : DEFAULT_SCHEDULE_API_TIMEOUT_MS;
}

function truncateText(value: unknown, maxLength = 1200): string {
  const text = typeof value === 'string' ? value : JSON.stringify(value);
  return text.length > maxLength ? `${text.slice(0, maxLength)}...` : text;
}

function getTraceId(res: Response): string | undefined {
  return (
    res.headers.get('x-trace-id') ||
    res.headers.get('x-request-id') ||
    res.headers.get('request-id') ||
    undefined
  );
}

function getErrorCause(error: unknown): Record<string, string> {
  const record = error && typeof error === 'object' ? (error as Record<string, unknown>) : {};
  const cause =
    record.cause && typeof record.cause === 'object'
      ? (record.cause as Record<string, unknown>)
      : undefined;
  const detail: Record<string, string> = {};

  const assign = (key: string, value: unknown) => {
    const text = String(value ?? '').trim();
    if (text) detail[key] = text;
  };

  assign('error_name', record.name);
  assign('error_message', record.message);
  assign('cause_name', cause?.name);
  assign('cause_code', cause?.code);
  assign('cause_message', cause?.message);
  assign('cause_errno', cause?.errno);
  assign('cause_syscall', cause?.syscall);
  assign('cause_hostname', cause?.hostname);
  assign('cause_address', cause?.address);
  assign('cause_port', cause?.port);

  return detail;
}

function buildScheduleApiError(message: string, details: Record<string, unknown>): Error {
  return new Error(
    `${message}：${JSON.stringify(
      Object.fromEntries(
        Object.entries(details).filter(([, value]) => value !== undefined && value !== '')
      )
    )}`
  );
}

function getEndpointDetails(path: URL) {
  return {
    endpoint_host: path.host,
    endpoint_path: path.pathname
  };
}

async function readJsonResponse(res: Response): Promise<unknown> {
  const text = await res.text();
  if (!text.trim()) return null;
  try {
    return JSON.parse(text);
  } catch {
    return { _raw: text.slice(0, 8000) };
  }
}

function extractItems(data: unknown): unknown[] {
  if (Array.isArray(data)) return data;
  if (!data || typeof data !== 'object') return [];
  const record = data as Record<string, unknown>;
  for (const key of ['items', 'list', 'tasks', 'data']) {
    if (Array.isArray(record[key])) return record[key] as unknown[];
  }
  return [];
}

function getItemStatus(item: unknown): string {
  if (!item || typeof item !== 'object') return '';
  return String((item as Record<string, unknown>).status ?? '').trim();
}

function matchesAssignee(item: unknown, assigneeType?: string, assigneeId?: string): boolean {
  if (!assigneeType && !assigneeId) return true;
  if (!item || typeof item !== 'object') return false;
  const assignees = (item as Record<string, unknown>).assignees;
  if (!Array.isArray(assignees)) return false;
  return assignees.some((assignee) => {
    if (!assignee || typeof assignee !== 'object') return false;
    const record = assignee as Record<string, unknown>;
    const type = String(record.assigneeType ?? record.assignee_type ?? '').trim();
    const id = String(record.assigneeId ?? record.assignee_id ?? record.id ?? '').trim();
    return (!assigneeType || type === assigneeType) && (!assigneeId || id === assigneeId);
  });
}

async function requestJson(
  config: RequestConfig,
  path: URL,
  init: Omit<RequestInit, 'headers'> & { headers?: Record<string, string> } = {}
): Promise<unknown> {
  const authToken = firstNonEmpty(config.authToken, resolveScheduleApiSecret());
  if (!authToken) path.searchParams.set('noAuth', 'true');
  const method = String(init.method || 'GET').toUpperCase();
  const timeoutMs = resolveScheduleApiTimeoutMs();

  let res: Response;
  try {
    res = await fetch(path.toString(), {
      ...init,
      signal: init.signal ?? AbortSignal.timeout(timeoutMs),
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
        'x-application-id': config.applicationId,
        'x-current-user-id': config.userId,
        ...(authToken ? { Authorization: `Bearer ${authToken}` } : {}),
        ...(init.headers ?? {})
      }
    });
  } catch (error) {
    throw buildScheduleApiError('iPollo App 日程请求失败', {
      method,
      ...getEndpointDetails(path),
      application_id: config.applicationId,
      timeout_ms: timeoutMs,
      ...getErrorCause(error)
    });
  }
  const data = await readJsonResponse(res);
  const message =
    data && typeof data === 'object'
      ? String(
          (data as Record<string, unknown>).error ?? (data as Record<string, unknown>).message ?? ''
        )
      : '';

  if (!res.ok) {
    throw buildScheduleApiError(
      `iPollo App 日程接口 HTTP ${res.status}${message ? `：${message}` : ''}`,
      {
        method,
        ...getEndpointDetails(path),
        application_id: config.applicationId,
        http_status: res.status,
        trace_id: getTraceId(res),
        response_body: data ? truncateText(data) : undefined
      }
    );
  }
  if (data && typeof data === 'object' && (data as Record<string, unknown>).success === false) {
    throw buildScheduleApiError(message || 'iPollo App 日程接口返回失败', {
      method,
      ...getEndpointDetails(path),
      application_id: config.applicationId,
      http_status: res.status,
      trace_id: getTraceId(res),
      response_body: truncateText(data)
    });
  }
  return data;
}

function shouldTryNextBaseUrl(error: unknown): boolean {
  const message = String(
    error instanceof Error ? error.message : typeof error === 'string' ? error : ''
  ).toLowerCase();
  return (
    message.includes('fetch failed') ||
    message.includes('failed to fetch') ||
    message.includes('econnrefused') ||
    message.includes('enotfound') ||
    message.includes('etimedout') ||
    message.includes('connect timeout') ||
    message.includes('network')
  );
}

async function withScheduleApiBaseUrl<T>(
  missingMessage: string,
  run: (baseUrl: string) => Promise<T>
): Promise<T> {
  const baseUrls = resolveScheduleApiBaseUrls();
  if (baseUrls.length === 0) throw new Error(missingMessage);

  let lastError: unknown;
  for (const baseUrl of baseUrls) {
    try {
      return await run(baseUrl);
    } catch (error) {
      lastError = error;
      if (!shouldTryNextBaseUrl(error)) throw error;
    }
  }

  throw lastError instanceof Error ? lastError : new Error(missingMessage);
}

export async function queryScheduleTasks(input: QueryTasksInput): Promise<ApiResult> {
  return withScheduleApiBaseUrl('缺少 iPollo App 后端地址，无法读取日程。', async (baseUrl) => {
    const url = buildTasksUrl(baseUrl, input.applicationId);
    if (input.from) url.searchParams.set('dueFrom', input.from);
    if (input.to) url.searchParams.set('dueTo', input.to);
    if (input.includeCompleted) url.searchParams.set('includeCompleted', 'true');

    const raw = await requestJson(input, url, { method: 'GET' });
    const status = String(input.status ?? '').trim();
    const limit = Math.max(1, Math.min(100, Number(input.limit) || 20));
    const items = extractItems(raw)
      .filter((item) => (!status ? true : getItemStatus(item) === status))
      .filter((item) => matchesAssignee(item, input.assigneeType, input.assigneeId))
      .slice(0, limit);

    return { raw, items };
  });
}

export async function createScheduleTask(input: RequestConfig & { task: TaskPayload }) {
  return withScheduleApiBaseUrl('缺少 iPollo App 后端地址，无法创建日程。', async (baseUrl) => {
    const task = input.task;
    const url = buildTasksUrl(baseUrl, input.applicationId);
    const raw = await requestJson(input, url, {
      method: 'POST',
      body: JSON.stringify({
        title: task.title,
        note: task.content || task.goal || undefined,
        content: task.content || undefined,
        goal: task.goal || undefined,
        dueDate: task.schedule?.dueAt,
        schedule: task.schedule,
        assignees: task.assignees,
        subtasks: task.subtasks,
        attachments: task.attachments,
        source: 'agent'
      })
    });

    const record = raw && typeof raw === 'object' ? (raw as Record<string, unknown>) : {};
    return {
      raw,
      id: String(record.id ?? (record.item as Record<string, unknown> | undefined)?.id ?? '')
    };
  });
}

export async function updateScheduleTask(
  input: RequestConfig & { taskId: string; patch: Record<string, unknown> }
) {
  return withScheduleApiBaseUrl('缺少 iPollo App 后端地址，无法更新日程。', async (baseUrl) => {
    if (input.patch.status === 'completed') {
      const completeUrl = new URL(
        `${baseUrl.replace(/\/+$/, '')}/api/ai/agent/tasks/${encodeURIComponent(input.taskId)}/complete`
      );
      completeUrl.searchParams.set('applicationId', input.applicationId);
      return requestJson(input, completeUrl, { method: 'POST' });
    }

    const url = new URL(
      `${baseUrl.replace(/\/+$/, '')}/api/ai/agent/tasks/${encodeURIComponent(input.taskId)}`
    );
    url.searchParams.set('applicationId', input.applicationId);
    return requestJson(input, url, {
      method: 'PATCH',
      body: JSON.stringify(input.patch)
    });
  });
}
