import type { IsolationScope } from './keys';
import { buildIsolationPrefix, buildObjectKey } from './keys';

function truthy(v: unknown): boolean {
  if (v === true) return true;
  if (typeof v === 'string') return v === 'true' || v === '1' || v === 'yes';
  return false;
}

function protocol(secure: unknown): 'https:' | 'http:' {
  return truthy(secure) !== false ? 'https:' : 'http:';
}

function encodeObjectKeyForUrl(key: string): string {
  return key
    .split('/')
    .map((seg) => encodeURIComponent(seg))
    .join('/');
}

export function virtualHostObjectUrl(params: {
  bucket: string;
  region: string;
  key: string;
  secure?: unknown;
}): string {
  const p = protocol(params.secure);
  return `${p}//${params.bucket}.${params.region}.aliyuncs.com/${encodeObjectKeyForUrl(params.key)}`;
}

export function websiteObjectUrl(params: {
  bucket: string;
  region: string;
  key: string;
  secure?: unknown;
}): string {
  const zone = params.region.replace(/^oss-/i, '');
  const p = protocol(params.secure);
  return `${p}//${params.bucket}.oss-website-${zone}.aliyuncs.com/${encodeObjectKeyForUrl(params.key)}`;
}

export function publicBaseObjectUrl(publicBase: string, key: string): string {
  const base = publicBase.replace(/\/+$/, '');
  return `${base}/${encodeObjectKeyForUrl(key)}`;
}

export function resolveStableUrls(params: {
  bucket: string;
  region: string;
  key: string;
  scope: IsolationScope;
  secure?: unknown;
  ossPublicBaseUrl?: string;
}): {
  object_key: string;
  /** 主推：配置了自定义域名时优先 */
  primary_stable_url: string;
  virtual_host_url: string;
  website_preview_url: string;
  hint: string;
} {
  const virtual_host_url = virtualHostObjectUrl(params);
  const website_preview_url = websiteObjectUrl(params);
  const pub = params.ossPublicBaseUrl?.trim()
    ? publicBaseObjectUrl(params.ossPublicBaseUrl.trim(), params.key)
    : '';
  const primary_stable_url = pub || virtual_host_url;
  return {
    object_key: params.key,
    primary_stable_url,
    virtual_host_url,
    website_preview_url,
    hint:
      params.scope === 'sites'
        ? '静态页：控制台需开通「静态网站托管」后，预览用「静态站预览地址」更合适；资源配置里可填自定义域名作为主推链接。'
        : '公有读桶可直接用主推链接；私有桶务必生成下方「临时访问链接」发给访客。'
  };
}
