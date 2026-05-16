import { defineToolSet } from '@tool/type';
import { ToolTagEnum } from '@tool/type/tags';

export default defineToolSet({
  tags: [ToolTagEnum.enum.productivity],
  name: {
    'zh-CN': '文件解压缩',
    en: 'File archive extract & zip'
  },
  description: {
    'zh-CN':
      '独立系统工具：从 URL 下载并解压常见压缩包（zip/tar/tgz 等），或将多文件 JSON 打成 ZIP。无第三方云、无密钥配置；注意输出体积上限，适合中小文件与自动化工作流。',
    en: 'Extract archives from URL or pack files into ZIP via JSON. No cloud credentials; size limits apply.'
  },
  toolDescription:
    '解压压缩包：URL / base64 / 工作流文件连线三选一；zip_from_files 将多文件打成 zip_base64。不支持加密 zip / 7z。'
});
