import { defineToolSet } from '@tool/type';
import { ToolTagEnum } from '@tool/type/tags';

export default defineToolSet({
  tags: [ToolTagEnum.enum.productivity, ToolTagEnum.enum.tools],
  name: {
    'zh-CN': '生活助手原生输出',
    en: 'Life Assistant native output'
  },
  description: {
    'zh-CN':
      '为生活助手生成动态表计划、APP 原生卡片和可写入动态表的记录 JSON。不抓外部数据、不发布 HTML。',
    en: 'Generate dynamic table plans, native app cards, and dynamic-table record JSON for Life Assistant. No external fetching or HTML publishing.'
  },
  toolDescription:
    '生活助手 Agent 使用。先用动态表工具读取/写入 life_profile、life_log、life_daily_report，本插件只负责标准化建表计划和 APP 原生 app_card 输出。'
});
