import { z } from 'zod';
import { errorOutput, getErrText, localizedParams, runEngineTool } from '../../../lib/client';
import {
  LocalizedInputSchema,
  NumSchema,
  SearchApiConfigSchema,
  SearchApiOutputSchema
} from '../../../lib/schemas';

const engine = 'google_lens';

export const InputType = SearchApiConfigSchema.and(LocalizedInputSchema)
  .and(NumSchema)
  .and(z.object({ image_url: z.string().trim().url().max(4096) }));

export const OutputType = SearchApiOutputSchema;

export async function tool(props: z.infer<typeof InputType>) {
  try {
    return await runEngineTool({
      props,
      parse: (value) => InputType.parse(value),
      engine,
      params: (input, config) => ({
        url: input.image_url,
        num: input.num,
        ...localizedParams(config, input)
      }),
      preferredKeys: ['visual_matches', 'lens_results', 'organic_results'],
      limit: (input) => input.num
    });
  } catch (error) {
    return errorOutput(getErrText(error), engine);
  }
}
