import { z } from 'zod';
import {
  compactRows,
  errorOutput,
  extractRows,
  getErrText,
  makeOutput,
  searchApiRequest
} from '../../../lib/client';
import {
  NumSchema,
  SearchApiConfigSchema,
  SearchApiOutputSchema,
  requiredString
} from '../../../lib/schemas';

const engine = 'baidu';

export const InputType = SearchApiConfigSchema.and(NumSchema).and(
  z.object({ q: requiredString() })
);

export const OutputType = SearchApiOutputSchema;

export async function tool(props: z.infer<typeof InputType>) {
  try {
    const input = InputType.parse(props);
    const data = await searchApiRequest(input, engine, { q: input.q, num: input.num });
    const rows = compactRows(extractRows(data, ['organic_results']), input.num);
    return makeOutput(engine, data, rows);
  } catch (error) {
    return errorOutput(getErrText(error), engine);
  }
}
