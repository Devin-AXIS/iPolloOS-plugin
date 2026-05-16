import { defineTool } from '@tool/type';
import {
  FlowNodeInputTypeEnum,
  FlowNodeOutputTypeEnum,
  WorkflowIOValueTypeEnum
} from '@tool/type/ipolloos';

export default defineTool({
  name: {
    'zh-CN': 'Manus 更新任务',
    en: 'Manus Task Update'
  },
  description: {
    'zh-CN': 'POST task.update 更新标题、分享可见性、是否在任务列表展示。',
    en: 'POST /v2/task.update — metadata / visibility.'
  },
  toolDescription: 'At least one optional field besides task_id should be set when updating.',
  versionList: [
    {
      value: '1.0.0',
      description: 'Initial',
      inputs: [
        {
          key: 'taskId',
          label: 'task_id',
          valueType: WorkflowIOValueTypeEnum.string,
          renderTypeList: [FlowNodeInputTypeEnum.reference, FlowNodeInputTypeEnum.input],
          required: true
        },
        {
          key: 'title',
          label: '标题 title',
          valueType: WorkflowIOValueTypeEnum.string,
          renderTypeList: [FlowNodeInputTypeEnum.reference, FlowNodeInputTypeEnum.input]
        },
        {
          key: 'shareVisibility',
          label: 'share_visibility',
          valueType: WorkflowIOValueTypeEnum.string,
          renderTypeList: [FlowNodeInputTypeEnum.select, FlowNodeInputTypeEnum.input],
          list: [
            { label: 'private', value: 'private' },
            { label: 'team', value: 'team' },
            { label: 'public', value: 'public' }
          ]
        },
        {
          key: 'enableVisibleInTaskList',
          label: 'enable_visible_in_task_list',
          valueType: WorkflowIOValueTypeEnum.boolean,
          renderTypeList: [FlowNodeInputTypeEnum.reference, FlowNodeInputTypeEnum.switch]
        }
      ],
      outputs: [
        {
          valueType: WorkflowIOValueTypeEnum.string,
          key: 'summary',
          label: '摘要'
        },
        {
          valueType: WorkflowIOValueTypeEnum.string,
          key: 'detail_json',
          label: '完整响应 JSON'
        },
        {
          type: FlowNodeOutputTypeEnum.error,
          valueType: WorkflowIOValueTypeEnum.string,
          key: 'system_error',
          label: '错误信息'
        }
      ]
    }
  ]
});
