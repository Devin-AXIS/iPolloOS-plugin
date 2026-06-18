import { defineTool } from '@tool/type';
import {
  FlowNodeInputTypeEnum,
  FlowNodeOutputTypeEnum,
  WorkflowIOValueTypeEnum
} from '@tool/type/ipolloos';

export default defineTool({
  name: {
    'zh-CN': '扫描人物机构动态',
    en: 'Scan people/institution signals'
  },
  description: {
    'zh-CN': '扫描 CEO、影响者、基金、VC 和大企业的讲话、采访、招聘、投资、裁员、战略变化。',
    en: 'Scan CEO, influencer, fund, VC, and company signals including remarks, interviews, hiring, investments, layoffs, and strategy shifts.'
  },
  toolDescription:
    'People and institution monitor. Users provide people or institutions such as Elon Musk, Jensen Huang, Warren Buffett, Berkshire, a16z, Sequoia, or OpenAI. entity_signals_json can contain rows with entity, entityType, signalType, title, summary, relatedSymbols, relatedThemes, marketImpact, sourceName, url, and publishedAt.',
  runtime: {
    kind: 'execute',
    execute: {
      riskLevel: 'read'
    }
  },
  versionList: [
    {
      value: '1.0.0',
      description: '人物与机构公开动态扫描',
      inputs: [
        {
          key: 'entities',
          label: '人物/机构',
          required: true,
          valueType: WorkflowIOValueTypeEnum.string,
          renderTypeList: [FlowNodeInputTypeEnum.textarea, FlowNodeInputTypeEnum.reference],
          placeholder: 'Elon Musk, Sam Altman, Jensen Huang, Warren Buffett, Berkshire, a16z',
          toolDescription: '人物、机构、基金、VC 或公司名称。'
        },
        {
          key: 'entity_signals_json',
          label: '动态信号 JSON',
          valueType: WorkflowIOValueTypeEnum.string,
          renderTypeList: [FlowNodeInputTypeEnum.textarea, FlowNodeInputTypeEnum.reference],
          required: false,
          toolDescription: '可选。上游 X/新闻/搜索/播客/招聘/SEC provider 传入的人物机构动态。'
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
          key: 'entity_events_json',
          label: '人物机构事件 JSON'
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
