import { getErrText } from '@tool/utils/err';
import { z } from 'zod';
import { analyzeSearchResults, buildQueries } from './analysis';
import { formatAnalysisMarkdown, formatSourceLinks, stringifyJson } from './format';
import { dedupeResults, searchWeb } from './search';
import {
  AnalysisFocusSchema,
  InvestorAnalysisConfigSchema,
  OutputLanguageSchema,
  type SearchResult
} from './schemas';

const emptyToUndefined = (v: unknown) =>
  v === '' || v === null || v === undefined ? undefined : v;

export const InputType = InvestorAnalysisConfigSchema.and(
  z.object({
    project: z.string().min(1).max(300),
    projectDescription: z.preprocess(emptyToUndefined, z.string().max(1000).optional()),
    market: z.preprocess(emptyToUndefined, z.string().max(120).optional().default('global')),
    stage: z.preprocess(emptyToUndefined, z.string().max(80).optional().default('unknown')),
    analysisFocus: AnalysisFocusSchema,
    maxResults: z.coerce.number().int().min(3).max(15).default(8),
    language: OutputLanguageSchema
  })
);

export const OutputType = z.object({
  report_markdown: z.string(),
  analysis_json: z.string(),
  search_results_json: z.string(),
  source_links: z.string(),
  investor_candidates_json: z.string(),
  risk_flags_json: z.string(),
  verification_questions: z.string(),
  system_error: z.string().optional()
});

type In = z.infer<typeof InputType>;
type Out = z.infer<typeof OutputType>;

async function collectSearchResults(input: In): Promise<SearchResult[]> {
  const queries = buildQueries({
    project: input.project,
    projectDescription: input.projectDescription,
    market: input.market,
    analysisFocus: input.analysisFocus,
    language: input.language
  });
  const chunks: SearchResult[][] = [];
  const errors: string[] = [];

  for (const query of queries) {
    try {
      chunks.push(await searchWeb(query, input.maxResults, input));
    } catch (error) {
      errors.push(error instanceof Error ? error.message : String(error));
    }
  }

  const results = dedupeResults(chunks.flat());
  if (!results.length && errors.length) {
    throw new Error(`网页搜索未返回结果：${errors.slice(0, 3).join('；')}`);
  }

  return results;
}

export async function tool(props: In): Promise<Out> {
  try {
    const input = InputType.parse(props);
    const results = await collectSearchResults(input);
    const analysis = analyzeSearchResults({
      project: input.project,
      projectDescription: input.projectDescription,
      market: input.market,
      stage: input.stage,
      analysisFocus: input.analysisFocus,
      language: input.language,
      results
    });

    return {
      report_markdown: formatAnalysisMarkdown(analysis, input.language),
      analysis_json: stringifyJson(analysis),
      search_results_json: stringifyJson(results),
      source_links: formatSourceLinks(results),
      investor_candidates_json: stringifyJson(analysis.investorCandidates),
      risk_flags_json: stringifyJson(analysis.riskFlags),
      verification_questions: analysis.verificationQuestions.join('\n')
    };
  } catch (e: unknown) {
    return {
      report_markdown: '',
      analysis_json: '{}',
      search_results_json: '[]',
      source_links: '',
      investor_candidates_json: '[]',
      risk_flags_json: '[]',
      verification_questions: '',
      system_error: getErrText(e)
    };
  }
}
