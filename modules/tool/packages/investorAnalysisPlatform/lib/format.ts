import type { InvestorAnalysis } from './analysis';
import type { SearchResult } from './schemas';

export function stringifyJson(value: unknown): string {
  return JSON.stringify(value, null, 2);
}

function formatResult(result: SearchResult, index: number): string {
  const snippet = result.snippet ? `\n  ${result.snippet}` : '';
  return `${index}. ${result.title}${snippet}\n  ${result.url}`;
}

function section(title: string, lines: string[]): string[] {
  if (!lines.length) return [];
  return [`## ${title}`, '', ...lines];
}

export function formatSourceLinks(results: SearchResult[]): string {
  return results.map((result, index) => `${index + 1}. ${result.title} - ${result.url}`).join('\n');
}

export function formatAnalysisMarkdown(
  analysis: InvestorAnalysis,
  language: 'zh-CN' | 'en'
): string {
  const cn = language === 'zh-CN';
  const lines = [
    `# ${cn ? '投资人分析' : 'Investor Analysis'}：${analysis.project}`,
    '',
    cn
      ? `> 说明：本报告基于公开网页搜索结果做线索整理和推断，不构成投资建议；关键事实需要用官方公告、工商/SEC 文件、投资数据库或一手访谈继续核验。`
      : `> Note: This report is based on public web search snippets and should be treated as research leads, not investment advice. Verify key facts with primary sources.`,
    '',
    `- ${cn ? '目标市场' : 'Market'}：${analysis.market}`,
    `- ${cn ? '融资阶段' : 'Stage'}：${analysis.stage}`,
    `- ${cn ? '分析重点' : 'Focus'}：${analysis.focus}`,
    `- ${cn ? '置信度' : 'Confidence'}：${analysis.confidence}`,
    '',
    `## ${cn ? '摘要' : 'Summary'}`,
    '',
    ...analysis.summary.map((item) => `- ${item}`),
    ''
  ];

  lines.push(
    ...section(
      cn ? '项目画像线索' : 'Company Profile Signals',
      analysis.companyProfileSignals.length
        ? analysis.companyProfileSignals.map(formatResult)
        : [cn ? '未找到足够清晰的项目画像线索。' : 'No clear company profile signal found.']
    ),
    '',
    ...section(
      cn ? '融资与投资人线索' : 'Funding and Investor Signals',
      analysis.fundingSignals.length
        ? analysis.fundingSignals.map(formatResult)
        : [cn ? '未找到明显融资/投资人公开线索。' : 'No obvious funding or investor signal found.']
    ),
    '',
    ...section(
      cn ? '疑似投资人/机构候选' : 'Possible Investor Candidates',
      analysis.investorCandidates.length
        ? analysis.investorCandidates.map(
            (item, index) =>
              `${index + 1}. ${item.name}（${cn ? '置信度' : 'confidence'}：${item.confidence}）\n  ${item.evidence}\n  ${item.sourceUrl}`
          )
        : [
            cn
              ? '搜索摘要中未能稳定抽取投资人或机构名称。'
              : 'No stable investor or firm name was extracted from snippets.'
          ]
    ),
    '',
    ...section(
      cn ? '市场、客户与商业化信号' : 'Market, Customer, and GTM Signals',
      analysis.marketSignals.length
        ? analysis.marketSignals.map(formatResult)
        : [cn ? '未找到明显市场/客户线索。' : 'No clear market/customer signal found.']
    ),
    '',
    ...section(
      cn ? '风险信号' : 'Risk Signals',
      analysis.riskFlags.length
        ? analysis.riskFlags.map(
            (item, index) =>
              `${index + 1}. ${item.title}（${cn ? '严重度' : 'severity'}：${item.severity}）\n  ${item.evidence}\n  ${item.sourceUrl}`
          )
        : [cn ? '未从搜索摘要中发现明显风险信号。' : 'No obvious risk signal found in snippets.']
    ),
    '',
    `## ${cn ? '待验证问题' : 'Verification Questions'}`,
    '',
    ...analysis.verificationQuestions.map((item) => `- ${item}`)
  );

  return lines.join('\n');
}
