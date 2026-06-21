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
    'zh-CN': 'Google 图片搜索',
    en: 'Google Images Search'
  },
  description: {
    'zh-CN': '调用 Google 图片搜索。',
    en: 'Call Google images search.'
  },
  toolDescription: 'Google 图片搜索。适合找产品图、人物照、Logo、场景图和公开图片来源。',
  versionList: [
    {
      value: '0.2.0',
      description: 'Google 图片搜索',
      inputs: [qInput, numInput, timePeriodInput, countryInput, languageInput, locationInput],
      outputs: commonOutputs
    }
  ]
});
