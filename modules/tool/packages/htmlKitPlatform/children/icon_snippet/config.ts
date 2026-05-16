import { defineTool } from '@tool/type';
import {
  FlowNodeInputTypeEnum,
  FlowNodeOutputTypeEnum,
  WorkflowIOValueTypeEnum
} from '@tool/type/ipolloos';

const presetLabels = [
  'arrow-right',
  'calendar',
  'chart-bar',
  'check',
  'chevron-right',
  'clock',
  'cross',
  'file-text',
  'globe',
  'heart',
  'home',
  'image',
  'info',
  'link-external',
  'mail',
  'menu',
  'minus',
  'plus',
  'search',
  'settings',
  'sparkles',
  'star',
  'user',
  'warning'
].map((v) => ({ label: v, value: v }));

export default defineTool({
  name: {
    'zh-CN': 'HTML · 图标片段',
    en: 'HTML · icon snippet'
  },
  description: {
    'zh-CN':
      '输出可复制进 HTML 的 **内联图标**：内置多套 stroke SVG（`currentColor`），或使用 **HTTPS 图片** `<img>`、或经校验的 **自定义 SVG**。**HTML 完全支持图标**：站内联、外链、本站静态路径、`data:image` 皆可。',
    en: 'Inline icon markup for HTML: curated SVG sprites (currentColor), or https img tag, or validated custom SVG. Icons are first-class in HTML.'
  },
  toolDescription:
    '【按需】需要行内图标再调用。mode=preset 最省事：填 preset_icon；或 custom_url（https 图）、custom_svg（整段 svg，禁 script/on*）。把返回的 markup 粘贴进 fast_html_page 的 main_inner_html。',
  versionList: [
    {
      value: '1.0.0',
      description: 'preset + img + sanitized svg',
      inputs: [
        {
          key: 'mode',
          label: '来源',
          valueType: WorkflowIOValueTypeEnum.string,
          renderTypeList: [FlowNodeInputTypeEnum.reference, FlowNodeInputTypeEnum.select],
          required: true,
          list: [
            { label: '内置 SVG', value: 'preset' },
            { label: 'HTTPS 图片', value: 'custom_url' },
            { label: '自定义 SVG', value: 'custom_svg' }
          ],
          defaultValue: 'preset',
          toolDescription: 'preset 最稳；外链用 custom_url'
        },
        {
          key: 'preset_icon',
          label: '内置图标键名',
          valueType: WorkflowIOValueTypeEnum.string,
          renderTypeList: [FlowNodeInputTypeEnum.reference, FlowNodeInputTypeEnum.select],
          list: presetLabels,
          toolDescription: 'mode=preset 时必填其一'
        },
        {
          key: 'custom_url',
          label: '图标 HTTPS URL',
          valueType: WorkflowIOValueTypeEnum.string,
          renderTypeList: [FlowNodeInputTypeEnum.reference, FlowNodeInputTypeEnum.input],
          toolDescription: 'mode=custom_url'
        },
        {
          key: 'custom_svg',
          label: '自定义 SVG 源码',
          valueType: WorkflowIOValueTypeEnum.string,
          renderTypeList: [FlowNodeInputTypeEnum.reference, FlowNodeInputTypeEnum.textarea],
          toolDescription: 'mode=custom_svg；须含 <svg 根标签'
        },
        {
          key: 'size_px',
          label: '显示大小（像素，宽=高）',
          valueType: WorkflowIOValueTypeEnum.number,
          renderTypeList: [FlowNodeInputTypeEnum.reference, FlowNodeInputTypeEnum.numberInput],
          defaultValue: 24,
          toolDescription: '映射为 width/height 或 font-size'
        },
        {
          key: 'aria_label',
          label: '无障碍标签 aria-label（建议）',
          valueType: WorkflowIOValueTypeEnum.string,
          renderTypeList: [FlowNodeInputTypeEnum.reference, FlowNodeInputTypeEnum.input],
          toolDescription: '装饰性图标可留空；功能性请填写'
        }
      ],
      outputs: [
        { valueType: WorkflowIOValueTypeEnum.string, key: 'markup', label: 'HTML 片段' },
        { valueType: WorkflowIOValueTypeEnum.string, key: 'summary', label: '说明' },
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
