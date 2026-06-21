import { z } from 'zod';
import {
  compactRows,
  errorOutput,
  extractRows,
  getErrText,
  localizedParams,
  makeOutput,
  searchApiRequest
} from '../../../lib/client';
import {
  LocalizedInputSchema,
  NumSchema,
  SearchApiConfigSchema,
  SearchApiOutputSchema,
  TimePeriodSchema,
  requiredString
} from '../../../lib/schemas';

const engine = 'google_images';

export const InputType = SearchApiConfigSchema.and(LocalizedInputSchema)
  .and(NumSchema)
  .and(TimePeriodSchema)
  .and(z.object({ q: requiredString() }));

export const OutputType = SearchApiOutputSchema;

export async function tool(props: z.infer<typeof InputType>) {
  try {
    const input = InputType.parse(props);
    const config = SearchApiConfigSchema.parse(input);
    const data = await searchApiRequest(input, engine, {
      q: input.q,
      num: input.num,
      time_period: input.time_period,
      ...localizedParams(config, input)
    });
    const rows = compactRows(extractRows(data, ['images']), input.num);
    return makeOutput(engine, data, rows);
  } catch (error) {
    return errorOutput(getErrText(error), engine);
  }
}
