import { z } from 'zod';
import { RegionEnum, ResolutionEnum, runHappyHorseVideoTask } from '../../../lib/happyHorse';

const DurationInput = z.union([
  z.literal('auto'),
  z.number().int().min(3).max(15),
  z.string().regex(/^(?:[3-9]|1[0-5])$/)
]);

const httpUrlPattern = /https?:\/\/[^\s"'<>),\]]+/i;
const markdownImagePattern = /!\[[^\]]*]\((https?:\/\/[^)\s]+)\)/i;
const dataImagePattern = /^data:image\/([a-zA-Z0-9.+-]+);base64,/;
const inlineFileBase64Key = '__fastgptInlineArchiveBase64';

async function normalizeImageUrl(input: unknown): Promise<string> {
  if (Array.isArray(input)) {
    for (const item of input) {
      const url = await normalizeImageUrl(item);
      if (url) return url;
    }
    return '';
  }

  if (input && typeof input === 'object') {
    const obj = input as Record<string, unknown>;
    const inlineBase64 = obj[inlineFileBase64Key];
    if (typeof inlineBase64 === 'string' && inlineBase64.trim()) {
      return normalizeImageUrl(`data:image/jpeg;base64,${inlineBase64.trim()}`);
    }

    const candidates = [
      obj.url,
      obj.image,
      obj.image_url,
      obj.imageUrl,
      obj.image_data_url,
      obj.accessUrl,
      obj.fileUrl,
      obj.file_url,
      obj.src,
      obj.images,
      obj.data
    ];

    for (const item of candidates) {
      const url = await normalizeImageUrl(item);
      if (url) return url;
    }
    return '';
  }

  if (typeof input !== 'string') {
    return '';
  }

  const raw = input.trim();
  if (!raw) return '';

  if (raw.startsWith('{') || raw.startsWith('[')) {
    try {
      const parsed = JSON.parse(raw);
      const url = await normalizeImageUrl(parsed);
      if (url) return url;
    } catch {
      // Continue with plain text extraction.
    }
  }

  const markdownMatch = raw.match(markdownImagePattern);
  if (markdownMatch?.[1]) {
    return markdownMatch[1];
  }

  if (dataImagePattern.test(raw)) {
    const { uploadFile } = await import('@tool/utils/uploadFile');
    const ext = raw.match(dataImagePattern)?.[1]?.toLowerCase() || 'png';
    const contentType = `image/${ext === 'jpg' ? 'jpeg' : ext}`;
    const uploaded = await uploadFile({
      base64: raw,
      defaultFilename: `happyhorse-first-frame-${Date.now()}.${ext === 'jpeg' ? 'jpg' : ext}`,
      contentType
    });
    return uploaded.accessUrl;
  }

  try {
    const url = new URL(raw);
    if (url.protocol === 'http:' || url.protocol === 'https:') {
      return raw;
    }
  } catch {
    // Continue with URL extraction.
  }

  return raw.match(httpUrlPattern)?.[0] || '';
}

export const InputType = z.object({
  apiKey: z.string().describe('Alibaba Cloud Model Studio API Key'),
  image_url: z.any().describe('First-frame image URL, image object, image array, or data URL'),
  prompt: z.string().optional().describe('Optional text prompt for the video'),
  region: RegionEnum.optional().default('beijing').describe('DashScope region'),
  resolution: ResolutionEnum.optional().default('1080P').describe('Video resolution'),
  duration: DurationInput.optional().default('auto').describe('Video duration in seconds'),
  watermark: z.boolean().optional().default(true).describe('Whether to add Happy Horse watermark'),
  poll_interval_seconds: z
    .number()
    .min(0)
    .max(60)
    .optional()
    .default(15)
    .describe('Polling interval in seconds'),
  max_poll_attempts: z
    .number()
    .int()
    .min(1)
    .max(120)
    .optional()
    .default(40)
    .describe('Maximum polling attempts')
});

export const OutputType = z.object({
  video_url: z.string().describe('Generated video URL'),
  task_id: z.string().describe('DashScope task ID'),
  task_status: z.string().describe('Task status'),
  request_id: z.string().optional().describe('DashScope request ID'),
  usage: z.record(z.string(), z.unknown()).optional().describe('Usage information'),
  raw_response_json: z.string().describe('Raw query response JSON')
});

export async function tool({
  apiKey,
  image_url,
  prompt,
  region = 'beijing',
  resolution = '1080P',
  duration = 'auto',
  watermark = true,
  poll_interval_seconds = 15,
  max_poll_attempts = 40
}: z.infer<typeof InputType>): Promise<z.infer<typeof OutputType>> {
  const manualDuration = duration === 'auto' ? undefined : Number(duration);
  const normalizedImageUrl = await normalizeImageUrl(image_url);

  if (!normalizedImageUrl) {
    return Promise.reject({
      system_error:
        '未获取到可用于图生视频的图片 URL。请传入图片直链，或连接上游文生图节点的图片输出。'
    });
  }

  return runHappyHorseVideoTask({
    apiKey,
    region,
    model: 'happyhorse-1.0-i2v',
    input: {
      ...(prompt ? { prompt } : {}),
      media: [
        {
          type: 'first_frame',
          url: normalizedImageUrl
        }
      ]
    },
    parameters: {
      resolution,
      ...(manualDuration !== undefined ? { duration: manualDuration } : {}),
      watermark
    },
    pollIntervalSeconds: poll_interval_seconds,
    maxPollAttempts: max_poll_attempts
  });
}
