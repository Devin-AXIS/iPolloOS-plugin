import { getErrText } from '@tool/utils/err';
import { z } from 'zod';
import {
  getReadme,
  getRepo,
  getLanguages,
  getTextFile,
  listRecentCommits,
  listContributors,
  listRecentReleases,
  listRepoTree,
  listRootContents,
  parseRepoSlug,
  searchHackerNews
} from '../../../lib/github';
import { formatAnalyzeMarkdown, formatHnLinks, stringifyJson } from '../../../lib/format';
import { RadarConfigSchema } from '../../../lib/schemas';

export const InputType = RadarConfigSchema.and(
  z.object({
    project: z.string().min(1).max(500),
    includeCommunityReview: z.coerce.boolean().default(true)
  })
);

export const OutputType = z.object({
  brief_markdown: z.string(),
  repo_json: z.string(),
  metrics_json: z.string(),
  root_structure_json: z.string(),
  architecture_json: z.string(),
  recent_updates_json: z.string(),
  community_review_markdown: z.string(),
  source_links: z.string(),
  system_error: z.string().optional()
});

type In = z.infer<typeof InputType>;
type Out = z.infer<typeof OutputType>;

export async function tool(props: In): Promise<Out> {
  try {
    const input = InputType.parse(props);
    const slug = parseRepoSlug(input.project);
    const [repo, readme, contents, commits, releases, contributors, languages, hnHits] =
      await Promise.all([
        getRepo(input, slug),
        getReadme(input, slug).catch(() => ''),
        listRootContents(input, slug).catch(() => []),
        listRecentCommits(input, slug, 20).catch(() => []),
        listRecentReleases(input, slug, 3).catch(() => []),
        listContributors(input, slug, 10).catch(() => []),
        getLanguages(input, slug).catch(() => ({})),
        input.includeCommunityReview
          ? searchHackerNews(input, slug, 5).catch(() => [])
          : Promise.resolve([])
      ]);
    const repoTree = await listRepoTree(input, slug, repo.default_branch).catch(() => ({
      truncated: false,
      tree: []
    }));
    const candidateFiles = [
      'package.json',
      'pyproject.toml',
      'requirements.txt',
      'Dockerfile',
      'docker-compose.yml',
      'README.md'
    ].filter((path) => repoTree.tree.some((item) => item.path === path));
    const sampledFileEntries = await Promise.all(
      candidateFiles
        .slice(0, 8)
        .map(async (path) => [path, await getTextFile(input, slug, path).catch(() => '')] as const)
    );
    const sampledFiles = Object.fromEntries(sampledFileEntries.filter(([, text]) => text));

    const community = hnHits.length
      ? formatHnLinks(hnHits)
      : '未在 Hacker News 中找到明显讨论；可后续接入更广泛的搜索源。';
    const updates = { commits, releases };
    const metrics = {
      contributors,
      languages,
      treeTruncated: repoTree.truncated,
      treeSize: repoTree.tree.length
    };
    const architecture = {
      topLevel: contents,
      importantPaths: repoTree.tree
        .map((item) => item.path)
        .filter((path) =>
          /(^|\/)(src|packages?|apps?|docs?|examples?|tests?|agent|workflow|tools?|api|server)(\/|$)/i.test(
            path
          )
        )
        .slice(0, 120),
      sampledFiles: Object.keys(sampledFiles)
    };
    const sourceLinks = [repo.html_url, formatHnLinks(hnHits)].filter(Boolean).join('\n');

    return {
      brief_markdown: formatAnalyzeMarkdown({
        repo,
        readme,
        contents,
        tree: repoTree.tree,
        treeTruncated: repoTree.truncated,
        languages,
        contributors,
        commits,
        releases,
        hnHits,
        sampledFiles
      }),
      repo_json: stringifyJson(repo),
      metrics_json: stringifyJson(metrics),
      root_structure_json: stringifyJson(contents),
      architecture_json: stringifyJson(architecture),
      recent_updates_json: stringifyJson(updates),
      community_review_markdown: community,
      source_links: sourceLinks
    };
  } catch (e: unknown) {
    return {
      brief_markdown: '',
      repo_json: '{}',
      metrics_json: '{}',
      root_structure_json: '[]',
      architecture_json: '{}',
      recent_updates_json: '{}',
      community_review_markdown: '',
      source_links: '',
      system_error: getErrText(e)
    };
  }
}
