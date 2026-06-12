import { getErrText } from '@tool/utils/err';
import { z } from 'zod';
import { cidmsJsonRequest, safeJson } from '../../../lib/client';
import { CidmsAuthFields } from '../../../lib/schemas';

export const InputType = CidmsAuthFields.and(
  z.object({
    task_id: z.string().min(1).max(512)
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
    const data = await cidmsJsonRequest<Record<string, unknown>>({
      auth: input,
      method: 'GET',
      path: `/v1/video/generations/${encodeURIComponent(input.task_id)}`
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
