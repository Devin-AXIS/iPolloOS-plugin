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
    '【官网需求优先调用 official_website_page】用于公司官网、品牌官网、产品官网、门店官网、项目官网、作品集官网。调用时只收集核心信息：品牌/公司名、公司简介、语言、导航和官网主题。主题是核心：它内置颜色组、背景效果和风格描述；不要再要求用户逐项填写主色、背景色、按钮、CTA、首屏标题、正文分区、页脚、favicon 等长尾内容。工具会围绕品牌信息、导航和主题自动生成首屏、正文分区、联系区、页脚、移动端导航和语言切换。默认单页官网，用户明确要求复杂多页面时使用 additional_pages_json。默认移动端优先：手机端顶部栏是汉堡菜单；Logo/品牌名固定左侧；中英双语时语言切换固定在顶部栏。',
  versionList: [
    {
      value: '1.1.0',
      description:
        'Theme-driven official site generation with simplified brand, language, nav and theme inputs',
      inputs: [
        {
          key: 'brand_name',
          label: '品牌名 / 公司名',
          valueType: WorkflowIOValueTypeEnum.string,
          renderTypeList: [FlowNodeInputTypeEnum.reference, FlowNodeInputTypeEnum.input],
          required: true,
          toolDescription: '必填。官网顶部品牌名和页面核心品牌，例如「星河智能科技」。'
        },
        {
          key: 'brand_name_en',
          label: '英文品牌名',
          valueType: WorkflowIOValueTypeEnum.string,
          renderTypeList: [FlowNodeInputTypeEnum.reference, FlowNodeInputTypeEnum.input],
          toolDescription: '需要英文或中英双语时填写；不知道可按品牌名音译或保留原品牌名。'
        },
        {
          key: 'company_profile',
          label: '公司 / 品牌信息',
          valueType: WorkflowIOValueTypeEnum.string,
          renderTypeList: [FlowNodeInputTypeEnum.reference, FlowNodeInputTypeEnum.textarea],
          toolDescription:
            '填写品牌、公司、产品、行业、目标客户、卖点等基础信息即可。不要让用户逐段输入官网内容；未给出的正文、首屏、CTA、案例、关于、联系等由工具自动生成。'
        },
        {
          key: 'language_mode',
          label: '语言',
          valueType: WorkflowIOValueTypeEnum.string,
          renderTypeList: [FlowNodeInputTypeEnum.reference, FlowNodeInputTypeEnum.select],
          defaultValue: 'zh_only',
          list: [
            { label: '仅中文', value: 'zh_only' },
            { label: '仅英文', value: 'en_only' },
            { label: '中英双语', value: 'zh_en' }
          ],
          toolDescription: '按用户要求选择；没有说明时用仅中文。'
        },
        {
          key: 'lang',
          label: '默认语言',
          valueType: WorkflowIOValueTypeEnum.string,
          renderTypeList: [FlowNodeInputTypeEnum.reference, FlowNodeInputTypeEnum.select],
          defaultValue: 'zh-CN',
          list: [
            { label: '中文优先', value: 'zh-CN' },
            { label: '英文优先', value: 'en' }
          ],
          toolDescription: '页面初始显示语言。中英双语时决定默认打开中文还是英文。'
        },
        {
          key: 'nav_items',
          label: '导航项',
          valueType: WorkflowIOValueTypeEnum.string,
          renderTypeList: [FlowNodeInputTypeEnum.reference, FlowNodeInputTypeEnum.textarea],
          defaultValue:
            '首页|#top, 服务|#services, 方案|#solutions, 案例|#cases, 关于|#about, 联系|#contact',
          toolDescription:
            '可选。只填导航名称即可，也支持「名称|链接」。正文分区会围绕这些导航自动生成；不要再额外要求用户填写各分区内容。'
        },
        {
          key: 'nav_items_en',
          label: '英文导航项',
          valueType: WorkflowIOValueTypeEnum.string,
          renderTypeList: [FlowNodeInputTypeEnum.reference, FlowNodeInputTypeEnum.textarea],
          toolDescription: '中英双语或英文官网时可填，如 Home|#top, Services|#services。'
        },
        {
          key: 'logo_url',
          label: 'Logo 图片 URL',
          valueType: WorkflowIOValueTypeEnum.string,
          renderTypeList: [FlowNodeInputTypeEnum.reference, FlowNodeInputTypeEnum.input],
          toolDescription:
            '可选。用户提供 logo 图片时填写 http(s) URL；没有就用品牌名自动生成文字 Logo。'
        },
        {
          key: 'theme_id',
          label: '官网主题',
          valueType: WorkflowIOValueTypeEnum.string,
          renderTypeList: [FlowNodeInputTypeEnum.reference, FlowNodeInputTypeEnum.select],
          defaultValue: 'tech_blue',
          list: [
            { label: '科技蓝：SaaS / AI / 企业服务', value: 'tech_blue' },
            { label: '墨色杂志：品牌 / 咨询 / 高端服务', value: 'editorial_ink' },
            { label: '霓虹弥散：活动 / 创意 / 年轻品牌', value: 'neon_mesh' },
            { label: '温和本地：门店 / 教育 / 健康服务', value: 'warm_local' },
            { label: '黑白创意：作品集 / 设计工作室', value: 'creative_mono' }
          ],
          toolDescription:
            '核心字段。主题内置颜色组、背景效果和风格描述；按钮、CTA、分区和正文内容由工具根据主题自动决定。'
        },
        {
          key: 'theme_note',
          label: '主题补充',
          valueType: WorkflowIOValueTypeEnum.string,
          renderTypeList: [FlowNodeInputTypeEnum.reference, FlowNodeInputTypeEnum.textarea],
          toolDescription:
            '可选。只写主题级补充，例如「更像苹果官网」「更年轻」「背景要霓虹弥散但整体克制」。不要在这里填写具体按钮、分区或正文。'
        },
        {
          key: 'visual_assets',
          label: '视觉素材 URL',
          valueType: WorkflowIOValueTypeEnum.string,
          renderTypeList: [FlowNodeInputTypeEnum.reference, FlowNodeInputTypeEnum.textarea],
          toolDescription:
            '可选。用户提供或上游生成的图片素材 URL，每行一个；也支持「首屏汽车图|https://...png」。工具会自动作为首屏图和视觉图片区渲染，不要把图片 URL 混进公司简介正文。'
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
          toolDescription: '一般保持 auto_publish。'
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
