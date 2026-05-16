import { defineToolSet } from '@tool/type';
import { ToolTagEnum } from '@tool/type/tags';

export default defineToolSet({
  tags: [ToolTagEnum.enum.productivity],
  name: {
    'zh-CN': '饮食与健康监测（无库版）',
    en: 'Diet & health monitor (stateless kit)'
  },
  description: {
    'zh-CN':
      '独立系统工具：交互填写档案、档案与目标、识餐参数打包、餐次累计、AINO 生活助手风食物分析报告（含发图专用整页）。无数据库。',
    en: 'Interactive profile form, targets, food params for models, meal merge, AINO-style food report HTML (incl. photo-only page). No database.'
  },
  toolDescription:
    '七工具：缺档案时先用 life_profile_interactive 让用户交互填写，提交结果接 life_profile_pack → life_daily_targets → life_food_tool_params → 多模态识图 →（可选 life_daily_state_merge）→ life_photo_food_report_html（发图专用整页）或 life_health_report_html（通用）。识图后模型输出 meal_analysis_json（含 image_url、remaining、analysis_points 等）即可得到 AINO 生活助手同款食物分析报告。'
});
