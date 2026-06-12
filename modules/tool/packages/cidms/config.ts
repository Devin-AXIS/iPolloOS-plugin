import { defineToolSet } from '@tool/type';
import { ToolTagEnum } from '@tool/type/tags';

export default defineToolSet({
  tags: [ToolTagEnum.enum.multimodal],
  name: {
    'zh-CN': 'CIDMS 图像与视频',
    en: 'CIDMS Image and Video'
  },
  description: {
    'zh-CN':
      '通过 CIDMS 网关生成图片和视频，支持 Seedance 素材组、人脸/角色参考素材上传与引用。API Key 和网关地址只在插件资源配置中填写。',
    en: 'Generate images and videos through the CIDMS gateway, including Seedance asset groups and face/character reference assets. Credentials live in plugin config only.'
  },
  toolDescription:
    'CIDMS toolset: image generation, video task creation/query, and asset group/upload for face or character reference workflows.',
  courseUrl: 'https://token-gateway.clawos.metacarbon-inc.com',
  secretInputConfig: [
    {
      key: 'seedance_api_key',
      label: 'Seedance API Key',
      description:
        '第三方 Seedance/CIDMS 网关 Bearer API Key。只填写 token 本体，不要带 Bearer 前缀。',
      required: true,
      inputType: 'secret'
    },
    {
      key: 'cidms_api_key',
      label: 'CIDMS API Key（兼容旧字段）',
      description: '旧配置字段；未填写 Seedance API Key 时作为兼容兜底使用。',
      required: false,
      inputType: 'secret'
    },
    {
      key: 'cidms_base_url',
      label: 'CIDMS Base URL',
      description:
        '默认国内生产：https://token-gateway.clawos.metacarbon-inc.com；海外生产：https://token-gateway.clawos.agentclawos.com',
      required: false,
      inputType: 'input',
      defaultValue: 'https://token-gateway.clawos.metacarbon-inc.com'
    }
  ]
});
