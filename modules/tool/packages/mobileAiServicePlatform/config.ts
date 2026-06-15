import { defineToolSet } from '@tool/type';
import { ToolTagEnum } from '@tool/type/tags';

export default defineToolSet({
  tags: [ToolTagEnum.enum.multimodal, ToolTagEnum.enum.productivity],
  name: {
    'zh-CN': '移动端 AI 服务生成器',
    en: 'Mobile AI service generator'
  },
  description: {
    'zh-CN':
      '基于可配置的 iPolloOS/OpenAI 风格应用接口，把用户描述生成移动端优先的 AI 服务 HTML：短片、视频工具、测算、小游戏、表单和体验式应用均可。',
    en: 'Generate mobile-first AI service HTML from a configurable iPolloOS/OpenAI-compatible app endpoint: short-video concepts, video tools, divination apps, mini games, forms, and interactive experiences.'
  },
  toolDescription:
    '资源配置填写 AI 应用 Key 与地址。工具 mobile_ai_html_app 只需要用户需求、服务语言、背景和可选视觉提示词；它会调用 AI 应用生成移动端优先的单文件 HTML。若上游 AI app 空返回/403/500，会返回本地降级功能页面，避免 page_html 为空。',
  secretInputConfig: [
    {
      key: 'ai_app_key',
      label: 'AI 应用 Key',
      description:
        '应用专属 API Key；请求时作为 Authorization: Bearer 发送。留空使用插件内置默认值。',
      required: false,
      inputType: 'secret'
    },
    {
      key: 'ai_app_url',
      label: 'AI 应用地址',
      description:
        '可填完整 chat completions URL，或应用服务根地址；留空使用内置默认地址。根地址会自动补 /api/v1/chat/completions。',
      required: false,
      inputType: 'input'
    }
  ]
});
