import { z } from 'zod';
import { errorOutput, getErrText, localizedParams, runEngineTool } from '../../../lib/client';
import {
  LocalizedInputSchema,
  NumSchema,
  SearchApiConfigSchema,
  SearchApiOutputSchema,
  requiredString
} from '../../../lib/schemas';

const engine = 'google_ai_mode';

export const InputType = SearchApiConfigSchema.and(LocalizedInputSchema)
  .and(NumSchema)
  .and(z.object({ q: requiredString(4096) }));

export const OutputType = SearchApiOutputSchema;

export async function tool(props: z.infer<typeof InputType>) {
  try {
    return await runEngineTool({
      props,
      parse: (value) => InputType.parse(value),
      engine,
      params: (input, config) => ({
        q: input.q,
        num: input.num,
        ...localizedParams(config, input)
      }),
      preferredKeys: ['ai_mode_results', 'organic_results'],
      limit: (input) => input.num
    });
  } catch (error) {
    return errorOutput(getErrText(error), engine);
  }
}
