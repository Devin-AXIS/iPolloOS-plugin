import { escapeAttr, escapeHtml, safeHttpUrl } from './escape';
import type { FutureInsightNewsItem, FutureInsightReport } from './report';
import { renderWorkgroupBaseCss } from './workgroup-components';

function impactClass(impact: FutureInsightNewsItem['impact']): string {
  if (impact === 'High impact') return 'impact high';
  if (impact === 'Medium-high') return 'impact mid';
  if (impact === 'Watch') return 'impact watch';
  return 'impact';
}

function renderList(items: string[]): string {
  return items.map((item) => `<li>${escapeHtml(item)}</li>`).join('');
}

function renderVerdict(report: FutureInsightReport): string {
  const bullets = report.verdict.bullets || [];
  return `<div class="verdict">
    <span class="label">${escapeHtml(report.verdict.label)}</span>
    <h2>${escapeHtml(report.verdict.title)}</h2>
    <p>${escapeHtml(report.verdict.body)}</p>
    ${bullets.length ? `<ul class="verdict-list">${renderList(bullets.slice(0, 6))}</ul>` : ''}
  </div>`;
}

function renderCoverHighlights(report: FutureInsightReport): string {
  const seen = new Set<string>();
  const candidates = [
    ...report.signals.items.map((item) => ({
      label: item.label,
      title: item.title,
      body: item.summary
    })),
    ...report.impacts.items.map((item) => ({
      label: item.label,
      title: item.title,
      body: item.body
    })),
    ...report.actions.items.map((item) => ({
      label: 'Next Move',
      title: item.title,
      body: item.bullets[0] || ''
    }))
  ];
  const items = candidates
    .filter((item) => {
      const key = item.title.trim();
      if (!key || seen.has(key)) return false;
      seen.add(key);
      return true;
    })
    .slice(0, 3);

  return `<div class="cover-highlights">
    ${items
      .map(
        (item) => `<article class="cover-highlight">
          <span>${escapeHtml(item.label)}</span>
          <strong>${escapeHtml(item.title)}</strong>
          <p>${escapeHtml(item.body)}</p>
        </article>`
      )
      .join('')}
  </div>`;
}

function renderSources(report: FutureInsightReport): string {
  return report.sources.items
    .map((source, index) => {
      const url = safeHttpUrl(source.url);
      const body = [
        `<small>[${String(index + 1).padStart(2, '0')}]</small>`,
        `<strong>${escapeHtml(source.publisher || 'Source')}</strong>`,
        `<span>${escapeHtml(source.title)}</span>`
      ].join('');
      return url
        ? `<a class="source-item" href="${escapeAttr(url)}" target="_blank" rel="noreferrer">${body}</a>`
        : `<span class="source-item">${body}</span>`;
    })
    .join('');
}

function renderVisual(report: FutureInsightReport): string {
  const imageUrl = safeHttpUrl(report.radar.visual?.imageUrl);
  if (imageUrl) {
    return `<figure class="radar-visual image">
      <img src="${escapeAttr(imageUrl)}" alt="${escapeAttr(report.radar.visual?.caption || report.radar.title)}">
      ${report.radar.visual?.caption ? `<figcaption>${escapeHtml(report.radar.visual.caption)}</figcaption>` : ''}
    </figure>`;
  }

  return `<figure class="radar-visual" aria-label="${escapeAttr(report.radar.title)}">
    <div class="radar-art">
      <div class="visual-mast">
        <span>Visual Placeholder</span>
        <strong>Image Ready</strong>
      </div>
      <div class="visual-bands" aria-hidden="true"><i></i><i></i><i></i></div>
      <div class="visual-index" aria-hidden="true"><span>Now</span><span>Next</span><span>Watch</span></div>
      <div class="radar-pills">
        ${report.radar.points
          .slice(0, 8)
          .map(
            (point) =>
              `<span class="radar-pill" data-phase="${escapeAttr(point.phase)}" style="--point-color:${escapeAttr(
                point.color || '#f97316'
              )}">${escapeHtml(point.label)}</span>`
          )
          .join('')}
      </div>
    </div>
    ${report.radar.visual?.caption ? `<figcaption>${escapeHtml(report.radar.visual.caption)}</figcaption>` : ''}
  </figure>`;
}

function renderVisualPanels(report: FutureInsightReport): string {
  const items = report.visualPanels.items
    .map((item) => ({
      ...item,
      imageUrl: safeHttpUrl(item.imageUrl)
    }))
    .filter((item) => item.imageUrl)
    .slice(0, 2);
  if (!items.length) return '';

  return `<section class="section visual-section">
    <div class="section-head">
      <h2>${escapeHtml(report.visualPanels.title)}</h2>
      <p>${escapeHtml(report.visualPanels.subtitle)}</p>
    </div>
    <div class="${items.length === 1 ? 'visual-panels single' : 'visual-panels'}">
      ${items
        .map(
          (item) => `<figure class="visual-panel">
            <img src="${escapeAttr(item.imageUrl)}" alt="${escapeAttr(item.caption || item.title)}">
            <figcaption>
              <strong>${escapeHtml(item.title)}</strong>
              ${item.caption ? `<span>${escapeHtml(item.caption)}</span>` : ''}
            </figcaption>
          </figure>`
        )
        .join('')}
    </div>
  </section>`;
}

export function renderFutureInsightHtml(report: FutureInsightReport): string {
  const preparedFor =
    report.input.preparedFor || report.input.companyOrProduct[0] || 'Decision Brief';
  const logoUrl = safeHttpUrl(report.input.logoUrl);
  const coverImageUrl = safeHttpUrl(report.cover.visual?.imageUrl || report.radar.visual?.imageUrl);
  const regionText = report.input.regions.length ? report.input.regions.join(' / ') : 'Global';
  const html = `<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${escapeHtml(report.cover.headline)} · 未来洞察系统</title>
  <style>
	    ${renderWorkgroupBaseCss()}
	    * { box-sizing: border-box; }
	    html { margin: 0; background: var(--paper); color: var(--ink); font-family: ui-sans-serif, -apple-system, BlinkMacSystemFont, "Segoe UI", "Noto Sans SC", "PingFang SC", Arial, sans-serif; letter-spacing: 0; }
	    body { margin: 0; background: var(--paper); overflow-x: hidden; }
	    a { color: inherit; text-decoration: none; }
	    h1, h2, h3, p, li, span, strong, small { margin: 0; overflow-wrap: anywhere; }
	    .mag { width: 100%; max-width: 1320px; margin: 0 auto; padding: 26px 24px 80px; overflow-x: hidden; }
	    .topbar { display: grid; grid-template-columns: 1fr auto 1fr; align-items: center; gap: 16px; border-top: 5px solid var(--ink); border-bottom: 1px solid var(--ink); padding: 14px 0; margin-bottom: 22px; color: var(--ink); font-size: 12px; font-weight: 850; text-transform: uppercase; }
	    .topbar > * { min-width: 0; }
	    .topbar .center { font-family: Georgia, "Times New Roman", serif; font-size: 32px; line-height: 1; font-weight: 800; text-transform: none; }
	    .topbar .right { text-align: right; color: var(--muted); }
	    .cover { display: grid; grid-template-columns: minmax(0, 1fr) 330px; gap: 18px; align-items: stretch; }
	    .hero { position: relative; min-height: 660px; display: flex; flex-direction: column; justify-content: flex-start; gap: 0; overflow: hidden; padding: clamp(26px, 3.6vw, 40px); background: var(--dark); color: #fffaf1; box-shadow: var(--shadow); isolation: isolate; }
	    .hero::before { content: ""; position: absolute; inset: -10%; z-index: 0; background: radial-gradient(circle at 18% 18%, rgb(255 90 31 / 95%), transparent 22%), radial-gradient(circle at 78% 26%, rgb(10 85 255 / 82%), transparent 25%), radial-gradient(circle at 60% 82%, rgb(185 255 56 / 62%), transparent 18%), linear-gradient(135deg, #06070a 0%, #141823 52%, #06070a 100%); filter: saturate(1.05); }
	    .hero::after { content: ""; position: absolute; inset: 0; z-index: 1; background-image: linear-gradient(rgb(255 255 255 / 6%) 1px, transparent 1px), linear-gradient(90deg, rgb(255 255 255 / 6%) 1px, transparent 1px), repeating-linear-gradient(0deg, rgb(255 250 241 / 3%) 0 1px, transparent 1px 4px); background-size: 42px 42px, 42px 42px, 100% 100%; mask-image: linear-gradient(180deg, #000, rgb(0 0 0 / 25%)); opacity: .65; }
	    .hero-bg-image { position: absolute; left: 0; right: 0; bottom: 0; z-index: 1; width: 100%; height: 62%; object-fit: cover; object-position: center bottom; opacity: .3; filter: saturate(.95) contrast(1.08); mix-blend-mode: screen; mask-image: linear-gradient(180deg, transparent 0%, rgb(0 0 0 / 58%) 24%, #000 100%); pointer-events: none; }
	    .hero.has-cover-image::before { opacity: .88; }
	    .hero > :not(.hero-bg-image) { position: relative; z-index: 2; }
	    .watermark { position: absolute; right: 24px; bottom: 10px; z-index: 1; max-width: calc(100% - 48px); overflow: hidden; color: #fff; font-family: Georgia, "Times New Roman", serif; font-size: clamp(64px, 10vw, 126px); font-weight: 800; line-height: .82; opacity: .08; pointer-events: none; text-align: right; text-transform: uppercase; white-space: nowrap; }
	    .issue-tag { position: relative; display: grid; grid-template-columns: 1fr auto; gap: 12px; align-items: center; border-bottom: 1px solid rgb(255 250 241 / 22%); padding-bottom: 12px; color: rgb(255 250 241 / 78%); font-size: 12px; font-weight: 900; text-transform: uppercase; }
	    .identity { display: inline-flex; min-width: 0; align-items: center; gap: 10px; }
	    .identity img { width: 26px; height: 26px; border: 1px solid rgb(255 250 241 / 42%); object-fit: contain; padding: 3px; background: rgb(255 250 241 / 12%); }
	    .cover-content { display: grid; grid-template-columns: minmax(0, 1.08fr) minmax(250px, .7fr); gap: 14px 18px; align-items: end; max-width: 1040px; margin-top: clamp(34px, 5vw, 68px); }
	    h1 { grid-column: 1; max-width: 760px; font-family: Georgia, "Times New Roman", serif; font-size: clamp(52px, 7.8vw, 104px); line-height: .86; font-weight: 800; }
	    .deck { grid-column: 1; max-width: 700px; margin-top: 0; color: #f4f0e8; font-size: clamp(17px, 1.7vw, 21px); line-height: 1.48; }
	    .cover-highlights { grid-column: 2; grid-row: 1 / span 2; display: grid; grid-template-columns: 1fr; gap: 8px; align-self: end; margin-top: 0; }
	    .cover-highlight { min-width: 0; border: 1px solid rgb(255 255 255 / 22%); background: rgb(5 8 14 / 38%); padding: 12px 13px; backdrop-filter: blur(12px); }
	    .cover-highlight span { display: block; color: var(--lime); font-size: 10px; font-weight: 950; line-height: 1.1; text-transform: uppercase; }
	    .cover-highlight strong { display: block; margin-top: 7px; color: #fffaf1; font-size: 14px; line-height: 1.24; }
	    .cover-highlight p { display: -webkit-box; margin-top: 6px; overflow: hidden; color: rgb(255 250 241 / 72%); font-size: 11px; line-height: 1.38; -webkit-box-orient: vertical; -webkit-line-clamp: 2; }
	    .cover-stats { grid-column: 1 / -1; display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 0; margin-top: 2px; border-top: 1px solid rgb(255 250 241 / 24%); border-left: 1px solid rgb(255 250 241 / 18%); }
	    .stat { display: grid; grid-template-columns: auto minmax(0, 1fr); gap: 9px; align-items: end; border-right: 1px solid rgb(255 250 241 / 18%); border-bottom: 1px solid rgb(255 250 241 / 18%); background: rgb(255 250 241 / 8%); padding: 12px 13px; backdrop-filter: blur(14px); min-width: 0; }
	    .stat b { display: block; font-size: 25px; line-height: .92; }
	    .stat span { display: block; color: #d8d6d1; font-size: 10px; line-height: 1.2; text-transform: uppercase; overflow-wrap: anywhere; }
	    .side { display: flex; min-width: 0; }
	    .verdict, .signal, .column, .radar-card, .impact-brief, .action, .source-item { background: var(--paper-strong); border: 1px solid var(--line); }
	    .verdict { width: 100%; padding: 19px; box-shadow: 0 10px 26px rgb(28 21 12 / 7%); }
	    .label { display: inline-block; width: fit-content; background: var(--ink); color: var(--paper-strong); font-size: 10px; font-weight: 900; text-transform: uppercase; padding: 6px 8px; margin-bottom: 14px; }
	    .verdict h2 { font-family: Georgia, "Times New Roman", serif; font-size: clamp(27px, 3.2vw, 32px); line-height: 1.02; font-weight: 800; margin-bottom: 11px; }
	    .verdict p { color: #3d3832; font-size: 13px; line-height: 1.55; }
	    .verdict-list { margin: 12px 0 0; padding-left: 16px; color: #3d3832; font-size: 12px; line-height: 1.5; }
	    .verdict-list li + li { margin-top: 6px; }
	    .section { margin-top: 28px; }
	    .section-head { display: grid; grid-template-columns: 1fr auto; align-items: end; gap: 18px; border-bottom: 3px solid var(--ink); padding-bottom: 10px; margin-bottom: 18px; }
	    .section-head h2 { font-family: Georgia, "Times New Roman", serif; font-size: clamp(40px, 5vw, 54px); line-height: .9; font-weight: 800; }
	    .section-head p { max-width: 520px; color: var(--muted); font-size: 13px; line-height: 1.5; text-align: right; }
	    .newswall { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 18px; align-items: start; }
	    .column { min-width: 0; }
	    .column-title { padding: 16px 18px; border-bottom: 1px solid var(--line); color: var(--orange); font-size: 12px; font-weight: 950; text-transform: uppercase; }
	    .item { padding: 18px; border-bottom: 1px solid var(--line); overflow-wrap: anywhere; }
	    .item:last-child { border-bottom: 0; }
	    .item h3 { font-size: 17px; line-height: 1.3; margin-bottom: 7px; }
	    .item p { color: var(--muted); font-size: 13px; line-height: 1.6; }
	    .impact { display: inline-block; margin-top: 10px; color: var(--muted); font-size: 11px; font-weight: 900; text-transform: uppercase; }
	    .impact.high { color: var(--orange); }
	    .impact.mid { color: var(--blue); }
	    .impact.watch { color: #4d7c0f; }
	    .signal-grid { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 18px; align-items: start; }
	    .signal { position: relative; min-width: 0; min-height: 138px; overflow: hidden; padding: 16px; }
	    .signal.hot { background: #111; color: #fff; }
	    .chip { display: inline-flex; border: 1px solid currentColor; padding: 5px 7px; margin-bottom: 12px; color: var(--ink); font-size: 10px; font-weight: 900; text-transform: uppercase; }
	    .signal.hot .chip { border-color: #fff; background: var(--lime); color: #111; }
	    .signal h3 { font-family: Georgia, "Times New Roman", serif; font-size: 21px; line-height: 1.05; font-weight: 800; margin-bottom: 12px; }
	    .signal p { color: var(--muted); font-size: 12px; line-height: 1.5; }
	    .signal.hot p { color: #d3d0ca; }
	    .radar-wrap { display: grid; grid-template-columns: .85fr 1.15fr; gap: 18px; align-items: stretch; margin-top: 28px; }
	    .radar-card { padding: 26px; min-width: 0; }
	    .radar-card h3 { font-family: Georgia, "Times New Roman", serif; font-size: clamp(36px, 4vw, 42px); line-height: 1; font-weight: 800; margin-bottom: 12px; }
	    .radar-card p { color: var(--muted); line-height: 1.75; margin-top: 12px; }
	    .radar-visual { position: relative; min-height: 520px; margin: 0; background: #0b1119; border: 1px solid #101820; box-shadow: 0 18px 48px rgb(17 24 39 / 18%); overflow: hidden; }
	    .radar-visual.image img { display: block; width: 100%; min-height: 520px; object-fit: cover; }
	    .radar-visual.image::after { content: ""; position: absolute; inset: 0; pointer-events: none; background: linear-gradient(180deg, transparent 62%, rgb(0 0 0 / 48%) 100%); }
	    .radar-visual figcaption { position: absolute; left: 24px; right: 24px; bottom: 18px; z-index: 3; color: rgb(255 250 241 / 72%); font-size: 11px; font-weight: 850; text-transform: uppercase; overflow-wrap: anywhere; }
	    .radar-art { position: relative; min-height: 520px; padding: 28px; color: #fffaf1; background: linear-gradient(120deg, rgb(255 90 31 / 78%) 0%, rgb(255 90 31 / 18%) 22%, transparent 39%), linear-gradient(130deg, transparent 0%, rgb(10 85 255 / 24%) 44%, rgb(10 85 255 / 88%) 100%), linear-gradient(180deg, #10131a 0%, #0b1119 100%); isolation: isolate; }
	    .radar-art::before { content: ""; position: absolute; inset: 0; z-index: -1; background-image: linear-gradient(rgb(255 255 255 / 7%) 1px, transparent 1px), linear-gradient(90deg, rgb(255 255 255 / 7%) 1px, transparent 1px), linear-gradient(105deg, transparent 0 46%, rgb(185 255 56 / 18%) 46% 47%, transparent 47% 100%); background-size: 48px 48px, 48px 48px, 100% 100%; }
	    .radar-art::after { content: ""; position: absolute; inset: 0; z-index: -1; background: linear-gradient(180deg, transparent 0%, rgb(0 0 0 / 42%) 100%), repeating-linear-gradient(0deg, rgb(255 250 241 / 4%) 0 1px, transparent 1px 4px); opacity: .7; }
	    .visual-mast { display: flex; justify-content: space-between; gap: 16px; color: rgb(255 250 241 / 86%); font-size: 12px; font-weight: 950; text-transform: uppercase; }
	    .visual-mast strong { color: var(--lime); }
	    .visual-bands { position: absolute; inset: 104px 34px 118px; pointer-events: none; }
	    .visual-bands i { position: absolute; display: block; border: 1px solid rgb(255 250 241 / 28%); background: linear-gradient(135deg, rgb(255 250 241 / 12%), rgb(255 250 241 / 2%)); transform: skewX(-12deg) rotate(-6deg); }
	    .visual-bands i:nth-child(1) { inset: 0 22% 48% 6%; }
	    .visual-bands i:nth-child(2) { inset: 24% 10% 22% 28%; border-color: rgb(185 255 56 / 48%); }
	    .visual-bands i:nth-child(3) { inset: 56% 34% 0 0; border-color: rgb(0 184 217 / 42%); }
	    .visual-index { position: absolute; left: 28px; bottom: 92px; display: grid; grid-template-columns: repeat(3, auto); gap: 10px; }
	    .visual-index span { border: 1px solid rgb(255 250 241 / 34%); padding: 8px 11px; color: rgb(255 250 241 / 82%); font-size: 10px; font-weight: 950; text-transform: uppercase; }
	    .visual-index span:first-child { background: var(--lime); border-color: var(--lime); color: #111; }
	    .radar-pills { position: absolute; right: 26px; bottom: 28px; display: flex; max-width: min(560px, calc(100% - 52px)); flex-wrap: wrap; justify-content: flex-end; gap: 8px; }
	    .radar-pill { max-width: 100%; border: 1px solid rgb(255 250 241 / 32%); background: rgb(11 17 25 / 52%); color: #fffaf1; padding: 7px 9px; font-size: 11px; line-height: 1.25; font-weight: 900; overflow-wrap: anywhere; }
	    .radar-pill[data-phase="Now"] { border-color: var(--lime); background: rgb(185 255 56 / 16%); }
	    .radar-pill[data-phase="Next"] { border-color: rgb(10 85 255 / 88%); }
	    .visual-section { margin-top: 28px; }
	    .visual-panels { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 18px; align-items: stretch; }
	    .visual-panels.single { grid-template-columns: minmax(0, 1fr); }
	    .visual-panel { position: relative; min-height: 360px; margin: 0; overflow: hidden; background: #0b1119; border: 1px solid #101820; box-shadow: 0 18px 48px rgb(17 24 39 / 15%); }
	    .visual-panel img { display: block; width: 100%; height: 100%; min-height: 360px; object-fit: cover; filter: saturate(.96) contrast(1.04); }
	    .visual-panel::after { content: ""; position: absolute; inset: 0; background: linear-gradient(180deg, rgb(0 0 0 / 8%) 0%, transparent 42%, rgb(0 0 0 / 72%) 100%); pointer-events: none; }
	    .visual-panel figcaption { position: absolute; left: 20px; right: 20px; bottom: 18px; z-index: 2; color: #fffaf1; }
	    .visual-panel strong { display: block; font-family: Georgia, "Times New Roman", serif; font-size: clamp(24px, 3vw, 34px); line-height: 1; }
	    .visual-panel span { display: block; margin-top: 8px; color: rgb(255 250 241 / 78%); font-size: 12px; line-height: 1.45; }
	    .impact-grid { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 18px; align-items: start; }
	    .impact-brief { padding: 20px; min-width: 0; }
	    .impact-brief span { display: inline-block; color: var(--orange); font-size: 11px; font-weight: 950; text-transform: uppercase; margin-bottom: 12px; }
	    .impact-brief h3 { font-size: 22px; line-height: 1.18; margin-bottom: 10px; }
	    .impact-brief p { color: var(--muted); font-size: 13px; line-height: 1.7; }
	    .actions { display: grid; grid-template-columns: 1fr; gap: 0; border-top: 1px solid var(--line); border-left: 1px solid var(--line); }
	    .action { display: grid; grid-template-columns: 72px minmax(180px, 260px) 1fr; gap: 18px; align-items: start; padding: 18px; border-top: 0; border-left: 0; min-width: 0; }
	    .action b { font-family: Georgia, "Times New Roman", serif; color: var(--blue); font-size: 40px; line-height: 1; }
	    .action h3 { font-size: 20px; line-height: 1.2; margin-top: 2px; }
	    .action ul { margin: 0; padding-left: 16px; color: var(--muted); line-height: 1.55; font-size: 13px; }
	    .sources { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 0; border-top: 1px solid var(--line); border-left: 1px solid var(--line); }
	    .source-item { display: grid; grid-template-columns: 46px minmax(90px, 118px) minmax(0, 1fr); gap: 12px; align-items: baseline; padding: 13px 14px; border-top: 0; border-left: 0; font-size: 12px; line-height: 1.35; color: #3d3832; overflow-wrap: anywhere; }
	    .source-item small { color: var(--orange); font-family: Georgia, "Times New Roman", serif; font-size: 13px; font-weight: 900; }
	    .source-item strong { color: var(--ink); font-size: 12px; }
	    .source-item span { color: var(--muted); }
	    .foot { display: flex; flex-wrap: wrap; justify-content: space-between; gap: 18px; border-top: 1px solid var(--ink); margin-top: 28px; padding-top: 14px; color: var(--muted); font-size: 12px; }
	    @media (max-width: 1100px) {
	      .cover, .radar-wrap { grid-template-columns: 1fr; }
	      .signal-grid, .newswall, .impact-grid, .sources { grid-template-columns: repeat(2, minmax(0, 1fr)); }
	      .cover-content { grid-template-columns: minmax(0, 1fr) minmax(230px, .74fr); }
	      h1 { font-size: clamp(50px, 9vw, 78px); }
	    }
	    @media (max-width: 700px) {
	      .mag { padding: 18px 14px 60px; }
	      .topbar, .issue-tag, .section-head, .signal-grid, .newswall, .impact-grid, .sources { grid-template-columns: 1fr; }
	      .topbar .right, .section-head p { text-align: left; }
	      .topbar .center { font-size: 26px; }
	      .identity { flex-wrap: wrap; align-items: flex-start; }
	      .hero { min-height: 610px; padding: 20px; }
	      .hero::before { inset: -18%; background: radial-gradient(circle at 15% 12%, rgb(255 90 31 / 95%), transparent 28%), radial-gradient(circle at 90% 18%, rgb(10 85 255 / 78%), transparent 32%), radial-gradient(circle at 66% 88%, rgb(185 255 56 / 58%), transparent 22%), linear-gradient(135deg, #06070a 0%, #141823 54%, #06070a 100%); }
	      .hero-bg-image { height: 48%; opacity: .32; }
	      .watermark { right: 16px; bottom: 10px; max-width: calc(100% - 32px); font-size: clamp(52px, 18vw, 72px); }
	      .verdict { padding: 17px; }
	      .verdict h2 { font-size: clamp(25px, 8vw, 30px); }
	      .verdict p { font-size: 12.5px; line-height: 1.5; }
	      .verdict-list { font-size: 11.5px; line-height: 1.45; }
	      .cover-content { grid-template-columns: 1fr; gap: 12px; margin-top: 24px; }
	      h1 { grid-column: 1; font-size: clamp(35px, 11.5vw, 48px); line-height: .92; }
	      .deck { grid-column: 1; max-width: none; font-size: 16px; line-height: 1.46; }
	      .cover-highlights { grid-column: 1; grid-row: auto; grid-template-columns: 1fr; gap: 8px; margin-top: 2px; }
	      .cover-highlight { padding: 11px 12px; }
	      .cover-highlight strong { font-size: 14px; }
	      .cover-highlight p { display: none; }
	      .cover-stats { grid-column: 1; grid-template-columns: repeat(2, minmax(0, 1fr)); margin-top: 0; }
	      .stat { padding: 10px 11px; }
	      .stat b { font-size: clamp(20px, 6vw, 25px); overflow-wrap: anywhere; }
	      .radar-visual, .radar-art { min-height: 0; }
	      .radar-art { display: flex; flex-direction: column; gap: 16px; padding: 22px; }
	      .radar-visual.image img { min-height: 300px; }
	      .visual-mast { display: grid; gap: 8px; }
	      .visual-bands { position: relative; inset: auto; height: 170px; margin: 4px 0; }
	      .visual-index { position: relative; left: auto; right: auto; bottom: auto; grid-template-columns: repeat(3, minmax(0, 1fr)); }
	      .visual-index span { text-align: center; }
	      .radar-pills { position: relative; right: auto; bottom: auto; left: auto; max-width: none; justify-content: flex-start; }
	      .visual-panels { grid-template-columns: 1fr; }
	      .visual-panel { min-height: 280px; }
	      .visual-panel img { min-height: 280px; }
	      .action { grid-template-columns: 52px 1fr; gap: 12px 14px; }
	      .action ul { grid-column: 2; }
	      .source-item { grid-template-columns: 40px 1fr; }
	      .source-item span { grid-column: 2; }
	    }
	    @media (max-width: 420px) {
	      .mag { padding-left: 10px; padding-right: 10px; }
	      .hero { min-height: 600px; }
	      .cover-stats { grid-template-columns: 1fr; }
	      .action { grid-template-columns: 42px 1fr; padding: 14px; }
	      .action b { font-size: 32px; }
	      .source-item { grid-template-columns: 34px 1fr; padding: 12px; }
	    }
	    @media print {
	      body { background: #fff; }
	      .mag { max-width: none; padding: 0; }
	      .hero, .verdict, .column, .signal, .radar-card, .radar-visual, .impact-brief, .action, .source-item { box-shadow: none; }
	    }
  </style>
</head>
<body>
  <main class="mag">
    <header class="topbar">
      <div>${escapeHtml(report.publication.eyebrow)} · ${escapeHtml(regionText)}</div>
      <div class="center">${escapeHtml(report.publication.name)}</div>
      <div class="right">${escapeHtml(report.publication.dateLabel)} · ${escapeHtml(report.publication.issue)}</div>
    </header>

    <section class="cover">
      <article class="${coverImageUrl ? 'hero has-cover-image' : 'hero'}">
        ${coverImageUrl ? `<img class="hero-bg-image" src="${escapeAttr(coverImageUrl)}" alt="" aria-hidden="true">` : ''}
        <div class="watermark" aria-hidden="true">${escapeHtml(preparedFor)}</div>
        <div class="issue-tag">
          <div class="identity">
            ${logoUrl ? `<img src="${escapeAttr(logoUrl)}" alt="" aria-hidden="true">` : ''}
            <span>给 ${escapeHtml(preparedFor)} 的每日简报</span>
          </div>
          <span>${escapeHtml(report.publication.dateLabel)}</span>
        </div>
        <div class="cover-content">
          <h1>${escapeHtml(report.cover.headline)}</h1>
          <p class="deck">${escapeHtml(report.cover.deck)}</p>
          ${renderCoverHighlights(report)}
          <div class="cover-stats">
            ${report.cover.metrics
              .slice(0, 4)
              .map(
                (metric) =>
                  `<div class="stat"><b>${escapeHtml(metric.value)}</b><span>${escapeHtml(metric.label)}</span></div>`
              )
              .join('')}
          </div>
        </div>
      </article>
      <aside class="side">
        ${renderVerdict(report)}
      </aside>
    </section>

    <section class="section">
      <div class="section-head">
        <h2>${escapeHtml(report.newsWall.title)}</h2>
        <p>${escapeHtml(report.newsWall.subtitle)}</p>
      </div>
      <div class="newswall">
        ${report.newsWall.columns
          .map(
            (column) => `<div class="column">
              <div class="column-title">${escapeHtml(column.title)}</div>
              ${column.items
                .map(
                  (item) => `<article class="item">
                    <h3>${escapeHtml(item.title)}</h3>
                    <p>${escapeHtml(item.summary)}</p>
                    <span class="${impactClass(item.impact)}">${escapeHtml(item.impact)}</span>
                  </article>`
                )
                .join('')}
            </div>`
          )
          .join('')}
      </div>
    </section>

    <section class="section">
      <div class="section-head">
        <h2>${escapeHtml(report.signals.title)}</h2>
        <p>${escapeHtml(report.signals.subtitle)}</p>
      </div>
      <div class="signal-grid">
        ${report.signals.items
          .slice(0, 6)
          .map(
            (signal) => `<article class="${signal.hot ? 'signal hot' : 'signal'}">
              <span class="chip">${escapeHtml(signal.label)}</span>
              <h3>${escapeHtml(signal.title)}</h3>
              <p>${escapeHtml(signal.summary)}</p>
            </article>`
          )
          .join('')}
      </div>
    </section>

    <section class="radar-wrap">
      <div class="radar-card">
        <span class="label">${escapeHtml(report.radar.label)}</span>
        <h3>${escapeHtml(report.radar.title)}</h3>
        ${report.radar.body.map((paragraph) => `<p>${escapeHtml(paragraph)}</p>`).join('')}
        <p><strong>判断：</strong>${escapeHtml(String(report.radar.verdict ?? '').replace(/^判断：/, ''))}</p>
      </div>
      ${renderVisual(report)}
    </section>

    ${renderVisualPanels(report)}

    <section class="section">
      <div class="section-head">
        <h2>${escapeHtml(report.impacts.title)}</h2>
        <p>${escapeHtml(report.impacts.subtitle)}</p>
      </div>
      <div class="impact-grid">
        ${report.impacts.items
          .slice(0, 6)
          .map(
            (item) => `<article class="impact-brief">
              <span>${escapeHtml(item.label)}</span>
              <h3>${escapeHtml(item.title)}</h3>
              <p>${escapeHtml(item.body)}</p>
            </article>`
          )
          .join('')}
      </div>
    </section>

    <section class="section">
      <div class="section-head">
        <h2>${escapeHtml(report.actions.title)}</h2>
        <p>${escapeHtml(report.actions.subtitle)}</p>
      </div>
      <div class="actions">
        ${report.actions.items
          .slice(0, 6)
          .map(
            (action, index) => `<article class="action">
              <b>${String(index + 1).padStart(2, '0')}</b>
              <h3>${escapeHtml(action.title)}</h3>
              <ul>${renderList(action.bullets.slice(0, 5))}</ul>
            </article>`
          )
          .join('')}
      </div>
    </section>

    <section class="section">
      <div class="section-head">
        <h2>${escapeHtml(report.sources.title)}</h2>
        <p>${escapeHtml(report.sources.subtitle)}</p>
      </div>
      <div class="sources">${renderSources(report)}</div>
    </section>

    <footer class="foot">
      <span>${escapeHtml(report.publication.footerLeft)}</span>
      <span>${escapeHtml(report.publication.footerRight)}</span>
    </footer>
  </main>
</body>
</html>`;

  return html;
}
