import { defineTool } from '@tool/type';
import {
  FlowNodeInputTypeEnum,
  FlowNodeOutputTypeEnum,
  WorkflowIOValueTypeEnum
} from '@tool/type/ipolloos';

export default defineTool({
  toolId: 'xPlatform_xapito/publishXPost',
  name: {
    'zh-CN': '发布 X 内容',
    en: 'Publish X post'
  },
  description: {
    'zh-CN': '使用 X 用户操作令牌发布新内容，也可填写引用 Post ID 作为引用发布。',
    en: 'Publish a new X post with a user-context token, optionally as a quote post.'
  },
  toolDescription:
    'Create a new X post through the official X API. Use quote_post_id only when the user wants to quote an existing post. Requires userAccessToken in the toolset secret config; bearerToken is read-only and cannot publish posts.',
  runtime: {
    kind: 'execute',
    execute: {
      riskLevel: 'write'
    }
  },
  versionList: [
    {
      value: '1.0.5',
      description: '发布新内容或引用内容',
      inputs: [
        {
          key: 'text',
          label: '发布内容',
          required: true,
          valueType: WorkflowIOValueTypeEnum.string,
          renderTypeList: [FlowNodeInputTypeEnum.textarea, FlowNodeInputTypeEnum.reference],
          placeholder: '输入要发布到 X 的内容',
          toolDescription: 'The post text to publish.'
        },
        {
          key: 'quote_post_id',
          label: '引用 Post ID（可选）',
          valueType: WorkflowIOValueTypeEnum.string,
          renderTypeList: [FlowNodeInputTypeEnum.reference, FlowNodeInputTypeEnum.input],
          toolDescription: 'Optional X post id to quote.'
        },
        {
          key: 'mask_sensitive_info',
          label: '屏蔽敏感信息',
          defaultValue: true,
          valueType: WorkflowIOValueTypeEnum.boolean,
          renderTypeList: [FlowNodeInputTypeEnum.switch, FlowNodeInputTypeEnum.reference],
          toolDescription: '开启后会屏蔽社交平台敏感词和链接。'
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
          label: 'Post ID'
        },
        {
          valueType: WorkflowIOValueTypeEnum.string,
          key: 'post_url',
          label: 'Post 链接'
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
