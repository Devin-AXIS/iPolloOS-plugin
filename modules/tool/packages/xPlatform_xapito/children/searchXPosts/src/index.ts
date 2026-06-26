import { getErrText } from '@tool/utils/err';
import { z } from 'zod';
import { searchPosts } from '../../../lib/client';
import {
  formatPostsMarkdown,
  formatSourceLinksFromPosts,
  stringifyJson
} from '../../../lib/format';
import { XReadConfigSchema, XSearchScopeSchema, XSearchViewSchema } from '../../../lib/schemas';

export const InputType = XReadConfigSchema.and(
  z.object({
    query: z.string().trim().min(1, 'query is required').max(4096),
    view: XSearchViewSchema.default('latest'),
    scope: XSearchScopeSchema.default('recent')
  })
);

export const OutputType = z.object({
  answer_markdown: z.string(),
  posts_json: z.string(),
  source_links: z.string(),
  result_count: z.number(),
  system_error: z.string().optional()
});

type In = z.infer<typeof InputType>;
type Out = z.infer<typeof OutputType>;

const titleMap: Record<string, string> = {
  latest: 'X 最新内容',
  relevant: 'X 相关内容',
  hot: 'X 高互动内容'
};

function emptyOutput(systemError?: string): Out {
  return {
    answer_markdown: '',
    posts_json: '[]',
    source_links: '',
    result_count: 0,
    system_error: systemError
  };
}

export async function tool(props: In): Promise<Out> {
  try {
    const input = InputType.parse(props);
    const data = await searchPosts(input, {
      query: input.query,
      scope: input.scope,
      view: input.view,
      maxResults: 10
    });

    return {
      answer_markdown: formatPostsMarkdown(`${titleMap[input.view]}：${input.query}`, data),
      posts_json: stringifyJson(data.data),
      source_links: formatSourceLinksFromPosts(data),
      result_count: data.data.length
    };
  } catch (e: unknown) {
    return emptyOutput(getErrText(e));
  }
}
