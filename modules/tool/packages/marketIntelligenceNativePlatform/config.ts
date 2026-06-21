import { defineToolSet } from '@tool/type';
import { ToolTagEnum } from '@tool/type/tags';

export default defineToolSet({
  tags: [ToolTagEnum.enum.finance, ToolTagEnum.enum.news],
  name: {
    'zh-CN': '美股情报原生输出',
    en: 'AI Market Intelligence Native Output'
  },
  description: {
    'zh-CN': '把美股情报、即时监控、每日报告、发现机会和深度分析结果整理成 iPollo App 原生卡片。',
    en: 'Package US market intelligence, instant monitoring, daily reports, discovery, and deep analysis into iPollo App native cards.'
  },
  toolDescription:
    '官方美股情报 APP 的原生输出插件。上游行情、财报、SEC/Form 4/13F、新闻、资金、X/社区和人物机构插件负责取数；本插件不抓外部数据、不发布 HTML，只把结构化数据和 AI aiBlocks 归一成 app_card，并返回可写入动态表的 record_json/records_json。即时异动使用 MarketMonitorEventCard，每日/定时报告使用 MarketDailyReportCard。'
});
