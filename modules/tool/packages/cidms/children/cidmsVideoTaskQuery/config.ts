import { defineTool } from '@tool/type';
import {
  FlowNodeInputTypeEnum,
  FlowNodeOutputTypeEnum,
  WorkflowIOValueTypeEnum
} from '@tool/type/ipolloos';

export default defineTool({
  toolId: 'cidms/cidmsVideoTaskQuery',
  name: {
    'zh-CN': 'CIDMS 视频任务查询',
    en: 'CIDMS Video Task Query'
  },
  description: {
    'zh-CN': '按任务 ID 查询视频生成结果。适合由主系统每 10s 触发一次，查到 URL 后停止。',
    en: 'Query a video generation task by task ID. Designed for host-triggered polling every 10s until a URL is available.'
  },
  toolDescription:
    'Query a CIDMS video task once. If should_continue is true, the host may run this tool again with the same task_id.',
  runtime: {
    kind: 'trigger',
    trigger: {
      type: 'polling',
      configurableInterval: true,
      schedule: {
        minIntervalSeconds: 10,
        defaultIntervalSeconds: 10,
        maxIntervalSeconds: 300,
        timeoutSeconds: 30,
        jitterSeconds: 1
      },
      permissions: {
        allowManualRun: true,
        allowAutoRun: true
      }
    }
  },
  versionList: [
    {
      value: '1.0.0',
      description: '视频任务单次查询',
      inputs: [
        {
          key: 'task_id',
          label: '任务 ID',
          valueType: WorkflowIOValueTypeEnum.string,
          renderTypeList: [FlowNodeInputTypeEnum.input, FlowNodeInputTypeEnum.reference],
          required: true,
          toolDescription: '视频生成任务返回的 task_id。'
        }
      ],
      outputs: [
        { valueType: WorkflowIOValueTypeEnum.string, key: 'task_id', label: '任务 ID' },
        { valueType: WorkflowIOValueTypeEnum.string, key: 'status', label: '状态' },
        { valueType: WorkflowIOValueTypeEnum.number, key: 'progress', label: '进度' },
        { valueType: WorkflowIOValueTypeEnum.string, key: 'result_url', label: '视频地址' },
        { valueType: WorkflowIOValueTypeEnum.boolean, key: 'completed', label: '是否完成' },
        { valueType: WorkflowIOValueTypeEnum.boolean, key: 'should_continue', label: '是否继续查询' },
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
