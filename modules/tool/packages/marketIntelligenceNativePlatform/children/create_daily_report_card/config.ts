import { defineTool } from '@tool/type';
import {
  FlowNodeInputTypeEnum,
  FlowNodeOutputTypeEnum,
  WorkflowIOValueTypeEnum
} from '@tool/type/ipolloos';

export default defineTool({
  name: {
    'zh-CN': '生成每日监控报告',
    en: 'Create daily monitor report'
  },
  description: {
    'zh-CN': '把用户关注对象和当天变化整理成 MarketDailyReportCard。',
    en: 'Package watchlist changes and AI synthesis into a MarketDailyReportCard.'
  },
  toolDescription:
    '用于官方美股每日/定时报告。调用前先读取用户关注对象、当天 market_signal_event，并按需补充行情、SEC、新闻、资金、X/人物机构和主题证据；本工具只生成原生 app_card 和 market_daily_report/market_delivery_record 写入记录。',
  runtime: {
    kind: 'execute',
    execute: {
      riskLevel: 'read'
    }
  },
  versionList: [
    {
      value: '1.2.6',
      description: '生成原生美股每日监控报告卡片',
      inputs: [
        {
          key: 'watchlist_json',
          label: '关注对象 JSON',
          valueType: WorkflowIOValueTypeEnum.string,
          renderTypeList: [FlowNodeInputTypeEnum.textarea, FlowNodeInputTypeEnum.reference],
          toolDescription:
            '关注对象数组。每项包含 targetType/targetKey/name，例如 [{"targetType":"ticker","targetKey":"NVDA","name":"NVDA"}]。'
        },
        {
          key: 'signals_json',
          label: '异动信号 JSON',
          valueType: WorkflowIOValueTypeEnum.string,
          renderTypeList: [FlowNodeInputTypeEnum.textarea, FlowNodeInputTypeEnum.reference],
          toolDescription: '当天或本报告周期内的归一化信号数组。'
        },
        {
          key: 'report_date',
          label: '报告日期',
          valueType: WorkflowIOValueTypeEnum.string,
          renderTypeList: [FlowNodeInputTypeEnum.input, FlowNodeInputTypeEnum.reference]
        },
        {
          key: 'report_title',
          label: '报告标题',
          valueType: WorkflowIOValueTypeEnum.string,
          renderTypeList: [FlowNodeInputTypeEnum.input, FlowNodeInputTypeEnum.reference]
        },
        {
          key: 'summary',
          label: '报告摘要',
          valueType: WorkflowIOValueTypeEnum.string,
          renderTypeList: [FlowNodeInputTypeEnum.textarea, FlowNodeInputTypeEnum.reference]
        },
        {
          key: 'target_summaries_json',
          label: '对象摘要 JSON',
          valueType: WorkflowIOValueTypeEnum.string,
          renderTypeList: [FlowNodeInputTypeEnum.textarea, FlowNodeInputTypeEnum.reference],
          toolDescription: '按关注对象聚合后的变化摘要，可为空。'
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
          toolDescription: 'AI 自由发挥的总结、变化、机会、风险和下一步跟踪模块。'
        },
        {
          key: 'data_gaps_json',
          label: '数据缺口 JSON',
          valueType: WorkflowIOValueTypeEnum.string,
          renderTypeList: [FlowNodeInputTypeEnum.textarea, FlowNodeInputTypeEnum.reference]
        }
      ],
      outputs: [
        { valueType: WorkflowIOValueTypeEnum.string, key: 'app_card', label: 'APP 原生卡片 JSON' },
        { valueType: WorkflowIOValueTypeEnum.string, key: 'record_json', label: '报告记录 JSON' },
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
