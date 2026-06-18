import { z } from 'zod';
import { uploadFile } from '@tool/utils/uploadFile';
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
  page_storage_key: z.string().optional(),
  page_storage_size: z.number().optional(),
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
      const shouldPublish =
        input.page_output_mode === 'auto_publish' || input.page_output_mode === 'resource_center';
      const published = shouldPublish
        ? await publishDashboardHtml(pageHtml, params.reportType)
        : null;
      return {
        page_html: shouldPublish ? '' : pageHtml,
        page_url: published?.page_url ?? '',
        page_cover: buildMarketPageCover(report),
        page_storage_key: published?.page_storage_key,
        page_storage_size: published?.page_storage_size,
        summary: shouldPublish
          ? `已发布 ${params.summaryLabel}：${report.title}，包含 ${report.signals.length} 个结构化信号。`
          : `已生成 ${params.summaryLabel}：${report.title}，包含 ${report.signals.length} 个结构化信号。`
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

async function publishDashboardHtml(html: string, reportType: MarketDashboardType) {
  const { accessUrl, objectName, size } = await uploadFile({
    buffer: Buffer.from(html),
    defaultFilename: `market-intelligence-${reportType}-${Date.now()}.html`,
    contentType: 'text/html; charset=utf-8',
    contentDisposition: 'inline',
    keepRawFilename: true
  });

  return {
    page_url: accessUrl,
    page_storage_key: objectName,
    page_storage_size: size
  };
}

function getErrText(error: unknown): string {
  if (error instanceof Error) return error.message;
  return String(error);
}
