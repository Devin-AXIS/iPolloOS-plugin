import { z } from 'zod';
import { AzureResourceSchema, buildJsonHeaders, formatHttpError } from '../../../lib/azure';
import { PRESET_SIZES, resolveApiSize, validateCustomSize } from '../../../lib/sizes';
import { formatImageApiData } from '../../../lib/formatImageResponse';
import { uploadFile } from '@tool/utils/uploadFile';

export const InputType = AzureResourceSchema.and(
  z
    .object({
      prompt: z.string().min(1),
      size: z.enum(PRESET_SIZES),
      size_custom: z.string().optional(),
      n: z.coerce.number().int().min(1).max(10),
      quality: z.enum(['auto', 'low', 'medium', 'high']),
      output_format: z.enum(['png', 'jpeg', 'webp']),
      background: z.enum(['auto', 'transparent']),
      output_compression: z.coerce.number().int().min(0).max(100).optional()
    })
    .superRefine((v, ctx) => {
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
      if (v.background === 'transparent' && v.output_format === 'webp') {
        ctx.addIssue({
          code: 'custom',
          message: 'background=transparent 时不要使用 webp，请改用 png。'
        });
      }
      if (v.background === 'transparent' && v.output_format === 'jpeg') {
        ctx.addIssue({
          code: 'custom',
          message: 'background=transparent 时请使用 output_format=png。'
        });
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

function normalizeMaiEndpoint(raw: string): string {
  let u = raw.trim().replace(/\/+$/, '');
  for (const marker of ['/mai/', '/openai/', '/api/projects/']) {
    const idx = u.toLowerCase().indexOf(marker);
    if (idx !== -1) {
      u = u.slice(0, idx);
    }
  }
  return u.replace(/\/+$/, '');
}

function resolveMaiSize(
  size: In['size'],
  sizeCustom?: string
): { width: number; height: number; label: string } {
  const effectiveSize = size === 'auto' ? '1024x1024' : resolveApiSize(size, sizeCustom);
  const match = /^(\d+)x(\d+)$/i.exec(effectiveSize);
  if (!match) {
    throw new Error('MAI-Image-2e 需要明确的 WxH 尺寸。');
  }

  const width = Number(match[1]);
  const height = Number(match[2]);
  if (width < 768 || height < 768 || width * height > 1048576) {
    throw new Error('MAI-Image-2e 要求宽高都不少于 768，且总像素不超过 1024x1024。');
  }

  return { width, height, label: `${width}x${height}` };
}

export async function tool(props: In): Promise<Out> {
  const endpoint = normalizeMaiEndpoint(props.azureOpenAiEndpoint);
  const deployment = props.azureOpenAiDeployment.trim();
  const url = `${endpoint}/mai/v1/images/generations`;

  const headers = buildJsonHeaders(props.azureOpenAiApiKey);

  let width: number;
  let height: number;
  let effectiveSize: string;
  try {
    const resolved = resolveMaiSize(props.size, props.size_custom);
    width = resolved.width;
    height = resolved.height;
    effectiveSize = resolved.label;
  } catch (e: unknown) {
    return empty({
      system_error: e instanceof Error ? e.message : String(e)
    });
  }

  const body: Record<string, unknown> = {
    model: deployment,
    prompt: props.prompt.trim(),
    width,
    height
  };

  let res: Response;
  try {
    res = await fetch(url, {
      method: 'POST',
      headers,
      body: JSON.stringify(body)
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
    endpoint_kind: 'mai_generations',
    size_requested: props.size,
    size_custom: props.size === 'custom' ? effectiveSize : undefined,
    size_sent: effectiveSize,
    n: 1,
    output_format: 'png'
  });

  if ('system_error' in formatted) {
    return empty({ system_error: formatted.system_error });
  }

  if (formatted.raw_b64) {
    const uploaded = await uploadFile({
      base64: `data:image/png;base64,${formatted.raw_b64}`,
      defaultFilename: `mai-image-${Date.now()}.png`,
      contentType: 'image/png'
    });

    return {
      markdown_image: `![generated-1](${uploaded.accessUrl})`,
      image_data_url: uploaded.accessUrl,
      all_image_data_urls_json: JSON.stringify([uploaded.accessUrl]),
      mime_type: 'image/png',
      raw_b64: '',
      image_url: uploaded.accessUrl,
      minimal_json: JSON.stringify({
        ...JSON.parse(formatted.minimal_json),
        uploaded: true,
        objectName: uploaded.objectName,
        size: uploaded.size
      }),
      system_error: undefined
    };
  }

  return { ...formatted, system_error: undefined };
}
