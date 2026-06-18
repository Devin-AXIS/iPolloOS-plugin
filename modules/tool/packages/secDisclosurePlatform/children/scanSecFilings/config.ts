import { defineTool } from '@tool/type';
import {
  FlowNodeInputTypeEnum,
  FlowNodeOutputTypeEnum,
  WorkflowIOValueTypeEnum
} from '@tool/type/ipolloos';

export default defineTool({
  name: {
    'zh-CN': '扫描 SEC 文件',
    en: 'Scan SEC filings'
  },
  description: {
    'zh-CN': '扫描 8-K、10-Q、10-K、13D/13G、Form 4、13F 等关键 SEC 披露。',
    en: 'Scan key SEC filings including 8-K, 10-Q, 10-K, 13D/13G, Form 4, and 13F.'
  },
  toolDescription:
    'SEC filing monitor. Users provide tickers, CIKs, or entity names. If filings_json is passed, the tool analyzes it directly. If SEC User-Agent is configured, it can fetch recent SEC company submissions for ticker/CIK inputs.',
  runtime: {
    kind: 'execute',
    execute: {
      riskLevel: 'read'
    }
  },
  versionList: [
    {
      value: '1.0.0',
      description: 'SEC 关键披露文件扫描',
      inputs: [
        {
          key: 'entities',
          label: '公司/Ticker/CIK',
          required: true,
          valueType: WorkflowIOValueTypeEnum.string,
          renderTypeList: [FlowNodeInputTypeEnum.textarea, FlowNodeInputTypeEnum.reference],
          placeholder: 'NVDA, TSLA, BRK.B 或 0000320193',
          toolDescription: '公司 ticker、CIK 或实体列表，可用逗号、空格或换行分隔。'
        },
        {
          key: 'forms',
          label: '文件类型',
          required: false,
          valueType: WorkflowIOValueTypeEnum.string,
          renderTypeList: [FlowNodeInputTypeEnum.input, FlowNodeInputTypeEnum.reference],
          defaultValue: '8-K,10-Q,10-K,S-3,13D,13G,4,13F-HR',
          toolDescription: 'SEC form 列表，不填时使用默认关键表单。'
        },
        {
          key: 'filings_json',
          label: 'SEC 文件 JSON',
          valueType: WorkflowIOValueTypeEnum.string,
          renderTypeList: [FlowNodeInputTypeEnum.textarea, FlowNodeInputTypeEnum.reference],
          required: false,
          toolDescription:
            '可选。上游 SEC provider 或测试传入的 filings 数据。支持数组或 {filings/data/results/items: []}。'
        },
        {
          key: 'lookback_days',
          label: '回看天数',
          valueType: WorkflowIOValueTypeEnum.number,
          renderTypeList: [FlowNodeInputTypeEnum.numberInput, FlowNodeInputTypeEnum.reference],
          defaultValue: 14,
          min: 1,
          max: 366
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
          key: 'filing_events_json',
          label: 'SEC 文件事件 JSON'
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
