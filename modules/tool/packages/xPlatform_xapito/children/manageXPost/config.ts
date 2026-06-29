import { defineTool } from '@tool/type';
import {
  FlowNodeInputTypeEnum,
  FlowNodeOutputTypeEnum,
  WorkflowIOValueTypeEnum
} from '@tool/type/ipolloos';

export default defineTool({
  toolId: 'xPlatform_xapito/manageXPost',
  name: {
    'zh-CN': '管理 X 帖子',
    en: 'Manage X post'
  },
  description: {
    'zh-CN': '删除、点赞、取消点赞、转发或取消转发指定 X Post。',
    en: 'Delete, like, unlike, repost, or undo repost for a specific X post.'
  },
  toolDescription:
    'Manage a specific X post. Valid action values are delete, like, unlike, repost, undo_repost. retweet is accepted as an alias for repost; unretweet/unrepost are accepted as aliases for undo_repost. The actor user id is resolved automatically from userAccessToken. Requires userAccessToken in the toolset secret config.',
  runtime: {
    kind: 'execute',
    execute: {
      riskLevel: 'write'
    }
  },
  versionList: [
    {
      value: '1.0.6',
      description: '帖子动作管理',
      inputs: [
        {
          key: 'action',
          label: '动作',
          required: true,
          defaultValue: 'like',
          valueType: WorkflowIOValueTypeEnum.string,
          renderTypeList: [FlowNodeInputTypeEnum.select, FlowNodeInputTypeEnum.reference],
          list: [
            { label: '删除', value: 'delete' },
            { label: '点赞', value: 'like' },
            { label: '取消点赞', value: 'unlike' },
            { label: '转发', value: 'repost' },
            { label: '取消转发', value: 'undo_repost' }
          ],
          toolDescription:
            'The action to apply to the target post. Valid values: delete, like, unlike, repost, undo_repost. Aliases: retweet=repost, unretweet/unrepost=undo_repost.'
        },
        {
          key: 'post_id',
          label: 'Post ID',
          required: true,
          valueType: WorkflowIOValueTypeEnum.string,
          renderTypeList: [FlowNodeInputTypeEnum.reference, FlowNodeInputTypeEnum.input],
          toolDescription: 'The target X post id.'
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
          key: 'action',
          label: '动作'
        },
        {
          valueType: WorkflowIOValueTypeEnum.string,
          key: 'post_id',
          label: 'Post ID'
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
