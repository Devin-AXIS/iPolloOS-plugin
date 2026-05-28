import { z } from 'zod';
import { isCompleteHtmlDocument } from './html';

const DEFAULT_APP_KEY = process.env.HTML_ANYTHING_AI_APP_KEY || '';
const DEFAULT_APP_URL =
  process.env.HTML_ANYTHING_AI_APP_URL ||
  process.env.FASTGPT_BASE_URL ||
  process.env.IPOLLOOS_BASE_URL ||
  '';

const emptyToDefault = (value: unknown, defaultValue: string) => {
  const text = typeof value === 'string' ? value.trim() : '';
  return text || defaultValue;
};

const normalizeLegacyAiAppAuth = (value: unknown) => {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return value;
  const record = value as Record<string, unknown>;
  const aiAppUrl = typeof record.ai_app_url === 'string' ? record.ai_app_url.trim() : '';
  if (!/^https?:\/\/ai\.wemoai\.com(?:\/|$)/i.test(aiAppUrl)) return value;
  return {
    ...record,
    ai_app_url: '',
    ai_app_key: ''
  };
};

const looksLikeHtmlDocument = (value: string) => isCompleteHtmlDocument(value);

export const AiAppFields = z.preprocess(
  normalizeLegacyAiAppAuth,
  z.object({
    ai_app_key: z.preprocess(
      (value) => emptyToDefault(value, DEFAULT_APP_KEY),
      z
        .string()
        .min(1, '未配置 HTML Anything 上游 AI 应用 Key，请设置 HTML_ANYTHING_AI_APP_KEY')
        .max(4096)
    ),
    ai_app_url: z.preprocess(
      (value) => emptyToDefault(value, DEFAULT_APP_URL),
      z
        .string()
        .url(
          '未配置 HTML Anything 上游 AI 应用地址，请设置 HTML_ANYTHING_AI_APP_URL、FASTGPT_BASE_URL 或 IPOLLOOS_BASE_URL'
        )
        .max(2048)
    )
  })
);

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

function readText(value: unknown): string {
  if (typeof value === 'string') return value;
  if (Array.isArray(value)) {
    return value
      .map((item) => {
        if (typeof item === 'string') return item;
        if (!item || typeof item !== 'object') return '';
        const record = item as Record<string, unknown>;
        if (typeof record.text === 'string') return record.text;
        if (record.text && typeof record.text === 'object') {
          const text = record.text as Record<string, unknown>;
          if (typeof text.content === 'string') return text.content;
        }
        if (typeof record.content === 'string') return record.content;
        if (typeof record.page_html === 'string') return record.page_html;
        if (typeof record.full_html === 'string') return record.full_html;
        const toolResult = readText(record.toolRes);
        if (toolResult.trim()) return toolResult;
        const responseData = readText(record.responseData);
        if (responseData.trim()) return responseData;
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
      'toolRes',
      'responseData',
      'result'
    ]) {
      const nested = readText(record[key]);
      if (nested.trim()) return nested;
    }
  }
  return '';
}

function readHtmlText(value: unknown): string {
  if (typeof value === 'string') return looksLikeHtmlDocument(value) ? value : '';
  if (Array.isArray(value)) {
    for (let i = value.length - 1; i >= 0; i -= 1) {
      const nested = readHtmlText(value[i]);
      if (nested.trim()) return nested;
    }
    return '';
  }
  if (value && typeof value === 'object') {
    const record = value as Record<string, unknown>;
    for (const key of ['page_html', 'full_html', 'html', 'output', 'toolRes', 'responseData']) {
      const nested = readHtmlText(record[key]);
      if (nested.trim()) return nested;
    }
    for (const nestedValue of Object.values(record)) {
      const nested = readHtmlText(nestedValue);
      if (nested.trim()) return nested;
    }
  }
  return '';
}

function parseChatContent(data: unknown): string {
  const html = readHtmlText(data);
  if (html.trim()) return html;

  const direct = readText(data);
  if (direct.trim()) return direct;

  if (!data || typeof data !== 'object') return '';
  const record = data as Record<string, unknown>;
  const choices = record.choices;
  if (!Array.isArray(choices) || !choices[0] || typeof choices[0] !== 'object') return '';

  const choice = choices[0] as Record<string, unknown>;
  return readText(choice.message) || readText(choice.delta) || readText(choice.text);
}

function summarizeRaw(data: unknown, text: string): string {
  return (text || JSON.stringify(data ?? null)).replace(/\s+/g, ' ').slice(0, 800);
}

export async function callAiApp(props: {
  auth: AiAppAuth;
  prompt: string;
  chatId: string;
  variables?: Record<string, unknown>;
}): Promise<string> {
  const url = resolveChatCompletionsUrl(props.auth.ai_app_url);
  const body = {
    stream: false,
    detail: true,
    chatId: props.chatId,
    responseChatItemId: `${props.chatId}-response`,
    variables: {
      query: props.prompt,
      prompt: props.prompt,
      ...(props.variables ?? {})
    },
    messages: [{ role: 'user', content: props.prompt }]
  };

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

  const content = parseChatContent(data);
  if (!content.trim()) {
    throw new Error(`AI app returned empty content. Raw response: ${summarizeRaw(data, text)}`);
  }

  return content;
}
