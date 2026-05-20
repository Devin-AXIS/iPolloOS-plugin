import { faviconDataUrlFromEmoji } from './favicon';
import { escapeHtml, sanitizeHttpUrl } from './escape';

export type OfficialWebsiteInput = {
  lang: 'zh-CN' | 'en';
  page_title: string;
  page_title_en?: string;
  brand_name: string;
  brand_name_en?: string;
  logo_text?: string;
  logo_url?: string;
  nav_items: string;
  nav_items_en?: string;
  top_cta_label?: string;
  top_cta_label_en?: string;
  top_cta_href?: string;
  hero_kicker?: string;
  hero_kicker_en?: string;
  hero_title: string;
  hero_title_en?: string;
  hero_subtitle: string;
  hero_subtitle_en?: string;
  hero_primary_label?: string;
  hero_primary_label_en?: string;
  hero_primary_href?: string;
  hero_secondary_label?: string;
  hero_secondary_label_en?: string;
  hero_secondary_href?: string;
  hero_media_html?: string;
  main_sections_html: string;
  main_sections_html_en?: string;
  sub_pages?: OfficialSubPage[];
  footer_note?: string;
  footer_note_en?: string;
  template_style: 'clean_saas' | 'brand_editorial' | 'local_service' | 'creative_studio';
  background_style: 'soft_blur' | 'mesh_gradient' | 'linear_gradient' | 'plain';
  color_primary: string;
  color_surface: string;
  color_text: string;
  favicon_mode: 'none' | 'url' | 'emoji';
  favicon_url?: string;
  favicon_emoji?: string;
};

type NavItem = {
  label: string;
  href: string;
};

export type OfficialSubPage = {
  path: string;
  nav_label: string;
  nav_label_en?: string;
  title: string;
  title_en?: string;
  html: string;
  html_en?: string;
};

function buildIconLink(
  inp: Pick<OfficialWebsiteInput, 'favicon_mode' | 'favicon_url' | 'favicon_emoji'>
): string {
  if (inp.favicon_mode === 'url') {
    const u = sanitizeHttpUrl(inp.favicon_url ?? '');
    if (!u) return '';
    return `<link rel="icon" href="${escapeHtml(u)}" />`;
  }
  if (inp.favicon_mode === 'emoji') {
    const href = faviconDataUrlFromEmoji(inp.favicon_emoji ?? '◆');
    return `<link rel="icon" href="${escapeHtml(href)}" />`;
  }
  return '';
}

function normalizeHref(value: string, fallback: string): string {
  const trimmed = value.trim();
  if (!trimmed) return fallback;
  if (trimmed.startsWith('#')) return trimmed;
  const url = sanitizeHttpUrl(trimmed);
  return url || fallback;
}

function parseNavItems(input: string, fallback: string[]): NavItem[] {
  const parts = input
    .split(/\n|,|，|;/)
    .map((item) => item.trim())
    .filter(Boolean);

  const source = parts.length > 0 ? parts : fallback;
  return source.slice(0, 8).map((item, index) => {
    const [labelRaw, hrefRaw] = item.split('|').map((part) => part.trim());
    const label = labelRaw || fallback[index] || `Section ${index + 1}`;
    const defaultHref = index === 0 ? '#top' : `#section-${index}`;
    return { label, href: normalizeHref(hrefRaw || '', defaultHref) };
  });
}

function normalizeRoutePath(path: string, fallback: string): string {
  const trimmed = path.trim().replace(/^#\/?/, '').replace(/^\/+/, '').replace(/\/+$/, '');
  const safe = trimmed
    .toLowerCase()
    .replace(/[^a-z0-9_-]+/g, '-')
    .replace(/^-+|-+$/g, '');
  return safe || fallback;
}

function routeHref(path: string): string {
  const normalized = normalizeRoutePath(path, 'page');
  return normalized === 'home' ? '#/' : `#/${normalized}`;
}

function optionalAnchor(
  label: string | undefined,
  href: string | undefined,
  className: string,
  attrs = ''
): string {
  const text = label?.trim();
  if (!text) return '';
  return `<a class="${className}"${attrs ? ` ${attrs}` : ''} href="${escapeHtml(normalizeHref(href || '', '#contact'))}">${escapeHtml(text)}</a>`;
}

function logoMarkup(inp: OfficialWebsiteInput, brand: string): string {
  const logoUrl = sanitizeHttpUrl(inp.logo_url ?? '');
  if (logoUrl) {
    return `<img class="site-logo-img" src="${escapeHtml(logoUrl)}" alt="${escapeHtml(brand)} logo"/>`;
  }

  const logoText = (inp.logo_text?.trim() || brand.slice(0, 2) || 'OS').slice(0, 4);
  return `<span class="site-logo-mark">${escapeHtml(logoText)}</span>`;
}

function styleVars(
  style: OfficialWebsiteInput['template_style'],
  background: OfficialWebsiteInput['background_style']
) {
  const backgroundLayer = (() => {
    switch (background) {
      case 'plain':
        return 'var(--surface)';
      case 'linear_gradient':
        return 'linear-gradient(140deg,color-mix(in srgb,var(--primary) 14%,var(--surface)),var(--surface) 42%,color-mix(in srgb,var(--text) 5%,var(--surface)))';
      case 'mesh_gradient':
        return 'radial-gradient(circle at 14% 16%,color-mix(in srgb,var(--primary) 30%,transparent),transparent 30%),radial-gradient(circle at 86% 10%,color-mix(in srgb,#22d3ee 24%,transparent),transparent 28%),radial-gradient(circle at 70% 82%,color-mix(in srgb,#f472b6 18%,transparent),transparent 32%),linear-gradient(140deg,color-mix(in srgb,var(--primary) 8%,var(--surface)),var(--surface) 38%,color-mix(in srgb,var(--text) 4%,var(--surface)))';
      default:
        return 'radial-gradient(circle at 18% 12%,color-mix(in srgb,var(--primary) 18%,transparent),transparent 28%),linear-gradient(140deg,color-mix(in srgb,var(--primary) 8%,var(--surface)),var(--surface) 34%,color-mix(in srgb,var(--text) 4%,var(--surface)))';
    }
  })();

  switch (style) {
    case 'brand_editorial':
      return {
        radius: '1.5rem',
        heroMinHeight: 'calc(92svh - 5.2rem)',
        sectionGap: 'clamp(3rem,8vw,7rem)',
        hero: 'linear-gradient(135deg,rgba(255,255,255,.94),rgba(255,255,255,.72))',
        texture:
          'linear-gradient(120deg,rgba(255,255,255,.62),transparent 42%),radial-gradient(circle at 86% 20%,rgba(255,255,255,.48),transparent 24%)',
        cardBg: 'rgba(255,255,255,.68)',
        backgroundLayer
      };
    case 'local_service':
      return {
        radius: '1rem',
        heroMinHeight: 'calc(86svh - 5.2rem)',
        sectionGap: 'clamp(2.5rem,7vw,5.5rem)',
        hero: 'linear-gradient(135deg,rgba(255,255,255,.96),rgba(255,255,255,.84))',
        texture:
          'linear-gradient(120deg,rgba(255,255,255,.58),transparent 36%),linear-gradient(0deg,rgba(255,255,255,.32),transparent 48%)',
        cardBg: 'rgba(255,255,255,.78)',
        backgroundLayer
      };
    case 'creative_studio':
      return {
        radius: '1.25rem',
        heroMinHeight: 'calc(90svh - 5.2rem)',
        sectionGap: 'clamp(3rem,8vw,6rem)',
        hero: 'linear-gradient(135deg,rgba(255,255,255,.92),rgba(255,255,255,.7))',
        texture:
          'linear-gradient(145deg,rgba(255,255,255,.58),transparent 38%),linear-gradient(20deg,transparent,rgba(255,255,255,.46))',
        cardBg: 'rgba(255,255,255,.64)',
        backgroundLayer
      };
    default:
      return {
        radius: '.9rem',
        heroMinHeight: 'calc(88svh - 5.2rem)',
        sectionGap: 'clamp(2.75rem,7vw,6rem)',
        hero: 'linear-gradient(135deg,rgba(255,255,255,.96),rgba(255,255,255,.78))',
        texture:
          'linear-gradient(135deg,rgba(255,255,255,.7),transparent 38%),linear-gradient(0deg,rgba(255,255,255,.36),transparent 52%)',
        cardBg: 'rgba(255,255,255,.72)',
        backgroundLayer
      };
  }
}

export function buildOfficialWebsiteHtml(inp: OfficialWebsiteInput): string {
  const title = inp.page_title.trim();
  const titleEn = inp.page_title_en?.trim();
  const brand = inp.brand_name.trim() || title;
  const brandEn = inp.brand_name_en?.trim() || titleEn || brand;
  const hasEnglish = Boolean(
    titleEn && inp.hero_title_en?.trim() && inp.main_sections_html_en?.trim()
  );
  const subPages = (inp.sub_pages || []).slice(0, 10).map((page, index) => ({
    ...page,
    path: normalizeRoutePath(page.path, `page-${index + 1}`)
  }));
  const hasRoutes = subPages.length > 0;
  const zhNav = hasRoutes
    ? [
        { label: '首页', href: '#/' },
        ...subPages.map((page) => ({
          label: page.nav_label || page.title,
          href: routeHref(page.path)
        }))
      ]
    : parseNavItems(inp.nav_items, ['首页', '服务', '方案', '案例', '关于', '联系']);
  const enNav = hasRoutes
    ? [
        { label: 'Home', href: '#/' },
        ...subPages.map((page) => ({
          label: page.nav_label_en || page.title_en || page.nav_label || page.title,
          href: routeHref(page.path)
        }))
      ]
    : parseNavItems(inp.nav_items_en || '', [
        'Home',
        'Services',
        'Solutions',
        'Cases',
        'About',
        'Contact'
      ]);
  const vars = styleVars(inp.template_style, inp.background_style);
  const iconLink = buildIconLink(inp);
  const heroMedia = inp.hero_media_html?.trim();
  const defaultLang = hasEnglish && inp.lang === 'en' ? 'en' : 'zh';

  const navLinks = (items: NavItem[], lang: 'zh' | 'en') =>
    items
      .map(
        (item) =>
          `<a data-lang-inline="${lang}" href="${escapeHtml(item.href)}">${escapeHtml(item.label)}</a>`
      )
      .join('');

  const mobileLinks = (items: NavItem[], lang: 'zh' | 'en') =>
    items
      .map(
        (item) =>
          `<a data-lang-inline="${lang}" href="${escapeHtml(item.href)}">${escapeHtml(item.label)}</a>`
      )
      .join('');

  return `<!DOCTYPE html>
<html lang="${escapeHtml(inp.lang)}">
<head>
<meta charset="utf-8"/>
<meta name="viewport" content="width=device-width, initial-scale=1"/>
<title>${escapeHtml(title)}</title>
${iconLink}
<style>
:root{
  --primary:${inp.color_primary};
  --surface:${inp.color_surface};
  --text:${inp.color_text};
  --muted:color-mix(in srgb,var(--text) 64%,transparent);
  --line:color-mix(in srgb,var(--text) 14%,transparent);
  --card:${vars.cardBg};
  --radius:${vars.radius};
  --section-gap:${vars.sectionGap};
  color-scheme:light;
}
*{box-sizing:border-box;}
html{scroll-behavior:smooth;}
html,body{min-height:100%;margin:0;font-family:system-ui,-apple-system,"Segoe UI",Roboto,"PingFang SC","Microsoft YaHei",sans-serif;background:${vars.backgroundLayer};color:var(--text);}
body{overflow-x:hidden;}
img,svg,video,canvas,iframe{max-width:100%;height:auto;}
button,input,select,textarea{font:inherit;}
a{color:inherit;text-decoration:none;}
p,li,h1,h2,h3{overflow-wrap:anywhere;}
.site-page{position:relative;isolation:isolate;}
.site-page:before{content:"";position:fixed;inset:0;z-index:-1;background:${vars.texture},linear-gradient(90deg,transparent,color-mix(in srgb,var(--primary) 6%,transparent),transparent);pointer-events:none;}
.site-header{position:sticky;top:0;z-index:40;padding:.75rem 1rem;background:color-mix(in srgb,var(--surface) 84%,transparent);backdrop-filter:blur(18px);border-bottom:1px solid var(--line);}
.site-header-inner{width:min(100%,72rem);margin:0 auto;display:flex;align-items:center;justify-content:space-between;gap:.75rem;min-width:0;}
.site-brand{display:inline-flex;align-items:center;gap:.65rem;min-width:0;max-width:min(52vw,20rem);font-weight:850;letter-spacing:0;flex:1 1 auto;}
.site-logo-mark{display:grid;place-items:center;width:2.35rem;height:2.35rem;border-radius:.8rem;background:var(--primary);color:#fff;font-size:.9rem;line-height:1;font-weight:900;box-shadow:0 12px 30px color-mix(in srgb,var(--primary) 28%,transparent);}
.site-logo-img{width:2.35rem;height:2.35rem;border-radius:.8rem;object-fit:cover;border:1px solid var(--line);}
.site-brand .site-logo-mark,.site-brand .site-logo-img{flex:0 0 auto;}
.site-brand [data-lang-inline]{min-width:0;max-width:100%;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;}
.desktop-nav{display:none;align-items:center;justify-content:center;gap:clamp(.45rem,1.2vw,1rem);min-width:0;flex:1 1 auto;color:var(--muted);font-size:.95rem;overflow:hidden;}
.desktop-nav a{min-width:0;max-width:9rem;padding:.5rem .1rem;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;}
.desktop-nav a:hover{color:var(--text);}
.header-actions{display:flex;align-items:center;gap:.5rem;min-width:0;flex:0 0 auto;}
.site-cta,.hero-cta-primary,.hero-cta-secondary{display:inline-flex;align-items:center;justify-content:center;min-height:2.55rem;border-radius:999px;padding:.7rem 1rem;font-weight:800;line-height:1;}
.site-cta,.hero-cta-primary{background:var(--primary);color:#fff;box-shadow:0 14px 32px color-mix(in srgb,var(--primary) 26%,transparent);}
.hero-cta-secondary{border:1px solid var(--line);background:rgba(255,255,255,.7);}
.site-cta{display:none;max-width:10rem;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;}
.lang-switch{display:${hasEnglish ? 'inline-flex' : 'none'};align-items:center;gap:.15rem;padding:.16rem;border:1px solid color-mix(in srgb,var(--text) 10%,transparent);border-radius:999px;background:rgba(255,255,255,.56);backdrop-filter:blur(14px);}
.lang-switch button{min-height:1.9rem;padding:.35rem .55rem;border:0;border-radius:999px;background:transparent;color:color-mix(in srgb,var(--text) 58%,transparent);cursor:pointer;font-size:.82rem;font-weight:800;}
.lang-switch button[aria-pressed="true"]{background:color-mix(in srgb,var(--primary) 12%,white);color:var(--primary);box-shadow:inset 0 0 0 1px color-mix(in srgb,var(--primary) 12%,transparent);}
.menu-button{display:grid;place-items:center;width:2.2rem;height:2.2rem;border:1px solid color-mix(in srgb,var(--text) 10%,transparent);border-radius:999px;background:rgba(255,255,255,.58);color:color-mix(in srgb,var(--text) 76%,transparent);cursor:pointer;backdrop-filter:blur(14px);}
.menu-button span{display:block;width:1.05rem;height:2px;background:currentColor;box-shadow:0 6px 0 currentColor,0 -6px 0 currentColor;}
.mobile-panel{position:fixed;inset:4.5rem 1rem auto 1rem;z-index:50;display:none;padding:.75rem;border:1px solid var(--line);border-radius:1.25rem;background:color-mix(in srgb,var(--surface) 94%,white);box-shadow:0 28px 80px rgba(15,23,42,.18);}
.mobile-panel.is-open{display:block;}
.mobile-panel nav{display:grid;gap:.25rem;}
.mobile-panel a{padding:.85rem .75rem;border-radius:.85rem;color:var(--text);font-weight:750;}
.mobile-panel a:hover{background:rgba(255,255,255,.72);}
.official-hero{width:min(100%,72rem);margin:0 auto;padding:1.2rem 1rem 2rem;}
.official-hero-card{position:relative;overflow:hidden;min-height:${vars.heroMinHeight};display:grid;align-content:center;gap:1.4rem;padding:clamp(1.5rem,7vw,5rem);border:1px solid var(--line);border-radius:var(--radius);background:${vars.hero};box-shadow:0 24px 80px rgba(15,23,42,.08);backdrop-filter:blur(22px);}
.official-hero-card:after{content:"";position:absolute;inset:auto clamp(1rem,6vw,4rem) clamp(1rem,5vw,3rem) auto;width:min(42%,18rem);height:2px;background:linear-gradient(90deg,transparent,var(--primary));opacity:.42;}
.official-hero-grid{display:grid;grid-template-columns:1fr;gap:clamp(1.25rem,5vw,3rem);align-items:center;}
.official-hero-copy{min-width:0;}
.official-hero-media{position:relative;overflow:hidden;min-height:18rem;border-radius:calc(var(--radius) + .5rem);border:1px solid var(--line);background:rgba(255,255,255,.46);box-shadow:0 24px 70px rgba(15,23,42,.12);}
.official-hero-media:after{content:"";position:absolute;inset:0;background:linear-gradient(180deg,rgba(255,255,255,.06),rgba(15,23,42,.22));pointer-events:none;}
.official-hero-media img,.official-hero-media video,.official-hero-media iframe{display:block;width:100%;height:100%;min-height:18rem;object-fit:cover;border:0;border-radius:0;box-shadow:none;}
.official-hero-media .float-card,.official-hero-media .caption{position:absolute;left:1rem;right:1rem;bottom:1rem;padding:1rem;border-radius:calc(var(--radius) - .15rem);background:rgba(255,255,255,.72);border:1px solid rgba(255,255,255,.58);backdrop-filter:blur(18px);box-shadow:0 18px 50px rgba(15,23,42,.16);}
.hero-kicker{margin:0 0 .9rem;color:var(--primary);font-weight:850;letter-spacing:.02em;}
.official-hero h1{max-width:14ch;margin:0;font-size:clamp(2.35rem,11vw,5.8rem);line-height:.95;letter-spacing:0;}
.hero-subtitle{max-width:42rem;margin:1rem 0 0;color:var(--muted);font-size:clamp(1rem,4vw,1.25rem);line-height:1.7;}
.hero-actions{display:flex;flex-wrap:wrap;gap:.75rem;margin-top:1.4rem;}
.site-main{width:min(100%,72rem);margin:0 auto;padding:0 1rem 3rem;}
.site-main :where(*){min-width:0;}
.lang-panel[hidden],[data-lang-inline][hidden]{display:none!important;}
.site-main :where(section){scroll-margin-top:5.75rem;}
.route-page[hidden]{display:none!important;}
.route-page-head{padding:1.25rem 0 1rem;}
.route-page-head h1{margin:.35rem 0 0;font-size:clamp(2rem,9vw,4rem);line-height:1;}
.route-page-kicker{margin:0;color:var(--primary);font-weight:850;}
.desktop-nav a.is-active,.mobile-panel a.is-active{color:var(--primary);}
.site-main :where(.section,section){max-width:100%;padding:var(--section-gap) 0;border-top:1px solid color-mix(in srgb,var(--text) 8%,transparent);}
.site-main :where(.section:first-child,section:first-child){border-top:0;padding-top:clamp(1rem,4vw,2.5rem);}
.site-main :where(.section-head){max-width:48rem;margin:0 0 clamp(1.25rem,4vw,2.25rem);}
.site-main :where(.section-head.center,.center){margin-left:auto;margin-right:auto;text-align:center;}
.site-main :where(.eyebrow){margin:0 0 .7rem;color:var(--primary);font-size:.78rem;font-weight:900;letter-spacing:.12em;text-transform:uppercase;}
.site-main :where(h2){margin:0 0 .85rem;font-size:clamp(1.75rem,7vw,3.5rem);line-height:1.02;letter-spacing:0;}
.site-main :where(h3){margin:0 0 .55rem;font-size:clamp(1.08rem,4vw,1.35rem);line-height:1.15;letter-spacing:0;}
.site-main :where(p){margin:.5rem 0;color:var(--muted);line-height:1.72;}
.site-main :where(strong){color:var(--text);}
.site-main :where(.grid,.gallery,.media-grid){display:grid;grid-template-columns:1fr;gap:1rem;min-width:0;}
.site-main :where(.grid > *,.gallery > *,.media-grid > *){min-width:0;}
.site-main :where(.grid.two){grid-template-columns:1fr;}
.site-main :where(.card,article,.panel,.feature,.price-card,.case-card,.service-card,.story-card){max-width:100%;border:1px solid var(--line);border-radius:var(--radius);background:var(--card);padding:clamp(1rem,4vw,1.6rem);box-shadow:0 18px 55px rgba(15,23,42,.07);backdrop-filter:blur(16px);}
.site-main :where(.card:hover,.case-card:hover,.price-card:hover){transform:translateY(-2px);box-shadow:0 24px 70px rgba(15,23,42,.1);}
.site-main :where(.soft){margin-left:calc(50% - 50vw);margin-right:calc(50% - 50vw);padding-left:max(1rem,calc(50vw - 36rem));padding-right:max(1rem,calc(50vw - 36rem));background:color-mix(in srgb,var(--primary) 7%,transparent);border-top:1px solid var(--line);border-bottom:1px solid var(--line);}
.site-main :where(.split){display:grid;grid-template-columns:1fr;gap:1.25rem;align-items:center;}
.site-main :where(.highlight){background:linear-gradient(135deg,var(--primary),color-mix(in srgb,var(--primary) 62%,#111827));color:#fff;border-color:transparent;}
.site-main :where(.highlight p,.highlight .eyebrow){color:rgba(255,255,255,.78);}
.site-main :where(.badge,.pill){display:inline-flex;align-items:center;width:fit-content;max-width:100%;min-height:1.9rem;padding:.35rem .65rem;border-radius:999px;background:color-mix(in srgb,var(--primary) 12%,white);color:var(--primary);font-size:.78rem;font-weight:900;white-space:normal;overflow-wrap:anywhere;}
.site-main :where(.button,a.button){display:inline-flex;align-items:center;justify-content:center;max-width:100%;min-height:2.75rem;border-radius:999px;padding:.75rem 1.05rem;background:var(--primary);color:#fff;font-weight:850;text-align:center;white-space:normal;overflow-wrap:anywhere;box-shadow:0 14px 32px color-mix(in srgb,var(--primary) 22%,transparent);}
.site-main :where(.stats){display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:.75rem;}
.site-main :where(.stat){padding:1rem;border-radius:var(--radius);background:rgba(255,255,255,.62);border:1px solid var(--line);}
.site-main :where(.stat strong){display:block;font-size:clamp(1.6rem,7vw,3rem);line-height:1;color:var(--primary);}
.site-main :where(.media,.visual,.image-wrap,.travel-visual,.image-tile){position:relative;overflow:hidden;border-radius:var(--radius);border:1px solid var(--line);background:rgba(255,255,255,.5);box-shadow:0 18px 55px rgba(15,23,42,.08);}
.site-main :where(.visual:after,.travel-visual:after,.image-tile:after){content:"";position:absolute;inset:0;background:linear-gradient(180deg,rgba(255,255,255,.04),rgba(15,23,42,.24));pointer-events:none;}
.site-main :where(.media img,.visual img,.image-wrap img,.gallery img,.travel-visual img,.image-tile img){display:block;width:100%;height:100%;object-fit:cover;}
.site-main :where(.visual,.travel-visual){min-height:clamp(18rem,52vw,35rem);}
.site-main :where(.image-tile){aspect-ratio:4/3;}
.site-main :where(video,iframe){display:block;width:100%;max-width:100%;border:0;border-radius:var(--radius);background:#020617;box-shadow:0 18px 55px rgba(15,23,42,.1);}
.site-main :where(pre,code,kbd,samp){max-width:100%;white-space:pre-wrap;overflow-wrap:anywhere;}
.site-main :where(pre){overflow:auto;}
.site-main :where(table){width:100%;max-width:100%;table-layout:fixed;border-collapse:collapse;}
.site-main :where(th,td){overflow-wrap:anywhere;word-break:break-word;}
.site-main :where(video){height:auto;}
.site-main :where(.video-card){overflow:hidden;border:1px solid var(--line);border-radius:var(--radius);background:var(--card);box-shadow:0 18px 55px rgba(15,23,42,.08);}
.site-main :where(.video-card video,.video-card iframe){border-radius:0;box-shadow:none;}
.site-main :where(.video-card .caption){padding:1rem;color:var(--muted);line-height:1.6;}
.site-main :where(.gallery){grid-template-columns:repeat(2,minmax(0,1fr));}
.site-main :where(.gallery img){aspect-ratio:4/3;border-radius:var(--radius);border:1px solid var(--line);box-shadow:0 14px 38px rgba(15,23,42,.08);}
.site-main :where(.contact-card){display:flex;flex-direction:column;gap:1rem;align-items:flex-start;justify-content:space-between;border:1px solid var(--line);border-radius:var(--radius);background:linear-gradient(135deg,var(--card),rgba(255,255,255,.5));padding:clamp(1.2rem,5vw,2rem);box-shadow:0 20px 65px rgba(15,23,42,.08);backdrop-filter:blur(16px);}
.site-main :where(.feature-banner,.cta-panel,.banner){padding:clamp(1.35rem,6vw,3rem);border-radius:calc(var(--radius) + .5rem);background:linear-gradient(135deg,var(--text),color-mix(in srgb,var(--primary) 58%,var(--text)));color:#fff;box-shadow:0 26px 78px rgba(15,23,42,.16);}
.site-main :where(.feature-banner p,.cta-panel p,.banner p){color:rgba(255,255,255,.76);}
.site-main :where(.feature-banner .eyebrow,.cta-panel .eyebrow,.banner .eyebrow){color:rgba(255,255,255,.72);}
.site-main :where(.feature-banner .button,.cta-panel .button,.banner .button,.banner a){background:#fff;color:var(--text);box-shadow:0 16px 34px rgba(0,0,0,.14);}
.site-main :where(.glass,.glass-card,.float-card){background:rgba(255,255,255,.64);border:1px solid rgba(255,255,255,.58);backdrop-filter:blur(20px);box-shadow:0 18px 52px rgba(15,23,42,.12);}
.site-main :where(.glass-strip){display:grid;grid-template-columns:1fr;gap:.75rem;padding:clamp(1rem,4vw,1.5rem);border-radius:calc(var(--radius) + .35rem);background:rgba(255,255,255,.5);border:1px solid rgba(255,255,255,.56);backdrop-filter:blur(22px);box-shadow:0 22px 65px rgba(15,23,42,.1);}
.site-main :where(.glass-strip > *){min-width:0;}
.site-main :where(.float-card){border-radius:calc(var(--radius) - .1rem);padding:1rem;}
.site-main :where(.mini-link){display:inline-flex;align-items:center;gap:.4rem;width:fit-content;max-width:100%;min-height:2.25rem;padding:.45rem .75rem;border-radius:999px;background:rgba(255,255,255,.72);border:1px solid var(--line);color:var(--text);font-weight:850;white-space:normal;overflow-wrap:anywhere;box-shadow:0 10px 28px rgba(15,23,42,.08);}
.site-main :where(.route-line){display:grid;grid-template-columns:1fr;gap:.75rem;}
.site-main :where(.season-hero){position:relative;overflow:hidden;border-radius:calc(var(--radius) + .45rem);padding:clamp(1.5rem,6vw,3.5rem);background:linear-gradient(135deg,rgba(255,255,255,.82),color-mix(in srgb,var(--primary) 12%,white));border:1px solid var(--line);box-shadow:0 24px 74px rgba(15,23,42,.1);}
.site-main :where(.product-card){display:grid;align-content:start;gap:.4rem;min-height:100%;}
.site-main :where(.product-img){overflow:hidden;aspect-ratio:4/3;border-radius:calc(var(--radius) - .15rem);margin-bottom:.85rem;background:color-mix(in srgb,var(--primary) 9%,white);}
.site-main :where(.product-img img){width:100%;height:100%;object-fit:cover;display:block;}
.site-main :where(.faq details){border-top:1px solid var(--line);padding:1rem 0;}
.site-main :where(.faq summary){cursor:pointer;font-weight:850;}
.site-footer{border-top:1px solid var(--line);padding:1.5rem 1rem 2rem;color:var(--muted);}
.site-footer-inner{width:min(100%,72rem);margin:0 auto;display:flex;flex-direction:column;gap:.7rem;}
@media (min-width:760px){
  .desktop-nav{display:flex;}
  .site-cta{display:inline-flex;}
  .menu-button{display:none;}
  .site-brand{max-width:20rem;}
  .lang-switch button{min-height:2.05rem;padding:.4rem .65rem;font-size:.88rem;}
  .menu-button{width:2.45rem;height:2.45rem;}
  .official-hero{padding:1.75rem 1rem 3rem;}
  .official-hero-grid.has-media{grid-template-columns:minmax(0,1fr) minmax(22rem,.86fr);}
  .site-main :where(.grid){grid-template-columns:repeat(3,minmax(0,1fr));}
  .site-main :where(.grid.two){grid-template-columns:repeat(2,minmax(0,1fr));}
  .site-main :where(.grid.four){grid-template-columns:repeat(4,minmax(0,1fr));}
  .site-main :where(.gallery){grid-template-columns:repeat(4,minmax(0,1fr));}
  .site-main :where(.media-grid){grid-template-columns:repeat(2,minmax(0,1fr));}
  .site-main :where(.split){grid-template-columns:minmax(0,1.05fr) minmax(18rem,.95fr);}
  .site-main :where(.contact-card){flex-direction:row;align-items:center;}
  .site-main :where(.stats){grid-template-columns:repeat(4,minmax(0,1fr));}
  .site-main :where(.glass-strip){grid-template-columns:repeat(3,minmax(0,1fr));}
  .site-main :where(.route-line){grid-template-columns:repeat(4,minmax(0,1fr));}
  .site-footer-inner{flex-direction:row;align-items:center;justify-content:space-between;}
}
</style>
</head>
<body>
<div class="site-page" id="top">
<header class="site-header">
  <div class="site-header-inner">
    <a class="site-brand" href="#top" aria-label="${escapeHtml(brand)}">
      ${logoMarkup(inp, brand)}
      <span data-lang-inline="zh">${escapeHtml(brand)}</span>
      ${hasEnglish ? `<span data-lang-inline="en" hidden>${escapeHtml(brandEn)}</span>` : ''}
    </a>
    <nav class="desktop-nav" aria-label="Primary navigation">
      ${navLinks(zhNav, 'zh')}
      ${hasEnglish ? navLinks(enNav, 'en').replaceAll('data-lang-inline="en"', 'data-lang-inline="en" hidden') : ''}
    </nav>
    <div class="header-actions">
      <div class="lang-switch" aria-label="Language switch">
        <button type="button" data-lang-btn="zh" aria-pressed="${defaultLang === 'zh' ? 'true' : 'false'}">中文</button>
        <button type="button" data-lang-btn="en" aria-pressed="${defaultLang === 'en' ? 'true' : 'false'}">EN</button>
      </div>
      ${optionalAnchor(inp.top_cta_label, inp.top_cta_href, 'site-cta', hasEnglish ? 'data-lang-inline="zh"' : '')}
      ${hasEnglish ? optionalAnchor(inp.top_cta_label_en, inp.top_cta_href, 'site-cta', 'data-lang-inline="en" hidden') : ''}
      <button class="menu-button" type="button" aria-expanded="false" aria-controls="mobile-menu" aria-label="Open navigation"><span></span></button>
    </div>
  </div>
</header>
<div class="mobile-panel" id="mobile-menu">
  <nav aria-label="Mobile navigation">
    ${mobileLinks(zhNav, 'zh')}
    ${hasEnglish ? mobileLinks(enNav, 'en').replaceAll('data-lang-inline="en"', 'data-lang-inline="en" hidden') : ''}
  </nav>
</div>
<section class="official-hero route-page" data-route="/" aria-labelledby="site-hero-title">
  <div class="official-hero-card">
    <div class="official-hero-grid${heroMedia ? ' has-media' : ''}">
      <div class="official-hero-copy">
        <div class="lang-panel" data-lang-panel="zh">
          ${inp.hero_kicker?.trim() ? `<p class="hero-kicker">${escapeHtml(inp.hero_kicker.trim())}</p>` : ''}
          <h1 id="site-hero-title">${escapeHtml(inp.hero_title.trim())}</h1>
          <p class="hero-subtitle">${escapeHtml(inp.hero_subtitle.trim())}</p>
          <div class="hero-actions">
            ${optionalAnchor(inp.hero_primary_label, inp.hero_primary_href, 'hero-cta-primary')}
            ${optionalAnchor(inp.hero_secondary_label, inp.hero_secondary_href, 'hero-cta-secondary')}
          </div>
        </div>
        ${
          hasEnglish
            ? `<div class="lang-panel" data-lang-panel="en" hidden>
          ${inp.hero_kicker_en?.trim() ? `<p class="hero-kicker">${escapeHtml(inp.hero_kicker_en.trim())}</p>` : ''}
          <h1>${escapeHtml(inp.hero_title_en!.trim())}</h1>
          <p class="hero-subtitle">${escapeHtml(inp.hero_subtitle_en?.trim() || inp.hero_subtitle.trim())}</p>
          <div class="hero-actions">
            ${optionalAnchor(inp.hero_primary_label_en, inp.hero_primary_href, 'hero-cta-primary')}
            ${optionalAnchor(inp.hero_secondary_label_en, inp.hero_secondary_href, 'hero-cta-secondary')}
          </div>
        </div>`
            : ''
        }
      </div>
      ${heroMedia ? `<div class="official-hero-media">${heroMedia}</div>` : ''}
    </div>
  </div>
</section>
<main class="site-main">
  <div class="route-page" data-route="/">
    <div class="lang-panel" data-lang-panel="zh">
      ${inp.main_sections_html}
    </div>
    ${
      hasEnglish
        ? `<div class="lang-panel" data-lang-panel="en" hidden>
      ${inp.main_sections_html_en}
    </div>`
        : ''
    }
  </div>
  ${subPages
    .map(
      (page) => `<article class="route-page" data-route="/${escapeHtml(page.path)}" hidden>
    <div class="route-page-head">
      <p class="route-page-kicker" data-lang-inline="zh">${escapeHtml(brand)}</p>
      ${hasEnglish ? `<p class="route-page-kicker" data-lang-inline="en" hidden>${escapeHtml(brandEn)}</p>` : ''}
      <h1 data-lang-inline="zh">${escapeHtml(page.title)}</h1>
      ${hasEnglish ? `<h1 data-lang-inline="en" hidden>${escapeHtml(page.title_en || page.title)}</h1>` : ''}
    </div>
    <div class="lang-panel" data-lang-panel="zh">
      ${page.html}
    </div>
    ${
      hasEnglish
        ? `<div class="lang-panel" data-lang-panel="en" hidden>
      ${page.html_en || page.html}
    </div>`
        : ''
    }
  </article>`
    )
    .join('\n')}
</main>
<footer class="site-footer" id="contact">
  <div class="site-footer-inner">
    <strong data-lang-inline="zh">${escapeHtml(brand)}</strong>
    ${hasEnglish ? `<strong data-lang-inline="en" hidden>${escapeHtml(brandEn)}</strong>` : ''}
    <span data-lang-inline="zh">${escapeHtml(inp.footer_note?.trim() || '© 2026 版权所有')}</span>
    ${hasEnglish ? `<span data-lang-inline="en" hidden>${escapeHtml(inp.footer_note_en?.trim() || '© 2026 All rights reserved')}</span>` : ''}
  </div>
</footer>
</div>
<script>
(function(){
  var root = document.documentElement;
  var menuButton = document.querySelector('.menu-button');
  var mobileMenu = document.querySelector('#mobile-menu');
  var langButtons = document.querySelectorAll('[data-lang-btn]');
  var panels = document.querySelectorAll('[data-lang-panel]');
  var inlineNodes = document.querySelectorAll('[data-lang-inline]');
  var routePages = document.querySelectorAll('[data-route]');
  var routeLinks = document.querySelectorAll('a[href^="#/"]');
  function setMenu(open){
    if (!menuButton || !mobileMenu) return;
    menuButton.setAttribute('aria-expanded', open ? 'true' : 'false');
    mobileMenu.classList.toggle('is-open', open);
  }
  function setLang(lang){
    root.lang = lang === 'en' ? 'en' : 'zh-CN';
    langButtons.forEach(function(btn){ btn.setAttribute('aria-pressed', btn.getAttribute('data-lang-btn') === lang ? 'true' : 'false'); });
    panels.forEach(function(panel){ panel.hidden = panel.getAttribute('data-lang-panel') !== lang; });
    inlineNodes.forEach(function(node){ node.hidden = node.getAttribute('data-lang-inline') !== lang; });
    setMenu(false);
  }
  function currentRoute(){
    var hash = window.location.hash || '#/';
    if (hash.indexOf('#/') !== 0) return '/';
    var path = hash.slice(2).replace(/^\\/+|\\/+$/g, '');
    return path ? '/' + path : '/';
  }
  function setRoute(route){
    var found = false;
    routePages.forEach(function(page){
      var active = page.getAttribute('data-route') === route;
      page.hidden = !active;
      if (active) found = true;
    });
    if (!found) {
      route = '/';
      routePages.forEach(function(page){ page.hidden = page.getAttribute('data-route') !== '/'; });
    }
    routeLinks.forEach(function(link){
      var href = link.getAttribute('href') || '#/';
      var linkRoute = href === '#/' ? '/' : '/' + href.slice(2).replace(/^\\/+|\\/+$/g, '');
      link.classList.toggle('is-active', linkRoute === route);
    });
    setMenu(false);
  }
  if (menuButton) menuButton.addEventListener('click', function(){ setMenu(menuButton.getAttribute('aria-expanded') !== 'true'); });
  if (mobileMenu) mobileMenu.addEventListener('click', function(event){ if (event.target && event.target.tagName === 'A') setMenu(false); });
  langButtons.forEach(function(btn){ btn.addEventListener('click', function(){ setLang(btn.getAttribute('data-lang-btn') || 'zh'); }); });
  window.addEventListener('hashchange', function(){ setRoute(currentRoute()); });
  setLang('${defaultLang}');
  setRoute(currentRoute());
})();
</script>
</body>
</html>`;
}
