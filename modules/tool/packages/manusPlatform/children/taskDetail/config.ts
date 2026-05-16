import { defineTool } from '@tool/type';
import {
  FlowNodeInputTypeEnum,
  FlowNodeOutputTypeEnum,
  WorkflowIOValueTypeEnum
} from '@tool/type/ipolloos';

export default defineTool({
  name: {
    'zh-CN': 'Manus 任务详情',
    en: 'Manus Task Detail'
  },
  description: {
    'zh-CN': 'GET task.detail 查询任务状态与元数据。',
    en: 'GET /v2/task.detail — task status & metadata.'
  },
  toolDescription:
    'Lightweight status only; do not spam in a loop with taskListMessages. At most one detail check between longer listMessages polls (~8–15s). Branch on `status` output.',
  versionList: [
    {
      value: '1.0.0',
      description: 'Initial',
      inputs: [
        {
          key: 'taskId',
          label: 'Task ID',
          valueType: WorkflowIOValueTypeEnum.string,
          renderTypeList: [FlowNodeInputTypeEnum.reference, FlowNodeInputTypeEnum.input],
          required: true,
          toolDescription: 'Use agent-default-main_task for IM agent.'
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
          label: 'Task JSON'
        },
        {
          valueType: WorkflowIOValueTypeEnum.string,
          key: 'status',
          label: '状态 running/stopped/waiting/error'
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
