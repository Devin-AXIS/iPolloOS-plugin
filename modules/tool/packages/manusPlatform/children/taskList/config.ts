import { defineTool } from '@tool/type';
import {
  FlowNodeInputTypeEnum,
  FlowNodeOutputTypeEnum,
  WorkflowIOValueTypeEnum
} from '@tool/type/ipolloos';

export default defineTool({
  name: {
    'zh-CN': 'Manus 任务列表',
    en: 'Manus List Tasks'
  },
  description: {
    'zh-CN': 'GET task.list 分页列出任务，可按 scope/agent/project 筛选。',
    en: 'GET /v2/task.list — list tasks with filters.'
  },
  toolDescription:
    'Use scope=agent_subtask with agent_id (or agent-default shortcut) for agent subtasks; scope=project needs project_id.',
  versionList: [
    {
      value: '1.0.0',
      description: 'Initial',
      inputs: [
        {
          key: 'limit',
          label: '每页条数（最大 100）',
          valueType: WorkflowIOValueTypeEnum.number,
          renderTypeList: [FlowNodeInputTypeEnum.reference, FlowNodeInputTypeEnum.numberInput]
        },
        {
          key: 'cursor',
          label: 'cursor',
          valueType: WorkflowIOValueTypeEnum.string,
          renderTypeList: [FlowNodeInputTypeEnum.reference, FlowNodeInputTypeEnum.input]
        },
        {
          key: 'order',
          label: '排序',
          valueType: WorkflowIOValueTypeEnum.string,
          renderTypeList: [FlowNodeInputTypeEnum.select, FlowNodeInputTypeEnum.input],
          defaultValue: 'desc',
          list: [
            { label: 'desc', value: 'desc' },
            { label: 'asc', value: 'asc' }
          ]
        },
        {
          key: 'scope',
          label: 'scope',
          valueType: WorkflowIOValueTypeEnum.string,
          renderTypeList: [FlowNodeInputTypeEnum.select, FlowNodeInputTypeEnum.input],
          defaultValue: 'all',
          list: [
            { label: 'all', value: 'all' },
            { label: 'standard', value: 'standard' },
            { label: 'project', value: 'project' },
            { label: 'agent_subtask', value: 'agent_subtask' }
          ]
        },
        {
          key: 'agentId',
          label: 'agent_id（scope=agent_subtask 时必填）',
          valueType: WorkflowIOValueTypeEnum.string,
          renderTypeList: [FlowNodeInputTypeEnum.reference, FlowNodeInputTypeEnum.input],
          toolDescription: 'Shortcut agent-default for IM agent.'
        },
        {
          key: 'projectId',
          label: 'project_id（scope=project 时必填）',
          valueType: WorkflowIOValueTypeEnum.string,
          renderTypeList: [FlowNodeInputTypeEnum.reference, FlowNodeInputTypeEnum.input]
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
