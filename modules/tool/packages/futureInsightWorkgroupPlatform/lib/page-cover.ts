import type { FutureInsightReport } from './report';

export function buildFutureInsightPageCover(report: FutureInsightReport): string {
  const recipient =
    report.input.preparedFor || report.input.companyOrProduct[0] || report.input.industry;
  const signalChips = report.keySignals?.length ? report.keySignals.slice(0, 4) : [];
  const chips = [
    recipient,
    ...signalChips,
    ...report.input.regions.slice(0, signalChips.length ? 1 : 2)
  ].filter(Boolean);
  const fields = [
    { label: '行业', value: report.input.industry },
    {
      label: '新闻',
      value: String(report.newsWall.columns.reduce((sum, column) => sum + column.items.length, 0))
    },
    { label: '信号', value: String(report.signals.items.length) },
    { label: '行动', value: String(report.actions.items.length) }
  ];

  return JSON.stringify({
    variant: 'future-insight',
    eyebrow: '未来洞察系统',
    title: report.cover.headline,
    description: report.verdict.body,
    status: report.publication.dateLabel,
    actionLabel: '打开未来洞察报告',
    accentColor: '#f97316',
    coverImageUrl: report.cover.visual?.imageUrl || report.radar.visual?.imageUrl || '',
    chips,
    fields
  });
}
