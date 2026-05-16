import { defineTool } from '@tool/type';
import {
  FlowNodeInputTypeEnum,
  FlowNodeOutputTypeEnum,
  WorkflowIOValueTypeEnum
} from '@tool/type/ipolloos';

export default defineTool({
  name: {
    'zh-CN': 'Manus Agent 列表',
    en: 'Manus Agent List'
  },
  description: {
    'zh-CN': 'GET agent.list 列出账号下自定义 Agent。',
    en: 'GET /v2/agent.list'
  },
  toolDescription: 'Use agent ids with task.list scope=agent_subtask or agent.detail.',
  versionList: [
    {
      value: '1.0.0',
      description: 'Initial',
      inputs: [],
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
