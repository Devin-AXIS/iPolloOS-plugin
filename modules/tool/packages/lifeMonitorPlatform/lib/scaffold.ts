import { escapeHtml } from './escape';

export type LifeShellInput = {
  lang: 'zh-CN' | 'en';
  page_title: string;
  heading_h1: string;
  /** 主标题下灰色说明 */
  subtitle: string;
  /** 已拼好的多块 HTML（AINO 卡、用户区等） */
  stack_html: string;
};

const CSS = `:root{
  --bg0:#ecfdf5;--bg1:#fafaf9;--page-fg:#18181b;--muted:#71717a;
  --card:rgba(255,255,255,.9);--card-br:rgba(24,24,27,.12);
  --panel:rgba(244,244,245,.95);--panel-br:rgba(24,24,27,.1);
  --emerald:#059669;--amber:#d97706;--blue:#3b82f6;--violet:#7c3aed;
  --rose:#e11d48;--shadow:0 2px 12px -4px rgba(0,0,0,.08);
}
*{box-sizing:border-box}
html,body{min-height:100%;margin:0}
body{
  font-family:system-ui,-apple-system,"Segoe UI",Roboto,"PingFang SC","Microsoft YaHei",sans-serif;
  color:var(--page-fg);
  background:
    radial-gradient(100% 70% at 0% 0%, rgba(16,185,129,.14) 0%, transparent 55%),
    radial-gradient(80% 55% at 100% 0%, rgba(245,158,11,.1) 0%, transparent 50%),
    linear-gradient(180deg,var(--bg0) 0%,var(--bg1) 45%,#f4f4f5 100%);
}
.life-page{max-width:28rem;margin:0 auto;padding:1.1rem .85rem 2.25rem}
.life-page-head{margin-bottom:.9rem}
.life-h1{font-size:1.35rem;font-weight:700;letter-spacing:-.02em;margin:0 0 .35rem;color:var(--emerald)}
.life-sub{font-size:.8rem;color:var(--muted);margin:0;line-height:1.45}
.life-stack{display:flex;flex-direction:column;gap:.85rem}
.life-aino-card{
  border-radius:1rem;border:1px solid var(--card-br);background:var(--card);
  box-shadow:var(--shadow);backdrop-filter:blur(8px);padding:1rem 1rem 1.05rem;
}
.life-aino-card--tight{padding-bottom:.85rem}
.life-tag-row{display:flex;align-items:center;flex-wrap:wrap;gap:.45rem;margin-bottom:.65rem}
.life-aigc{font-size:10px;font-weight:600;color:var(--muted);border:1px solid var(--panel-br);border-radius:999px;padding:.12rem .45rem;background:rgba(255,255,255,.6)}
.life-dot{width:8px;height:8px;border-radius:999px;flex-shrink:0}
.life-dot--meal{background:#f59e0b}
.life-dot--sum{background:#8b5cf6}
.life-chip{
  display:inline-flex;align-items:center;gap:.2rem;border-radius:999px;border:1px solid var(--panel-br);
  padding:.18rem .55rem;font-size:11px;font-weight:600;letter-spacing:.04em;text-transform:uppercase;
  background:rgba(255,251,235,.85);color:#92400e;border-color:rgba(245,158,11,.35)
}
.life-chip--nut{background:rgba(244,244,245,.9);color:#52525b;border-color:rgba(24,24,27,.1)}
.life-chip--sum{background:rgba(245,243,255,.95);color:#5b21b6;border-color:rgba(139,92,246,.25)}
.life-chip-ic{display:inline-flex;align-items:center;opacity:.85}
.life-h3{font-size:13px;font-weight:600;line-height:1.25;margin:0 0 .25rem;color:var(--page-fg)}
.life-intro-muted{font-size:11px;color:var(--muted);margin:0 0 .65rem;line-height:1.45}
.life-remaining-line{font-size:11px;color:var(--muted);margin:0 0 .55rem;line-height:1.45}
.life-remaining-line strong{font-weight:600;color:var(--page-fg);font-variant-numeric:tabular-nums}
.life-strategy{
  margin-top:.65rem;border-radius:.75rem;border:1px solid var(--panel-br);
  background:rgba(244,244,245,.88);padding:.75rem .8rem;
}
.life-strategy-row{display:flex;align-items:flex-start;gap:.55rem}
.life-strategy-ic{
  flex-shrink:0;width:28px;height:28px;border-radius:.45rem;
  background:rgba(16,185,129,.12);display:flex;align-items:center;justify-content:center;
}
.life-strategy-ic svg{display:block}
.life-strategy-body{min-width:0;flex:1}
.life-strategy-t{font-size:13px;font-weight:600;margin:.15rem 0 .35rem;color:var(--page-fg)}
.life-strategy ul{margin:.2rem 0 0;padding-left:1rem;font-size:12px;color:#3f3f46;line-height:1.55}
.life-strategy li{margin:.22rem 0}
.life-strategy-tip{margin:.45rem 0 0;font-size:12px;color:var(--muted);line-height:1.5}
.life-img-frame{margin:.35rem 0 .65rem;border-radius:.75rem;overflow:hidden;border:1px solid var(--panel-br);background:rgba(244,244,245,.5)}
.life-img-frame img{display:block;width:100%;height:auto;max-height:220px;object-fit:cover}
.life-inner-panel{
  margin-top:.35rem;border-radius:.75rem;border:1px solid var(--panel-br);
  background:var(--panel);padding:.75rem .8rem;
}
.life-kicker{display:block;font-size:10px;font-weight:600;letter-spacing:.06em;color:var(--muted);text-transform:uppercase;margin-bottom:.35rem}
.life-food-line{display:flex;align-items:center;gap:.35rem;margin:.15rem 0 .35rem}
.life-ic{flex-shrink:0;display:block}
.life-food-name{font-size:13px;font-weight:600}
.life-kcal-row{display:flex;align-items:baseline;gap:.25rem;margin-top:.15rem}
.life-kcal-num{font-size:1.35rem;font-weight:700;tabular-nums;color:#b45309}
.life-kcal-unit{font-size:12px;font-weight:600;color:var(--muted)}
.life-macro-bar{display:flex;height:8px;border-radius:999px;overflow:hidden;background:#e4e4e7;margin-top:.55rem}
.life-macro-seg{min-width:3px}
.life-macro-c{background:var(--blue)}
.life-macro-p{background:var(--emerald)}
.life-macro-f{background:#f59e0b}
.life-macro-legend{display:flex;flex-wrap:wrap;gap:.45rem .65rem;margin-top:.4rem;font-size:11px;font-weight:600;tabular-nums}
.life-ml-c{color:#2563eb}.life-ml-p{color:var(--emerald)}.life-ml-f{color:#d97706}
.life-verdict{margin-top:.65rem;padding-top:.55rem;border-top:1px dashed var(--panel-br)}
.life-verdict-reason{margin:.35rem 0 0;font-size:12px;color:#3f3f46;line-height:1.5}
.life-pill{display:inline-flex;align-items:center;border-radius:999px;padding:.22rem .6rem;font-size:11px;font-weight:600}
.life-pill--sm{padding:.15rem .45rem;font-size:10px}
.life-pill--ok{background:rgba(16,185,129,.15);color:#047857}
.life-pill--warn{background:rgba(245,158,11,.18);color:#b45309}
.life-pill--bad{background:rgba(244,63,94,.14);color:#be123c}
.life-pill--muted{background:rgba(113,113,122,.12);color:#52525b}
.life-daily-grid{padding:.65rem .75rem}
.life-dg-row{display:flex;justify-content:space-between;align-items:center;gap:.5rem;font-size:12px;padding:.2rem 0}
.life-dg-l{color:var(--muted);display:inline-flex;align-items:center;gap:.25rem;min-width:0}
.life-dg-r{font-weight:600;tabular-nums;color:var(--page-fg);flex-shrink:0}
.life-dg-sep{border-top:1px solid var(--panel-br);margin-top:.15rem;padding-top:.45rem}
.life-dg-em{color:#b45309}
.life-dg-vi{color:#6d28d9}
.life-dg-prog{margin-top:.55rem;padding-top:.45rem;border-top:1px solid var(--panel-br)}
.life-dg-prog-label{display:flex;align-items:center;justify-content:space-between;gap:.5rem;font-size:11px;color:var(--muted);margin-bottom:.35rem}
.life-bar-track{height:8px;border-radius:999px;background:#e4e4e7;overflow:hidden}
.life-bar-fill{height:100%;border-radius:999px;background:linear-gradient(90deg,var(--emerald),#34d399);transition:width .3s ease}
.life-foot-hint{margin:.55rem 0 0;font-size:11px;color:var(--muted);display:flex;align-items:center;gap:.25rem}
.life-user-slot{font-size:12px;color:var(--muted)}
.life-md{font-size:13px;line-height:1.55;color:#3f3f46}
.life-md p{margin:.35rem 0}
.life-md p:first-child{margin-top:0}
.life-md p:last-child{margin-bottom:0}
.life-md ul{margin:.35rem 0;padding-left:1.1rem}
.life-md h2,.life-md h3{font-size:13px;font-weight:600;margin:.5rem 0 .25rem;color:var(--page-fg)}
`;

/** 单文件 HTML：AINO 生活助手卡片风 + 森绿浅底 */
export function buildLifeAssistantSingleFileHtml(inp: LifeShellInput): string {
  const title = inp.page_title.trim();
  const h1 = inp.heading_h1.trim() || title;
  const sub = inp.subtitle.trim();
  return `<!DOCTYPE html>
<html lang="${escapeHtml(inp.lang)}">
<head>
<meta charset="utf-8"/>
<meta name="viewport" content="width=device-width, initial-scale=1"/>
<title>${escapeHtml(title)}</title>
<style>${CSS}</style>
</head>
<body>
<div class="life-page">
  <header class="life-page-head">
    <h1 class="life-h1">${escapeHtml(h1)}</h1>
    <p class="life-sub">${escapeHtml(sub)}</p>
  </header>
  <div class="life-stack">
${inp.stack_html}
  </div>
</div>
</body>
</html>`;
}
