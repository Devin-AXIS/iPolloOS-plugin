import { defineTool } from '@tool/type';
import {
  FlowNodeInputTypeEnum,
  FlowNodeOutputTypeEnum,
  WorkflowIOValueTypeEnum
} from '@tool/type/ipolloos';

export default defineTool({
  name: {
    'zh-CN': '健康档案 · 整理为 JSON',
    en: 'Health profile · normalize JSON'
  },
  description: {
    'zh-CN':
      '将表单或对话收集的字段整理为统一的 profile_json，供后续「今日目标」「识餐参数」等节点引用。',
    en: 'Normalize onboarding fields into profile_json for downstream tools.'
  },
  toolDescription:
    '填写年龄、性别、身高体重、健康状况、过敏、目标等；输出 profile_json 字符串与可读摘要。无落库。',
  versionList: [
    {
      value: '1.0.0',
      description: '首版',
      inputs: [
        {
          key: 'age',
          label: '年龄',
          valueType: WorkflowIOValueTypeEnum.string,
          renderTypeList: [FlowNodeInputTypeEnum.reference, FlowNodeInputTypeEnum.input],
          toolDescription: '数字字符串，可空'
        },
        {
          key: 'sex',
          label: '性别',
          valueType: WorkflowIOValueTypeEnum.string,
          renderTypeList: [FlowNodeInputTypeEnum.reference, FlowNodeInputTypeEnum.select],
          defaultValue: 'unknown',
          list: [
            { label: '未知', value: 'unknown' },
            { label: '男', value: 'male' },
            { label: '女', value: 'female' }
          ],
          toolDescription: '用于估算基础代谢（可选）'
        },
        {
          key: 'height_cm',
          label: '身高 cm',
          valueType: WorkflowIOValueTypeEnum.string,
          renderTypeList: [FlowNodeInputTypeEnum.reference, FlowNodeInputTypeEnum.input],
          toolDescription: '可空'
        },
        {
          key: 'weight_kg',
          label: '体重 kg',
          valueType: WorkflowIOValueTypeEnum.string,
          renderTypeList: [FlowNodeInputTypeEnum.reference, FlowNodeInputTypeEnum.input],
          toolDescription: '可空'
        },
        {
          key: 'health_conditions',
          label: '健康状况 / 慢性病',
          valueType: WorkflowIOValueTypeEnum.string,
          renderTypeList: [FlowNodeInputTypeEnum.reference, FlowNodeInputTypeEnum.textarea],
          defaultValue: '',
          toolDescription: '自由文本'
        },
        {
          key: 'allergies',
          label: '过敏 / 忌口',
          valueType: WorkflowIOValueTypeEnum.string,
          renderTypeList: [FlowNodeInputTypeEnum.reference, FlowNodeInputTypeEnum.textarea],
          defaultValue: '',
          toolDescription: '自由文本'
        },
        {
          key: 'goal_primary',
          label: '主要目标',
          valueType: WorkflowIOValueTypeEnum.string,
          renderTypeList: [FlowNodeInputTypeEnum.reference, FlowNodeInputTypeEnum.select],
          defaultValue: 'maintain',
          list: [
            { label: '减重', value: 'lose_weight' },
            { label: '维持', value: 'maintain' },
            { label: '增肌', value: 'gain_muscle' },
            { label: '控糖', value: 'control_glucose' },
            { label: '其他', value: 'other' }
          ],
          toolDescription: '影响后续热量系数（粗略）'
        },
        {
          key: 'goal_notes',
          label: '目标补充说明',
          valueType: WorkflowIOValueTypeEnum.string,
          renderTypeList: [FlowNodeInputTypeEnum.reference, FlowNodeInputTypeEnum.textarea],
          defaultValue: '',
          toolDescription: '可空'
        }
      ],
      outputs: [
        {
          valueType: WorkflowIOValueTypeEnum.string,
          key: 'profile_json',
          label: '档案 JSON',
          description: '单行 JSON 字符串，供下游引用'
        },
        { valueType: WorkflowIOValueTypeEnum.string, key: 'profile_summary', label: '档案摘要' },
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
