import { z } from 'zod';

const DEFAULT_UA =
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36';

const emptyToUndefined = (v: unknown) => {
  if (v === '' || v === null || v === undefined) return undefined;
  return v;
};

export const AihotConfigSchema = z.object({
  baseUrl: z.preprocess(
    emptyToUndefined,
    z.string().url().max(2048).optional().default('https://aihot.virxact.com')
  ),
  userAgent: z.preprocess(
    emptyToUndefined,
    z.string().min(8).max(1024).optional().default(DEFAULT_UA)
  ),
  timeoutMs: z.preprocess(
    emptyToUndefined,
    z.coerce.number().int().min(1000).max(60_000).optional().default(15_000)
  ),
  maxItems: z.preprocess(
    emptyToUndefined,
    z.coerce.number().int().min(1).max(50).optional().default(20)
  )
});

export const ItemsModeSchema = z.enum(['selected', 'all']);

export const AihotItemSchema = z.object({
  id: z.string().optional(),
  title: z.string().optional(),
  title_en: z.string().optional(),
  url: z.string().optional(),
  source: z.string().optional(),
  publishedAt: z.string().optional(),
  summary: z.string().optional(),
  category: z.string().optional()
});

export const ItemsResponseSchema = z.object({
  count: z.number().optional(),
  hasNext: z.boolean().optional(),
  nextCursor: z.string().nullable().optional(),
  items: z.array(AihotItemSchema).default([])
});

export const DailyItemSchema = z.object({
  title: z.string().optional(),
  summary: z.string().optional(),
  sourceUrl: z.string().optional(),
  sourceName: z.string().optional()
});

export const DailySectionSchema = z.object({
  label: z.string().optional(),
  items: z.array(DailyItemSchema).default([])
});

export const DailyResponseSchema = z.object({
  date: z.string().optional(),
  generatedAt: z.string().optional(),
  windowStart: z.string().optional(),
  windowEnd: z.string().optional(),
  lead: z.unknown().optional(),
  sections: z.array(DailySectionSchema).default([]),
  flashes: z.array(z.unknown()).optional().default([])
});

export const DailyListItemSchema = z.object({
  date: z.string(),
  generatedAt: z.string().optional(),
  leadTitle: z.string().nullable().optional(),
  leadParagraph: z.string().nullable().optional()
});

export const DailiesResponseSchema = z.object({
  count: z.number().optional(),
  items: z.array(DailyListItemSchema).default([])
});

export type AihotConfig = z.infer<typeof AihotConfigSchema>;
export type AihotItem = z.infer<typeof AihotItemSchema>;
export type ItemsResponse = z.infer<typeof ItemsResponseSchema>;
export type DailyResponse = z.infer<typeof DailyResponseSchema>;
export type DailiesResponse = z.infer<typeof DailiesResponseSchema>;
