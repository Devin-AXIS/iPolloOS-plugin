import { defineTool } from '@tool/type';
import {
  FlowNodeInputTypeEnum,
  FlowNodeOutputTypeEnum,
  WorkflowIOValueTypeEnum
} from '@tool/type/ipolloos';

export default defineTool({
  name: {
    'zh-CN': '扫描财务异动',
    en: 'Scan financial anomalies'
  },
  description: {
    'zh-CN':
      '基于 SEC Company Facts 或上游财务数据，扫描收入、毛利率、现金流、债务和股本等财务指标的异常变化。',
    en: 'Scan revenue, margin, cash flow, debt, and share-count anomalies from SEC Company Facts or upstream financial data.'
  },
  toolDescription:
    'Financial anomaly monitor. Users provide tickers. When SEC User-Agent is configured, the tool fetches official free SEC Company Facts and applies deterministic rule checks. Optional financials_json can override the source with provider rows containing symbol, period, revenue/revenuePrevious, grossMargin/grossMarginPrevious, operatingIncome/operatingIncomePrevious, operatingCashFlow/operatingCashFlowPrevious, debt/debtPrevious, and shares/sharesPrevious.',
  runtime: {
    kind: 'execute',
    execute: {
      riskLevel: 'read'
    }
  },
  versionList: [
    {
      value: '1.0.0',
      description: 'SEC Company Facts/财务报表关键指标异动扫描',
      inputs: [
        {
          key: 'symbols',
          label: '股票/Watchlist',
          required: true,
          valueType: WorkflowIOValueTypeEnum.string,
          renderTypeList: [FlowNodeInputTypeEnum.textarea, FlowNodeInputTypeEnum.reference],
          placeholder: 'NVDA, TSLA, PLTR, META',
          toolDescription:
            '股票 ticker 列表，可用逗号、空格或换行分隔。配置 SEC User-Agent 后可自动查询 SEC Company Facts。'
        },
        {
          key: 'financials_json',
          label: '财务数据 JSON（可选覆盖）',
          valueType: WorkflowIOValueTypeEnum.string,
          renderTypeList: [FlowNodeInputTypeEnum.textarea, FlowNodeInputTypeEnum.reference],
          required: false,
          toolDescription:
            '可选。传入后优先使用该数据；不传且配置 SEC User-Agent 时使用 SEC Company Facts。支持数组或 {data/results/items: []}。'
        },
        {
          key: 'revenue_change_threshold',
          label: '收入/利润阈值 %',
          valueType: WorkflowIOValueTypeEnum.number,
          renderTypeList: [FlowNodeInputTypeEnum.numberInput, FlowNodeInputTypeEnum.reference],
          defaultValue: 10,
          min: 1,
          max: 200
        },
        {
          key: 'margin_change_threshold',
          label: '毛利率阈值 pct',
          valueType: WorkflowIOValueTypeEnum.number,
          renderTypeList: [FlowNodeInputTypeEnum.numberInput, FlowNodeInputTypeEnum.reference],
          defaultValue: 5,
          min: 0.5,
          max: 50
        },
        {
          key: 'debt_change_threshold',
          label: '债务阈值 %',
          valueType: WorkflowIOValueTypeEnum.number,
          renderTypeList: [FlowNodeInputTypeEnum.numberInput, FlowNodeInputTypeEnum.reference],
          defaultValue: 20,
          min: 1,
          max: 300
        },
        {
          key: 'share_change_threshold',
          label: '股本阈值 %',
          valueType: WorkflowIOValueTypeEnum.number,
          renderTypeList: [FlowNodeInputTypeEnum.numberInput, FlowNodeInputTypeEnum.reference],
          defaultValue: 5,
          min: 0.5,
          max: 100
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
          key: 'financial_events_json',
          label: '财务异动 JSON'
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
