/** Manus TaskAttachment + message payloads: https://open.manus.ai/docs/v2/task.listMessages */

export type ManusAttachmentRef = {
  url: string;
  type: string;
  filename: string;
  content_type: string;
  source: string;
};

const IMAGE_EXT = /\.(png|jpe?g|gif|webp|svg)(\?|$)/i;
const VIDEO_EXT = /\.(mp4|webm|mov|m4v)(\?|$)/i;

const URL_IN_TEXT =
  /https?:\/\/[^\s"'<>[\]()]+?(?:\.(?:png|jpe?g|gif|webp|svg|pdf|mp4|webm|mov|m4v|zip)|\/[^\s"'<>[\]()]*?\.(?:png|jpe?g|gif|webp|pdf|mp4|webm))(?:\?[^\s"'<>[\]()]*)?/gi;

function guessKind(url: string, declaredType: string, contentType: string): string {
  const ct = contentType.toLowerCase();
  if (declaredType === 'image' || ct.startsWith('image/')) return 'image';
  if (declaredType === 'voice' || ct.startsWith('audio/')) return 'voice';
  if (declaredType === 'slides') return 'slides';
  const u = url.toLowerCase();
  if (VIDEO_EXT.test(u) || ct.startsWith('video/')) return 'video';
  if (IMAGE_EXT.test(u)) return 'image';
  if (declaredType === 'file' || declaredType) return declaredType || 'file';
  return 'file';
}

function tryAdd(
  seen: Set<string>,
  list: ManusAttachmentRef[],
  o: Record<string, unknown>,
  source: string
): void {
  const url = typeof o.url === 'string' ? o.url.trim() : '';
  if (!url.startsWith('http')) return;
  if (seen.has(url)) return;
  seen.add(url);
  const type = typeof o.type === 'string' ? o.type : 'file';
  const filename = typeof o.filename === 'string' ? o.filename : '';
  const content_type = typeof o.content_type === 'string' ? o.content_type : '';
  list.push({
    url,
    type: guessKind(url, type, content_type),
    filename,
    content_type,
    source
  });
}

function collectFromAttachmentsArray(
  seen: Set<string>,
  list: ManusAttachmentRef[],
  attachments: unknown,
  source: string
): void {
  if (!Array.isArray(attachments)) return;
  for (const att of attachments) {
    if (att && typeof att === 'object') tryAdd(seen, list, att as Record<string, unknown>, source);
  }
}

function collectFromMessagePayload(
  seen: Set<string>,
  list: ManusAttachmentRef[],
  msg: unknown,
  source: string
): void {
  if (!msg || typeof msg !== 'object') return;
  const m = msg as Record<string, unknown>;
  collectFromAttachmentsArray(seen, list, m.attachments, source);
}

function collectUrlsFromText(
  seen: Set<string>,
  list: ManusAttachmentRef[],
  text: string,
  source: string
): void {
  if (!text || text.length > 2_000_000) return;
  URL_IN_TEXT.lastIndex = 0;
  let m: RegExpExecArray | null;
  while ((m = URL_IN_TEXT.exec(text)) !== null) {
    let u = m[0].replace(/[),.;:]+$/g, '');
    if (u.length > 4096) u = u.slice(0, 4096);
    if (!u.startsWith('http') || seen.has(u)) continue;
    seen.add(u);
    const kind = guessKind(u, '', '');
    list.push({ url: u, type: kind, filename: '', content_type: '', source });
  }
}

/**
 * Parse task.listMessages JSON body (already parsed object).
 * Structured attachments first; then heuristic URLs in assistant text / tool summaries (verbose).
 */
export function extractAttachmentsFromListMessagesResponse(
  res: Record<string, unknown>,
  opts?: { heuristicTextUrls?: boolean }
): ManusAttachmentRef[] {
  const heuristic = opts?.heuristicTextUrls !== false;
  const seen = new Set<string>();
  const list: ManusAttachmentRef[] = [];

  const messages = res.messages;
  if (!Array.isArray(messages)) return list;

  for (const ev of messages) {
    if (!ev || typeof ev !== 'object') continue;
    const e = ev as Record<string, unknown>;

    collectFromMessagePayload(seen, list, e.user_message, 'user_message');
    collectFromMessagePayload(seen, list, e.userMessage, 'userMessage');
    collectFromMessagePayload(seen, list, e.assistant_message, 'assistant_message');
    collectFromMessagePayload(seen, list, e.assistantMessage, 'assistantMessage');

    if (heuristic) {
      const am = (e.assistant_message ?? e.assistantMessage) as Record<string, unknown> | undefined;
      if (am && typeof am.content === 'string')
        collectUrlsFromText(seen, list, am.content, 'assistant_message.content');

      const tu = e.tool_used ?? e.toolUsed;
      if (tu && typeof tu === 'object') {
        const t = tu as Record<string, unknown>;
        for (const k of ['brief', 'description']) {
          const v = t[k];
          if (typeof v === 'string') collectUrlsFromText(seen, list, v, `tool_used.${k}`);
        }
        const inner = t.message;
        if (inner && typeof inner === 'object') {
          const param = (inner as Record<string, unknown>).param;
          if (typeof param === 'string')
            collectUrlsFromText(seen, list, param, 'tool_used.message.param');
        }
      }
    }
  }

  return list;
}

export function attachmentsToReplyMarkdown(refs: ManusAttachmentRef[], max = 30): string {
  const lines: string[] = [];
  for (const r of refs.slice(0, max)) {
    const label = (r.filename || 'attachment').replace(/\[|\]/g, '').slice(0, 200);
    if (r.type === 'image') {
      lines.push(`![${label}](${r.url})`);
    } else if (r.type === 'video') {
      lines.push(`[${label || 'video'}](${r.url})`);
    } else {
      lines.push(`[${label || r.type}](${r.url})`);
    }
  }
  if (refs.length > max) {
    lines.push('');
    lines.push(
      `_…共 ${refs.length} 个附件，此处仅展示前 ${max} 个；完整列表见 attachments_json。_`
    );
  }
  return lines.join('\n\n');
}
