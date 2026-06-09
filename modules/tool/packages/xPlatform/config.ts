import { defineToolSet } from '@tool/type';
import { ToolTagEnum } from '@tool/type/tags';

export default defineToolSet({
  tags: [ToolTagEnum.enum.social, ToolTagEnum.enum.search, ToolTagEnum.enum.news],
  name: {
    'zh-CN': 'X 平台',
    en: 'X Platform'
  },
  description: {
    'zh-CN':
      'X 官方 API 工具集。用于查询账号、搜索最近内容，并按状态检查账号新增内容。第一版聚焦只读查询和触发型监控，动作类能力后续独立加入。',
    en: 'Official X API toolset for account lookup, recent content search, and stateful account update checks. The first version focuses on read-only queries and trigger monitoring.'
  },
  toolDescription:
    'Use this toolset for X account lookup, recent post search, user timeline reads, and polling-based account monitoring. Use queryXContent for one-shot lookup/search. Use checkAccountUpdates for monitor workflows.',
  courseUrl: 'https://docs.x.com/x-api',
  secretInputConfig: [
    {
      key: 'bearerToken',
      label: 'X Bearer Token',
      description:
        'X API Bearer Token. Required for public read endpoints such as user lookup, recent search, and user timelines.',
      required: true,
      inputType: 'secret'
    },
    {
      key: 'baseUrl',
      label: 'X API Base URL（可选）',
      description: '默认 https://api.x.com；如使用代理或网关可改。',
      required: false,
      inputType: 'input'
    },
    {
      key: 'timeoutMs',
      label: '请求超时毫秒（可选）',
      description: '默认 15000，范围 1000-60000。',
      required: false,
      inputType: 'input'
    },
    {
      key: 'defaultMaxResults',
      label: '默认返回条数（可选）',
      description: '默认 10，范围 5-100。工具输入的 max_results 会再次限制。',
      required: false,
      inputType: 'input'
    }
  ]
});
