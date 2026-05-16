import { Readable } from 'node:stream';
import qiniu from 'qiniu';
import { z } from 'zod';
import { nextStaticExportNoteZH } from '../../../lib/browseVsDownload';
import {
  buildUploadToken,
  createBucketManager,
  createFormUploader,
  createMac
} from '../../../lib/client';
import { safeDetailJson } from '../../../lib/format';
import { guessContentType } from '../../../lib/mime';
import {
  classifyFetchFailure,
  fetchHttpSource,
  isLikelyHttpUrl,
  summarizeUrlForLog
} from '../../../lib/fetchSource';
import {
  buildIsolationPrefix,
  buildObjectKey,
  normalizeRelativeKey,
  sanitizeSegment,
  type IsolationScope
} from '../../../lib/keys';
import { resolveIsolationScope } from '../../../lib/resolveScope';
import { KodoToolBaseSchema } from '../../../lib/schemas';
import {
  assertHttpsObjectUrl,
  publicUrlMatchesConfiguredHost,
  resolveStableUrls,
  validatePublicBaseUrlForKodoTool
} from '../../../lib/urls';

const MAX_TEXT_BYTES = 16 * 1024 * 1024;

const SCOPE_REASON_ZH: Record<string, string> = {
  explicit: '已按手动选择的用途分类',
  'response-content-type': '自动：根据源文件响应的 Content-Type',
  'input-content-type': '自动：根据入参 Content-Type',
  'relative-path': '自动：根据保存路径（扩展名）',
  'source-url-path': '自动：根据文件网址的路径',
  default: '自动：未识别为典型网页资源，按普通文件处理'
};

export const InputType = KodoToolBaseSchema.and(
  z
    .object({
      relativeKey: z.string().min(1),
      sourceUrl: z
        .union([z.string(), z.null()])
        .optional()
        .transform((s) => (s == null ? undefined : s)),
      textContent: z
        .union([z.string(), z.null()])
        .optional()
        .transform((s) => (s == null ? undefined : s)),
      contentType: z.string().optional(),
      temporaryLinkExpiresSeconds: z.coerce.number().int().min(0).max(604_800).optional()
    })
    .superRefine((v, ctx) => {
      const url = v.sourceUrl?.trim() ?? '';
      const textTrimmed = (v.textContent ?? '').trim();
      const hasUrl = url.length > 0 && isLikelyHttpUrl(url);
      const hasText = textTrimmed.length > 0;

      if (!hasText && !hasUrl) {
        if (url.length > 0) {
          ctx.addIssue({
            code: 'custom',
            message: '「文件网址」不是合法的 HTTP(S) URL；请修正，或留空后改用「文本内容」上传。'
          });
        } else {
          ctx.addIssue({
            code: 'custom',
            message: '请二选一填写「文件网址」或「文本内容」，不能同时留空。'
          });
        }
      }

      if (hasText && !v.contentType?.trim()) {
        ctx.addIssue({
          code: 'custom',
          message: '填写「文本内容」时必须填写 Content-Type（如 text/html; charset=utf-8）。'
        });
      }
    })
);

/** 对外展示字段尽量少；排障信息集中在 minimal_json */
export const OutputType = z.object({
  final_public_url: z.string(),
  stable_reply_line: z.string(),
  minimal_json: z.string(),
  public_link_host_ok: z.string(),
  configured_public_host: z.string(),
  static_site_preview_url: z.string(),
  temporary_access_url: z.string(),
  resolved_scope: z.string(),
  scope_resolution_note: z.string(),
  system_error: z.string().optional()
});

type In = z.infer<typeof InputType>;
type Out = z.infer<typeof OutputType>;

/** 失败时 stable_reply_line / minimal_json 必带可解析信息，避免「空响应」 */
function errOut(system_error: string, detail: Record<string, unknown> = {}): Out {
  const minimal_json = safeDetailJson({ ok: false, system_error, ...detail }, 24_000);
  return {
    final_public_url: '',
    stable_reply_line: `错误：${system_error}`,
    minimal_json,
    public_link_host_ok: '',
    configured_public_host: '',
    static_site_preview_url: '',
    temporary_access_url: '',
    resolved_scope: '',
    scope_resolution_note: '',
    system_error
  };
}

function uploadErrorMessage(ret: { resp?: { statusCode?: number }; data?: unknown }): string {
  const code = (ret as { data?: { error?: string } }).data?.error;
  const status = ret.resp?.statusCode;
  const raw =
    typeof ret.data === 'object' && ret.data !== null
      ? JSON.stringify(ret.data)
      : String(ret.data ?? '');
  return `七牛上传失败 HTTP ${status ?? '?'}${code ? `: ${code}` : ''} ${raw}`.trim();
}

export async function tool(props: In): Promise<Out> {
  let rel = '';
  try {
    rel = normalizeRelativeKey(props.relativeKey);
  } catch (e: unknown) {
    return errOut(e instanceof Error ? e.message : String(e), { step: 'normalizeRelativeKey' });
  }

  let key = '';
  try {
    const baseRes = validatePublicBaseUrlForKodoTool(props.qiniuPublicBaseUrl);
    if (!baseRes.ok) {
      return errOut(baseRes.message, { step: 'validatePublicBaseUrl' });
    }
    const boundBase = baseRes.normalized;
    const configured_public_host = baseRes.host;

    const mac = createMac(props);
    const formUploader = createFormUploader();

    const textTrimmed = (props.textContent ?? '').trim();
    const urlTrim = props.sourceUrl?.trim() ?? '';
    /** 与校验一致：同时存在时以文本为准，避免工作流误绑 sourceUrl 导致 XOR 失败 */
    const urlMode = textTrimmed.length === 0 && urlTrim.length > 0 && isLikelyHttpUrl(urlTrim);

    let resolvedContentType = '';
    let resolvedScope: IsolationScope;
    let scopeReason: string;

    if (urlMode) {
      const urlMeta = summarizeUrlForLog(urlTrim);
      let res: Response;
      try {
        res = await fetchHttpSource(urlTrim);
      } catch (e: unknown) {
        const msg = e instanceof Error ? e.message : String(e);
        const { kind, hint } = classifyFetchFailure(e);
        return errOut(`下载源文件请求失败（${kind}）：${msg}`, {
          step: 'fetchSourceUrl',
          error_kind: kind,
          ...urlMeta,
          hint
        });
      }
      if (!res.ok) {
        const { kind, hint } = classifyFetchFailure(undefined, res);
        return errOut(`下载源文件失败 HTTP ${res.status}`, {
          step: 'fetchSourceUrl',
          error_kind: kind,
          httpStatus: res.status,
          ...urlMeta,
          hint
        });
      }
      if (!res.body) {
        return errOut('源地址响应无 Body，无法上传', { step: 'fetchSourceUrl', ...urlMeta });
      }

      const headerCt = res.headers.get('content-type')?.split(';')[0]?.trim() || '';

      resolvedContentType = props.contentType?.trim() || headerCt || '';

      if (!resolvedContentType || resolvedContentType.includes('octet-stream')) {
        resolvedContentType = guessContentType(rel);
      }

      const inferred = resolveIsolationScope({
        scopeInput: props.scope,
        relativeKey: rel,
        contentType: props.contentType,
        sourceUrl: urlTrim,
        fetchedContentType: headerCt || undefined
      });
      resolvedScope = inferred.resolved;
      scopeReason = inferred.reason;

      const prefix = buildIsolationPrefix({
        appId: props.appId,
        userId: props.userId,
        chatId: props.chatId,
        scope: resolvedScope
      });
      key = buildObjectKey(prefix, rel);
      const uploadToken = buildUploadToken(mac, props.qiniuBucket, key, 3600);

      const putExtra = new qiniu.form_up.PutExtra();
      putExtra.mimeType = resolvedContentType;
      putExtra.fname = rel.split('/').pop() || 'file';

      const nodeReadable = Readable.fromWeb(
        res.body as unknown as import('stream/web').ReadableStream<Uint8Array>
      );

      const ret = await formUploader.putStream(uploadToken, key, nodeReadable, putExtra);
      if (!ret.ok()) {
        return errOut(`${uploadErrorMessage(ret)}（object_key: ${key}）`, {
          step: 'qiniuPutStream',
          object_key: key
        });
      }
    } else {
      const body = Buffer.from(textTrimmed, 'utf8');
      if (body.byteLength > MAX_TEXT_BYTES) {
        return errOut('文本过大，请改为「文件网址」传入可公开下载的地址，再由此节点转存到七牛。', {
          step: 'textSize',
          maxBytes: MAX_TEXT_BYTES
        });
      }

      resolvedContentType = props.contentType?.trim() || 'text/plain; charset=utf-8';

      const inferred = resolveIsolationScope({
        scopeInput: props.scope,
        relativeKey: rel,
        contentType: props.contentType,
        sourceUrl: undefined,
        fetchedContentType: undefined
      });
      resolvedScope = inferred.resolved;
      scopeReason = inferred.reason;

      const prefix = buildIsolationPrefix({
        appId: props.appId,
        userId: props.userId,
        chatId: props.chatId,
        scope: resolvedScope
      });
      key = buildObjectKey(prefix, rel);
      const uploadToken = buildUploadToken(mac, props.qiniuBucket, key, 3600);

      const putExtra = new qiniu.form_up.PutExtra();
      putExtra.mimeType = resolvedContentType;
      putExtra.fname = rel.split('/').pop() || 'file.txt';

      const ret = await formUploader.put(uploadToken, key, body, putExtra);
      if (!ret.ok()) {
        return errOut(`${uploadErrorMessage(ret)}（object_key: ${key}）`, {
          step: 'qiniuPut',
          object_key: key
        });
      }
    }

    const scope_resolution_note = SCOPE_REASON_ZH[scopeReason] ?? scopeReason;

    const stable = resolveStableUrls({
      key,
      scope: resolvedScope,
      qiniuPublicBaseUrl: boundBase
    });

    const exp = props.temporaryLinkExpiresSeconds ?? 0;
    let temporary_access_url = '';
    if (exp > 0) {
      const bm = createBucketManager(mac);
      const deadline = Math.floor(Date.now() / 1000) + exp;
      temporary_access_url = bm.privateDownloadUrl(boundBase.replace(/\/+$/, ''), key, deadline);
    }

    const final_public_url = stable.primary_stable_url;
    assertHttpsObjectUrl(final_public_url, key);

    const public_link_host_ok = publicUrlMatchesConfiguredHost(
      final_public_url,
      configured_public_host
    )
      ? 'ok'
      : 'mismatch';
    const stable_reply_line =
      temporary_access_url && exp > 0
        ? `公开访问：${final_public_url}\n临时链（私有桶）：${temporary_access_url}`
        : `公开访问：${final_public_url}`;

    const static_site_preview_url = resolvedScope === 'sites' ? stable.website_preview_url : '';

    const minimal_payload = {
      ok: true,
      upload_mode: urlMode ? 'sourceUrl' : 'textContent',
      isolation_segments: {
        appId: sanitizeSegment(props.appId),
        userId: sanitizeSegment(props.userId),
        chatId: sanitizeSegment(props.chatId)
      },
      final_public_url,
      configured_public_host,
      public_link_host_ok,
      resolved_scope: resolvedScope,
      object_key: key,
      temporary_access_url: temporary_access_url || undefined,
      content_type: resolvedContentType,
      scope_input: props.scope,
      scope_reason: scopeReason,
      static_site_preview_url: static_site_preview_url || undefined,
      hint: stable.hint,
      next_static_export_note: resolvedScope === 'sites' ? nextStaticExportNoteZH() : undefined
    };
    const minimal_json = safeDetailJson(minimal_payload, 24_000);

    return {
      final_public_url,
      stable_reply_line,
      minimal_json,
      public_link_host_ok,
      configured_public_host,
      static_site_preview_url,
      temporary_access_url,
      resolved_scope: resolvedScope,
      scope_resolution_note
    };
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    return errOut(key ? `${msg}（object_key: ${key}）` : msg, {
      step: 'unexpected',
      object_key: key || undefined
    });
  }
}
