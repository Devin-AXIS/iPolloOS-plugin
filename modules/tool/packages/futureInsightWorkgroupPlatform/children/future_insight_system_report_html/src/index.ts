import { z } from 'zod';
import { buildFutureInsightPageCover } from '../../../lib/page-cover';
import { normalizeFutureInsightReport } from '../../../lib/report';
import { renderFutureInsightHtml } from '../../../lib/render';

const emptyToDefault = (value: unknown, fallback = '') => {
  if (value == null) return fallback;
  if (typeof value === 'string') return value.trim() || fallback;
  return value;
};

const ListLikeSchema = z
  .union([z.string().max(100_000), z.array(z.unknown()), z.record(z.string(), z.unknown())])
  .optional()
  .default('');

const JsonLikeSchema = z.union([z.string().min(1).max(900_000), z.record(z.string(), z.unknown())]);

export const InputType = z.object({
  industry: z.preprocess((value) => emptyToDefault(value), z.string().min(1).max(160)),
  prepared_for: z
    .preprocess((value) => emptyToDefault(value), z.string().max(120))
    .optional()
    .default(''),
  preparedFor: z
    .preprocess((value) => emptyToDefault(value), z.string().max(120))
    .optional()
    .default(''),
  competitors: ListLikeSchema,
  regions: ListLikeSchema,
  report_json: JsonLikeSchema,
  report_date: z
    .preprocess((value) => emptyToDefault(value), z.string().max(80))
    .optional()
    .default(''),
  page_output_mode: z
    .enum(['auto_publish', 'resource_center', 'raw_html'])
    .optional()
    .default('auto_publish')
});

export const OutputType = z.object({
  page_html: z.string(),
  page_url: z.string(),
  page_cover: z.string(),
  summary: z.string(),
  system_error: z.string().optional()
});

type In = z.infer<typeof InputType>;
type Out = z.infer<typeof OutputType>;

function empty(system_error: string): Out {
  return {
    page_html: '',
    page_url: '',
    page_cover: '',
    summary: '',
    system_error
  };
}

export async function tool(props: In): Promise<Out> {
  try {
    const input = InputType.parse(props);
    const report = normalizeFutureInsightReport(input);
    const pageHtml = renderFutureInsightHtml(report);
    return {
      page_html: pageHtml,
      page_url: '',
      page_cover: buildFutureInsightPageCover(report),
      summary: `已生成 ${report.input.industry} 的未来洞察系统报告，包含新闻墙、关键信号、趋势雷达、影响判断和 7 天行动清单。`
    };
  } catch (error: unknown) {
    return empty(error instanceof Error ? error.message : String(error));
  }
}
