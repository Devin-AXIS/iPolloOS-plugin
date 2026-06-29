import { z } from 'zod';

const emptyToUndefined = (value: unknown) => {
  if (value === '' || value === null || value === undefined) return undefined;
  return value;
};

export const cleanUsername = (value: unknown) =>
  String(value ?? '')
    .trim()
    .replace(/^@+/, '');

export const parseXUsernames = (value: unknown): string[] => {
  const normalized = String(value ?? '')
    .replace(/\\r\\n|\\n|\\r/g, '\n')
    .replace(/\/r\/n|\/n|\/r/g, '\n');

  return Array.from(
    new Set(
      normalized
        .split(/[,\uFF0C\u3001;\uFF1B\s]+/)
        .map((item) => cleanUsername(item).toLowerCase())
        .filter(Boolean)
    )
  );
};

export const XConfigSchema = z.object({
  bearerToken: z.preprocess(emptyToUndefined, z.string().min(10).optional()),
  userAccessToken: z.preprocess(emptyToUndefined, z.string().min(10).optional()),
  userAccessTokenSecret: z.preprocess(emptyToUndefined, z.string().min(10).optional()),
  consumerKey: z.preprocess(emptyToUndefined, z.string().min(5).optional()),
  consumerSecret: z.preprocess(emptyToUndefined, z.string().min(10).optional()),
  baseUrl: z.preprocess(
    emptyToUndefined,
    z.string().url().max(2048).optional().default('https://x.p.xapi.to')
  ),
  proxyUrl: z.preprocess(emptyToUndefined, z.string().url().max(2048).optional()),
  mask_sensitive_info: z.preprocess(emptyToUndefined, z.coerce.boolean().default(true)),
  timeoutMs: z.preprocess(
    emptyToUndefined,
    z.coerce.number().int().min(1000).max(60_000).optional().default(15_000)
  ),
  defaultMaxResults: z.preprocess(
    emptyToUndefined,
    z.coerce.number().int().min(5).max(100).optional().default(10)
  )
});

export const XReadConfigSchema = XConfigSchema.refine(
  (data) => data.bearerToken || data.userAccessToken,
  {
    message: 'X read token is required'
  }
);

export const XActionConfigSchema = XConfigSchema.refine((data) => data.userAccessToken, {
  message:
    '缺少 X 用户操作令牌 userAccessToken。写操作需要 OAuth 2.0 User Context Token，或 OAuth 1.0a Access Token + Secret，并授予对应写权限。'
});

export const XQueryModeSchema = z.enum(['user_by_username', 'user_posts', 'recent_search']);

export const XPostManageActionSchema = z.enum([
  'delete',
  'like',
  'unlike',
  'repost',
  'undo_repost'
]);

export const XFollowManageActionSchema = z.enum(['follow', 'unfollow']);

export const XSearchScopeSchema = z.enum(['recent', 'all']);

export const XSearchViewSchema = z.enum(['latest', 'relevant', 'hot']);

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
    media: z
      .array(
        z.object({
          type: z.string().optional(),
          altText: z.string().optional(),
          caption: z.string().optional(),
          description: z.string().optional(),
          ocrText: z.string().optional()
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

export const XGenericActionResponseSchema = z
  .object({
    data: z.record(z.string(), z.any()).optional(),
    errors: z.array(XApiErrorSchema).optional()
  })
  .passthrough();

export const XTrendSchema = z
  .object({
    trend_name: z.string(),
    tweet_count: z.number().optional()
  })
  .passthrough();

export const XTrendsResponseSchema = z
  .object({
    data: z.array(XTrendSchema).optional().default([]),
    errors: z.array(XApiErrorSchema).optional()
  })
  .passthrough();

export const XWatchAccountStateSchema = z
  .object({
    userId: z.string().optional(),
    username: z.string().optional(),
    lastPostId: z.string().optional(),
    newestPostId: z.string().optional(),
    checkedAt: z.string().optional()
  })
  .passthrough();

export const XWatchStateSchema = XWatchAccountStateSchema.extend({
  accounts: z.record(z.string(), XWatchAccountStateSchema).optional()
})
  .passthrough()
  .default({});

export type XConfig = z.infer<typeof XConfigSchema>;
export type XReadConfig = z.infer<typeof XReadConfigSchema>;
export type XActionConfig = z.infer<typeof XActionConfigSchema>;
export type XUser = z.infer<typeof XUserSchema>;
export type XPost = z.infer<typeof XPostSchema>;
export type XPostListResponse = z.infer<typeof XPostListResponseSchema>;
export type XTrendsResponse = z.infer<typeof XTrendsResponseSchema>;
export type XWatchState = z.infer<typeof XWatchStateSchema>;
export type XWatchAccountState = z.infer<typeof XWatchAccountStateSchema>;
export type XPostManageAction = z.infer<typeof XPostManageActionSchema>;
export type XFollowManageAction = z.infer<typeof XFollowManageActionSchema>;
export type XSearchScope = z.infer<typeof XSearchScopeSchema>;
export type XSearchView = z.infer<typeof XSearchViewSchema>;
