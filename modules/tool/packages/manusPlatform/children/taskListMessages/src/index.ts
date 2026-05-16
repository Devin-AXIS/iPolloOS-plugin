import { z } from 'zod';
import { buildQuery, manusGet, normalizeBaseUrl } from '../../../lib/client';
import {
  attachmentsToReplyMarkdown,
  extractAttachmentsFromListMessagesResponse
} from '../../../lib/extractManusAttachments';
import { safeDetailJson } from '../../../lib/format';

function parseLimit(v: unknown): number | undefined {
  if (v === undefined || v === null || v === '') return undefined;
  const n =
    typeof v === 'number' && Number.isFinite(v) ? v : Number(String(v).trim().replace(/,/g, ''));
  if (!Number.isFinite(n) || n < 1) return undefined;
  return Math.min(Math.floor(n), 200);
}

function parseOptBool(v: unknown): boolean | undefined {
  if (v === undefined || v === null || v === '') return undefined;
  if (typeof v === 'boolean') return v;
  if (typeof v === 'number') return v !== 0;
  if (typeof v === 'string') {
    const s = v.trim().toLowerCase();
    if (['true', '1', 'yes', 'on'].includes(s)) return true;
    if (['false', '0', 'no', 'off'].includes(s)) return false;
  }
  return undefined;
}

export const InputType = z.object({
  manusApiKey: z.string().min(1),
  baseUrl: z.string().optional(),
  taskId: z.string().min(1),
  limit: z.unknown().optional().transform(parseLimit),
  cursor: z.string().optional(),
  order: z.enum(['asc', 'desc']).optional(),
  verbose: z.unknown().optional().transform(parseOptBool),
  slidesFormat: z
    .string()
    .optional()
    .transform((v) => (v === '' ? undefined : v)),
  includeHeuristicUrls: z.unknown().optional().transform(parseOptBool)
});

export const OutputType = z.object({
  summary: z.string(),
  attachment_count: z.number(),
  attachments_json: z.string(),
  reply_markdown: z.string(),
  detail_json: z.string(),
  system_error: z.string().optional()
});

type In = z.infer<typeof InputType>;
type Out = z.infer<typeof OutputType>;

export async function tool(props: In): Promise<Out> {
  normalizeBaseUrl(props.baseUrl);
  try {
    const q = buildQuery({
      task_id: props.taskId,
      limit: props.limit,
      cursor: props.cursor,
      order: props.order,
      verbose: props.verbose,
      slides_format: props.slidesFormat
    });

    const res = await manusGet<Record<string, unknown>>(
      props.manusApiKey,
      props.baseUrl ?? '',
      `/v2/task.listMessages${q}`
    );
    const messages = Array.isArray(res.messages) ? res.messages : [];
    const hasMore = res.has_more === true;

    const refs = extractAttachmentsFromListMessagesResponse(res, {
      heuristicTextUrls: props.includeHeuristicUrls !== false
    });
    const replyMarkdown = attachmentsToReplyMarkdown(refs);
    let attachmentsJson: string;
    try {
      attachmentsJson = JSON.stringify(refs);
    } catch {
      attachmentsJson = '[]';
    }

    return {
      summary: `Fetched ${messages.length} messages for ${props.taskId}. has_more=${hasMore}. attachments=${refs.length}${replyMarkdown ? ' (paste reply_markdown to user for images/links)' : ''}`,
      attachment_count: refs.length,
      attachments_json: attachmentsJson,
      reply_markdown: replyMarkdown,
      detail_json: safeDetailJson(res, 80_000)
    };
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    return {
      summary: '',
      attachment_count: 0,
      attachments_json: '[]',
      reply_markdown: '',
      detail_json: 'null',
      system_error: msg
    };
  }
}
