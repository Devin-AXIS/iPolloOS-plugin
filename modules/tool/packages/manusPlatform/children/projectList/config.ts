import { defineTool } from '@tool/type';
import {
  FlowNodeInputTypeEnum,
  FlowNodeOutputTypeEnum,
  WorkflowIOValueTypeEnum
} from '@tool/type/ipolloos';

export default defineTool({
  name: {
    'zh-CN': 'Manus 项目列表',
    en: 'Manus Project List'
  },
  description: {
    'zh-CN': 'GET project.list 列出全部项目。',
    en: 'GET /v2/project.list'
  },
  toolDescription: 'Use project id in task.create / task.list / skill.list.',
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
