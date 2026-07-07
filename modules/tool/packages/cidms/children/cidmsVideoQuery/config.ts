import { defineTool } from '@tool/type';
import {
  FlowNodeInputTypeEnum,
  FlowNodeOutputTypeEnum,
  WorkflowIOValueTypeEnum
} from '@tool/type/ipolloos';

export default defineTool({
  name: {
    'zh-CN': 'CIDMS 查询视频任务',
    en: 'CIDMS Query Video Task'
  },
  description: {
    'zh-CN': '根据任务 ID 查询 CIDMS 视频生成状态和结果。',
    en: 'Query CIDMS video generation status and result by task ID.'
  },
  toolDescription: 'Query /v1/video/generations/{task_id}. Stop polling after terminal status.',
  versionList: [
    {
      value: '1.1.4',
      description: '视频任务查询',
      inputs: [
        {
          key: 'task_id',
          label: '任务 ID',
          valueType: WorkflowIOValueTypeEnum.string,
          renderTypeList: [FlowNodeInputTypeEnum.input, FlowNodeInputTypeEnum.reference],
          required: true
        }
      ],
      outputs: [
        { valueType: WorkflowIOValueTypeEnum.string, key: 'task_id', label: '任务 ID' },
        { valueType: WorkflowIOValueTypeEnum.string, key: 'status', label: '状态' },
        { valueType: WorkflowIOValueTypeEnum.number, key: 'progress', label: '进度' },
        { valueType: WorkflowIOValueTypeEnum.string, key: 'result_url', label: '结果视频地址' },
        { valueType: WorkflowIOValueTypeEnum.string, key: 'response_json', label: '接口返回 JSON' },
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
