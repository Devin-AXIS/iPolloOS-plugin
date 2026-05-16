import { defineToolSet } from '@tool/type';
import { ToolTagEnum } from '@tool/type/tags';

export default defineToolSet({
  tags: [ToolTagEnum.enum.productivity],
  name: {
    'zh-CN': '高级数据图表',
    en: 'Premium data charts'
  },
  description: {
    'zh-CN':
      '独立图表插件：底层使用 ECharts，外观由插件内置视觉系统控制。默认输出透明图表本体：无容器、无标题/KPI、无独立页面感，方便作为 HTML 单页、幻灯片和报告里的一个元素。也可按需选择毛玻璃/软卡片/暗色/纸面容器。',
    en: 'Standalone premium chart plugin powered by ECharts, with curated palettes, optional glass/card containers, opacity and shadow controls.'
  },
  toolDescription:
    '首选调用“图表 · 单图生成”。默认 container=none、show_header=false，embed_html 是可嵌入页面的透明图表片段；PPT/HTML 幻灯片只接 embed_html，不接 page_html。不要手写 ECharts option。'
});
