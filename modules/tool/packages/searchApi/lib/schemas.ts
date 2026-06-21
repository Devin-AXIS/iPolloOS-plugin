import { z } from 'zod';

const emptyToUndefined = (value: unknown) => {
  if (value === '' || value === null || value === undefined) return undefined;
  return value;
};

export const optionalString = (max = 2048) =>
  z.preprocess(emptyToUndefined, z.string().trim().max(max).optional());

export const requiredString = (max = 2048) => z.string().trim().min(1).max(max);

export const SearchApiConfigSchema = z.object({
  apiKey: z.string().trim().min(1).max(4096),
  defaultCountry: z.preprocess(
    emptyToUndefined,
    z.string().trim().min(2).max(12).optional().default('us')
  ),
  defaultLanguage: z.preprocess(
    emptyToUndefined,
    z.string().trim().min(2).max(16).optional().default('en')
  ),
  baseUrl: z.preprocess(
    emptyToUndefined,
    z.string().trim().url().max(2048).optional().default('https://www.searchapi.io')
  )
});

export const LocalizedInputSchema = z.object({
  country: optionalString(12),
  language: optionalString(16),
  location: optionalString(256)
});

export const NumSchema = z.object({
  num: z.coerce.number().int().min(1).max(100).default(20)
});

export const TimePeriodSchema = z.object({
  time_period: z
    .enum(['', 'last_hour', 'last_day', 'last_week', 'last_month', 'last_year'])
    .optional()
    .default('')
});

export const SearchApiOutputSchema = z.object({
  result: z.any(),
  raw_json: z.string().optional(),
  source_links: z.string().optional(),
  count: z.number().optional(),
  engine: z.string().optional(),
  system_error: z.string().optional()
});

export type SearchApiConfig = z.infer<typeof SearchApiConfigSchema>;
