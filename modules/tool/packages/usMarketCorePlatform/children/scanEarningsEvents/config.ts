import { defineTool } from '@tool/type';
import {
  FlowNodeInputTypeEnum,
  FlowNodeOutputTypeEnum,
  WorkflowIOValueTypeEnum
} from '@tool/type/ipolloos';

export default defineTool({
  name: {
    'zh-CN': '扫描财报事件',
    en: 'Scan earnings events'
  },
  description: {
    'zh-CN': '扫描财报日历、EPS/Revenue surprise 和 guidance 变化。',
    en: 'Scan earnings calendar, EPS/revenue surprises, and guidance changes.'
  },
  toolDescription:
    'Earnings monitor tool. Users provide symbols; optional earnings_data_json can contain provider rows with symbol, reportDate, epsActual, epsEstimate, revenueActual, revenueEstimate, and guidance.',
  runtime: {
    kind: 'execute',
    execute: {
      riskLevel: 'read'
    }
  },
  versionList: [
    {
      value: '1.0.0',
      description: '财报日历和财报结果扫描',
      inputs: [
        {
          key: 'symbols',
          label: '股票/Watchlist',
          required: true,
          valueType: WorkflowIOValueTypeEnum.string,
          renderTypeList: [FlowNodeInputTypeEnum.textarea, FlowNodeInputTypeEnum.reference],
          placeholder: 'NVDA, TSLA, PLTR, META',
          toolDescription: '股票 ticker 列表，可用逗号、空格或换行分隔。'
        },
        {
          key: 'earnings_data_json',
          label: '财报数据 JSON',
          valueType: WorkflowIOValueTypeEnum.string,
          renderTypeList: [FlowNodeInputTypeEnum.textarea, FlowNodeInputTypeEnum.reference],
          required: false,
          toolDescription:
            '可选。上游 provider 或测试传入的财报数据。支持数组或 {data/results/items: []}。'
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
          key: 'earnings_events_json',
          label: '财报事件 JSON'
        },
        {
          valueType: WorkflowIOValueTypeEnum.string,
          key: 'surprises_json',
          label: 'Surprise JSON'
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
