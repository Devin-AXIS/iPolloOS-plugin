import { defineTool } from '@tool/type';
import {
  FlowNodeInputTypeEnum,
  FlowNodeOutputTypeEnum,
  WorkflowIOValueTypeEnum
} from '@tool/type/ipolloos';

export default defineTool({
  name: {
    'zh-CN': '扫描国会交易',
    en: 'Scan Congress trades'
  },
  description: {
    'zh-CN': '扫描美国国会议员和参议员交易披露，发现政治资金流向。',
    en: 'Scan US Congress trading disclosures to surface political capital-flow signals.'
  },
  toolDescription:
    'Congress trade monitor. Users provide politicians or tickers; optional congress_trades_json can contain rows with politician, chamber, symbol, transactionType, amountMin, amountMax, transactionDate, and filingDate.',
  runtime: {
    kind: 'execute',
    execute: {
      riskLevel: 'read'
    }
  },
  versionList: [
    {
      value: '1.0.0',
      description: '国会议员交易披露扫描',
      inputs: [
        {
          key: 'politicians_or_symbols',
          label: '议员/股票',
          required: true,
          valueType: WorkflowIOValueTypeEnum.string,
          renderTypeList: [FlowNodeInputTypeEnum.textarea, FlowNodeInputTypeEnum.reference],
          placeholder: 'Nancy Pelosi, NVDA, TSLA',
          toolDescription: '议员、参议员姓名或 ticker。'
        },
        {
          key: 'congress_trades_json',
          label: '国会交易 JSON',
          valueType: WorkflowIOValueTypeEnum.string,
          renderTypeList: [FlowNodeInputTypeEnum.textarea, FlowNodeInputTypeEnum.reference],
          required: false,
          toolDescription: '可选。上游 Congress trade provider 或测试传入的交易披露。'
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
          key: 'congress_events_json',
          label: '国会交易事件 JSON'
        },
        {
          valueType: WorkflowIOValueTypeEnum.string,
          key: 'transactions_json',
          label: '交易明细 JSON'
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
