import { defineToolSet } from '@tool/type';
import { ToolTagEnum } from '@tool/type/tags';

export default defineToolSet({
  tags: [ToolTagEnum.enum.news, ToolTagEnum.enum.finance, ToolTagEnum.enum.social],
  name: {
    'zh-CN': '新闻主题与产业监控',
    en: 'Market News & Theme Monitor'
  },
  description: {
    'zh-CN': '监控重大新闻、主题热度、产业链受益公司、人物和机构公开动态。',
    en: 'Monitor material news, theme momentum, industry beneficiaries, and people/institution signals.'
  },
  toolDescription:
    'Market news and theme intelligence toolset. Use it for material company news, product launches, M&A, litigation, regulation, theme heat, industry mapping, influencer/CEO/institution public signals, and opportunity discovery. User inputs stay simple; provider payloads can be passed as JSON.',
  courseUrl: 'https://newsapi.org/docs',
  secretInputConfig: [
    {
      key: 'newsProvider',
      label: 'News Provider',
      description:
        'auto / newsapi / benzinga / alpha_vantage / perplexity / custom。默认 custom JSON。',
      required: false,
      inputType: 'input'
    },
    {
      key: 'newsApiKey',
      label: 'News API Key',
      description: '用于重大新闻、产品发布、收购、诉讼等新闻源。',
      required: false,
      inputType: 'secret'
    },
    {
      key: 'searchApiKey',
      label: 'Search API Key',
      description: '用于主题、产业链、人物机构动态搜索。',
      required: false,
      inputType: 'secret'
    },
    {
      key: 'socialApiKey',
      label: 'Social/X API Key',
      description: '用于 X、社媒、播客和会议热度信号；也可由 X 平台插件上游传入 JSON。',
      required: false,
      inputType: 'secret'
    }
  ]
});
