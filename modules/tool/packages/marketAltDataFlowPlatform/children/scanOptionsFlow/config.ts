import { defineTool } from '@tool/type';
import {
  FlowNodeInputTypeEnum,
  FlowNodeOutputTypeEnum,
  WorkflowIOValueTypeEnum
} from '@tool/type/ipolloos';

export default defineTool({
  name: {
    'zh-CN': '扫描期权大单',
    en: 'Scan options flow'
  },
  description: {
    'zh-CN': '扫描大额 Call、Put、Sweep 和异常期权流。',
    en: 'Scan large calls, puts, sweeps, and unusual options flow.'
  },
  toolDescription:
    'Options-flow monitor. Users provide tickers; optional options_flow_json can contain rows with symbol, optionType/putCall, premium/notional, sweep, size, openInterest, strike, expiration, and tradeTime.',
  runtime: {
    kind: 'execute',
    execute: {
      riskLevel: 'read'
    }
  },
  versionList: [
    {
      value: '1.0.0',
      description: '期权大单与 Sweep 扫描',
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
          key: 'options_flow_json',
          label: '期权流 JSON',
          valueType: WorkflowIOValueTypeEnum.string,
          renderTypeList: [FlowNodeInputTypeEnum.textarea, FlowNodeInputTypeEnum.reference],
          required: false,
          toolDescription:
            '可选。上游期权流 provider 或测试传入的大单数据，支持数组或 {trades/data/results/items: []}。'
        },
        {
          key: 'premium_threshold',
          label: '权利金阈值',
          valueType: WorkflowIOValueTypeEnum.number,
          renderTypeList: [FlowNodeInputTypeEnum.numberInput, FlowNodeInputTypeEnum.reference],
          defaultValue: 250000,
          min: 1000,
          max: 100000000
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
          key: 'options_events_json',
          label: '期权流事件 JSON'
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
