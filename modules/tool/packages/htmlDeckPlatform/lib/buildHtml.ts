import type { DeckState, SlideSpec } from './types';
import { escapeHtml, sanitizeImageUrl } from './escape';
import { buildDeckStageScript } from './deckStageRuntime';
import { buildInlineChart } from './chart';
import { BULLET_ICON_IDS, iconHtml } from './icons';
import { resolveDeckTheme, themeCssVars } from './themes';

const FONT_HREF =
  'https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;600&family=Lora:ital,wght@0,400;0,600;1,400;1,600&family=Noto+Sans+SC:wght@400;500;700&family=Noto+Serif+SC:wght@400;600;900&display=swap';

function applyTitleHighlight(title: string, phrase: string | undefined): string {
  const t = escapeHtml(title);
  const p = phrase?.trim();
  if (!p) return t;
  const pe = escapeHtml(p);
  const i = title.indexOf(p);
  if (i < 0) return t;
  const a = escapeHtml(title.slice(0, i));
  const b = escapeHtml(title.slice(i + p.length));
  return `${a}<span class="hs-em">${pe}</span>${b}`;
}

function imgBlock(url: string, alt?: string, cls = ''): string {
  const safe = sanitizeImageUrl(url);
  if (!safe) return '';
  return `<img class="hs-img ${cls}" src="${escapeHtml(safe)}" alt="${escapeHtml(alt ?? '')}" loading="lazy" />`;
}

function masthead(state: DeckState): string {
  const logo = state.meta.logo_url?.trim()
    ? `<img class="hs-logo" src="${escapeHtml(sanitizeImageUrl(state.meta.logo_url!)!)}" alt="" />`
    : `<span class="hs-logo-ph"> </span>`;
  const right = state.meta.masthead_right?.trim()
    ? `<span class="hs-mh-meta">${escapeHtml(state.meta.masthead_right.trim())}</span>`
    : '';
  return `<header class="hs-mh" role="banner">
    <div class="hs-mh-L">${logo}</div>
    <div class="hs-mh-R">${right}</div>
  </header>
  <div class="hs-mh-rule" aria-hidden="true"></div>`;
}

function footerBar(slide: SlideSpec, idx: number, total: number): string {
  const left = slide.footer_left?.trim() ? escapeHtml(slide.footer_left.trim()) : '\u00a0';
  return `<footer class="hs-ft" role="contentinfo">
    <span class="hs-ft-L">${left}</span>
    <span class="hs-ft-R">${idx + 1} / ${total}</span>
  </footer>`;
}

function kickerBlock(k: string | undefined, cSecondary: string): string {
  if (!k?.trim()) return '';
  const t = escapeHtml(k.trim());
  return `<div class="hs-kicker">
    <span class="hs-kicker-bar" style="background:${escapeHtml(cSecondary)}"></span>
    <span class="hs-kicker-txt">${t}</span>
  </div>`;
}

function themeIcons(state: DeckState): string[] {
  return [...resolveDeckTheme(state.meta.theme_id).colors.icon];
}

function bodyBullets(state: DeckState, bullets: string[] | undefined): string {
  if (!bullets?.length) return '';
  const icons = themeIcons(state);
  const items = bullets
    .map((b) => b.trim())
    .filter(Boolean)
    .map((b, i) => {
      const name = BULLET_ICON_IDS[i % BULLET_ICON_IDS.length]!;
      const color = icons[i % icons.length]!;
      return `<li>${iconHtml(name, color)}<span>${escapeHtml(b)}</span></li>`;
    })
    .join('');
  return items ? `<ul class="hs-bullets">${items}</ul>` : '';
}

function compactList(state: DeckState, items: string[] | undefined, cls = 'hs-bullets'): string {
  if (!items?.length) return '';
  const icons = themeIcons(state);
  const html = items
    .map((item) => item.trim())
    .filter(Boolean)
    .map((item, i) => {
      const name = BULLET_ICON_IDS[i % BULLET_ICON_IDS.length]!;
      const color = icons[i % icons.length]!;
      return `<li>${iconHtml(name, color, 20)}<span>${escapeHtml(item)}</span></li>`;
    })
    .join('');
  return html ? `<ul class="${cls}">${html}</ul>` : '';
}

function safeFrameUrl(url: string | undefined): string | undefined {
  const u = url?.trim();
  if (!u) return undefined;
  if (!/^https?:\/\//i.test(u)) return undefined;
  return u;
}

function chartEmbed(
  html: string | undefined,
  url: string | undefined,
  empty = '未提供 chart_embed_html'
): string {
  const raw = html?.trim();
  if (!raw) return `<div class="hs-chart-empty">${escapeHtml(empty)}</div>`;
  return `<div class="hs-chart-embed">${raw}</div>`;
}

function chartSlot(
  state: DeckState,
  slide: SlideSpec,
  html: string | undefined,
  url: string | undefined,
  slot: string,
  empty = '未提供 chart_embed_html'
): string {
  if (slide.chart_data?.trim()) {
    return `<div class="hs-chart-embed">${buildInlineChart({
      state,
      chartType:
        slot === 'secondary' ? slide.secondary_chart_type ?? slide.chart_type : slide.chart_type,
      chartData:
        slot === 'secondary' ? slide.secondary_chart_data ?? slide.chart_data : slide.chart_data,
      palette: 'theme',
      slot
    })}</div>`;
  }
  const raw = html?.trim();
  if (raw) return chartEmbed(raw, undefined, empty);
  const frameUrl = safeFrameUrl(url);
  if (!frameUrl) return `<div class="hs-chart-empty">${escapeHtml(empty)}</div>`;
  return `<div class="hs-chart-embed hs-chart-embed--frame"><iframe src="${escapeHtml(frameUrl)}" title="chart" loading="lazy"></iframe></div>`;
}

function chartCaption(text: string | undefined): string {
  return text?.trim() ? `<p class="hs-chart-caption">${escapeHtml(text.trim())}</p>` : '';
}

function slideShell(
  state: DeckState,
  slide: SlideSpec,
  idx: number,
  total: number,
  inner: string,
  modClass = ''
): string {
  const { theme } = state;
  return `<section class="hs-page ${modClass}" data-screen-label="${String(idx + 1).padStart(2, '0')}">
  <div class="hs-canvas" style="--hs-secondary:${theme.brand_secondary};--hs-tertiary:${theme.brand_tertiary}">
    ${masthead(state)}
    <main class="hs-main">${inner}</main>
    ${footerBar(slide, idx, total)}
  </div>
</section>`;
}

function renderSlide(state: DeckState, slide: SlideSpec, idx: number, total: number): string {
  const { theme } = state;
  const titleRaw = slide.title?.trim() ?? '';
  const h1 = titleRaw
    ? `<h1 class="hs-h1">${applyTitleHighlight(titleRaw, slide.title_highlight)}</h1>`
    : '';
  const subEn = slide.subtitle_en?.trim()
    ? `<p class="hs-suben">${escapeHtml(slide.subtitle_en.trim())}</p>`
    : '';
  const kick = kickerBlock(slide.kicker, theme.brand_secondary);

  switch (slide.layout) {
    case 'cover': {
      const sub = state.meta.subtitle?.trim()
        ? `<p class="hs-cover-sub">${escapeHtml(state.meta.subtitle.trim())}</p>`
        : '';
      const inner = `
        <div class="hs-cover">
          ${kick || `<div class="hs-kicker hs-kicker--ghost"><span class="hs-kicker-bar" style="background:${escapeHtml(theme.brand_secondary)}"></span><span class="hs-kicker-txt">${escapeHtml(state.meta.title)}</span></div>`}
          <h1 class="hs-h1 hs-h1--cover">${titleRaw ? applyTitleHighlight(titleRaw, slide.title_highlight) : escapeHtml(state.meta.title)}</h1>
          ${subEn}
          ${sub}
          <div class="hs-cover-pillar" style="background:linear-gradient(180deg, ${escapeHtml(theme.brand_primary)} 0%, ${escapeHtml(theme.brand_tertiary)} 100%)"></div>
        </div>`;
      return slideShell(state, slide, idx, total, inner, 'hs-mod-cover');
    }

    case 'content': {
      const inner = `
        ${kick}
        ${h1 || '<h1 class="hs-h1">—</h1>'}
        ${subEn}
        <div class="hs-rule"></div>
        ${bodyBullets(state, slide.bullets)}`;
      return slideShell(state, slide, idx, total, inner);
    }

    case 'section': {
      const ic = themeIcons(state)[0]!;
      const inner = `<div class="hs-section">
        ${kick}
        <div class="hs-section-row">
          ${iconHtml('layers', ic, 56)}
          <div class="hs-section-copy">
            <div class="hs-section-num">${String(idx + 1).padStart(2, '0')}</div>
            ${h1 || '<h1 class="hs-h1">—</h1>'}
            ${subEn}
          </div>
        </div>
      </div>`;
      return slideShell(state, slide, idx, total, inner, 'hs-mod-section');
    }

    case 'big_number': {
      const metric = escapeHtml(slide.metric_value?.trim() || String(idx + 1).padStart(2, '0'));
      const label = slide.metric_label?.trim()
        ? `<p class="hs-metric-label">${escapeHtml(slide.metric_label.trim())}</p>`
        : '';
      const inner = `<div class="hs-metric">
        <div class="hs-metric-main">
          ${kick}
          <div class="hs-metric-value">${metric}</div>
          ${label}
        </div>
        <div class="hs-metric-copy">
          ${h1 || '<h1 class="hs-h1">—</h1>'}
          <div class="hs-rule"></div>
          ${bodyBullets(state, slide.bullets)}
        </div>
      </div>`;
      return slideShell(state, slide, idx, total, inner);
    }

    case 'comparison': {
      const inner = `${kick}${h1 || '<h1 class="hs-h1">—</h1>'}
        <div class="hs-compare">
          <div class="hs-compare-col">
            <h2>${escapeHtml(slide.left_title?.trim() || 'A')}</h2>
            ${compactList(state, slide.left_bullets ?? slide.bullets?.slice(0, 3), 'hs-compact-list')}
          </div>
          <div class="hs-compare-col hs-compare-col--accent">
            <h2>${escapeHtml(slide.right_title?.trim() || 'B')}</h2>
            ${compactList(state, slide.right_bullets ?? slide.bullets?.slice(3, 6), 'hs-compact-list')}
          </div>
        </div>`;
      return slideShell(state, slide, idx, total, inner);
    }

    case 'timeline': {
      const items = (slide.timeline_items?.length ? slide.timeline_items : slide.bullets ?? [])
        .slice(0, 6)
        .map(
          (item, i) => `<li>
            <span class="hs-time-dot">${String(i + 1).padStart(2, '0')}</span>
            <span class="hs-time-copy">${escapeHtml(item)}</span>
          </li>`
        )
        .join('');
      const inner = `${kick}${h1 || '<h1 class="hs-h1">—</h1>'}
        <ol class="hs-timeline">${items}</ol>`;
      return slideShell(state, slide, idx, total, inner);
    }

    case 'matrix': {
      const cells = (
        slide.matrix_items?.length
          ? slide.matrix_items
          : (slide.bullets ?? []).slice(0, 4).map((b, i) => ({ title: `0${i + 1}`, body: b }))
      )
        .slice(0, 4)
        .map(
          (item) => `<article class="hs-matrix-cell">
            <h2>${escapeHtml(item.title)}</h2>
            ${item.body ? `<p>${escapeHtml(item.body)}</p>` : ''}
          </article>`
        )
        .join('');
      const inner = `${kick}${h1 || '<h1 class="hs-h1">—</h1>'}
        <div class="hs-matrix">${cells}</div>`;
      return slideShell(state, slide, idx, total, inner);
    }

    case 'chart_focus': {
      const inner = `<div class="hs-chart-focus">
        <div class="hs-chart-headline">
          ${kick}
          ${h1 || '<h1 class="hs-h1">—</h1>'}
          ${subEn}
        </div>
        <div class="hs-chart-stage hs-chart-stage--focus">
          ${chartSlot(state, slide, slide.chart_html, slide.chart_page_url, `s${idx}-primary`)}
          ${chartCaption(slide.chart_caption)}
        </div>
      </div>`;
      return slideShell(state, slide, idx, total, inner, 'hs-mod-chart');
    }

    case 'chart_story': {
      const inner = `<div class="hs-chart-story">
        <aside class="hs-chart-narrative">
          ${kick}
          ${h1 || '<h1 class="hs-h1">—</h1>'}
          ${subEn}
          <div class="hs-rule"></div>
          ${bodyBullets(state, slide.bullets)}
        </aside>
        <section class="hs-chart-stage hs-chart-stage--story">
          ${chartSlot(state, slide, slide.chart_html, slide.chart_page_url, `s${idx}-primary`)}
          ${chartCaption(slide.chart_caption)}
        </section>
      </div>`;
      return slideShell(state, slide, idx, total, inner, 'hs-mod-chart');
    }

    case 'chart_compare': {
      const leftTitle = slide.left_title?.trim() || 'A';
      const rightTitle = slide.right_title?.trim() || 'B';
      const inner = `<div class="hs-chart-compare-wrap">
        ${kick}
        ${h1 || '<h1 class="hs-h1">—</h1>'}
        ${subEn}
        <div class="hs-chart-compare">
          <section class="hs-chart-panel">
            <h2>${escapeHtml(leftTitle)}</h2>
            ${chartSlot(state, slide, slide.chart_html, slide.chart_page_url, `s${idx}-primary`, '未提供第一个 chart_embed_html')}
          </section>
          <section class="hs-chart-panel hs-chart-panel--accent">
            <h2>${escapeHtml(rightTitle)}</h2>
            ${chartSlot(state, slide, slide.secondary_chart_html, slide.secondary_chart_page_url, `s${idx}-secondary`, '未提供第二个 chart_embed_html')}
          </section>
        </div>
        ${chartCaption(slide.chart_caption)}
      </div>`;
      return slideShell(state, slide, idx, total, inner, 'hs-mod-chart');
    }

    case 'split_image': {
      const im = slide.image;
      const req = slide.image_request;
      const fig = im
        ? `<figure class="hs-fig">${imgBlock(im.url, im.alt, '')}${
            im.caption?.trim() ? `<figcaption>${escapeHtml(im.caption.trim())}</figcaption>` : ''
          }</figure>`
        : req
          ? `<div class="hs-fig-ph"><strong>待生成配图</strong><span>${escapeHtml(req.role)} · ${escapeHtml(req.size ?? '1536x1024')}</span></div>`
          : '<div class="hs-fig-ph">（未提供 image_url）</div>';
      const colTxt = `<div class="hs-split-txt">${kick}${h1}${subEn}<div class="hs-rule"></div>${bodyBullets(state, slide.bullets)}</div>`;
      const colImg = `<div class="hs-split-img">${fig}</div>`;
      const order = im?.position === 'left' ? `${colImg}${colTxt}` : `${colTxt}${colImg}`;
      const inner = `<div class="hs-split">${order}</div>`;
      return slideShell(state, slide, idx, total, inner);
    }

    case 'quote': {
      const q = titleRaw ? escapeHtml(titleRaw) : '—';
      const cite = slide.subtitle_en?.trim()
        ? `<cite class="hs-quote-cite">${escapeHtml(slide.subtitle_en.trim())}</cite>`
        : '';
      const inner = `<div class="hs-quote">
        <div class="hs-quote-mark">“</div>
        <blockquote class="hs-quote-body">${q}</blockquote>
        ${cite}
      </div>`;
      return slideShell(state, slide, idx, total, inner);
    }

    case 'mermaid_focus': {
      const id = `mmd-${idx + 1}`;
      const inner = `${kick}${h1}<p class="hs-mmd-note">Mermaid</p><pre class="mermaid" id="${id}"></pre>`;
      return slideShell(state, slide, idx, total, inner);
    }

    case 'closing': {
      const t = titleRaw ? escapeHtml(titleRaw) : '谢谢';
      const s = slide.subtitle_en?.trim() ? escapeHtml(slide.subtitle_en.trim()) : '';
      const inner = `<div class="hs-close">
        <h2 class="hs-close-h">${t}</h2>
        ${s ? `<p class="hs-close-s">${s}</p>` : ''}
      </div>`;
      return slideShell(state, slide, idx, total, inner, 'hs-mod-close');
    }

    default:
      return slideShell(state, slide, idx, total, `${kick}${h1}`, '');
  }
}

export function buildSingleFileHtml(state: DeckState, opts: { embedMermaid: boolean }): string {
  const W = state.meta.canvas_w;
  const H = state.meta.canvas_h;
  const themePack = resolveDeckTheme(state.meta.theme_id);
  const { theme } = state;
  const slides = state.slides;
  const mermaidMap: Record<string, string> = {};
  slides.forEach((s, i) => {
    if (s.layout === 'mermaid_focus' && s.mermaid?.trim()) {
      mermaidMap[`mmd-${i + 1}`] = s.mermaid.trim();
    }
  });
  const hasMermaid = opts.embedMermaid && Object.keys(mermaidMap).length > 0;
  const hasInlineChart = slides.some((s) => s.layout.startsWith('chart_') && s.chart_data?.trim());

  const sections = slides.map((s, i) => renderSlide(state, s, i, slides.length)).join('\n');

  const mermaidBlock = hasMermaid
    ? `
<script src="https://cdn.jsdelivr.net/npm/mermaid@10/dist/mermaid.min.js"></script>
<script>
(function(){
  var blocks = ${JSON.stringify(mermaidMap)};
  document.addEventListener('DOMContentLoaded', function(){
    Object.keys(blocks).forEach(function(id){
      var el = document.getElementById(id);
      if (el) el.textContent = blocks[id];
    });
    if (window.mermaid) {
      mermaid.initialize({ startOnLoad: false, theme: 'base',
        themeVariables: {
          primaryColor: '${escapeHtml(theme.page_background)}',
          primaryTextColor: '${escapeHtml(theme.text_color)}',
          lineColor: '${escapeHtml(theme.brand_tertiary)}',
          primaryBorderColor: '${escapeHtml(theme.brand_secondary)}'
        }
      });
      mermaid.run({ querySelector: '.mermaid' }).catch(function(){});
    }
  });
})();
</script>`
    : '';

  const chartBlock = hasInlineChart
    ? `
<script src="https://cdn.jsdelivr.net/npm/echarts@5/dist/echarts.min.js"></script>
<script>
(function(){
  function activeSlide(){
    return document.querySelector('deck-stage > section.active');
  }
  function renderCharts(){
    if (!window.echarts) return;
    var root = activeSlide();
    if (!root) return;
    root.querySelectorAll('.hs-inline-chart').forEach(function(el){
      var raw = el.getAttribute('data-chart-option');
      if (!raw) return;
      try {
        if (!el.__hsChart) {
          var option = JSON.parse(raw);
          var chart = echarts.init(el, null, { renderer: 'svg' });
          chart.setOption(option);
          el.__hsChart = chart;
        }
        el.__hsChart.resize();
      } catch (e) {}
    });
  }
  document.addEventListener('DOMContentLoaded', renderCharts);
  window.addEventListener('deck-stage-change', function(){ requestAnimationFrame(renderCharts); });
  window.addEventListener('resize', function(){
    document.querySelectorAll('.hs-inline-chart').forEach(function(el){
      if (el.__hsChart) el.__hsChart.resize();
    });
  });
})();
</script>`
    : '';

  const deckScript = buildDeckStageScript();

  const css = `
:root {
  ${themeCssVars(themePack)}
  --hs-serif: "Noto Serif SC", "Songti SC", serif;
  --hs-sans: "Noto Sans SC", "PingFang SC", "Microsoft YaHei", sans-serif;
  --hs-latin: Lora, Georgia, serif;
  --hs-mono: "JetBrains Mono", ui-monospace, monospace;
}
* { box-sizing: border-box; }
html, body { margin: 0; height: 100%; }
body { background: #0a0a0a; }

.hs-em {
  color: var(--hs-primary);
  font-weight: 900;
}

.hs-page {
  margin: 0;
  padding: 0;
}

.hs-canvas {
  width: ${W}px;
  height: ${H}px;
  position: relative;
  display: flex;
  flex-direction: column;
  font-family: var(--hs-serif);
  color: var(--hs-text);
  background-color: var(--hs-page-bg);
  background-image:
    radial-gradient(ellipse 1200px 800px at 12% 8%, rgba(33, 33, 33, 0.018) 0%, transparent 55%),
    radial-gradient(ellipse 900px 700px at 88% 90%, rgba(33, 33, 33, 0.014) 0%, transparent 50%);
}

.hs-mh {
  flex: 0 0 auto;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 28px 56px 12px;
  min-height: 52px;
}
.hs-mh-L { display: flex; align-items: center; gap: 12px; }
.hs-logo { height: 28px; width: auto; max-width: 220px; object-fit: contain; }
.hs-logo-ph { display: inline-block; width: 1px; height: 28px; }
.hs-mh-meta {
  font-family: var(--hs-latin), var(--hs-serif);
  font-size: 15px;
  letter-spacing: 0.04em;
  color: var(--hs-muted);
}
.hs-mh-rule {
  height: 1px;
  margin: 0 56px;
  background: linear-gradient(90deg, var(--hs-tertiary), color-mix(in srgb, var(--hs-tertiary) 20%, transparent));
}

.hs-main {
  flex: 1 1 auto;
  padding: 24px 56px 32px;
  min-height: 0;
  display: flex;
  flex-direction: column;
}

.hs-ft {
  flex: 0 0 auto;
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 18px 56px 26px;
  font-size: 15px;
  color: var(--hs-muted);
  border-top: 1px solid color-mix(in srgb, var(--hs-tertiary) 35%, transparent);
}
.hs-ft-R { font-variant-numeric: tabular-nums; }

.hs-kicker {
  display: flex;
  align-items: center;
  gap: 14px;
  margin-bottom: 22px;
}
.hs-kicker-bar {
  width: 5px;
  height: 22px;
  border-radius: 2px;
  flex-shrink: 0;
}
.hs-kicker-txt {
  font-size: 13px;
  font-weight: 600;
  letter-spacing: 0.22em;
  text-transform: uppercase;
  color: var(--hs-muted);
}

.hs-h1 {
  margin: 0 0 16px;
  font-size: 86px;
  line-height: 1.12;
  font-weight: 900;
  letter-spacing: 0;
}
.hs-h1--cover {
  font-size: 112px;
  margin-top: 8px;
}
.hs-suben {
  margin: 0 0 20px;
  font-family: var(--hs-latin);
  font-size: 32px;
  font-style: italic;
  font-weight: 400;
  line-height: 1.35;
  color: var(--hs-muted);
}
.hs-rule {
  height: 1px;
  background: color-mix(in srgb, var(--hs-text) 12%, transparent);
  margin: 8px 0 28px;
  max-width: 520px;
}

.hs-ico { display: inline-flex; flex-shrink: 0; align-items: center; justify-content: center; }
.hs-ico svg { width: 100%; height: 100%; display: block; }
.hs-bullets,
.hs-compact-list {
  margin: 0;
  padding: 0;
  list-style: none;
  font-size: 20px;
  line-height: 1.82;
  max-width: 920px;
  font-family: var(--hs-sans);
}
.hs-bullets li,
.hs-compact-list li {
  display: flex;
  align-items: flex-start;
  gap: 14px;
  margin: 0.35em 0;
}
.hs-bullets li > span:last-child,
.hs-compact-list li > span:last-child { flex: 1; min-width: 0; }
.hs-bullets li strong { color: var(--hs-primary); font-weight: 700; }
.hs-section-row {
  display: flex;
  align-items: center;
  gap: 40px;
  flex: 1;
  min-height: 0;
}
.hs-section-copy { flex: 1; min-width: 0; }

.hs-cover {
  flex: 1;
  display: flex;
  flex-direction: column;
  justify-content: center;
  position: relative;
  padding-right: 180px;
}
.hs-cover-sub {
  margin: 12px 0 0;
  font-size: 22px;
  color: var(--hs-muted);
  line-height: 1.6;
  max-width: 880px;
}
.hs-cover-pillar {
  position: absolute;
  right: 64px;
  top: 120px;
  bottom: 120px;
  width: 10px;
  border-radius: 6px;
  opacity: 0.85;
}

.hs-split {
  flex: 1;
  display: flex;
  gap: 40px;
  align-items: stretch;
  min-height: 0;
}
.hs-split-txt { flex: 1.15; min-width: 0; display: flex; flex-direction: column; }
.hs-split-img {
  flex: 0.85;
  display: flex;
  align-items: center;
  justify-content: center;
  min-width: 0;
}
.hs-fig { margin: 0; text-align: center; width: 100%; }
.hs-img {
  max-width: 100%;
  max-height: 640px;
  border-radius: 4px;
  object-fit: contain;
  box-shadow: 0 18px 50px rgba(0, 0, 0, 0.08);
}
.hs-fig figcaption {
  margin-top: 12px;
  font-size: 15px;
  color: var(--hs-muted);
  font-family: var(--hs-latin);
}
.hs-fig-ph {
  padding: 48px;
  border: 1px dashed color-mix(in srgb, var(--hs-text) 25%, transparent);
  color: var(--hs-muted);
  border-radius: 4px;
}
.hs-fig-ph strong {
  display: block;
  color: var(--hs-text);
  font-family: var(--hs-sans);
  font-size: 20px;
  margin-bottom: 8px;
}
.hs-fig-ph span {
  display: block;
  font-size: 14px;
}

.hs-quote {
  flex: 1;
  display: flex;
  flex-direction: column;
  justify-content: center;
  max-width: 1000px;
}
.hs-quote-mark {
  font-size: 120px;
  line-height: 0.8;
  color: color-mix(in srgb, var(--hs-primary) 35%, var(--hs-page-bg));
  font-family: Georgia, serif;
}
.hs-quote-body {
  margin: 0;
  font-size: 56px;
  font-weight: 700;
  line-height: 1.25;
}
.hs-quote-cite {
  margin-top: 28px;
  font-size: 22px;
  font-style: normal;
  color: var(--hs-muted);
  font-family: var(--hs-latin);
}

.hs-section {
  flex: 1;
  display: flex;
  flex-direction: column;
  justify-content: center;
  max-width: 1180px;
}
.hs-section-num {
  font-family: var(--hs-mono);
  font-size: 18px;
  font-weight: 600;
  color: var(--hs-primary);
  margin-bottom: 34px;
}
.hs-mod-section .hs-h1 {
  font-size: 104px;
  max-width: 1160px;
}

.hs-metric {
  flex: 1;
  display: grid;
  grid-template-columns: minmax(0, 0.9fr) minmax(0, 1.1fr);
  gap: 56px;
  align-items: center;
}
.hs-metric-value {
  font-family: var(--hs-latin);
  font-size: 178px;
  line-height: 0.96;
  font-weight: 600;
  color: var(--hs-primary);
}
.hs-metric-label {
  margin: 22px 0 0;
  font-family: var(--hs-sans);
  font-size: 24px;
  line-height: 1.55;
  color: var(--hs-muted);
  max-width: 620px;
}
.hs-metric-copy .hs-h1 {
  font-size: 68px;
}

.hs-compare {
  margin-top: 26px;
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 30px;
}
.hs-compare-col {
  min-height: 420px;
  padding: 36px 38px;
  border-top: 6px solid var(--hs-tertiary);
  background: color-mix(in srgb, var(--hs-page-bg) 88%, white);
  box-shadow: inset 0 0 0 1px color-mix(in srgb, var(--hs-tertiary) 34%, transparent);
}
.hs-compare-col--accent {
  border-top-color: var(--hs-primary);
}
.hs-compare h2,
.hs-matrix-cell h2 {
  margin: 0 0 22px;
  font-size: 38px;
  line-height: 1.2;
  font-weight: 900;
}
.hs-compact-list {
  margin: 0;
  padding-left: 1.1em;
  font-family: var(--hs-sans);
  font-size: 21px;
  line-height: 1.72;
}

.hs-timeline {
  list-style: none;
  margin: 36px 0 0;
  padding: 0;
  display: grid;
  gap: 18px;
  max-width: 1220px;
}
.hs-timeline li {
  display: grid;
  grid-template-columns: 72px minmax(0, 1fr);
  gap: 22px;
  align-items: start;
  padding: 19px 0;
  border-bottom: 1px solid color-mix(in srgb, var(--hs-tertiary) 35%, transparent);
}
.hs-time-dot {
  font-family: var(--hs-mono);
  font-size: 15px;
  color: var(--hs-primary);
}
.hs-time-copy {
  font-family: var(--hs-sans);
  font-size: 25px;
  line-height: 1.55;
}

.hs-matrix {
  margin-top: 30px;
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 24px;
}
.hs-matrix-cell {
  min-height: 220px;
  padding: 30px 34px;
  border-left: 5px solid var(--hs-primary);
  background: color-mix(in srgb, var(--hs-page-bg) 90%, white);
  box-shadow: inset 0 0 0 1px color-mix(in srgb, var(--hs-tertiary) 32%, transparent);
}
.hs-matrix-cell p {
  margin: 0;
  font-family: var(--hs-sans);
  font-size: 22px;
  line-height: 1.65;
  color: var(--hs-muted);
}

.hs-mod-chart .hs-main {
  padding-top: 18px;
}
.hs-chart-focus,
.hs-chart-story,
.hs-chart-compare-wrap {
  flex: 1;
  min-height: 0;
}
.hs-chart-focus {
  display: grid;
  grid-template-rows: auto minmax(0, 1fr);
  gap: 16px;
}
.hs-chart-headline {
  max-width: 1500px;
}
.hs-chart-headline .hs-h1,
.hs-chart-compare-wrap > .hs-h1 {
  font-size: 58px;
  margin-bottom: 10px;
}
.hs-chart-headline .hs-suben,
.hs-chart-compare-wrap > .hs-suben {
  font-size: 24px;
  margin-bottom: 0;
}
.hs-chart-story {
  display: grid;
  grid-template-columns: 0.42fr 0.58fr;
  gap: 48px;
  align-items: stretch;
}
.hs-chart-narrative {
  min-width: 0;
  display: flex;
  flex-direction: column;
  justify-content: center;
  padding-bottom: 34px;
}
.hs-chart-narrative .hs-h1 {
  font-size: 78px;
  line-height: 1.1;
}
.hs-chart-narrative .hs-suben {
  font-size: 24px;
}
.hs-chart-narrative .hs-bullets {
  font-size: 22px;
  line-height: 1.75;
  max-width: 640px;
}
.hs-chart-stage {
  position: relative;
  min-width: 0;
  min-height: 0;
  display: flex;
  flex-direction: column;
}
.hs-chart-stage--focus {
  height: 690px;
  width: 100%;
}
.hs-chart-stage--story {
  justify-content: center;
}
.hs-chart-embed {
  flex: 1;
  width: 100%;
  height: 100%;
  min-height: 0;
  overflow: hidden;
  display: flex;
  align-items: stretch;
  justify-content: stretch;
}
.hs-chart-embed > .fg-chart-root {
  width: 100% !important;
  max-width: none !important;
  height: 100% !important;
  max-height: none !important;
  min-height: 0 !important;
  overflow: hidden !important;
  background: transparent !important;
  border: 0 !important;
  border-radius: 0 !important;
  box-shadow: none !important;
  backdrop-filter: none !important;
  -webkit-backdrop-filter: none !important;
  padding: 0 !important;
}
.hs-chart-embed > .fg-chart-root .fg-chart-head {
  display: none !important;
}
.hs-chart-embed > .fg-chart-root .fg-chart-canvas {
  position: absolute !important;
  inset: 0 !important;
  top: 0 !important;
  left: 0 !important;
  right: 0 !important;
  bottom: 0 !important;
  min-height: 0 !important;
  overflow: hidden !important;
}
.hs-inline-chart {
  width: 100%;
  height: 100%;
  min-height: 0;
}
.hs-chart-embed--frame iframe {
  width: 100%;
  height: 100%;
  display: block;
  border: 0;
  background: transparent;
}
.hs-chart-caption {
  margin: 8px 0 0;
  font-family: var(--hs-sans);
  font-size: 14px;
  color: var(--hs-muted);
}
.hs-chart-empty {
  display: grid;
  place-items: center;
  min-height: 320px;
  width: 100%;
  border: 1px dashed color-mix(in srgb, var(--hs-text) 22%, transparent);
  color: var(--hs-muted);
  font-family: var(--hs-sans);
}
.hs-chart-compare-wrap {
  display: grid;
  grid-template-rows: auto auto minmax(0, 1fr) auto;
  gap: 14px;
}
.hs-chart-compare {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 26px;
  min-height: 0;
}
.hs-chart-panel {
  min-width: 0;
  min-height: 0;
  display: grid;
  grid-template-rows: auto minmax(0, 1fr);
  gap: 14px;
  padding-top: 18px;
  border-top: 5px solid var(--hs-tertiary);
}
.hs-chart-panel--accent {
  border-top-color: var(--hs-primary);
}
.hs-chart-panel h2 {
  margin: 0;
  font-size: 30px;
  line-height: 1.2;
  font-weight: 900;
}

.hs-mmd-note {
  margin: 0 0 8px;
  font-size: 12px;
  letter-spacing: 0.2em;
  text-transform: uppercase;
  color: var(--hs-muted);
}
.mermaid {
  margin: 0;
  background: #fff;
  border-radius: 6px;
  padding: 16px;
  border: 1px solid color-mix(in srgb, var(--hs-tertiary) 40%, transparent);
  min-height: 200px;
}

.hs-close {
  flex: 1;
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  text-align: center;
}
.hs-close-h {
  margin: 0;
  font-size: 96px;
  font-weight: 900;
}
.hs-close-s {
  margin: 20px 0 0;
  font-size: 26px;
  color: var(--hs-muted);
  font-family: var(--hs-latin);
  font-style: italic;
}

.hs-mod-close .hs-main { justify-content: center; }
`;

  return `<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${escapeHtml(state.meta.title)}</title>
  <!--
    Huashu-Design aligned deck: 1920×1080 canvas, publications grammar (masthead / kicker / Noto Serif SC + Lora),
    deck-stage-style navigation. Grammar reference: github.com/alchaincyf/huashu-design (slide-decks / publications template).
  -->
  <link rel="preconnect" href="https://fonts.googleapis.com" />
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
  <link href="${FONT_HREF}" rel="stylesheet" />
  <style>${css}</style>
</head>
<body>
  <deck-stage width="${W}" height="${H}">
${sections}
  </deck-stage>
  <script>${deckScript}</script>
  ${mermaidBlock}
  ${chartBlock}
</body>
</html>`;
}
