import { defineTool } from '@tool/type';
import { commonOutputs, countryInput, languageInput, numInput, qInput } from '../../lib/configIo';

export default defineTool({
  name: {
    'zh-CN': 'Google 广告透明度',
    en: 'Google Ads Transparency'
  },
  description: {
    'zh-CN': '按广告主、品牌或域名查询 Google 广告透明度信息。',
    en: 'Search Google Ads Transparency by advertiser, brand, or domain.'
  },
  toolDescription: 'Google Ads Transparency 搜索。适合查品牌/广告主近期公开广告素材。',
  versionList: [
    {
      value: '0.1.0',
      description: 'Google 广告透明度搜索',
      inputs: [qInput, numInput, countryInput, languageInput],
      outputs: commonOutputs
    }
  ]
});
