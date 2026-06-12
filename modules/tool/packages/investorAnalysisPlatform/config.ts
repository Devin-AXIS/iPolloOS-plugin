import { defineToolSet } from '@tool/type';
import { ToolTagEnum } from '@tool/type/tags';

export default defineToolSet({
  tags: [ToolTagEnum.enum.search, ToolTagEnum.enum.productivity],
  name: {
    'zh-CN': '投资人分析',
    en: 'Investor Analysis'
  },
  description: {
    'zh-CN': '基于公开网页搜索结果，整理项目画像、融资与投资人线索、市场信号、风险项和待验证问题。',
    en: 'Analyze projects with public web search results, including investor signals, market signals, risks, and verification questions.'
  },
  toolDescription:
    '用于项目/公司投资人分析。默认可用 DuckDuckGo 免密搜索；配置 Serper API Key 后可使用 Google Search 结果。输出 Markdown 报告、结构化 JSON、来源链接和待验证问题。',
  courseUrl: 'https://github.com/Devin-AXIS/iPolloOS-plugin/blob/main/docs/zh-CN/README.md',
  secretInputConfig: [
    {
      key: 'searchProvider',
      label: '搜索源（可选）',
      description:
        'auto / duckduckgo / serper。默认 auto：有 Serper Key 时使用 serper，否则使用 duckduckgo。',
      required: false,
      inputType: 'input'
    },
    {
      key: 'serperApiKey',
      label: 'Serper API Key（可选）',
      description: '用于调用 https://google.serper.dev/search。不填时使用 DuckDuckGo 免密搜索。',
      required: false,
      inputType: 'secret'
    },
    {
      key: 'timeoutMs',
      label: '请求超时毫秒（可选）',
      description: '默认 15000，范围 3000-60000。',
      required: false,
      inputType: 'input'
    }
  ]
});
