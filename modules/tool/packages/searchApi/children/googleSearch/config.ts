import { defineTool } from '@tool/type';
import {
  commonOutputs,
  countryInput,
  languageInput,
  locationInput,
  numInput,
  qInput,
  timePeriodInput
} from '../../lib/configIo';

export default defineTool({
  name: {
    'zh-CN': 'Google 搜索',
    en: 'Google Search'
  },
  description: {
    'zh-CN': '调用 Google 搜索。',
    en: 'Call Google search.'
  },
  toolDescription:
    '普通 Google 网页搜索。用户只需要填搜索关键词；国家、语言、地点和时间范围按需填写。',
  versionList: [
    {
      value: '0.2.0',
      description: 'Google 网页搜索',
      inputs: [qInput, numInput, timePeriodInput, countryInput, languageInput, locationInput],
      outputs: commonOutputs
    }
  ]
});
