import { getErrText } from '@tool/utils/err';
import { z } from 'zod';
import { fetchDaily } from '../../../lib/client';
import { formatDailyMarkdown, formatDailySourceLinks, stringifyJson } from '../../../lib/format';
import { AihotConfigSchema } from '../../../lib/schemas';

const emptyToUndefined = (v: unknown) =>
  v === '' || v === null || v === undefined ? undefined : v;

export const InputType = AihotConfigSchema.and(
  z.object({
    date: z.preprocess(
      emptyToUndefined,
      z
        .string()
        .regex(/^\d{4}-\d{2}-\d{2}$/)
        .optional()
    )
  })
);

export const OutputType = z.object({
  daily_markdown: z.string(),
  daily_json: z.string(),
  source_links: z.string(),
  date: z.string(),
  generated_at: z.string(),
  system_error: z.string().optional()
});

type In = z.infer<typeof InputType>;
type Out = z.infer<typeof OutputType>;

export async function tool(props: In): Promise<Out> {
  try {
    const input = InputType.parse(props);
    const data = await fetchDaily(input, input.date);

    return {
      daily_markdown: formatDailyMarkdown(data),
      daily_json: stringifyJson(data),
      source_links: formatDailySourceLinks(data),
      date: data.date ?? '',
      generated_at: data.generatedAt ?? ''
    };
  } catch (e: unknown) {
    return {
      daily_markdown: '',
      daily_json: '{}',
      source_links: '',
      date: '',
      generated_at: '',
      system_error: getErrText(e)
    };
  }
}
