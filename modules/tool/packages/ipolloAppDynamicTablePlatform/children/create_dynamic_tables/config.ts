import { defineTool } from '@tool/type';
import {
  FlowNodeInputTypeEnum,
  FlowNodeOutputTypeEnum,
  WorkflowIOValueTypeEnum
} from '@tool/type/ipolloos';

export default defineTool({
  name: {
    'zh-CN': '建立动态表',
    en: 'Create dynamic tables'
  },
  description: {
    'zh-CN': '为当前 Agent 建立 Studio 可见的动态表和字段。',
    en: 'Create Studio-visible dynamic tables and fields for the current Agent.'
  },
  toolDescription:
    '构建期使用。只填写要建立的表和字段，当前 App/Agent 归属由系统自动注入。建表内容使用 JSON：{"tables":[{"name":"健身档案","fields":[{"key":"goal","label":"目标","type":"text"}]}]}。',
  versionList: [
    {
      value: '1.0.0',
      description: '建立当前 Agent 的动态表',
      inputs: [
        {
          key: 'table_plan',
          label: '建表内容',
          valueType: WorkflowIOValueTypeEnum.string,
          renderTypeList: [FlowNodeInputTypeEnum.reference, FlowNodeInputTypeEnum.textarea],
          required: true,
          toolDescription:
            'JSON。可以是一张表对象，也可以是 {"moduleName":"智能体数据","tables":[...]}。不要填写应用 ID、Agent ID、密钥或用户 ID。'
        }
      ],
      outputs: [
        { valueType: WorkflowIOValueTypeEnum.boolean, key: 'ok', label: '是否成功' },
        {
          valueType: WorkflowIOValueTypeEnum.string,
          key: 'created_tables_json',
          label: '已创建表 JSON'
        },
        {
          valueType: WorkflowIOValueTypeEnum.string,
          key: 'skipped_tables_json',
          label: '已存在表 JSON'
        },
        {
          valueType: WorkflowIOValueTypeEnum.string,
          key: 'manifest_json',
          label: '建表 Manifest JSON'
        },
        { valueType: WorkflowIOValueTypeEnum.string, key: 'action_json', label: '动作 JSON' },
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
