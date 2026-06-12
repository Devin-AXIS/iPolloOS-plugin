import { z } from 'zod';

const operationValues = [
  'auto',
  'concat_videos',
  'merge_audio_video',
  'replace_audio',
  'mix_audio_tracks',
  'side_by_side',
  'picture_in_picture',
  'burn_subtitles',
  'extract_audio',
  'timeline_compose'
] as const;

const outputFormatValues = ['mp4', 'mov', 'webm', 'mp3', 'm4a', 'wav'] as const;

const emptyToUndef = (value: unknown) => {
  if (value !== '' && value !== null && value !== undefined && typeof value !== 'string') {
    return value;
  }
  const text = typeof value === 'string' ? value.trim() : '';
  return text || undefined;
};

function tryParseJson(text: string) {
  try {
    return { ok: true as const, value: JSON.parse(text) as unknown };
  } catch (error) {
    return {
      ok: false as const,
      message: error instanceof Error ? error.message : String(error)
    };
  }
}

function parseJsonErrorPosition(message: string) {
  const position = message.match(/position\s+(\d+)/i)?.[1];
  const line = message.match(/line\s+(\d+)/i)?.[1];
  const column = message.match(/column\s+(\d+)/i)?.[1];

  return {
    position: position ? Number(position) : undefined,
    line: line ? Number(line) : undefined,
    column: column ? Number(column) : undefined
  };
}

function getParseContext(raw: string, position?: number) {
  const at = typeof position === 'number' ? position : Math.min(raw.length, 80);
  const start = Math.max(0, at - 80);
  const end = Math.min(raw.length, at + 80);
  return raw.slice(start, end);
}

function formatJsonParseError(field: string, raw: string, causeMessage: string) {
  const { position, line, column } = parseJsonErrorPosition(causeMessage);
  return JSON.stringify(
    {
      ok: false,
      stage: 'normalize_input',
      error_code: 'JSON_PARSE_FAILED',
      field,
      position,
      line,
      column,
      received_type: 'string',
      context: getParseContext(raw, position),
      message: `${field} 必须是合法 JSON；${causeMessage}`
    },
    null,
    2
  );
}

function extractFirstJsonBlock(raw: string) {
  const text = raw.trim();
  let start = -1;
  let depth = 0;
  let inString = false;
  let escaped = false;
  const stack: string[] = [];

  for (let i = 0; i < text.length; i++) {
    const char = text[i];

    if (start < 0) {
      if (char === '{' || char === '[') {
        start = i;
        stack.push(char === '{' ? '}' : ']');
        depth = 1;
      }
      continue;
    }

    if (escaped) {
      escaped = false;
      continue;
    }
    if (char === '\\') {
      escaped = true;
      continue;
    }
    if (char === '"') {
      inString = !inString;
      continue;
    }
    if (inString) continue;

    if (char === '{' || char === '[') {
      stack.push(char === '{' ? '}' : ']');
      depth++;
    } else if (char === stack.at(-1)) {
      stack.pop();
      depth--;
      if (depth === 0) return text.slice(start, i + 1);
    }
  }

  return undefined;
}

function parseJsonFromText(raw: string, field: string): unknown {
  const trimmed = raw.trim();
  const direct = tryParseJson(trimmed);
  if (direct.ok) return direct.value;

  const fenced = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/i)?.[1]?.trim();
  if (fenced) {
    const fencedParsed = tryParseJson(fenced);
    if (fencedParsed.ok) return fencedParsed.value;
  }

  const firstJson = extractFirstJsonBlock(trimmed);
  if (firstJson) {
    const firstParsed = tryParseJson(firstJson);
    if (firstParsed.ok) return firstParsed.value;
  }

  throw new Error(formatJsonParseError(field, raw, direct.message || 'Invalid JSON'));
}

function jsonish(field: string) {
  return z.preprocess(emptyToUndef, z.unknown().optional()).transform((value, ctx) => {
    if (value === undefined) return undefined;
    if (typeof value !== 'string') return value;

    try {
      return parseJsonFromText(value, field);
    } catch (error) {
      ctx.addIssue({
        code: 'custom',
        message: error instanceof Error ? error.message : `${field} 必须是合法 JSON`
      });
      return z.NEVER;
    }
  });
}

function stringList(field: string) {
  return z.preprocess(emptyToUndef, z.unknown().optional()).transform((value, ctx) => {
    if (value === undefined) return [] as string[];
    if (Array.isArray(value)) {
      return value.filter((item): item is string => typeof item === 'string' && item.trim());
    }
    if (typeof value !== 'string') {
      ctx.addIssue({ code: 'custom', message: `${field} 必须是字符串或字符串数组` });
      return z.NEVER;
    }

    const trimmed = value.trim();
    const parsed = tryParseJson(trimmed);
    if (parsed.ok && Array.isArray(parsed.value)) {
      return parsed.value.filter((item): item is string => typeof item === 'string' && item.trim());
    }

    return trimmed
      .split(/\r?\n|,/)
      .map((item) => item.trim())
      .filter(Boolean);
  });
}

function countMediaItemsByType(value: unknown, type: 'video' | 'audio') {
  const items = Array.isArray(value)
    ? value
    : value && typeof value === 'object' && Array.isArray((value as { items?: unknown }).items)
      ? (value as { items: unknown[] }).items
      : [];

  return items.filter((item) => {
    if (!item || typeof item !== 'object') return false;
    const itemType = (item as { type?: unknown; media_type?: unknown }).type;
    const mediaType = (item as { type?: unknown; media_type?: unknown }).media_type;
    return itemType === type || mediaType === type;
  }).length;
}

function countMediaItems(value: unknown) {
  if (Array.isArray(value)) return value.length;
  if (value && typeof value === 'object' && Array.isArray((value as { items?: unknown }).items)) {
    return (value as { items: unknown[] }).items.length;
  }
  return 0;
}

function hasTimeline(value: unknown) {
  if (!value) return false;
  if (Array.isArray(value)) return value.length > 0;
  if (typeof value !== 'object') return false;

  const timeline = value as {
    tracks?: unknown;
    clips?: unknown;
    timeline?: unknown;
    scenes?: unknown;
  };

  return [timeline.tracks, timeline.clips, timeline.timeline, timeline.scenes].some(
    (item) => Array.isArray(item) && item.length > 0
  );
}

export const InputType = z
  .object({
    renderEndpointUrl: z.preprocess(emptyToUndef, z.string().url().optional()),
    renderApiToken: z.preprocess(emptyToUndef, z.string().optional()),
    renderAuthHeaderName: z.preprocess(emptyToUndef, z.string().optional()),
    action: z.enum(['submit', 'status', 'cancel']).default('submit'),
    operation: z.enum(operationValues).default('auto'),
    video_urls: stringList('video_urls'),
    audio_urls: stringList('audio_urls'),
    media_items_json: jsonish('media_items_json'),
    timeline_json: jsonish('timeline_json'),
    subtitle_srt: z.preprocess(emptyToUndef, z.string().max(500_000).optional()),
    output_format: z.enum(outputFormatValues).default('mp4'),
    output_profile: z.preprocess(emptyToUndef, z.string().optional()).default('web_1080p'),
    output_fps: z.preprocess(emptyToUndef, z.coerce.number().int().min(1).max(120).optional()),
    output_filename: z.preprocess(emptyToUndef, z.string().max(240).optional()),
    job_id: z.preprocess(emptyToUndef, z.string().optional()),
    extra_payload: jsonish('extra_payload'),
    client_timeout_seconds: z.coerce.number().int().min(10).max(600).default(120)
  })
  .superRefine((value, ctx) => {
    if (value.action !== 'submit') {
      if (!value.job_id) {
        ctx.addIssue({
          code: 'custom',
          path: ['job_id'],
          message: 'status/cancel 操作必须填写 job_id'
        });
      }
      return;
    }

    const videoCount =
      value.video_urls.length + countMediaItemsByType(value.media_items_json, 'video');
    const audioCount =
      value.audio_urls.length + countMediaItemsByType(value.media_items_json, 'audio');
    const hasPlan = hasTimeline(value.timeline_json) || countMediaItems(value.media_items_json) > 0;

    if (videoCount === 0 && audioCount === 0 && !hasPlan && !value.subtitle_srt) {
      ctx.addIssue({
        code: 'custom',
        path: ['video_urls'],
        message: '提交合成任务必须提供视频 URL、音频 URL、媒体素材 JSON、时间线 JSON 或字幕。'
      });
      return;
    }

    if (['concat_videos', 'side_by_side'].includes(value.operation) && videoCount < 2 && !hasPlan) {
      ctx.addIssue({
        code: 'custom',
        path: ['video_urls'],
        message: `${value.operation} 至少需要 2 个视频，或提供完整时间线 JSON。`
      });
    }

    if (
      ['merge_audio_video', 'replace_audio'].includes(value.operation) &&
      (videoCount < 1 || audioCount < 1) &&
      !hasPlan
    ) {
      ctx.addIssue({
        code: 'custom',
        path: ['audio_urls'],
        message: `${value.operation} 至少需要 1 个视频和 1 个音频，或提供完整时间线 JSON。`
      });
    }

    if (value.operation === 'mix_audio_tracks' && audioCount < 2 && !hasPlan) {
      ctx.addIssue({
        code: 'custom',
        path: ['audio_urls'],
        message: 'mix_audio_tracks 至少需要 2 个音频，或提供完整时间线 JSON。'
      });
    }

    if (value.operation === 'picture_in_picture' && videoCount < 2 && !hasPlan) {
      ctx.addIssue({
        code: 'custom',
        path: ['video_urls'],
        message: 'picture_in_picture 至少需要 2 个视频，或提供完整时间线 JSON。'
      });
    }

    if (value.operation === 'burn_subtitles' && videoCount < 1 && !hasPlan) {
      ctx.addIssue({
        code: 'custom',
        path: ['video_urls'],
        message: 'burn_subtitles 至少需要 1 个视频，或提供完整时间线 JSON。'
      });
    }
  });

export const OutputType = z.object({
  job_id: z.string().optional(),
  status: z.string(),
  output_url: z.string().optional(),
  video_url: z.string().optional(),
  audio_url: z.string().optional(),
  poster_url: z.string().optional(),
  logs_url: z.string().optional(),
  summary: z.string(),
  raw_response: z.string(),
  error_detail_json: z.string().optional(),
  system_error: z.string().optional()
});

type In = z.infer<typeof InputType>;
type Out = z.infer<typeof OutputType>;

type MediaProcessingResponse = {
  job_id?: unknown;
  jobId?: unknown;
  id?: unknown;
  status?: unknown;
  state?: unknown;
  output_url?: unknown;
  outputUrl?: unknown;
  result_url?: unknown;
  resultUrl?: unknown;
  video_url?: unknown;
  videoUrl?: unknown;
  audio_url?: unknown;
  audioUrl?: unknown;
  poster_url?: unknown;
  posterUrl?: unknown;
  thumbnail_url?: unknown;
  thumbnailUrl?: unknown;
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
  trace_id?: unknown;
  traceId?: unknown;
};

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

function objectValue(value: unknown) {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

function buildErrorDetail(data: MediaProcessingResponse, fallback?: string) {
  return JSON.stringify(
    {
      error: textValue(data.error, data.system_error, data.message) || fallback || '',
      stage: textValue(data.stage) || 'unknown',
      exit_code: textValue(data.exit_code, data.exitCode),
      signal: textValue(data.signal),
      stderr_tail: textValue(data.stderr_tail, data.stderrTail),
      job_id: textValue(data.job_id, data.jobId, data.id),
      trace_id: textValue(data.trace_id, data.traceId)
    },
    null,
    2
  );
}

function isErrorStatus(status: string, data: MediaProcessingResponse) {
  const normalized = status.toLowerCase();
  return Boolean(
    data.error ||
      data.system_error ||
      ['error', 'failed', 'terminated', 'timeout', 'canceled', 'cancelled'].includes(normalized)
  );
}

function isAudioFormat(format: In['output_format']) {
  return ['mp3', 'm4a', 'wav'].includes(format);
}

function summarize(input: In, status: string, jobId?: string, outputUrl?: string) {
  if (input.action === 'submit') {
    return jobId
      ? `已提交公共音视频处理任务，任务 ID: ${jobId}，当前状态: ${status}。`
      : `已提交公共音视频处理任务，当前状态: ${status}。`;
  }
  if (input.action === 'cancel') {
    return `已请求取消音视频处理任务${jobId ? ` ${jobId}` : ''}，当前状态: ${status}。`;
  }
  return outputUrl
    ? `音视频处理任务${jobId ? ` ${jobId}` : ''}已完成，输出链接已返回。`
    : `音视频处理任务${jobId ? ` ${jobId}` : ''}当前状态: ${status}。`;
}

export function buildMediaProcessingRequest(input: In) {
  const output = {
    format: input.output_format,
    profile: input.output_profile,
    fps: input.output_fps,
    filename: input.output_filename
  };

  return {
    task_type: 'media_processing',
    action: input.action,
    operation: input.operation,
    job_id: input.job_id,
    inputs: {
      video_urls: input.video_urls,
      audio_urls: input.audio_urls,
      media_items: input.media_items_json,
      timeline: input.timeline_json,
      subtitle_srt: input.subtitle_srt
    },
    output,
    extra: {
      ...objectValue(input.extra_payload),
      output
    }
  };
}

function resolveEndpointConfig(input: In) {
  return {
    endpointUrl:
      input.renderEndpointUrl ||
      readEnv(
        'MEDIA_PROCESSING_RENDER_ENDPOINT_URL',
        'HYPERFRAMES_RENDER_ENDPOINT_URL',
        'RENDER_ENDPOINT_URL'
      ),
    apiToken:
      input.renderApiToken ||
      readEnv(
        'MEDIA_PROCESSING_RENDER_API_TOKEN',
        'HYPERFRAMES_RENDER_API_TOKEN',
        'RENDER_API_TOKEN'
      ),
    authHeaderName:
      input.renderAuthHeaderName ||
      readEnv(
        'MEDIA_PROCESSING_RENDER_AUTH_HEADER_NAME',
        'HYPERFRAMES_RENDER_AUTH_HEADER_NAME',
        'RENDER_AUTH_HEADER_NAME'
      ) ||
      'X-Render-Token'
  };
}

export async function tool(props: unknown): Promise<Out> {
  let input: In;
  try {
    input = InputType.parse(props);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return {
      status: 'error',
      summary: '公共音视频处理入参解析失败。',
      raw_response: '',
      error_detail_json: buildErrorDetail({ error: message, stage: 'normalize_input' }, message),
      system_error: message
    };
  }

  const { endpointUrl, apiToken, authHeaderName } = resolveEndpointConfig(input);
  if (!endpointUrl) {
    return {
      status: 'error',
      summary: '公共音视频处理函数未配置。',
      raw_response: '',
      system_error:
        '公共音视频处理函数未配置：请复用 HyperFrames 的阿里云国际函数计算入口，或配置 MEDIA_PROCESSING_RENDER_ENDPOINT_URL / HYPERFRAMES_RENDER_ENDPOINT_URL。'
    };
  }

  const headers: Record<string, string> = {
    'Content-Type': 'application/json'
  };
  if (apiToken) {
    headers[authHeaderName] = apiToken;
  }

  let response: Response;
  try {
    response = await fetch(endpointUrl, {
      method: 'POST',
      headers,
      body: JSON.stringify(buildMediaProcessingRequest(input)),
      signal: AbortSignal.timeout(input.client_timeout_seconds * 1000)
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return {
      status: 'error',
      summary: '公共音视频处理函数请求中断。',
      raw_response: '',
      error_detail_json: buildErrorDetail({ error: message, stage: 'request' }, message),
      system_error: message
    };
  }

  const responseText = await response.text();
  if (!response.ok) {
    return {
      status: 'error',
      summary: `公共音视频处理函数请求失败: HTTP ${response.status}`,
      raw_response: responseText,
      error_detail_json: buildErrorDetail(
        { error: responseText || `HTTP ${response.status}`, stage: 'request' },
        responseText || `HTTP ${response.status}`
      ),
      system_error: responseText || `HTTP ${response.status}`
    };
  }

  let data: MediaProcessingResponse;
  try {
    data = JSON.parse(responseText) as MediaProcessingResponse;
  } catch {
    return {
      status: 'error',
      summary: '公共音视频处理函数返回的不是 JSON',
      raw_response: responseText,
      error_detail_json: buildErrorDetail(
        { error: 'Invalid media processing JSON response', stage: 'response' },
        'Invalid media processing JSON response'
      ),
      system_error: 'Invalid media processing JSON response'
    };
  }

  const jobId = textValue(data.job_id, data.jobId, data.id, input.job_id);
  const status = textValue(data.status, data.state) || 'submitted';
  const outputUrl = textValue(data.output_url, data.outputUrl, data.result_url, data.resultUrl);
  const videoUrl = isAudioFormat(input.output_format)
    ? textValue(data.video_url, data.videoUrl)
    : textValue(data.video_url, data.videoUrl, outputUrl);
  const audioUrl = isAudioFormat(input.output_format)
    ? textValue(data.audio_url, data.audioUrl, outputUrl)
    : textValue(data.audio_url, data.audioUrl);
  const posterUrl = textValue(
    data.poster_url,
    data.posterUrl,
    data.thumbnail_url,
    data.thumbnailUrl
  );
  const logsUrl = textValue(data.logs_url, data.logsUrl);
  const errorMessage = textValue(data.error, data.system_error, data.message);

  if (isErrorStatus(status, data)) {
    return {
      job_id: jobId,
      status: 'error',
      output_url: outputUrl,
      video_url: videoUrl,
      audio_url: audioUrl,
      poster_url: posterUrl,
      logs_url: logsUrl,
      summary: `公共音视频处理失败: ${errorMessage || status}。`,
      raw_response: responseText,
      error_detail_json: buildErrorDetail(data, errorMessage || status),
      system_error: errorMessage || status
    };
  }

  return {
    job_id: jobId,
    status,
    output_url: outputUrl,
    video_url: videoUrl,
    audio_url: audioUrl,
    poster_url: posterUrl,
    logs_url: logsUrl,
    summary: summarize(input, status, jobId, outputUrl),
    raw_response: responseText
  };
}
