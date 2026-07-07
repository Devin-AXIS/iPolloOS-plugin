import { getErrText } from '@tool/utils/err';
import { z } from 'zod';
import { CidmsAuthFields } from '../../../lib/schemas';
import { queryVideoTaskUntilDone } from '../../../lib/videoTaskQuery';

export const InputType = CidmsAuthFields.and(
  z.object({
    task_id: z.string().min(1).max(512),
    max_wait_seconds: z.coerce.number().int().min(0).max(1800).default(600)
  })
);

export const OutputType = z.object({
  task_id: z.string(),
  status: z.string(),
  progress: z.number(),
  result_url: z.string(),
  completed: z.boolean(),
  should_continue: z.boolean(),
  poll_count: z.number(),
  elapsed_seconds: z.number(),
  timed_out: z.boolean(),
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
    completed: true,
    should_continue: false,
    poll_count: 0,
    elapsed_seconds: 0,
    timed_out: false,
    response_json: '{}',
    system_error
  };
}

export async function tool(raw: z.infer<typeof InputType>): Promise<Out> {
  try {
    const input = InputType.parse(raw);
    return await queryVideoTaskUntilDone(input);
  } catch (e: unknown) {
    return errOut(getErrText(e));
  }
}
