import type { IsolationScope } from './keys';

function encodeObjectKeyForUrl(key: string): string {
  return key
    .split('/')
    .map((seg) => encodeURIComponent(seg))
    .join('/');
}

/** 七牛文档/控制台常见的协议占位，避免被当成「无协议域名」再拼一层 https:// */
const HTTP_PAREN_PLACEHOLDER = /^https?:\/\/http\s*\(\s*s?\s*\)\s*:\/\//i;
const HTTP_PAREN_LEADING = /^http\s*\(\s*s?\s*\)\s*:\/\//i;

/**
 * 资源配置里常只填「域名」无协议；统一为 https，避免出现相对含义不明的链接。
 * 纠正误填的 `http(s)://` 占位符及重复协议前缀（防止出现 https://http(s)://...）。
 */
export function normalizePublicBaseUrl(raw: string): string {
  let s = raw.trim().replace(/\/+$/, '');
  if (!s) return s;

  s = s.replace(HTTP_PAREN_PLACEHOLDER, 'https://');
  s = s.replace(HTTP_PAREN_LEADING, 'https://');

  // 重复写了协议： https://https://host / https://http://host
  s = s.replace(/^https:\/\/https:\/\//i, 'https://');
  s = s.replace(/^https:\/\/http:\/\//i, 'http://');
  s = s.replace(/^http:\/\/https:\/\//i, 'https://');
  s = s.replace(/^http:\/\/http:\/\//i, 'http://');

  if (!/^https?:\/\//i.test(s)) {
    s = `https://${s}`;
  }
  return s;
}

export function publicHostnameOnly(normalizedBaseUrl: string): string {
  try {
    return new URL(normalizedBaseUrl).hostname;
  } catch {
    return (
      normalizedBaseUrl
        .replace(/^https?:\/\//i, '')
        .split('/')[0]
        ?.trim() ?? ''
    );
  }
}

/** 七牛 S3 兼容上传/存储域，不能当作对外「网站/下载」访问域名 */
export function isQiniuS3CompatInternalHost(hostname: string): boolean {
  return /\.qiniucs\.com$/i.test(hostname.trim());
}

export type ValidatedPublicBase =
  | { ok: true; normalized: string; host: string }
  | { ok: false; message: string };

/**
 * 校验插件资源配置里的访问域名：须为可对外提供 HTTPS 的绑定域名，禁止 *.qiniucs.com。
 */
export function validatePublicBaseUrlForKodoTool(raw: string): ValidatedPublicBase {
  const normalized = normalizePublicBaseUrl(raw);
  if (!normalized) {
    return { ok: false, message: '资源配置「访问域名」不能为空。' };
  }
  let host: string;
  try {
    host = new URL(normalized).hostname;
  } catch {
    return {
      ok: false,
      message: '资源配置「访问域名」不是合法 URL，请填写主机名或 https://您的绑定域名。'
    };
  }
  if (!host) {
    return { ok: false, message: '资源配置「访问域名」无法解析主机名。' };
  }
  if (isQiniuS3CompatInternalHost(host)) {
    return {
      ok: false,
      message:
        '资源配置「访问域名」不能填 *.qiniucs.com（S3 兼容域，浏览器无法作为站点域名使用）。请在七牛控制台为该空间绑定 HTTPS 访问域名，并把该域名填进插件配置；final_public_url 将为 https://绑定域名/ipolloos/应用ID/用户ID/会话ID/用途/您的路径 。'
    };
  }
  return { ok: true, normalized, host };
}

/** 确保对外链接为带路径的 https 绝对地址（防止配置异常时只输出主机名） */
export function assertHttpsObjectUrl(url: string, objectKey: string): void {
  let u: URL;
  try {
    u = new URL(url);
  } catch {
    throw new Error(`final_public_url 非法：${url}`);
  }
  if (u.protocol !== 'https:' && u.protocol !== 'http:') {
    throw new Error(`final_public_url 缺少 http(s) 协议：${url}`);
  }
  const path = u.pathname.replace(/^\/+|\/+$/g, '');
  if (!path) {
    throw new Error(`final_public_url 缺少对象路径（object_key=${objectKey}）`);
  }
}

/** 运行期校验：唯一权威对外 URL 的主机名与配置一致 */
export function publicUrlMatchesConfiguredHost(url: string, expectedHost: string): boolean {
  if (!expectedHost) return false;
  try {
    return new URL(url).hostname === expectedHost;
  } catch {
    return false;
  }
}

export function publicBaseObjectUrl(publicBase: string, key: string): string {
  const base = normalizePublicBaseUrl(publicBase).replace(/\/+$/, '');
  return `${base}/${encodeObjectKeyForUrl(key)}`;
}

export function resolveStableUrls(params: {
  key: string;
  scope: IsolationScope;
  qiniuPublicBaseUrl: string;
}): {
  object_key: string;
  primary_stable_url: string;
  website_preview_url: string;
  hint: string;
} {
  const trimmed = normalizePublicBaseUrl(params.qiniuPublicBaseUrl);
  const primary_stable_url = publicBaseObjectUrl(trimmed, params.key);
  return {
    object_key: params.key,
    primary_stable_url,
    website_preview_url: params.scope === 'sites' ? primary_stable_url : '',
    hint:
      params.scope === 'sites'
        ? '网页：请确认域名已在七牛绑定到该空间并走 HTTPS；多文件静态站请上传 index.html 及资源到相对路径下。'
        : '公开读空间可直接用主推链接；私有空间请把「临时访问」秒数设为大于 0 以生成带签名的下载链。'
  };
}
