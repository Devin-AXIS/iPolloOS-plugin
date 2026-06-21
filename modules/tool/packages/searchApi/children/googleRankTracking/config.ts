import { defineTool } from '@tool/type';
import { FlowNodeInputTypeEnum, WorkflowIOValueTypeEnum } from '@tool/type/ipolloos';
import {
  commonOutputs,
  countryInput,
  languageInput,
  locationInput,
  numInput,
  qInput
} from '../../lib/configIo';

export default defineTool({
  name: {
    'zh-CN': 'Google 排名追踪',
    en: 'Google Rank Tracking'
  },
  description: {
    'zh-CN': '查询指定域名在 Google 搜索结果中的排名。',
    en: 'Track a domain rank in Google search results.'
  },
  toolDescription: '输入关键词和目标域名，返回该域名在 Google 搜索结果里的命中位置。',
  versionList: [
    {
      value: '0.1.0',
      description: 'Google SEO 排名追踪',
      inputs: [
        qInput,
        {
          key: 'domain',
          label: '目标域名',
          required: true,
          valueType: WorkflowIOValueTypeEnum.string,
          renderTypeList: [FlowNodeInputTypeEnum.input, FlowNodeInputTypeEnum.reference],
          placeholder: 'example.com',
          toolDescription: '只填域名即可，例如 openai.com。'
        },
        numInput,
        countryInput,
        languageInput,
        locationInput
      ],
      outputs: commonOutputs
    }
  ]
});
