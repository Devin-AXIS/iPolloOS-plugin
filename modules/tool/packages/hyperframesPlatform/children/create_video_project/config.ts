import { defineTool } from '@tool/type';
import {
  FlowNodeInputTypeEnum,
  FlowNodeOutputTypeEnum,
  WorkflowIOValueTypeEnum
} from '@tool/type/ipolloos';
import {
  listVideoPurposeOptions,
  listVideoStyleOptions,
  listVideoTemplateOptions
} from '../../lib/videoTemplates';

export default defineTool({
  name: {
    'zh-CN': 'HyperFrames · 生成视频工程',
    en: 'HyperFrames · create video project'
  },
  description: {
    'zh-CN': '按视频用途、视觉风格、横竖屏、分镜、字幕和配音稿校验完整 HyperFrames 视频工程。',
    en: 'Validate a complete HyperFrames video project by purpose, style, orientation, storyboard, subtitles and voiceover script.'
  },
  toolDescription:
    '视频工程节点。上游 AI 大脑应先按用途 purpose_id、视觉风格 style_id、横竖屏、时长、帧率决定分镜、配音、转场、字幕、H5 叠加，并生成完整 composition_html / manifest_json / storyboard_json / subtitle_srt / voiceover_script，再调用本工具。本工具不调用 AI，只校验和规范化输出。渲染请交给「HyperFrames · 视频渲染」。',
  versionList: [
    {
      value: '0.3.1',
      description:
        'HyperFrames skill contract validation with Chinese aliases, orientation-safe templates, storyboard, subtitles and voiceover fields',
      inputs: [
        {
          key: 'brief',
          label: '视频需求',
          valueType: WorkflowIOValueTypeEnum.string,
          renderTypeList: [FlowNodeInputTypeEnum.reference, FlowNodeInputTypeEnum.textarea],
          required: true,
          toolDescription:
            '视频需求摘要，用于追踪和默认 manifest；真正的视频工程内容必须由上游 AI 大脑放入 composition_html / manifest_json。'
        },
        {
          key: 'video_template_id',
          label: '视频模板',
          valueType: WorkflowIOValueTypeEnum.string,
          renderTypeList: [FlowNodeInputTypeEnum.reference, FlowNodeInputTypeEnum.select],
          defaultValue: 'product-launch-landscape',
          list: listVideoTemplateOptions(),
          toolDescription:
            '视频模板决定默认用途、视觉风格、横竖屏和分镜结构。产品发布选 product-launch-landscape，研究报告选 research-report-briefing，架构讲解选 architecture-deep-dive，竖屏短视频选 social-feature-reel 或 news-reel-portrait。'
        },
        {
          key: 'purpose_id',
          label: '视频用途',
          valueType: WorkflowIOValueTypeEnum.string,
          renderTypeList: [FlowNodeInputTypeEnum.reference, FlowNodeInputTypeEnum.select],
          list: listVideoPurposeOptions(),
          toolDescription:
            '视频用途决定内容结构和分镜节奏。产品介绍选 product-intro，资讯解读选 news-briefing，研究报告视频版选 research-briefing，架构方案选 architecture-explainer，功能演示选 feature-demo。'
        },
        {
          key: 'style_id',
          label: '视觉风格',
          valueType: WorkflowIOValueTypeEnum.string,
          renderTypeList: [FlowNodeInputTypeEnum.reference, FlowNodeInputTypeEnum.select],
          list: listVideoStyleOptions(),
          toolDescription:
            '视觉风格决定字体、配色、构图、动效和图表语言。可选杂志风、科技产品风、咨询报告风、发布会 Keynote 风、数据新闻风、竖屏社媒风。'
        },
        {
          key: 'orientation',
          label: '画幅方向',
          valueType: WorkflowIOValueTypeEnum.string,
          renderTypeList: [FlowNodeInputTypeEnum.reference, FlowNodeInputTypeEnum.select],
          defaultValue: 'landscape',
          list: [
            { label: '横屏 16:9', value: 'landscape' },
            { label: '竖屏 9:16', value: 'portrait' }
          ],
          toolDescription: '视频主画幅方向。横屏用于产品/资讯/方案说明，竖屏用于短视频和社媒内容。'
        },
        {
          key: 'composition_html',
          label: 'HyperFrames 完整 HTML',
          valueType: WorkflowIOValueTypeEnum.string,
          renderTypeList: [FlowNodeInputTypeEnum.hidden],
          required: true,
          toolDescription:
            '内部工程字段。上游 AI 大脑生成的完整 HyperFrames 单文件 HTML。必须包含 <html>...</html>，不要传原始需求或 Markdown。'
        },
        {
          key: 'manifest_json',
          label: '视频工程 Manifest',
          valueType: WorkflowIOValueTypeEnum.string,
          renderTypeList: [FlowNodeInputTypeEnum.hidden],
          toolDescription:
            '内部工程字段。上游 AI 大脑生成的视频工程 JSON，必须包含 schema_version、purpose_id、style_id、orientation、fps、duration_seconds、timeline、audio、assets、render。'
        },
        {
          key: 'storyboard_json',
          label: '分镜脚本 JSON',
          valueType: WorkflowIOValueTypeEnum.string,
          renderTypeList: [FlowNodeInputTypeEnum.hidden],
          toolDescription:
            '内部工程字段。上游 AI 大脑生成的分镜脚本。每个镜头需要包含 scene_id、start、duration、画面描述、主标题、字幕、配音、动效、转场、所需素材。'
        },
        {
          key: 'voiceover_script',
          label: '配音稿',
          valueType: WorkflowIOValueTypeEnum.string,
          renderTypeList: [FlowNodeInputTypeEnum.hidden],
          toolDescription:
            '内部工程字段。完整配音稿。即使暂不生成音频，也应提供自然口播稿，便于后续 TTS 或人工录音。'
        },
        {
          key: 'subtitle_srt',
          label: '字幕 SRT',
          valueType: WorkflowIOValueTypeEnum.string,
          renderTypeList: [FlowNodeInputTypeEnum.hidden],
          toolDescription: '内部工程字段。完整时间轴字幕，覆盖整个视频，不要只给摘要。'
        },
        {
          key: 'asset_plan_json',
          label: '素材计划 JSON',
          valueType: WorkflowIOValueTypeEnum.string,
          renderTypeList: [FlowNodeInputTypeEnum.hidden],
          toolDescription: '内部工程字段。图片、视频、图标、Logo、数据图表、界面截图等素材计划。'
        },
        {
          key: 'render_profile',
          label: '渲染配置',
          valueType: WorkflowIOValueTypeEnum.string,
          renderTypeList: [FlowNodeInputTypeEnum.hidden]
        },
        {
          key: 'mode',
          label: '工程类型',
          valueType: WorkflowIOValueTypeEnum.string,
          renderTypeList: [FlowNodeInputTypeEnum.hidden],
          defaultValue: 'hyperframes_render',
          list: [
            { label: 'HyperFrames 动画视频', value: 'hyperframes_render' },
            { label: 'HTML/PPT 转视频工程', value: 'html_to_video' },
            { label: '视频剪辑工程', value: 'video_edit' },
            { label: '视频 + H5 叠加工程', value: 'h5_overlay_video' }
          ]
        },
        {
          key: 'source_page_url',
          label: '来源 HTML 页面 URL',
          valueType: WorkflowIOValueTypeEnum.string,
          renderTypeList: [FlowNodeInputTypeEnum.reference, FlowNodeInputTypeEnum.input],
          toolDescription: '可选。HTML Anything 输出的 page_url 或已有页面。'
        },
        {
          key: 'source_video_url',
          label: '来源视频 URL',
          valueType: WorkflowIOValueTypeEnum.string,
          renderTypeList: [FlowNodeInputTypeEnum.reference, FlowNodeInputTypeEnum.input],
          toolDescription: '可选。需要剪辑或叠加 H5 的原始视频。'
        },
        {
          key: 'assets',
          label: '素材/脚本/约束',
          valueType: WorkflowIOValueTypeEnum.string,
          renderTypeList: [FlowNodeInputTypeEnum.reference, FlowNodeInputTypeEnum.textarea],
          toolDescription: '可选。字幕文案、旁白稿、镜头要求、品牌色、素材 URL 列表等。'
        },
        {
          key: 'render_size',
          label: '视频规格',
          valueType: WorkflowIOValueTypeEnum.string,
          renderTypeList: [FlowNodeInputTypeEnum.reference, FlowNodeInputTypeEnum.select],
          defaultValue: 'landscape_1080p',
          list: [
            { label: '横屏 1080p（16:9）', value: 'landscape_1080p' },
            { label: '竖屏 1080p（9:16）', value: 'portrait_1080p' },
            { label: '方形 1080p（1:1）', value: 'square_1080p' },
            { label: '电影宽屏 1080p（21:9）', value: 'cinema_1080p' },
            { label: '横屏 720p 快速预览', value: 'preview_720p' }
          ]
        },
        {
          key: 'duration_seconds',
          label: '目标时长（秒）',
          valueType: WorkflowIOValueTypeEnum.number,
          renderTypeList: [FlowNodeInputTypeEnum.reference, FlowNodeInputTypeEnum.input],
          defaultValue: 60
        },
        {
          key: 'fps',
          label: '帧率',
          valueType: WorkflowIOValueTypeEnum.number,
          renderTypeList: [FlowNodeInputTypeEnum.reference, FlowNodeInputTypeEnum.input],
          defaultValue: 30,
          toolDescription: '默认 30fps。除非明确需要电影/高帧率效果，否则不要改。'
        },
        {
          key: 'voiceover_mode',
          label: '配音模式',
          valueType: WorkflowIOValueTypeEnum.string,
          renderTypeList: [FlowNodeInputTypeEnum.reference, FlowNodeInputTypeEnum.select],
          defaultValue: 'script_only',
          list: [
            { label: '无配音，仅字幕', value: 'none' },
            { label: '生成配音稿', value: 'script_only' },
            { label: '配音稿可用于 TTS', value: 'tts_ready' }
          ],
          toolDescription:
            '短期优先输出配音稿和字幕。若接入 TTS，可使用 tts_ready，并在 manifest_json.audio 中回填音频。'
        },
        {
          key: 'extra_requirements',
          label: '额外要求',
          valueType: WorkflowIOValueTypeEnum.string,
          renderTypeList: [FlowNodeInputTypeEnum.reference, FlowNodeInputTypeEnum.textarea],
          toolDescription: '品牌、字体、禁用元素、节奏、配音人设、素材限制等额外要求。'
        },
        {
          key: 'language',
          label: '输出语言',
          valueType: WorkflowIOValueTypeEnum.string,
          renderTypeList: [FlowNodeInputTypeEnum.reference, FlowNodeInputTypeEnum.select],
          defaultValue: 'zh-CN',
          list: [
            { label: '中文', value: 'zh-CN' },
            { label: 'English', value: 'en' },
            { label: '日本語', value: 'ja' },
            { label: '跟随内容', value: 'auto' }
          ]
        }
      ],
      outputs: [
        {
          valueType: WorkflowIOValueTypeEnum.string,
          key: 'composition_html',
          label: 'HyperFrames HTML'
        },
        {
          valueType: WorkflowIOValueTypeEnum.string,
          key: 'manifest_json',
          label: '视频工程 Manifest'
        },
        {
          valueType: WorkflowIOValueTypeEnum.string,
          key: 'storyboard_json',
          label: '分镜脚本'
        },
        {
          valueType: WorkflowIOValueTypeEnum.string,
          key: 'voiceover_script',
          label: '配音稿'
        },
        {
          valueType: WorkflowIOValueTypeEnum.string,
          key: 'subtitle_srt',
          label: '字幕 SRT'
        },
        {
          valueType: WorkflowIOValueTypeEnum.string,
          key: 'asset_plan_json',
          label: '素材计划'
        },
        {
          valueType: WorkflowIOValueTypeEnum.string,
          key: 'validation_report_json',
          label: 'HyperFrames 校验报告'
        },
        {
          valueType: WorkflowIOValueTypeEnum.string,
          key: 'render_profile',
          label: '渲染配置'
        },
        {
          valueType: WorkflowIOValueTypeEnum.string,
          key: 'summary',
          label: '摘要'
        },
        {
          type: FlowNodeOutputTypeEnum.error,
          valueType: WorkflowIOValueTypeEnum.string,
          key: 'system_error',
          label: '错误信息'
        }
      ]
    }
  ]
});
