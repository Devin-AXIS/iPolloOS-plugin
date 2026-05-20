import { defineToolSet } from '@tool/type';
import { ToolTagEnum } from '@tool/type/tags';

export default defineToolSet({
  tags: [ToolTagEnum.enum.multimodal, ToolTagEnum.enum.productivity],
  name: {
    'zh-CN': '移动端 AI 服务生成器 V4',
    en: 'Mobile AI service generator V4'
  },
  description: {
    'zh-CN':
      '基于可配置的 iPolloOS AI 应用接口，把用户描述生成移动端优先的 AI 服务 HTML：短片、视频工具、测算、小游戏、表单和体验式应用均可。',
    en: 'Generate mobile-first AI service HTML from a configurable iPolloOS AI app endpoint: short-video concepts, video tools, divination apps, mini games, forms, and interactive experiences.'
  },
  toolDescription:
    'V5_RUNTIME_BRIDGE：资源配置填写的是“生成后的移动应用运行时要调用的 iPolloOS AI 应用 Key 与地址”，不是给静态页面暴露的密钥。工具 mobile_ai_html_app 会生成移动端单文件 HTML，并注入 iPolloOS Runtime 调用桥；页面内 AI 回复、搜索、语音、图像、视频和数据库动作必须回到该 iPolloOS AI 应用真实执行。若生成端空返回/403/500，会返回本地降级功能页面，避免 page_html 为空。',
  secretInputConfig: [
    {
      key: 'ai_app_key',
      label: '运行时 AI 应用 Key',
      description:
        '生成后的移动应用调用 iPolloOS AI 能力时使用；由服务端运行时代理发送，不能写入 HTML。留空使用插件内置默认值。',
      required: false,
      inputType: 'secret'
    },
    {
      key: 'ai_app_url',
      label: '运行时 AI 应用地址',
      description:
        '生成后的移动应用运行时调用的 iPolloOS AI 应用地址；留空使用内置默认地址。根地址会自动补 /api/v1/chat/completions。',
      required: false,
      inputType: 'input'
    }
  ]
});
