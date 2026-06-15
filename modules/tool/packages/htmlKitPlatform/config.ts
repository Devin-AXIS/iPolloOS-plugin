import { defineToolSet } from '@tool/type';
import { ToolTagEnum } from '@tool/type/tags';

export default defineToolSet({
  tags: [ToolTagEnum.enum.productivity],
  name: {
    'zh-CN': '通用HTML构件包',
    en: 'Universal HTML builder kit'
  },
  description: {
    'zh-CN':
      '面向单页站点 / 小应用 / 落地页：生成带 **CSS 变量主题** 与 **favicon** 的 HTML5 骨架；支持普通展示页与可回传 JSON 的交互页；从内置 **SVG 图标** 或外链/自定义 SVG 输出可粘贴片段；将多段 HTML **合并**为一页。',
    en: 'Single-page / card / landing helpers: HTML5 scaffold with theme CSS variables and favicon; normal display pages and interactive pages that submit JSON back to the workflow; preset SVG snippets; merge fragments.'
  },
  toolDescription:
    '五工具——展示型页面优先用 fast_html_page；需要用户填写并把 JSON 回传给 AI/工作流时用 interactive_html_page。HTML 页面统一返回 page_html，默认自动上传平台存储生成 page_url。仅要空骨架用 page_init；图标用 icon_snippet；多分块用 merge_fragments。'
});
