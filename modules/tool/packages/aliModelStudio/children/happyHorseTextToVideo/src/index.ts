import { z } from 'zod';
import {
  RatioEnum,
  RegionEnum,
  ResolutionEnum,
  runHappyHorseVideoTask
} from '../../../lib/happyHorse';

const AutoRatioEnum = z.union([z.literal('auto'), RatioEnum]);
const DurationInput = z.union([
  z.literal('auto'),
  z.number().int().min(3).max(15),
  z.string().regex(/^(?:[3-9]|1[0-5])$/)
]);

export const InputType = z.object({
  apiKey: z.string().describe('Alibaba Cloud Model Studio API Key'),
  prompt: z.string().min(1).describe('Text prompt for the video'),
  region: RegionEnum.optional().default('beijing').describe('DashScope region'),
  resolution: ResolutionEnum.optional().default('1080P').describe('Video resolution'),
  ratio: AutoRatioEnum.optional().default('auto').describe('Video aspect ratio'),
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
  prompt,
  region = 'beijing',
  resolution = '1080P',
  ratio = 'auto',
  duration = 'auto',
  watermark = true,
  poll_interval_seconds = 15,
  max_poll_attempts = 40
}: z.infer<typeof InputType>): Promise<z.infer<typeof OutputType>> {
  const manualDuration = duration === 'auto' ? undefined : Number(duration);

  return runHappyHorseVideoTask({
    apiKey,
    region,
    model: 'happyhorse-1.0-t2v',
    input: { prompt },
    parameters: {
      resolution,
      ...(ratio !== 'auto' ? { ratio } : {}),
      ...(manualDuration !== undefined ? { duration: manualDuration } : {}),
      watermark
    },
    pollIntervalSeconds: poll_interval_seconds,
    maxPollAttempts: max_poll_attempts
  });
}
