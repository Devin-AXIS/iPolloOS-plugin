import { getErrText } from '@tool/utils/err';
import { z } from 'zod';
import { cidmsJsonRequest, safeJson } from '../../../lib/client';
import { CidmsAuthFields } from '../../../lib/schemas';
import { buildVideoGenerationPayload } from '../../../lib/video';

const empty = (v: unknown) => (v === '' || v === null || v === undefined ? undefined : v);

export const InputType = CidmsAuthFields.and(
  z.object({
    model: z.string().min(1).default('seedance-2.0-asset-fast'),
    prompt: z.string().min(1).max(50_000),
    reference_url: z.preprocess(empty, z.string().max(4096).optional()).default(''),
    reference_role: z.string().default('reference_image'),
    ratio: z.string().default('16:9'),
    resolution: z.string().default('720p'),
    duration: z.coerce.number().int().min(1).max(120).default(5),
    generate_audio: z.coerce.boolean().default(false),
    callback_url: z.preprocess(empty, z.string().max(4096).optional()).default(''),
    client_reference_id: z.preprocess(empty, z.string().max(512).optional()).default(''),
    content_json: z.preprocess(empty, z.string().max(100_000).optional()).default('')
  })
);

export const OutputType = z.object({
  task_id: z.string(),
  status: z.string(),
  progress: z.number(),
  result_url: z.string(),
  response_json: z.string(),
  system_error: z.string().optional()
});

type Out = z.infer<typeof OutputType>;

function errOut(system_error: string): Out {
  return {
    task_id: '',
    status: '',
    progress: 0,
    result_url: '',
    response_json: '{}',
    system_error
  };
}

export async function tool(raw: z.infer<typeof InputType>): Promise<Out> {
  try {
    const input = InputType.parse(raw);
    const payload = buildVideoGenerationPayload(input);

    const data = await cidmsJsonRequest<Record<string, unknown>>({
      auth: input,
      method: 'POST',
      path: '/v1/video/generations',
      body: payload
    });

    return {
      task_id: readString(data, 'task_id') || readString(data, 'id'),
      status: readString(data, 'status'),
      progress: readNumber(data, 'progress'),
      result_url: readString(data, 'result_url'),
      response_json: safeJson(data)
    };
  } catch (e: unknown) {
    return errOut(getErrText(e));
  }
}

function readString(data: Record<string, unknown>, key: string): string {
  const v = data[key];
  return typeof v === 'string' ? v : '';
}

function readNumber(data: Record<string, unknown>, key: string): number {
  const v = data[key];
  return typeof v === 'number' && Number.isFinite(v) ? v : 0;
}
