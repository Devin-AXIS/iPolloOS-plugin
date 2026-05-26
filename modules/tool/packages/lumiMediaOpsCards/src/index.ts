import { z } from 'zod';

const packageId = 'lumiMediaOpsCards';
const packageName = 'App 媒体运营卡片';
const allowedCardTypes = [
  'account_setup',
  'ops_metrics',
  'content_calendar',
  'topic_idea',
  'content_review',
  'growth_action'
] as const;

export const InputType = z.object({
  card_type: z.enum(allowedCardTypes).default('ops_metrics'),
  card_data: z.union([z.string(), z.record(z.string(), z.any())]),
  title: z.string().optional().default(''),
  reply_text: z.string().optional().default(''),
  placement: z.enum(['auto', 'message', 'tab']).optional().default('auto'),
  update_mode: z.enum(['append', 'replace']).optional().default('append')
});
export const OutputType = z.object({
  answer_text: z.string(),
  app_cards_payload: z.record(z.string(), z.any()),
  app_cards_json: z.string(),
  app_cards_comment: z.string(),
  card_count: z.number(),
  selected_card_type: z.string(),
  allowed_card_types: z.array(z.string()),
  system_error: z.string().optional()
});
type Input = z.infer<typeof InputType>;
type Output = z.infer<typeof OutputType>;
function parseCardData(cardData: Input['card_data']): Record<string, any> {
  if (typeof cardData !== 'string') return cardData;
  const parsed = JSON.parse(cardData);
  return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed : {};
}
export async function tool(input: Input): Promise<Output> {
  try {
    const data = parseCardData(input.card_data);
    const payload = {
      renderer: 'app_cards',
      version: 1,
      packageId,
      packageName,
      placement: input.placement || 'auto',
      updateMode: input.update_mode || 'append',
      cards: [{ type: input.card_type, data, title: input.title?.trim() || undefined }]
    };
    const app_cards_json = JSON.stringify(payload);
    const app_cards_comment = `<!-- app:cards ${app_cards_json.replace(/--/g, '\\u002d\\u002d')} -->`;
    return {
      answer_text: [input.reply_text?.trim(), app_cards_comment].filter(Boolean).join('\n\n'),
      app_cards_payload: payload,
      app_cards_json,
      app_cards_comment,
      card_count: 1,
      selected_card_type: input.card_type,
      allowed_card_types: [...allowedCardTypes]
    };
  } catch (error) {
    return {
      answer_text: '',
      app_cards_payload: {},
      app_cards_json: '',
      app_cards_comment: '',
      card_count: 0,
      selected_card_type: '',
      allowed_card_types: [...allowedCardTypes],
      system_error: error instanceof Error ? error.message : String(error)
    };
  }
}
