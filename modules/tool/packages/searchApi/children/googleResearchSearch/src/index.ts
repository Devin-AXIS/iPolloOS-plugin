import { z } from 'zod';
import { errorOutput, getErrText, localizedParams, runEngineTool } from '../../../lib/client';
import {
  LocalizedInputSchema,
  NumSchema,
  SearchApiConfigSchema,
  SearchApiOutputSchema,
  TimePeriodSchema,
  requiredString
} from '../../../lib/schemas';

const ModeSchema = z.enum(['scholar', 'forums', 'patents', 'books']).default('scholar');
type Mode = z.infer<typeof ModeSchema>;

const engineMap: Record<Mode, string> = {
  scholar: 'google_scholar',
  forums: 'google_forums',
  patents: 'google_patents',
  books: 'google_books'
};

const keyMap: Record<Mode, string[]> = {
  scholar: ['scholar_results', 'organic_results'],
  forums: ['discussions_and_forums', 'organic_results'],
  patents: ['patents', 'organic_results'],
  books: ['books', 'organic_results']
};

export const InputType = SearchApiConfigSchema.and(LocalizedInputSchema)
  .and(NumSchema)
  .and(TimePeriodSchema)
  .and(z.object({ q: requiredString(), mode: ModeSchema }));

export const OutputType = SearchApiOutputSchema;

export async function tool(props: z.infer<typeof InputType>) {
  let engine: string = engineMap.scholar;
  try {
    return await runEngineTool({
      props,
      parse: (value) => InputType.parse(value),
      engine: (input) => {
        engine = engineMap[input.mode as keyof typeof engineMap];
        return engine;
      },
      params: (input, config) => ({
        q: input.q,
        num: input.num,
        time_period: input.time_period,
        ...localizedParams(config, input)
      }),
      preferredKeys: (input) => keyMap[input.mode as keyof typeof keyMap],
      limit: (input) => input.num
    });
  } catch (error) {
    return errorOutput(getErrText(error), engine);
  }
}
