import { z } from 'zod';
import { ThemeIdEnum } from './themes';
import { createDeckState } from './presets';

const emptyToUndef = (v: unknown) => (v === '' || v === null || v === undefined ? undefined : v);

export const DeckInitFieldsSchema = z.object({
  deck_title: z.string().min(1),
  theme_id: z.preprocess(emptyToUndef, ThemeIdEnum.optional())
});

export type DeckInitFields = z.infer<typeof DeckInitFieldsSchema>;

export function initDeckFromFields(fields: DeckInitFields) {
  const parsed = DeckInitFieldsSchema.parse(fields);
  return createDeckState({
    title: parsed.deck_title.trim(),
    themeId: parsed.theme_id
  });
}
