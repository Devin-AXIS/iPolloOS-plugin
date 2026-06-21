import { defineTool } from '@tool/type';
import {
  FlowNodeInputTypeEnum,
  FlowNodeOutputTypeEnum,
  WorkflowIOValueTypeEnum
} from '@tool/type/ipolloos';

export default defineTool({
  name: {
    'zh-CN': '生成监控事件卡片',
    en: 'Create monitor event card'
  },
  description: {
    'zh-CN': '把股票、人物、机构或主题变化整理成 MarketMonitorEventCard。',
    en: 'Package ticker, person, institution, or theme changes into a MarketMonitorEventCard.'
  },
  toolDescription:
    '用于官方美股监控推送和监控历史。调用前先使用行情、SEC、新闻、资金或人物机构插件取数；本工具只生成原生 app_card 和 market_signal_event/market_delivery_record 写入记录。',
  runtime: {
    kind: 'execute',
    execute: {
      riskLevel: 'read'
    }
  },
  versionList: [
    {
      value: '1.2.4',
      description: '生成原生美股监控事件卡片',
      inputs: [
        {
          key: 'target_json',
          label: '监控对象 JSON',
          valueType: WorkflowIOValueTypeEnum.string,
          renderTypeList: [FlowNodeInputTypeEnum.textarea, FlowNodeInputTypeEnum.reference],
          required: true,
          toolDescription:
            'JSON 对象，包含 targetType/targetKey/name/symbol，例如 {"targetType":"person","targetKey":"elon_musk","name":"Elon Musk"}。'
        },
        {
          key: 'event_type',
          label: '事件类型',
          valueType: WorkflowIOValueTypeEnum.string,
          renderTypeList: [FlowNodeInputTypeEnum.input, FlowNodeInputTypeEnum.reference],
          required: true
        },
        {
          key: 'change_summary',
          label: '关键变化',
          valueType: WorkflowIOValueTypeEnum.string,
          renderTypeList: [FlowNodeInputTypeEnum.textarea, FlowNodeInputTypeEnum.reference],
          required: true
        },
        {
          key: 'impacted_tickers',
          label: '影响股票',
          valueType: WorkflowIOValueTypeEnum.string,
          renderTypeList: [FlowNodeInputTypeEnum.input, FlowNodeInputTypeEnum.reference],
          toolDescription: '逗号分隔的 ticker 列表。'
        },
        {
          key: 'importance_score',
          label: '重要性评分',
          valueType: WorkflowIOValueTypeEnum.number,
          renderTypeList: [FlowNodeInputTypeEnum.numberInput, FlowNodeInputTypeEnum.reference],
          defaultValue: 50,
          min: 0,
          max: 100
        },
        {
          key: 'event_time',
          label: '事件时间',
          valueType: WorkflowIOValueTypeEnum.string,
          renderTypeList: [FlowNodeInputTypeEnum.input, FlowNodeInputTypeEnum.reference]
        },
        {
          key: 'sources_json',
          label: '来源 JSON',
          valueType: WorkflowIOValueTypeEnum.string,
          renderTypeList: [FlowNodeInputTypeEnum.textarea, FlowNodeInputTypeEnum.reference]
        },
        {
          key: 'ai_blocks_json',
          label: 'AI 内容块 JSON',
          valueType: WorkflowIOValueTypeEnum.string,
          renderTypeList: [FlowNodeInputTypeEnum.textarea, FlowNodeInputTypeEnum.reference],
          toolDescription: 'AI 自由发挥的解释、机会、风险和推演模块。'
        },
        {
          key: 'mini_visual_json',
          label: '迷你图表 JSON',
          valueType: WorkflowIOValueTypeEnum.string,
          renderTypeList: [FlowNodeInputTypeEnum.textarea, FlowNodeInputTypeEnum.reference]
        }
      ],
      outputs: [
        { valueType: WorkflowIOValueTypeEnum.string, key: 'app_card', label: 'APP 原生卡片 JSON' },
        { valueType: WorkflowIOValueTypeEnum.string, key: 'record_json', label: '信号记录 JSON' },
        { valueType: WorkflowIOValueTypeEnum.string, key: 'records_json', label: '写入记录 JSON' },
        { valueType: WorkflowIOValueTypeEnum.string, key: 'summary_markdown', label: '摘要' },
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
