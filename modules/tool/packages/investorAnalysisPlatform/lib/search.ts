import { SearchResultSchema, type InvestorAnalysisConfig, type SearchResult } from './schemas';

type SerperOrganic = {
  title?: string;
  link?: string;
  snippet?: string;
};

type SerperResponse = {
  organic?: SerperOrganic[];
  news?: SerperOrganic[];
};

function timeoutSignal(ms: number): AbortSignal {
  const controller = new AbortController();
  setTimeout(() => controller.abort(), ms).unref?.();
  return controller.signal;
}

function normalizeResult(input: {
  title?: string;
  url?: string;
  snippet?: string;
  source: string;
  query: string;
}): SearchResult | null {
  const title = input.title?.trim();
  const url = input.url?.trim();
  if (!title || !url || !/^https?:\/\//i.test(url)) return null;
  if (/^https?:\/\/duckduckgo\.com\/y\.js\?/i.test(url)) return null;

  return SearchResultSchema.parse({
    title,
    url,
    snippet: input.snippet?.trim() || '',
    source: input.source,
    query: input.query
  });
}

async function searchWithDuckDuckGo(query: string, maxResults: number): Promise<SearchResult[]> {
  return searchWithDuckDuckGoHtml(query, maxResults);
}

function decodeHtml(value: string): string {
  return value
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#x27;/g, "'")
    .replace(/&#39;/g, "'");
}

function stripTags(value: string): string {
  return decodeHtml(
    value
      .replace(/<[^>]*>/g, ' ')
      .replace(/\s+/g, ' ')
      .trim()
  );
}

function normalizeDuckUrl(rawUrl: string): string {
  const decoded = decodeHtml(rawUrl);
  const absoluteUrl = decoded.startsWith('//') ? `https:${decoded}` : decoded;
  try {
    const url = new URL(absoluteUrl);
    const uddg = url.searchParams.get('uddg');
    return uddg ? decodeURIComponent(uddg) : absoluteUrl;
  } catch {
    return absoluteUrl;
  }
}

async function searchWithDuckDuckGoHtml(
  query: string,
  maxResults: number
): Promise<SearchResult[]> {
  const res = await fetch(`https://html.duckduckgo.com/html/?q=${encodeURIComponent(query)}`, {
    headers: {
      Accept: 'text/html',
      'User-Agent':
        'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36'
    }
  });
  const html = await res.text();
  if (!res.ok) throw new Error(`DuckDuckGo HTML search failed HTTP ${res.status}`);

  const linkRe = /<a[^>]+class="result__a"[^>]+href="([^"]+)"[^>]*>([\s\S]*?)<\/a>/g;
  const matches = [...html.matchAll(linkRe)];
  const results: SearchResult[] = [];

  for (let i = 0; i < matches.length; i += 1) {
    const linkMatch = matches[i];
    const nextMatch = matches[i + 1];
    const block = html.slice(linkMatch.index ?? 0, nextMatch?.index ?? html.length);
    const snippetMatch = block.match(/class="result__snippet"[^>]*>([\s\S]*?)<\/a>/);
    const result = normalizeResult({
      title: stripTags(linkMatch[2] ?? ''),
      url: normalizeDuckUrl(linkMatch[1] ?? ''),
      snippet: snippetMatch ? stripTags(snippetMatch[1] ?? '') : '',
      source: 'duckduckgo-html',
      query
    });
    if (result) results.push(result);
    if (results.length >= maxResults) break;
  }

  return results;
}

async function searchWithSerper(
  query: string,
  maxResults: number,
  config: InvestorAnalysisConfig
): Promise<SearchResult[]> {
  if (!config.serperApiKey)
    throw new Error('Serper API Key is required when searchProvider=serper');

  const res = await fetch('https://google.serper.dev/search', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-API-KEY': config.serperApiKey
    },
    body: JSON.stringify({ q: query, num: maxResults }),
    signal: timeoutSignal(config.timeoutMs)
  });

  const text = await res.text();
  if (!res.ok) {
    throw new Error(`Serper search failed HTTP ${res.status}: ${text.slice(0, 500)}`);
  }

  const data = JSON.parse(text) as SerperResponse;
  return [...(data.organic ?? []), ...(data.news ?? [])]
    .map((item) =>
      normalizeResult({
        title: item.title,
        url: item.link,
        snippet: item.snippet,
        source: 'serper',
        query
      })
    )
    .filter((item): item is SearchResult => Boolean(item))
    .slice(0, maxResults);
}

function chooseProvider(config: InvestorAnalysisConfig): 'duckduckgo' | 'serper' {
  if (config.searchProvider === 'serper') return 'serper';
  if (config.searchProvider === 'duckduckgo') return 'duckduckgo';
  return config.serperApiKey ? 'serper' : 'duckduckgo';
}

export async function searchWeb(
  query: string,
  maxResults: number,
  config: InvestorAnalysisConfig
): Promise<SearchResult[]> {
  const provider = chooseProvider(config);
  if (provider === 'serper') return searchWithSerper(query, maxResults, config);
  return searchWithDuckDuckGo(query, maxResults);
}

export function dedupeResults(results: SearchResult[]): SearchResult[] {
  const seen = new Set<string>();
  const output: SearchResult[] = [];

  for (const result of results) {
    const key = result.url
      .replace(/[?#].*$/, '')
      .replace(/\/+$/, '')
      .toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    output.push(result);
  }

  return output;
}
