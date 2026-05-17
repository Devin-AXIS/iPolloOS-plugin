import { z } from 'zod';
import { sanitizeHttpUrl } from '../../../lib/escape';
import { buildOfficialWebsiteHtml, type OfficialSubPage } from '../../../lib/official';

const LangSchema = z.enum(['zh-CN', 'en']);
const TemplateStyleSchema = z.enum([
  'clean_saas',
  'brand_editorial',
  'local_service',
  'creative_studio'
]);
const emptyToUndef = (v: unknown) => (v === '' || v === null || v === undefined ? undefined : v);
const looseString = (max = 900_000) =>
  z.preprocess(emptyToUndef, z.coerce.string().max(max).optional()).catch(undefined);
const normalizeTemplateStyle = (v: unknown) => {
  if (v === '' || v === null || v === undefined) return undefined;
  const normalized = String(v)
    .trim()
    .toLowerCase()
    .replace(/[\s-]+/g, '_');
  if (normalized === 'saas' || normalized === 'clean') return 'clean_saas';
  if (normalized === 'editorial' || normalized === 'brand') return 'brand_editorial';
  if (normalized === 'local' || normalized === 'service' || normalized === 'store')
    return 'local_service';
  if (normalized === 'creative' || normalized === 'studio' || normalized === 'portfolio')
    return 'creative_studio';
  return normalized;
};
const normalizeMode = (v: unknown) => {
  const normalized = String(v ?? '').trim();
  return normalized === 'resource_center' || normalized === 'raw_html'
    ? normalized
    : 'auto_publish';
};
const normalizeFaviconMode = (v: unknown) => {
  const normalized = String(v ?? '').trim();
  return normalized === 'url' || normalized === 'emoji' ? normalized : 'none';
};
const normalizeColor = (v: unknown) => {
  const raw = String(v ?? '').trim();
  if (!/^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/.test(raw)) return undefined;
  if (raw.length === 4) {
    return `#${raw[1]}${raw[1]}${raw[2]}${raw[2]}${raw[3]}${raw[3]}`.toLowerCase();
  }
  return raw.toLowerCase();
};
const stripScriptTags = (html: string) => html.replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, '');
const publicAssetBase = () =>
  (process.env.STORAGE_PUBLIC_BASE_URL || 'https://iPollo.metaio.cc').replace(/\/+$/, '');
const rewritePublicAssetUrls = (html: string) => {
  const base = publicAssetBase();
  return html
    .replace(/https?:\/\/(?:127\.0\.0\.1|localhost):9000\/ipolloos-public/gi, base)
    .replace(/https?:\/\/(?:127\.0\.0\.1|localhost):9000/gi, base);
};
const cleanHtml = (html: string) => rewritePublicAssetUrls(stripScriptTags(html));
const SubPageSchema = z.object({
  path: z.string().min(1).max(80),
  nav_label: z.string().min(1).max(60),
  nav_label_en: z.string().min(1).max(80).optional(),
  title: z.string().min(1).max(180),
  title_en: z.string().min(1).max(220).optional(),
  html: z.string().min(1).max(180_000),
  html_en: z.string().min(1).max(180_000).optional()
});

function parseSubPagesJSON(value?: string): OfficialSubPage[] | undefined {
  const raw = value?.trim();
  if (!raw) return undefined;
  try {
    const parsed = JSON.parse(raw);
    const result = z.array(SubPageSchema).max(10).safeParse(parsed);
    if (!result.success) return undefined;
    return result.data.map((page) => ({
      ...page,
      html: cleanHtml(page.html),
      html_en: page.html_en ? cleanHtml(page.html_en) : undefined
    }));
  } catch {
    return undefined;
  }
}

export const InputType = z.object({
  page_title: looseString(200),
  page_title_en: looseString(200),
  brand_name: looseString(120),
  brand_name_en: looseString(120),
  logo_text: looseString(12),
  logo_url: looseString(2000),
  nav_items: looseString(1000),
  nav_items_en: looseString(1000),
  top_cta_label: looseString(40),
  top_cta_label_en: looseString(40),
  top_cta_href: looseString(300),
  hero_kicker: looseString(120),
  hero_kicker_en: looseString(120),
  hero_title: looseString(220),
  hero_title_en: looseString(220),
  hero_subtitle: looseString(700),
  hero_subtitle_en: looseString(700),
  hero_primary_label: looseString(40),
  hero_primary_label_en: looseString(40),
  hero_primary_href: looseString(300),
  hero_secondary_label: looseString(40),
  hero_secondary_label_en: looseString(40),
  hero_secondary_href: looseString(300),
  hero_media_html: looseString(180_000),
  main_sections_html: looseString(900_000),
  main_sections_html_en: looseString(900_000),
  sub_pages_json: looseString(900_000),
  footer_note: looseString(160),
  footer_note_en: looseString(160),
  template_style: z
    .preprocess(normalizeTemplateStyle, TemplateStyleSchema.optional())
    .catch('clean_saas')
    .default('clean_saas'),
  lang: z.preprocess(emptyToUndef, LangSchema.optional()).catch('zh-CN').default('zh-CN'),
  color_primary: z.preprocess(normalizeColor, z.string().optional()).catch(undefined),
  color_surface: z.preprocess(normalizeColor, z.string().optional()).catch(undefined),
  color_text: z.preprocess(normalizeColor, z.string().optional()).catch(undefined),
  favicon_mode: z
    .preprocess(normalizeFaviconMode, z.enum(['none', 'url', 'emoji']))
    .catch('none')
    .default('none'),
  favicon_url: looseString(2000),
  favicon_emoji: looseString(20),
  page_output_mode: z
    .preprocess(normalizeMode, z.enum(['auto_publish', 'resource_center', 'raw_html']))
    .catch('auto_publish')
    .default('auto_publish')
});

export const OutputType = z.object({
  page_html: z.string(),
  page_url: z.string(),
  full_html: z.string(),
  summary: z.string(),
  system_error: z.string().optional()
});

type In = z.infer<typeof InputType>;
type Out = z.infer<typeof OutputType>;

export async function tool(props: In): Promise<Out> {
  try {
    const inp = InputType.parse(props);
    const subPages = parseSubPagesJSON(inp.sub_pages_json);
    const pageTitle = (inp.page_title || inp.brand_name || '官网').trim();
    const brandName = (inp.brand_name || inp.page_title || '官网').trim();
    const heroTitle = (inp.hero_title || pageTitle).trim();
    const heroSubtitle = (inp.hero_subtitle || `${brandName} 官方网站。`).trim();
    const mainSections = cleanHtml(
      (
        inp.main_sections_html ||
        `<section id="contact" class="section"><h2>联系我们</h2><p>欢迎了解 ${brandName}。</p></section>`
      ).trim()
    );
    const mainSectionsEn = inp.main_sections_html_en
      ? cleanHtml(inp.main_sections_html_en.trim())
      : undefined;
    const logoUrl = sanitizeHttpUrl(rewritePublicAssetUrls(inp.logo_url ?? '')) || undefined;
    const faviconUrl = sanitizeHttpUrl(rewritePublicAssetUrls(inp.favicon_url ?? '')) || undefined;
    const faviconMode = inp.favicon_mode === 'url' && !faviconUrl ? 'none' : inp.favicon_mode;
    const full_html = buildOfficialWebsiteHtml({
      lang: inp.lang,
      page_title: pageTitle,
      page_title_en: inp.page_title_en?.trim(),
      brand_name: brandName,
      brand_name_en: inp.brand_name_en?.trim(),
      logo_text: inp.logo_text?.trim(),
      logo_url: logoUrl,
      nav_items:
        inp.nav_items ||
        '首页|#top, 服务|#services, 方案|#solutions, 案例|#cases, 关于|#about, 联系|#contact',
      nav_items_en: inp.nav_items_en?.trim(),
      top_cta_label: inp.top_cta_label?.trim(),
      top_cta_label_en: inp.top_cta_label_en?.trim(),
      top_cta_href: inp.top_cta_href?.trim(),
      hero_kicker: inp.hero_kicker?.trim(),
      hero_kicker_en: inp.hero_kicker_en?.trim(),
      hero_title: heroTitle,
      hero_title_en: inp.hero_title_en?.trim(),
      hero_subtitle: heroSubtitle,
      hero_subtitle_en: inp.hero_subtitle_en?.trim(),
      hero_primary_label: inp.hero_primary_label?.trim(),
      hero_primary_label_en: inp.hero_primary_label_en?.trim(),
      hero_primary_href: inp.hero_primary_href?.trim(),
      hero_secondary_label: inp.hero_secondary_label?.trim(),
      hero_secondary_label_en: inp.hero_secondary_label_en?.trim(),
      hero_secondary_href: inp.hero_secondary_href?.trim(),
      hero_media_html: inp.hero_media_html ? cleanHtml(inp.hero_media_html.trim()) : undefined,
      main_sections_html: mainSections,
      main_sections_html_en: mainSectionsEn,
      sub_pages: subPages,
      footer_note: inp.footer_note?.trim(),
      footer_note_en: inp.footer_note_en?.trim(),
      template_style: inp.template_style,
      color_primary: inp.color_primary ?? '#2563eb',
      color_surface: inp.color_surface ?? '#f8fafc',
      color_text: inp.color_text ?? '#0f172a',
      favicon_mode: faviconMode,
      favicon_url: faviconUrl,
      favicon_emoji: inp.favicon_emoji
    });

    return {
      page_html: full_html,
      page_url: '',
      full_html,
      summary:
        inp.lang === 'en'
          ? 'Official website HTML generated. Default: auto-upload; chat shows page_url when published.'
          : '已生成官网专用完整 HTML；默认自动上传至平台存储，对话中会给出可打开的 page_url。'
    };
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    return { page_html: '', page_url: '', full_html: '', summary: '', system_error: msg };
  }
}
