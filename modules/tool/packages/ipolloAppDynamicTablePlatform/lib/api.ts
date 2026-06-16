import type { DynamicTable, DynamicTablesPlan } from './schema';
import { getTableKey, normalizeStorageFieldType, safeSlug } from './schema';

type RequestContext = {
  applicationId: string;
  userId?: string;
  authToken?: string;
  agentId?: string;
};

export type DirectoryRecord = {
  id: string;
  name?: string;
  slug?: string;
  config?: Record<string, unknown>;
};

const DEFAULT_ONLINE_API_BASE_URL = 'https://core.metaio.cc';
const DEFAULT_LOCAL_API_BASE_URLS = [
  'http://host.docker.internal:3007',
  'http://127.0.0.1:3007',
  'http://localhost:3007'
];
const DEFAULT_TIMEOUT_MS = 15000;

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

function deriveBaseUrlFromApiUrl(raw: string): string {
  if (!raw.trim()) return '';

  try {
    const url = new URL(raw.trim());
    const pathname = url.pathname.replace(/\/+$/, '');
    const apiSegmentIndex = pathname.indexOf('/api/');
    url.search = '';
    url.hash = '';
    url.pathname =
      apiSegmentIndex >= 0 ? pathname.slice(0, apiSegmentIndex) : pathname === '/api' ? '' : '';
    return normalizeBaseUrl(url.toString());
  } catch {
    return '';
  }
}

const isLocalUrl = (raw: string): boolean => {
  const text = raw.trim().toLowerCase();
  return (
    text.includes('localhost') ||
    text.includes('127.0.0.1') ||
    text.includes('host.docker.internal') ||
    text.includes('ipolloos-app') ||
    text.includes('ipolloos-plugin')
  );
};

function isLocalRuntime(): boolean {
  const explicit = firstNonEmpty(
    readEnv('IPOLLO_RUNTIME_ENV'),
    readEnv('AINO_RUNTIME_ENV')
  ).toLowerCase();
  if (['local', 'development', 'dev'].includes(explicit)) return true;
  if (['online', 'production', 'prod'].includes(explicit)) return false;
  if (readEnv('NODE_ENV').toLowerCase() === 'production') return false;
  return [
    'IPOLLO_APP_DYNAMIC_TABLE_API_BASE_URL',
    'IPOLLO_APP_API_BASE_URL',
    'AINO_API_BASE_URL',
    'NEXT_PUBLIC_CORE_API_URL',
    'FE_DOMAIN',
    'NEXT_PUBLIC_BASE_URL'
  ]
    .map(readEnv)
    .some(isLocalUrl);
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

export function resolveDynamicTableApiBaseUrls(): string[] {
  const derivedUrls = uniqueUrls([
    deriveBaseUrlFromApiUrl(readEnv('IPOLLO_APP_DATA_CONTEXT_URL')),
    deriveBaseUrlFromApiUrl(readEnv('APP_DATA_CONTEXT_URL')),
    deriveBaseUrlFromApiUrl(readEnv('LUMI_APP_DATA_CONTEXT_URL')),
    deriveBaseUrlFromApiUrl(readEnv('IPOLLO_APP_REGISTER_URL'))
  ]);
  const direct = firstNonEmpty(
    readEnv('IPOLLO_APP_DYNAMIC_TABLE_API_BASE_URL'),
    readEnv('IPOLLO_APP_API_BASE_URL'),
    readEnv('AINO_API_BASE_URL'),
    readEnv('NEXT_PUBLIC_CORE_API_URL')
  );
  if (direct) return uniqueUrls([direct, ...derivedUrls]);
  if (derivedUrls.length > 0) return derivedUrls;

  if (isLocalRuntime()) {
    return uniqueUrls([
      readEnv('IPOLLO_APP_LOCAL_API_BASE_URL'),
      readEnv('AINO_LOCAL_API_BASE_URL'),
      ...DEFAULT_LOCAL_API_BASE_URLS
    ]);
  }

  return uniqueUrls([DEFAULT_ONLINE_API_BASE_URL]);
}

function resolveTimeoutMs(): number {
  const raw = firstNonEmpty(
    readEnv('IPOLLO_APP_DYNAMIC_TABLE_API_TIMEOUT_MS'),
    readEnv('AINO_API_TIMEOUT_MS')
  );
  const timeout = Number(raw);
  return Number.isFinite(timeout) && timeout > 0 ? timeout : DEFAULT_TIMEOUT_MS;
}

function truncateText(value: unknown, maxLength = 1200): string {
  const text = typeof value === 'string' ? value : JSON.stringify(value);
  return text.length > maxLength ? `${text.slice(0, maxLength)}...` : text;
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

function getTraceId(res: Response): string | undefined {
  return (
    res.headers.get('x-trace-id') ||
    res.headers.get('x-request-id') ||
    res.headers.get('request-id') ||
    undefined
  );
}

function getApiMessage(data: unknown): string {
  if (!data || typeof data !== 'object') return '';
  return String(
    (data as Record<string, unknown>).error ?? (data as Record<string, unknown>).message ?? ''
  );
}

async function requestJson(
  context: RequestContext,
  path: URL,
  init: Omit<RequestInit, 'headers'> & { headers?: Record<string, string> } = {}
): Promise<unknown> {
  const authToken = context.authToken;
  if (!authToken) path.searchParams.set('noAuth', 'true');
  const method = String(init.method || 'GET').toUpperCase();
  const timeoutMs = resolveTimeoutMs();

  let res: Response;
  try {
    res = await fetch(path.toString(), {
      ...init,
      signal: init.signal ?? AbortSignal.timeout(timeoutMs),
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
        'x-application-id': context.applicationId,
        ...(context.userId ? { 'x-current-user-id': context.userId } : {}),
        ...(authToken ? { Authorization: `Bearer ${authToken}` } : {}),
        ...(init.headers ?? {})
      }
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    throw new Error(`iPollo App 动态表请求失败：${method} ${path.pathname} ${message}`);
  }

  const data = await readJsonResponse(res);
  const message = getApiMessage(data);
  if (!res.ok) {
    throw new Error(
      `iPollo App 动态表接口 HTTP ${res.status}${message ? `：${message}` : ''}：${truncateText({
        traceId: getTraceId(res),
        path: path.pathname,
        response: data
      })}`
    );
  }
  if (data && typeof data === 'object' && (data as Record<string, unknown>).success === false) {
    throw new Error(message || `iPollo App 动态表接口返回失败：${truncateText(data)}`);
  }
  return data;
}

function shouldTryNextBaseUrl(error: unknown): boolean {
  const message = String(error instanceof Error ? error.message : error).toLowerCase();
  return (
    message.includes('fetch failed') ||
    message.includes('failed to fetch') ||
    message.includes('econnrefused') ||
    message.includes('enotfound') ||
    message.includes('etimedout') ||
    message.includes('network')
  );
}

async function withBaseUrl<T>(
  missingMessage: string,
  run: (baseUrl: string) => Promise<T>
): Promise<T> {
  const baseUrls = resolveDynamicTableApiBaseUrls();
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

function unwrapData(data: unknown): unknown {
  if (data && typeof data === 'object' && 'data' in data) {
    return (data as Record<string, unknown>).data;
  }
  return data;
}

export async function listDynamicTableDirectories(
  context: RequestContext
): Promise<DirectoryRecord[]> {
  return withBaseUrl('缺少 iPollo App 后端地址，无法查询动态表。', async (baseUrl) => {
    const url = new URL(`${baseUrl}/api/directories`);
    url.searchParams.set('applicationId', context.applicationId);
    url.searchParams.set('type', 'table');
    url.searchParams.set('limit', '100');
    const raw = unwrapData(await requestJson(context, url, { method: 'GET' }));
    if (Array.isArray(raw)) return raw as DirectoryRecord[];
    if (
      raw &&
      typeof raw === 'object' &&
      Array.isArray((raw as Record<string, unknown>).directories)
    ) {
      return (raw as Record<string, unknown>).directories as DirectoryRecord[];
    }
    return [];
  });
}

export async function importDynamicTablesModule(
  context: RequestContext,
  manifest: Record<string, unknown>
): Promise<unknown> {
  return withBaseUrl('缺少 iPollo App 后端地址，无法创建动态表。', async (baseUrl) => {
    const url = new URL(`${baseUrl}/api/module-import`);
    url.searchParams.set('applicationId', context.applicationId);
    url.searchParams.set('mode', 'commit');
    return requestJson(context, url, {
      method: 'POST',
      body: JSON.stringify({ manifest })
    });
  });
}

export async function queryDynamicTableRecords(
  context: RequestContext,
  input: {
    directoryId: string;
    filter?: Record<string, unknown>;
    search?: string;
    limit?: number;
    page?: number;
  }
) {
  return withBaseUrl('缺少 iPollo App 后端地址，无法查询动态表记录。', async (baseUrl) => {
    const url = new URL(`${baseUrl}/api/records/${input.directoryId}`);
    url.searchParams.set('applicationId', context.applicationId);
    url.searchParams.set('page', String(input.page || 1));
    url.searchParams.set('limit', String(Math.max(1, Math.min(100, Number(input.limit) || 20))));
    if (input.filter && Object.keys(input.filter).length > 0) {
      url.searchParams.set('filter', JSON.stringify(input.filter));
    }
    if (input.search) {
      url.searchParams.set('searchStr', input.search);
    }
    return unwrapData(await requestJson(context, url, { method: 'GET' }));
  });
}

export async function insertDynamicTableRecord(
  context: RequestContext,
  input: { directoryId: string; record: Record<string, unknown> }
) {
  return withBaseUrl('缺少 iPollo App 后端地址，无法新增动态表记录。', async (baseUrl) => {
    const url = new URL(`${baseUrl}/api/records/${input.directoryId}`);
    url.searchParams.set('applicationId', context.applicationId);
    return requestJson(context, url, {
      method: 'POST',
      body: JSON.stringify({ props: input.record })
    });
  });
}

export async function updateDynamicTableRecord(
  context: RequestContext,
  input: { directoryId: string; recordId: string; patch: Record<string, unknown> }
) {
  return withBaseUrl('缺少 iPollo App 后端地址，无法更新动态表记录。', async (baseUrl) => {
    const url = new URL(`${baseUrl}/api/records/${input.directoryId}/${input.recordId}`);
    url.searchParams.set('applicationId', context.applicationId);
    return requestJson(context, url, {
      method: 'PATCH',
      body: JSON.stringify({ props: input.patch })
    });
  });
}

export async function deleteDynamicTableRecord(
  context: RequestContext,
  input: { directoryId: string; recordId: string }
) {
  return withBaseUrl('缺少 iPollo App 后端地址，无法删除动态表记录。', async (baseUrl) => {
    const url = new URL(`${baseUrl}/api/records/${input.directoryId}/${input.recordId}`);
    url.searchParams.set('applicationId', context.applicationId);
    return requestJson(context, url, { method: 'DELETE' });
  });
}

function normalizeDirectoryKey(value: unknown): string {
  return String(value ?? '')
    .trim()
    .toLowerCase();
}

function getDirectoryMatchKeys(directory: DirectoryRecord): string[] {
  const config = directory.config ?? {};
  return [config.agentDataTableKey, directory.slug, directory.name]
    .map(normalizeDirectoryKey)
    .filter(Boolean);
}

function getDirectoryAgentId(directory: DirectoryRecord): string {
  const config = directory.config ?? {};
  return firstNonEmpty(config.agentId, config.appBotId, config.fastgptAppId);
}

function isDirectoryForAgent(directory: DirectoryRecord, agentId?: string): boolean {
  if (!agentId) return true;
  return getDirectoryAgentId(directory) === agentId;
}

export async function resolveDynamicTableDirectory(context: RequestContext, tableKey: string) {
  const target = normalizeDirectoryKey(tableKey);
  if (!target) throw new Error('表名不能为空。');

  const directories = await listDynamicTableDirectories(context);
  const agentDirectories = directories.filter((directory) =>
    isDirectoryForAgent(directory, context.agentId)
  );
  const hit = agentDirectories.find((directory) =>
    getDirectoryMatchKeys(directory).includes(target)
  );
  if (!hit) {
    const available = agentDirectories
      .map((directory) => directory.config?.agentDataTableKey || directory.slug || directory.name)
      .filter(Boolean)
      .slice(0, 20);
    throw new Error(
      `未找到动态表：${tableKey}${available.length ? `。可用表：${available.join(', ')}` : ''}`
    );
  }

  return hit;
}

export function buildDynamicTablesManifest(params: {
  plan: DynamicTablesPlan;
  tables: DynamicTable[];
  applicationId: string;
  agentId?: string;
}) {
  const moduleKey = safeSlug(
    params.plan.moduleKey || `agent_data_${params.agentId || params.applicationId}`,
    'agent_data'
  );
  const moduleName = params.plan.moduleName || '智能体数据表';
  return {
    module: {
      moduleKey,
      displayName: moduleName,
      type: 'agent_data',
      config: {
        source: 'ipolloos-agent-v2',
        agentId: params.agentId,
        i18n: { name: { zh: moduleName, en: 'Agent data tables' } }
      }
    },
    directories: params.tables.map((table) => {
      const tableKey = getTableKey(table);
      return {
        name: table.name,
        nameEn: table.nameEn,
        slug: safeSlug(table.slug || tableKey, tableKey),
        type: 'table',
        supportsCategory: false,
        config: {
          source: 'ipolloos-agent-v2',
          agentId: params.agentId,
          agentDataTable: true,
          agentDataTableKey: tableKey,
          tableKind: table.kind || 'custom',
          description: table.description || ''
        },
        fields: table.fields.map((field, fieldIndex) => ({
          key: field.key,
          label: field.label,
          description: field.description,
          type: normalizeStorageFieldType(field.type),
          required: field.required ?? false,
          showInList: field.showInList ?? fieldIndex < 6,
          showInForm: field.showInForm ?? true,
          showInDetail: field.showInDetail ?? true,
          placeholder: field.placeholder,
          options: field.options,
          preset: field.preset,
          validators: field.validators,
          config: {
            ...(field.config ?? {}),
            appFieldType: field.type,
            agentDataField: true
          },
          order: fieldIndex
        }))
      };
    })
  };
}
