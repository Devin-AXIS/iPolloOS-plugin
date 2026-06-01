import { z } from 'zod';
import { RegionEnum, ResolutionEnum, runHappyHorseVideoTask } from '../../../lib/happyHorse';

const parseReferenceImageUrls = (value?: string) => {
  if (!value?.trim()) {
    return [];
  }

  try {
    const parsed = JSON.parse(value);
    if (Array.isArray(parsed)) {
      return parsed.map((item) => String(item).trim()).filter(Boolean);
    }
  } catch {
    // Fall through to delimiter parsing for normal textarea input.
  }

  return value
    .split(/[\n,，]+/)
    .map((item) => item.trim())
    .filter(Boolean);
};

export const InputType = z.object({
  apiKey: z.string().describe('Alibaba Cloud Model Studio API Key'),
  video_url: z.string().url().describe('Video URL to edit'),
  prompt: z.string().min(1).describe('Text instruction for editing the video'),
  reference_image_urls: z.string().optional().describe('Optional reference image URLs, up to 5'),
  region: RegionEnum.optional().default('beijing').describe('DashScope region'),
  resolution: ResolutionEnum.optional().default('1080P').describe('Video resolution'),
  watermark: z.boolean().optional().default(true).describe('Whether to add Happy Horse watermark'),
  audio_setting: z.enum(['auto', 'origin']).optional().default('auto').describe('Audio setting'),
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
  video_url,
  prompt,
  reference_image_urls,
  region = 'beijing',
  resolution = '1080P',
  watermark = true,
  audio_setting = 'auto',
  poll_interval_seconds = 15,
  max_poll_attempts = 40
}: z.infer<typeof InputType>): Promise<z.infer<typeof OutputType>> {
  const referenceImages = parseReferenceImageUrls(reference_image_urls).slice(0, 5);

  return runHappyHorseVideoTask({
    apiKey,
    region,
    model: 'happyhorse-1.0-video-edit',
    input: {
      prompt,
      media: [
        {
          type: 'video',
          url: video_url
        },
        ...referenceImages.map((url) => ({
          type: 'reference_image',
          url
        }))
      ]
    },
    parameters: {
      resolution,
      watermark,
      audio_setting
    },
    pollIntervalSeconds: poll_interval_seconds,
    maxPollAttempts: max_poll_attempts
  });
}
