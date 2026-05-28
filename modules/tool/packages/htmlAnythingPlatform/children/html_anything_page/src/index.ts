import { z } from 'zod';
import { uploadFile } from '@tool/utils/uploadFile';
import { AiAppFields, callAiApp } from '../../../lib/aiApp';
import { extractCompleteHtml } from '../../../lib/html';
import {
  buildEditPrompt,
  buildGeneratePrompt,
  buildTemplateSelectionPrompt
} from '../../../lib/prompt';
import { injectPdfExport } from '../../../lib/pdfExport';
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

export const InputType = AiAppFields.and(
  z
    .object({
      template_id: z.preprocess(
        normalizeTemplateId,
        z
          .string()
          .min(1)
          .default(AUTO_TEMPLATE_ID)
          .refine(hasHtmlAnythingTemplate, '未知的 html-anything template_id')
      ),
      content: z.string().min(1).max(500_000),
      format: z.preprocess(emptyToUndef, z.string().max(80).optional()).default('text'),
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
    })
);

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

function parseSelectedTemplateId(raw: string): string | undefined {
  const text = raw.trim();
  const jsonText = text.match(/\{[\s\S]*\}/)?.[0] || text;
  try {
    const data = JSON.parse(jsonText) as { template_id?: unknown; id?: unknown };
    const id = typeof data.template_id === 'string' ? data.template_id : data.id;
    return typeof id === 'string' ? id.trim() : undefined;
  } catch {
    const id = text.match(/[a-z0-9]+(?:-[a-z0-9]+)+/i)?.[0];
    return id?.trim();
  }
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

async function resolveTemplate(input: In) {
  const requestText = [input.content, input.extra_requirements].filter(Boolean).join('\n');
  if (input.template_id !== AUTO_TEMPLATE_ID) {
    return coerceTemplateForRequest(
      resolveExplicitHtmlAnythingTemplate(input.template_id, requestText),
      requestText
    );
  }

  try {
    const raw = await callAiApp({
      auth: input,
      prompt: buildTemplateSelectionPrompt({
        content: input.content,
        format: input.format,
        language: input.language,
        extraRequirements: input.extra_requirements
      }),
      chatId: `html-anything-template-router-${Date.now()}`,
      variables: {
        template_mode: AUTO_TEMPLATE_ID,
        format: input.format,
        language: input.language,
        content: input.content
      }
    });
    const selectedId = parseSelectedTemplateId(raw);
    return coerceTemplateForRequest(
      selectedId ? getHtmlAnythingTemplate(selectedId) : undefined,
      requestText
    );
  } catch {
    return coerceTemplateForRequest(getHtmlAnythingTemplate('poster-hero'), requestText);
  }
}

export async function tool(props: In): Promise<Out> {
  try {
    const input = InputType.parse(props);
    const template = await resolveTemplate(input);
    if (!template) {
      return empty(`无法选择有效的 html-anything 模板: ${input.template_id}`);
    }

    const prompt =
      input.edit_from_html && input.edit_from_content
        ? buildEditPrompt({
            template,
            newContent: input.content,
            oldContent: input.edit_from_content,
            oldHtml: input.edit_from_html,
            format: input.format,
            language: input.language,
            extraRequirements: input.extra_requirements
          })
        : buildGeneratePrompt({
            template,
            content: input.content,
            format: input.format,
            language: input.language,
            extraRequirements: input.extra_requirements
          });

    const raw = await callAiApp({
      auth: input,
      prompt,
      chatId: `html-anything-${template.id}-${Date.now()}`,
      variables: {
        template_id: template.id,
        template_name: template.zhName,
        template_category: template.category,
        template_scenario: template.scenario,
        format: input.format,
        language: input.language,
        content: input.content
      }
    });
    const generatedHtml = await (async () => {
      try {
        return extractCompleteHtml(raw);
      } catch (firstError) {
        const retryRaw = await callAiApp({
          auth: input,
          prompt: `${prompt}

【上一次输出无效】
${raw.slice(0, 2000)}

请重新输出。必须只输出真正可运行的完整 HTML 源码，不要解释，不要复述要求，不要 Markdown 代码围栏。
HTML 必须包含实际的 <html>、<head>...</head>、<body>...</body>、</html> 标签。`,
          chatId: `html-anything-${template.id}-${Date.now()}-retry`,
          variables: {
            template_id: template.id,
            template_name: template.zhName,
            template_category: template.category,
            template_scenario: template.scenario,
            format: input.format,
            language: input.language,
            content: input.content,
            previous_invalid_output: raw.slice(0, 2000),
            previous_error: firstError instanceof Error ? firstError.message : String(firstError)
          }
        });
        return extractCompleteHtml(retryRaw);
      }
    })();
    const fullHtml = injectPdfExport(injectSlideRuntime(generatedHtml, template), template);

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
        ? `已使用 ${template.zhName} (${template.id}) 生成完整单文件 HTML，并已通过插件能力层发布到 OSS。`
        : `已使用 ${template.zhName} (${template.id}) 生成完整单文件 HTML。`
    };
  } catch (error: unknown) {
    return empty(error instanceof Error ? error.message : String(error));
  }
}
