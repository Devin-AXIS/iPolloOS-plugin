import type { MarketDashboardReport } from './market-report';

export function buildMarketPageCover(report: MarketDashboardReport): string {
  const top = report.signals[0];
  const chips = [
    report.reportType.replace(/_/g, ' '),
    top?.ticker,
    top?.label,
    ...report.signals.flatMap((item) => item.tags).slice(0, 3)
  ].filter(Boolean);

  const fields = [
    { label: 'Signals', value: String(report.signals.length) },
    { label: 'Top score', value: top ? String(top.score) : '0' },
    {
      label: 'Sources',
      value: String(
        report.sources.length || report.signals.reduce((sum, item) => sum + item.evidence.length, 0)
      )
    },
    { label: 'As of', value: report.asOf }
  ];

  return JSON.stringify({
    variant: 'market-intelligence',
    eyebrow: 'AI Market Intelligence',
    title: report.title,
    description: report.summary,
    status: report.asOf,
    actionLabel: '打开金融情报看板',
    accentColor: report.accent,
    chips: Array.from(new Set(chips)).slice(0, 6),
    fields
  });
}
