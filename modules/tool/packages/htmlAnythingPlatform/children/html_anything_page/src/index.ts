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
  hasHtmlAnythingTemplate,
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

export const InputType = z
  .object({
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
    edit_from_html: z.preprocess(emptyToUndef, z.string().max(2_000_000).optional()),
    edit_from_content: z.preprocess(emptyToUndef, z.string().max(500_000).optional()),
    page_output_mode: z.enum(['auto_publish', 'raw_html']).optional().default('auto_publish')
  })
  .superRefine((value, ctx) => {
    if (Boolean(value.edit_from_html) !== Boolean(value.edit_from_content)) {
      ctx.addIssue({
        code: 'custom',
        message: 'edit_from_html 与 edit_from_content 需要同时填写，或同时留空'
      });
    }
  });

export const OutputType = z.object({
  page_html: z.string(),
  page_url: z.string(),
  full_html: z.string(),
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
    full_html: '',
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
  const requestText = [input.extra_requirements, input.edit_from_content, input.content]
    .filter(Boolean)
    .join('\n');
  if (input.template_id !== AUTO_TEMPLATE_ID) {
    return coerceTemplateForRequest(
      resolveExplicitHtmlAnythingTemplate(input.template_id, requestText),
      requestText
    );
  }

  return coerceTemplateForRequest(getHtmlAnythingTemplate('poster-hero'), requestText);
}

export async function tool(props: In): Promise<Out> {
  try {
    const input = InputType.parse(props);
    const template = resolveTemplate(input);
    if (!template) {
      return empty(`无法选择有效的 html-anything 模板: ${input.template_id}`);
    }

    const generatedHtml = extractCompleteHtml(input.content);
    const fullHtml = injectPdfExport(
      injectPublicationToc(injectSlideRuntime(generatedHtml, template), template),
      template
    );

    const autoPublish = input.page_output_mode === 'auto_publish';
    const published = autoPublish ? await publishHtmlPage(fullHtml, template.id) : { page_url: '' };

    return {
      page_html: autoPublish ? '' : fullHtml,
      page_url: published.page_url,
      full_html: autoPublish ? '' : fullHtml,
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
