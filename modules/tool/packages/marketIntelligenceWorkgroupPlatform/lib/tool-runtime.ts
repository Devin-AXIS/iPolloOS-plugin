import { z } from 'zod';
import { buildMarketPageCover } from './market-page-cover';
import { type MarketDashboardType, normalizeMarketDashboardReport } from './market-report';
import { renderMarketDashboardHtml } from './market-render';

const emptyToDefault = (value: unknown, fallback = '') => {
  if (value == null) return fallback;
  if (typeof value === 'string') return value.trim() || fallback;
  return value;
};

export const DashboardInputType = z.object({
  report_json: z.union([z.string().min(1).max(1_500_000), z.record(z.string(), z.unknown())]),
  report_date: z
    .preprocess((value) => emptyToDefault(value), z.string().max(80))
    .optional()
    .default(''),
  prepared_for: z
    .preprocess((value) => emptyToDefault(value), z.string().max(160))
    .optional()
    .default(''),
  page_output_mode: z
    .enum(['auto_publish', 'resource_center', 'raw_html'])
    .optional()
    .default('auto_publish')
});

export const DashboardOutputType = z.object({
  page_html: z.string(),
  page_url: z.string(),
  page_cover: z.string(),
  summary: z.string(),
  system_error: z.string().optional()
});

export type DashboardInput = z.infer<typeof DashboardInputType>;
export type DashboardOutput = z.infer<typeof DashboardOutputType>;

export function createDashboardTool(params: {
  reportType: MarketDashboardType;
  fallbackTitle: string;
  summaryLabel: string;
}) {
  return async function tool(props: DashboardInput): Promise<DashboardOutput> {
    try {
      const input = DashboardInputType.parse(props);
      const report = normalizeMarketDashboardReport({
        reportJson: input.report_json,
        reportType: params.reportType,
        fallbackTitle: params.fallbackTitle,
        reportDate: input.report_date,
        preparedFor: input.prepared_for
      });
      const pageHtml = renderMarketDashboardHtml(report);
      return {
        page_html: pageHtml,
        page_url: '',
        page_cover: buildMarketPageCover(report),
        summary: `已生成 ${params.summaryLabel}：${report.title}，包含 ${report.signals.length} 个结构化信号。`
      };
    } catch (error: unknown) {
      return {
        page_html: '',
        page_url: '',
        page_cover: '',
        summary: '',
        system_error: getErrText(error)
      };
    }
  };
}

function getErrText(error: unknown): string {
  if (error instanceof Error) return error.message;
  return String(error);
}
