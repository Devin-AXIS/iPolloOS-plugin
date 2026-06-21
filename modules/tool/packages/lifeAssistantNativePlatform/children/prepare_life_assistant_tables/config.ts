import { defineTool } from '@tool/type';
import {
  FlowNodeInputTypeEnum,
  FlowNodeOutputTypeEnum,
  WorkflowIOValueTypeEnum
} from '@tool/type/ipolloos';

export default defineTool({
  name: { 'zh-CN': '生成生活助手动态表计划', en: 'Prepare Life Assistant tables' },
  description: {
    'zh-CN': '输出 life_profile、life_log、life_daily_report 的动态表建表 JSON。',
    en: 'Return the dynamic-table plan for life_profile, life_log, and life_daily_report.'
  },
  toolDescription:
    '构建期使用。调用后把 table_plan_json 交给 ipolloAppDynamicTablePlatform/create_dynamic_tables。不要在 APP 侧自建表或写旧 health 接口。',
  versionList: [
    {
      value: '0.1.1',
      description: '生活助手动态表计划',
      inputs: [
        {
          key: 'module_name',
          label: '模块名',
          valueType: WorkflowIOValueTypeEnum.string,
          renderTypeList: [FlowNodeInputTypeEnum.input, FlowNodeInputTypeEnum.reference],
          defaultValue: '生活助手数据',
          toolDescription: '动态表在 Studio 查看数据中的模块名。'
        }
      ],
      outputs: [
        {
          valueType: WorkflowIOValueTypeEnum.string,
          key: 'table_plan_json',
          label: '建表计划 JSON'
        },
        { valueType: WorkflowIOValueTypeEnum.string, key: 'table_keys_json', label: '表 Key JSON' },
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
