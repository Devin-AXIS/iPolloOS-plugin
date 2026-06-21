import { z } from 'zod';
import { errorOutput, getErrText, localizedParams, runEngineTool } from '../../../lib/client';
import {
  LocalizedInputSchema,
  NumSchema,
  SearchApiConfigSchema,
  SearchApiOutputSchema,
  requiredString
} from '../../../lib/schemas';

const ModeSchema = z.enum(['local', 'maps', 'place']).default('local');
type Mode = z.infer<typeof ModeSchema>;

const engineMap: Record<Mode, string> = {
  local: 'google_local',
  maps: 'google_maps',
  place: 'google_place'
};

const keyMap: Record<Mode, string[]> = {
  local: ['local_results'],
  maps: ['maps_results', 'local_results'],
  place: ['place_results', 'local_results', 'results']
};

export const InputType = SearchApiConfigSchema.and(LocalizedInputSchema)
  .and(NumSchema)
  .and(z.object({ q: requiredString(2048), mode: ModeSchema }));

export const OutputType = SearchApiOutputSchema;

export async function tool(props: z.infer<typeof InputType>) {
  let engine: string = engineMap.local;
  try {
    return await runEngineTool({
      props,
      parse: (value) => InputType.parse(value),
      engine: (input) => {
        engine = engineMap[input.mode as keyof typeof engineMap];
        return engine;
      },
      params: (input, config, selectedEngine) => ({
        ...(selectedEngine === 'google_place' ? { data_id: input.q } : { q: input.q }),
        num: input.num,
        ...localizedParams(config, input)
      }),
      preferredKeys: (input) => keyMap[input.mode as keyof typeof keyMap],
      limit: (input) => input.num
    });
  } catch (error) {
    return errorOutput(getErrText(error), engine);
  }
}
