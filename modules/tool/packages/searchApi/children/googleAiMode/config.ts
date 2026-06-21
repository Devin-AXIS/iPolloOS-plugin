import { defineTool } from '@tool/type';
import {
  commonOutputs,
  countryInput,
  languageInput,
  locationInput,
  numInput,
  queryTextareaInput
} from '../../lib/configIo';

export default defineTool({
  name: {
    'zh-CN': 'Google AI Mode',
    en: 'Google AI Mode'
  },
  description: {
    'zh-CN': '调用 Google AI Mode 搜索。',
    en: 'Call Google AI Mode search.'
  },
  toolDescription: 'Google AI Mode 搜索。适合需要 AI 组织答案、摘要和来源的查询。',
  versionList: [
    {
      value: '0.1.0',
      description: 'Google AI Mode 搜索',
      inputs: [queryTextareaInput, numInput, countryInput, languageInput, locationInput],
      outputs: commonOutputs
    }
  ]
});
