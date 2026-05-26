import { z } from 'zod';
import { escapeHtml, sanitizeHttpUrl } from '../../../lib/escape';
import { buildOfficialWebsiteHtml, type OfficialSubPage } from '../../../lib/official';

const LangSchema = z.enum(['zh-CN', 'en']);
const LanguageModeSchema = z.enum(['zh_only', 'en_only', 'zh_en']);
const TemplateStyleSchema = z.enum([
  'clean_saas',
  'brand_editorial',
  'local_service',
  'creative_studio'
]);
const BackgroundStyleSchema = z.enum(['soft_blur', 'mesh_gradient', 'linear_gradient', 'plain']);
const ThemeSchema = z.enum([
  'tech_blue',
  'editorial_ink',
  'neon_mesh',
  'warm_local',
  'creative_mono'
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
const normalizeTheme = (v: unknown) => {
  const normalized = String(v ?? '')
    .trim()
    .toLowerCase()
    .replace(/[\s-]+/g, '_');
  if (normalized === 'tech' || normalized === 'blue' || normalized === 'saas') return 'tech_blue';
  if (normalized === 'editorial' || normalized === 'brand' || normalized === 'ink')
    return 'editorial_ink';
  if (normalized === 'neon' || normalized === 'mesh' || normalized === 'diffuse')
    return 'neon_mesh';
  if (normalized === 'warm' || normalized === 'local' || normalized === 'store')
    return 'warm_local';
  if (normalized === 'creative' || normalized === 'mono' || normalized === 'studio')
    return 'creative_mono';
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
const normalizeLanguageMode = (v: unknown) => {
  const normalized = String(v ?? '')
    .trim()
    .toLowerCase()
    .replace(/[\s-]+/g, '_');
  if (normalized === 'en' || normalized === 'english' || normalized === 'en_only') return 'en_only';
  if (normalized === 'bilingual' || normalized === 'zh_en' || normalized === 'cn_en')
    return 'zh_en';
  return 'zh_only';
};
const normalizeBackgroundStyle = (v: unknown) => {
  const normalized = String(v ?? '')
    .trim()
    .toLowerCase()
    .replace(/[\s-]+/g, '_');
  if (normalized === 'none' || normalized === 'plain' || normalized === 'flat') return 'plain';
  if (normalized === 'mesh' || normalized === 'neon' || normalized === 'diffuse')
    return 'mesh_gradient';
  if (normalized === 'linear') return 'linear_gradient';
  return 'soft_blur';
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
  (process.env.STORAGE_PUBLIC_BASE_URL || 'https://ipollo.metaio.cc').replace(/\/+$/, '');
const rewritePublicAssetUrls = (html: string) => {
  const base = publicAssetBase();
  return html
    .replace(/https?:\/\/(?:127\.0\.0\.1|localhost):9000\/ipolloos-public/gi, base)
    .replace(/https?:\/\/(?:127\.0\.0\.1|localhost):9000/gi, base);
};
const cleanHtml = (html: string) => rewritePublicAssetUrls(stripScriptTags(html));
const themePresets: Record<
  z.infer<typeof ThemeSchema>,
  {
    template_style: z.infer<typeof TemplateStyleSchema>;
    background_style: z.infer<typeof BackgroundStyleSchema>;
    color_primary: string;
    color_surface: string;
    color_text: string;
    description: string;
  }
> = {
  tech_blue: {
    template_style: 'clean_saas',
    background_style: 'soft_blur',
    color_primary: '#2563eb',
    color_surface: '#f8fafc',
    color_text: '#0f172a',
    description: '清爽科技感，克制留白，蓝色强调，适合 SaaS、AI、企业服务和硬科技官网。'
  },
  editorial_ink: {
    template_style: 'brand_editorial',
    background_style: 'linear_gradient',
    color_primary: '#111827',
    color_surface: '#f6f3ee',
    color_text: '#171717',
    description: '品牌杂志感，高级排版，低饱和背景，适合品牌、机构、咨询和高端服务。'
  },
  neon_mesh: {
    template_style: 'creative_studio',
    background_style: 'mesh_gradient',
    color_primary: '#7c3aed',
    color_surface: '#f8fafc',
    color_text: '#111827',
    description: '霓虹弥散渐变，视觉更活跃，适合创意、活动、AI 产品和年轻化品牌。'
  },
  warm_local: {
    template_style: 'local_service',
    background_style: 'soft_blur',
    color_primary: '#0f766e',
    color_surface: '#fafaf7',
    color_text: '#1f2937',
    description: '温和可信，信息明确，适合门店、本地服务、教育、健康和生活方式官网。'
  },
  creative_mono: {
    template_style: 'creative_studio',
    background_style: 'plain',
    color_primary: '#e11d48',
    color_surface: '#ffffff',
    color_text: '#111111',
    description: '黑白基底加高对比强调色，作品集和设计工作室感，适合创作者和项目展示。'
  }
};
const splitLines = (value?: string, fallback: string[] = []) => {
  const parts = (value || '')
    .split(/\n|,|，|;/)
    .map((item) => item.trim())
    .filter(Boolean)
    .map((item) => item.split('|')[0]?.trim())
    .filter(Boolean);
  return parts.length > 0 ? parts.slice(0, 8) : fallback;
};
const navId = (label: string, index: number) => {
  const known: Record<string, string> = {
    首页: 'top',
    服务: 'services',
    方案: 'solutions',
    产品: 'products',
    案例: 'cases',
    关于: 'about',
    联系: 'contact',
    Home: 'top',
    Services: 'services',
    Solutions: 'solutions',
    Products: 'products',
    Cases: 'cases',
    About: 'about',
    Contact: 'contact'
  };
  return known[label] || `section-${index}`;
};
const buildAutoMainSections = ({
  brandName,
  profile,
  navItems,
  lang
}: {
  brandName: string;
  profile?: string;
  navItems?: string;
  lang: 'zh' | 'en';
}) => {
  const fallback =
    lang === 'en'
      ? ['Services', 'Solutions', 'Cases', 'About', 'Contact']
      : ['服务', '方案', '案例', '关于', '联系'];
  const labels = splitLines(navItems, fallback).filter(
    (item) => item !== '首页' && item !== 'Home'
  );
  const safeBrand = escapeHtml(brandName);
  const safeProfile = escapeHtml(
    profile?.trim() ||
      (lang === 'en'
        ? `${brandName} provides clear, reliable official information, product value and contact channels.`
        : `${brandName} 提供清晰可靠的官网信息、产品价值与联系入口。`)
  );

  return labels
    .map((label, index) => {
      const safeLabel = escapeHtml(label);
      const id = navId(label, index + 1);
      if (id === 'contact') {
        return `<section id="contact" class="section"><div class="contact-card"><div><p class="eyebrow">${lang === 'en' ? 'Contact' : '联系'}</p><h2>${lang === 'en' ? `Talk to ${safeBrand}` : `联系 ${safeBrand}`}</h2><p>${lang === 'en' ? 'Share your goals, timeline and preferred contact method. The team will follow up with a practical next step.' : '留下你的目标、时间和联系方式，团队会根据需求给出下一步建议。'}</p></div><a class="button" href="mailto:hello@example.com">${lang === 'en' ? 'Contact us' : '联系我们'}</a></div></section>`;
      }
      if (id === 'about') {
        return `<section id="about" class="section soft"><div class="split"><div><p class="eyebrow">${safeLabel}</p><h2>${lang === 'en' ? `Built around ${safeBrand}` : `围绕 ${safeBrand} 的长期价值`}</h2><p>${safeProfile}</p></div><div class="glass-strip"><div><strong>${lang === 'en' ? 'Clear' : '清晰'}</strong><p>${lang === 'en' ? 'Focused brand narrative and concise product value.' : '聚焦品牌叙事与产品价值，避免堆砌信息。'}</p></div><div><strong>${lang === 'en' ? 'Useful' : '可用'}</strong><p>${lang === 'en' ? 'Navigation, sections and actions are ready for publishing.' : '导航、分区与行动入口都面向真实发布。'}</p></div><div><strong>${lang === 'en' ? 'Consistent' : '统一'}</strong><p>${lang === 'en' ? 'Theme colors and layout stay consistent across pages.' : '主题色与版式在各页面保持统一。'}</p></div></div></div></section>`;
      }
      return `<section id="${id}" class="section"><div class="section-head"><p class="eyebrow">${safeLabel}</p><h2>${lang === 'en' ? `${safeLabel} for modern teams` : `${safeLabel}，为真实业务而设计`}</h2><p>${safeProfile}</p></div><div class="grid three"><article class="card"><span class="badge">${lang === 'en' ? '01' : '重点 01'}</span><h3>${lang === 'en' ? 'Fast to understand' : '快速理解'}</h3><p>${lang === 'en' ? 'Visitors can quickly understand what the brand offers and why it matters.' : '让访问者快速理解品牌提供什么，以及为什么值得关注。'}</p></article><article class="card"><span class="badge">${lang === 'en' ? '02' : '重点 02'}</span><h3>${lang === 'en' ? 'Easy to act' : '方便行动'}</h3><p>${lang === 'en' ? 'Each section keeps a clear path to contact, learn more or compare options.' : '每个分区都保留清楚的联系、了解或比较路径。'}</p></article><article class="card"><span class="badge">${lang === 'en' ? '03' : '重点 03'}</span><h3>${lang === 'en' ? 'Brand aligned' : '贴合品牌'}</h3><p>${lang === 'en' ? 'Visual rhythm follows the selected style, color and background direction.' : '视觉节奏跟随已选风格、颜色与背景方向展开。'}</p></article></div></section>`;
    })
    .join('\n');
};
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
  company_profile: looseString(2000),
  theme_id: z
    .preprocess(normalizeTheme, ThemeSchema.optional())
    .catch('tech_blue')
    .default('tech_blue'),
  theme_note: looseString(500),
  language_mode: z
    .preprocess(normalizeLanguageMode, LanguageModeSchema.optional())
    .catch('zh_only')
    .default('zh_only'),
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
    .catch(undefined),
  background_style: z
    .preprocess(normalizeBackgroundStyle, BackgroundStyleSchema.optional())
    .catch(undefined),
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
    const theme = themePresets[inp.theme_id];
    const themeProfile = [inp.company_profile, inp.theme_note ? `主题补充：${inp.theme_note}` : '']
      .filter(Boolean)
      .join('\n');
    const pageTitle = (inp.page_title || inp.brand_name || '官网').trim();
    const brandName = (inp.brand_name || inp.page_title || '官网').trim();
    const brandNameEn = (inp.brand_name_en || brandName).trim();
    const bilingual = inp.language_mode === 'zh_en';
    const englishOnly = inp.language_mode === 'en_only';
    const baseBrandName = englishOnly ? brandNameEn : brandName;
    const heroTitle = (
      inp.hero_title || (englishOnly ? `${brandNameEn} official site` : `${brandName} 官方网站`)
    ).trim();
    const heroTitleEn = (
      inp.hero_title_en || (bilingual ? `${brandNameEn} official site` : undefined)
    )?.trim();
    const heroSubtitle = (
      inp.hero_subtitle ||
      themeProfile ||
      (englishOnly
        ? `${brandNameEn} presents its brand story, services, cases and contact information in one polished official site.`
        : `${brandName} 的品牌介绍、核心服务、案例亮点与联系入口已整合为一套可发布官网。`)
    ).trim();
    const heroSubtitleEn = (
      inp.hero_subtitle_en ||
      (bilingual
        ? themeProfile ||
          `${brandNameEn} presents its brand story, services, cases and contact information in one polished official site.`
        : undefined)
    )?.trim();
    const mainSections = cleanHtml(
      (
        inp.main_sections_html ||
        buildAutoMainSections({
          brandName: baseBrandName,
          profile: themeProfile || theme.description,
          navItems: inp.nav_items,
          lang: englishOnly ? 'en' : 'zh'
        })
      ).trim()
    );
    const mainSectionsEn = inp.main_sections_html_en
      ? cleanHtml(inp.main_sections_html_en.trim())
      : bilingual
        ? cleanHtml(
            buildAutoMainSections({
              brandName: brandNameEn,
              profile: themeProfile || theme.description,
              navItems: inp.nav_items_en,
              lang: 'en'
            })
          )
        : undefined;
    const logoUrl = sanitizeHttpUrl(rewritePublicAssetUrls(inp.logo_url ?? '')) || undefined;
    const faviconUrl = sanitizeHttpUrl(rewritePublicAssetUrls(inp.favicon_url ?? '')) || undefined;
    const faviconMode = inp.favicon_mode === 'url' && !faviconUrl ? 'none' : inp.favicon_mode;
    const full_html = buildOfficialWebsiteHtml({
      lang: englishOnly ? 'en' : inp.lang,
      page_title: englishOnly ? `${brandNameEn} official site` : pageTitle,
      page_title_en:
        inp.page_title_en?.trim() || (bilingual ? `${brandNameEn} official site` : undefined),
      brand_name: baseBrandName,
      brand_name_en: brandNameEn,
      logo_text: inp.logo_text?.trim(),
      logo_url: logoUrl,
      nav_items:
        (englishOnly ? inp.nav_items_en || inp.nav_items : inp.nav_items) ||
        (englishOnly
          ? 'Home|#top, Services|#services, Solutions|#solutions, Cases|#cases, About|#about, Contact|#contact'
          : '首页|#top, 服务|#services, 方案|#solutions, 案例|#cases, 关于|#about, 联系|#contact'),
      nav_items_en: inp.nav_items_en?.trim(),
      top_cta_label: inp.top_cta_label?.trim(),
      top_cta_label_en: inp.top_cta_label_en?.trim(),
      top_cta_href: inp.top_cta_href?.trim(),
      hero_kicker: inp.hero_kicker?.trim(),
      hero_kicker_en: inp.hero_kicker_en?.trim(),
      hero_title: heroTitle,
      hero_title_en: heroTitleEn,
      hero_subtitle: heroSubtitle,
      hero_subtitle_en: heroSubtitleEn,
      hero_primary_label:
        inp.hero_primary_label?.trim() || (englishOnly ? 'Explore services' : '查看服务'),
      hero_primary_label_en:
        inp.hero_primary_label_en?.trim() || (bilingual ? 'Explore services' : undefined),
      hero_primary_href: inp.hero_primary_href?.trim(),
      hero_secondary_label:
        inp.hero_secondary_label?.trim() || (englishOnly ? 'Contact us' : '联系我们'),
      hero_secondary_label_en:
        inp.hero_secondary_label_en?.trim() || (bilingual ? 'Contact us' : undefined),
      hero_secondary_href: inp.hero_secondary_href?.trim(),
      hero_media_html: inp.hero_media_html ? cleanHtml(inp.hero_media_html.trim()) : undefined,
      main_sections_html: mainSections,
      main_sections_html_en: mainSectionsEn,
      sub_pages: subPages,
      footer_note: inp.footer_note?.trim(),
      footer_note_en: inp.footer_note_en?.trim(),
      template_style: inp.template_style || theme.template_style,
      background_style: inp.background_style || theme.background_style,
      color_primary: inp.color_primary ?? theme.color_primary,
      color_surface: inp.color_surface ?? theme.color_surface,
      color_text: inp.color_text ?? theme.color_text,
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
