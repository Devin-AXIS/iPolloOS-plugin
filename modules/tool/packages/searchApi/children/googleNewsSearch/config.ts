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
    'zh-CN': 'Google 新闻搜索',
    en: 'Google News Search'
  },
  description: {
    'zh-CN': '调用 Google 新闻搜索。',
    en: 'Call Google news search.'
  },
  toolDescription: 'Google 新闻搜索。适合按关键词、公司、人物、地区查询新闻来源。',
  versionList: [
    {
      value: '0.2.0',
      description: 'Google 新闻搜索',
      inputs: [qInput, numInput, timePeriodInput, countryInput, languageInput, locationInput],
      outputs: commonOutputs
    }
  ]
});
