import { z } from 'zod';

const emptyToUndef = (value: unknown) => {
  const text = typeof value === 'string' ? value.trim() : '';
  return text || undefined;
};

function optionalJson(label: string) {
  return z.preprocess(emptyToUndef, z.string().optional()).transform((value, ctx) => {
    if (!value) return undefined;
    try {
      return JSON.parse(value) as Record<string, unknown>;
    } catch {
      ctx.addIssue({
        code: 'custom',
        message: `${label} 必须是合法 JSON`
      });
      return z.NEVER;
    }
  });
}

export const InputType = z
  .object({
    renderEndpointUrl: z.preprocess(emptyToUndef, z.string().url().optional()),
    renderApiToken: z.preprocess(emptyToUndef, z.string().optional()),
    renderAuthHeaderName: z
      .preprocess(emptyToUndef, z.string().optional())
      .default('X-Render-Token'),
    action: z.enum(['submit', 'status', 'cancel']).default('submit'),
    page_url: z.preprocess(emptyToUndef, z.string().url().optional()),
    html: z.preprocess(emptyToUndef, z.string().max(2_000_000).optional()),
    manifest_json: optionalJson('manifest_json'),
    job_id: z.preprocess(emptyToUndef, z.string().optional()),
    extra_payload: optionalJson('extra_payload')
  })
  .superRefine((value, ctx) => {
    if (value.action !== 'submit' && !value.job_id) {
      ctx.addIssue({
        code: 'custom',
        path: ['job_id'],
        message: 'status/cancel 操作必须填写 job_id'
      });
    }

    if (value.action !== 'submit') return;

    if (!value.page_url && !value.html && !value.manifest_json) {
      ctx.addIssue({
        code: 'custom',
        path: ['page_url'],
        message: '提交渲染任务必须提供 page_url、html 或 manifest_json'
      });
    }
  });

export const OutputType = z.object({
  job_id: z.string().optional(),
  status: z.string(),
  video_url: z.string().optional(),
  poster_url: z.string().optional(),
  logs_url: z.string().optional(),
  summary: z.string(),
  raw_response: z.string(),
  system_error: z.string().optional()
});

type In = z.infer<typeof InputType>;
type Out = z.infer<typeof OutputType>;

type RenderServiceResponse = {
  job_id?: unknown;
  jobId?: unknown;
  id?: unknown;
  status?: unknown;
  state?: unknown;
  video_url?: unknown;
  videoUrl?: unknown;
  output_url?: unknown;
  poster_url?: unknown;
  posterUrl?: unknown;
  logs_url?: unknown;
  logsUrl?: unknown;
  message?: unknown;
};

export function buildRenderRequest(input: In) {
  return {
    action: input.action,
    job_id: input.job_id,
    source: {
      page_url: input.page_url,
      html: input.html
    },
    manifest: input.manifest_json ?? {},
    extra: input.extra_payload ?? {}
  };
}

function readEnv(...keys: string[]) {
  for (const key of keys) {
    const value = process.env[key]?.trim();
    if (value) return value;
  }
  return undefined;
}

function textValue(...values: unknown[]): string | undefined {
  for (const value of values) {
    if (typeof value === 'string' && value.trim()) return value.trim();
  }
  return undefined;
}

function summarize(action: In['action'], status: string, jobId?: string, videoUrl?: string) {
  if (action === 'submit') {
    return jobId
      ? `已提交 HyperFrames 渲染任务，任务 ID: ${jobId}，当前状态: ${status}。`
      : `已提交 HyperFrames 渲染任务，当前状态: ${status}。`;
  }
  if (action === 'cancel') {
    return `已请求取消渲染任务${jobId ? ` ${jobId}` : ''}，当前状态: ${status}。`;
  }
  return videoUrl
    ? `渲染任务${jobId ? ` ${jobId}` : ''}已完成，视频链接已返回。`
    : `渲染任务${jobId ? ` ${jobId}` : ''}当前状态: ${status}。`;
}

export async function tool(props: In): Promise<Out> {
  const input = InputType.parse(props);
  const renderEndpointUrl =
    input.renderEndpointUrl || readEnv('HYPERFRAMES_RENDER_ENDPOINT_URL', 'RENDER_ENDPOINT_URL');
  const renderApiToken =
    input.renderApiToken || readEnv('HYPERFRAMES_RENDER_API_TOKEN', 'RENDER_API_TOKEN');
  const renderAuthHeaderName =
    input.renderAuthHeaderName ||
    readEnv('HYPERFRAMES_RENDER_AUTH_HEADER_NAME', 'RENDER_AUTH_HEADER_NAME') ||
    'X-Render-Token';

  if (!renderEndpointUrl) {
    return {
      status: 'error',
      summary: 'HyperFrames 渲染服务未配置。',
      raw_response: '',
      system_error:
        'HyperFrames 渲染服务未配置：请在系统密钥中填写函数计算渲染入口 URL，或配置 HYPERFRAMES_RENDER_ENDPOINT_URL。'
    };
  }

  const body = buildRenderRequest(input);
  const headers: Record<string, string> = {
    'Content-Type': 'application/json'
  };

  if (renderApiToken) {
    headers[renderAuthHeaderName] = renderApiToken;
  }

  const response = await fetch(renderEndpointUrl, {
    method: 'POST',
    headers,
    body: JSON.stringify(body)
  });

  const responseText = await response.text();
  if (!response.ok) {
    return {
      status: 'error',
      summary: `渲染服务请求失败: HTTP ${response.status}`,
      raw_response: responseText,
      system_error: responseText || `HTTP ${response.status}`
    };
  }

  let data: RenderServiceResponse;
  try {
    data = JSON.parse(responseText) as RenderServiceResponse;
  } catch {
    return {
      status: 'error',
      summary: '渲染服务返回的不是 JSON',
      raw_response: responseText,
      system_error: 'Invalid render service JSON response'
    };
  }

  const jobId = textValue(data.job_id, data.jobId, data.id, input.job_id);
  const status = textValue(data.status, data.state) || 'submitted';
  const videoUrl = textValue(data.video_url, data.videoUrl, data.output_url);
  const posterUrl = textValue(data.poster_url, data.posterUrl);
  const logsUrl = textValue(data.logs_url, data.logsUrl);

  return {
    job_id: jobId,
    status,
    video_url: videoUrl,
    poster_url: posterUrl,
    logs_url: logsUrl,
    summary: summarize(input.action, status, jobId, videoUrl),
    raw_response: responseText
  };
}
