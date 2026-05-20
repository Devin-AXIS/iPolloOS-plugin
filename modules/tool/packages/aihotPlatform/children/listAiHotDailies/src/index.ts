import { getErrText } from '@tool/utils/err';
import { z } from 'zod';
import { fetchDailies } from '../../../lib/client';
import { formatDailiesMarkdown, stringifyJson } from '../../../lib/format';
import { AihotConfigSchema } from '../../../lib/schemas';

export const InputType = AihotConfigSchema.and(
  z.object({
    take: z.coerce.number().int().min(1).max(50).default(10)
  })
);

export const OutputType = z.object({
  dailies_markdown: z.string(),
  dailies_json: z.string(),
  count: z.number(),
  system_error: z.string().optional()
});

type In = z.infer<typeof InputType>;
type Out = z.infer<typeof OutputType>;

export async function tool(props: In): Promise<Out> {
  try {
    const input = InputType.parse(props);
    const data = await fetchDailies(input, input.take);

    return {
      dailies_markdown: formatDailiesMarkdown(data),
      dailies_json: stringifyJson(data.items),
      count: data.items.length
    };
  } catch (e: unknown) {
    return {
      dailies_markdown: '',
      dailies_json: '[]',
      count: 0,
      system_error: getErrText(e)
    };
  }
}
