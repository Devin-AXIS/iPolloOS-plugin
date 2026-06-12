import { defineToolSet } from '@tool/type';
import { ToolTagEnum } from '@tool/type/tags';

export default defineToolSet({
  tags: [ToolTagEnum.enum.productivity, ToolTagEnum.enum.multimodal],
  name: {
    'zh-CN': '未来洞察工作组',
    en: 'Future Insight Workgroup'
  },
  description: {
    'zh-CN':
      '面向 iPolloOS 的高管情报工作组插件包。内置统一基础组件层，提供未来洞察系统和竞争情报系统，把结构化情报渲染为稳定的单页 HTML 报告。',
    en: 'Executive intelligence workgroup tools for iPolloOS with a shared base component layer for future insight and competitive intelligence reports.'
  },
  toolDescription:
    '大插件包，包内共享 lib/workgroup-components.ts 作为基础组件层，统一色板、卡片、图表、关系图和生态图。当前提供未来洞察系统每日报告，以及竞争情报系统的企业档案、人物档案、产品技术档案、关系概览四个模板。上游 AI/Agent 负责检索和写结构化 JSON，插件负责固定报告框架、响应式排版、交互和 page_html/page_url 输出。不要把它当成外部页面或 OpenAPI 服务。'
});
