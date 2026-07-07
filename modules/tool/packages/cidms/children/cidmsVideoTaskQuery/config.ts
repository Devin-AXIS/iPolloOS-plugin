import { defineTool } from '@tool/type';
import {
  FlowNodeInputTypeEnum,
  FlowNodeOutputTypeEnum,
  WorkflowIOValueTypeEnum
} from '@tool/type/ipolloos';

export default defineTool({
  toolId: 'cidms/cidmsVideoTaskQuery',
  name: {
    'zh-CN': 'CIDMS 视频任务等待查询',
    en: 'CIDMS Video Task Wait Query'
  },
  description: {
    'zh-CN': '按任务 ID 查询视频生成结果。插件内部固定每 10 秒查询一次，查到视频 URL 或超时后返回。',
    en: 'Query a video generation task by task ID. The tool waits internally and checks every 10 seconds until a video URL is available or the wait times out.'
  },
  toolDescription:
    'Wait for a CIDMS video task result. This is a normal tool call, not a host polling trigger. It checks the task every 10 seconds internally.',
  versionList: [
    {
      value: '1.1.4',
      description: '视频任务等待查询',
      inputs: [
        {
          key: 'task_id',
          label: '任务 ID',
          valueType: WorkflowIOValueTypeEnum.string,
          renderTypeList: [FlowNodeInputTypeEnum.input, FlowNodeInputTypeEnum.reference],
          required: true,
          toolDescription: '视频生成任务返回的 task_id。'
        },
        {
          key: 'max_wait_seconds',
          label: '最大等待秒数',
          valueType: WorkflowIOValueTypeEnum.number,
          renderTypeList: [FlowNodeInputTypeEnum.numberInput, FlowNodeInputTypeEnum.reference],
          defaultValue: 600,
          min: 0,
          max: 1800,
          required: false,
          toolDescription: '最多等待多久。插件内部固定每 10 秒查询一次，默认最多等待 10 分钟。'
        }
      ],
      outputs: [
        { valueType: WorkflowIOValueTypeEnum.string, key: 'task_id', label: '任务 ID' },
        { valueType: WorkflowIOValueTypeEnum.string, key: 'status', label: '状态' },
        { valueType: WorkflowIOValueTypeEnum.number, key: 'progress', label: '进度' },
        { valueType: WorkflowIOValueTypeEnum.string, key: 'result_url', label: '视频地址' },
        { valueType: WorkflowIOValueTypeEnum.boolean, key: 'completed', label: '是否完成' },
        { valueType: WorkflowIOValueTypeEnum.boolean, key: 'should_continue', label: '是否继续查询' },
        { valueType: WorkflowIOValueTypeEnum.number, key: 'poll_count', label: '查询次数' },
        { valueType: WorkflowIOValueTypeEnum.number, key: 'elapsed_seconds', label: '耗时秒数' },
        { valueType: WorkflowIOValueTypeEnum.boolean, key: 'timed_out', label: '是否超时' },
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
