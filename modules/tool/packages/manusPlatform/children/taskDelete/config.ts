import { defineTool } from '@tool/type';
import {
  FlowNodeInputTypeEnum,
  FlowNodeOutputTypeEnum,
  WorkflowIOValueTypeEnum
} from '@tool/type/ipolloos';

export default defineTool({
  name: {
    'zh-CN': 'Manus 删除任务',
    en: 'Manus Task Delete'
  },
  description: {
    'zh-CN': 'POST task.delete 永久删除任务（Agent 相关任务不可删）。',
    en: 'POST /v2/task.delete — permanently delete a task.'
  },
  toolDescription: 'Stop running tasks first if needed. Agent-related tasks cannot be deleted.',
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
