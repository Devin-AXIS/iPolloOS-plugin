import { defineTool } from '@tool/type';
import {
  FlowNodeInputTypeEnum,
  FlowNodeOutputTypeEnum,
  WorkflowIOValueTypeEnum
} from '@tool/type/ipolloos';

export default defineTool({
  name: {
    'zh-CN': '识别分析 GitHub 项目',
    en: 'Analyze GitHub project'
  },
  description: {
    'zh-CN': '读取 GitHub 仓库、README、根目录、最近更新，并补充 Hacker News 外部讨论信号。',
    en: 'Analyze a GitHub repository with README, root structure, recent updates, and Hacker News discussion signals.'
  },
  toolDescription:
    '用于用户给项目名或 GitHub 链接后的深度识别。输入 owner/repo 或 GitHub URL。社区评价搜不到会明确返回未找到。',
  versionList: [
    {
      value: '1.4.0',
      description: '增强深度研究：语言占比、贡献者、提交节奏、仓库树、关键文件、架构与代码价值判断',
      inputs: [
        {
          key: 'project',
          label: '项目',
          valueType: WorkflowIOValueTypeEnum.string,
          renderTypeList: [FlowNodeInputTypeEnum.reference, FlowNodeInputTypeEnum.input],
          required: true,
          placeholder: 'microsoft/autogen 或 https://github.com/microsoft/autogen',
          toolDescription: 'GitHub 仓库链接或 owner/repo。'
        },
        {
          key: 'includeCommunityReview',
          label: '搜索社区评价',
          valueType: WorkflowIOValueTypeEnum.boolean,
          renderTypeList: [FlowNodeInputTypeEnum.switch, FlowNodeInputTypeEnum.reference],
          required: true,
          defaultValue: true,
          toolDescription: '第一版接 Hacker News Algolia。搜不到则返回空。'
        }
      ],
      outputs: [
        {
          valueType: WorkflowIOValueTypeEnum.string,
          key: 'brief_markdown',
          label: '项目分析 Markdown'
        },
        { valueType: WorkflowIOValueTypeEnum.string, key: 'repo_json', label: '仓库 JSON' },
        { valueType: WorkflowIOValueTypeEnum.string, key: 'metrics_json', label: '指标 JSON' },
        {
          valueType: WorkflowIOValueTypeEnum.string,
          key: 'root_structure_json',
          label: '根目录 JSON'
        },
        {
          valueType: WorkflowIOValueTypeEnum.string,
          key: 'architecture_json',
          label: '架构线索 JSON'
        },
        {
          valueType: WorkflowIOValueTypeEnum.string,
          key: 'recent_updates_json',
          label: '最近更新 JSON'
        },
        {
          valueType: WorkflowIOValueTypeEnum.string,
          key: 'community_review_markdown',
          label: '社区评价 Markdown'
        },
        { valueType: WorkflowIOValueTypeEnum.string, key: 'source_links', label: '来源链接' },
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
