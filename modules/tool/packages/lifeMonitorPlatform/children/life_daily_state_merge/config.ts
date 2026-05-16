import { defineTool } from '@tool/type';
import {
  FlowNodeInputTypeEnum,
  FlowNodeOutputTypeEnum,
  WorkflowIOValueTypeEnum
} from '@tool/type/ipolloos';

export default defineTool({
  name: {
    'zh-CN': '当日累计 · 合并一餐',
    en: 'Daily totals · merge one meal'
  },
  description: {
    'zh-CN':
      '将模型解析出的一餐营养素累加到 daily_state_json（确定性加减）；用于「已经吃了」路径。若 state 为空则初始化当日结构。',
    en: 'Add one meal’s numeric nutrition into daily_state_json; initializes state if empty.'
  },
  toolDescription:
    'meal_json 须含 kcal 与宏量数字；food_label 为展示名。可选 log_date=YYYY-MM-DD 默认今天。',
  versionList: [
    {
      value: '1.0.0',
      description: '首版',
      inputs: [
        {
          key: 'daily_state_json',
          label: '当前当日累计 JSON',
          valueType: WorkflowIOValueTypeEnum.string,
          renderTypeList: [FlowNodeInputTypeEnum.reference, FlowNodeInputTypeEnum.textarea],
          defaultValue: '',
          toolDescription: '可空：将新建'
        },
        {
          key: 'meal_json',
          label: '本餐营养素 JSON',
          valueType: WorkflowIOValueTypeEnum.string,
          renderTypeList: [FlowNodeInputTypeEnum.reference, FlowNodeInputTypeEnum.textarea],
          required: true,
          toolDescription:
            '示例：{"food_label":"午餐沙拉","kcal":520,"protein_g":32,"fat_g":18,"carbs_g":48,"sodium_mg":600}'
        },
        {
          key: 'log_date',
          label: '日期 YYYY-MM-DD',
          valueType: WorkflowIOValueTypeEnum.string,
          renderTypeList: [FlowNodeInputTypeEnum.reference, FlowNodeInputTypeEnum.input],
          defaultValue: '',
          toolDescription: '可空=按服务器当日 UTC 日期'
        }
      ],
      outputs: [
        {
          valueType: WorkflowIOValueTypeEnum.string,
          key: 'daily_state_json',
          label: '更新后当日累计 JSON',
          description: '回写到变量供下次循环'
        },
        { valueType: WorkflowIOValueTypeEnum.string, key: 'merge_summary', label: '合并摘要' },
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
