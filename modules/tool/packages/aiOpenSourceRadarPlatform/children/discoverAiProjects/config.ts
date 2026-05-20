import { defineTool } from '@tool/type';
import {
  FlowNodeInputTypeEnum,
  FlowNodeOutputTypeEnum,
  WorkflowIOValueTypeEnum
} from '@tool/type/ipolloos';

export default defineTool({
  name: {
    'zh-CN': '推荐 AI 开源项目',
    en: 'Discover AI open-source projects'
  },
  description: {
    'zh-CN': '按需求、方向、时间范围从 GitHub 推荐近期值得关注的 AI 开源项目。',
    en: 'Discover notable AI open-source projects from GitHub by requirement, direction, and time range.'
  },
  toolDescription:
    '用于“最近有什么 AI 项目值得看/按需求推荐项目”。第一版重点 GitHub，评分为启发式判断；重点项目继续调用 analyzeGithubProject。',
  versionList: [
    {
      value: '1.4.0',
      description: '近期改为近半个月，新增半年；推荐输出拆分新发布项目与近期更新项目',
      inputs: [
        {
          key: 'query',
          label: '需求/关键词',
          valueType: WorkflowIOValueTypeEnum.string,
          renderTypeList: [FlowNodeInputTypeEnum.reference, FlowNodeInputTypeEnum.textarea],
          placeholder: '例如 browser agent、RAG、coding agent',
          toolDescription: '用户想找的 AI 项目方向或关键词。'
        },
        {
          key: 'direction',
          label: 'AI 方向（可选）',
          valueType: WorkflowIOValueTypeEnum.string,
          renderTypeList: [FlowNodeInputTypeEnum.select, FlowNodeInputTypeEnum.reference],
          list: [
            { label: '自动', value: '' },
            { label: 'AI Agent', value: 'agent' },
            { label: 'RAG / 知识库', value: 'RAG' },
            { label: 'Coding Agent', value: 'coding agent' },
            { label: 'Browser Agent', value: 'browser agent' },
            { label: 'MCP / Tool Use', value: 'MCP tool use' },
            { label: 'LLM App Framework', value: 'LLM app framework' }
          ]
        },
        {
          key: 'discoveryMode',
          label: '推荐模式',
          valueType: WorkflowIOValueTypeEnum.string,
          renderTypeList: [FlowNodeInputTypeEnum.select, FlowNodeInputTypeEnum.reference],
          required: true,
          defaultValue: 'recent_new',
          list: [
            { label: '近期新项目（推荐）', value: 'recent_new' },
            { label: '近期活跃项目', value: 'recent_active' },
            { label: '宽泛 AI 搜索', value: 'broad_ai' }
          ],
          toolDescription:
            'recent_new 适合“今日/近期有什么新 AI 项目”；recent_active 适合成熟项目最近更新；broad_ai 用于宽泛召回。'
        },
        {
          key: 'timeRange',
          label: '时间范围',
          valueType: WorkflowIOValueTypeEnum.string,
          renderTypeList: [FlowNodeInputTypeEnum.select, FlowNodeInputTypeEnum.reference],
          required: true,
          defaultValue: '15d',
          list: [
            { label: '今日', value: 'today' },
            { label: '24 小时', value: '24h' },
            { label: '7 天', value: '7d' },
            { label: '近期 / 半个月', value: '15d' },
            { label: '30 天', value: '30d' },
            { label: '90 天', value: '90d' },
            { label: '半年', value: '180d' }
          ]
        },
        {
          key: 'language',
          label: '语言（可选）',
          valueType: WorkflowIOValueTypeEnum.string,
          renderTypeList: [FlowNodeInputTypeEnum.reference, FlowNodeInputTypeEnum.input],
          placeholder: 'TypeScript / Python'
        },
        {
          key: 'minStars',
          label: '最低 stars',
          valueType: WorkflowIOValueTypeEnum.number,
          renderTypeList: [FlowNodeInputTypeEnum.numberInput, FlowNodeInputTypeEnum.reference],
          required: true,
          defaultValue: 20
        },
        {
          key: 'maxResults',
          label: '返回项目数',
          valueType: WorkflowIOValueTypeEnum.number,
          renderTypeList: [FlowNodeInputTypeEnum.numberInput, FlowNodeInputTypeEnum.reference],
          required: true,
          defaultValue: 10
        },
        {
          key: 'sort',
          label: '排序',
          valueType: WorkflowIOValueTypeEnum.string,
          renderTypeList: [FlowNodeInputTypeEnum.select, FlowNodeInputTypeEnum.reference],
          required: true,
          defaultValue: 'stars',
          list: [
            { label: 'Stars', value: 'stars' },
            { label: '最近更新', value: 'updated' },
            { label: 'Forks', value: 'forks' }
          ]
        }
      ],
      outputs: [
        {
          valueType: WorkflowIOValueTypeEnum.string,
          key: 'projects_markdown',
          label: '推荐结果 Markdown'
        },
        { valueType: WorkflowIOValueTypeEnum.string, key: 'projects_json', label: '项目 JSON' },
        {
          valueType: WorkflowIOValueTypeEnum.string,
          key: 'updated_projects_json',
          label: '近期更新项目 JSON'
        },
        {
          valueType: WorkflowIOValueTypeEnum.string,
          key: 'github_query',
          label: 'GitHub 查询语句'
        },
        {
          valueType: WorkflowIOValueTypeEnum.string,
          key: 'updated_github_query',
          label: '更新项目查询语句'
        },
        { valueType: WorkflowIOValueTypeEnum.string, key: 'source_links', label: '仓库链接' },
        { valueType: WorkflowIOValueTypeEnum.number, key: 'count', label: '返回数量' },
        { valueType: WorkflowIOValueTypeEnum.number, key: 'updated_count', label: '近期更新数量' },
        {
          type: FlowNodeOutputTypeEnum.error,
          valueType: WorkflowIOValueTypeEnum.string,
          key: 'system_error',
          label: '错误'
        }
      ]
    }
  ]
});
