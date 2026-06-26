import { defineTool } from '@tool/type';
import {
  FlowNodeInputTypeEnum,
  FlowNodeOutputTypeEnum,
  WorkflowIOValueTypeEnum
} from '@tool/type/ipolloos';

export default defineTool({
  toolId: 'xPlatform_xapito/replyXPost',
  name: {
    'zh-CN': '回复 X 内容',
    en: 'Reply to X post'
  },
  description: {
    'zh-CN': '使用 X 用户操作令牌回复指定 Post。',
    en: 'Reply to a specific X post with a user-context token.'
  },
  toolDescription:
    'Reply to an existing X post through the official X API. Requires userAccessToken in the toolset secret config; bearerToken is read-only and cannot reply.',
  runtime: {
    kind: 'execute',
    execute: {
      riskLevel: 'write'
    }
  },
  versionList: [
    {
      value: '1.0.5',
      description: '回复指定内容',
      inputs: [
        {
          key: 'reply_to_post_id',
          label: '回复 Post ID',
          required: true,
          valueType: WorkflowIOValueTypeEnum.string,
          renderTypeList: [FlowNodeInputTypeEnum.reference, FlowNodeInputTypeEnum.input],
          toolDescription: 'The X post id to reply to.'
        },
        {
          key: 'text',
          label: '回复内容',
          required: true,
          valueType: WorkflowIOValueTypeEnum.string,
          renderTypeList: [FlowNodeInputTypeEnum.textarea, FlowNodeInputTypeEnum.reference],
          placeholder: '输入回复内容',
          toolDescription: 'The reply text.'
        }
      ],
      outputs: [
        {
          valueType: WorkflowIOValueTypeEnum.boolean,
          key: 'success',
          label: '是否成功'
        },
        {
          valueType: WorkflowIOValueTypeEnum.string,
          key: 'post_id',
          label: '回复 Post ID'
        },
        {
          valueType: WorkflowIOValueTypeEnum.string,
          key: 'post_url',
          label: '回复链接'
        },
        {
          valueType: WorkflowIOValueTypeEnum.string,
          key: 'summary',
          label: '执行摘要'
        },
        {
          valueType: WorkflowIOValueTypeEnum.string,
          key: 'result_json',
          label: '结果 JSON'
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
