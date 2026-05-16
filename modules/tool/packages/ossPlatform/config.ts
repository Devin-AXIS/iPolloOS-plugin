import { defineToolSet } from '@tool/type';
import { ToolTagEnum } from '@tool/type/tags';

export default defineToolSet({
  tags: [ToolTagEnum.enum.productivity],
  name: {
    'zh-CN': '阿里云 OSS',
    en: 'Alibaba Cloud OSS'
  },
  description: {
    'zh-CN':
      '仅包含**一个节点**「上传到 OSS 并获取链接」：URL 或文本上传、自动目录隔离、默认生成 24h 临时链便于私桶分享，大文件给 PUT 预签名。资源配置只需 AK/SK、Region、Bucket；可选填自定义访问域名。若界面仍出现多颗旧 OSS 节点，请用本仓库打出的新 `ossPlatform.pkg` 覆盖导入。',
    en: 'Single tool: upload + share links, 24h presigned URL by default, large-file PUT. Configure AK/SK, region, bucket, optional public base URL. Re-import ossPlatform.pkg if you still see legacy OSS nodes.'
  },
  toolDescription:
    'Bind RAM once. Wire appId, userId, chatId from system variables. Keys are prefixed ipolloos/{appId}/{userId}/{chatId}/{sites|files}/…',
  courseUrl: 'https://help.aliyun.com/zh/oss/',
  secretInputConfig: [
    {
      key: 'aliyunAccessKeyId',
      label: 'AccessKey ID',
      description: 'RAM 子用户即可，授予目标 Bucket 的读写列删最小权限。',
      required: true,
      inputType: 'secret'
    },
    {
      key: 'aliyunAccessKeySecret',
      label: 'AccessKey Secret',
      description: '与上成对。',
      required: true,
      inputType: 'secret'
    },
    {
      key: 'ossRegion',
      label: '地域 Region',
      description: '如 oss-cn-hangzhou。',
      required: true,
      inputType: 'input'
    },
    {
      key: 'ossBucket',
      label: 'Bucket 名称',
      description: '',
      required: true,
      inputType: 'input'
    },
    {
      key: 'ossPublicBaseUrl',
      label: '自定义访问域名（可选）',
      description:
        '绑定 CDN / 自定义域时填写，形如 https://static.example.com ，工具会自动把它当作「首推链接」。',
      required: false,
      inputType: 'input'
    }
  ]
});
