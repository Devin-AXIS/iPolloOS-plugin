import { defineTool } from '@tool/type';
import {
  FlowNodeInputTypeEnum,
  FlowNodeOutputTypeEnum,
  WorkflowIOValueTypeEnum
} from '@tool/type/ipolloos';

export default defineTool({
  name: {
    'zh-CN': '扫描暗池大单',
    en: 'Scan dark-pool flow'
  },
  description: {
    'zh-CN': '扫描 Dark Pool / ATS 大额成交和 block print。',
    en: 'Scan dark-pool / ATS large prints and block trades.'
  },
  toolDescription:
    'Dark-pool monitor. Users provide tickers; optional dark_pool_json can contain rows with symbol, venue, price, shares, notional/value, and tradeTime.',
  runtime: {
    kind: 'execute',
    execute: {
      riskLevel: 'read'
    }
  },
  versionList: [
    {
      value: '1.0.0',
      description: 'Dark Pool / ATS 大单扫描',
      inputs: [
        {
          key: 'symbols',
          label: '股票/Watchlist',
          required: true,
          valueType: WorkflowIOValueTypeEnum.string,
          renderTypeList: [FlowNodeInputTypeEnum.textarea, FlowNodeInputTypeEnum.reference],
          placeholder: 'NVDA, TSLA, PLTR, META'
        },
        {
          key: 'dark_pool_json',
          label: '暗池数据 JSON',
          valueType: WorkflowIOValueTypeEnum.string,
          renderTypeList: [FlowNodeInputTypeEnum.textarea, FlowNodeInputTypeEnum.reference],
          required: false,
          toolDescription: '可选。上游 Dark Pool provider 或测试传入的成交数据。'
        },
        {
          key: 'notional_threshold',
          label: '成交额阈值',
          valueType: WorkflowIOValueTypeEnum.number,
          renderTypeList: [FlowNodeInputTypeEnum.numberInput, FlowNodeInputTypeEnum.reference],
          defaultValue: 1000000,
          min: 10000,
          max: 1000000000
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
          key: 'dark_pool_events_json',
          label: '暗池事件 JSON'
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
