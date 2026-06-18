import { escapeAttr, escapeHtml, safeHttpUrl } from './escape';
import type { MarketDashboardReport, MarketDashboardSignal } from './market-report';
import { renderMarketBaseCss } from './market-style';

export function renderMarketDashboardHtml(report: MarketDashboardReport): string {
  const top = report.signals[0];
  const avgScore = report.signals.length
    ? Math.round(report.signals.reduce((sum, item) => sum + item.score, 0) / report.signals.length)
    : 0;
  const evidenceCount =
    report.signals.reduce((sum, item) => sum + item.evidence.length, 0) + report.sources.length;
  const riskCount = report.signals.filter((item) => item.label === 'risk').length;

  return `<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${escapeHtml(report.title)} · AI Market Intelligence</title>
  <style>
    ${renderMarketBaseCss()}
    :root { --accent: ${escapeAttr(report.accent)}; }
  </style>
</head>
<body>
  <main class="page">
    <header class="ticker-tape">
      <span>${escapeHtml(report.preparedFor)}</span>
      <strong class="center">Market Intelligence</strong>
      <span class="right">${escapeHtml(report.asOf)}</span>
    </header>

    <section class="hero">
      <div class="hero-main">
        <span class="eyebrow">${escapeHtml(report.reportType.replace(/_/g, ' '))}</span>
        <h1>${escapeHtml(report.title)}</h1>
        <p class="hero-summary">${escapeHtml(report.summary)}</p>
        <div class="hero-meta">
          <div class="hero-stat"><b>${report.signals.length}</b><span>Signals</span></div>
          <div class="hero-stat"><b>${top ? top.score : 0}</b><span>Top score</span></div>
          <div class="hero-stat"><b>${avgScore}</b><span>Average score</span></div>
          <div class="hero-stat"><b>${evidenceCount}</b><span>Evidence</span></div>
        </div>
      </div>
      <aside class="brief">
        <h2>${escapeHtml(report.subtitle)}</h2>
        ${report.marketContext ? `<p>${escapeHtml(report.marketContext)}</p>` : ''}
        <div class="metrics">
          <div class="metric"><b>${riskCount}</b><span>Risk signals</span></div>
          <div class="metric"><b>${report.sections.length}</b><span>Data blocks</span></div>
          <div class="metric"><b>${report.dataGaps.length}</b><span>Data gaps</span></div>
          <div class="metric"><b>${report.sources.length}</b><span>Direct sources</span></div>
        </div>
        ${renderDataGaps(report)}
      </aside>
    </section>

    ${renderSignals(report)}
    ${renderSections(report)}
    ${renderEvidence(report)}
  </main>
</body>
</html>`;
}

function renderSignals(report: MarketDashboardReport): string {
  if (!report.signals.length) {
    return `<section class="section"><div class="section-head"><h2>Signal Board</h2><p>No ranked market signal was provided.</p></div><div class="empty">没有结构化信号。请让上游数据插件输出 events/signals，并让 Agent 填入 report_json。</div></section>`;
  }

  return `<section class="section">
    <div class="section-head">
      <h2>Signal Board</h2>
      <p>按分数、证据质量和市场影响排序。这里展示的是情报线索，不是买卖建议。</p>
    </div>
    <div class="signal-grid">
      ${report.signals
        .slice(0, 9)
        .map((signal, index) => renderSignal(signal, index === 0))
        .join('')}
    </div>
  </section>`;
}

function renderSignal(signal: MarketDashboardSignal, primary: boolean): string {
  const chips = [
    signal.ticker ? `$${signal.ticker}` : '',
    signal.entity,
    signal.eventType,
    signal.direction,
    ...signal.tags
  ].filter(Boolean);
  return `<article class="${primary ? 'signal primary' : 'signal'}">
    <div class="signal-top">
      <span class="badge">${escapeHtml(signal.label)}</span>
      <b class="score">${signal.score}</b>
    </div>
    <h3>${escapeHtml(signal.title)}</h3>
    ${signal.summary ? `<p>${escapeHtml(signal.summary)}</p>` : ''}
    ${signal.whyItMatters ? `<p><strong>Why it matters:</strong> ${escapeHtml(signal.whyItMatters)}</p>` : ''}
    ${signal.delayOrLimitation ? `<p><strong>Delay:</strong> ${escapeHtml(signal.delayOrLimitation)}</p>` : ''}
    ${signal.nextVerification ? `<p><strong>Next check:</strong> ${escapeHtml(signal.nextVerification)}</p>` : ''}
    ${
      chips.length
        ? `<div class="chips">${chips
            .slice(0, 7)
            .map((chip) => `<span class="chip">${escapeHtml(chip)}</span>`)
            .join('')}</div>`
        : ''
    }
  </article>`;
}

function renderSections(report: MarketDashboardReport): string {
  if (!report.sections.length) return '';
  return `<section class="section">
    <div class="section-head">
      <h2>Market Blocks</h2>
      <p>结构化资金流、事件分组或主题暴露，由插件输入直接决定。</p>
    </div>
    ${report.sections
      .map(
        (section) => `<div class="section">
          <div class="section-head"><h2>${escapeHtml(section.title)}</h2><p>${escapeHtml(section.subtitle || '')}</p></div>
          <div class="metrics">
            ${section.items
              .slice(0, 8)
              .map(
                (item) => `<div class="metric">
                  <b>${escapeHtml(item.value ?? '—')}</b>
                  <span>${escapeHtml(item.label)}${item.note ? ` · ${escapeHtml(item.note)}` : ''}</span>
                </div>`
              )
              .join('')}
          </div>
        </div>`
      )
      .join('')}
  </section>`;
}

function renderEvidence(report: MarketDashboardReport): string {
  const rows = [
    ...report.sources,
    ...report.signals.flatMap((signal) =>
      signal.evidence.map((item) => ({
        ...item,
        signalTitle: signal.title
      }))
    )
  ].slice(0, 20);

  if (!rows.length) {
    return `<section class="section"><div class="section-head"><h2>Evidence Ledger</h2><p>No source evidence was provided.</p></div><div class="empty">缺少来源证据。正式报告必须由上游插件保留 sourceName、url、confidence 和 delayLabel。</div></section>`;
  }

  return `<section class="section">
    <div class="section-head">
      <h2>Evidence Ledger</h2>
      <p>来源、延迟和置信度保留在页面里，方便复盘和核验。</p>
    </div>
    <table class="evidence-table">
      <thead><tr><th>Signal</th><th>Source</th><th>Type</th><th>Confidence</th><th>Delay</th></tr></thead>
      <tbody>
        ${rows
          .map((row: any) => {
            const url = safeHttpUrl(row.url);
            const source = url
              ? `<a href="${escapeAttr(url)}" target="_blank" rel="noreferrer">${escapeHtml(row.sourceName)}</a>`
              : escapeHtml(row.sourceName);
            return `<tr>
              <td>${escapeHtml(row.signalTitle || report.title)}</td>
              <td>${source}</td>
              <td>${escapeHtml(row.sourceType || 'source')}</td>
              <td>${escapeHtml(row.confidence ?? '—')}</td>
              <td>${escapeHtml(row.delayLabel || row.publishedAt || 'unknown')}</td>
            </tr>`;
          })
          .join('')}
      </tbody>
    </table>
  </section>`;
}

function renderDataGaps(report: MarketDashboardReport): string {
  if (!report.dataGaps.length) return '';
  return `<div class="gap-list">${report.dataGaps
    .slice(0, 6)
    .map((gap) => `<span>${escapeHtml(gap)}</span>`)
    .join('')}</div>`;
}
