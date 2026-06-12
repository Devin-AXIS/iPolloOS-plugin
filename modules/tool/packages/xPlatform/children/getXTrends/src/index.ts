import { getErrText } from '@tool/utils/err';
import { z } from 'zod';
import { getTrendsByWoeid } from '../../../lib/client';
import { stringifyJson } from '../../../lib/format';
import { XReadConfigSchema } from '../../../lib/schemas';

const RegionSchema = z
  .enum(['worldwide', 'united_states', 'china', 'japan', 'singapore', 'united_kingdom'])
  .default('worldwide');
const TopicSchema = z.enum(['all', 'ai', 'blockchain', 'custom']).default('all');

const REGION_MAP: Record<z.infer<typeof RegionSchema>, { label: string; woeid: number }> = {
  worldwide: { label: '全球', woeid: 1 },
  united_states: { label: '美国', woeid: 23424977 },
  china: { label: '中国', woeid: 23424781 },
  japan: { label: '日本', woeid: 23424856 },
  singapore: { label: '新加坡', woeid: 23424948 },
  united_kingdom: { label: '英国', woeid: 23424975 }
};

export const InputType = XReadConfigSchema.and(
  z.object({
    region: RegionSchema,
    topic: TopicSchema,
    custom_keywords: z.string().max(2048).optional()
  })
);

export const OutputType = z.object({
  trends_markdown: z.string(),
  trends_json: z.string(),
  matched_keywords: z.string(),
  result_count: z.number(),
  system_error: z.string().optional()
});

type In = z.infer<typeof InputType>;
type Out = z.infer<typeof OutputType>;

const TOPIC_KEYWORDS: Record<z.infer<typeof TopicSchema>, string[]> = {
  all: [],
  ai: [
    'ai',
    'artificial intelligence',
    'chatgpt',
    'openai',
    'claude',
    'gemini',
    'grok',
    'llm',
    'agent',
    'machine learning',
    'deepseek',
    'nvidia'
  ],
  blockchain: [
    'blockchain',
    'crypto',
    'bitcoin',
    'btc',
    'ethereum',
    'eth',
    'solana',
    'web3',
    'defi',
    'nft',
    'binance',
    'coinbase',
    'stablecoin'
  ],
  custom: []
};

const TOPIC_LABELS: Record<z.infer<typeof TopicSchema>, string> = {
  all: '全部',
  ai: 'AI 相关',
  blockchain: '区块链相关',
  custom: '自定义关键词'
};

function parseKeywords(topic: z.infer<typeof TopicSchema>, customKeywords?: string): string[] {
  if (topic !== 'custom') return TOPIC_KEYWORDS[topic];
  return String(customKeywords ?? '')
    .split(/[\s,，;；]+/)
    .map((item) => item.trim())
    .filter(Boolean)
    .slice(0, 50);
}

function keywordMatchesTrend(trendName: string, keywords: string[]): string[] {
  const normalized = trendName.toLowerCase();
  return keywords.filter((keyword) => normalized.includes(keyword.toLowerCase()));
}

function filterTrends<T extends { trend_name: string }>(trends: T[], keywords: string[]) {
  if (!keywords.length) {
    return {
      trends,
      matches: new Map<string, string[]>()
    };
  }

  const matches = new Map<string, string[]>();
  const filtered = trends.filter((trend) => {
    const hit = keywordMatchesTrend(trend.trend_name, keywords);
    if (hit.length) matches.set(trend.trend_name, hit);
    return hit.length > 0;
  });
  return {
    trends: filtered,
    matches
  };
}

function formatTrends(
  regionLabel: string,
  topicLabel: string,
  trends: Array<{ trend_name: string; tweet_count?: number }>,
  matches: Map<string, string[]>
) {
  if (!trends.length) {
    return `# X 热门趋势：${regionLabel} · ${topicLabel}\n\n未查询到匹配趋势。官方 Trends 接口只返回地区 Top 趋势；如果主题没有进入 Top 50，这里不会出现。`;
  }
  const lines = [
    `# X 热门趋势：${regionLabel} · ${topicLabel}`,
    '',
    `共返回 ${trends.length} 条。`
  ];
  trends.forEach((trend, index) => {
    const matched = matches.get(trend.trend_name);
    lines.push(
      `${index + 1}. ${trend.trend_name}${
        typeof trend.tweet_count === 'number' ? ` - ${trend.tweet_count} posts` : ''
      }${matched?.length ? ` · 匹配：${matched.join(', ')}` : ''}`
    );
  });
  return lines.join('\n');
}

function emptyOutput(systemError?: string): Out {
  return {
    trends_markdown: '',
    trends_json: '[]',
    matched_keywords: '',
    result_count: 0,
    system_error: systemError
  };
}

export async function tool(props: In): Promise<Out> {
  try {
    const input = InputType.parse(props);
    const region = REGION_MAP[input.region];
    const keywords = parseKeywords(input.topic, input.custom_keywords);
    const data = await getTrendsByWoeid(input, {
      woeid: region.woeid,
      maxTrends: 50
    });
    const filtered = filterTrends(data.data, keywords);

    return {
      trends_markdown: formatTrends(
        region.label,
        TOPIC_LABELS[input.topic],
        filtered.trends,
        filtered.matches
      ),
      trends_json: stringifyJson(filtered.trends),
      matched_keywords: keywords.join(', '),
      result_count: filtered.trends.length
    };
  } catch (e: unknown) {
    return emptyOutput(getErrText(e));
  }
}
