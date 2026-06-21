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

const ModeSchema = z.enum(['videos', 'shorts']).default('videos');

export const InputType = SearchApiConfigSchema.and(LocalizedInputSchema)
  .and(NumSchema)
  .and(TimePeriodSchema)
  .and(z.object({ q: requiredString(), mode: ModeSchema }));

export const OutputType = SearchApiOutputSchema;

export async function tool(props: z.infer<typeof InputType>) {
  const parsed = InputType.safeParse(props);
  const engine =
    parsed.success && parsed.data.mode === 'shorts' ? 'google_shorts' : 'google_videos';

  try {
    if (!parsed.success) throw parsed.error;
    const input = parsed.data;
    const config = SearchApiConfigSchema.parse(input);
    const data = await searchApiRequest(input, engine, {
      q: input.q,
      num: input.num,
      time_period: input.time_period,
      ...localizedParams(config, input)
    });
    const rows = compactRows(
      extractRows(data, input.mode === 'shorts' ? ['shorts'] : ['videos']),
      input.num
    );
    return makeOutput(engine, data, rows);
  } catch (error) {
    return errorOutput(getErrText(error), engine);
  }
}
