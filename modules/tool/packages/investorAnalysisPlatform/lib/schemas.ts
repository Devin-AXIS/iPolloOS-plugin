import { z } from 'zod';

const emptyToUndefined = (v: unknown) =>
  v === '' || v === null || v === undefined ? undefined : v;

export const InvestorAnalysisConfigSchema = z.object({
  searchProvider: z.preprocess(
    emptyToUndefined,
    z.enum(['auto', 'duckduckgo', 'serper']).optional().default('auto')
  ),
  serperApiKey: z.preprocess(emptyToUndefined, z.string().max(4096).optional()),
  timeoutMs: z.preprocess(
    emptyToUndefined,
    z.coerce.number().int().min(3000).max(60_000).optional().default(15_000)
  )
});

export const AnalysisFocusSchema = z
  .enum(['fundraising', 'investor_fit', 'market_signals', 'risk_review', 'full'])
  .default('full');

export const OutputLanguageSchema = z.enum(['zh-CN', 'en']).default('zh-CN');

export const SearchResultSchema = z.object({
  title: z.string(),
  url: z.string(),
  snippet: z.string().optional().default(''),
  source: z.string(),
  query: z.string(),
  category: z.string().optional().default('general')
});

export const InvestorCandidateSchema = z.object({
  name: z.string(),
  evidence: z.string(),
  sourceUrl: z.string(),
  confidence: z.enum(['low', 'medium', 'high'])
});

export const RiskFlagSchema = z.object({
  title: z.string(),
  evidence: z.string(),
  sourceUrl: z.string(),
  severity: z.enum(['low', 'medium', 'high'])
});

export type InvestorAnalysisConfig = z.infer<typeof InvestorAnalysisConfigSchema>;
export type AnalysisFocus = z.infer<typeof AnalysisFocusSchema>;
export type OutputLanguage = z.infer<typeof OutputLanguageSchema>;
export type SearchResult = z.infer<typeof SearchResultSchema>;
export type InvestorCandidate = z.infer<typeof InvestorCandidateSchema>;
export type RiskFlag = z.infer<typeof RiskFlagSchema>;
