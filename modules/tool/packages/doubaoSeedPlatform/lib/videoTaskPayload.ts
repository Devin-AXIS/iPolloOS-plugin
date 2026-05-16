import type { AspectChoice, DurationMode, ResolutionChoice } from './buildVideoPrompt';
import { buildArkVideoPromptSuffix } from './buildVideoPrompt';

export type VideoGenMode = 'text' | 'reference' | 'frames';

export type ContentPart =
  | { type: 'text'; text: string }
  | { type: 'image_url'; image_url: { url: string } };

/** 方舟「创建视频生成任务」常用 JSON：model + content[] */
export function buildVideoGenerationTaskBody(opts: {
  model: string;
  prompt: string;
  mode: VideoGenMode;
  aspect: AspectChoice;
  resolution: ResolutionChoice;
  duration_mode: DurationMode;
  duration_seconds?: number;
  reference_image_url?: string;
  first_frame_url?: string;
  last_frame_url?: string;
}): { model: string; content: ContentPart[] } {
  const suffix = buildArkVideoPromptSuffix({
    aspect: opts.aspect,
    resolution: opts.resolution,
    duration_mode: opts.duration_mode,
    duration_seconds: opts.duration_seconds
  });
  const text = `${opts.prompt.trim()}${suffix}`;

  const content: ContentPart[] = [];

  if (opts.mode === 'frames') {
    const a = opts.first_frame_url?.trim();
    const b = opts.last_frame_url?.trim();
    if (a) content.push({ type: 'image_url', image_url: { url: a } });
    if (b) content.push({ type: 'image_url', image_url: { url: b } });
  } else if (opts.mode === 'reference') {
    const u = opts.reference_image_url?.trim();
    if (u) content.push({ type: 'image_url', image_url: { url: u } });
  }

  content.push({ type: 'text', text });
  return { model: opts.model.trim(), content };
}
