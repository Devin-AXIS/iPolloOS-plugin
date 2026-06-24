import { defineTool } from '@tool/type';
import {
  FlowNodeInputTypeEnum,
  FlowNodeOutputTypeEnum,
  WorkflowIOValueTypeEnum
} from '@tool/type/ipolloos';

export default defineTool({
  toolId: 'xPlatform_xapito/getXTrends',
  name: {
    'zh-CN': 'X 热门趋势',
    en: 'X trends'
  },
  description: {
    'zh-CN': '查询指定地区的 X 官方热门趋势，可按 AI、区块链或自定义关键词过滤。',
    en: 'Fetch official X trending topics for a selected region, optionally filtered by AI, blockchain, or custom keywords.'
  },
  toolDescription:
    'Fetch X Trends by WOEID with a user-friendly region selector and local topic filtering. Requires a read token.',
  runtime: {
    kind: 'execute',
    execute: {
      riskLevel: 'read'
    }
  },
  versionList: [
    {
      value: '1.0.1',
      description: '地区热门趋势和主题过滤',
      inputs: [
        {
          key: 'region',
          label: '地区',
          required: true,
          defaultValue: 'worldwide',
          valueType: WorkflowIOValueTypeEnum.string,
          renderTypeList: [FlowNodeInputTypeEnum.select, FlowNodeInputTypeEnum.reference],
          list: [
            { label: '全球', value: 'worldwide' },
            { label: '美国', value: 'united_states' },
            { label: '中国', value: 'china' },
            { label: '日本', value: 'japan' },
            { label: '新加坡', value: 'singapore' },
            { label: '英国', value: 'united_kingdom' }
          ],
          toolDescription: 'Region to fetch X trending topics for.'
        },
        {
          key: 'topic',
          label: '主题',
          required: true,
          defaultValue: 'all',
          valueType: WorkflowIOValueTypeEnum.string,
          renderTypeList: [FlowNodeInputTypeEnum.select, FlowNodeInputTypeEnum.reference],
          list: [
            { label: '全部', value: 'all' },
            { label: 'AI 相关', value: 'ai' },
            { label: '区块链相关', value: 'blockchain' },
            { label: '自定义关键词', value: 'custom' }
          ],
          toolDescription:
            'Topic filter applied locally over official region trends. Use custom_keywords when topic=custom.'
        },
        {
          key: 'custom_keywords',
          label: '自定义关键词',
          required: false,
          valueType: WorkflowIOValueTypeEnum.string,
          renderTypeList: [FlowNodeInputTypeEnum.textarea, FlowNodeInputTypeEnum.reference],
          placeholder: 'AI\nChatGPT\nOpenAI',
          toolDescription:
            'Optional keywords for custom topic filtering. Use new lines, commas, or spaces.'
        }
      ],
      outputs: [
        {
          valueType: WorkflowIOValueTypeEnum.string,
          key: 'trends_markdown',
          label: '趋势摘要'
        },
        {
          valueType: WorkflowIOValueTypeEnum.string,
          key: 'trends_json',
          label: '趋势 JSON'
        },
        {
          valueType: WorkflowIOValueTypeEnum.string,
          key: 'matched_keywords',
          label: '匹配关键词'
        },
        {
          valueType: WorkflowIOValueTypeEnum.number,
          key: 'result_count',
          label: '返回数量'
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
