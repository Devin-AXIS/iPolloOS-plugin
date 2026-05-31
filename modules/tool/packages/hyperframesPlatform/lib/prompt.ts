import { buildVideoTemplateCatalog } from './videoTemplates';

export function buildVideoProjectPrompt(props: {
  brief: string;
  mode: string;
  purposeId?: string;
  styleId?: string;
  videoTemplateId?: string;
  orientation?: string;
  sourcePageUrl?: string;
  sourceVideoUrl?: string;
  assets?: string;
  renderSize: string;
  durationSeconds: number;
  fps?: number;
  voiceoverMode?: string;
  language: string;
  extraRequirements?: string;
}) {
  return `
你是 HyperFrames 视频工程导演和前端动画工程师。请根据用户需求生成一个可渲染的视频工程。

【输出格式】
只允许返回 JSON，不要输出 Markdown，不要解释。
JSON 必须包含:
{
  "composition_html": "完整 HyperFrames 单文件 HTML",
  "manifest_json": {...},
  "storyboard_json": {...},
  "voiceover_script": "完整配音稿。无配音时给字幕口播稿",
  "subtitle_srt": "SRT 字幕文本",
  "asset_plan_json": {...},
  "render_profile": "hyperframes|slides|webpage|ebook|video_edit",
  "summary": "一句话说明"
}

【模板中心】
优先选择 video_template_id，再用 purpose_id / style_id 做细调：
- video_template_id 决定默认用途、视觉风格、横竖屏和分镜结构。
- purpose_id 决定用途、内容结构、分镜节奏。
- style_id 决定字体、配色、构图、动效和画面质感。

${buildVideoTemplateCatalog()}

【HyperFrames 工程要求】
- composition_html 必须是 HyperFrames composition，不是普通网页；以 <!DOCTYPE html> 开头。
- 主文件不能用 <template> 包住根内容；<body> 里必须直接包含根 <div data-composition-id="...">。
- 顶层必须有 data-composition-id、data-width、data-height、data-start="0"、data-duration。
- 所有镜头/片段必须使用 data-start、data-duration、data-track-index，不得使用 data-layer 或 data-end。
- 时间轴使用 GSAP，timeline 必须 { paused: true }，并同步注册到 window.__timelines["<composition-id>"]。
- 多场景必须有转场；每个场景必须有入场动画。
- 不要使用 Math.random、Date.now、repeat:-1 或异步构建 timeline。
- 视频素材必须 muted playsinline；音频必须单独 audio track。
- 字幕、配音、转场、剪辑点、H5 叠加，都写进 composition_html 或 manifest_json，不要留给渲染器猜。
- manifest_json 必须包含 schema_version="hyperframes.video.v1"、video_template_id、purpose_id、style_id、orientation、width、height、fps、duration_seconds、timeline、audio、assets、render。
- timeline/scenes 不允许为空；每个 scene 必须有 scene_id、start、duration、track_index/track、transition。
- storyboard_json 必须按镜头列出 scene_id、start、duration、画面描述、主标题、字幕、配音、动效、转场、所需素材。
- subtitle_srt 必须覆盖完整时间轴，不要只给摘要字幕。
- voiceover_script 要按镜头自然可读，不能只是页面文字堆叠。
- 如果来源是 HTML/PPT 页面，也必须重组为视频分镜，不能只录屏或把页面直接翻页。

【HyperFrames skill 内置规则】
- 先定义视觉身份：palette、typography、motion、transition，不允许默认灰蓝渐变凑数。
- 先做每个 scene 的静态 hero frame 布局，再用 gsap.from() 做入场；除最终场景外，不要在转场前把上个场景淡出成空画面。
- 字体：标题至少 60px，正文至少 20px，数据标签至少 16px；数字列使用 tabular-nums。
- 多场景必须有转场，不允许跳切。转场可以是 crossfade、wipe、reveal、shader-like mask，但必须写进 composition_html/timeline。
- 长视频必须按 scene/segment 设计，不得把 6 分钟内容压成一个静态页面。
- 输出前自检：lint_contract、layout_contract、timeline_contract、audio_caption_contract 都应可解释。

【任务模式】
${props.mode}

【视频模板】
${props.videoTemplateId || 'auto'}

【用途】
${props.purposeId || 'auto'}

【风格】
${props.styleId || 'auto'}

【画幅方向】
${props.orientation || 'landscape'}

【视频规格】
${props.renderSize}

【帧率】
${props.fps || 30}

【目标时长】
${props.durationSeconds} 秒

【配音模式】
${props.voiceoverMode || 'script_only'}

【输出语言】
${props.language}

【来源 HTML 页面】
${props.sourcePageUrl || '无'}

【来源视频】
${props.sourceVideoUrl || '无'}

【素材/脚本/约束】
${props.assets || '无'}

【额外要求】
${props.extraRequirements || '无'}

【用户需求】
${props.brief}
`.trim();
}
