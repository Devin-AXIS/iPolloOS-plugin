import { z } from 'zod';

const emptyToUndef = (value: unknown) => {
  if (value !== '' && value !== null && value !== undefined && typeof value !== 'string') {
    return value;
  }
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
    storyboard_json: optionalJson('storyboard_json'),
    voiceover_script: z.preprocess(emptyToUndef, z.string().max(300_000).optional()),
    subtitle_srt: z.preprocess(emptyToUndef, z.string().max(300_000).optional()),
    asset_plan_json: optionalJson('asset_plan_json'),
    validation_report_json: optionalJson('validation_report_json'),
    job_id: z.preprocess(emptyToUndef, z.string().optional()),
    extra_payload: optionalJson('extra_payload'),
    performance_mode: z.enum(['auto', 'on', 'off']).default('auto'),
    target_fps: z.preprocess(emptyToUndef, z.coerce.number().int().min(12).max(60).optional()),
    segment_duration_seconds: z.preprocess(
      emptyToUndef,
      z.coerce.number().int().min(15).max(120).optional()
    ),
    disable_heavy_effects: z.enum(['auto', 'on', 'off']).default('auto'),
    diagnostics_level: z.enum(['basic', 'verbose']).default('verbose'),
    client_timeout_seconds: z.coerce.number().int().min(10).max(600).default(120)
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

    if (!value.manifest_json) {
      ctx.addIssue({
        code: 'custom',
        path: ['manifest_json'],
        message:
          '视频渲染必须提供生成视频工程节点输出的 manifest_json，不能只把 HTML 页面 URL 直接交给渲染器。'
      });
      return;
    }

    const durationSeconds = readManifestNumber(value.manifest_json, 'duration_seconds');
    if (!durationSeconds || durationSeconds <= 0) {
      ctx.addIssue({
        code: 'custom',
        path: ['manifest_json'],
        message: 'manifest_json 必须包含 duration_seconds，避免渲染器退回默认 8 秒录屏。'
      });
    }

    const manifestTimeline = value.manifest_json.timeline;
    const manifestScenes = value.manifest_json.scenes;
    const storyboardScenes = Array.isArray(value.storyboard_json)
      ? value.storyboard_json
      : Array.isArray(value.storyboard_json?.scenes)
        ? value.storyboard_json.scenes
        : undefined;
    const htmlHasTimelineMarkers =
      typeof value.html === 'string' &&
      /data-start\s*=|data-duration\s*=|window\.__timelines|gsap\.timeline/i.test(value.html);

    if (
      !(
        (Array.isArray(manifestTimeline) && manifestTimeline.length > 0) ||
        (Array.isArray(manifestScenes) && manifestScenes.length > 0) ||
        (Array.isArray(storyboardScenes) && storyboardScenes.length > 0) ||
        htmlHasTimelineMarkers
      )
    ) {
      ctx.addIssue({
        code: 'custom',
        path: ['manifest_json'],
        message:
          '视频渲染必须包含 timeline/scenes/storyboard 或 HTML 时间轴标记，不能用静态 HTML 页面代替剪辑时间轴。'
      });
    }
  });

export const OutputType = z.object({
  job_id: z.string().optional(),
  status: z.string(),
  video_url: z.string().optional(),
  poster_url: z.string().optional(),
  logs_url: z.string().optional(),
  error_detail_json: z.string().optional(),
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
  error?: unknown;
  system_error?: unknown;
  stage?: unknown;
  exit_code?: unknown;
  exitCode?: unknown;
  signal?: unknown;
  stderr_tail?: unknown;
  stderrTail?: unknown;
  duration_before_exit_sec?: unknown;
  durationBeforeExitSec?: unknown;
  memory_peak_mb?: unknown;
  memoryPeakMb?: unknown;
  tmp_usage_mb?: unknown;
  tmpUsageMb?: unknown;
  trace_id?: unknown;
  traceId?: unknown;
};

function numberValue(...values: unknown[]): number | undefined {
  for (const value of values) {
    if (typeof value === 'number' && Number.isFinite(value)) return value;
    if (typeof value === 'string' && value.trim() && Number.isFinite(Number(value))) {
      return Number(value);
    }
  }
  return undefined;
}

function readManifestNumber(manifest: Record<string, unknown> | undefined, key: string) {
  return numberValue(manifest?.[key]);
}

function readManifestString(manifest: Record<string, unknown> | undefined, key: string) {
  const value = manifest?.[key];
  return typeof value === 'string' && value.trim() ? value.trim() : undefined;
}

function shouldUseLongVideoMode(input: In) {
  const durationSeconds = readManifestNumber(input.manifest_json, 'duration_seconds');
  const manifestFps = readManifestNumber(input.manifest_json, 'fps');
  const renderSize = readManifestString(input.manifest_json, 'render_size');
  const frameCount = durationSeconds && manifestFps ? durationSeconds * manifestFps : undefined;

  return Boolean(
    (durationSeconds && durationSeconds >= 180) ||
      (frameCount && frameCount >= 5400) ||
      ((renderSize === 'landscape_1080p' || renderSize === 'portrait_1080p') &&
        durationSeconds &&
        durationSeconds >= 120)
  );
}

export function buildRenderOptions(input: In) {
  const durationSeconds = readManifestNumber(input.manifest_json, 'duration_seconds');
  const manifestFps = readManifestNumber(input.manifest_json, 'fps');
  const longVideoMode = shouldUseLongVideoMode(input);
  const performanceMode =
    input.performance_mode === 'on' || (input.performance_mode === 'auto' && longVideoMode);
  const disableHeavyEffects =
    input.disable_heavy_effects === 'on' ||
    (input.disable_heavy_effects === 'auto' && performanceMode);

  const safeFps =
    input.target_fps ??
    (performanceMode
      ? Math.min(manifestFps || 18, durationSeconds && durationSeconds >= 180 ? 18 : 24)
      : manifestFps);

  return {
    performance_mode: performanceMode,
    disable_blur: disableHeavyEffects,
    disable_filter: disableHeavyEffects,
    disable_heavy_shadow: disableHeavyEffects,
    fps: safeFps,
    segment_duration_seconds:
      input.segment_duration_seconds ??
      (performanceMode && durationSeconds && durationSeconds >= 180 ? 60 : undefined),
    diagnostics_level: input.diagnostics_level,
    requested_diagnostics: [
      'stage',
      'exit_code',
      'signal',
      'stderr_tail',
      'duration_before_exit_sec',
      'memory_peak_mb',
      'tmp_usage_mb',
      'job_id',
      'trace_id'
    ]
  };
}

export function buildRenderRequest(input: In) {
  const renderOptions = buildRenderOptions(input);
  return {
    action: input.action,
    job_id: input.job_id,
    source: {
      page_url: input.page_url,
      html: input.html
    },
    manifest: input.manifest_json ?? {},
    artifacts: {
      storyboard: input.storyboard_json,
      voiceover_script: input.voiceover_script,
      subtitle_srt: input.subtitle_srt,
      asset_plan: input.asset_plan_json,
      validation_report: input.validation_report_json
    },
    render_options: renderOptions,
    extra: {
      ...(input.extra_payload ?? {}),
      render_options: renderOptions
    }
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

function buildErrorDetail(data: RenderServiceResponse, fallback?: string) {
  const detail = {
    error: textValue(data.error, data.system_error, data.message) || fallback || '',
    stage: textValue(data.stage) || 'unknown',
    exit_code: textValue(data.exit_code, data.exitCode),
    signal: textValue(data.signal),
    stderr_tail: textValue(data.stderr_tail, data.stderrTail),
    duration_before_exit_sec: numberValue(
      data.duration_before_exit_sec,
      data.durationBeforeExitSec
    ),
    memory_peak_mb: numberValue(data.memory_peak_mb, data.memoryPeakMb),
    tmp_usage_mb: numberValue(data.tmp_usage_mb, data.tmpUsageMb),
    job_id: textValue(data.job_id, data.jobId, data.id),
    trace_id: textValue(data.trace_id, data.traceId)
  };

  return JSON.stringify(detail, null, 2);
}

function isErrorStatus(status: string, data: RenderServiceResponse) {
  const normalized = status.toLowerCase();
  return Boolean(
    data.error ||
      data.system_error ||
      ['error', 'failed', 'terminated', 'timeout', 'canceled', 'cancelled'].includes(normalized)
  );
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

  let response: Response;
  try {
    const signal = AbortSignal.timeout(input.client_timeout_seconds * 1000);
    response = await fetch(renderEndpointUrl, {
      method: 'POST',
      headers,
      body: JSON.stringify(body),
      signal
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    const detail = buildErrorDetail({ error: message, stage: 'request' }, message);
    return {
      status: 'error',
      summary: '渲染服务请求中断。',
      raw_response: '',
      error_detail_json: detail,
      system_error: message
    };
  }

  const responseText = await response.text();
  if (!response.ok) {
    return {
      status: 'error',
      summary: `渲染服务请求失败: HTTP ${response.status}`,
      raw_response: responseText,
      error_detail_json: buildErrorDetail(
        { error: responseText || `HTTP ${response.status}`, stage: 'request' },
        responseText || `HTTP ${response.status}`
      ),
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
      error_detail_json: buildErrorDetail(
        { error: 'Invalid render service JSON response', stage: 'response' },
        'Invalid render service JSON response'
      ),
      system_error: 'Invalid render service JSON response'
    };
  }

  const jobId = textValue(data.job_id, data.jobId, data.id, input.job_id);
  const status = textValue(data.status, data.state) || 'submitted';
  const videoUrl = textValue(data.video_url, data.videoUrl, data.output_url);
  const posterUrl = textValue(data.poster_url, data.posterUrl);
  const logsUrl = textValue(data.logs_url, data.logsUrl);
  const errorMessage = textValue(data.error, data.system_error, data.message);

  if (isErrorStatus(status, data)) {
    const detail = buildErrorDetail(data, errorMessage || status);
    return {
      job_id: jobId,
      status: 'error',
      poster_url: posterUrl,
      logs_url: logsUrl,
      summary: `HyperFrames 渲染失败: ${errorMessage || status}。`,
      raw_response: responseText,
      error_detail_json: detail,
      system_error: errorMessage || status
    };
  }

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
