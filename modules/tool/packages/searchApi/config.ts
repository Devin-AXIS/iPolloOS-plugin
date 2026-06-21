import { defineToolSet } from '@tool/type';
import { ToolTagEnum } from '@tool/type/tags';

export default defineToolSet({
  tags: [ToolTagEnum.enum.search],
  name: {
    'zh-CN': 'SearchApi',
    en: 'SearchApi'
  },
  courseUrl: 'https://www.searchapi.io/docs',
  description: {
    'zh-CN':
      'SearchAPI 服务。支持 Google、Baidu、图片、视频、新闻、招聘、趋势、学术、本地地点、购物、旅行等搜索能力；不包含财经搜索。',
    en: 'SearchAPI service for Google, Baidu, images, videos, news, jobs, trends, scholar, local places, shopping, travel, and more. Finance is excluded.'
  },
  toolDescription:
    'Use SearchAPI for web search, Baidu search, Google images/videos/news, jobs/events, trends/autocomplete, scholar/forums/patents/books, local/place/maps, shopping/travel, Lens, AI Mode, ads transparency, and rank tracking. Keep inputs simple: query, location, result count, and a few business-facing selectors.',
  secretInputConfig: [
    {
      key: 'apiKey',
      label: 'Search API Key',
      required: true,
      inputType: 'secret'
    }
  ]
});
