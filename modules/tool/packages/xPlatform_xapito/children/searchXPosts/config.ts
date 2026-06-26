import { defineTool } from '@tool/type';
import {
  FlowNodeInputTypeEnum,
  FlowNodeOutputTypeEnum,
  WorkflowIOValueTypeEnum
} from '@tool/type/ipolloos';

export default defineTool({
  toolId: 'xPlatform_xapito/searchXPosts',
  name: {
    'zh-CN': '搜索 X 内容',
    en: 'Search X posts'
  },
  description: {
    'zh-CN': '按关键词、话题或 X 查询语法搜索最新、相关或高互动内容。',
    en: 'Search latest, relevant, or high-engagement X posts by keyword, topic, or X query syntax.'
  },
  toolDescription:
    'User-friendly X post search. Recent search covers the last 7 days. Full archive uses paid/eligible X API access. Hot sorts returned posts by public engagement metrics.',
  runtime: {
    kind: 'execute',
    execute: {
      riskLevel: 'read'
    }
  },
  versionList: [
    {
      value: '1.0.5',
      description: '最新、相关、高互动内容搜索',
      inputs: [
        {
          key: 'query',
          label: '搜索内容',
          required: true,
          valueType: WorkflowIOValueTypeEnum.string,
          renderTypeList: [FlowNodeInputTypeEnum.textarea, FlowNodeInputTypeEnum.reference],
          placeholder: 'AI agent -is:retweet',
          toolDescription: 'Keyword, hashtag, username operator, or X search query syntax.'
        },
        {
          key: 'view',
          label: '搜索类型',
          required: true,
          defaultValue: 'latest',
          valueType: WorkflowIOValueTypeEnum.string,
          renderTypeList: [FlowNodeInputTypeEnum.select, FlowNodeInputTypeEnum.reference],
          list: [
            { label: '最新', value: 'latest' },
            { label: '相关', value: 'relevant' },
            { label: '高互动', value: 'hot' }
          ],
          toolDescription:
            'latest returns newest posts; relevant uses X relevancy sort; hot ranks returned posts by public engagement.'
        },
        {
          key: 'scope',
          label: '搜索范围',
          required: true,
          defaultValue: 'recent',
          valueType: WorkflowIOValueTypeEnum.string,
          renderTypeList: [FlowNodeInputTypeEnum.select, FlowNodeInputTypeEnum.reference],
          list: [
            { label: '最近 7 天', value: 'recent' },
            { label: '历史全量（付费）', value: 'all' }
          ],
          toolDescription:
            'recent uses the generally available recent search endpoint. all uses full-archive search and requires eligible paid X API access.'
        }
      ],
      outputs: [
        {
          valueType: WorkflowIOValueTypeEnum.string,
          key: 'answer_markdown',
          label: '搜索结果'
        },
        {
          valueType: WorkflowIOValueTypeEnum.string,
          key: 'posts_json',
          label: 'Posts JSON'
        },
        {
          valueType: WorkflowIOValueTypeEnum.string,
          key: 'source_links',
          label: '链接列表'
        },
        {
          valueType: WorkflowIOValueTypeEnum.number,
          key: 'result_count',
          label: '返回数量'
        },
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
