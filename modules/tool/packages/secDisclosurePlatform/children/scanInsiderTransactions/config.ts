import { defineTool } from '@tool/type';
import {
  FlowNodeInputTypeEnum,
  FlowNodeOutputTypeEnum,
  WorkflowIOValueTypeEnum
} from '@tool/type/ipolloos';

export default defineTool({
  name: {
    'zh-CN': '扫描内部人交易',
    en: 'Scan insider transactions'
  },
  description: {
    'zh-CN': '扫描 CEO、CFO、董事等内部人的 Form 4 买入、卖出、行权和计划出售。',
    en: 'Scan Form 4 insider buys, sales, option exercises, and planned sales by executives and directors.'
  },
  toolDescription:
    'Insider monitor. Users can enter tickers or people; insider_trades_json can contain provider rows with symbol, insider, role, transactionCode, transactionType, shares, price, value, transactionDate, filingDate, and plannedSale.',
  runtime: {
    kind: 'execute',
    execute: {
      riskLevel: 'read'
    }
  },
  versionList: [
    {
      value: '1.0.0',
      description: 'Form 4 内部人交易扫描',
      inputs: [
        {
          key: 'symbols_or_people',
          label: '股票/人物',
          required: true,
          valueType: WorkflowIOValueTypeEnum.string,
          renderTypeList: [FlowNodeInputTypeEnum.textarea, FlowNodeInputTypeEnum.reference],
          placeholder: 'NVDA, TSLA, Elon Musk, Jensen Huang',
          toolDescription: '股票 ticker、CEO/CFO/董事姓名或混合列表。'
        },
        {
          key: 'insider_trades_json',
          label: '内部人交易 JSON',
          valueType: WorkflowIOValueTypeEnum.string,
          renderTypeList: [FlowNodeInputTypeEnum.textarea, FlowNodeInputTypeEnum.reference],
          required: false,
          toolDescription:
            '可选。上游 Form 4 provider 或测试传入的交易行，支持数组或 {transactions/data/results/items: []}。'
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
          key: 'insider_events_json',
          label: '内部人事件 JSON'
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
