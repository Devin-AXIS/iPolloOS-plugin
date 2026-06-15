import { z } from 'zod';
import { uploadFile } from '@tool/utils/uploadFile';
import { extractCompleteHtml } from '../../../lib/html';
import { injectPdfExport } from '../../../lib/pdfExport';
import { injectPublicationToc } from '../../../lib/publicationToc';
import { injectSlideRuntime } from '../../../lib/slideRuntime';
import {
  AUTO_TEMPLATE_ID,
  coerceTemplateForRequest,
  getHtmlAnythingTemplate,
  getTemplateOutputFamily,
  hasHtmlAnythingTemplate,
  inferTemplateFromGeneratedHtml,
  resolveExplicitHtmlAnythingTemplate
} from '../../../lib/templates';

const emptyToUndef = (value: unknown) => {
  const text = typeof value === 'string' ? value.trim() : '';
  return text || undefined;
};

const normalizeTemplateId = (value: unknown) => {
  if (typeof value !== 'string') return value;
  return value.trim() || AUTO_TEMPLATE_ID;
};

export const InputType = z.object({
  template_id: z.preprocess(
    normalizeTemplateId,
    z
      .string()
      .min(1)
      .default(AUTO_TEMPLATE_ID)
      .refine(hasHtmlAnythingTemplate, '未知的 html-anything template_id')
  ),
  content: z.string().min(1).max(2_000_000),
  format: z.preprocess(emptyToUndef, z.string().max(80).optional()).default('html'),
  language: z
    .preprocess(emptyToUndef, z.enum(['zh-CN', 'en', 'ja', 'auto']).optional())
    .default('zh-CN'),
  extra_requirements: z.preprocess(emptyToUndef, z.string().max(50_000).optional()),
  page_output_mode: z.enum(['auto_publish', 'raw_html']).optional().default('auto_publish')
});

export const OutputType = z.object({
  page_html: z.string(),
  page_url: z.string(),
  template_id: z.string(),
  template_name: z.string(),
  summary: z.string(),
  page_storage_key: z.string().optional(),
  page_storage_size: z.number().optional(),
  system_error: z.string().optional()
});

type In = z.infer<typeof InputType>;
type Out = z.infer<typeof OutputType>;

function empty(system_error: string): Out {
  return {
    page_html: '',
    page_url: '',
    template_id: '',
    template_name: '',
    summary: '',
    system_error
  };
}

async function publishHtmlPage(html: string, templateId: string) {
  const { accessUrl, objectName, size } = await uploadFile({
    buffer: Buffer.from(html),
    defaultFilename: `html-anything-${templateId}-${Date.now()}.html`,
    contentType: 'text/html; charset=utf-8',
    contentDisposition: 'inline',
    keepRawFilename: true
  });

  return {
    page_url: accessUrl,
    page_storage_key: objectName,
    page_storage_size: size
  };
}

function resolveTemplate(input: In) {
  const requestText = [input.extra_requirements, input.content].filter(Boolean).join('\n');
  if (input.template_id !== AUTO_TEMPLATE_ID) {
    return coerceTemplateForRequest(
      resolveExplicitHtmlAnythingTemplate(input.template_id, requestText),
      requestText
    );
  }

  const inferredFromHtml = inferTemplateFromGeneratedHtml(input.content);
  if (inferredFromHtml) {
    return coerceTemplateForRequest(inferredFromHtml, requestText);
  }

  return coerceTemplateForRequest(getHtmlAnythingTemplate('poster-hero'), requestText);
}

function hasRealSlideStructure(html: string): boolean {
  const text = html.slice(0, 300_000);
  return (
    /<section\b[^>]*class=["'][^"']*\bslide\b/i.test(text) ||
    /<[^>]+\bdata-slide-controls\b/i.test(text) ||
    /<[^>]+\bdata-slide-next\b/i.test(text) ||
    /<[^>]+\bdata-slide-prev\b/i.test(text)
  );
}

function hasPublicationStructure(html: string): boolean {
  const text = html.slice(0, 300_000);
  const headingCount = (text.match(/<h[1-3]\b/gi) || []).length;
  const hasDocumentShell =
    /<(article|main)\b/i.test(text) ||
    /\b(academic-paper-shell|paper-page|book-shell|report-shell|whitepaper-shell|publication)\b/i.test(
      text
    );
  const hasLockedViewport =
    /html\s*,\s*body\s*\{[^}]*overflow\s*:\s*hidden/i.test(text) ||
    /html\s*,\s*body\s*\{[^}]*height\s*:\s*100%[^}]*overflow\s*:\s*hidden/i.test(text) ||
    /\b(viewport|poster|cover-card)\b[^{}]*\{[^}]*height\s*:\s*100vh[^}]*overflow\s*:\s*hidden/i.test(
      text
    );
  const looksLikeSinglePoster =
    /\b(class|id)=["'][^"']*(poster|cover-card|magazine-cover|single-screen|no-scroll|viewport)/i.test(
      text
    ) || /No Scroll|不可滑动|0<\/b>\s*<span>\s*scroll required/i.test(text);

  return hasDocumentShell && headingCount >= 2 && !hasLockedViewport && !looksLikeSinglePoster;
}

function validateTemplateFamily(
  input: In,
  html: string,
  template: NonNullable<ReturnType<typeof resolveTemplate>>
) {
  const family = getTemplateOutputFamily(template);

  if (input.template_id !== AUTO_TEMPLATE_ID) {
    const explicitTemplate = resolveExplicitHtmlAnythingTemplate(input.template_id);
    const explicitFamily = explicitTemplate ? getTemplateOutputFamily(explicitTemplate) : undefined;
    if (explicitFamily && family && explicitFamily !== family) {
      return [
        `模板选择是 ${explicitTemplate?.zhName} (${input.template_id})，但内容被判断成 ${template.zhName} (${template.id})。`,
        '不同交付类别不能混用：PPT/幻灯片、电子书、研究报告、白皮书、论文、网页必须各走各的模板和结构。',
        '请上游 AI 大脑按用户真正需要的类别重新选择模板并生成对应结构的完整 HTML。'
      ].join('');
    }
  }

  if (family === 'slides' && !hasRealSlideStructure(html)) {
    return [
      `模板类别是幻灯片 (${template.id})，但上游 AI 生成的 HTML 不是幻灯片结构。`,
      'slides/PPT/deck 必须由多个 <section class="slide"> 页面组成，不能生成电子书、报告、杂志长页或普通网页后再套幻灯片模板。',
      '请上游 AI 大脑按当前幻灯片模板重新生成完整 HTML 后再调用插件。'
    ].join('');
  }

  if (family === 'publication' && !hasPublicationStructure(html)) {
    return [
      `模板类别是出版物/论文/报告 (${template.id})，但上游 AI 生成的 HTML 不是可阅读的出版物结构。`,
      'publication/book/research/academic-paper 必须是可上下滚动的 article/main 长文结构，包含章节标题、正文、目录/引用等内容。',
      '不能生成固定 16:9 海报、单屏卡片、封面页、poster/viewport/no-scroll 结构，也不能锁定 html/body overflow:hidden。',
      '请上游 AI 大脑按当前出版物模板重新生成完整 HTML 后再调用插件。'
    ].join('');
  }
}

export async function tool(props: In): Promise<Out> {
  try {
    const input = InputType.parse(props);
    const template = resolveTemplate(input);
    if (!template) {
      return empty(`无法选择有效的 html-anything 模板: ${input.template_id}`);
    }

    const generatedHtml = extractCompleteHtml(input.content);
    const familyError = validateTemplateFamily(input, generatedHtml, template);
    if (familyError) {
      return empty(familyError);
    }

    const fullHtml = injectPdfExport(
      injectPublicationToc(injectSlideRuntime(generatedHtml, template), template),
      template
    );

    const autoPublish = input.page_output_mode === 'auto_publish';
    const published = autoPublish ? await publishHtmlPage(fullHtml, template.id) : { page_url: '' };

    return {
      page_html: autoPublish ? '' : fullHtml,
      page_url: published.page_url,
      template_id: template.id,
      template_name: template.zhName,
      page_storage_key: 'page_storage_key' in published ? published.page_storage_key : undefined,
      page_storage_size: 'page_storage_size' in published ? published.page_storage_size : undefined,
      summary: autoPublish
        ? `已发布由上游 AI 大脑生成的完整单文件 HTML，模板标记为 ${template.zhName} (${template.id})。`
        : `已校验由上游 AI 大脑生成的完整单文件 HTML，模板标记为 ${template.zhName} (${template.id})。`
    };
  } catch (error: unknown) {
    return empty(error instanceof Error ? error.message : String(error));
  }
}
