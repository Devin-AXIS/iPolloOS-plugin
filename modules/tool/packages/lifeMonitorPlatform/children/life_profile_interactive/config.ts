import { defineTool } from '@tool/type';
import {
  FlowNodeInputTypeEnum,
  FlowNodeOutputTypeEnum,
  WorkflowIOValueTypeEnum
} from '@tool/type/ipolloos';

export default defineTool({
  name: {
    'zh-CN': '健康档案 · 交互填写',
    en: 'Health profile · interactive form'
  },
  description: {
    'zh-CN': '输出插件内置的健康档案表单页面，等待用户提交后把结构化字段返回工作流。',
    en: 'Render a built-in health profile form and return structured submitted fields to the workflow.'
  },
  toolDescription:
    '当健康档案缺失时调用。页面和字段由插件内置，不需要 AI 临时写 HTML。会同时输出 page_cover，让聊天端卡片直接露出需要填写的核心字段。提交后输出 age、sex、height_cm、weight_kg、health_conditions、allergies、goal_primary、goal_notes，可接 life_profile_pack。',
  versionList: [
    {
      value: '1.0.0',
      description: '插件内置健康档案交互表单',
      inputs: [
        {
          key: 'page_title',
          label: '页面标题',
          valueType: WorkflowIOValueTypeEnum.string,
          renderTypeList: [FlowNodeInputTypeEnum.reference, FlowNodeInputTypeEnum.input],
          defaultValue: '完善健康档案',
          toolDescription: '可改标题；不影响字段结构'
        },
        {
          key: 'accent_color',
          label: '主题色',
          valueType: WorkflowIOValueTypeEnum.string,
          renderTypeList: [FlowNodeInputTypeEnum.reference, FlowNodeInputTypeEnum.input],
          defaultValue: '#10b981',
          toolDescription: 'HEX 颜色，如 #10b981'
        },
        {
          key: 'page_output_mode',
          label: '页面输出模式',
          valueType: WorkflowIOValueTypeEnum.string,
          renderTypeList: [FlowNodeInputTypeEnum.reference, FlowNodeInputTypeEnum.select],
          defaultValue: 'auto_publish',
          list: [
            { label: '自动发布页面', value: 'auto_publish' },
            { label: '资源中心发布', value: 'resource_center' },
            { label: '只返回 HTML', value: 'raw_html' }
          ]
        }
      ],
      outputs: [
        {
          valueType: WorkflowIOValueTypeEnum.object,
          key: 'interactive_html_result',
          label: '提交结果'
        },
        { valueType: WorkflowIOValueTypeEnum.string, key: 'age', label: '年龄' },
        { valueType: WorkflowIOValueTypeEnum.string, key: 'sex', label: '性别' },
        { valueType: WorkflowIOValueTypeEnum.string, key: 'height_cm', label: '身高 cm' },
        { valueType: WorkflowIOValueTypeEnum.string, key: 'weight_kg', label: '体重 kg' },
        { valueType: WorkflowIOValueTypeEnum.string, key: 'health_conditions', label: '健康状况' },
        { valueType: WorkflowIOValueTypeEnum.string, key: 'allergies', label: '过敏 / 忌口' },
        { valueType: WorkflowIOValueTypeEnum.string, key: 'goal_primary', label: '主要目标' },
        { valueType: WorkflowIOValueTypeEnum.string, key: 'goal_notes', label: '目标补充说明' },
        { valueType: WorkflowIOValueTypeEnum.string, key: 'page_html', label: '页面 HTML' },
        { valueType: WorkflowIOValueTypeEnum.string, key: 'page_url', label: '页面链接' },
        {
          valueType: WorkflowIOValueTypeEnum.string,
          key: 'page_cover',
          label: '页面卡片',
          description: 'JSON 字符串。聊天端用它渲染健康档案字段预览卡片。'
        },
        {
          valueType: WorkflowIOValueTypeEnum.boolean,
          key: 'interactive_html',
          label: '交互页标记'
        },
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
