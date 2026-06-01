import { z } from 'zod';
import {
  RatioEnum,
  RegionEnum,
  ResolutionEnum,
  runHappyHorseVideoTask
} from '../../../lib/happyHorse';

export const InputType = z.object({
  apiKey: z.string().describe('Alibaba Cloud Model Studio API Key'),
  prompt: z.string().min(1).describe('Text prompt for the video'),
  region: RegionEnum.optional().default('beijing').describe('DashScope region'),
  resolution: ResolutionEnum.optional().default('1080P').describe('Video resolution'),
  ratio: RatioEnum.optional().default('16:9').describe('Video aspect ratio'),
  duration: z
    .number()
    .int()
    .min(3)
    .max(15)
    .optional()
    .default(5)
    .describe('Video duration in seconds'),
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
  prompt,
  region = 'beijing',
  resolution = '1080P',
  ratio = '16:9',
  duration = 5,
  watermark = true,
  poll_interval_seconds = 15,
  max_poll_attempts = 40
}: z.infer<typeof InputType>): Promise<z.infer<typeof OutputType>> {
  return runHappyHorseVideoTask({
    apiKey,
    region,
    model: 'happyhorse-1.0-t2v',
    input: { prompt },
    parameters: {
      resolution,
      ratio,
      duration,
      watermark
    },
    pollIntervalSeconds: poll_interval_seconds,
    maxPollAttempts: max_poll_attempts
  });
}
