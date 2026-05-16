import { defineTool } from '@tool/type';
import {
  FlowNodeInputTypeEnum,
  FlowNodeOutputTypeEnum,
  WorkflowIOValueTypeEnum
} from '@tool/type/ipolloos';

export default defineTool({
  name: {
    'zh-CN': '官网 · 一键整页',
    en: 'Official site · one-shot page'
  },
  description: {
    'zh-CN':
      '专门生成官网：移动端优先、顶部导航、Logo、汉堡菜单、中文/EN 切换、CTA、页脚和官网模板风格一次生成。',
    en: 'Generate official websites with mobile-first header, logo, hamburger menu, Chinese/EN switch, CTA, footer and template styles.'
  },
  toolDescription:
    '【官网需求优先调用 official_website_page】用于公司官网、品牌官网、产品官网、门店官网、项目官网、作品集官网。它必须保留通用 HTML 一键整页的视觉质量和内容自由度，只是在外层额外提供官网顶部栏、Logo、导航、移动菜单、语言切换、CTA 和页脚。不要把正文写得很素：可以在 main_sections_html 开头写 <style>...</style> 做页面专属高级视觉，像通用 HTML 插件一样定制渐变背景、首屏、产品卡、画廊、视频区、动效感；禁止 <script>。首屏如果需要图片/视频/产品视觉，优先填写 hero_media_html，例如 <img ...>、<video controls ...>、<iframe ...> 或带 float-card 的视觉容器。main_sections_html 应生成完整官网视觉分区，可使用 section-head、eyebrow、grid、grid two、grid four、card、product-card、product-img、badge、pill、soft、split、highlight、stats、media、visual、gallery、video-card、contact-card、feature-banner、cta-panel、faq、button 等内置样式；需要展示产品/场景时可写 img、picture、video controls、iframe 等媒体内容，插件会做响应式约束。不要重复写 header/nav/footer/html/body 外壳。默认优先生成单页官网，速度快、稳定；只有用户明确要求复杂官网、多页面、子页面、产品详情、案例详情、路由、页面跳转时，才填写 sub_pages_json 生成 #/services、#/cases、#/about 等子页面；不要默认启用复杂模式。默认移动端优先：手机端顶部栏必须是汉堡菜单；语言切换固定在顶部栏；Logo/品牌名固定左侧；CTA 固定在导航区域。默认提供中文和英文参数，除非用户明确只要单语言。',
  versionList: [
    {
      value: '1.0.0',
      description:
        'Fast single-page official site by default; optional routed sub-pages for complex sites',
      inputs: [
        {
          key: 'page_title',
          label: '页面标题',
          valueType: WorkflowIOValueTypeEnum.string,
          renderTypeList: [FlowNodeInputTypeEnum.reference, FlowNodeInputTypeEnum.input],
          toolDescription: '中文 <title>，如「某某科技官网」；可留空，插件会用品牌名兜底'
        },
        {
          key: 'page_title_en',
          label: '英文页面标题',
          valueType: WorkflowIOValueTypeEnum.string,
          renderTypeList: [FlowNodeInputTypeEnum.reference, FlowNodeInputTypeEnum.input],
          toolDescription: '默认请填写英文标题，用于中英文切换'
        },
        {
          key: 'brand_name',
          label: '品牌名 / 公司名',
          valueType: WorkflowIOValueTypeEnum.string,
          renderTypeList: [FlowNodeInputTypeEnum.reference, FlowNodeInputTypeEnum.input],
          toolDescription: '顶部栏左侧品牌名；可留空，插件会用页面标题兜底'
        },
        {
          key: 'brand_name_en',
          label: '英文品牌名',
          valueType: WorkflowIOValueTypeEnum.string,
          renderTypeList: [FlowNodeInputTypeEnum.reference, FlowNodeInputTypeEnum.input],
          toolDescription: '默认请填写英文品牌名'
        },
        {
          key: 'logo_text',
          label: '文字 Logo',
          valueType: WorkflowIOValueTypeEnum.string,
          renderTypeList: [FlowNodeInputTypeEnum.reference, FlowNodeInputTypeEnum.input],
          toolDescription: '无 logo 图片时用 1-4 个字符生成标记，如 IP、AI、花店首字'
        },
        {
          key: 'logo_url',
          label: 'Logo 图片 URL',
          valueType: WorkflowIOValueTypeEnum.string,
          renderTypeList: [FlowNodeInputTypeEnum.reference, FlowNodeInputTypeEnum.input],
          toolDescription: '用户提供 logo 图片时填写 http(s) URL；没有就留空'
        },
        {
          key: 'nav_items',
          label: '导航项',
          valueType: WorkflowIOValueTypeEnum.string,
          renderTypeList: [FlowNodeInputTypeEnum.reference, FlowNodeInputTypeEnum.textarea],
          defaultValue:
            '首页|#top, 服务|#services, 方案|#solutions, 案例|#cases, 关于|#about, 联系|#contact',
          toolDescription:
            '格式：名称|链接，用逗号或换行分隔。链接可用 #services。正文分区要尽量匹配这些 id'
        },
        {
          key: 'nav_items_en',
          label: '英文导航项',
          valueType: WorkflowIOValueTypeEnum.string,
          renderTypeList: [FlowNodeInputTypeEnum.reference, FlowNodeInputTypeEnum.textarea],
          toolDescription: '格式同 nav_items，如 Home|#top, Services|#services'
        },
        {
          key: 'top_cta_label',
          label: '顶部 CTA 文案',
          valueType: WorkflowIOValueTypeEnum.string,
          renderTypeList: [FlowNodeInputTypeEnum.reference, FlowNodeInputTypeEnum.input],
          toolDescription: '如「预约咨询」「立即试用」「联系我们」'
        },
        {
          key: 'top_cta_label_en',
          label: '英文顶部 CTA',
          valueType: WorkflowIOValueTypeEnum.string,
          renderTypeList: [FlowNodeInputTypeEnum.reference, FlowNodeInputTypeEnum.input],
          toolDescription: '如 Contact Us / Get Started'
        },
        {
          key: 'top_cta_href',
          label: '顶部 CTA 链接',
          valueType: WorkflowIOValueTypeEnum.string,
          renderTypeList: [FlowNodeInputTypeEnum.reference, FlowNodeInputTypeEnum.input],
          defaultValue: '#contact',
          toolDescription: '一般用 #contact'
        },
        {
          key: 'hero_kicker',
          label: '首屏小标题',
          valueType: WorkflowIOValueTypeEnum.string,
          renderTypeList: [FlowNodeInputTypeEnum.reference, FlowNodeInputTypeEnum.input],
          toolDescription: '如「新一代智能门店系统」'
        },
        {
          key: 'hero_kicker_en',
          label: '英文首屏小标题',
          valueType: WorkflowIOValueTypeEnum.string,
          renderTypeList: [FlowNodeInputTypeEnum.reference, FlowNodeInputTypeEnum.input]
        },
        {
          key: 'hero_title',
          label: '首屏大标题',
          valueType: WorkflowIOValueTypeEnum.string,
          renderTypeList: [FlowNodeInputTypeEnum.reference, FlowNodeInputTypeEnum.textarea],
          toolDescription: '官网首屏核心主张，短、有品牌感；可留空，插件会用页面标题兜底'
        },
        {
          key: 'hero_title_en',
          label: '英文首屏大标题',
          valueType: WorkflowIOValueTypeEnum.string,
          renderTypeList: [FlowNodeInputTypeEnum.reference, FlowNodeInputTypeEnum.textarea],
          toolDescription: '默认请填写英文首屏标题'
        },
        {
          key: 'hero_subtitle',
          label: '首屏说明',
          valueType: WorkflowIOValueTypeEnum.string,
          renderTypeList: [FlowNodeInputTypeEnum.reference, FlowNodeInputTypeEnum.textarea],
          toolDescription: '2-3 句内，说明产品/品牌/服务价值；可留空，插件会自动生成简短说明'
        },
        {
          key: 'hero_subtitle_en',
          label: '英文首屏说明',
          valueType: WorkflowIOValueTypeEnum.string,
          renderTypeList: [FlowNodeInputTypeEnum.reference, FlowNodeInputTypeEnum.textarea]
        },
        {
          key: 'hero_primary_label',
          label: '首屏主按钮',
          valueType: WorkflowIOValueTypeEnum.string,
          renderTypeList: [FlowNodeInputTypeEnum.reference, FlowNodeInputTypeEnum.input],
          toolDescription: '如「查看方案」'
        },
        {
          key: 'hero_primary_label_en',
          label: '英文首屏主按钮',
          valueType: WorkflowIOValueTypeEnum.string,
          renderTypeList: [FlowNodeInputTypeEnum.reference, FlowNodeInputTypeEnum.input]
        },
        {
          key: 'hero_primary_href',
          label: '首屏主按钮链接',
          valueType: WorkflowIOValueTypeEnum.string,
          renderTypeList: [FlowNodeInputTypeEnum.reference, FlowNodeInputTypeEnum.input],
          defaultValue: '#services'
        },
        {
          key: 'hero_secondary_label',
          label: '首屏次按钮',
          valueType: WorkflowIOValueTypeEnum.string,
          renderTypeList: [FlowNodeInputTypeEnum.reference, FlowNodeInputTypeEnum.input],
          toolDescription: '如「联系我们」'
        },
        {
          key: 'hero_secondary_label_en',
          label: '英文首屏次按钮',
          valueType: WorkflowIOValueTypeEnum.string,
          renderTypeList: [FlowNodeInputTypeEnum.reference, FlowNodeInputTypeEnum.input]
        },
        {
          key: 'hero_secondary_href',
          label: '首屏次按钮链接',
          valueType: WorkflowIOValueTypeEnum.string,
          renderTypeList: [FlowNodeInputTypeEnum.reference, FlowNodeInputTypeEnum.input],
          defaultValue: '#contact'
        },
        {
          key: 'hero_media_html',
          label: '首屏媒体 HTML',
          valueType: WorkflowIOValueTypeEnum.string,
          renderTypeList: [FlowNodeInputTypeEnum.reference, FlowNodeInputTypeEnum.textarea],
          toolDescription:
            '可选但推荐。用于官网首屏右侧/下方视觉区，像通用 HTML 插件那样做出高级首屏。可写 img、picture、video controls、iframe，或 <img ...><div class="float-card">...</div>。不要写 script'
        },
        {
          key: 'main_sections_html',
          label: '官网主体分区 HTML',
          valueType: WorkflowIOValueTypeEnum.string,
          renderTypeList: [FlowNodeInputTypeEnum.reference, FlowNodeInputTypeEnum.textarea],
          toolDescription:
            '只写 main 里的官网分区，例如服务、优势、案例、流程、FAQ、联系；section 建议带 id 匹配导航。要像通用 HTML 插件一样完整好看：允许开头写 <style>...</style> 做本页专属 CSS；可用 .section-head、.eyebrow、.grid、.grid.two、.grid.four、.card、.product-card、.product-img、.badge、.pill、.soft、.split、.highlight、.stats、.media、.visual、.gallery、.video-card、.contact-card、.feature-banner、.cta-panel、.faq、.button；需要图片/视频时可写 img、picture、video controls、iframe。禁止 script；不要写 header/nav/footer/html/body；可留空，插件会生成默认联系分区'
        },
        {
          key: 'main_sections_html_en',
          label: '英文官网主体分区 HTML',
          valueType: WorkflowIOValueTypeEnum.string,
          renderTypeList: [FlowNodeInputTypeEnum.reference, FlowNodeInputTypeEnum.textarea],
          toolDescription: '默认请填写英文版本，结构和中文一致，id 保持一致'
        },
        {
          key: 'sub_pages_json',
          label: '子页面 JSON（可选，复杂官网才填）',
          valueType: WorkflowIOValueTypeEnum.string,
          renderTypeList: [FlowNodeInputTypeEnum.reference, FlowNodeInputTypeEnum.textarea],
          toolDescription:
            '默认留空，保持单页官网快速生成。只有用户明确要复杂官网/多页面/子页面/详情页/路由跳转时才填写。JSON 数组，每项包含 path、nav_label、nav_label_en、title、title_en、html、html_en。插件会生成 #/path 路由和导航跳转。示例：[{"path":"services","nav_label":"服务","nav_label_en":"Services","title":"服务体系","title_en":"Services","html":"<section><h2>服务</h2><p>...</p></section>","html_en":"<section><h2>Services</h2><p>...</p></section>"}]。禁止 script'
        },
        {
          key: 'footer_note',
          label: '页脚说明',
          valueType: WorkflowIOValueTypeEnum.string,
          renderTypeList: [FlowNodeInputTypeEnum.reference, FlowNodeInputTypeEnum.input]
        },
        {
          key: 'footer_note_en',
          label: '英文页脚说明',
          valueType: WorkflowIOValueTypeEnum.string,
          renderTypeList: [FlowNodeInputTypeEnum.reference, FlowNodeInputTypeEnum.input]
        },
        {
          key: 'template_style',
          label: '官网模板风格',
          valueType: WorkflowIOValueTypeEnum.string,
          renderTypeList: [FlowNodeInputTypeEnum.reference, FlowNodeInputTypeEnum.select],
          defaultValue: 'clean_saas',
          list: [
            { label: '清爽 SaaS / 科技产品', value: 'clean_saas' },
            { label: '品牌杂志 / 高级官网', value: 'brand_editorial' },
            { label: '本地服务 / 门店官网', value: 'local_service' },
            { label: '创意工作室 / 作品集', value: 'creative_studio' }
          ],
          toolDescription: '按用户行业选择模板，不知道就 clean_saas'
        },
        {
          key: 'lang',
          label: '默认语言',
          valueType: WorkflowIOValueTypeEnum.string,
          renderTypeList: [FlowNodeInputTypeEnum.reference, FlowNodeInputTypeEnum.select],
          defaultValue: 'zh-CN',
          list: [
            { label: 'zh-CN', value: 'zh-CN' },
            { label: 'en', value: 'en' }
          ]
        },
        {
          key: 'color_primary',
          label: '主色 #RRGGBB',
          valueType: WorkflowIOValueTypeEnum.string,
          renderTypeList: [FlowNodeInputTypeEnum.reference, FlowNodeInputTypeEnum.input],
          defaultValue: '#2563eb'
        },
        {
          key: 'color_surface',
          label: '背景色',
          valueType: WorkflowIOValueTypeEnum.string,
          renderTypeList: [FlowNodeInputTypeEnum.reference, FlowNodeInputTypeEnum.input],
          defaultValue: '#f8fafc'
        },
        {
          key: 'color_text',
          label: '正文色',
          valueType: WorkflowIOValueTypeEnum.string,
          renderTypeList: [FlowNodeInputTypeEnum.reference, FlowNodeInputTypeEnum.input],
          defaultValue: '#0f172a'
        },
        {
          key: 'favicon_mode',
          label: 'Favicon',
          valueType: WorkflowIOValueTypeEnum.string,
          renderTypeList: [FlowNodeInputTypeEnum.reference, FlowNodeInputTypeEnum.select],
          defaultValue: 'none',
          list: [
            { label: 'none', value: 'none' },
            { label: 'https URL', value: 'url' },
            { label: 'emoji', value: 'emoji' }
          ],
          toolDescription: '一般保持 none；用户明确要浏览器小图标时再选 url 或 emoji'
        },
        {
          key: 'favicon_url',
          label: 'Favicon URL',
          valueType: WorkflowIOValueTypeEnum.string,
          renderTypeList: [FlowNodeInputTypeEnum.reference, FlowNodeInputTypeEnum.input]
        },
        {
          key: 'favicon_emoji',
          label: 'Favicon Emoji',
          valueType: WorkflowIOValueTypeEnum.string,
          renderTypeList: [FlowNodeInputTypeEnum.reference, FlowNodeInputTypeEnum.input],
          defaultValue: '◆'
        },
        {
          key: 'page_output_mode',
          label: '页面输出模式',
          valueType: WorkflowIOValueTypeEnum.string,
          renderTypeList: [FlowNodeInputTypeEnum.select],
          defaultValue: 'auto_publish',
          list: [
            { label: '自动发布到 iPolloOS', value: 'auto_publish' },
            { label: '发布到资源中心（HTTP）', value: 'resource_center' },
            { label: '返回 HTML 字符串', value: 'raw_html' }
          ],
          toolDescription: '一般保持 auto_publish'
        }
      ],
      outputs: [
        {
          valueType: WorkflowIOValueTypeEnum.string,
          key: 'page_html',
          label: '页面 HTML',
          description: '完整单文件官网 HTML。自动发布模式下会由 iPolloOS 生成 page_url。'
        },
        {
          valueType: WorkflowIOValueTypeEnum.string,
          key: 'page_url',
          label: '页面公开链接'
        },
        {
          valueType: WorkflowIOValueTypeEnum.string,
          key: 'full_html',
          label: '完整 HTML 文档'
        },
        { valueType: WorkflowIOValueTypeEnum.string, key: 'summary', label: '摘要' },
        {
          type: FlowNodeOutputTypeEnum.error,
          valueType: WorkflowIOValueTypeEnum.string,
          key: 'system_error',
          label: '错误信息'
        }
      ]
    }
  ]
});
