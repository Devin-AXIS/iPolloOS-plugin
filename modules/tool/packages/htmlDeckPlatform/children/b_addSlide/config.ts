import { defineTool } from '@tool/type';
import {
  FlowNodeInputTypeEnum,
  FlowNodeOutputTypeEnum,
  WorkflowIOValueTypeEnum
} from '@tool/type/ipolloos';
import { themeGuideForAgent, themeSelectList } from '../../lib/themes';

export default defineTool({
  name: {
    'zh-CN': '幻灯片 · 添加一页',
    en: 'Deck · add slide'
  },
  description: {
    'zh-CN':
      '主工具：选主题后逐页添加。五套固定色组（花叔+归藏），图标/图表/版式由插件渲染，智能体只填内容与版式。',
    en: 'Add slides with a fixed theme pack; icons and charts follow theme colors automatically.'
  },
  toolDescription: `【反复调用】首次 deck_state 留空 + deck_title + theme_id（五选一，不填则由你判断：${themeGuideForAgent()}）。每页：layout_id、title、body（要点每行一条）。图表页另填 chart_data；配图填 image_url；流程图填 mermaid_code。完成后「导出网页」。图标颜色无需设置。`,
  versionList: [
    {
      value: '5.0.0',
      description: 'Minimal inputs; themed icons built-in',
      inputs: [
        {
          key: 'deck_state',
          label: 'deck_state',
          valueType: WorkflowIOValueTypeEnum.string,
          renderTypeList: [FlowNodeInputTypeEnum.reference, FlowNodeInputTypeEnum.textarea],
          toolDescription: '上一页返回；首次留空'
        },
        {
          key: 'deck_title',
          label: '演示标题',
          valueType: WorkflowIOValueTypeEnum.string,
          renderTypeList: [FlowNodeInputTypeEnum.reference, FlowNodeInputTypeEnum.input],
          toolDescription: '仅首次必填'
        },
        {
          key: 'theme_id',
          label: '主题（五选一）',
          valueType: WorkflowIOValueTypeEnum.string,
          renderTypeList: [FlowNodeInputTypeEnum.select, FlowNodeInputTypeEnum.reference],
          list: themeSelectList(),
          toolDescription: '仅首次生效；整套色组+图标+图表同色，勿自定义 hex'
        },
        {
          key: 'layout_id',
          label: '版式',
          valueType: WorkflowIOValueTypeEnum.string,
          renderTypeList: [FlowNodeInputTypeEnum.select, FlowNodeInputTypeEnum.reference],
          required: true,
          list: [
            { label: 'cover', value: 'cover' },
            { label: 'section', value: 'section' },
            { label: 'content', value: 'content' },
            { label: 'big_number', value: 'big_number' },
            { label: 'comparison', value: 'comparison' },
            { label: 'timeline', value: 'timeline' },
            { label: 'matrix', value: 'matrix' },
            { label: 'chart_focus', value: 'chart_focus' },
            { label: 'chart_story', value: 'chart_story' },
            { label: 'chart_compare', value: 'chart_compare' },
            { label: 'split_image', value: 'split_image' },
            { label: 'quote', value: 'quote' },
            { label: 'mermaid_focus', value: 'mermaid_focus' },
            { label: 'closing', value: 'closing' }
          ],
          toolDescription: '由你根据叙事选择'
        },
        {
          key: 'title',
          label: '标题',
          valueType: WorkflowIOValueTypeEnum.string,
          renderTypeList: [FlowNodeInputTypeEnum.reference, FlowNodeInputTypeEnum.input],
          toolDescription: '本页标题'
        },
        {
          key: 'body',
          label: '正文要点',
          valueType: WorkflowIOValueTypeEnum.string,
          renderTypeList: [FlowNodeInputTypeEnum.reference, FlowNodeInputTypeEnum.textarea],
          toolDescription: '每行一条；对比/时间线/矩阵也用它；图标颜色自动跟主题'
        },
        {
          key: 'chart_data',
          label: '图表数据',
          valueType: WorkflowIOValueTypeEnum.string,
          renderTypeList: [FlowNodeInputTypeEnum.reference, FlowNodeInputTypeEnum.textarea],
          placeholder: '2024,32\n2025,55\n---\n2024,12',
          toolDescription: 'chart_* 必填；双图对比用 --- 分隔两段数据'
        },
        {
          key: 'image_url',
          label: '图片 URL',
          valueType: WorkflowIOValueTypeEnum.string,
          renderTypeList: [FlowNodeInputTypeEnum.reference, FlowNodeInputTypeEnum.input],
          toolDescription: 'split_image 必填 https'
        },
        {
          key: 'mermaid_code',
          label: 'Mermaid',
          valueType: WorkflowIOValueTypeEnum.string,
          renderTypeList: [FlowNodeInputTypeEnum.reference, FlowNodeInputTypeEnum.textarea],
          toolDescription: 'mermaid_focus 必填'
        }
      ],
      outputs: [
        { valueType: WorkflowIOValueTypeEnum.string, key: 'deck_state', label: 'deck_state' },
        { valueType: WorkflowIOValueTypeEnum.number, key: 'slide_count', label: '页数' },
        { valueType: WorkflowIOValueTypeEnum.string, key: 'theme_id', label: '主题 id' },
        { valueType: WorkflowIOValueTypeEnum.string, key: 'theme_label', label: '主题名' },
        { valueType: WorkflowIOValueTypeEnum.string, key: 'summary', label: '摘要' },
        {
          type: FlowNodeOutputTypeEnum.error,
          valueType: WorkflowIOValueTypeEnum.string,
          key: 'system_error',
          label: '错误'
        }
      ]
    }
  ]
});
