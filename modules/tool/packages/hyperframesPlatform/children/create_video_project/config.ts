import { defineTool } from '@tool/type';
import {
  FlowNodeInputTypeEnum,
  FlowNodeOutputTypeEnum,
  WorkflowIOValueTypeEnum
} from '@tool/type/ipolloos';

export default defineTool({
  name: {
    'zh-CN': 'HyperFrames · 生成视频工程',
    en: 'HyperFrames · create video project'
  },
  description: {
    'zh-CN': '校验上游 AI 大脑生成的 HyperFrames composition/manifest，用于后续视频渲染。',
    en: 'Validate an upstream-AI-authored HyperFrames composition/manifest for rendering.'
  },
  toolDescription:
    '视频工程节点。上游 AI 大脑应先决定剪辑、配音、转场、字幕、H5 叠加，并生成完整 composition_html / manifest_json，再调用本工具。本工具不调用 AI，只校验和规范化输出。渲染请交给「HyperFrames · 视频渲染」。',
  versionList: [
    {
      value: '0.1.0',
      description: 'Validate upstream AI generated HyperFrames composition and render manifest',
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
          key: 'composition_html',
          label: 'HyperFrames 完整 HTML',
          valueType: WorkflowIOValueTypeEnum.string,
          renderTypeList: [FlowNodeInputTypeEnum.reference, FlowNodeInputTypeEnum.textarea],
          required: true,
          toolDescription:
            '上游 AI 大脑生成的完整 HyperFrames 单文件 HTML。必须包含 <html>...</html>，不要传原始需求或 Markdown。'
        },
        {
          key: 'manifest_json',
          label: '视频工程 Manifest',
          valueType: WorkflowIOValueTypeEnum.string,
          renderTypeList: [FlowNodeInputTypeEnum.reference, FlowNodeInputTypeEnum.textarea],
          toolDescription:
            '上游 AI 大脑生成的视频工程 JSON，包含视频类型、画幅、时长、来源素材、字幕、配音、转场等渲染信息。'
        },
        {
          key: 'render_profile',
          label: '渲染配置',
          valueType: WorkflowIOValueTypeEnum.string,
          renderTypeList: [FlowNodeInputTypeEnum.reference, FlowNodeInputTypeEnum.input],
          toolDescription: '可选。上游 AI 大脑指定的渲染 profile；留空使用 hyperframes。'
        },
        {
          key: 'mode',
          label: '工程类型',
          valueType: WorkflowIOValueTypeEnum.string,
          renderTypeList: [FlowNodeInputTypeEnum.reference, FlowNodeInputTypeEnum.select],
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
