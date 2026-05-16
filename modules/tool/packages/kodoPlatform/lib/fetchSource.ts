/** 长查询串、签名 URL 不用 z.string().url()（部分环境会误判） */
export function isLikelyHttpUrl(raw: string): boolean {
  const s = raw.trim();
  if (!/^https?:\/\//i.test(s)) return false;
  try {
    new URL(s);
    return true;
  } catch {
    return false;
  }
}

const FETCH_TIMEOUT_MS = 180_000;

/** 便于 minimal_json 分流：网络/DNS、超时、HTTP 状态、未知 */
export type FetchFailureKind = 'timeout' | 'network' | 'http_error' | 'unknown';

/** 对 fetch 异常或非 2xx 响应归类，给人看的 hint 与机器读的 kind */
export function classifyFetchFailure(
  e?: unknown,
  res?: Response
): { kind: FetchFailureKind; hint: string } {
  if (res && !res.ok) {
    const st = res.status;
    if (st === 403 || st === 401) {
      return {
        kind: 'http_error',
        hint: `HTTP ${st}：常见于签名过期、防盗链或无权访问；请换可匿名 GET 的直链，或由主应用内联文件再上传。`
      };
    }
    if (st >= 500) {
      return { kind: 'http_error', hint: `HTTP ${st}：源站或服务端错误，请稍后重试或换源地址。` };
    }
    return { kind: 'http_error', hint: `HTTP ${st}：无法下载源文件。` };
  }
  const name = e instanceof Error ? e.name : '';
  const msg = e instanceof Error ? e.message : String(e ?? '');
  if (name === 'AbortError' || /aborted|timeout/i.test(msg)) {
    return {
      kind: 'timeout',
      hint: '请求超时：源响应过慢；可换更近的 URL、缩短链路，或改用「文本内容」上传。'
    };
  }
  if (
    /fetch failed|ENOTFOUND|EAI_AGAIN|ECONNREFUSED|ECONNRESET|getaddrinfo|certificate|SSL|CERT_/i.test(
      msg
    )
  ) {
    return {
      kind: 'network',
      hint: '网络/DNS：插件进程无法访问该主机（内网地址、防火墙等）；请换公网 URL 或使用文本内容。'
    };
  }
  return { kind: 'unknown', hint: msg || '未知错误' };
}

/**
 * 拉取外链：浏览器 UA、Accept，超时；便于部分对象存储签名链校验。
 */
export async function fetchHttpSource(urlStr: string): Promise<Response> {
  const u = urlStr.trim();
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), FETCH_TIMEOUT_MS);
  try {
    return await fetch(u, {
      redirect: 'follow',
      signal: ctrl.signal,
      headers: {
        Accept: '*/*',
        'User-Agent': 'Mozilla/5.0 (compatible; iPolloOS-KodoUpload/2.2)'
      }
    });
  } finally {
    clearTimeout(timer);
  }
}

export function summarizeUrlForLog(
  urlStr: string,
  maxLen = 512
): { host: string; length: number; head: string } {
  const length = urlStr.length;
  let host = '';
  try {
    host = new URL(urlStr.trim()).hostname;
  } catch {
    host = '';
  }
  const head = urlStr.length > maxLen ? `${urlStr.slice(0, maxLen)}…` : urlStr;
  return { host, length, head };
}
