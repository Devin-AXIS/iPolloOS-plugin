import { z } from 'zod';
import { errorOutput, getErrText, localizedParams, runEngineTool } from '../../../lib/client';
import {
  LocalizedInputSchema,
  NumSchema,
  SearchApiConfigSchema,
  SearchApiOutputSchema,
  optionalString,
  requiredString
} from '../../../lib/schemas';

const ModeSchema = z.enum(['shopping', 'flights', 'hotels', 'travel_explore']).default('shopping');
type Mode = z.infer<typeof ModeSchema>;

const engineMap: Record<Mode, string> = {
  shopping: 'google_shopping',
  flights: 'google_flights',
  hotels: 'google_hotels',
  travel_explore: 'google_travel_explore'
};

const keyMap: Record<Mode, string[]> = {
  shopping: ['shopping_results'],
  flights: ['best_flights', 'other_flights', 'flights'],
  hotels: ['properties', 'hotels'],
  travel_explore: ['destinations', 'results']
};

export const InputType = SearchApiConfigSchema.and(LocalizedInputSchema)
  .and(NumSchema)
  .and(
    z.object({
      q: requiredString(),
      mode: ModeSchema,
      from: optionalString(64),
      to: optionalString(64),
      date: optionalString(32)
    })
  );

export const OutputType = SearchApiOutputSchema;

export async function tool(props: z.infer<typeof InputType>) {
  let engine: string = engineMap.shopping;
  try {
    return await runEngineTool({
      props,
      parse: (value) => InputType.parse(value),
      engine: (input) => {
        engine = engineMap[input.mode as keyof typeof engineMap];
        return engine;
      },
      params: (input, config, selectedEngine) => {
        if (selectedEngine === 'google_flights') {
          return {
            departure_id: input.from,
            arrival_id: input.to,
            outbound_date: input.date,
            ...localizedParams(config, input)
          };
        }
        return {
          q: input.q,
          num: input.num,
          ...localizedParams(config, input)
        };
      },
      preferredKeys: (input) => keyMap[input.mode as keyof typeof keyMap],
      limit: (input) => input.num
    });
  } catch (error) {
    return errorOutput(getErrText(error), engine);
  }
}
