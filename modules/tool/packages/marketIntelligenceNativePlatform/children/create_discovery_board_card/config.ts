import { defineTool } from '@tool/type';
import {
  FlowNodeInputTypeEnum,
  FlowNodeOutputTypeEnum,
  WorkflowIOValueTypeEnum
} from '@tool/type/ipolloos';

export default defineTool({
  name: {
    'zh-CN': '生成发现机会看板',
    en: 'Create discovery board card'
  },
  description: {
    'zh-CN': '把 8 类发现机会扫描结果整理成 MarketDiscoveryBoardCard。',
    en: 'Package opportunity discovery scan results into a MarketDiscoveryBoardCard.'
  },
  toolDescription:
    '用于官方美股“发现机会”原生结果页。支持异动雷达、财报事件、SEC 披露、内部人交易、机构持仓、资金流向、新闻催化、人物机构动态。调用前先取数，本工具只生成 app_card 和写入记录 JSON。',
  runtime: {
    kind: 'execute',
    execute: {
      riskLevel: 'read'
    }
  },
  versionList: [
    {
      value: '1.0.0',
      description: '生成原生发现机会看板',
      inputs: [
        {
          key: 'scan_mode',
          label: '扫描方式',
          valueType: WorkflowIOValueTypeEnum.string,
          renderTypeList: [FlowNodeInputTypeEnum.input, FlowNodeInputTypeEnum.reference],
          required: true
        },
        {
          key: 'universe',
          label: '扫描范围',
          valueType: WorkflowIOValueTypeEnum.string,
          renderTypeList: [FlowNodeInputTypeEnum.textarea, FlowNodeInputTypeEnum.reference]
        },
        {
          key: 'signals_json',
          label: '信号 JSON',
          valueType: WorkflowIOValueTypeEnum.string,
          renderTypeList: [FlowNodeInputTypeEnum.textarea, FlowNodeInputTypeEnum.reference],
          required: true
        },
        {
          key: 'ai_blocks_json',
          label: 'AI 内容块 JSON',
          valueType: WorkflowIOValueTypeEnum.string,
          renderTypeList: [FlowNodeInputTypeEnum.textarea, FlowNodeInputTypeEnum.reference]
        },
        {
          key: 'sources_json',
          label: '来源 JSON',
          valueType: WorkflowIOValueTypeEnum.string,
          renderTypeList: [FlowNodeInputTypeEnum.textarea, FlowNodeInputTypeEnum.reference]
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
        { valueType: WorkflowIOValueTypeEnum.string, key: 'records_json', label: '写入记录 JSON' },
        { valueType: WorkflowIOValueTypeEnum.string, key: 'summary_markdown', label: '摘要' },
        { valueType: WorkflowIOValueTypeEnum.number, key: 'count', label: '信号数' },
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
