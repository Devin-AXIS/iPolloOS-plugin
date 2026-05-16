import { defineTool } from '@tool/type';
import {
  FlowNodeInputTypeEnum,
  FlowNodeOutputTypeEnum,
  WorkflowIOValueTypeEnum
} from '@tool/type/ipolloos';

export default defineTool({
  name: {
    'zh-CN': 'Vercel 版本',
    en: 'Vercel release'
  },
  description: {
    'zh-CN': '列出部署、晋级生产、回滚、取消、删除部署、分配别名等版本相关操作（单节点多动作）。',
    en: 'List deployments, promote to production, rollback, cancel, delete, assign alias.'
  },
  toolDescription:
    'action：list_deployments | promote | rollback | cancel_deployment | delete_deployment | assign_alias。project_id_or_name 必填（除部分仅需 deployment_id 的操作）。',
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
          toolDescription:
            'list_deployments | promote | rollback | cancel_deployment | delete_deployment | assign_alias'
        },
        {
          key: 'project_id_or_name',
          label: '项目 ID 或名称',
          valueType: WorkflowIOValueTypeEnum.string,
          renderTypeList: [FlowNodeInputTypeEnum.input, FlowNodeInputTypeEnum.reference],
          required: false,
          toolDescription: '可空则用插件默认项目'
        },
        {
          key: 'deployment_id',
          label: 'Deployment ID',
          valueType: WorkflowIOValueTypeEnum.string,
          renderTypeList: [FlowNodeInputTypeEnum.input, FlowNodeInputTypeEnum.reference],
          required: false,
          toolDescription: 'promote/rollback/cancel/delete/assign_alias 时需要'
        },
        {
          key: 'alias_hostname',
          label: '别名主机（assign_alias）',
          valueType: WorkflowIOValueTypeEnum.string,
          renderTypeList: [FlowNodeInputTypeEnum.input, FlowNodeInputTypeEnum.reference],
          required: false,
          toolDescription: '例如 www.example.com'
        },
        {
          key: 'list_limit',
          label: '列表条数上限',
          valueType: WorkflowIOValueTypeEnum.number,
          renderTypeList: [FlowNodeInputTypeEnum.numberInput, FlowNodeInputTypeEnum.reference],
          defaultValue: 20,
          toolDescription: 'list_deployments 使用'
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
