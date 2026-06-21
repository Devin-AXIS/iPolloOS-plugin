import { defineToolSet } from '@tool/type';
import { ToolTagEnum } from '@tool/type/tags';

export default defineToolSet({
  tags: [ToolTagEnum.enum.finance, ToolTagEnum.enum.news],
  name: {
    'zh-CN': '美股聚合监控',
    en: 'Market Intelligence Monitor'
  },
  description: {
    'zh-CN': '把共享关注对象池和行情、SEC、新闻、X、主题等来源事件聚合成可推送的美股监控异动。',
    en: 'Aggregate watch subjects and market, SEC, news, X, and theme events into monitor alerts.'
  },
  toolDescription:
    'Trigger-friendly market monitor toolset. Data-source plugins fetch evidence; this toolset matches events to shared watch subjects, deduplicates them by state, scores materiality, and emits card inputs for native monitor cards.'
});
