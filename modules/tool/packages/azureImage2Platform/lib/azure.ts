import { z } from 'zod';

/** 固定 api-version，不再在界面配置 */
export const DEFAULT_API_VERSION = '2025-04-01-preview';

/** 仅三项：终结点、部署、密钥（普通输入框） */
export const AzureResourceSchema = z.object({
  azureOpenAiEndpoint: z.string().min(1),
  azureOpenAiDeployment: z.string().min(1),
  azureOpenAiApiKey: z.string().min(1)
});

export type AzureResource = z.infer<typeof AzureResourceSchema>;

export function normalizeEndpoint(raw: string): string {
  let u = raw.trim().replace(/\/+$/, '');
  const lower = u.toLowerCase();
  const idx = lower.indexOf('/openai');
  if (idx !== -1) {
    u = u.slice(0, idx);
  }
  return u.replace(/\/+$/, '');
}

export function buildJsonHeaders(apiKey: string): Record<string, string> {
  return {
    'Content-Type': 'application/json',
    'api-key': apiKey.trim()
  };
}

export function buildMultipartHeaders(apiKey: string): Record<string, string> {
  return {
    'api-key': apiKey.trim()
  };
}

export function formatHttpError(status: number, body: unknown): string {
  if (body && typeof body === 'object') {
    const o = body as Record<string, unknown>;
    const err = o.error;
    if (err && typeof err === 'object') {
      const e = err as Record<string, unknown>;
      const msg = [e.message, e.code, e.type].filter(Boolean).join(' | ');
      if (msg) return `Azure GPT-Image 请求失败 HTTP ${status}: ${msg}`;
    }
    try {
      return `Azure GPT-Image 请求失败 HTTP ${status}: ${JSON.stringify(body)}`;
    } catch {
      return `Azure GPT-Image 请求失败 HTTP ${status}`;
    }
  }
  return `Azure GPT-Image 请求失败 HTTP ${status}`;
}
