import { z } from 'zod';

const DEFAULT_APP_KEY =
  'fast' + 'gpt-zcsl6cVKscTHsUnPw6BdRAKlkFaXe6vRkmzA9exQwymd9eSP37JVoNwGO8NSvt9V';
const DEFAULT_APP_URL = 'http://ai.wemoai.com/api';

const emptyToDefault = (value: unknown, defaultValue: string) => {
  const text = typeof value === 'string' ? value.trim() : '';
  return text || defaultValue;
};

export const AiAppFields = z.object({
  ai_app_key: z.preprocess(
    (value) => emptyToDefault(value, DEFAULT_APP_KEY),
    z.string().min(1).max(4096)
  ),
  ai_app_url: z.preprocess(
    (value) => emptyToDefault(value, DEFAULT_APP_URL),
    z.string().url().max(2048)
  )
});

export type AiAppAuth = z.infer<typeof AiAppFields>;

export function resolveChatCompletionsUrl(rawUrl: string): string {
  const url = new URL(rawUrl.trim());
  const cleanPath = url.pathname.replace(/\/+$/, '');
  if (/\/(api\/)?v\d+\/chat\/completions$/.test(cleanPath)) {
    url.pathname = cleanPath;
    return url.toString();
  }
  if (cleanPath === '/api') {
    url.pathname = '/api/v1/chat/completions';
    return url.toString();
  }
  url.pathname = `${cleanPath}/api/v1/chat/completions`.replace(/\/{2,}/g, '/');
  return url.toString();
}

export function parseChatContent(data: unknown): string {
  const fromValue = (value: unknown): string => {
    if (typeof value === 'string') return value;
    if (Array.isArray(value)) {
      return value
        .map((part) => {
          if (typeof part === 'string') return part;
          if (!part || typeof part !== 'object') return '';
          const record = part as Record<string, unknown>;
          if (typeof record.text === 'string') return record.text;
          if (record.text && typeof record.text === 'object') {
            const text = record.text as Record<string, unknown>;
            if (typeof text.content === 'string') return text.content;
          }
          if (typeof record.content === 'string') return record.content;
          if (typeof record.page_html === 'string') return record.page_html;
          if (typeof record.full_html === 'string') return record.full_html;
          return '';
        })
        .filter(Boolean)
        .join('\n');
    }
    if (value && typeof value === 'object') {
      const record = value as Record<string, unknown>;
      for (const key of [
        'page_html',
        'full_html',
        'answer',
        'answerText',
        'text',
        'content',
        'output',
        'message',
        'pluginOutput',
        'pluginData',
        'result'
      ]) {
        const nested = fromValue(record[key]);
        if (nested.trim()) return nested;
      }
    }
    return '';
  };

  const direct = fromValue(data);
  if (direct.trim()) return direct;

  if (data && typeof data === 'object') {
    const record = data as Record<string, unknown>;
    const choices = record.choices;
    if (Array.isArray(choices) && choices[0] && typeof choices[0] === 'object') {
      const choice = choices[0] as Record<string, unknown>;
      const fromMessage = fromValue(choice.message);
      if (fromMessage.trim()) return fromMessage;
      const fromDelta = fromValue(choice.delta);
      if (fromDelta.trim()) return fromDelta;
      const fromText = fromValue(choice.text);
      if (fromText.trim()) return fromText;
    }

    const responseData = record.responseData;
    if (Array.isArray(responseData)) {
      for (let i = responseData.length - 1; i >= 0; i -= 1) {
        const itemText = fromValue(responseData[i]);
        if (itemText.trim()) return itemText;
      }
    }
  }

  return '';
}

function summarizeRawResponse(data: unknown, text: string): string {
  const raw = text || JSON.stringify(data ?? null);
  return raw.replace(/\s+/g, ' ').slice(0, 800);
}

function extractAppError(data: unknown): string {
  if (!data || typeof data !== 'object') return '';
  const record = data as Record<string, unknown>;
  for (const key of ['error', 'errorText', 'message']) {
    if (typeof record[key] === 'string' && record[key]) return String(record[key]);
  }
  const responseData = record.responseData;
  if (Array.isArray(responseData)) {
    for (let i = responseData.length - 1; i >= 0; i -= 1) {
      const item = responseData[i];
      if (!item || typeof item !== 'object') continue;
      const itemRecord = item as Record<string, unknown>;
      for (const key of ['error', 'errorText', 'message']) {
        if (typeof itemRecord[key] === 'string' && itemRecord[key]) {
          const moduleName =
            typeof itemRecord.moduleName === 'string' ? `${itemRecord.moduleName}: ` : '';
          return `${moduleName}${itemRecord[key]}`;
        }
      }
    }
  }
  return '';
}

export async function callAiApp(props: {
  auth: AiAppAuth;
  prompt: string;
  chatId: string;
  variables?: Record<string, unknown>;
}): Promise<string> {
  const url = resolveChatCompletionsUrl(props.auth.ai_app_url);

  const request = async (body: Record<string, unknown>) => {
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${props.auth.ai_app_key.trim()}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(body)
    });

    const text = await res.text();
    const data = (() => {
      try {
        return text ? JSON.parse(text) : null;
      } catch {
        return null;
      }
    })();

    if (!res.ok) {
      const errorText =
        data && typeof data === 'object' && 'error' in data ? JSON.stringify(data.error) : text;
      throw new Error(`AI app HTTP ${res.status}: ${errorText.slice(0, 2000)}`);
    }

    return { data, text, content: parseChatContent(data), appError: extractAppError(data) };
  };

  const variables = {
    query: props.prompt,
    prompt: props.prompt,
    ...(props.variables ?? {})
  };

  const chatBody: Record<string, unknown> = {
    stream: false,
    detail: true,
    chatId: props.chatId,
    responseChatItemId: `${props.chatId}-response`,
    variables,
    messages: [{ role: 'user', content: props.prompt }]
  };

  const first = await request(chatBody);
  if (first.content.trim()) {
    return first.content;
  }
  if (first.appError) {
    throw new Error(`AI app error: ${first.appError}`);
  }

  const pluginBody: Record<string, unknown> = {
    stream: false,
    detail: true,
    variables,
    messages: [{ role: 'user', content: props.prompt }]
  };
  const second = await request(pluginBody);
  if (second.content.trim()) {
    return second.content;
  }
  if (second.appError) {
    throw new Error(`AI app error: ${second.appError}`);
  }

  throw new Error(
    `AI app returned empty content. Raw response: ${summarizeRawResponse(second.data, second.text) || summarizeRawResponse(first.data, first.text)}`
  );
}
