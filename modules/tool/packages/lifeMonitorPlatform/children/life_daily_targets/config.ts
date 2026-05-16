import { defineTool } from '@tool/type';
import {
  FlowNodeInputTypeEnum,
  FlowNodeOutputTypeEnum,
  WorkflowIOValueTypeEnum
} from '@tool/type/ipolloos';

export default defineTool({
  name: {
    'zh-CN': '今日目标 · 热量与宏量',
    en: 'Daily targets · kcal & macros'
  },
  description: {
    'zh-CN':
      '根据 profile_json 与活动水平估算今日目标热量与三大营养素（Mifflin–St Jeor + 活动系数；缺数据时给保守默认并写明说明）。',
    en: 'Derive daily kcal and macros from profile JSON and activity level (MSJ + activity factor).'
  },
  toolDescription:
    '输入上一步 profile_json；可选覆盖 calorie_override_kcal。输出 daily_targets_json。',
  versionList: [
    {
      value: '1.0.0',
      description: '首版',
      inputs: [
        {
          key: 'profile_json',
          label: '档案 JSON',
          valueType: WorkflowIOValueTypeEnum.string,
          renderTypeList: [FlowNodeInputTypeEnum.reference, FlowNodeInputTypeEnum.textarea],
          required: true,
          toolDescription: 'life_profile_pack 的输出'
        },
        {
          key: 'activity_level',
          label: '活动水平',
          valueType: WorkflowIOValueTypeEnum.string,
          renderTypeList: [FlowNodeInputTypeEnum.reference, FlowNodeInputTypeEnum.select],
          defaultValue: 'light',
          list: [
            { label: '久坐', value: 'sedentary' },
            { label: '轻度', value: 'light' },
            { label: '中度', value: 'moderate' },
            { label: '高强度', value: 'active' }
          ],
          toolDescription: '影响 TDEE 系数'
        },
        {
          key: 'calorie_override_kcal',
          label: '手动覆盖每日热量（可空）',
          valueType: WorkflowIOValueTypeEnum.string,
          renderTypeList: [FlowNodeInputTypeEnum.reference, FlowNodeInputTypeEnum.input],
          defaultValue: '',
          toolDescription: '填数字则忽略估算，直接用该值作为 target_kcal'
        }
      ],
      outputs: [
        {
          valueType: WorkflowIOValueTypeEnum.string,
          key: 'daily_targets_json',
          label: '今日目标 JSON',
          description: '热量、宏量、饮水与说明'
        },
        { valueType: WorkflowIOValueTypeEnum.string, key: 'targets_summary', label: '目标摘要' },
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
