import type { TaskPayload } from './schema';

type RequestConfig = {
  applicationId: string;
  userId: string;
};

type QueryTasksInput = RequestConfig & {
  from?: string;
  to?: string;
  keyword?: string;
  assigneeType?: string;
  assigneeId?: string;
  assigneeName?: string;
  status?: string;
  includeCompleted?: boolean;
  limit?: number;
};

type ApiResult = {
  raw: unknown;
  items: unknown[];
};

export type AppPublishedAgent = {
  appBotId: string;
  botUserId?: string;
  fastgptAppId: string;
  shareId: string;
  name: string;
  intro: string;
  channelName: string;
  category?: string;
  score: number;
  matchReasons?: string[];
  capabilities: string[];
};

const DEFAULT_SCHEDULE_API_TIMEOUT_MS = 15000;

function readEnv(key: string): string {
  return String(process.env[key] ?? '').trim();
}

function normalizeBaseUrl(raw: string): string {
  const url = new URL(raw.trim());
  url.pathname = url.pathname.replace(/\/+$/, '');
  if (url.pathname === '/api') url.pathname = '';
  return url.toString().replace(/\/+$/, '');
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
  const direct = readEnv('IPOLLO_APP_TASK_API_BASE_URL');
  return direct ? uniqueUrls([direct]) : [];
}

export function resolveScheduleApiBaseUrl(): string {
  return resolveScheduleApiBaseUrls()[0] ?? '';
}

export function resolveScheduleApiSecret(): string {
  return readEnv('IPOLLO_APP_TASK_API_SECRET');
}

function buildTasksUrl(baseUrl: string, applicationId: string): URL {
  const url = new URL(`${baseUrl.replace(/\/+$/, '')}/api/ai/agent/tasks`);
  url.searchParams.set('applicationId', applicationId);
  return url;
}

function buildPublishedAgentsUrl(baseUrl: string, applicationId: string): URL {
  const url = new URL(`${baseUrl.replace(/\/+$/, '')}/api/ai/agent/published-agents`);
  url.searchParams.set('applicationId', applicationId);
  return url;
}

function resolveScheduleApiTimeoutMs(): number {
  const raw = readEnv('IPOLLO_APP_TASK_API_TIMEOUT_MS');
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

function extractAgents(data: unknown): unknown[] {
  if (Array.isArray(data)) return data;
  if (!data || typeof data !== 'object') return [];
  const record = data as Record<string, unknown>;
  if (Array.isArray(record.agents)) return record.agents;
  if (record.data && typeof record.data === 'object') {
    const nested = record.data as Record<string, unknown>;
    if (Array.isArray(nested.agents)) return nested.agents;
  }
  return extractItems(data);
}

function normalizePublishedAgent(value: unknown): AppPublishedAgent | undefined {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return;
  const record = value as Record<string, unknown>;
  const appBotId = String(record.appBotId ?? record.app_bot_id ?? record.id ?? '').trim();
  const name = String(record.name ?? record.channelName ?? '').trim();
  if (!appBotId || !name) return;
  return {
    appBotId,
    ...(record.botUserId || record.bot_user_id
      ? { botUserId: String(record.botUserId ?? record.bot_user_id) }
      : {}),
    fastgptAppId: String(
      record.fastgptAppId ?? record.fastgpt_app_id ?? record.upstreamAppId ?? ''
    ),
    shareId: String(record.shareId ?? record.share_id ?? ''),
    name,
    intro: String(record.intro ?? record.description ?? ''),
    channelName: String(record.channelName ?? record.channel_name ?? name),
    ...(record.category ? { category: String(record.category) } : {}),
    score: Number(record.score) || 0,
    matchReasons: Array.isArray(record.matchReasons)
      ? record.matchReasons.map((item) => String(item)).filter(Boolean)
      : undefined,
    capabilities: Array.isArray(record.capabilities)
      ? record.capabilities.map((item) => String(item)).filter(Boolean)
      : []
  };
}

function getItemStatus(item: unknown): string {
  if (!item || typeof item !== 'object') return '';
  return String((item as Record<string, unknown>).status ?? '').trim();
}

function getAssigneeRecords(item: unknown): Record<string, unknown>[] {
  if (!item || typeof item !== 'object') return [];
  const record = item as Record<string, unknown>;
  const records: Record<string, unknown>[] = [];
  const pushAssignee = (assignee: unknown) => {
    if (!assignee || typeof assignee !== 'object') return false;
    records.push(assignee as Record<string, unknown>);
    return true;
  };
  for (const key of ['assignees', 'participants', 'agents']) {
    const assignees = record[key];
    if (Array.isArray(assignees)) assignees.forEach(pushAssignee);
  }
  const subtasks = record.subtasks ?? record.children ?? record.checklist;
  if (Array.isArray(subtasks)) {
    for (const subtask of subtasks) {
      if (!subtask || typeof subtask !== 'object') continue;
      const subtaskRecord = subtask as Record<string, unknown>;
      const assigneeType = subtaskRecord.assigneeType ?? subtaskRecord.assignee_type;
      const assigneeId = subtaskRecord.assigneeId ?? subtaskRecord.assignee_id;
      const assigneeName = subtaskRecord.assigneeName ?? subtaskRecord.assignee_name;
      if (assigneeType || assigneeId || assigneeName) {
        records.push({
          assigneeType,
          assignee_type: assigneeType,
          assigneeId,
          assignee_id: assigneeId,
          assigneeName,
          assignee_name: assigneeName,
          role: 'subtask'
        });
      }
    }
  }
  return records;
}

function getAssigneeType(record: Record<string, unknown>): string {
  return String(record.assigneeType ?? record.assignee_type ?? '').trim();
}

function getAssigneeId(record: Record<string, unknown>): string {
  return String(record.assigneeId ?? record.assignee_id ?? record.id ?? '').trim();
}

function getAssigneeName(record: Record<string, unknown>): string {
  return String(record.assigneeName ?? record.assignee_name ?? record.name ?? '').trim();
}

function matchesAssignee(item: unknown, assigneeType?: string, assigneeId?: string): boolean {
  if (!assigneeType && !assigneeId) return true;
  return getAssigneeRecords(item).some((record) => {
    const type = getAssigneeType(record);
    const id = getAssigneeId(record);
    return (!assigneeType || type === assigneeType) && (!assigneeId || id === assigneeId);
  });
}

function matchesCurrentUserParticipation(item: unknown, userId: string): boolean {
  const currentUserId = String(userId ?? '').trim();
  if (!currentUserId) return false;
  return getAssigneeRecords(item).some((record) => {
    const type = getAssigneeType(record);
    const id = getAssigneeId(record);
    return type === 'user' && (id === currentUserId || id === 'self');
  });
}

function scoreAssigneeKeywordMatch(item: unknown, keyword?: string): number {
  const normalized = normalizeKeyword(keyword);
  if (!normalized) return 0;
  const query = normalizeSearchText(normalized);
  const queryCore = stripIntentWords(query);
  if (!queryCore) return 0;
  let score = 0;
  for (const record of getAssigneeRecords(item)) {
    for (const part of [getAssigneeName(record), getAssigneeId(record), getAssigneeType(record)]) {
      score = Math.max(score, scoreKeywordPart(query, queryCore, part));
    }
  }
  return score;
}

function collectSearchText(value: unknown, parts: string[] = []): string[] {
  if (value == null) return parts;
  if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
    const text = String(value).trim();
    if (text) parts.push(text);
    return parts;
  }
  if (Array.isArray(value)) {
    for (const item of value) collectSearchText(item, parts);
    return parts;
  }
  if (typeof value === 'object') {
    const record = value as Record<string, unknown>;
    for (const key of [
      'id',
      'taskId',
      'title',
      'name',
      'note',
      'content',
      'goal',
      'description',
      'assigneeName',
      'assigneeId',
      'assigneeType',
      'subtasks',
      'children',
      'checklist',
      'assignees',
      'agents',
      'participants'
    ]) {
      collectSearchText(record[key], parts);
    }
  }
  return parts;
}

function normalizeKeyword(value: unknown): string {
  return String(value ?? '')
    .trim()
    .toLowerCase();
}

function normalizeSearchText(value: unknown): string {
  return normalizeKeyword(value).replace(/\s+/g, '');
}

function stripIntentWords(value: string): string {
  let text = value;
  for (const word of [
    '单独',
    '给我',
    '帮我',
    '帮忙',
    '查一下',
    '查查',
    '查询',
    '查看',
    '看看',
    '找一下',
    '找到',
    '拿一个',
    '一个',
    '这条',
    '这个',
    '那个',
    '任务',
    '日程',
    '卡片',
    '有没有',
    '有吗',
    '吗',
    '的'
  ]) {
    text = text.replaceAll(word, '');
  }
  return text;
}

function getLatinTokens(value: string): string[] {
  return value.match(/[a-z0-9]+/g) ?? [];
}

function getCjkBigrams(value: string): string[] {
  const chars = Array.from(value.replace(/[^\u3400-\u4dbf\u4e00-\u9fff\uf900-\ufaff]/g, ''));
  if (chars.length < 2) return chars;
  const bigrams: string[] = [];
  for (let i = 0; i < chars.length - 1; i += 1) {
    bigrams.push(`${chars[i]}${chars[i + 1]}`);
  }
  return [...new Set(bigrams)];
}

function scoreKeywordPart(query: string, queryCore: string, part: string): number {
  const target = normalizeSearchText(part);
  if (!target) return 0;
  if (target.includes(queryCore) || queryCore.includes(target)) {
    return 100 + Math.min(target.length, queryCore.length);
  }

  let score = 0;
  for (const token of getLatinTokens(queryCore)) {
    if (token.length >= 2 && target.includes(token)) score += token.length * 5;
  }
  for (const bigram of getCjkBigrams(queryCore)) {
    if (target.includes(bigram)) score += 3;
  }
  if (query.includes(target) && target.length >= 4) score += 20;
  return score;
}

function scoreKeywordMatch(item: unknown, keyword?: string): number {
  const normalized = normalizeKeyword(keyword);
  if (!normalized) return 1;
  const haystack = collectSearchText(item).join('\n').toLowerCase();
  if (!haystack) return 0;
  const tokens = normalized.split(/[\s,，、]+/).filter(Boolean);
  if (tokens.length === 0) return 1;
  if (tokens.every((token) => haystack.includes(token))) return 1000;

  const query = normalizeSearchText(normalized);
  const queryCore = stripIntentWords(query);
  if (!queryCore) return 1;

  let score = 0;
  for (const part of collectSearchText(item)) {
    score = Math.max(score, scoreKeywordPart(query, queryCore, part));
  }
  return score;
}

export function filterScheduleTasksForQuery(items: unknown[], input: QueryTasksInput): unknown[] {
  const status = String(input.status ?? '').trim();
  const limit = Math.max(1, Math.min(100, Number(input.limit) || 20));
  const keyword = normalizeKeyword(input.keyword);
  const assigneeName = normalizeKeyword(input.assigneeName);
  const hasExplicitAssigneeFilter = Boolean(input.assigneeType || input.assigneeId || assigneeName);
  const statusItems = items.filter((item) => (!status ? true : getItemStatus(item) === status));
  const filteredItems = statusItems.filter((item) => {
    if (!matchesAssignee(item, input.assigneeType, input.assigneeId)) return false;
    if (assigneeName) return scoreAssigneeKeywordMatch(item, assigneeName) > 0;
    return true;
  });

  const assigneeKeywordItems =
    !hasExplicitAssigneeFilter && keyword
      ? statusItems
          .map((item, index) => ({ item, index, score: scoreAssigneeKeywordMatch(item, keyword) }))
          .filter(({ score }) => score >= 20)
          .sort((a, b) => b.score - a.score || a.index - b.index)
          .map(({ item }) => item)
      : [];

  const scopedItems =
    hasExplicitAssigneeFilter || assigneeKeywordItems.length > 0
      ? assigneeKeywordItems.length > 0
        ? assigneeKeywordItems
        : filteredItems
      : filteredItems.filter((item) => matchesCurrentUserParticipation(item, input.userId));

  if (!keyword) return scopedItems.slice(0, limit);

  return scopedItems
    .map((item, index) => ({ item, index, score: scoreKeywordMatch(item, keyword) }))
    .filter(({ score }) => score > 0)
    .sort((a, b) => b.score - a.score || a.index - b.index)
    .map(({ item }) => item)
    .slice(0, limit);
}

async function requestJson(
  config: RequestConfig,
  path: URL,
  init: Omit<RequestInit, 'headers'> & { headers?: Record<string, string> } = {}
): Promise<unknown> {
  const authToken = resolveScheduleApiSecret();
  if (!authToken) {
    throw new Error('缺少 IPOLLO_APP_TASK_API_SECRET，无法访问 iPollo App 日程接口。');
  }
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
        Authorization: `Bearer ${authToken}`,
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

async function withScheduleApiBaseUrl<T>(
  missingMessage: string,
  run: (baseUrl: string) => Promise<T>
): Promise<T> {
  const baseUrl = resolveScheduleApiBaseUrl();
  if (!baseUrl) throw new Error(missingMessage);
  return run(baseUrl);
}

export async function queryScheduleTasks(input: QueryTasksInput): Promise<ApiResult> {
  return withScheduleApiBaseUrl('缺少 iPollo App 后端地址，无法读取日程。', async (baseUrl) => {
    const buildQueryUrl = (includeTimeRange: boolean) => {
      const url = buildTasksUrl(baseUrl, input.applicationId);
      if (includeTimeRange) {
        if (input.from) url.searchParams.set('dueFrom', input.from);
        if (input.to) url.searchParams.set('dueTo', input.to);
      }
      if (input.includeCompleted) url.searchParams.set('includeCompleted', 'true');
      return url;
    };

    const raw = await requestJson(input, buildQueryUrl(true), { method: 'GET' });
    let items = filterScheduleTasksForQuery(extractItems(raw), input);

    if (items.length === 0 && normalizeKeyword(input.keyword) && (input.from || input.to)) {
      const fallbackUrl = buildQueryUrl(false);
      const fallbackRaw = await requestJson(input, fallbackUrl, { method: 'GET' });
      items = filterScheduleTasksForQuery(extractItems(fallbackRaw), input);
      if (items.length > 0) return { raw: fallbackRaw, items };
    }

    return { raw, items };
  });
}

export async function queryAppPublishedAgents(
  input: RequestConfig & {
    taskText?: string;
    limit?: number;
    excludeFastGPTAppId?: string;
  }
): Promise<{ raw: unknown; agents: AppPublishedAgent[] }> {
  return withScheduleApiBaseUrl(
    '缺少 iPollo App 后端地址，无法读取当前 App 已上线智能体。',
    async (baseUrl) => {
      const url = buildPublishedAgentsUrl(baseUrl, input.applicationId);
      if (input.taskText) url.searchParams.set('taskText', input.taskText);
      if (input.limit) url.searchParams.set('limit', String(input.limit));
      if (input.excludeFastGPTAppId) {
        url.searchParams.set('excludeFastGPTAppId', input.excludeFastGPTAppId);
      }

      const raw = await requestJson(input, url, { method: 'GET' });
      return {
        raw,
        agents: extractAgents(raw)
          .map(normalizePublishedAgent)
          .filter(Boolean) as AppPublishedAgent[]
      };
    }
  );
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
