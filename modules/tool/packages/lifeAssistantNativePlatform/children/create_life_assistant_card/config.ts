import { defineTool } from '@tool/type';
import {
  FlowNodeInputTypeEnum,
  FlowNodeOutputTypeEnum,
  WorkflowIOValueTypeEnum
} from '@tool/type/ipolloos';

export default defineTool({
  name: { 'zh-CN': '生成生活助手原生卡片', en: 'Create Life Assistant native card' },
  description: {
    'zh-CN': '把生活助手结构化结果转为 APP 原生 app_card 和动态表记录 JSON。',
    en: 'Convert structured Life Assistant results into native app_card and dynamic-table record JSON.'
  },
  toolDescription:
    '运行期最后调用。上游 Agent 先读取 life_profile / life_log 并完成分析，本工具生成原生卡片、详情页 Markdown 和记录 JSON。不要让 APP 猜测、不要返回 HTML。',
  versionList: [
    {
      value: '0.1.2',
      description: '生活助手原生卡片和详情页',
      inputs: [
        {
          key: 'card_type',
          label: '卡片类型',
          valueType: WorkflowIOValueTypeEnum.string,
          renderTypeList: [FlowNodeInputTypeEnum.select, FlowNodeInputTypeEnum.reference],
          required: true,
          defaultValue: 'today_overview',
          list: [
            { label: '今日概览', value: 'today_overview' },
            { label: '饮食记录', value: 'meal_log' },
            { label: '饮水记录', value: 'water_log' },
            { label: '运动记录', value: 'exercise_log' },
            { label: '早间建议', value: 'morning_plan' },
            { label: '晚间报告', value: 'evening_summary' }
          ],
          toolDescription: '要生成的生活助手卡片类型。'
        },
        {
          key: 'payload_json',
          label: '结构化结果',
          valueType: WorkflowIOValueTypeEnum.string,
          renderTypeList: [FlowNodeInputTypeEnum.reference, FlowNodeInputTypeEnum.textarea],
          required: true,
          toolDescription:
            'JSON 对象。饮食可含 title/kcal/protein_g/fat_g/carbs_g/photo_url/recommendations；饮水含 water_ml/drink_type；运动含 duration_minutes/kcal/intensity；报告含 summary/recommendations。'
        },
        {
          key: 'records_json',
          label: '当日记录列表',
          valueType: WorkflowIOValueTypeEnum.string,
          renderTypeList: [FlowNodeInputTypeEnum.reference, FlowNodeInputTypeEnum.textarea],
          toolDescription: '可选 JSON 数组，用于今日概览、早间建议和晚间报告。'
        },
        {
          key: 'profile_json',
          label: '生活档案',
          valueType: WorkflowIOValueTypeEnum.string,
          renderTypeList: [FlowNodeInputTypeEnum.reference, FlowNodeInputTypeEnum.textarea],
          toolDescription: '可选 JSON 对象，来自 life_profile。'
        }
      ],
      outputs: [
        { valueType: WorkflowIOValueTypeEnum.string, key: 'app_card', label: 'APP 原生卡片 JSON' },
        { valueType: WorkflowIOValueTypeEnum.string, key: 'record_json', label: '写入记录 JSON' },
        {
          valueType: WorkflowIOValueTypeEnum.string,
          key: 'records_json',
          label: '写入记录列表 JSON'
        },
        {
          valueType: WorkflowIOValueTypeEnum.string,
          key: 'view_model_json',
          label: '视图模型 JSON'
        },
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
