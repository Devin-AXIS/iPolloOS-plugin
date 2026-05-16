import { defineTool } from '@tool/type';
import {
  FlowNodeInputTypeEnum,
  FlowNodeOutputTypeEnum,
  WorkflowIOValueTypeEnum
} from '@tool/type/ipolloos';

export default defineTool({
  name: {
    'zh-CN': 'Manus Agent 详情',
    en: 'Manus Agent Detail'
  },
  description: {
    'zh-CN': 'GET agent.detail 查询单个 Agent。',
    en: 'GET /v2/agent.detail'
  },
  toolDescription: 'agent_id from agent.list.',
  versionList: [
    {
      value: '1.0.0',
      description: 'Initial',
      inputs: [
        {
          key: 'agentId',
          label: 'agent_id',
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
