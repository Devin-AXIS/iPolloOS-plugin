import { z } from 'zod';
import { errorOutput, getErrText, localizedParams, runEngineTool } from '../../../lib/client';
import {
  LocalizedInputSchema,
  SearchApiConfigSchema,
  SearchApiOutputSchema,
  TimePeriodSchema,
  requiredString
} from '../../../lib/schemas';

const ModeSchema = z.enum(['trends', 'autocomplete']).default('trends');

export const InputType = SearchApiConfigSchema.and(LocalizedInputSchema)
  .and(TimePeriodSchema)
  .and(z.object({ q: requiredString(), mode: ModeSchema }));

export const OutputType = SearchApiOutputSchema;

export async function tool(props: z.infer<typeof InputType>) {
  let engine = 'google_trends';
  try {
    return await runEngineTool({
      props,
      parse: (value) => InputType.parse(value),
      engine: (input) => {
        engine = input.mode === 'autocomplete' ? 'google_autocomplete' : 'google_trends';
        return engine;
      },
      params: (input, config) => ({
        q: input.q,
        time_period: input.mode === 'trends' ? input.time_period : undefined,
        ...localizedParams(config, input)
      }),
      preferredKeys: (input) =>
        input.mode === 'autocomplete'
          ? ['suggestions']
          : ['interest_over_time', 'interest_by_region', 'related_queries', 'related_topics'],
      limit: () => 50
    });
  } catch (error) {
    return errorOutput(getErrText(error), engine);
  }
}
