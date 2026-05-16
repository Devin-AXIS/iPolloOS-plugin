/** Minimal OpenAI-compatible chat.completions JSON (Ark). */
export type ParsedChatCompletion = {
  reply: string;
  finish_reason: string;
  usage_json: string;
};

export function parseChatCompletionBody(data: unknown): ParsedChatCompletion {
  if (!data || typeof data !== 'object') {
    return { reply: '', finish_reason: '', usage_json: '{}' };
  }
  const d = data as Record<string, unknown>;
  const choices = d.choices;
  let reply = '';
  let finish_reason = '';
  if (Array.isArray(choices) && choices[0] && typeof choices[0] === 'object') {
    const c0 = choices[0] as Record<string, unknown>;
    finish_reason = typeof c0.finish_reason === 'string' ? c0.finish_reason : '';
    const msg = c0.message;
    if (msg && typeof msg === 'object') {
      const content = (msg as Record<string, unknown>).content;
      if (typeof content === 'string') {
        reply = content;
      } else if (Array.isArray(content)) {
        reply = content
          .map((part) => {
            if (!part || typeof part !== 'object') return '';
            const p = part as Record<string, unknown>;
            if (p.type === 'text' && typeof p.text === 'string') return p.text;
            return '';
          })
          .join('');
      }
    }
  }
  const usage = d.usage && typeof d.usage === 'object' ? d.usage : {};
  return {
    reply,
    finish_reason,
    usage_json: JSON.stringify(usage)
  };
}

export function normalizeArkBaseUrl(raw: string): string {
  const u = raw.trim().replace(/\/+$/, '');
  return u || 'https://ark.cn-beijing.volces.com/api/v3';
}
