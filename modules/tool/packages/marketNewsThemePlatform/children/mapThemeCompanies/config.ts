import { defineTool } from '@tool/type';
import {
  FlowNodeInputTypeEnum,
  FlowNodeOutputTypeEnum,
  WorkflowIOValueTypeEnum
} from '@tool/type/ipolloos';

export default defineTool({
  name: {
    'zh-CN': '映射主题公司',
    en: 'Map theme companies'
  },
  description: {
    'zh-CN': '把主题或产业映射到可能受益、受损或相关的上市公司。',
    en: 'Map a theme or industry to potentially exposed public companies.'
  },
  toolDescription:
    'Theme-company mapper. Users provide a theme; optional company_relations_json can contain rows with theme, company, symbol, relationship, exposureScore, evidence, sourceName, and url.',
  runtime: {
    kind: 'execute',
    execute: {
      riskLevel: 'read'
    }
  },
  versionList: [
    {
      value: '1.0.0',
      description: '主题产业链公司映射',
      inputs: [
        {
          key: 'theme',
          label: '主题/产业',
          required: true,
          valueType: WorkflowIOValueTypeEnum.string,
          renderTypeList: [FlowNodeInputTypeEnum.input, FlowNodeInputTypeEnum.reference],
          placeholder: 'AI Agent'
        },
        {
          key: 'company_relations_json',
          label: '公司关系 JSON',
          valueType: WorkflowIOValueTypeEnum.string,
          renderTypeList: [FlowNodeInputTypeEnum.textarea, FlowNodeInputTypeEnum.reference],
          required: false,
          toolDescription: '可选。上游研究、搜索、知识图谱或人工配置传入的主题-公司关系。'
        },
        {
          key: 'min_exposure_score',
          label: '最低暴露分',
          valueType: WorkflowIOValueTypeEnum.number,
          renderTypeList: [FlowNodeInputTypeEnum.numberInput, FlowNodeInputTypeEnum.reference],
          defaultValue: 40,
          min: 0,
          max: 100
        }
      ],
      outputs: [
        {
          valueType: WorkflowIOValueTypeEnum.string,
          key: 'relations_json',
          label: '公司关系 JSON'
        },
        {
          valueType: WorkflowIOValueTypeEnum.string,
          key: 'summary_markdown',
          label: '映射摘要'
        },
        {
          valueType: WorkflowIOValueTypeEnum.number,
          key: 'count',
          label: '公司数'
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
