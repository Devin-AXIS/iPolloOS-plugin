import { defineTool } from '@tool/type';
import {
  FlowNodeInputTypeEnum,
  FlowNodeOutputTypeEnum,
  WorkflowIOValueTypeEnum
} from '@tool/type/ipolloos';

export default defineTool({
  name: {
    'zh-CN': '扫描机构持仓',
    en: 'Scan institution holdings'
  },
  description: {
    'zh-CN': '扫描 13F 机构持仓新增、增持、减持和清仓信号。',
    en: 'Scan 13F institution positions for new, increased, reduced, and exited holdings.'
  },
  toolDescription:
    'Smart-money 13F monitor. Users can enter institutions such as Berkshire Hathaway, Bridgewater, Scion, Tiger, or ARK. holdings_json can contain provider rows with institution, symbol, shares, previousShares, marketValue, previousMarketValue, action, and reportDate.',
  runtime: {
    kind: 'execute',
    execute: {
      riskLevel: 'read'
    }
  },
  versionList: [
    {
      value: '1.0.0',
      description: '13F 机构持仓变化扫描',
      inputs: [
        {
          key: 'institutions',
          label: '机构/基金经理',
          required: true,
          valueType: WorkflowIOValueTypeEnum.string,
          renderTypeList: [FlowNodeInputTypeEnum.textarea, FlowNodeInputTypeEnum.reference],
          placeholder: 'Berkshire Hathaway, Bridgewater, Scion, Tiger, ARK',
          toolDescription: '机构、基金或基金经理名称。'
        },
        {
          key: 'holdings_json',
          label: '持仓数据 JSON',
          valueType: WorkflowIOValueTypeEnum.string,
          renderTypeList: [FlowNodeInputTypeEnum.textarea, FlowNodeInputTypeEnum.reference],
          required: false,
          toolDescription:
            '可选。上游 13F provider 或测试传入的持仓行，支持数组或 {holdings/data/results/items: []}。'
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
          key: 'holding_events_json',
          label: '持仓事件 JSON'
        },
        {
          valueType: WorkflowIOValueTypeEnum.string,
          key: 'positions_json',
          label: '持仓明细 JSON'
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
