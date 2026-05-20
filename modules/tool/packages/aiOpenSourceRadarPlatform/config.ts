import { defineToolSet } from '@tool/type';
import { ToolTagEnum } from '@tool/type/tags';

export default defineToolSet({
  tags: [ToolTagEnum.enum.search, ToolTagEnum.enum.productivity],
  name: {
    'zh-CN': 'AI 开源项目雷达',
    en: 'AI Open Source Radar'
  },
  description: {
    'zh-CN':
      '聚焦 GitHub AI 开源项目的发现、识别、相似项目推荐与替代对比。可选接入 GitHub Token 提高额度，并用 Hacker News 讨论作为外部社区评价信号。',
    en: 'Discover, analyze, and compare GitHub AI open-source projects. Optional GitHub token improves rate limits; Hacker News discussions provide community signals.'
  },
  toolDescription:
    '第一版重点 GitHub：discoverAiProjects 找近期 AI 项目；analyzeGithubProject 分析仓库、README、目录、更新和社区讨论；findSimilarGithubProjects 找相似/替代项目。GitHub Token 可选但推荐配置。',
  courseUrl: 'https://docs.github.com/en/rest',
  secretInputConfig: [
    {
      key: 'githubToken',
      label: 'GitHub Token（可选）',
      description:
        '推荐填写 fine-grained token（只读 public repositories 即可），提高 GitHub API 额度；不填也可查询公开仓库但更容易限流。',
      required: false,
      inputType: 'secret'
    },
    {
      key: 'githubApiBaseUrl',
      label: 'GitHub API Base URL（可选）',
      description: '默认 https://api.github.com；企业版或代理可修改。',
      required: false,
      inputType: 'input'
    },
    {
      key: 'userAgent',
      label: 'User-Agent（可选）',
      description: '默认 AI-Open-Source-Radar/1.0。',
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
      key: 'maxResults',
      label: '最大返回项目数（可选）',
      description: '默认 10，范围 1-30。工具会对结果数做兜底限制。',
      required: false,
      inputType: 'input'
    }
  ]
});
