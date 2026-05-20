import { getErrText } from '@tool/utils/err';
import { z } from 'zod';
import { buildAiSearchQuery, buildRecentUpdateQuery, searchRepos } from '../../../lib/github';
import { formatDiscoverMarkdown, formatSourceLinks, stringifyJson } from '../../../lib/format';
import { DiscoveryModeSchema, RadarConfigSchema, TimeRangeSchema } from '../../../lib/schemas';

const emptyToUndefined = (v: unknown) =>
  v === '' || v === null || v === undefined ? undefined : v;

export const InputType = RadarConfigSchema.and(
  z.object({
    query: z.preprocess(emptyToUndefined, z.string().max(500).optional()),
    direction: z.preprocess(emptyToUndefined, z.string().max(120).optional()),
    discoveryMode: DiscoveryModeSchema,
    timeRange: TimeRangeSchema,
    language: z.preprocess(emptyToUndefined, z.string().max(80).optional()),
    minStars: z.coerce.number().int().min(0).max(1_000_000).default(20),
    maxResults: z.coerce.number().int().min(1).max(30).default(10),
    sort: z.enum(['stars', 'updated', 'forks']).default('stars')
  })
);

export const OutputType = z.object({
  projects_markdown: z.string(),
  projects_json: z.string(),
  updated_projects_json: z.string(),
  github_query: z.string(),
  updated_github_query: z.string(),
  source_links: z.string(),
  count: z.number(),
  updated_count: z.number(),
  system_error: z.string().optional()
});

type In = z.infer<typeof InputType>;
type Out = z.infer<typeof OutputType>;

export async function tool(props: In): Promise<Out> {
  try {
    const input = InputType.parse(props);
    const q = buildAiSearchQuery({
      query: input.query,
      direction: input.direction,
      language: input.language,
      minStars: input.minStars,
      timeRange: input.timeRange,
      discoveryMode: input.discoveryMode
    });
    const result = await searchRepos(input, {
      q,
      sort: input.sort,
      order: 'desc',
      perPage: input.maxResults
    });
    const updatedQuery =
      input.discoveryMode === 'recent_new'
        ? buildRecentUpdateQuery({
            query: input.query,
            direction: input.direction,
            language: input.language,
            minStars: Math.max(input.minStars, 100),
            timeRange: input.timeRange
          })
        : '';
    const updatedResult = updatedQuery
      ? await searchRepos(input, {
          q: updatedQuery,
          sort: 'updated',
          order: 'desc',
          perPage: Math.min(5, input.maxResults)
        })
      : { totalCount: 0, incomplete: false, items: [] };
    const newNames = new Set(result.items.map((repo) => repo.full_name));
    const updatedItems = updatedResult.items.filter((repo) => !newNames.has(repo.full_name));

    return {
      projects_markdown: formatDiscoverMarkdown(
        result.items,
        {
          query: q,
          totalCount: result.totalCount,
          incomplete: result.incomplete
        },
        updatedItems,
        updatedQuery
          ? {
              query: updatedQuery,
              totalCount: updatedResult.totalCount,
              incomplete: updatedResult.incomplete
            }
          : undefined
      ),
      projects_json: stringifyJson({ newProjects: result.items, updatedProjects: updatedItems }),
      updated_projects_json: stringifyJson(updatedItems),
      github_query: q,
      updated_github_query: updatedQuery,
      source_links: formatSourceLinks([...result.items, ...updatedItems]),
      count: result.items.length,
      updated_count: updatedItems.length
    };
  } catch (e: unknown) {
    return {
      projects_markdown: '',
      projects_json: '[]',
      updated_projects_json: '[]',
      github_query: '',
      updated_github_query: '',
      source_links: '',
      count: 0,
      updated_count: 0,
      system_error: getErrText(e)
    };
  }
}
