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
    'zh-CN':
      '让 AI 根据需求、HTML 页面或视频素材生成 HyperFrames composition/manifest，负责剪辑决策、字幕、配音、转场和 H5 叠加编排。',
    en: 'Generate a HyperFrames composition/manifest from a brief, HTML page, or source video.'
  },
  toolDescription:
    '视频创作节点。AI 在这里决定怎么剪辑、怎么配音、怎么转场、怎么加字幕、怎么叠加 H5，并输出 composition_html / manifest_json。渲染请交给「HyperFrames · 视频渲染」。',
  versionList: [
    {
      value: '0.1.0',
      description: 'Generate HyperFrames composition and render manifest',
      inputs: [
        {
          key: 'brief',
          label: '视频需求',
          valueType: WorkflowIOValueTypeEnum.string,
          renderTypeList: [FlowNodeInputTypeEnum.reference, FlowNodeInputTypeEnum.textarea],
          required: true,
          toolDescription:
            '描述你想要的视频结果，例如把 PPT 做成 60 秒解说视频、给视频加字幕和 H5 标注、做产品片头等。'
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
