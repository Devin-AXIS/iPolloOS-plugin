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
      '五套固定主题色组（花叔刊物 + 归藏四套），内置主题图标与图表配色。两个子工具：逐页添加 → 导出。智能体只选主题与内容。',
    en: 'Five fixed theme packs with auto-themed icons and charts. Add slides, then export.'
  },
  toolDescription:
    '两个子工具即可：①添加一页（首次选 theme_id 五套之一，之后只填版式与内容；图标/图表颜色自动跟主题）②导出网页。勿用外部图标插件或自定义颜色。'
});
