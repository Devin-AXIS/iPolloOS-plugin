import { defineToolSet } from '@tool/type';
import { ToolTagEnum } from '@tool/type/tags';

export default defineToolSet({
  tags: [ToolTagEnum.enum.productivity],
  name: {
    'zh-CN': 'HTML 幻灯片（花叔 × 归藏）',
    en: 'HTML deck (Huashu × Guizang)'
  },
  description: {
    'zh-CN':
      '选择主题与内容提纲后，一次生成完整 HTML 幻灯片。五套固定主题内置字体、色系、图标、图表配色与排版规则；逐页添加/导出保留为高级精修能力。',
    en: 'Generate a complete HTML deck from a theme and outline. Advanced add/finalize tools remain available for refinement.'
  },
  toolDescription:
    '优先使用「幻灯片 · 生成整套」：只选 theme_id 和内容提纲，插件自动拆页、套版式、统一图标/图表颜色并导出网页。仅在需要精修单页时使用高级工具「添加一页」「导出网页」。勿用外部图标插件或自定义颜色。'
});
