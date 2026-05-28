export function buildVideoProjectPrompt(props: {
  brief: string;
  mode: string;
  sourcePageUrl?: string;
  sourceVideoUrl?: string;
  assets?: string;
  renderSize: string;
  durationSeconds: number;
  language: string;
}) {
  return `
你是 HyperFrames 视频工程导演和前端动画工程师。请根据用户需求生成一个可渲染的视频工程。

【输出格式】
只允许返回 JSON，不要输出 Markdown，不要解释。
JSON 必须包含:
{
  "composition_html": "完整 HyperFrames 单文件 HTML",
  "manifest_json": {...},
  "render_profile": "hyperframes|slides|webpage|ebook|video_edit",
  "summary": "一句话说明"
}

【HyperFrames 工程要求】
- composition_html 必须是完整 HTML 文档，以 <!DOCTYPE html> 开头。
- 顶层必须有 data-composition-id、data-width、data-height。
- 所有片段必须使用 data-start、data-duration、data-track-index。
- 时间轴使用 GSAP，timeline 必须 paused，并注册到 window.__timelines。
- 多场景必须有转场；每个场景必须有入场动画。
- 不要使用 Math.random、Date.now、repeat:-1 或异步构建 timeline。
- 视频素材必须 muted playsinline；音频必须单独 audio track。
- 字幕、配音、转场、剪辑点、H5 叠加，都写进 composition_html 或 manifest_json，不要留给渲染器猜。

【任务模式】
${props.mode}

【视频规格】
${props.renderSize}

【目标时长】
${props.durationSeconds} 秒

【输出语言】
${props.language}

【来源 HTML 页面】
${props.sourcePageUrl || '无'}

【来源视频】
${props.sourceVideoUrl || '无'}

【素材/脚本/约束】
${props.assets || '无'}

【用户需求】
${props.brief}
`.trim();
}
