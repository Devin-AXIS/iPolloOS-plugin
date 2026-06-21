import { z } from 'zod';
import { errorOutput, getErrText, localizedParams, runEngineTool } from '../../../lib/client';
import {
  LocalizedInputSchema,
  NumSchema,
  SearchApiConfigSchema,
  SearchApiOutputSchema,
  requiredString
} from '../../../lib/schemas';

const ModeSchema = z.enum(['jobs', 'events']).default('jobs');

export const InputType = SearchApiConfigSchema.and(LocalizedInputSchema)
  .and(NumSchema)
  .and(z.object({ q: requiredString(), mode: ModeSchema }));

export const OutputType = SearchApiOutputSchema;

export async function tool(props: z.infer<typeof InputType>) {
  let engine = 'google_jobs';
  try {
    return await runEngineTool({
      props,
      parse: (value) => InputType.parse(value),
      engine: (input) => {
        engine = input.mode === 'events' ? 'google_events' : 'google_jobs';
        return engine;
      },
      params: (input, config) => ({
        q: input.q,
        num: input.num,
        ...localizedParams(config, input)
      }),
      preferredKeys: (input) => (input.mode === 'events' ? ['events_results'] : ['jobs']),
      limit: (input) => input.num
    });
  } catch (error) {
    return errorOutput(getErrText(error), engine);
  }
}
