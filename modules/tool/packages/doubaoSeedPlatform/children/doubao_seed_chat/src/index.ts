import { getErrText } from '@tool/utils/err';
import { z } from 'zod';
import { ArkAuthFields } from '../../../lib/arkAuth';
import { normalizeArkBaseUrl, parseChatCompletionBody } from '../../../lib/parseChatCompletion';

const empty = (v: unknown) => (v === '' || v === null || v === undefined ? undefined : v);

export const InputType = ArkAuthFields.and(
  z.object({
    user_message: z.string().min(1).max(500_000),
    extra_note: z.preprocess(empty, z.string().max(200_000).optional()).default('')
  })
);

export const OutputType = z.object({
  reply: z.string(),
  finish_reason: z.string(),
  usage_json: z.string(),
  system_error: z.string().optional()
});

type In = z.infer<typeof InputType>;
type Out = z.infer<typeof OutputType>;

export async function tool(props: In): Promise<Out> {
  try {
    const inp = InputType.parse(props);
    const base = normalizeArkBaseUrl(inp.ark_base_url ?? '');
    const url = `${base}/chat/completions`;

    const messages: { role: string; content: string }[] = [];
    const note = String(inp.extra_note ?? '').trim();
    if (note) {
      messages.push({ role: 'system', content: note });
    }
    messages.push({ role: 'user', content: inp.user_message });

    const body: Record<string, unknown> = {
      model: inp.chat_model_ep.trim(),
      messages,
      temperature: 0.7,
      stream: false
    };

    const res = await fetch(url, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${inp.ark_api_key.trim()}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(body)
    });

    const text = await res.text();
    let data: unknown = null;
    try {
      data = text ? JSON.parse(text) : null;
    } catch {
      data = null;
    }

    if (!res.ok) {
      const errMsg =
        data && typeof data === 'object' && 'error' in (data as object)
          ? JSON.stringify((data as { error?: unknown }).error)
          : text.slice(0, 2000);
      return {
        reply: '',
        finish_reason: '',
        usage_json: '{}',
        system_error: `HTTP ${res.status}: ${errMsg}`
      };
    }

    const parsed = parseChatCompletionBody(data);
    return {
      reply: parsed.reply,
      finish_reason: parsed.finish_reason,
      usage_json: parsed.usage_json
    };
  } catch (e: unknown) {
    return {
      reply: '',
      finish_reason: '',
      usage_json: '{}',
      system_error: getErrText(e)
    };
  }
}
