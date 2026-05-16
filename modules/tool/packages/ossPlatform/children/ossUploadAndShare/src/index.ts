import { z } from 'zod';
import { createOssClient } from '../../../lib/client';
import {
  nextStaticExportNoteZH,
  useAttachmentOnObject,
  useAttachmentOnTemporaryLink
} from '../../../lib/browseVsDownload';
import {
  classifyFetchFailure,
  fetchHttpSource,
  isLikelyHttpUrl,
  summarizeUrlForLog
} from '../../../lib/fetchSource';
import { safeDetailJson } from '../../../lib/format';
import { guessContentType } from '../../../lib/mime';
import { buildIsolationPrefix, buildObjectKey, normalizeRelativeKey } from '../../../lib/keys';
import { putObjectViaPresignedFetch } from '../../../lib/directPut';
import { presignGet, presignPut } from '../../../lib/presign';
import { OssToolBaseSchema } from '../../../lib/schemas';
import { resolveStableUrls } from '../../../lib/urls';

const MAX_DIRECT_BYTES = 52_428_800;
const MAX_TEXT_BYTES = 16 * 1024 * 1024;

const DeliveryEnum = z.enum(['auto', 'browse', 'download']);

const DEFAULT_TEMP_LINK_SECONDS = 86_400;

/** Agent / OpenAPI 常传 snake_case，与工具 camelCase 对齐，避免 silent 丢字段 */
function normalizeAliOssToolInput(raw: unknown): unknown {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return raw;
  const o = raw as Record<string, unknown>;
  const alias = (camel: string, snake: string) => {
    if (o[camel] === undefined && o[snake] !== undefined) o[camel] = o[snake];
  };
  alias('sourceUrl', 'source_url');
  alias('textContent', 'text_content');
  alias('contentType', 'content_type');
  alias('relativeKey', 'relative_key');
  alias('deliveryMode', 'delivery_mode');
  alias('temporaryLinkDelivery', 'temporary_link_delivery');
  alias('temporaryLinkExpiresSeconds', 'temporary_link_expires_seconds');
  alias('appId', 'app_id');
  alias('userId', 'user_id');
  alias('chatId', 'chat_id');
  alias('ossRegion', 'oss_region');
  alias('ossBucket', 'oss_bucket');
  alias('ossEndpoint', 'oss_endpoint');
  alias('ossPublicBaseUrl', 'oss_public_base_url');
  alias('ossUseCname', 'oss_use_cname');
  alias('ossInternal', 'oss_internal');
  alias('ossSecure', 'oss_secure');
  alias('aliyunAccessKeyId', 'aliyun_access_key_id');
  alias('aliyunAccessKeySecret', 'aliyun_access_key_secret');

  for (const k of ['sourceUrl', 'textContent', 'contentType'] as const) {
    const v = o[k];
    if (v === null || v === undefined) continue;
    if (typeof v !== 'string') o[k] = String(v);
  }
  if (typeof o.sourceUrl === 'string' && o.sourceUrl.trim() === '') delete o.sourceUrl;

  return o;
}

const OssUploadBodySchema = z
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
    deliveryMode: DeliveryEnum.optional(),
    temporaryLinkDelivery: DeliveryEnum.optional(),
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
          message: '「文件网址」不是可解析的 http(s) 链接；请修正，或留空后改用「文本内容」上传。'
        });
      } else {
        ctx.addIssue({
          code: 'custom',
          message: '请二选一填写「文件网址」或「文本内容」，不能同时留空。'
        });
      }
    }

    if (hasText && !v.contentType?.trim()) {
      const guessed = guessContentType(v.relativeKey);
      if (guessed === 'application/octet-stream') {
        ctx.addIssue({
          code: 'custom',
          message:
            '填写「文本内容」时请填写 Content-Type，或将「保存路径」设为带明确后缀的文件名（如 index.html、data.json）。'
        });
      }
    }
  });

export const InputType = z.preprocess(
  normalizeAliOssToolInput,
  OssToolBaseSchema.and(OssUploadBodySchema)
);

export const OutputType = z.object({
  summary: z.string(),
  reply_hint: z.string(),
  primary_link: z.string(),
  /** 与七牛 Kodo 工具对齐，便于工作流只绑一个「对外 URL」 */
  final_public_url: z.string(),
  stable_reply_line: z.string(),
  minimal_json: z.string(),
  static_site_preview_url: z.string(),
  temporary_access_url: z.string(),
  large_file_upload_url: z.string(),
  object_key: z.string(),
  detail_json: z.string(),
  system_error: z.string().optional()
});

type In = z.infer<typeof InputType>;
type Out = z.infer<typeof OutputType>;

function errOut(system_error: string, detail: Record<string, unknown> = {}): Out {
  const minimal_json = safeDetailJson(
    { ok: false, plugin: 'ossUploadAndShare', system_error, ...detail },
    24_000
  );
  return {
    summary: '',
    reply_hint: `错误：${system_error}`,
    primary_link: '',
    final_public_url: '',
    stable_reply_line: `错误：${system_error}`,
    minimal_json,
    static_site_preview_url: '',
    temporary_access_url: '',
    large_file_upload_url: '',
    object_key: typeof detail.object_key === 'string' ? detail.object_key : '',
    detail_json: minimal_json,
    system_error
  };
}

function empty(out: Partial<Out> & { system_error?: string }): Out {
  const primary = out.primary_link ?? '';
  const detail = out.detail_json ?? 'null';
  const minimal =
    out.minimal_json ??
    (out.primary_link
      ? safeDetailJson(
          {
            ok: true,
            plugin: 'ossUploadAndShare',
            primary_link: primary,
            object_key: out.object_key
          },
          12_000
        )
      : detail);
  return {
    summary: out.summary ?? '',
    reply_hint: out.reply_hint ?? '',
    primary_link: primary,
    final_public_url: out.final_public_url ?? primary,
    stable_reply_line: out.stable_reply_line ?? out.reply_hint ?? '',
    minimal_json: minimal,
    static_site_preview_url: out.static_site_preview_url ?? '',
    temporary_access_url: out.temporary_access_url ?? '',
    large_file_upload_url: out.large_file_upload_url ?? '',
    object_key: out.object_key ?? '',
    detail_json: detail,
    system_error: out.system_error
  };
}

export async function tool(props: In): Promise<Out> {
  try {
    normalizeRelativeKey(props.relativeKey);
  } catch (e: unknown) {
    return errOut(e instanceof Error ? e.message : String(e), { step: 'normalizeRelativeKey' });
  }

  let key = '';
  try {
    const prefix = buildIsolationPrefix({
      appId: props.appId,
      userId: props.userId,
      chatId: props.chatId,
      scope: props.scope
    });
    key = buildObjectKey(prefix, props.relativeKey);
    const client = createOssClient(props);

    const deliveryMode = props.deliveryMode ?? 'auto';
    const temporaryLinkDelivery = props.temporaryLinkDelivery ?? 'auto';
    const attachObject = useAttachmentOnObject(props.scope, props.relativeKey, deliveryMode);

    const textTrimmed = (props.textContent ?? '').trim();
    const urlTrim = props.sourceUrl?.trim() ?? '';
    const urlMode = textTrimmed.length === 0 && urlTrim.length > 0 && isLikelyHttpUrl(urlTrim);

    let resolvedContentType = '';

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
          object_key: key,
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
          object_key: key,
          ...urlMeta,
          hint
        });
      }

      const buf = await res.arrayBuffer();
      if (buf.byteLength > MAX_DIRECT_BYTES) {
        const ct =
          props.contentType?.trim() ||
          res.headers.get('content-type')?.split(';')[0]?.trim() ||
          guessContentType(props.relativeKey);

        resolvedContentType = ct;

        const putUrl = await presignPut(client, key, 3600, ct);
        const stable = resolveStableUrls({
          bucket: props.ossBucket,
          region: props.ossRegion,
          key,
          scope: props.scope,
          secure: props.ossSecure,
          ossPublicBaseUrl: props.ossPublicBaseUrl
        });
        const detailPayload = {
          ok: true,
          plugin: 'ossUploadAndShare',
          mode: 'large_file_presigned_put',
          object_key: key,
          presigned_put_url: putUrl,
          content_type: ct,
          primary_link: stable.primary_stable_url
        };
        const dj = safeDetailJson(detailPayload, 24_000);
        return empty({
          system_error: undefined,
          summary: `${props.relativeKey} 约 ${Math.round(buf.byteLength / 1024 / 1024)}MB，已超过直传限额。请在下方「大文件直传地址」用 HTTP PUT 上传原始字节（1 小时内有效）。`,
          reply_hint: `文件较大，请使用「大文件直传地址」通过 HTTP PUT 上传；上传完成后再用同一「主推链接」或「临时访问链接」分享。`,
          large_file_upload_url: putUrl,
          object_key: key,
          primary_link: stable.primary_stable_url,
          final_public_url: stable.primary_stable_url,
          stable_reply_line: `• 主推访问：${stable.primary_stable_url}`,
          minimal_json: dj,
          static_site_preview_url: props.scope === 'sites' ? stable.website_preview_url : '',
          temporary_access_url: '',
          detail_json: dj
        });
      }

      resolvedContentType =
        props.contentType?.trim() || res.headers.get('content-type')?.split(';')[0]?.trim() || '';

      if (!resolvedContentType || resolvedContentType.includes('octet-stream')) {
        resolvedContentType = guessContentType(props.relativeKey);
      }

      const uploadBuf = Buffer.from(buf);
      await putObjectViaPresignedFetch(client, key, uploadBuf, {
        contentType: resolvedContentType,
        attachObject,
        filenameAscii: props.relativeKey.split('/').pop() || 'file'
      });
    } else {
      const body = Buffer.from(textTrimmed, 'utf8');
      if (body.byteLength > MAX_TEXT_BYTES) {
        return errOut('文本过大，请改为「文件网址」传入可公开下载的地址，再由此节点转存到 OSS。', {
          step: 'textSize',
          maxBytes: MAX_TEXT_BYTES,
          object_key: key
        });
      }

      resolvedContentType =
        props.contentType?.trim() ||
        guessContentType(props.relativeKey) ||
        'text/plain; charset=utf-8';

      await putObjectViaPresignedFetch(client, key, body, {
        contentType: resolvedContentType,
        attachObject,
        filenameAscii: props.relativeKey.split('/').pop() || 'file.txt'
      });
    }

    const stable = resolveStableUrls({
      bucket: props.ossBucket,
      region: props.ossRegion,
      key,
      scope: props.scope,
      secure: props.ossSecure,
      ossPublicBaseUrl: props.ossPublicBaseUrl
    });

    const exp = props.temporaryLinkExpiresSeconds ?? DEFAULT_TEMP_LINK_SECONDS;
    let temporary_access_url = '';
    if (exp > 0) {
      const tempAttach = useAttachmentOnTemporaryLink(
        props.scope,
        props.relativeKey,
        temporaryLinkDelivery
      );
      temporary_access_url = presignGet(client, key, exp, {
        disposition: tempAttach ? 'attachment' : 'inline',
        filenameAscii: props.relativeKey.split('/').pop() || 'download',
        contentType: resolvedContentType || guessContentType(props.relativeKey)
      });
    }

    const primary_link = stable.primary_stable_url;
    const static_site_preview_url = props.scope === 'sites' ? stable.website_preview_url : '';

    const replyLines = [
      `• 主推访问：${primary_link}`,
      ...(static_site_preview_url ? [`• 静态站预览：${static_site_preview_url}`] : []),
      ...(temporary_access_url ? [`• 临时访问(${exp}s)：${temporary_access_url}`] : [])
    ];

    const summary = [
      `已将 ${props.relativeKey} 写入 OSS。`,
      stable.hint,
      temporary_access_url ? `已生成可在私有桶外链使用的临时地址（有效期 ${exp} 秒）。` : '',
      props.scope === 'sites' ? nextStaticExportNoteZH() : ''
    ]
      .filter(Boolean)
      .join(' ');

    const detailPayload = {
      ok: true,
      plugin: 'ossUploadAndShare',
      ...stable,
      temporary_access_url: temporary_access_url || undefined,
      content_type: resolvedContentType,
      delivery_mode: deliveryMode,
      temporary_link_delivery: temporaryLinkDelivery,
      object_key: key,
      primary_link
    };
    const detail_json = safeDetailJson(detailPayload, 48_000);
    const minimal_json = safeDetailJson(
      {
        ok: true,
        plugin: 'ossUploadAndShare',
        object_key: key,
        primary_link,
        final_public_url: primary_link,
        temporary_access_url: temporary_access_url || undefined
      },
      24_000
    );

    return {
      summary,
      reply_hint: replyLines.join('\n'),
      primary_link,
      final_public_url: primary_link,
      stable_reply_line: replyLines.join('\n'),
      minimal_json,
      static_site_preview_url,
      temporary_access_url,
      large_file_upload_url: '',
      object_key: key,
      detail_json
    };
  } catch (e: unknown) {
    return errOut(e instanceof Error ? e.message : String(e), {
      step: 'unexpected',
      object_key: key || undefined
    });
  }
}
