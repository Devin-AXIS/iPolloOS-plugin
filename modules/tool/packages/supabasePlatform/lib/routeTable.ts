/**
 * Supabase Management API 路由表（供统一管理工具按 operation 分发）。
 * 与官方路径保持一致；不含数据库 SQL（见 supabaseDatabase 子工具）。
 */

export type BodyKind = 'none' | 'empty' | 'json' | 'jsonOpt';

export type RouteDef = {
  method: 'GET' | 'POST' | 'PATCH' | 'PUT' | 'DELETE';
  path: string;
  /** 路径占位符，从 props 取值（projectRef / organizationSlug 可先经 default* 解析） */
  pathVars?: readonly string[];
  body?: BodyKind;
  /** 可选 query 参数名（值来自 props 上同名字段，非空才附加） */
  queryKeys?: readonly string[];
};

export const MANAGEMENT_OPERATIONS = {
  'org.list': { method: 'GET', path: '/v1/organizations' },
  'org.get': {
    method: 'GET',
    path: '/v1/organizations/:organizationSlug',
    pathVars: ['organizationSlug']
  },
  'org.members': {
    method: 'GET',
    path: '/v1/organizations/:organizationSlug/members',
    pathVars: ['organizationSlug']
  },
  'org.projects': {
    method: 'GET',
    path: '/v1/organizations/:organizationSlug/projects',
    pathVars: ['organizationSlug']
  },

  'project.list': { method: 'GET', path: '/v1/projects' },
  'project.get': { method: 'GET', path: '/v1/projects/:projectRef', pathVars: ['projectRef'] },
  'project.create': { method: 'POST', path: '/v1/projects', body: 'json' },
  'project.delete': {
    method: 'DELETE',
    path: '/v1/projects/:projectRef',
    pathVars: ['projectRef']
  },
  'project.pause': {
    method: 'POST',
    path: '/v1/projects/:projectRef/pause',
    pathVars: ['projectRef'],
    body: 'empty'
  },
  'project.restore': {
    method: 'POST',
    path: '/v1/projects/:projectRef/restore',
    pathVars: ['projectRef'],
    body: 'empty'
  },
  'project.restoreCancel': {
    method: 'POST',
    path: '/v1/projects/:projectRef/restore/cancel',
    pathVars: ['projectRef'],
    body: 'empty'
  },
  'project.upgrade': {
    method: 'POST',
    path: '/v1/projects/:projectRef/upgrade',
    pathVars: ['projectRef'],
    body: 'json'
  },

  'secrets.list': {
    method: 'GET',
    path: '/v1/projects/:projectRef/secrets',
    pathVars: ['projectRef']
  },
  'secrets.create': {
    method: 'POST',
    path: '/v1/projects/:projectRef/secrets',
    pathVars: ['projectRef'],
    body: 'json'
  },
  'secrets.delete': {
    method: 'DELETE',
    path: '/v1/projects/:projectRef/secrets',
    pathVars: ['projectRef'],
    body: 'json'
  },

  'apiKey.list': {
    method: 'GET',
    path: '/v1/projects/:projectRef/api-keys',
    pathVars: ['projectRef']
  },
  'apiKey.create': {
    method: 'POST',
    path: '/v1/projects/:projectRef/api-keys',
    pathVars: ['projectRef'],
    body: 'json'
  },
  'apiKey.delete': {
    method: 'DELETE',
    path: '/v1/projects/:projectRef/api-keys/:apiKeyId',
    pathVars: ['projectRef', 'apiKeyId']
  },

  'function.list': {
    method: 'GET',
    path: '/v1/projects/:projectRef/functions',
    pathVars: ['projectRef']
  },
  'function.deploy': {
    method: 'POST',
    path: '/v1/projects/:projectRef/functions/deploy',
    pathVars: ['projectRef'],
    queryKeys: ['slug'],
    body: 'json'
  },
  'function.delete': {
    method: 'DELETE',
    path: '/v1/projects/:projectRef/functions/:functionSlug',
    pathVars: ['projectRef', 'functionSlug']
  },

  'auth.get': {
    method: 'GET',
    path: '/v1/projects/:projectRef/config/auth',
    pathVars: ['projectRef']
  },
  'auth.patch': {
    method: 'PATCH',
    path: '/v1/projects/:projectRef/config/auth',
    pathVars: ['projectRef'],
    body: 'json'
  },

  'realtime.get': {
    method: 'GET',
    path: '/v1/projects/:projectRef/config/realtime',
    pathVars: ['projectRef']
  },
  'realtime.patch': {
    method: 'PATCH',
    path: '/v1/projects/:projectRef/config/realtime',
    pathVars: ['projectRef'],
    body: 'json'
  },
  'realtime.shutdown': {
    method: 'POST',
    path: '/v1/projects/:projectRef/config/realtime/shutdown',
    pathVars: ['projectRef'],
    body: 'empty'
  },

  'storage.get': {
    method: 'GET',
    path: '/v1/projects/:projectRef/config/storage',
    pathVars: ['projectRef']
  },
  'storage.patch': {
    method: 'PATCH',
    path: '/v1/projects/:projectRef/config/storage',
    pathVars: ['projectRef'],
    body: 'json'
  },
  'storage.buckets': {
    method: 'GET',
    path: '/v1/projects/:projectRef/storage/buckets',
    pathVars: ['projectRef']
  },

  'hostname.get': {
    method: 'GET',
    path: '/v1/projects/:projectRef/custom-hostname',
    pathVars: ['projectRef']
  },
  'hostname.initialize': {
    method: 'POST',
    path: '/v1/projects/:projectRef/custom-hostname/initialize',
    pathVars: ['projectRef'],
    body: 'json'
  },
  'hostname.reverify': {
    method: 'POST',
    path: '/v1/projects/:projectRef/custom-hostname/reverify',
    pathVars: ['projectRef'],
    body: 'jsonOpt'
  },
  'hostname.activate': {
    method: 'POST',
    path: '/v1/projects/:projectRef/custom-hostname/activate',
    pathVars: ['projectRef'],
    body: 'json'
  },
  'hostname.delete': {
    method: 'DELETE',
    path: '/v1/projects/:projectRef/config/custom-hostname',
    pathVars: ['projectRef']
  },

  'vanity.get': {
    method: 'GET',
    path: '/v1/projects/:projectRef/vanity-subdomain',
    pathVars: ['projectRef']
  },
  'vanity.checkAvailability': {
    method: 'POST',
    path: '/v1/projects/:projectRef/vanity-subdomain/check-availability',
    pathVars: ['projectRef'],
    body: 'json'
  },
  'vanity.activate': {
    method: 'POST',
    path: '/v1/projects/:projectRef/vanity-subdomain/activate',
    pathVars: ['projectRef'],
    body: 'json'
  },
  'vanity.delete': {
    method: 'DELETE',
    path: '/v1/projects/:projectRef/vanity-subdomain',
    pathVars: ['projectRef']
  },

  'branch.list': {
    method: 'GET',
    path: '/v1/projects/:projectRef/branches',
    pathVars: ['projectRef']
  },
  'branch.create': {
    method: 'POST',
    path: '/v1/projects/:projectRef/branches',
    pathVars: ['projectRef'],
    body: 'json'
  },
  'branch.get': { method: 'GET', path: '/v1/branches/:branchId', pathVars: ['branchId'] },
  'branch.delete': { method: 'DELETE', path: '/v1/branches/:branchId', pathVars: ['branchId'] },
  'branch.merge': {
    method: 'POST',
    path: '/v1/branches/:branchId/merge',
    pathVars: ['branchId'],
    body: 'json'
  }
} as const satisfies Record<string, RouteDef>;

export type ManagementOperation = keyof typeof MANAGEMENT_OPERATIONS;

export const MANAGEMENT_OPERATION_LIST = Object.keys(
  MANAGEMENT_OPERATIONS
) as ManagementOperation[];
