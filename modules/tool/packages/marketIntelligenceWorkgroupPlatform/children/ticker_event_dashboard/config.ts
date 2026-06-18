import { defineTool } from '@tool/type';
import {
  FlowNodeInputTypeEnum,
  FlowNodeOutputTypeEnum,
  WorkflowIOValueTypeEnum
} from '@tool/type/ipolloos';

export default defineTool({
  name: {
    'zh-CN': '单股事件 · 复盘看板',
    en: 'Ticker Event · dashboard'
  },
  description: {
    'zh-CN': '把单个股票的异动、财报、新闻、SEC、资金事件渲染成稳定 HTML 复盘页。',
    en: 'Render one ticker event, earnings, news, SEC, and flow evidence into a stable HTML review page.'
  },
  toolDescription:
    '用于单股票异动复盘。上游 Agent 负责汇总行情、财报、新闻、SEC 和资金插件结果；本工具只按固定金融模板渲染，不做买卖建议。',
  runtime: {
    kind: 'execute',
    execute: {
      riskLevel: 'read'
    }
  },
  versionList: [
    {
      value: '0.1.0',
      description: '稳定的单股事件复盘看板',
      inputs: [
        {
          key: 'report_json',
          label: '结构化单股报告 JSON',
          required: true,
          valueType: WorkflowIOValueTypeEnum.string,
          renderTypeList: [FlowNodeInputTypeEnum.textarea, FlowNodeInputTypeEnum.reference],
          toolDescription:
            '必填。建议包含 title、summary、signals/events、sections、sources、dataGaps。不要传自然语言需求或 HTML。'
        },
        {
          key: 'prepared_for',
          label: '报告对象',
          valueType: WorkflowIOValueTypeEnum.string,
          renderTypeList: [FlowNodeInputTypeEnum.input, FlowNodeInputTypeEnum.reference],
          required: false,
          defaultValue: ''
        },
        {
          key: 'report_date',
          label: '报告日期',
          valueType: WorkflowIOValueTypeEnum.string,
          renderTypeList: [FlowNodeInputTypeEnum.input, FlowNodeInputTypeEnum.reference],
          required: false,
          defaultValue: ''
        },
        {
          key: 'page_output_mode',
          label: '页面输出模式',
          valueType: WorkflowIOValueTypeEnum.string,
          renderTypeList: [FlowNodeInputTypeEnum.select],
          defaultValue: 'auto_publish',
          list: [
            { label: '自动发布到 iPolloOS', value: 'auto_publish' },
            { label: '发布到资源中心（HTTP）', value: 'resource_center' },
            { label: '返回 HTML 字符串', value: 'raw_html' }
          ]
        }
      ],
      outputs: [
        { valueType: WorkflowIOValueTypeEnum.string, key: 'page_html', label: '页面 HTML' },
        { valueType: WorkflowIOValueTypeEnum.string, key: 'page_url', label: '页面公开链接' },
        { valueType: WorkflowIOValueTypeEnum.string, key: 'page_cover', label: '页面卡片' },
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
