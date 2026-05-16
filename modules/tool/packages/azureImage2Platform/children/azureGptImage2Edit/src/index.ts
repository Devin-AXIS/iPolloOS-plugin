import { z } from 'zod';
import {
  AzureResourceSchema,
  DEFAULT_API_VERSION,
  buildMultipartHeaders,
  formatHttpError,
  normalizeEndpoint
} from '../../../lib/azure';
import { formatImageApiData } from '../../../lib/formatImageResponse';
import { loadImageBlob } from '../../../lib/loadImageBlob';
import { PRESET_SIZES, resolveApiSize, validateCustomSize } from '../../../lib/sizes';

const MAX_REF_IMAGES = 8;

export const InputType = AzureResourceSchema.and(
  z
    .object({
      prompt: z.string().min(1),
      /** 每行一张：HTTPS URL、data:image;base64、或纯 base64 */
      image_inputs: z.string().min(1),
      mask_input: z.string().optional(),
      size: z.enum(PRESET_SIZES),
      size_custom: z.string().optional(),
      n: z.coerce.number().int().min(1).max(10),
      quality: z.enum(['auto', 'low', 'medium', 'high']),
      output_format: z.enum(['png', 'jpeg', 'webp']),
      output_compression: z.coerce.number().int().min(0).max(100).optional()
    })
    .superRefine((v, ctx) => {
      const lines = v.image_inputs
        .split(/\r?\n/)
        .map((s) => s.trim())
        .filter(Boolean);
      if (lines.length === 0) {
        ctx.addIssue({ code: 'custom', message: '请至少提供一行参考图（URL 或 base64）。' });
      }
      if (lines.length > MAX_REF_IMAGES) {
        ctx.addIssue({
          code: 'custom',
          message: `参考图最多 ${MAX_REF_IMAGES} 张（当前 ${lines.length} 行）。`
        });
      }
      if (v.size === 'custom') {
        const sc = v.size_custom?.trim() ?? '';
        if (!sc) {
          ctx.addIssue({
            code: 'custom',
            message: '选择「自定义」时请填写「自定义尺寸 WxH」。'
          });
        } else {
          const err = validateCustomSize(sc);
          if (err) {
            ctx.addIssue({ code: 'custom', message: err });
          }
        }
      }
    })
);

export const OutputType = z.object({
  markdown_image: z.string(),
  image_data_url: z.string(),
  all_image_data_urls_json: z.string(),
  mime_type: z.string(),
  raw_b64: z.string(),
  image_url: z.string(),
  minimal_json: z.string(),
  system_error: z.string().optional()
});

type In = z.infer<typeof InputType>;
type Out = z.infer<typeof OutputType>;

function empty(partial: Partial<Out> & { system_error: string }): Out {
  return {
    markdown_image: partial.markdown_image ?? '',
    image_data_url: partial.image_data_url ?? '',
    all_image_data_urls_json: partial.all_image_data_urls_json ?? '[]',
    mime_type: partial.mime_type ?? '',
    raw_b64: partial.raw_b64 ?? '',
    image_url: partial.image_url ?? '',
    minimal_json: partial.minimal_json ?? 'null',
    system_error: partial.system_error
  };
}

export async function tool(props: In): Promise<Out> {
  const apiVersion = DEFAULT_API_VERSION;
  const endpoint = normalizeEndpoint(props.azureOpenAiEndpoint);
  const deployment = props.azureOpenAiDeployment.trim();
  const url = `${endpoint}/openai/deployments/${encodeURIComponent(deployment)}/images/edits?api-version=${encodeURIComponent(apiVersion)}`;

  const lines = props.image_inputs
    .split(/\r?\n/)
    .map((s) => s.trim())
    .filter(Boolean);

  let parts: { blob: Blob; filename: string }[];
  try {
    parts = await Promise.all(lines.map((line) => loadImageBlob(line)));
  } catch (e: unknown) {
    return empty({ system_error: e instanceof Error ? e.message : String(e) });
  }

  let maskPart: { blob: Blob; filename: string } | null = null;
  const maskRaw = props.mask_input?.trim();
  if (maskRaw) {
    try {
      maskPart = await loadImageBlob(maskRaw);
    } catch (e: unknown) {
      return empty({ system_error: `遮罩图：${e instanceof Error ? e.message : String(e)}` });
    }
  }

  const fd = new FormData();
  fd.append('prompt', props.prompt.trim());
  for (const p of parts) {
    fd.append('image[]', p.blob, p.filename);
  }
  if (maskPart) {
    fd.append('mask', maskPart.blob, maskPart.filename);
  }

  const effectiveSize = resolveApiSize(props.size, props.size_custom);
  fd.append('size', effectiveSize);
  fd.append('n', String(props.n));
  fd.append('output_format', props.output_format);
  if (props.quality !== 'auto') {
    fd.append('quality', props.quality);
  }
  if (
    (props.output_format === 'jpeg' || props.output_format === 'webp') &&
    props.output_compression !== undefined
  ) {
    fd.append('output_compression', String(props.output_compression));
  }

  const headers = buildMultipartHeaders(props.azureOpenAiApiKey);

  let res: Response;
  try {
    res = await fetch(url, {
      method: 'POST',
      headers,
      body: fd
    });
  } catch (e: unknown) {
    return empty({
      system_error: e instanceof Error ? e.message : String(e)
    });
  }

  const text = await res.text();
  let json: unknown;
  try {
    json = text ? JSON.parse(text) : null;
  } catch {
    return empty({
      system_error: `无法解析 Azure 响应（HTTP ${res.status}）：${text.slice(0, 800)}`
    });
  }

  if (!res.ok) {
    return empty({ system_error: formatHttpError(res.status, json) });
  }

  const formatted = formatImageApiData(json, props.output_format, {
    created: (json as { created?: number }).created,
    deployment,
    api_version: apiVersion,
    endpoint_kind: 'edits',
    ref_image_count: parts.length,
    has_mask: Boolean(maskPart),
    size_requested: props.size,
    size_custom: props.size === 'custom' ? resolveApiSize('custom', props.size_custom) : undefined,
    size_sent: effectiveSize,
    n: props.n,
    quality: props.quality,
    output_format: props.output_format
  });

  if ('system_error' in formatted) {
    return empty({ system_error: formatted.system_error });
  }

  return { ...formatted, system_error: undefined };
}
