import { stripDataUrlBase64 } from './decompressArchive';

const MAX_DOWNLOAD_BYTES = 100 * 1024 * 1024;
const MAX_BASE64_INPUT_CHARS = 90 * 1024 * 1024;
const FETCH_TIMEOUT_MS = 180_000;

function summarizeUrlHost(u: string): string {
  try {
    const { protocol, hostname, port } = new URL(u);
    return `${protocol}//${hostname}${port ? `:${port}` : ''}`;
  } catch {
    return '(invalid-url)';
  }
}

function formatFetchError(e: unknown, fetchUrl: string): string {
  const host = summarizeUrlHost(fetchUrl);
  const bits: string[] = [];
  if (e instanceof Error) {
    bits.push(e.message);
    const anyE = e as Error & { cause?: unknown; code?: string; errno?: number };
    if (anyE.code) bits.push(`code=${anyE.code}`);
    if (typeof anyE.errno === 'number') bits.push(`errno=${anyE.errno}`);
    const c = anyE.cause;
    if (c instanceof Error) {
      bits.push(`cause: ${c.message}`);
    } else if (c && typeof c === 'object' && 'code' in c) {
      bits.push(`cause.code=${String((c as { code?: unknown }).code)}`);
    }
  } else {
    bits.push(String(e));
  }
  return `下载压缩包失败：${bits.join('；')}。请求主机：${host}。若存储为环回地址，请升级主程序（主应用内联 archive_files）或配置 STORAGE_EXTERNAL_ENDPOINT / IPOLLOOS_SYSTEM_TOOL_FILE_DELIVERY=inline。`;
}

export type ResolvedBuffer = { ok: true; buf: Buffer } | { ok: false; system_error: string };

const INLINE_KEY = '__ipolloosInlineArchiveBase64';

/** 主应用内联注入的整包 base64，无需再 fetch */
export function tryReadInlineArchiveBuffer(archive_files: unknown): Buffer | null {
  const fromObject = (o: unknown): Buffer | null => {
    if (!o || typeof o !== 'object' || Array.isArray(o)) return null;
    const b64 = (o as Record<string, unknown>)[INLINE_KEY];
    if (typeof b64 !== 'string' || !b64.trim()) return null;
    try {
      const buf = Buffer.from(b64.trim(), 'base64');
      return buf.length > 0 ? buf : null;
    } catch {
      return null;
    }
  };

  if (archive_files === undefined || archive_files === null) return null;

  const direct = fromObject(archive_files);
  if (direct) return direct;

  if (Array.isArray(archive_files)) {
    for (const it of archive_files) {
      const b = fromObject(it);
      if (b) return b;
      if (typeof it === 'string') {
        const t = it.trim();
        if (t.startsWith('{')) {
          try {
            const b2 = fromObject(JSON.parse(t) as unknown);
            if (b2) return b2;
          } catch {
            // ignore
          }
        }
      }
    }
    return null;
  }

  if (typeof archive_files === 'string') {
    const t = archive_files.trim();
    if (t.startsWith('{')) {
      try {
        return fromObject(JSON.parse(t) as unknown);
      } catch {
        return null;
      }
    }
  }
  return null;
}

function firstFileUrl(files: unknown): string | null {
  if (files === undefined || files === null) return null;

  let arr: unknown[] = [];
  if (typeof files === 'string') {
    const t = files.trim();
    if (!t) return null;
    if (/^https?:\/\//i.test(t)) {
      return t;
    }
    if (t.startsWith('[') || t.startsWith('{')) {
      try {
        const p = JSON.parse(t) as unknown;
        arr = Array.isArray(p) ? p : [p];
      } catch {
        if (/^https?:\/\//i.test(t)) return t;
        return null;
      }
    } else {
      return null;
    }
  } else if (Array.isArray(files)) {
    arr = files;
  } else if (files && typeof files === 'object') {
    arr = [files];
  } else {
    return null;
  }

  if (arr.length === 0) return null;
  const first = arr[0];
  if (typeof first === 'string' && /^https?:\/\//i.test(first.trim())) {
    return first.trim();
  }
  if (first && typeof first === 'object') {
    const o = first as Record<string, unknown>;
    const u = o.url ?? o.src;
    if (typeof u === 'string' && /^https?:\/\//i.test(u.trim())) {
      return u.trim();
    }
    if (o.key && !u) {
      return '__NEED_URL__';
    }
  }
  return null;
}

/**
 * 三选一：archive_url、archive_base64、archive_files（工作流「文件」连线，取第一项可下载 URL）
 */
export async function resolveArchiveToBuffer(params: {
  archive_url?: string;
  archive_base64?: string;
  archive_files?: unknown;
}): Promise<ResolvedBuffer> {
  const urlTrim = (params.archive_url ?? '').trim();
  const b64Raw = (params.archive_base64 ?? '').trim();
  const inlineBuf = tryReadInlineArchiveBuffer(params.archive_files);
  const hasInline = !!(inlineBuf && inlineBuf.length > 0);
  const fromFiles = firstFileUrl(params.archive_files);

  const hasUrl = urlTrim.length > 0;
  const hasB64 = b64Raw.length > 0;
  const hasFiles = fromFiles !== null;

  const n = [hasUrl, hasB64, hasFiles, hasInline].filter(Boolean).length;
  if (n === 0) {
    return {
      ok: false,
      system_error:
        '请三选一填写：压缩包 URL、或 archive_base64（整包 base64）、或「上传文件」连线（archive_files）。'
    };
  }
  if (n > 1) {
    return {
      ok: false,
      system_error: '请只填一种来源：URL、base64、文件连线或主应用内联包，不要混用。'
    };
  }

  if (hasInline) {
    return { ok: true, buf: inlineBuf! };
  }

  if (hasB64) {
    if (b64Raw.length > MAX_BASE64_INPUT_CHARS) {
      return { ok: false, system_error: 'base64 输入过长，请改用 URL 或缩小压缩包。' };
    }
    try {
      const buf = Buffer.from(stripDataUrlBase64(b64Raw), 'base64');
      if (buf.length === 0) {
        return { ok: false, system_error: 'base64 解码后为空' };
      }
      if (buf.length > MAX_DOWNLOAD_BYTES) {
        return {
          ok: false,
          system_error: `解码后体积超过 ${MAX_DOWNLOAD_BYTES / 1024 / 1024}MB 上限`
        };
      }
      return { ok: true, buf };
    } catch {
      return { ok: false, system_error: 'archive_base64 不是合法 base64' };
    }
  }

  let fetchUrl = '';
  if (hasUrl) {
    fetchUrl = urlTrim;
  } else if (fromFiles === '__NEED_URL__') {
    return {
      ok: false,
      system_error:
        '上传文件缺少可下载 URL。请在工作流中让「文件」节点能解析出带签名的链接，或先把文件传到可 GET 的地址后使用「压缩包 URL」。'
    };
  } else if (fromFiles) {
    fetchUrl = fromFiles;
  }

  if (!fetchUrl) {
    return { ok: false, system_error: '未能从文件参数解析出下载地址' };
  }

  try {
    const u = new URL(fetchUrl);
    if (u.protocol !== 'http:' && u.protocol !== 'https:') {
      return { ok: false, system_error: '仅支持 http(s) 下载地址' };
    }
  } catch {
    return { ok: false, system_error: '压缩包 URL 格式无效' };
  }

  try {
    const ac = new AbortController();
    const timer = setTimeout(() => ac.abort(), FETCH_TIMEOUT_MS);
    let res: Response;
    try {
      res = await fetch(fetchUrl, { redirect: 'follow', signal: ac.signal });
    } finally {
      clearTimeout(timer);
    }
    if (!res.ok) {
      let bodyHint = '';
      try {
        const t = await res.clone().text();
        if (t && t.length < 400) bodyHint = ` 响应体: ${t.replace(/\s+/g, ' ').slice(0, 300)}`;
      } catch {
        // ignore
      }
      return {
        ok: false,
        system_error: `HTTP ${res.status} ${res.statusText || ''}${bodyHint}（${summarizeUrlHost(fetchUrl)}）`
      };
    }
    const ab = await res.arrayBuffer();
    if (ab.byteLength > MAX_DOWNLOAD_BYTES) {
      return {
        ok: false,
        system_error: `下载体积超过 ${MAX_DOWNLOAD_BYTES / 1024 / 1024}MB 上限`
      };
    }
    return { ok: true, buf: Buffer.from(ab) };
  } catch (e: unknown) {
    if (e instanceof Error && e.name === 'AbortError') {
      return {
        ok: false,
        system_error: `下载超时（>${FETCH_TIMEOUT_MS / 1000}s）：${summarizeUrlHost(fetchUrl)}`
      };
    }
    return { ok: false, system_error: formatFetchError(e, fetchUrl) };
  }
}
