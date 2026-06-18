import { getErrText } from '@tool/utils/err';
import { z } from 'zod';
import { buildThemeCompanyMap, normalizeRelationRows } from '../../../lib/newsTheme';
import {
  NewsThemeConfigSchema,
  optionalJsonInput,
  stringifyJson,
  stringInput
} from '../../../lib/schemas';

export const InputType = NewsThemeConfigSchema.and(
  z.object({
    theme: stringInput(512),
    company_relations_json: optionalJsonInput,
    min_exposure_score: z.coerce.number().min(0).max(100).default(40)
  })
);

export const OutputType = z.object({
  relations_json: z.string(),
  summary_markdown: z.string(),
  count: z.number(),
  system_error: z.string().optional()
});

type In = z.infer<typeof InputType>;
type Out = z.infer<typeof OutputType>;

function emptyOutput(systemError?: string): Out {
  return {
    relations_json: '[]',
    summary_markdown: '',
    count: 0,
    system_error: systemError
  };
}

export async function tool(props: In): Promise<Out> {
  try {
    const input = InputType.parse(props);
    const theme = input.theme.trim();
    if (!theme) throw new Error('theme is required');

    const rows = normalizeRelationRows(input.company_relations_json);
    const relations = buildThemeCompanyMap({
      rows,
      theme,
      minExposureScore: input.min_exposure_score
    });

    return {
      relations_json: stringifyJson(relations),
      summary_markdown: formatSummary(
        theme,
        relations.length,
        Boolean(input.company_relations_json)
      ),
      count: relations.length
    };
  } catch (e: unknown) {
    return emptyOutput(getErrText(e));
  }
}

function formatSummary(theme: string, count: number, hasData: boolean): string {
  const lines = [`映射主题：${theme}`];
  if (!hasData) {
    lines.push(
      '',
      '未传入公司关系 JSON，当前仅完成主题解析。接入搜索/知识图谱/研究数据后可输出受益公司映射。'
    );
  } else {
    lines.push('', count ? `映射到 ${count} 个相关公司。` : '未发现达到暴露分阈值的相关公司。');
  }
  return lines.join('\n');
}
