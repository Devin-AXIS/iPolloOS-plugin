import { getErrText } from '@tool/utils/err';
import { z } from 'zod';
import { getRepo, searchRepos } from '../../../lib/github';
import { formatDiscoverMarkdown, formatSourceLinks, stringifyJson } from '../../../lib/format';
import { RadarConfigSchema } from '../../../lib/schemas';

const emptyToUndefined = (v: unknown) =>
  v === '' || v === null || v === undefined ? undefined : v;

export const InputType = RadarConfigSchema.and(
  z
    .object({
      project: z.preprocess(emptyToUndefined, z.string().max(500).optional()),
      requirement: z.preprocess(emptyToUndefined, z.string().max(500).optional()),
      maxResults: z.coerce.number().int().min(1).max(30).default(8),
      minStars: z.coerce.number().int().min(0).max(1_000_000).default(20)
    })
    .refine((v) => v.project || v.requirement, {
      message: '请至少填写参考项目或需求。'
    })
);

export const OutputType = z.object({
  similar_projects_markdown: z.string(),
  similar_projects_json: z.string(),
  github_query: z.string(),
  source_links: z.string(),
  count: z.number(),
  system_error: z.string().optional()
});

type In = z.infer<typeof InputType>;
type Out = z.infer<typeof OutputType>;

function queryFromRepo(
  repo: Awaited<ReturnType<typeof getRepo>>,
  requirement?: string,
  minStars = 20
): string {
  const text =
    `${requirement ?? ''} ${repo.description ?? ''} ${(repo.topics ?? []).join(' ')}`.toLowerCase();
  const intent = requirement?.trim()
    ? requirement
        .trim()
        .replace(/[^\w\s-]/g, ' ')
        .split(/\s+/)
        .filter((word) => word.length >= 3)
        .slice(0, 3)
        .join(' ')
    : text.includes('rag')
      ? 'RAG'
      : text.includes('browser')
        ? 'browser agent'
        : text.includes('code') || text.includes('coding')
          ? 'coding agent'
          : text.includes('llm')
            ? 'LLM framework'
            : text.includes('agent')
              ? 'agent'
              : 'AI';
  return `${intent} stars:>=${minStars} archived:false -repo:${repo.full_name}`;
}

export async function tool(props: In): Promise<Out> {
  try {
    const input = InputType.parse(props);
    let q = '';
    if (input.project) {
      const repo = await getRepo(input, input.project);
      q = queryFromRepo(repo, input.requirement, input.minStars);
    } else {
      q = `${input.requirement} stars:>=${input.minStars} archived:false`;
    }

    const result = await searchRepos(input, {
      q,
      sort: 'stars',
      order: 'desc',
      perPage: input.maxResults
    });

    return {
      similar_projects_markdown: formatDiscoverMarkdown(result.items, {
        query: q,
        totalCount: result.totalCount,
        incomplete: result.incomplete
      }),
      similar_projects_json: stringifyJson(result.items),
      github_query: q,
      source_links: formatSourceLinks(result.items),
      count: result.items.length
    };
  } catch (e: unknown) {
    return {
      similar_projects_markdown: '',
      similar_projects_json: '[]',
      github_query: '',
      source_links: '',
      count: 0,
      system_error: getErrText(e)
    };
  }
}
