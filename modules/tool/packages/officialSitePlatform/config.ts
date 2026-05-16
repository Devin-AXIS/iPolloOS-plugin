import { defineToolSet } from '@tool/type';
import { ToolTagEnum } from '@tool/type/tags';

export default defineToolSet({
  tags: [ToolTagEnum.enum.productivity],
  name: {
    'zh-CN': '官网页面构件包',
    en: 'Official website builder kit'
  },
  description: {
    'zh-CN':
      '专门用于品牌官网、产品官网、门店官网和项目展示官网：内置移动端优先的顶部导航、Logo 区、桌面导航、移动菜单、语言切换、CTA、页脚和官网模板风格。',
    en: 'Dedicated official website builder for brand, product, store and project sites: mobile-first header, logo area, desktop nav, mobile drawer, language switch, CTA, footer and website templates.'
  },
  toolDescription:
    '官网类需求优先使用 official_website_page，不要使用通用 HTML 工具。默认优先生成单页官网，保持快速交付；只有用户明确要求复杂官网、多页面、子页面、产品/案例详情页、路由或跳转时，才启用子页面模式。适合公司官网、品牌官网、产品官网、门店官网、作品集官网、活动官网。'
});
