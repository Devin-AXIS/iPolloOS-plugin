import { defineTool } from '@tool/type';
import {
  FlowNodeInputTypeEnum,
  FlowNodeOutputTypeEnum,
  WorkflowIOValueTypeEnum
} from '@tool/type/ipolloos';

export default defineTool({
  name: {
    'zh-CN': '扫描市场新闻',
    en: 'Scan market news'
  },
  description: {
    'zh-CN': '扫描重大新闻、产品发布、收购、诉讼、监管和订单事件。',
    en: 'Scan material news, launches, M&A, litigation, regulation, and customer-order events.'
  },
  toolDescription:
    'Market-news monitor. Users provide tickers, themes, or query text; optional news_json can contain articles with title/headline, summary, symbols, company, eventType/category, relevance, publishedAt, sourceName, and url.',
  runtime: {
    kind: 'execute',
    execute: {
      riskLevel: 'read'
    }
  },
  versionList: [
    {
      value: '1.0.0',
      description: '重大市场新闻扫描',
      inputs: [
        {
          key: 'query_or_symbols',
          label: '股票/主题/查询',
          required: true,
          valueType: WorkflowIOValueTypeEnum.string,
          renderTypeList: [FlowNodeInputTypeEnum.textarea, FlowNodeInputTypeEnum.reference],
          placeholder: 'NVDA, TSLA, AI Agent, robotics',
          toolDescription: '股票、主题、行业或自然语言查询。'
        },
        {
          key: 'news_json',
          label: '新闻 JSON',
          valueType: WorkflowIOValueTypeEnum.string,
          renderTypeList: [FlowNodeInputTypeEnum.textarea, FlowNodeInputTypeEnum.reference],
          required: false,
          toolDescription:
            '可选。上游新闻/搜索 provider 或测试传入的新闻列表，支持数组或 {articles/news/data/results/items: []}。'
        },
        {
          key: 'lookback_hours',
          label: '回看小时',
          valueType: WorkflowIOValueTypeEnum.number,
          renderTypeList: [FlowNodeInputTypeEnum.numberInput, FlowNodeInputTypeEnum.reference],
          defaultValue: 24,
          min: 1,
          max: 720
        },
        {
          key: 'min_signal_score',
          label: '最低信号分',
          valueType: WorkflowIOValueTypeEnum.number,
          renderTypeList: [FlowNodeInputTypeEnum.numberInput, FlowNodeInputTypeEnum.reference],
          defaultValue: 45,
          min: 0,
          max: 100
        }
      ],
      outputs: [
        {
          valueType: WorkflowIOValueTypeEnum.string,
          key: 'news_events_json',
          label: '新闻事件 JSON'
        },
        {
          valueType: WorkflowIOValueTypeEnum.string,
          key: 'summary_markdown',
          label: '扫描摘要'
        },
        {
          valueType: WorkflowIOValueTypeEnum.number,
          key: 'count',
          label: '事件数'
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
