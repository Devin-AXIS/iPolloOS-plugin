import { defineTool } from '@tool/type';
import {
  FlowNodeInputTypeEnum,
  FlowNodeOutputTypeEnum,
  WorkflowIOValueTypeEnum
} from '@tool/type/ipolloos';

export default defineTool({
  name: {
    'zh-CN': 'Manus 连接器列表',
    en: 'Manus Connector List'
  },
  description: {
    'zh-CN': 'GET connector.list — 已安装连接器 ID，用于 task.create / sendMessage 的 connectors。',
    en: 'GET /v2/connector.list'
  },
  toolDescription:
    'Pass connector IDs in message.connectors as CSV in taskCreate / taskSendMessage.',
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
