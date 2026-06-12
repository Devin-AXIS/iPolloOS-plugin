import type {
  AnalysisFocus,
  InvestorCandidate,
  OutputLanguage,
  RiskFlag,
  SearchResult
} from './schemas';

export type AnalysisInput = {
  project: string;
  projectDescription?: string;
  market: string;
  stage: string;
  analysisFocus: AnalysisFocus;
  language: OutputLanguage;
  results: SearchResult[];
};

export type InvestorAnalysis = {
  project: string;
  market: string;
  stage: string;
  focus: AnalysisFocus;
  confidence: 'low' | 'medium' | 'high';
  summary: string[];
  companyProfileSignals: SearchResult[];
  fundingSignals: SearchResult[];
  marketSignals: SearchResult[];
  customerOrPartnerSignals: SearchResult[];
  investorCandidates: InvestorCandidate[];
  riskFlags: RiskFlag[];
  verificationQuestions: string[];
};

const fundingRe =
  /\b(fundraising|raised|raises|funding|financing|seed|series [abc]|pre-seed|venture|vc|capital|investor|investment|backed|round|融资|投资|领投|跟投|天使轮|种子轮|A轮|B轮|资本)\b/i;
const marketRe =
  /\b(market|competitor|alternative|customer|pricing|revenue|growth|traction|users|partnership|case study|行业|市场|竞品|客户|收入|增长|合作|案例|商业化)\b/i;
const riskRe =
  /\b(lawsuit|fraud|scam|complaint|controversy|shutdown|bankrupt|security|privacy|regulation|risk|negative|诉讼|欺诈|投诉|争议|倒闭|破产|安全|隐私|监管|风险|负面)\b/i;
const profileRe =
  /\b(about|company|official|homepage|launch|product|founder|team|docs|github|公司|官网|产品|创始人|团队|发布)\b/i;

function textOf(result: SearchResult): string {
  return `${result.title} ${result.snippet} ${result.url}`;
}

function includesInvestorName(text: string): string[] {
  const candidates = new Set<string>();
  const patterns = [
    /\b([A-Z][A-Za-z0-9&.-]*(?:\s+[A-Z][A-Za-z0-9&.-]*){0,4}\s+(?:Capital|Ventures|Partners|VC|Fund|Labs|Accelerator))\b/g,
    /([\u4e00-\u9fa5A-Za-z0-9&. -]{2,40}(?:资本|创投|基金|投资|加速器))/g
  ];

  for (const pattern of patterns) {
    for (const match of text.matchAll(pattern)) {
      const name = match[1]?.replace(/\s+/g, ' ').trim();
      if (name && name.length >= 3) candidates.add(name);
    }
  }

  return [...candidates].slice(0, 8);
}

function confidenceFrom(count: number): 'low' | 'medium' | 'high' {
  if (count >= 8) return 'high';
  if (count >= 4) return 'medium';
  return 'low';
}

function categorize(result: SearchResult): SearchResult {
  const text = textOf(result);
  if (riskRe.test(text)) return { ...result, category: 'risk_signal' };
  if (fundingRe.test(text)) return { ...result, category: 'funding_signal' };
  if (marketRe.test(text)) return { ...result, category: 'market_signal' };
  if (profileRe.test(text)) return { ...result, category: 'company_profile' };
  return { ...result, category: 'general' };
}

export function buildQueries(input: {
  project: string;
  projectDescription?: string;
  market: string;
  analysisFocus: AnalysisFocus;
  language: OutputLanguage;
}): string[] {
  const context = [input.project, input.projectDescription, input.market]
    .map((item) => item?.trim())
    .filter(Boolean)
    .join(' ');
  const cn = input.language === 'zh-CN';

  const base = [
    `${context} company product official founder team`,
    `${context} funding investor venture capital seed series`,
    `${context} market competitors customers revenue traction`,
    `${context} risk lawsuit complaint controversy regulation`
  ];
  const chinese = [
    `${context} 公司 产品 官网 创始人 团队`,
    `${context} 融资 投资人 投资机构 资本`,
    `${context} 市场 竞品 客户 商业化 增长`,
    `${context} 风险 诉讼 投诉 争议 监管`
  ];

  const queries = cn ? [...base, ...chinese] : base;

  if (input.analysisFocus === 'fundraising') {
    return queries.filter((q) => /funding|investor|融资|投资/.test(q));
  }
  if (input.analysisFocus === 'investor_fit') {
    return [
      `${context} investors venture capital portfolio`,
      `${context} competitors investors funding round`,
      ...(cn ? [`${context} 投资机构 投资组合`, `${context} 竞品 投资人 融资`] : [])
    ];
  }
  if (input.analysisFocus === 'market_signals') {
    return queries.filter((q) => /market|competitors|customers|市场|竞品|客户/.test(q));
  }
  if (input.analysisFocus === 'risk_review') {
    return queries.filter((q) => /risk|lawsuit|complaint|风险|诉讼|投诉/.test(q));
  }

  return queries;
}

export function analyzeSearchResults(input: AnalysisInput): InvestorAnalysis {
  const categorized = input.results.map(categorize);
  const fundingSignals = categorized.filter((item) => item.category === 'funding_signal');
  const marketSignals = categorized.filter((item) => item.category === 'market_signal');
  const companyProfileSignals = categorized.filter((item) => item.category === 'company_profile');
  const riskSignals = categorized.filter((item) => item.category === 'risk_signal');
  const customerOrPartnerSignals = marketSignals.filter((item) =>
    /\b(customer|partner|case study|客户|合作|案例)\b/i.test(textOf(item))
  );

  const investorCandidates: InvestorCandidate[] = [];
  for (const result of fundingSignals) {
    const names = includesInvestorName(textOf(result));
    for (const name of names) {
      if (investorCandidates.some((item) => item.name.toLowerCase() === name.toLowerCase())) {
        continue;
      }
      investorCandidates.push({
        name,
        evidence: `${result.title}${result.snippet ? ` - ${result.snippet}` : ''}`,
        sourceUrl: result.url,
        confidence: fundingRe.test(result.title) ? 'medium' : 'low'
      });
    }
  }

  const riskFlags: RiskFlag[] = riskSignals.slice(0, 10).map((result) => ({
    title: result.title,
    evidence: result.snippet || result.title,
    sourceUrl: result.url,
    severity: /\b(fraud|scam|lawsuit|bankrupt|诉讼|欺诈|破产)\b/i.test(textOf(result))
      ? 'high'
      : 'medium'
  }));

  const cn = input.language === 'zh-CN';
  const summary = cn
    ? [
        `共整理 ${categorized.length} 条公开网页搜索线索。`,
        `融资/投资相关线索 ${fundingSignals.length} 条，市场/客户线索 ${marketSignals.length} 条，风险线索 ${riskFlags.length} 条。`,
        investorCandidates.length
          ? `识别到 ${investorCandidates.length} 个疑似投资人或机构名称，需进一步核验。`
          : '未从搜索摘要中稳定识别到明确投资人名称，建议继续补充 Crunchbase、PitchBook、工商信息或官方新闻稿。'
      ]
    : [
        `Collected ${categorized.length} public web search signals.`,
        `Found ${fundingSignals.length} funding/investor signals, ${marketSignals.length} market/customer signals, and ${riskFlags.length} risk signals.`,
        investorCandidates.length
          ? `Detected ${investorCandidates.length} possible investor names; verify before use.`
          : 'No reliable investor name was extracted from snippets; verify with official releases or investor databases.'
      ];

  const verificationQuestions = cn
    ? [
        '项目最近一轮融资金额、时间、领投方和跟投方是否有官方来源？',
        '投资机构是否真的投过同赛道、同阶段项目？是否存在利益冲突或竞品投资？',
        '项目的核心客户、收入、留存和增长指标是否可由一手材料验证？',
        '搜索到的风险、投诉或监管信息是否与当前主体直接相关，还是同名误匹配？'
      ]
    : [
        'Is the latest funding round confirmed by an official source?',
        'Have the candidate investors backed similar stage and category companies?',
        'Can customer, revenue, retention, and growth claims be verified with primary materials?',
        'Are risk results tied to this entity, or caused by name collisions?'
      ];

  return {
    project: input.project,
    market: input.market,
    stage: input.stage,
    focus: input.analysisFocus,
    confidence: confidenceFrom(categorized.length),
    summary,
    companyProfileSignals: companyProfileSignals.slice(0, 10),
    fundingSignals: fundingSignals.slice(0, 10),
    marketSignals: marketSignals.slice(0, 10),
    customerOrPartnerSignals: customerOrPartnerSignals.slice(0, 10),
    investorCandidates: investorCandidates.slice(0, 12),
    riskFlags,
    verificationQuestions
  };
}
