export function renderMarketBaseCss(): string {
  return `
    :root {
      color-scheme: light;
      --paper: #f4f5f0;
      --panel: #fbfcf7;
      --ink: #111719;
      --muted: #66716b;
      --line: #d8ded6;
      --grid: rgba(17,23,25,.08);
      --green: #2fbf7a;
      --red: #e35656;
      --amber: #d9a441;
      --blue: #4f8cff;
      --dark: #101417;
      --accent: #35c987;
    }
    * { box-sizing: border-box; }
    html, body { margin: 0; background: var(--paper); color: var(--ink); font-family: ui-sans-serif, -apple-system, BlinkMacSystemFont, "Segoe UI", "Noto Sans SC", "PingFang SC", Arial, sans-serif; letter-spacing: 0; }
    body { overflow-x: hidden; }
    a { color: inherit; text-decoration: none; }
    h1, h2, h3, p, span, small, strong, b, td, th { margin: 0; overflow-wrap: anywhere; }
    .page { max-width: 1360px; margin: 0 auto; padding: 24px 22px 72px; }
    .ticker-tape { display: grid; grid-template-columns: 1fr auto 1fr; gap: 14px; align-items: center; border-top: 5px solid var(--ink); border-bottom: 1px solid var(--ink); padding: 12px 0; font-size: 11px; font-weight: 900; text-transform: uppercase; }
    .ticker-tape .center { font-family: Georgia, "Times New Roman", serif; font-size: 30px; text-transform: none; }
    .ticker-tape .right { color: var(--muted); text-align: right; }
    .hero { margin-top: 18px; display: grid; grid-template-columns: minmax(0, 1.25fr) minmax(280px, .75fr); gap: 16px; min-height: 430px; }
    .hero-main { position: relative; overflow: hidden; min-width: 0; background: var(--dark); color: #f8fbf5; padding: clamp(24px, 3.4vw, 42px); isolation: isolate; }
    .hero-main::before { content: ""; position: absolute; inset: 0; z-index: 0; background: linear-gradient(135deg, color-mix(in srgb, var(--accent) 78%, transparent) 0%, transparent 34%), linear-gradient(180deg, rgba(255,255,255,.08) 0 1px, transparent 1px 42px), linear-gradient(90deg, rgba(255,255,255,.06) 0 1px, transparent 1px 42px); opacity: .82; }
    .hero-main > * { position: relative; z-index: 1; }
    .eyebrow { display: inline-flex; width: fit-content; border: 1px solid rgba(248,251,245,.42); padding: 7px 9px; color: rgba(248,251,245,.78); font-size: 10px; font-weight: 950; text-transform: uppercase; }
    h1 { max-width: 900px; margin-top: 34px; font-family: Georgia, "Times New Roman", serif; font-size: clamp(46px, 6.6vw, 88px); line-height: .88; font-weight: 850; }
    .hero-summary { max-width: 780px; margin-top: 20px; color: rgba(248,251,245,.8); font-size: clamp(15px, 1.7vw, 20px); line-height: 1.5; }
    .hero-meta { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); margin-top: 34px; border-top: 1px solid rgba(248,251,245,.24); border-left: 1px solid rgba(248,251,245,.18); }
    .hero-stat { min-width: 0; padding: 13px; border-right: 1px solid rgba(248,251,245,.18); border-bottom: 1px solid rgba(248,251,245,.18); background: rgba(248,251,245,.08); }
    .hero-stat b { display: block; font-family: Georgia, "Times New Roman", serif; font-size: 28px; line-height: 1; }
    .hero-stat span { display: block; margin-top: 7px; color: rgba(248,251,245,.62); font-size: 10px; font-weight: 900; text-transform: uppercase; }
    .brief { min-width: 0; background: var(--panel); border: 1px solid var(--line); padding: 20px; display: grid; align-content: start; gap: 16px; }
    .brief h2 { font-family: Georgia, "Times New Roman", serif; font-size: 32px; line-height: 1; }
    .brief p { color: var(--muted); font-size: 13px; line-height: 1.6; }
    .gap-list { display: grid; gap: 8px; }
    .gap-list span { display: block; border-left: 5px solid var(--amber); background: #fff7df; padding: 10px; color: #6e5820; font-size: 12px; font-weight: 800; }
    .section { margin-top: 26px; }
    .section-head { display: flex; justify-content: space-between; gap: 20px; align-items: end; border-bottom: 3px solid var(--ink); padding-bottom: 10px; margin-bottom: 16px; }
    .section-head h2 { font-family: Georgia, "Times New Roman", serif; font-size: clamp(34px, 4.8vw, 52px); line-height: .92; }
    .section-head p { max-width: 560px; color: var(--muted); font-size: 13px; line-height: 1.5; text-align: right; }
    .signal-grid { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 14px; align-items: stretch; }
    .signal-grid.is-dense { grid-template-columns: repeat(4, minmax(0, 1fr)); }
    .signal { min-width: 0; background: var(--panel); border: 1px solid var(--line); padding: 16px; display: grid; align-content: start; gap: 12px; }
    .signal.primary { background: var(--dark); color: #f8fbf5; border-color: var(--dark); grid-column: span 2; }
    .signal-top { display: flex; justify-content: space-between; gap: 10px; align-items: start; }
    .badge { display: inline-flex; width: fit-content; border: 1px solid currentColor; padding: 5px 7px; color: var(--accent); font-size: 10px; font-weight: 950; text-transform: uppercase; }
    .score { font-family: Georgia, "Times New Roman", serif; font-size: 42px; line-height: .9; color: var(--accent); }
    .signal h3, .flow-row h3, .timeline-item h3, .exposure-card h3, .actor-row h3 { font-size: 20px; line-height: 1.18; }
    .signal p, .flow-row p, .timeline-item p, .exposure-card p, .actor-row p { color: var(--muted); font-size: 13px; line-height: 1.55; }
    .signal.primary p { color: rgba(248,251,245,.72); }
    .rank-label, .row-kicker { color: var(--muted); font-size: 10px; font-weight: 950; text-transform: uppercase; letter-spacing: 0; }
    .signal.primary .rank-label, .signal.primary .row-kicker { color: rgba(248,251,245,.66); }
    .chips { display: flex; flex-wrap: wrap; gap: 7px; }
    .chip { border: 1px solid var(--line); padding: 5px 7px; color: var(--muted); font-size: 10px; font-weight: 850; text-transform: uppercase; }
    .signal.primary .chip { border-color: rgba(248,251,245,.22); color: rgba(248,251,245,.7); }
    .mini-metrics { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 8px; }
    .mini-metrics span { min-width: 0; border-left: 4px solid var(--accent); background: rgba(17,23,25,.04); padding: 8px; }
    .mini-metrics b { display: block; font-size: 13px; line-height: 1.1; }
    .mini-metrics small { display: block; margin-top: 5px; color: var(--muted); font-size: 9px; font-weight: 900; text-transform: uppercase; }
    .signal.primary .mini-metrics span { background: rgba(248,251,245,.08); }
    .flow-ledger, .timeline-list, .actor-ledger { display: grid; gap: 12px; }
    .flow-row, .timeline-item, .actor-row { min-width: 0; background: var(--panel); border: 1px solid var(--line); display: grid; gap: 14px; padding: 14px; align-items: start; }
    .flow-row { grid-template-columns: 52px minmax(0, 1fr) 92px; }
    .row-rank, .actor-index, .timeline-marker { font-family: Georgia, "Times New Roman", serif; color: var(--accent); font-size: 32px; line-height: .9; }
    .row-main, .timeline-body, .actor-copy { display: grid; gap: 10px; min-width: 0; }
    .row-score, .timeline-score { border-left: 1px solid var(--line); padding-left: 12px; text-align: right; }
    .row-score b, .timeline-score b { display: block; font-family: Georgia, "Times New Roman", serif; font-size: 36px; line-height: .9; color: var(--accent); }
    .row-score span, .timeline-score span { display: block; margin-top: 7px; color: var(--muted); font-size: 10px; font-weight: 900; text-transform: uppercase; }
    .timeline-list { position: relative; }
    .timeline-list::before { content: ""; position: absolute; top: 10px; bottom: 10px; left: 27px; width: 1px; background: var(--line); }
    .timeline-item { position: relative; grid-template-columns: 52px minmax(0, 1fr) 92px; }
    .timeline-marker { position: relative; z-index: 1; background: var(--panel); }
    .exposure-grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 14px; }
    .exposure-grid.is-dense { grid-template-columns: repeat(3, minmax(0, 1fr)); }
    .exposure-card { min-width: 0; background: var(--panel); border: 1px solid var(--line); border-top: 5px solid var(--accent); padding: 16px; display: grid; gap: 12px; align-content: start; }
    .actor-row { grid-template-columns: 52px minmax(0, 1fr) minmax(180px, .34fr); }
    .actor-boundary { min-width: 0; border-left: 5px solid var(--amber); background: #fff7df; padding: 12px; color: #6e5820; font-size: 12px; font-weight: 800; line-height: 1.45; }
    .narrative-list { display: grid; gap: 12px; }
    .narrative-card { background: var(--panel); border: 1px solid var(--line); padding: 18px; }
    .narrative-card span { display: block; margin-bottom: 10px; color: var(--accent); font-size: 10px; font-weight: 950; text-transform: uppercase; }
    .narrative-card p { color: var(--ink); font-size: 14px; line-height: 1.75; white-space: pre-wrap; }
    .block-grid { display: grid; gap: 14px; }
    .data-block { min-width: 0; background: var(--panel); border: 1px solid var(--line); }
    .data-block-head { padding: 16px; border-bottom: 1px solid var(--line); display: grid; gap: 6px; }
    .data-block-head h3 { font-size: 18px; line-height: 1.2; }
    .data-block-head p { color: var(--muted); font-size: 12px; line-height: 1.5; }
    .metrics { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); border-top: 1px solid var(--line); border-left: 1px solid var(--line); background: var(--panel); }
    .data-block .metrics { border-top: 0; border-left: 0; }
    .metric { min-width: 0; padding: 14px; border-right: 1px solid var(--line); border-bottom: 1px solid var(--line); }
    .metric b { display: block; font-family: Georgia, "Times New Roman", serif; font-size: 28px; line-height: 1; }
    .metric span { display: block; margin-top: 7px; color: var(--muted); font-size: 10px; font-weight: 900; text-transform: uppercase; }
    .metric--green { background: rgba(47,191,122,.08); }
    .metric--red { background: rgba(227,86,86,.08); }
    .metric--amber { background: rgba(217,164,65,.12); }
    .metric--blue { background: rgba(79,140,255,.09); }
    .evidence-table { width: 100%; border-collapse: collapse; background: var(--panel); border: 1px solid var(--line); }
    .evidence-table th, .evidence-table td { border-bottom: 1px solid var(--line); padding: 12px; text-align: left; vertical-align: top; font-size: 12px; line-height: 1.45; }
    .evidence-table th { color: var(--muted); font-size: 10px; font-weight: 950; text-transform: uppercase; }
    .evidence-table tr:last-child td { border-bottom: 0; }
    .empty { background: var(--panel); border: 1px solid var(--line); padding: 22px; color: var(--muted); font-size: 14px; line-height: 1.6; }
    @media (max-width: 980px) {
      .ticker-tape, .hero, .section-head { grid-template-columns: 1fr; display: grid; }
      .ticker-tape .right, .section-head p { text-align: left; }
      .signal-grid, .signal-grid.is-dense, .exposure-grid, .exposure-grid.is-dense { grid-template-columns: 1fr; }
      .signal.primary { grid-column: auto; }
      .flow-row, .timeline-item, .actor-row { grid-template-columns: 1fr; }
      .timeline-list::before { display: none; }
      .row-score, .timeline-score { border-left: 0; padding-left: 0; text-align: left; }
      .hero-meta, .metrics { grid-template-columns: repeat(2, minmax(0, 1fr)); }
    }
    @media (max-width: 560px) {
      .page { padding: 16px 12px 56px; }
      .hero-main, .brief { padding: 18px; }
      h1 { font-size: 42px; }
      .hero-meta, .metrics { grid-template-columns: 1fr; }
      .evidence-table { display: block; overflow-x: auto; }
    }
  `;
}
