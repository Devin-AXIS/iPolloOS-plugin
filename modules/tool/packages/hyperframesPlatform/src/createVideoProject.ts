import { z } from 'zod';
import {
  VIDEO_PURPOSE_IDS,
  VIDEO_STYLE_IDS,
  VIDEO_TEMPLATE_IDS,
  getVideoPurpose,
  getVideoStyle,
  getVideoTemplate,
  normalizeVideoPurposeId,
  normalizeVideoStyleId,
  normalizeVideoTemplateId,
  resolveVideoTemplateForOrientation
} from '../lib/videoTemplates';
import { validateHyperframesContract } from '../lib/hyperframesContract';

const emptyToUndef = (value: unknown) => {
  if (value !== '' && value !== null && value !== undefined && typeof value !== 'string') {
    return value;
  }
  const text = typeof value === 'string' ? value.trim() : '';
  return text || undefined;
};

const readString = (value: unknown) => (typeof value === 'string' ? value.trim() : '');

const normalizeEnumInput =
  (resolver: (value: unknown) => string | undefined) => (value: unknown) => {
    const normalized = emptyToUndef(value);
    if (!normalized) return undefined;
    return resolver(normalized) || normalized;
  };

export const InputType = z.object({
  brief: z.string().min(1).max(200_000),
  purpose_id: z.preprocess(
    normalizeEnumInput(normalizeVideoPurposeId),
    z.enum(VIDEO_PURPOSE_IDS).optional()
  ),
  style_id: z.preprocess(
    normalizeEnumInput(normalizeVideoStyleId),
    z.enum(VIDEO_STYLE_IDS).optional()
  ),
  video_template_id: z.preprocess(
    normalizeEnumInput(normalizeVideoTemplateId),
    z.enum(VIDEO_TEMPLATE_IDS).optional()
  ),
  orientation: z.enum(['landscape', 'portrait']).default('landscape'),
  composition_html: z.preprocess(emptyToUndef, z.string().max(2_000_000).optional()),
  manifest_json: z.preprocess(
    emptyToUndef,
    z.union([z.string(), z.record(z.string(), z.any())]).optional()
  ),
  storyboard_json: z.preprocess(
    emptyToUndef,
    z.union([z.string(), z.record(z.string(), z.any()), z.array(z.any())]).optional()
  ),
  voiceover_script: z.preprocess(emptyToUndef, z.string().max(300_000).optional()),
  subtitle_srt: z.preprocess(emptyToUndef, z.string().max(300_000).optional()),
  asset_plan_json: z.preprocess(
    emptyToUndef,
    z.union([z.string(), z.record(z.string(), z.any()), z.array(z.any())]).optional()
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
  fps: z.coerce.number().int().min(12).max(60).default(30),
  voiceover_mode: z.enum(['none', 'script_only', 'tts_ready']).default('script_only'),
  extra_requirements: z.preprocess(emptyToUndef, z.string().max(50_000).optional()),
  language: z.enum(['zh-CN', 'en', 'ja', 'auto']).default('zh-CN')
});

export const OutputType = z.object({
  composition_html: z.string(),
  manifest_json: z.string(),
  storyboard_json: z.string(),
  voiceover_script: z.string(),
  subtitle_srt: z.string(),
  asset_plan_json: z.string(),
  validation_report_json: z.string(),
  render_profile: z.string(),
  summary: z.string(),
  system_error: z.string().optional()
});

type In = z.infer<typeof InputType>;
type Out = z.infer<typeof OutputType>;

function normalizeTemplateSelection(input: In): In {
  const resolvedTemplateId = resolveVideoTemplateForOrientation({
    videoTemplateId: input.video_template_id,
    purposeId: input.purpose_id,
    styleId: input.style_id,
    orientation: input.orientation
  });

  if (!resolvedTemplateId || resolvedTemplateId === input.video_template_id) return input;

  const template = getVideoTemplate(resolvedTemplateId);
  return {
    ...input,
    video_template_id: resolvedTemplateId,
    purpose_id: input.purpose_id || template?.purposeId,
    style_id: input.style_id || template?.styleId
  };
}

function parseJsonFromText(raw: string): Record<string, unknown> {
  const fenced = raw.match(/```(?:json)?\s*([\s\S]*?)```/i)?.[1];
  const text = fenced || raw.match(/\{[\s\S]*\}/)?.[0] || raw;
  return JSON.parse(text) as Record<string, unknown>;
}

function normalizeJsonLike(value: unknown, fallback: Record<string, unknown> | unknown[]) {
  if (!value) return fallback;
  if (typeof value === 'string') return parseJsonFromText(value);
  if (typeof value === 'object') return value as Record<string, unknown> | unknown[];
  return fallback;
}

function normalizeManifest(value: unknown, input: In) {
  if (!value) return fallbackManifest(input);
  if (typeof value === 'string') return parseJsonFromText(value);
  if (typeof value === 'object') return value as Record<string, unknown>;
  return fallbackManifest(input);
}

function applySelectionToManifest(manifest: Record<string, unknown>, input: In) {
  const dimensions = getRenderDimensions(input.render_size, input.orientation);
  return {
    ...manifest,
    schema_version: manifest.schema_version || 'hyperframes.video.v1',
    video_template_id: input.video_template_id || manifest.video_template_id,
    purpose_id: input.purpose_id || manifest.purpose_id,
    style_id: input.style_id || manifest.style_id,
    orientation: input.orientation || manifest.orientation,
    width: manifest.width || dimensions.width,
    height: manifest.height || dimensions.height,
    fps: manifest.fps || input.fps,
    render_size: manifest.render_size || input.render_size,
    duration_seconds: manifest.duration_seconds || input.duration_seconds
  };
}

function assertCompleteHtml(html: string) {
  if (!/<html[\s>]/i.test(html) || !/<\/html>/i.test(html)) {
    throw new Error(
      '工具入参 composition_html 不是完整 HTML。请由上游 AI 大脑生成完整 HyperFrames 单文件 HTML 后，再调用本工具。'
    );
  }
}

function fallbackManifest(input: In) {
  const dimensions = getRenderDimensions(input.render_size, input.orientation);
  const template = input.video_template_id ? getVideoTemplate(input.video_template_id) : undefined;
  return {
    schema_version: 'hyperframes.video.v1',
    mode: input.mode,
    purpose_id: input.purpose_id || template?.purposeId,
    style_id: input.style_id || template?.styleId,
    video_template_id: input.video_template_id,
    orientation: input.orientation || template?.orientation,
    width: dimensions.width,
    height: dimensions.height,
    fps: input.fps,
    render_profile: input.mode === 'video_edit' ? 'video_edit' : 'hyperframes',
    render_size: input.render_size,
    duration_seconds: input.duration_seconds,
    timeline: [
      {
        scene_id: 's01',
        start: 0,
        duration: input.duration_seconds,
        track_index: 1,
        transition: 'none'
      }
    ],
    audio: {
      voiceover_mode: input.voiceover_mode,
      voiceover_url: '',
      music_style: input.style_id || 'auto',
      ducking: input.voiceover_mode !== 'none'
    },
    assets: [],
    render: {
      profile: input.mode === 'video_edit' ? 'video_edit' : 'hyperframes',
      quality: input.render_size === 'preview_720p' ? '720p' : '1080p'
    },
    source_page_url: input.source_page_url,
    source_video_url: input.source_video_url
  };
}

function getRenderDimensions(renderSize: In['render_size'], orientation: In['orientation']) {
  if (renderSize === 'portrait_1080p' || orientation === 'portrait') {
    return { width: 1080, height: 1920 };
  }
  if (renderSize === 'square_1080p') {
    return { width: 1080, height: 1080 };
  }
  if (renderSize === 'cinema_1080p') {
    return { width: 2560, height: 1080 };
  }
  if (renderSize === 'preview_720p') {
    return { width: 1280, height: 720 };
  }
  return { width: 1920, height: 1080 };
}

function fallbackStoryboard(input: In, manifest: Record<string, unknown>) {
  const template = input.video_template_id ? getVideoTemplate(input.video_template_id) : undefined;
  return {
    schema_version: 'hyperframes.storyboard.v1',
    template: template ? `${template.zhName} / ${template.enName}` : '自动判断',
    purpose: input.purpose_id
      ? getVideoPurpose(input.purpose_id)?.zhName
      : template
        ? getVideoPurpose(template.purposeId)?.zhName
        : '自动判断',
    style: input.style_id
      ? getVideoStyle(input.style_id)?.zhName
      : template
        ? getVideoStyle(template.styleId)?.zhName
        : '自动判断',
    duration_seconds: input.duration_seconds,
    default_scene_plan: template?.scenePlan ?? [],
    scenes:
      Array.isArray(manifest.timeline) && manifest.timeline.length > 0
        ? manifest.timeline
        : [
            {
              scene_id: 's01',
              start: 0,
              duration: input.duration_seconds,
              title: input.brief.slice(0, 80),
              transition: 'none'
            }
          ]
  };
}

function fallbackAssetPlan(input: In) {
  return {
    source_page_url: input.source_page_url,
    source_video_url: input.source_video_url,
    assets_note: input.assets || '',
    required_assets: []
  };
}

export async function tool(props: In): Promise<Out> {
  try {
    const input = normalizeTemplateSelection(InputType.parse(props));
    const compositionHtml = readString(input.composition_html);
    assertCompleteHtml(compositionHtml);
    const manifest = applySelectionToManifest(normalizeManifest(input.manifest_json, input), input);
    const storyboard = normalizeJsonLike(
      input.storyboard_json,
      fallbackStoryboard(input, manifest)
    );
    const assetPlan = normalizeJsonLike(input.asset_plan_json, fallbackAssetPlan(input));
    const validationReport = validateHyperframesContract({
      compositionHtml,
      manifest,
      storyboard
    });

    if (!validationReport.ok) {
      throw new Error(`HyperFrames 视频工程不完整：${validationReport.errors.join('；')}`);
    }

    return {
      composition_html: compositionHtml,
      manifest_json: JSON.stringify(manifest, null, 2),
      storyboard_json: JSON.stringify(storyboard, null, 2),
      voiceover_script:
        readString(input.voiceover_script) ||
        '未提供配音稿。请上游 AI 大脑按 storyboard_json 为每个镜头生成自然口播稿。',
      subtitle_srt:
        readString(input.subtitle_srt) ||
        '未提供 SRT 字幕。请上游 AI 大脑按完整时间轴生成 subtitle_srt。',
      asset_plan_json: JSON.stringify(assetPlan, null, 2),
      validation_report_json: JSON.stringify(validationReport, null, 2),
      render_profile: readString(input.render_profile) || 'hyperframes',
      summary:
        '已校验上游 AI 大脑生成的 HyperFrames 视频工程；包含视频模板、用途/风格、分镜、字幕、配音稿和素材计划字段。'
    };
  } catch (error) {
    return {
      composition_html: '',
      manifest_json: '',
      storyboard_json: '',
      voiceover_script: '',
      subtitle_srt: '',
      asset_plan_json: '',
      validation_report_json: '',
      render_profile: '',
      summary: '',
      system_error: error instanceof Error ? error.message : String(error)
    };
  }
}
