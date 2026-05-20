import { getErrText } from '@tool/utils/err';
import { z } from 'zod';
import { fetchItems } from '../../../lib/client';
import {
  formatItemsMarkdown,
  formatSourceLinksFromItems,
  stringifyJson
} from '../../../lib/format';
import { AihotConfigSchema, ItemsModeSchema } from '../../../lib/schemas';

const emptyToUndefined = (v: unknown) =>
  v === '' || v === null || v === undefined ? undefined : v;

export const InputType = AihotConfigSchema.and(
  z.object({
    q: z.preprocess(emptyToUndefined, z.string().max(200).optional()),
    category: z.preprocess(emptyToUndefined, z.string().max(80).optional()),
    since: z.preprocess(emptyToUndefined, z.string().max(80).optional()),
    cursor: z.preprocess(emptyToUndefined, z.string().max(2048).optional()),
    mode: ItemsModeSchema.default('selected'),
    take: z.coerce.number().int().min(1).max(50).default(10)
  })
);

export const OutputType = z.object({
  answer_markdown: z.string(),
  items_json: z.string(),
  source_links: z.string(),
  count: z.number(),
  next_cursor: z.string(),
  has_next: z.boolean(),
  system_error: z.string().optional()
});

type In = z.infer<typeof InputType>;
type Out = z.infer<typeof OutputType>;

export async function tool(props: In): Promise<Out> {
  try {
    const input = InputType.parse(props);
    const data = await fetchItems(input, {
      mode: input.mode,
      take: input.take,
      q: input.q,
      category: input.category,
      since: input.since,
      cursor: input.cursor
    });

    return {
      answer_markdown: formatItemsMarkdown(data),
      items_json: stringifyJson(data.items),
      source_links: formatSourceLinksFromItems(data.items),
      count: data.items.length,
      next_cursor: data.nextCursor ?? '',
      has_next: Boolean(data.hasNext)
    };
  } catch (e: unknown) {
    return {
      answer_markdown: '',
      items_json: '[]',
      source_links: '',
      count: 0,
      next_cursor: '',
      has_next: false,
      system_error: getErrText(e)
    };
  }
}
