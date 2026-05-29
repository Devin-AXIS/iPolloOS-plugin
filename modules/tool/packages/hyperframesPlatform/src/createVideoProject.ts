import { z } from 'zod';

const emptyToUndef = (value: unknown) => {
  if (value !== '' && value !== null && value !== undefined && typeof value !== 'string') {
    return value;
  }
  const text = typeof value === 'string' ? value.trim() : '';
  return text || undefined;
};

const readString = (value: unknown) => (typeof value === 'string' ? value.trim() : '');

export const InputType = z.object({
  brief: z.string().min(1).max(200_000),
  composition_html: z.preprocess(emptyToUndef, z.string().max(2_000_000).optional()),
  manifest_json: z.preprocess(
    emptyToUndef,
    z.union([z.string(), z.record(z.string(), z.any())]).optional()
  ),
  render_profile: z.preprocess(emptyToUndef, z.string().max(120).optional()),
  mode: z
    .enum(['hyperframes_render', 'html_to_video', 'video_edit', 'h5_overlay_video'])
    .default('hyperframes_render'),
  source_page_url: z.preprocess(emptyToUndef, z.string().url().optional()),
  source_video_url: z.preprocess(emptyToUndef, z.string().url().optional()),
  assets: z.preprocess(emptyToUndef, z.string().max(500_000).optional()),
  render_size: z
    .enum(['landscape_1080p', 'portrait_1080p', 'square_1080p', 'cinema_1080p', 'preview_720p'])
    .default('landscape_1080p'),
  duration_seconds: z.coerce.number().int().min(1).max(3600).default(60),
  language: z.enum(['zh-CN', 'en', 'ja', 'auto']).default('zh-CN')
});

export const OutputType = z.object({
  composition_html: z.string(),
  manifest_json: z.string(),
  render_profile: z.string(),
  summary: z.string(),
  system_error: z.string().optional()
});

type In = z.infer<typeof InputType>;
type Out = z.infer<typeof OutputType>;

function parseJsonFromText(raw: string): Record<string, unknown> {
  const fenced = raw.match(/```(?:json)?\s*([\s\S]*?)```/i)?.[1];
  const text = fenced || raw.match(/\{[\s\S]*\}/)?.[0] || raw;
  return JSON.parse(text) as Record<string, unknown>;
}

function normalizeManifest(value: unknown, input: In) {
  if (!value) return fallbackManifest(input);
  if (typeof value === 'string') return parseJsonFromText(value);
  if (typeof value === 'object') return value as Record<string, unknown>;
  return fallbackManifest(input);
}

function assertCompleteHtml(html: string) {
  if (!/<html[\s>]/i.test(html) || !/<\/html>/i.test(html)) {
    throw new Error(
      '工具入参 composition_html 不是完整 HTML。请由上游 AI 大脑生成完整 HyperFrames 单文件 HTML 后，再调用本工具。'
    );
  }
}

function fallbackManifest(input: In) {
  return {
    mode: input.mode,
    render_profile: input.mode === 'video_edit' ? 'video_edit' : 'hyperframes',
    render_size: input.render_size,
    duration_seconds: input.duration_seconds,
    source_page_url: input.source_page_url,
    source_video_url: input.source_video_url
  };
}

export async function tool(props: In): Promise<Out> {
  try {
    const input = InputType.parse(props);
    const compositionHtml = readString(input.composition_html);
    assertCompleteHtml(compositionHtml);
    const manifest = normalizeManifest(input.manifest_json, input);

    return {
      composition_html: compositionHtml,
      manifest_json: JSON.stringify(manifest, null, 2),
      render_profile: readString(input.render_profile) || 'hyperframes',
      summary: '已校验上游 AI 大脑生成的 HyperFrames 视频工程；插件本身未调用 AI。'
    };
  } catch (error) {
    return {
      composition_html: '',
      manifest_json: '',
      render_profile: '',
      summary: '',
      system_error: error instanceof Error ? error.message : String(error)
    };
  }
}
