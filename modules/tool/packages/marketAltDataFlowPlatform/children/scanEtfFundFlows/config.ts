import { defineTool } from '@tool/type';
import {
  FlowNodeInputTypeEnum,
  FlowNodeOutputTypeEnum,
  WorkflowIOValueTypeEnum
} from '@tool/type/ipolloos';

export default defineTool({
  name: {
    'zh-CN': '扫描基金流向',
    en: 'Scan ETF/fund flows'
  },
  description: {
    'zh-CN': '扫描 ETF、行业基金和主题基金的资金流入流出。',
    en: 'Scan ETF, sector-fund, and thematic-fund inflows and outflows.'
  },
  toolDescription:
    'ETF/fund-flow monitor. Users provide ETFs, funds, sectors, or themes; optional fund_flows_json can contain rows with symbol/fund, flow/netFlow, flowPercent, aum, and period.',
  runtime: {
    kind: 'execute',
    execute: {
      riskLevel: 'read'
    }
  },
  versionList: [
    {
      value: '1.0.0',
      description: 'ETF/基金资金流扫描',
      inputs: [
        {
          key: 'funds_or_themes',
          label: '基金/主题',
          required: true,
          valueType: WorkflowIOValueTypeEnum.string,
          renderTypeList: [FlowNodeInputTypeEnum.textarea, FlowNodeInputTypeEnum.reference],
          placeholder: 'QQQ, SMH, ARKK, AI, Robotics',
          toolDescription: 'ETF ticker、基金名、行业或主题。'
        },
        {
          key: 'fund_flows_json',
          label: '基金流向 JSON',
          valueType: WorkflowIOValueTypeEnum.string,
          renderTypeList: [FlowNodeInputTypeEnum.textarea, FlowNodeInputTypeEnum.reference],
          required: false,
          toolDescription: '可选。上游 ETF/基金流 provider 或测试传入的资金流数据。'
        },
        {
          key: 'flow_threshold',
          label: '净流入阈值',
          valueType: WorkflowIOValueTypeEnum.number,
          renderTypeList: [FlowNodeInputTypeEnum.numberInput, FlowNodeInputTypeEnum.reference],
          defaultValue: 50000000,
          min: 100000,
          max: 10000000000
        },
        {
          key: 'flow_percent_threshold',
          label: '净流入率阈值 %',
          valueType: WorkflowIOValueTypeEnum.number,
          renderTypeList: [FlowNodeInputTypeEnum.numberInput, FlowNodeInputTypeEnum.reference],
          defaultValue: 1,
          min: 0.1,
          max: 50
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
          key: 'fund_flow_events_json',
          label: '基金流事件 JSON'
        },
        {
          valueType: WorkflowIOValueTypeEnum.string,
          key: 'flows_json',
          label: '资金流明细 JSON'
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
