import { z } from 'zod';
import { AiAppFields, callAiApp } from '../../htmlAnythingPlatform/lib/aiApp';
import { buildVideoProjectPrompt } from '../lib/prompt';

const emptyToUndef = (value: unknown) => {
  const text = typeof value === 'string' ? value.trim() : '';
  return text || undefined;
};

const readString = (value: unknown) => (typeof value === 'string' ? value.trim() : '');

export const InputType = AiAppFields.and(
  z.object({
    brief: z.string().min(1).max(200_000),
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
  })
);

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
    const raw = await callAiApp({
      auth: input,
      prompt: buildVideoProjectPrompt({
        brief: input.brief,
        mode: input.mode,
        sourcePageUrl: input.source_page_url,
        sourceVideoUrl: input.source_video_url,
        assets: input.assets,
        renderSize: input.render_size,
        durationSeconds: input.duration_seconds,
        language: input.language
      }),
      chatId: `hyperframes-create-${Date.now()}`,
      variables: {
        mode: input.mode,
        render_size: input.render_size,
        duration_seconds: input.duration_seconds,
        brief: input.brief
      }
    });

    const data = parseJsonFromText(raw);
    const compositionHtml = readString(data.composition_html);
    const manifest =
      data.manifest_json && typeof data.manifest_json === 'object'
        ? data.manifest_json
        : fallbackManifest(input);

    return {
      composition_html: compositionHtml,
      manifest_json: JSON.stringify(manifest, null, 2),
      render_profile: readString(data.render_profile) || 'hyperframes',
      summary: readString(data.summary) || '已生成 HyperFrames 视频工程。'
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
