import { z } from 'zod';
import { buildThemedSingleFileHtml } from '../../../lib/scaffold';
import { HexColorSchema } from '../../../lib/colors';
import { sanitizeHttpUrl } from '../../../lib/escape';

const LangSchema = z.enum(['zh-CN', 'en']);

const emptyToUndef = (v: unknown) => (v === '' || v === null || v === undefined ? undefined : v);

/** 与 page_init 同款校验，但 main_inner_html 必填，减少模型漏填正文 */
export const InputType = z
  .object({
    page_title: z.string().min(1).max(200),
    heading_h1: z.preprocess(emptyToUndef, z.string().min(1).max(400).optional()),
    page_title_en: z.preprocess(emptyToUndef, z.string().min(1).max(200).optional()),
    heading_h1_en: z.preprocess(emptyToUndef, z.string().min(1).max(400).optional()),
    main_inner_html: z.string().min(1).max(900_000),
    main_inner_html_en: z.preprocess(emptyToUndef, z.string().min(1).max(900_000).optional()),
    lang: z.preprocess(emptyToUndef, LangSchema.optional()).default('zh-CN'),
    color_primary: z.preprocess(emptyToUndef, HexColorSchema.optional()),
    color_surface: z.preprocess(emptyToUndef, HexColorSchema.optional()),
    color_text: z.preprocess(emptyToUndef, HexColorSchema.optional()),
    favicon_mode: z.enum(['none', 'url', 'emoji']).optional().default('none'),
    favicon_url: z.preprocess(emptyToUndef, z.string().optional()),
    favicon_emoji: z.preprocess(emptyToUndef, z.string().optional()),
    include_lucide_cdn_hint: z.boolean().optional().default(false),
    page_output_mode: z
      .enum(['auto_publish', 'resource_center', 'raw_html'])
      .optional()
      .default('auto_publish')
  })
  .superRefine((v, ctx) => {
    if (/<script\b/i.test(v.main_inner_html)) {
      ctx.addIssue({ code: 'custom', message: 'main_inner_html 不允许包含 <script>' });
    }
    if (v.main_inner_html_en && /<script\b/i.test(v.main_inner_html_en)) {
      ctx.addIssue({ code: 'custom', message: 'main_inner_html_en 不允许包含 <script>' });
    }
    if (v.favicon_mode === 'url') {
      const u = sanitizeHttpUrl(v.favicon_url ?? '');
      if (!u)
        ctx.addIssue({
          code: 'custom',
          message: 'favicon_mode=url 时必须提供合法 https:// favicon_url'
        });
    }
    if (v.favicon_mode === 'emoji' && !(v.favicon_emoji ?? '').trim()) {
      ctx.addIssue({ code: 'custom', message: 'favicon_mode=emoji 时必须填写 favicon_emoji' });
    }
  });

export const OutputType = z.object({
  page_html: z.string(),
  page_url: z.string(),
  summary: z.string(),
  system_error: z.string().optional()
});

type In = z.infer<typeof InputType>;
type Out = z.infer<typeof OutputType>;

export async function tool(props: In): Promise<Out> {
  try {
    const inp = InputType.parse(props);
    const title = inp.page_title.trim();
    const h1 = inp.heading_h1?.trim() || title;
    const titleEn = inp.page_title_en?.trim();
    const h1En = inp.heading_h1_en?.trim() || titleEn;
    const primary = inp.color_primary ?? '#0ea5e9';
    const surface = inp.color_surface ?? '#f8fafc';
    const text = inp.color_text ?? '#0f172a';

    const pageHtml = buildThemedSingleFileHtml({
      lang: inp.lang,
      page_title: title,
      heading_h1: h1,
      page_title_en: titleEn,
      heading_h1_en: h1En,
      color_primary: primary,
      color_surface: surface,
      color_text: text,
      favicon_mode: inp.favicon_mode,
      favicon_url: inp.favicon_url,
      favicon_emoji: inp.favicon_emoji,
      main_inner_html: inp.main_inner_html.trim(),
      main_inner_html_en: inp.main_inner_html_en?.trim(),
      include_lucide_cdn_hint: inp.include_lucide_cdn_hint
    });

    return {
      page_html: pageHtml,
      page_url: '',
      summary:
        inp.lang === 'en'
          ? 'One-shot themed HTML file. Default: auto-upload; chat shows page_url when published.'
          : '已一键生成完整单文件 HTML；默认在生成后自动上传至平台存储，对话中会给出可打开的 page_url。'
    };
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    return { page_html: '', page_url: '', summary: '', system_error: msg };
  }
}
