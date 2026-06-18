import { getErrText } from '@tool/utils/err';
import { z } from 'zod';
import {
  buildFinancialAnomalyEvents,
  fetchSecFinancialRows,
  normalizeFinancialRows
} from '../../../lib/sec';
import {
  optionalJsonInput,
  parseTickerList,
  SecConfigSchema,
  stringifyJson,
  stringInput
} from '../../../lib/schemas';

export const InputType = SecConfigSchema.and(
  z.object({
    symbols: stringInput(),
    financials_json: optionalJsonInput,
    revenue_change_threshold: z.coerce.number().min(1).max(200).default(10),
    margin_change_threshold: z.coerce.number().min(0.5).max(50).default(5),
    debt_change_threshold: z.coerce.number().min(1).max(300).default(20),
    share_change_threshold: z.coerce.number().min(0.5).max(100).default(5),
    min_signal_score: z.coerce.number().min(0).max(100).default(45)
  })
);

export const OutputType = z.object({
  financial_events_json: z.string(),
  summary_markdown: z.string(),
  count: z.number(),
  system_error: z.string().optional()
});

type In = z.infer<typeof InputType>;
type Out = z.infer<typeof OutputType>;

function emptyOutput(systemError?: string): Out {
  return {
    financial_events_json: '[]',
    summary_markdown: '',
    count: 0,
    system_error: systemError
  };
}

export async function tool(props: In): Promise<Out> {
  try {
    const input = InputType.parse(props);
    const symbols = parseTickerList(input.symbols);
    if (!symbols.length) throw new Error('symbols is required');

    const rows = input.financials_json
      ? normalizeFinancialRows(input.financials_json, symbols)
      : input.secUserAgent
        ? await fetchSecFinancialRows({
            symbols,
            userAgent: input.secUserAgent,
            apiBaseUrl: input.secApiBaseUrl,
            tickersUrl: input.secCompanyTickersUrl
          })
        : normalizeFinancialRows(input.financials_json, symbols);
    const events = buildFinancialAnomalyEvents({
      rows,
      minSignalScore: input.min_signal_score,
      revenueChangeThreshold: input.revenue_change_threshold,
      marginChangeThreshold: input.margin_change_threshold,
      debtChangeThreshold: input.debt_change_threshold,
      shareChangeThreshold: input.share_change_threshold
    });

    return {
      financial_events_json: stringifyJson(events),
      summary_markdown: formatSummary(
        symbols,
        events.length,
        input.financials_json
          ? 'provided_json'
          : input.secUserAgent
            ? 'sec_companyfacts'
            : 'watchlist_only'
      ),
      count: events.length
    };
  } catch (e: unknown) {
    return emptyOutput(getErrText(e));
  }
}

function formatSummary(
  symbols: string[],
  count: number,
  sourceMode: 'provided_json' | 'sec_companyfacts' | 'watchlist_only'
): string {
  const lines = [`扫描 ${symbols.length} 个股票的财务异动：${symbols.join(', ')}`];
  if (sourceMode === 'watchlist_only') {
    lines.push(
      '',
      '未传入财务数据 JSON，也未配置 SEC User-Agent，当前仅完成 watchlist 解析。配置后可查询 SEC Company Facts 官方免费结构化数据。'
    );
  } else {
    if (sourceMode === 'sec_companyfacts')
      lines.push('', '数据源：SEC Company Facts 官方免费结构化数据。');
    lines.push('', count ? `发现 ${count} 个财务异动事件。` : '未发现达到阈值的财务异动事件。');
  }
  return lines.join('\n');
}
