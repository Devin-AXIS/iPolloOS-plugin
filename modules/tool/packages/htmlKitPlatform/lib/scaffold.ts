import { faviconDataUrlFromEmoji } from './favicon';
import { escapeHtml, sanitizeHttpUrl } from './escape';

export type ThemedPageInput = {
  lang: 'zh-CN' | 'en';
  page_title: string;
  heading_h1: string;
  page_title_en?: string;
  heading_h1_en?: string;
  color_primary: string;
  color_surface: string;
  color_text: string;
  favicon_mode: 'none' | 'url' | 'emoji';
  favicon_url?: string;
  favicon_emoji?: string;
  /** 已清洗、将插入 `<h1>` 之下的 HTML（可含标签，勿含 script） */
  main_inner_html: string;
  main_inner_html_en?: string;
  include_lucide_cdn_hint: boolean;
};

function buildIconLink(
  inp: Pick<ThemedPageInput, 'favicon_mode' | 'favicon_url' | 'favicon_emoji'>
): string {
  if (inp.favicon_mode === 'url') {
    const u = sanitizeHttpUrl(inp.favicon_url ?? '');
    if (!u) return '';
    return `<link rel="icon" href="${escapeHtml(u)}" />`;
  }
  if (inp.favicon_mode === 'emoji') {
    const href = faviconDataUrlFromEmoji(inp.favicon_emoji ?? '📄');
    return `<link rel="icon" href="${escapeHtml(href)}" />`;
  }
  return '';
}

/** 单文件 HTML：与 page_init 同款骨架与主题变量 */
export function buildThemedSingleFileHtml(inp: ThemedPageInput): string {
  const title = inp.page_title.trim();
  const h1 = inp.heading_h1.trim() || title;
  const titleEn = inp.page_title_en?.trim();
  const h1En = inp.heading_h1_en?.trim() || titleEn;
  const bodyEn = inp.main_inner_html_en?.trim();
  const hasLanguageSwitch = Boolean(titleEn && h1En && bodyEn);
  const iconLink = buildIconLink(inp);
  const lucideHint = inp.include_lucide_cdn_hint
    ? '\n<!-- 图标：也可用外链 SVG sprite 或 lucide-static；生产环境请改用自有 CDN/hash。 -->\n'
    : '';

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
  color-scheme: light;
}
html,body{height:100%;margin:0;font-family:system-ui,-apple-system,"Segoe UI",Roboto,"PingFang SC","Microsoft YaHei",sans-serif;background:var(--surface);color:var(--text);}
*{box-sizing:border-box;}
body{overflow-x:hidden;}
img,svg,video,canvas,iframe{max-width:100%;height:auto;}
button,input,select,textarea{font:inherit;}
main{width:min(100%,72rem);margin:0 auto;padding:1rem;line-height:1.65;}
.page-shell{display:grid;gap:1rem;}
.page-head{display:flex;align-items:flex-start;justify-content:space-between;gap:.75rem;flex-wrap:wrap;}
h1{font-size:clamp(1.75rem,8vw,2.75rem);line-height:1.08;font-weight:750;color:var(--primary);margin:0 0 1rem;letter-spacing:0;}
a{color:var(--primary);}
p,li{overflow-wrap:anywhere;}
section,.card,article{max-width:100%;}
.lang-switch{display:inline-flex;align-items:center;gap:.25rem;padding:.25rem;border:1px solid color-mix(in srgb,var(--primary) 24%,transparent);border-radius:999px;background:rgba(255,255,255,.78);box-shadow:0 10px 30px rgba(15,23,42,.08);}
.lang-switch button{min-height:2.25rem;padding:.45rem .75rem;border:0;border-radius:999px;background:transparent;color:var(--text);cursor:pointer;}
.lang-switch button[aria-pressed="true"]{background:var(--primary);color:#fff;}
.lang-panel[hidden]{display:none!important;}
@media (min-width:768px){main{padding:2rem;}.page-shell{gap:1.5rem;}}
@media (min-width:1024px){main{padding:3rem 2rem;}}
</style>
${lucideHint}</head>
<body>
<main>
<div class="page-shell">
<div class="page-head">
<h1 data-lang-title="zh">${escapeHtml(h1)}</h1>
${
  hasLanguageSwitch
    ? `<h1 data-lang-title="en" hidden>${escapeHtml(h1En!)}</h1>
<div class="lang-switch" aria-label="Language switch">
<button type="button" data-lang-btn="zh" aria-pressed="true">中文</button>
<button type="button" data-lang-btn="en" aria-pressed="false">EN</button>
</div>`
    : ''
}
</div>
<div class="lang-panel" data-lang-panel="zh">
${inp.main_inner_html}
</div>
${
  hasLanguageSwitch
    ? `<div class="lang-panel" data-lang-panel="en" hidden>
${bodyEn}
</div>`
    : ''
}
</div>
</main>
${
  hasLanguageSwitch
    ? `<script>
(function(){
  var root = document.documentElement;
  var buttons = document.querySelectorAll('[data-lang-btn]');
  var panels = document.querySelectorAll('[data-lang-panel]');
  var titles = document.querySelectorAll('[data-lang-title]');
  function setLang(lang){
    root.lang = lang === 'en' ? 'en' : 'zh-CN';
    buttons.forEach(function(btn){ btn.setAttribute('aria-pressed', btn.getAttribute('data-lang-btn') === lang ? 'true' : 'false'); });
    panels.forEach(function(panel){ panel.hidden = panel.getAttribute('data-lang-panel') !== lang; });
    titles.forEach(function(title){ title.hidden = title.getAttribute('data-lang-title') !== lang; });
  }
  buttons.forEach(function(btn){ btn.addEventListener('click', function(){ setLang(btn.getAttribute('data-lang-btn') || 'zh'); }); });
})();
</script>`
    : ''
}
</body>
</html>`;
}
