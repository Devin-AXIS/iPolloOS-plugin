import { defineToolSet } from '@tool/type';
import { ToolTagEnum } from '@tool/type/tags';

export default defineToolSet({
  tags: [ToolTagEnum.enum.finance, ToolTagEnum.enum.news],
  name: {
    'zh-CN': '美股情报工作组',
    en: 'AI Market Intelligence Workgroup'
  },
  description: {
    'zh-CN': '把结构化美股情报渲染成稳定、可发布、可复盘的金融 HTML 看板。',
    en: 'Render structured US market intelligence into stable publishable financial HTML dashboards.'
  },
  toolDescription:
    '金融情报展示插件包。上游数据插件和 Agent 负责取数、清洗、去重、排序和填写 report_json；本插件不调用模型、不抓外部数据，只做确定性 schema 校验、金融化 HTML 看板渲染、page_cover 生成和 page_html/page_url 页面协议输出。支持机会发现、Smart Money、单股复盘、主题产业、人物机构五类看板。结构字段不完整时可用 content/markdown 兜底承载长研究正文。不要让 APP 判断发现机会、Smart Money 或单股复盘；已有完整 HTML 时才交给通用 HTML 页面工具发布。'
});
