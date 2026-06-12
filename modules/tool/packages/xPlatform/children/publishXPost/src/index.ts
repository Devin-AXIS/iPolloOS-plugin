import { getErrText } from '@tool/utils/err';
import { z } from 'zod';
import { createPost } from '../../../lib/client';
import { stringifyJson } from '../../../lib/format';
import { XActionConfigSchema } from '../../../lib/schemas';

const emptyToUndefined = (value: unknown) =>
  value === '' || value === null || value === undefined ? undefined : value;

export const InputType = XActionConfigSchema.and(
  z.object({
    text: z.string().trim().min(1, 'text is required').max(280),
    quote_post_id: z.preprocess(emptyToUndefined, z.string().max(40).optional()),
    media_ids: z.preprocess(emptyToUndefined, z.string().max(2048).optional())
  })
);

export const OutputType = z.object({
  success: z.boolean(),
  post_id: z.string(),
  post_url: z.string(),
  summary: z.string(),
  result_json: z.string(),
  system_error: z.string().optional()
});

type In = z.infer<typeof InputType>;
type Out = z.infer<typeof OutputType>;

function parseMediaIds(value?: string): string[] {
  return (value ?? '')
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);
}

function emptyOutput(systemError?: string): Out {
  return {
    success: false,
    post_id: '',
    post_url: '',
    summary: '',
    result_json: '{}',
    system_error: systemError
  };
}

export async function tool(props: In): Promise<Out> {
  try {
    const input = InputType.parse(props);
    const result = await createPost(input, {
      text: input.text,
      quotePostId: input.quote_post_id,
      mediaIds: parseMediaIds(input.media_ids)
    });
    const postId = String(result.data?.id ?? '');

    return {
      success: true,
      post_id: postId,
      post_url: postId ? `https://x.com/i/web/status/${postId}` : '',
      summary: postId ? `X 内容已发布：${postId}` : 'X 内容已发布',
      result_json: stringifyJson(result)
    };
  } catch (e: unknown) {
    return emptyOutput(getErrText(e));
  }
}
