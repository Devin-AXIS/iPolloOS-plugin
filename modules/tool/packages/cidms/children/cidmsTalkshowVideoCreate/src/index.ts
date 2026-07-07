import { getErrText } from '@tool/utils/err';
import { z } from 'zod';
import { isCidmsHttpError, safeJson } from '../../../lib/client';
import { CidmsAuthFields } from '../../../lib/schemas';
import {
  runTalkshowVideoGeneration,
  type TalkshowDuration,
  type TalkshowOrientation,
  type TalkshowToolOut
} from '../../../lib/talkshowVideo';

const empty = (v: unknown) => (v === '' || v === null || v === undefined ? undefined : v);

export const InputType = CidmsAuthFields.and(
  z.object({
    description: z.string().min(1).max(50_000),
    dialogue: z.preprocess(empty, z.string().max(50_000).optional()).default(''),
    duration: z.coerce.number().pipe(z.union([z.literal(15), z.literal(30)])).default(15),
    orientation: z.enum(['vertical', 'horizontal']).default('vertical'),
    character_reference_url: z.preprocess(empty, z.string().max(4096).optional()).default(''),
    background_reference_url: z.preprocess(empty, z.string().max(4096).optional()).default(''),
    resolution: z.string().default('720p'),
    generate_audio: z.coerce.boolean().default(true),
    callback_url: z.preprocess(empty, z.string().max(4096).optional()).default(''),
    client_reference_id: z.preprocess(empty, z.string().max(512).optional()).default('')
  })
);

export const OutputType = z.object({
  task_id: z.string(),
  status: z.string(),
  progress: z.number(),
  result_url: z.string(),
  first_task_id: z.string(),
  second_task_id: z.string(),
  first_video_url: z.string(),
  second_video_url: z.string(),
  final_prompt: z.string(),
  response_json: z.string(),
  system_error: z.string().optional()
});

type Out = z.infer<typeof OutputType>;

function errOut(system_error: string, response_json = '{}'): Out {
  return {
    task_id: '',
    status: '',
    progress: 0,
    result_url: '',
    first_task_id: '',
    second_task_id: '',
    first_video_url: '',
    second_video_url: '',
    final_prompt: '',
    response_json,
    system_error
  };
}

export async function tool(raw: z.infer<typeof InputType>): Promise<Out> {
  try {
    const input = InputType.parse(raw);
    return await runTalkshowVideoGeneration({
      ...input,
      duration: input.duration as TalkshowDuration,
      orientation: input.orientation as TalkshowOrientation
    });
  } catch (e: unknown) {
    if (isCidmsHttpError(e)) {
      return errOut(e.message, safeJson({ status: e.status, requestId: e.requestId, response: e.data }));
    }
    return errOut(getErrText(e));
  }
}

export type { TalkshowToolOut };
