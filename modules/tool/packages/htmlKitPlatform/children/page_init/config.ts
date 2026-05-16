import { defineTool } from '@tool/type';
import {
  FlowNodeInputTypeEnum,
  FlowNodeOutputTypeEnum,
  WorkflowIOValueTypeEnum
} from '@tool/type/ipolloos';

export default defineTool({
  name: {
    'zh-CN': 'HTML · 页面骨架初始化',
    en: 'HTML · page scaffold'
  },
  description: {
    'zh-CN':
      '生成可独立打开的单文件 HTML5 起点：`<meta viewport>`、`:root` 主题色**、`<main>`**。可选 **favicon**：`https` 图或 **emoji**（data URL）。适合小应用 / 落地页；后续用 icon_snippet / merge_fragments 拼装。',
    en: 'Starter single-file HTML5: viewport meta, :root theme CSS variables, main. Optional favicon via https image or emoji data URL.'
  },
  toolDescription:
    '【分步/空壳】只要骨架、占位段或工作流拆步时用。常规「标题+正文一页出」请改用 fast_html_page。参数：page_title、可选 main_inner_html（勿 script）、三色、favicon。极长正文用 merge_fragments 分块。默认自动发布：生成后上传平台存储并在对话中给出 page_url。',
  versionList: [
    {
      value: '1.3.0',
      description: 'page_html + 默认自动发布；与 fast_html_page 对齐',
      inputs: [
        {
          key: 'page_title',
          label: '页面标题（写入 <title>）',
          valueType: WorkflowIOValueTypeEnum.string,
          renderTypeList: [FlowNodeInputTypeEnum.reference, FlowNodeInputTypeEnum.input],
          required: true,
          toolDescription: '浏览器标签与无障碍页名'
        },
        {
          key: 'heading_h1',
          label: '主标题 H1（可选，默认沿用标题）',
          valueType: WorkflowIOValueTypeEnum.string,
          renderTypeList: [FlowNodeInputTypeEnum.reference, FlowNodeInputTypeEnum.input],
          toolDescription: '留空则用 page_title'
        },
        {
          key: 'lang',
          label: '文档语言 lang',
          valueType: WorkflowIOValueTypeEnum.string,
          renderTypeList: [FlowNodeInputTypeEnum.reference, FlowNodeInputTypeEnum.select],
          defaultValue: 'zh-CN',
          list: [
            { label: 'zh-CN', value: 'zh-CN' },
            { label: 'en', value: 'en' }
          ],
          toolDescription: '<html lang=…>'
        },
        {
          key: 'color_primary',
          label: '主色 primary（#RRGGBB）',
          valueType: WorkflowIOValueTypeEnum.string,
          renderTypeList: [FlowNodeInputTypeEnum.reference, FlowNodeInputTypeEnum.input],
          defaultValue: '#0ea5e9',
          toolDescription: 'CSS：--primary'
        },
        {
          key: 'color_surface',
          label: '背景 surface',
          valueType: WorkflowIOValueTypeEnum.string,
          renderTypeList: [FlowNodeInputTypeEnum.reference, FlowNodeInputTypeEnum.input],
          defaultValue: '#f8fafc',
          toolDescription: '--surface'
        },
        {
          key: 'color_text',
          label: '正文 text',
          valueType: WorkflowIOValueTypeEnum.string,
          renderTypeList: [FlowNodeInputTypeEnum.reference, FlowNodeInputTypeEnum.input],
          defaultValue: '#0f172a',
          toolDescription: '--text'
        },
        {
          key: 'favicon_mode',
          label: 'Favicon',
          valueType: WorkflowIOValueTypeEnum.string,
          renderTypeList: [FlowNodeInputTypeEnum.reference, FlowNodeInputTypeEnum.select],
          defaultValue: 'none',
          list: [
            { label: 'none', value: 'none' },
            { label: 'https URL', value: 'url' },
            { label: 'emoji', value: 'emoji' }
          ],
          toolDescription: '网址图标：<link rel=icon>'
        },
        {
          key: 'favicon_url',
          label: 'Favicon HTTPS 图片地址',
          valueType: WorkflowIOValueTypeEnum.string,
          renderTypeList: [FlowNodeInputTypeEnum.reference, FlowNodeInputTypeEnum.input],
          toolDescription: 'favicon_mode=url 时使用，须 https://'
        },
        {
          key: 'favicon_emoji',
          label: 'Favicon Emoji',
          valueType: WorkflowIOValueTypeEnum.string,
          renderTypeList: [FlowNodeInputTypeEnum.reference, FlowNodeInputTypeEnum.input],
          toolDescription: 'favicon_mode=emoji 时使用，单个 emoji'
        },
        {
          key: 'main_inner_html',
          label: 'main 内初始 HTML（可选）',
          valueType: WorkflowIOValueTypeEnum.string,
          renderTypeList: [FlowNodeInputTypeEnum.reference, FlowNodeInputTypeEnum.textarea],
          toolDescription: '勿含 script；用于首屏占位'
        },
        {
          key: 'include_lucide_cdn_hint',
          label: '附带 Lucide CDN 注释（不写死外链）',
          valueType: WorkflowIOValueTypeEnum.boolean,
          renderTypeList: [FlowNodeInputTypeEnum.reference, FlowNodeInputTypeEnum.switch],
          defaultValue: false,
          toolDescription: '为真时在注释中提示可用 unpkg/Skypack 按需引入图标'
        },
        {
          key: 'page_output_mode',
          label: '页面输出模式',
          description:
            '默认自动发布：上传平台对象存储并在对话中返回可访问链接；选 raw_html 则仅返回 HTML 字符串。',
          valueType: WorkflowIOValueTypeEnum.string,
          renderTypeList: [FlowNodeInputTypeEnum.select],
          defaultValue: 'auto_publish',
          list: [
            { label: '自动发布到 iPolloOS', value: 'auto_publish' },
            { label: '发布到资源中心（HTTP）', value: 'resource_center' },
            { label: '返回 HTML 字符串', value: 'raw_html' }
          ],
          toolDescription: '保持默认即可在生成后自动上传并得到链接。'
        }
      ],
      outputs: [
        {
          valueType: WorkflowIOValueTypeEnum.string,
          key: 'page_html',
          label: '页面 HTML',
          description: '与 full_html 相同；供平台自动发布使用。'
        },
        {
          valueType: WorkflowIOValueTypeEnum.string,
          key: 'page_url',
          label: '页面公开链接',
          description: '自动发布或资源中心模式下由平台写入；raw_html 时为空。'
        },
        {
          valueType: WorkflowIOValueTypeEnum.string,
          key: 'full_html',
          label: '完整 HTML 文档'
        },
        { valueType: WorkflowIOValueTypeEnum.string, key: 'summary', label: '摘要' },
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
