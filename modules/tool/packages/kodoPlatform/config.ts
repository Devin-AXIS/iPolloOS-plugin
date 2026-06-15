import { defineToolSet } from '@tool/type';
import { ToolTagEnum } from '@tool/type/tags';

export default defineToolSet({
  tags: [ToolTagEnum.enum.productivity],
  name: {
    'zh-CN': '七牛云 Kodo 对象存储',
    en: 'Qiniu Kodo Object Storage'
  },
  description: {
    'zh-CN':
      '把工作流产物写入七牛 Kodo，并按应用 / 用户 / 会话 / 用途（网页或文件）自动加前缀，避免不同用户目录混在一起。只需在资源配置里绑定一次密钥与访问域名；工作流里用系统变量传入 appId、userId、chatId 即可。网页场景主推可预览链接，文件场景默认更易触发下载。',
    en: 'Upload workflow artifacts to Qiniu Kodo with per-app/per-user/per-chat prefixes. Bind credentials and public domain once; pass appId, userId, chatId from system variables in the flow.'
  },
  toolDescription:
    '资源配置：AK/SK、空间、HTTPS 绑定域名。稳定对外链接请在工作流中只使用节点输出的 final_public_url 或 stable_reply_line，勿经模型二次改写。appId/userId/chatId 用系统变量。',
  courseUrl: 'https://developer.qiniu.com/kodo',
  secretInputConfig: [
    {
      key: 'qiniuAccessKey',
      label: 'AccessKey',
      description: '七牛控制台 → 密钥管理；建议用仅含目标空间权限的子账号。',
      required: true,
      inputType: 'secret'
    },
    {
      key: 'qiniuSecretKey',
      label: 'SecretKey',
      description: '与 AccessKey 成对。',
      required: true,
      inputType: 'secret'
    },
    {
      key: 'qiniuBucket',
      label: '存储空间名称（Bucket）',
      description: 'Kodo 空间名，与控制台一致。',
      required: true,
      inputType: 'input'
    },
    {
      key: 'qiniuPublicBaseUrl',
      label: '访问域名（HTTPS）',
      description:
        '已在七牛「域名管理」绑定到该空间的 HTTPS 访问域名；可只填主机名（自动补 https）。切勿填 *.qiniucs.com（S3 API 域名），否则无法生成可访问的 final_public_url。',
      required: true,
      inputType: 'input'
    }
  ]
});
