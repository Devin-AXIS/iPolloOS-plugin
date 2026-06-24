import { defineTool } from '@tool/type';
import {
  FlowNodeInputTypeEnum,
  FlowNodeOutputTypeEnum,
  WorkflowIOValueTypeEnum
} from '@tool/type/ipolloos';

export default defineTool({
  toolId: 'xPlatform_xapito/queryXContent',
  name: {
    'zh-CN': '查询 X 内容',
    en: 'Query X content'
  },
  description: {
    'zh-CN': '通过 X 官方 API 查询账号资料、账号时间线或最近 7 天搜索结果。',
    en: 'Query X profiles, user timelines, or recent search results through the official X API.'
  },
  toolDescription:
    'Read-only X API tool. Use mode=user_by_username for profile lookup, mode=user_posts for a user timeline, and mode=recent_search for recent post search. Requires bearerToken from the toolset secret config.',
  runtime: {
    kind: 'execute',
    execute: {
      riskLevel: 'read'
    }
  },
  versionList: [
    {
      value: '1.0.1',
      description: '账号查询、账号时间线和最近搜索',
      inputs: [
        {
          key: 'mode',
          label: '查询模式',
          required: true,
          defaultValue: 'user_posts',
          valueType: WorkflowIOValueTypeEnum.string,
          renderTypeList: [FlowNodeInputTypeEnum.select, FlowNodeInputTypeEnum.reference],
          list: [
            { label: '账号资料', value: 'user_by_username' },
            { label: '账号内容', value: 'user_posts' },
            { label: '最近搜索', value: 'recent_search' }
          ],
          toolDescription:
            '账号资料用 user_by_username；看某人发帖用 user_posts；关键词搜索用 recent_search。'
        },
        {
          key: 'username',
          label: '用户名',
          valueType: WorkflowIOValueTypeEnum.string,
          renderTypeList: [FlowNodeInputTypeEnum.reference, FlowNodeInputTypeEnum.input],
          placeholder: 'xdevelopers',
          toolDescription: 'X 用户名，可带或不带 @。账号资料和账号内容模式常用。'
        },
        {
          key: 'query',
          label: '搜索语句（可选）',
          valueType: WorkflowIOValueTypeEnum.string,
          renderTypeList: [FlowNodeInputTypeEnum.reference, FlowNodeInputTypeEnum.input],
          placeholder: 'from:xdevelopers -is:retweet',
          toolDescription: 'X recent search 查询语法；仅 recent_search 模式必填。'
        },
        {
          key: 'max_results',
          label: '返回条数',
          required: true,
          defaultValue: 10,
          valueType: WorkflowIOValueTypeEnum.number,
          renderTypeList: [FlowNodeInputTypeEnum.numberInput, FlowNodeInputTypeEnum.reference],
          min: 5,
          max: 100,
          toolDescription: '账号时间线范围 5-100；最近搜索会自动提升到至少 10。'
        },
        {
          key: 'pagination_token',
          label: '分页 token（可选）',
          valueType: WorkflowIOValueTypeEnum.string,
          renderTypeList: [FlowNodeInputTypeEnum.reference, FlowNodeInputTypeEnum.input],
          toolDescription: '上一页输出 next_token，可用于继续翻页。'
        },
        {
          key: 'start_time',
          label: '起始时间（可选）',
          valueType: WorkflowIOValueTypeEnum.string,
          renderTypeList: [FlowNodeInputTypeEnum.reference, FlowNodeInputTypeEnum.input],
          placeholder: '2026-06-01T00:00:00Z',
          toolDescription: 'ISO-8601 UTC 时间。'
        },
        {
          key: 'end_time',
          label: '结束时间（可选）',
          valueType: WorkflowIOValueTypeEnum.string,
          renderTypeList: [FlowNodeInputTypeEnum.reference, FlowNodeInputTypeEnum.input],
          placeholder: '2026-06-09T00:00:00Z',
          toolDescription: 'ISO-8601 UTC 时间。'
        },
        {
          key: 'include_replies',
          label: '包含回复',
          defaultValue: true,
          valueType: WorkflowIOValueTypeEnum.boolean,
          renderTypeList: [FlowNodeInputTypeEnum.switch, FlowNodeInputTypeEnum.reference],
          toolDescription: '仅账号内容模式使用。'
        },
        {
          key: 'include_retweets',
          label: '包含转发',
          defaultValue: true,
          valueType: WorkflowIOValueTypeEnum.boolean,
          renderTypeList: [FlowNodeInputTypeEnum.switch, FlowNodeInputTypeEnum.reference],
          toolDescription: '仅账号内容模式使用。'
        }
      ],
      outputs: [
        {
          valueType: WorkflowIOValueTypeEnum.string,
          key: 'answer_markdown',
          label: '可直接回复的 Markdown'
        },
        {
          valueType: WorkflowIOValueTypeEnum.string,
          key: 'posts_json',
          label: 'Posts JSON'
        },
        {
          valueType: WorkflowIOValueTypeEnum.string,
          key: 'users_json',
          label: 'Users JSON'
        },
        {
          valueType: WorkflowIOValueTypeEnum.string,
          key: 'source_links',
          label: '链接列表'
        },
        {
          valueType: WorkflowIOValueTypeEnum.string,
          key: 'next_token',
          label: '下一页 token'
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
