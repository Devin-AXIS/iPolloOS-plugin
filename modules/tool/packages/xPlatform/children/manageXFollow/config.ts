import { defineTool } from '@tool/type';
import {
  FlowNodeInputTypeEnum,
  FlowNodeOutputTypeEnum,
  WorkflowIOValueTypeEnum
} from '@tool/type/ipolloos';

export default defineTool({
  name: {
    'zh-CN': '管理 X 关注',
    en: 'Manage X follow'
  },
  description: {
    'zh-CN': '关注或取关指定 X 用户。',
    en: 'Follow or unfollow a specific X user.'
  },
  toolDescription:
    'Follow or unfollow an X user. The actor user id is resolved automatically from userAccessToken. Target username is resolved through the X user lookup API.',
  runtime: {
    kind: 'execute',
    execute: {
      riskLevel: 'write'
    }
  },
  versionList: [
    {
      value: '1.0.0',
      description: '关注关系管理',
      inputs: [
        {
          key: 'action',
          label: '动作',
          required: true,
          defaultValue: 'follow',
          valueType: WorkflowIOValueTypeEnum.string,
          renderTypeList: [FlowNodeInputTypeEnum.select, FlowNodeInputTypeEnum.reference],
          list: [
            { label: '关注', value: 'follow' },
            { label: '取关', value: 'unfollow' }
          ],
          toolDescription: 'Whether to follow or unfollow the target user.'
        },
        {
          key: 'target_username',
          label: '目标用户名',
          required: true,
          valueType: WorkflowIOValueTypeEnum.string,
          renderTypeList: [FlowNodeInputTypeEnum.reference, FlowNodeInputTypeEnum.input],
          placeholder: 'xdevelopers',
          toolDescription: 'Target X username, with or without @.'
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
          key: 'action',
          label: '动作'
        },
        {
          valueType: WorkflowIOValueTypeEnum.string,
          key: 'target_user_id',
          label: '目标用户 ID'
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
