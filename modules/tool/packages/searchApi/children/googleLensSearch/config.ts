import { defineTool } from '@tool/type';
import { FlowNodeInputTypeEnum, WorkflowIOValueTypeEnum } from '@tool/type/ipolloos';
import { commonOutputs, countryInput, languageInput, numInput } from '../../lib/configIo';

export default defineTool({
  name: {
    'zh-CN': 'Google Lens 图片识别',
    en: 'Google Lens Search'
  },
  description: {
    'zh-CN': '通过图片 URL 调用 Google Lens 搜索相似图片和视觉匹配。',
    en: 'Use an image URL to search Google Lens visual matches.'
  },
  toolDescription: 'Google Lens 搜索。输入图片 URL，返回相似图片、视觉匹配和相关网页。',
  versionList: [
    {
      value: '0.1.0',
      description: 'Google Lens 图片识别搜索',
      inputs: [
        {
          key: 'image_url',
          label: '图片 URL',
          required: true,
          valueType: WorkflowIOValueTypeEnum.string,
          renderTypeList: [FlowNodeInputTypeEnum.input, FlowNodeInputTypeEnum.reference],
          toolDescription: '可公开访问的图片 URL。'
        },
        numInput,
        countryInput,
        languageInput
      ],
      outputs: commonOutputs
    }
  ]
});
