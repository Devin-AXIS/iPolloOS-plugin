import { getErrText } from '@tool/utils/err';
import { z } from 'zod';
import { stringifyJson } from '../../../lib/json';

export const InputType = z.object({
  module_name: z.string().optional().default('生活助手数据')
});

export const OutputType = z.object({
  table_plan_json: z.string(),
  table_keys_json: z.string(),
  system_error: z.string().optional()
});

type In = z.infer<typeof InputType>;
type Out = z.infer<typeof OutputType>;

const tableKeys = {
  profile: 'life_profile',
  log: 'life_log',
  dailyReport: 'life_daily_report'
};

const ownershipFields = [
  {
    key: 'app_user_id',
    label: 'App 用户 ID',
    type: 'text',
    required: true,
    showInList: true,
    showInForm: false,
    showInDetail: true,
    config: { runtimeOwnershipField: true }
  },
  {
    key: 'app_user_name',
    label: 'App 用户名称',
    type: 'text',
    showInList: true,
    showInForm: false,
    showInDetail: true,
    config: { runtimeOwnershipField: true }
  },
  {
    key: 'application_id',
    label: '应用 ID',
    type: 'text',
    showInList: false,
    showInForm: false,
    showInDetail: true,
    config: { runtimeOwnershipField: true }
  },
  {
    key: 'agent_id',
    label: 'Agent ID',
    type: 'text',
    showInList: false,
    showInForm: false,
    showInDetail: true,
    config: { runtimeOwnershipField: true }
  }
];

export async function tool(props: In): Promise<Out> {
  try {
    const input = InputType.parse(props);
    const tablePlan = {
      moduleName: input.module_name || '生活助手数据',
      tables: [
        {
          name: '生活助手档案',
          key: tableKeys.profile,
          ownership: 'per_app_user',
          description: '当前 Agent 下每个用户的基础情况和每日营养目标。',
          fields: [
            ...ownershipFields,
            { key: 'age', label: '年龄', type: 'number' },
            { key: 'height_cm', label: '身高 cm', type: 'number' },
            { key: 'weight_kg', label: '当前体重 kg', type: 'number' },
            { key: 'goal_type', label: '目标类型', type: 'text' },
            { key: 'target_weight_kg', label: '目标体重 kg', type: 'number' },
            { key: 'daily_calorie_kcal', label: '每日热量 kcal', type: 'number' },
            { key: 'daily_water_ml', label: '每日饮水 ml', type: 'number' },
            { key: 'protein_g', label: '蛋白质 g', type: 'number' },
            { key: 'fat_g', label: '脂肪 g', type: 'number' },
            { key: 'carbs_g', label: '碳水 g', type: 'number' },
            { key: 'diet_notes', label: '饮食备注', type: 'textarea' },
            { key: 'allergy_notes', label: '过敏忌口', type: 'textarea' },
            { key: 'health_notes', label: '健康注意事项', type: 'textarea' },
            { key: 'updated_at', label: '更新时间', type: 'datetime' }
          ]
        },
        {
          name: '生活助手记录',
          key: tableKeys.log,
          ownership: 'per_app_user',
          description: '饮食、饮水、运动的每日记录。',
          fields: [
            ...ownershipFields,
            { key: 'record_date', label: '日期', type: 'date' },
            { key: 'record_type', label: '记录类型', type: 'text' },
            { key: 'title', label: '标题', type: 'text' },
            { key: 'notes', label: '备注', type: 'textarea' },
            { key: 'kcal', label: '热量 kcal', type: 'number' },
            { key: 'water_ml', label: '饮水 ml', type: 'number' },
            { key: 'protein_g', label: '蛋白质 g', type: 'number' },
            { key: 'fat_g', label: '脂肪 g', type: 'number' },
            { key: 'carbs_g', label: '碳水 g', type: 'number' },
            { key: 'duration_minutes', label: '运动分钟', type: 'number' },
            { key: 'photo_url', label: '图片', type: 'text' },
            { key: 'source', label: '来源', type: 'text' },
            { key: 'app_card_json', label: '卡片 JSON', type: 'json' },
            { key: 'created_at', label: '创建时间', type: 'datetime' }
          ]
        },
        {
          name: '生活助手日报',
          key: tableKeys.dailyReport,
          ownership: 'per_app_user',
          description: '早间建议和晚间报告。',
          fields: [
            ...ownershipFields,
            { key: 'report_date', label: '日期', type: 'date' },
            { key: 'report_type', label: '报告类型', type: 'text' },
            { key: 'summary', label: '摘要', type: 'textarea' },
            { key: 'recommendations_json', label: '建议 JSON', type: 'json' },
            { key: 'app_card_json', label: '卡片 JSON', type: 'json' },
            { key: 'created_at', label: '创建时间', type: 'datetime' }
          ]
        }
      ]
    };

    return {
      table_plan_json: stringifyJson(tablePlan),
      table_keys_json: stringifyJson(tableKeys)
    };
  } catch (error: unknown) {
    return {
      table_plan_json: '',
      table_keys_json: stringifyJson(tableKeys),
      system_error: getErrText(error)
    };
  }
}
