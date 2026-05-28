import { defineToolSet } from '@tool/type';
import { ToolTagEnum } from '@tool/type/tags';

export default defineToolSet({
  tags: [ToolTagEnum.enum.productivity, ToolTagEnum.enum.multimodal],
  name: {
    'zh-CN': 'HTML Anything 生成器',
    en: 'HTML Anything generator'
  },
  description: {
    'zh-CN':
      '基于 html-anything 的 75 个内置模板，将 Markdown / CSV / JSON / SQL / 文本生成可发布的单文件 HTML。',
    en: 'Generate publishable single-file HTML from Markdown, CSV, JSON, SQL or text using 75 html-anything templates.'
  },
  toolDescription:
    '工具 html_anything_page 通过 template_id 选择 html-anything 内置模板，直接调用上游 AI 应用生成完整单文件 HTML；默认 page_output_mode=auto_publish，由插件能力层发布到 OSS 公网域名并返回 page_url，不在输出中回传大段 HTML。只有 raw_html 模式返回 page_html/full_html。无需单独配置 AI Key。'
});
