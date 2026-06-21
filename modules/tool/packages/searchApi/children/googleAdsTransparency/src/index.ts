import { z } from 'zod';
import { errorOutput, getErrText, localizedParams, runEngineTool } from '../../../lib/client';
import {
  LocalizedInputSchema,
  NumSchema,
  SearchApiConfigSchema,
  SearchApiOutputSchema,
  requiredString
} from '../../../lib/schemas';

const engine = 'google_ads_transparency';

export const InputType = SearchApiConfigSchema.and(LocalizedInputSchema)
  .and(NumSchema)
  .and(z.object({ q: requiredString() }));

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
      preferredKeys: ['ad_creatives', 'ads', 'results'],
      limit: (input) => input.num
    });
  } catch (error) {
    return errorOutput(getErrText(error), engine);
  }
}
