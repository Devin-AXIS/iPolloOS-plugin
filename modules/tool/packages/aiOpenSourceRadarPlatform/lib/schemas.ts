import { z } from 'zod';

const emptyToUndefined = (v: unknown) =>
  v === '' || v === null || v === undefined ? undefined : v;

export const RadarConfigSchema = z.object({
  githubToken: z.preprocess(emptyToUndefined, z.string().max(4096).optional()),
  githubApiBaseUrl: z.preprocess(
    emptyToUndefined,
    z.string().url().max(2048).optional().default('https://api.github.com')
  ),
  userAgent: z.preprocess(
    emptyToUndefined,
    z.string().min(3).max(512).optional().default('AI-Open-Source-Radar/1.0')
  ),
  timeoutMs: z.preprocess(
    emptyToUndefined,
    z.coerce.number().int().min(1000).max(60_000).optional().default(15_000)
  ),
  maxResults: z.preprocess(
    emptyToUndefined,
    z.coerce.number().int().min(1).max(30).optional().default(10)
  )
});

export const TimeRangeSchema = z
  .enum(['today', '24h', '7d', '15d', '30d', '90d', '180d'])
  .default('15d');
export const DiscoveryModeSchema = z
  .enum(['recent_new', 'recent_active', 'broad_ai'])
  .default('recent_new');

export const GithubRepoSchema = z.object({
  id: z.number().optional(),
  full_name: z.string(),
  name: z.string(),
  html_url: z.string(),
  description: z.string().nullable().optional(),
  stargazers_count: z.number().optional().default(0),
  forks_count: z.number().optional().default(0),
  open_issues_count: z.number().optional().default(0),
  watchers_count: z.number().optional().default(0),
  language: z.string().nullable().optional(),
  license: z
    .object({ spdx_id: z.string().nullable().optional(), name: z.string().nullable().optional() })
    .nullable()
    .optional(),
  topics: z.array(z.string()).optional().default([]),
  created_at: z.string().optional(),
  updated_at: z.string().optional(),
  pushed_at: z.string().optional(),
  homepage: z.string().nullable().optional(),
  default_branch: z.string().optional(),
  archived: z.boolean().optional().default(false),
  disabled: z.boolean().optional().default(false)
});

export const GithubSearchResponseSchema = z.object({
  total_count: z.number().optional().default(0),
  incomplete_results: z.boolean().optional().default(false),
  items: z.array(GithubRepoSchema).default([])
});

export const GithubCommitSchema = z.object({
  sha: z.string().optional(),
  html_url: z.string().optional(),
  commit: z
    .object({
      message: z.string().optional(),
      author: z.object({ date: z.string().optional(), name: z.string().optional() }).optional()
    })
    .optional()
});

export const GithubReleaseSchema = z.object({
  name: z.string().nullable().optional(),
  tag_name: z.string().optional(),
  html_url: z.string().optional(),
  published_at: z.string().nullable().optional(),
  body: z.string().nullable().optional(),
  prerelease: z.boolean().optional()
});

export const GithubContentSchema = z.object({
  name: z.string(),
  path: z.string(),
  type: z.string(),
  size: z.number().optional(),
  download_url: z.string().nullable().optional()
});

export const GithubTreeItemSchema = z.object({
  path: z.string(),
  mode: z.string().optional(),
  type: z.string(),
  sha: z.string().optional(),
  size: z.number().optional(),
  url: z.string().optional()
});

export const GithubTreeResponseSchema = z.object({
  sha: z.string().optional(),
  truncated: z.boolean().optional().default(false),
  tree: z.array(GithubTreeItemSchema).default([])
});

export const GithubContributorSchema = z.object({
  login: z.string().optional(),
  html_url: z.string().optional(),
  contributions: z.number().optional().default(0),
  type: z.string().optional()
});

export const HnHitSchema = z.object({
  title: z.string().nullable().optional(),
  story_title: z.string().nullable().optional(),
  url: z.string().nullable().optional(),
  story_url: z.string().nullable().optional(),
  objectID: z.string().optional(),
  points: z.number().nullable().optional(),
  num_comments: z.number().nullable().optional(),
  created_at: z.string().optional()
});

export const HnSearchResponseSchema = z.object({
  hits: z.array(HnHitSchema).default([])
});

export type RadarConfig = z.infer<typeof RadarConfigSchema>;
export type GithubRepo = z.infer<typeof GithubRepoSchema>;
export type GithubCommit = z.infer<typeof GithubCommitSchema>;
export type GithubRelease = z.infer<typeof GithubReleaseSchema>;
export type GithubContent = z.infer<typeof GithubContentSchema>;
export type GithubTreeItem = z.infer<typeof GithubTreeItemSchema>;
export type GithubContributor = z.infer<typeof GithubContributorSchema>;
export type HnHit = z.infer<typeof HnHitSchema>;
