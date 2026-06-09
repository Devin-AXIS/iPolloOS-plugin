import { z } from 'zod';

const emptyToUndefined = (value: unknown) => {
  if (value === '' || value === null || value === undefined) return undefined;
  return value;
};

export const cleanUsername = (value: unknown) =>
  String(value ?? '')
    .trim()
    .replace(/^@+/, '');

export const XConfigSchema = z.object({
  bearerToken: z.preprocess(emptyToUndefined, z.string().min(10, 'X Bearer Token is required')),
  baseUrl: z.preprocess(
    emptyToUndefined,
    z.string().url().max(2048).optional().default('https://api.x.com')
  ),
  timeoutMs: z.preprocess(
    emptyToUndefined,
    z.coerce.number().int().min(1000).max(60_000).optional().default(15_000)
  ),
  defaultMaxResults: z.preprocess(
    emptyToUndefined,
    z.coerce.number().int().min(5).max(100).optional().default(10)
  )
});

export const XQueryModeSchema = z.enum(['user_by_username', 'user_posts', 'recent_search']);

export const XUserSchema = z
  .object({
    id: z.string(),
    name: z.string().optional(),
    username: z.string().optional(),
    description: z.string().optional(),
    verified: z.boolean().optional(),
    verified_type: z.string().optional(),
    public_metrics: z
      .object({
        followers_count: z.number().optional(),
        following_count: z.number().optional(),
        tweet_count: z.number().optional(),
        listed_count: z.number().optional()
      })
      .optional()
  })
  .passthrough();

export const XPostSchema = z
  .object({
    id: z.string(),
    text: z.string().optional(),
    author_id: z.string().optional(),
    created_at: z.string().optional(),
    conversation_id: z.string().optional(),
    lang: z.string().optional(),
    public_metrics: z
      .object({
        retweet_count: z.number().optional(),
        reply_count: z.number().optional(),
        like_count: z.number().optional(),
        quote_count: z.number().optional(),
        impression_count: z.number().optional()
      })
      .optional(),
    referenced_tweets: z
      .array(
        z.object({
          type: z.string().optional(),
          id: z.string().optional()
        })
      )
      .optional(),
    edit_history_tweet_ids: z.array(z.string()).optional()
  })
  .passthrough();

export const XIncludesSchema = z
  .object({
    users: z.array(XUserSchema).optional(),
    tweets: z.array(XPostSchema).optional(),
    media: z.array(z.record(z.string(), z.any())).optional()
  })
  .passthrough()
  .optional();

export const XMetaSchema = z
  .object({
    result_count: z.number().optional(),
    newest_id: z.string().optional(),
    oldest_id: z.string().optional(),
    next_token: z.string().optional(),
    previous_token: z.string().optional()
  })
  .passthrough()
  .optional();

export const XApiErrorSchema = z
  .object({
    title: z.string().optional(),
    detail: z.string().optional(),
    status: z.number().optional(),
    type: z.string().optional()
  })
  .passthrough();

export const XUserLookupResponseSchema = z
  .object({
    data: XUserSchema.optional(),
    errors: z.array(XApiErrorSchema).optional()
  })
  .passthrough();

export const XPostListResponseSchema = z
  .object({
    data: z.array(XPostSchema).optional().default([]),
    includes: XIncludesSchema,
    meta: XMetaSchema,
    errors: z.array(XApiErrorSchema).optional()
  })
  .passthrough();

export const XWatchStateSchema = z
  .object({
    userId: z.string().optional(),
    username: z.string().optional(),
    lastPostId: z.string().optional(),
    newestPostId: z.string().optional(),
    checkedAt: z.string().optional()
  })
  .passthrough()
  .default({});

export type XConfig = z.infer<typeof XConfigSchema>;
export type XUser = z.infer<typeof XUserSchema>;
export type XPost = z.infer<typeof XPostSchema>;
export type XPostListResponse = z.infer<typeof XPostListResponseSchema>;
export type XWatchState = z.infer<typeof XWatchStateSchema>;
