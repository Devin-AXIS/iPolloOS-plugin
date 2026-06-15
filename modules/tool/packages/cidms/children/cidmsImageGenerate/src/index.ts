import { uploadFile } from '@tool/utils/uploadFile';
import { getErrText } from '@tool/utils/err';
import { z } from 'zod';
import { cidmsJsonRequest, safeJson } from '../../../lib/client';
import {
  buildGeminiImagePayload,
  buildOpenAiImagePayload,
  firstGeminiInlineImage,
  firstOpenAiImageBase64,
  isGeminiImageModel
} from '../../../lib/image';
import { CidmsAuthFields } from '../../../lib/schemas';

const empty = (v: unknown) => (v === '' || v === null || v === undefined ? undefined : v);

export const InputType = CidmsAuthFields.and(
  z.object({
    model: z.string().min(1).default('gpt-image-2'),
    prompt: z.string().min(1).max(50_000),
    size: z.string().default('2048x2048'),
    quality: z.string().default('low'),
    output_format: z.enum(['png', 'jpeg']).default('png'),
    aspect_ratio: z.string().default('1:1'),
    image_size: z.preprocess(empty, z.string().optional()).default('2K')
  })
);

export const OutputType = z.object({
  image_url: z.string(),
  mime_type: z.string(),
  text: z.string(),
  detail_json: z.string(),
  system_error: z.string().optional()
});

type Out = z.infer<typeof OutputType>;

function errOut(system_error: string): Out {
  return {
    image_url: '',
    mime_type: '',
    text: '',
    detail_json: '{}',
    system_error
  };
}

export async function tool(raw: z.infer<typeof InputType>): Promise<Out> {
  try {
    const input = InputType.parse(raw);
    const gemini = isGeminiImageModel(input.model);

    const data = gemini
      ? await cidmsJsonRequest<unknown>({
          auth: input,
          method: 'POST',
          path: `/v1beta/models/${encodeURIComponent(input.model)}:generateContent`,
          body: buildGeminiImagePayload({
            prompt: input.prompt,
            aspect_ratio: input.aspect_ratio,
            image_size: input.model === 'gemini-2.5-flash-image' ? undefined : input.image_size
          })
        })
      : await cidmsJsonRequest<unknown>({
          auth: input,
          method: 'POST',
          path: '/v1/images/generations',
          body: buildOpenAiImagePayload({
            model: input.model,
            prompt: input.prompt,
            size: input.size,
            quality: input.quality,
            output_format: input.output_format
          })
        });

    const image = gemini ? firstGeminiInlineImage(data) : firstOpenAiImageBase64(data);
    if (!image) {
      return errOut('CIDMS 图像接口未返回可解析的 base64 图片');
    }

    const buffer = Buffer.from(image.base64, 'base64');
    if (buffer.length === 0) {
      return errOut('CIDMS 图像 base64 为空或无法转换');
    }

    const ext = image.mimeType.includes('jpeg') ? 'jpg' : 'png';
    const { accessUrl } = await uploadFile({
      buffer,
      defaultFilename: `cidms-image.${ext}`
    });

    if (!accessUrl) {
      return errOut('图片上传到文件服务失败');
    }

    return {
      image_url: accessUrl,
      mime_type: image.mimeType,
      text: 'text' in image && typeof image.text === 'string' ? image.text : '',
      detail_json: safeJson(data)
    };
  } catch (e: unknown) {
    return errOut(getErrText(e));
  }
}
