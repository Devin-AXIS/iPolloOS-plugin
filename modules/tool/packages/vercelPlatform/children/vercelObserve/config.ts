import { defineTool } from '@tool/type';
import {
  FlowNodeInputTypeEnum,
  FlowNodeOutputTypeEnum,
  WorkflowIOValueTypeEnum
} from '@tool/type/ipolloos';

export default defineTool({
  name: {
    'zh-CN': 'Vercel 观测',
    en: 'Vercel observe'
  },
  description: {
    'zh-CN': '读取某次部署的运行时日志或构建/部署事件，便于排障与自动化巡检。',
    en: 'Runtime logs or deployment events for troubleshooting.'
  },
  toolDescription:
    'action：runtime_logs | deployment_events。需要 project_id_or_name + deployment_id（runtime_logs）；deployment_events 仅需 deployment_id。',
  versionList: [
    {
      value: '1.0.0',
      description: '首版',
      inputs: [
        {
          key: 'action',
          label: '动作',
          valueType: WorkflowIOValueTypeEnum.string,
          renderTypeList: [FlowNodeInputTypeEnum.input, FlowNodeInputTypeEnum.reference],
          required: true,
          toolDescription: 'runtime_logs | deployment_events'
        },
        {
          key: 'project_id_or_name',
          label: '项目 ID 或名称',
          valueType: WorkflowIOValueTypeEnum.string,
          renderTypeList: [FlowNodeInputTypeEnum.input, FlowNodeInputTypeEnum.reference],
          required: false,
          toolDescription: 'runtime_logs 必填；可空则用插件默认项目'
        },
        {
          key: 'deployment_id',
          label: 'Deployment ID',
          valueType: WorkflowIOValueTypeEnum.string,
          renderTypeList: [FlowNodeInputTypeEnum.input, FlowNodeInputTypeEnum.reference],
          required: true,
          toolDescription: '部署 ID'
        }
      ],
      outputs: [
        { valueType: WorkflowIOValueTypeEnum.string, key: 'summary', label: '摘要' },
        { valueType: WorkflowIOValueTypeEnum.string, key: 'result_json', label: '结果 JSON' },
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
