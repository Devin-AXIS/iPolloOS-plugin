import { defineToolSet } from '@tool/type';
import { ToolTagEnum } from '@tool/type/tags';

export default defineToolSet({
  tags: [ToolTagEnum.enum.multimodal],
  name: {
    'zh-CN': '火山方舟 · 豆包对话与 Seedance 视频',
    en: 'Volcengine Ark · Doubao chat & Seedance video'
  },
  description: {
    'zh-CN':
      '对话：方舟 Chat Completions。视频：创建视频生成任务（文生 / 参考图 / 首尾帧），比例、分辨率、时长在节点里用中文选项配置；API Key 与接入点仅在插件资源配置中填写。',
    en: 'Chat via Ark completions; video via content-generation tasks with Chinese UI for ratio, resolution, duration, and mode. Keys and endpoints live in plugin resource config only.'
  },
  toolDescription:
    '资源配置：方舟 API Key、Base URL、对话接入点、视频接入点（可空则与对话相同）。工具：doubao_seed_chat（只填要说的内容）；doubao_seedance_video（创意描述 + 比例/分辨率/时长/模式）。',
  courseUrl: 'https://www.volcengine.com/docs/82379/1399008?lang=zh',
  secretInputConfig: [
    {
      key: 'ark_api_key',
      label: '方舟 API Key',
      description: '控制台 API Key 管理里创建；勿泄露。',
      required: true,
      inputType: 'secret'
    },
    {
      key: 'ark_base_url',
      label: '方舟 Base URL（可选）',
      description: '默认 https://ark.cn-beijing.volces.com/api/v3；其它地域按文档替换。',
      required: false,
      inputType: 'input'
    },
    {
      key: 'chat_model_ep',
      label: '对话 · 接入点 / 模型 ID',
      description: '如 ep-xxxx，用于 doubao_seed_chat。',
      required: true,
      inputType: 'input'
    },
    {
      key: 'video_model_ep',
      label: '视频 · 接入点 / 模型 ID（可选）',
      description: '专门部署 Seedance 等视频模型的接入点；留空则使用上一项「对话接入点」。',
      required: false,
      inputType: 'input'
    }
  ]
});
