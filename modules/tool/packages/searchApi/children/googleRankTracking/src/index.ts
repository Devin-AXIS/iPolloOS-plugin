import { z } from 'zod';
import {
  compactRows,
  errorOutput,
  extractRows,
  filterDomainRank,
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
  requiredString
} from '../../../lib/schemas';

const engine = 'google';

export const InputType = SearchApiConfigSchema.and(LocalizedInputSchema)
  .and(NumSchema)
  .and(z.object({ q: requiredString(), domain: requiredString(256) }));

export const OutputType = SearchApiOutputSchema;

export async function tool(props: z.infer<typeof InputType>) {
  try {
    const input = InputType.parse(props);
    const config = SearchApiConfigSchema.parse(input);
    const data = await searchApiRequest(input, engine, {
      q: input.q,
      num: input.num,
      ...localizedParams(config, input)
    });
    const rankedRows = filterDomainRank(extractRows(data, ['organic_results']), input.domain);
    const rows = compactRows(rankedRows, input.num);
    return makeOutput(engine, data, rows);
  } catch (error) {
    return errorOutput(getErrText(error), engine);
  }
}
