import { defineTool } from '@tool/type';
import {
  FlowNodeInputTypeEnum,
  FlowNodeOutputTypeEnum,
  WorkflowIOValueTypeEnum
} from '@tool/type/ipolloos';

export default defineTool({
  name: {
    'zh-CN': 'X 账号综合查询',
    en: 'X account overview'
  },
  description: {
    'zh-CN': '输入一个或多个用户名，综合返回账号资料、最近内容、互动数据和链接。',
    en: 'Return profile, recent posts, engagement data, and links for one or more usernames.'
  },
  toolDescription:
    'User-friendly account overview. It resolves usernames internally, fetches profile data and recent account posts, and returns a readable summary plus structured JSON.',
  runtime: {
    kind: 'execute',
    execute: {
      riskLevel: 'read'
    }
  },
  versionList: [
    {
      value: '1.0.1',
      description: '账号资料 + 最新内容综合查询',
      inputs: [
        {
          key: 'username',
          label: '用户名列表',
          required: true,
          valueType: WorkflowIOValueTypeEnum.string,
          renderTypeList: [FlowNodeInputTypeEnum.textarea, FlowNodeInputTypeEnum.reference],
          placeholder: 'xdevelopers\nopenai',
          toolDescription:
            'One or more X usernames, with or without @. Use new lines, commas, or spaces.'
        }
      ],
      outputs: [
        {
          valueType: WorkflowIOValueTypeEnum.string,
          key: 'summary_markdown',
          label: '综合摘要'
        },
        {
          valueType: WorkflowIOValueTypeEnum.string,
          key: 'accounts_json',
          label: '账号 JSON'
        },
        {
          valueType: WorkflowIOValueTypeEnum.string,
          key: 'posts_json',
          label: '最近内容 JSON'
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
