import type { IsolationScope } from './keys';

export type ScopeInput = 'auto' | IsolationScope;

/** 明显偏「静态站资源」的扩展名（单文件上传时的默认归类） */
const SITE_ASSET_EXT =
  /\.(html?|css|js|mjs|cjs|svg|ico|wasm|map|woff2?|woff|ttf|otf|eot|png|jpe?g|gif|webp|avif|webmanifest)$/i;

/** 明显偏「普通文件 / 附件」的扩展名 */
const FILE_ASSET_EXT =
  /\.(zip|7z|rar|tar|gz|tgz|bz2|xz|pdf|docx?|xlsx?|pptx?|csv|dmg|exe|apk|mp4|mp3|mov|avi|mkv|json|txt|md|log)$/i;

function mimeToScope(ct: string): IsolationScope | null {
  const c = ct.toLowerCase().split(';')[0].trim();
  if (c === 'text/html') return 'sites';
  if (c.includes('javascript')) return 'sites';
  if (c === 'text/css') return 'sites';
  if (c.startsWith('image/')) return 'sites';
  if (c.startsWith('font/')) return 'sites';
  if (c === 'application/wasm') return 'sites';
  if (c === 'text/plain' || c === 'text/markdown') return 'files';
  if (c === 'application/json') return 'files';
  if (c.includes('pdf') || c.includes('zip') || c.includes('octet-stream')) return 'files';
  return null;
}

function pathToScope(pathOrKey: string): IsolationScope | null {
  const k = pathOrKey.toLowerCase();
  if (FILE_ASSET_EXT.test(k)) return 'files';
  if (SITE_ASSET_EXT.test(k)) return 'sites';
  return null;
}

function sourceUrlPathHint(sourceUrl: string): IsolationScope | null {
  try {
    const u = new URL(sourceUrl);
    return pathToScope(u.pathname);
  } catch {
    return null;
  }
}

/**
 * `auto`：综合相对路径、（文本）Content-Type、源 URL 路径、以及 URL 拉取后的响应 Content-Type 推断。
 * 显式 `sites` / `files` 原样返回。
 */
export function resolveIsolationScope(params: {
  scopeInput: ScopeInput;
  relativeKey: string;
  /** 节点入参里的 Content-Type（写文本时必有；写 URL 时可选） */
  contentType?: string;
  sourceUrl?: string;
  /** 仅从 HTTP 响应头得到的一级类型（URL 模式） */
  fetchedContentType?: string;
}): { resolved: IsolationScope; reason: string } {
  if (params.scopeInput === 'sites' || params.scopeInput === 'files') {
    return { resolved: params.scopeInput, reason: 'explicit' };
  }

  const fromFetched = params.fetchedContentType?.trim();
  if (fromFetched) {
    const m = mimeToScope(fromFetched);
    if (m) return { resolved: m, reason: 'response-content-type' };
  }

  const fromInputCt = params.contentType?.trim();
  if (fromInputCt) {
    const m = mimeToScope(fromInputCt);
    if (m) return { resolved: m, reason: 'input-content-type' };
  }

  const fromRel = pathToScope(params.relativeKey);
  if (fromRel) return { resolved: fromRel, reason: 'relative-path' };

  const su = params.sourceUrl?.trim();
  if (su && /^https?:\/\//i.test(su)) {
    const fromUrl = sourceUrlPathHint(su);
    if (fromUrl) return { resolved: fromUrl, reason: 'source-url-path' };
  }

  return { resolved: 'files', reason: 'default' };
}
