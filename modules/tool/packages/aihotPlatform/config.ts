import { defineToolSet } from '@tool/type';
import { ToolTagEnum } from '@tool/type/tags';

export default defineToolSet({
  tags: [ToolTagEnum.enum.news, ToolTagEnum.enum.search],
  name: {
    'zh-CN': 'AI HOT 动态与日报',
    en: 'AI HOT news and daily brief'
  },
  description: {
    'zh-CN':
      '读取 AI HOT 的精选/全量 AI 动态、每日精编日报与可用日报日期。匿名公开接口，无需 API Key；适合在 Agent 工作流中查询最近 AI 行业、模型、产品、论文与技巧动态。',
    en: 'Read AI HOT selected/all AI updates, daily briefs, and available daily dates. Public anonymous API, no API key required.'
  },
  toolDescription:
    '默认查精选动态；只有用户明确要求“全部/全量/所有”才使用 all。AI HOT 摘要由 LLM 生成，重要引用请回 source_links/original URL 核对原文。',
  courseUrl: 'https://aihot.virxact.com/agent',
  secretInputConfig: [
    {
      key: 'baseUrl',
      label: 'AI HOT Base URL（可选）',
      description: '默认 https://aihot.virxact.com；如使用代理或自建镜像可改。',
      required: false,
      inputType: 'input'
    },
    {
      key: 'userAgent',
      label: 'User-Agent（可选）',
      description: '默认使用浏览器 UA。AI HOT API 端点可能拦截默认脚本 UA。',
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
      key: 'maxItems',
      label: '最大返回条数（可选）',
      description: '默认 20，范围 1-50。工具会对 take 做兜底限制。',
      required: false,
      inputType: 'input'
    }
  ]
});
