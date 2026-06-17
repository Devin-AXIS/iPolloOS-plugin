import { describe, expect, it } from 'vitest';
import { analyzeSearchResults, buildQueries } from '../lib/analysis';
import { formatAnalysisMarkdown } from '../lib/format';
import type { SearchResult } from '../lib/schemas';

const sampleResults: SearchResult[] = [
  {
    title: 'Acme AI raises seed funding led by Example Capital',
    url: 'https://example.com/acme-ai-seed',
    snippet: 'Acme AI raised a seed round from Example Capital and Beta Ventures.',
    source: 'test',
    query: 'Acme AI funding investor'
  },
  {
    title: 'Acme AI launches customer automation platform',
    url: 'https://example.com/acme-ai-launch',
    snippet: 'The company serves enterprise customers and reports strong usage growth.',
    source: 'test',
    query: 'Acme AI market customers'
  },
  {
    title: 'Acme AI privacy complaint review',
    url: 'https://example.com/acme-ai-risk',
    snippet: 'A privacy complaint mentions possible regulatory risk.',
    source: 'test',
    query: 'Acme AI risk complaint'
  }
];

describe('investor analysis', () => {
  it('builds focused fundraising queries', () => {
    const queries = buildQueries({
      project: 'Acme AI',
      market: 'US enterprise AI',
      analysisFocus: 'fundraising',
      language: 'zh-CN'
    });

    expect(queries.length).toBeGreaterThan(0);
    expect(queries.every((query) => /funding|investor|融资|投资/.test(query))).toBe(true);
  });

  it('extracts investor candidates and risk flags from search snippets', () => {
    const analysis = analyzeSearchResults({
      project: 'Acme AI',
      market: 'US',
      stage: 'seed',
      analysisFocus: 'full',
      language: 'en',
      results: sampleResults
    });

    expect(analysis.fundingSignals).toHaveLength(1);
    expect(analysis.marketSignals).toHaveLength(1);
    expect(analysis.riskFlags).toHaveLength(1);
    expect(analysis.investorCandidates.some((item) => item.name === 'Example Capital')).toBe(true);
  });

  it('formats a markdown report with source links', () => {
    const analysis = analyzeSearchResults({
      project: 'Acme AI',
      market: 'US',
      stage: 'seed',
      analysisFocus: 'full',
      language: 'zh-CN',
      results: sampleResults
    });
    const markdown = formatAnalysisMarkdown(analysis, 'zh-CN');

    expect(markdown).toContain('# 投资人分析：Acme AI');
    expect(markdown).toContain('Example Capital');
    expect(markdown).toContain('https://example.com/acme-ai-risk');
  });
});
