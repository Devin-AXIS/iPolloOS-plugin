import {
  type NewsThemeEvent,
  extractRows,
  numberOrUndefined,
  scoreEvent,
  sourceEvidence
} from './schemas';

type NewsRow = {
  symbol?: string;
  ticker?: string;
  symbols?: string[] | string;
  company?: string;
  title?: string;
  headline?: string;
  summary?: string;
  description?: string;
  eventType?: string;
  category?: string;
  sentiment?: string | number;
  relevance?: number;
  publishedAt?: string;
  sourceName?: string;
  url?: string;
};

type ThemeRow = {
  theme?: string;
  topic?: string;
  mentions?: number;
  previousMentions?: number;
  engagement?: number;
  sentiment?: number;
  sourceCount?: number;
  sourceName?: string;
  url?: string;
};

type RelationRow = {
  theme?: string;
  company?: string;
  symbol?: string;
  ticker?: string;
  relationship?: string;
  exposureScore?: number;
  evidence?: string;
  sourceName?: string;
  url?: string;
};

type EntitySignalRow = {
  entity?: string;
  name?: string;
  entityType?: 'person' | 'institution' | 'company';
  signalType?: string;
  title?: string;
  summary?: string;
  relatedSymbols?: string[] | string;
  relatedThemes?: string[] | string;
  marketImpact?: number;
  publishedAt?: string;
  sourceName?: string;
  url?: string;
};

export function normalizeNewsRows(raw: unknown): NewsRow[] {
  return extractRows(raw) as NewsRow[];
}

export function normalizeThemeRows(raw: unknown): ThemeRow[] {
  return extractRows(raw) as ThemeRow[];
}

export function normalizeRelationRows(raw: unknown): RelationRow[] {
  return extractRows(raw) as RelationRow[];
}

export function normalizeEntitySignalRows(raw: unknown): EntitySignalRow[] {
  return extractRows(raw) as EntitySignalRow[];
}

export function buildMarketNewsEvents(input: {
  rows: NewsRow[];
  minSignalScore: number;
  lookbackHours: number;
}) {
  const detectedAt = new Date().toISOString();
  const cutoff = Date.now() - input.lookbackHours * 60 * 60 * 1000;
  const events: NewsThemeEvent[] = [];

  for (const row of input.rows) {
    const publishedAt = row.publishedAt || '';
    if (publishedAt && Date.parse(publishedAt) < cutoff) continue;
    const title = row.title || row.headline || '';
    if (!title) continue;
    const eventType = normalizeNewsType(row.eventType || row.category || title);
    const tickers = parseRelated(row.symbols || row.symbol || row.ticker).map((item) =>
      item.toUpperCase()
    );
    const magnitude = materialityByNewsType(eventType, title);
    const sourceQuality = row.sourceName ? 75 : 55;
    const relevance = numberOrUndefined(row.relevance) ?? 70;
    const score = scoreEvent({
      magnitude,
      novelty: 70,
      sourceQuality,
      marketImpact: magnitude,
      userRelevance: relevance,
      confidence: sourceQuality
    });
    if (score.finalScore < input.minSignalScore) continue;

    events.push({
      eventId: `news:${tickers[0] || row.company || 'market'}:${eventType}:${publishedAt || detectedAt}:${hashText(title)}`,
      eventType: 'market_news',
      title,
      summary: row.summary || row.description || title,
      detectedAt,
      entities: [
        ...tickers.map((ticker) => ({ type: 'ticker' as const, name: ticker, ticker })),
        ...(row.company ? [{ type: 'company' as const, name: row.company }] : [])
      ],
      metrics: {
        newsType: eventType,
        relevance,
        sentiment: String(row.sentiment ?? ''),
        publishedAt
      },
      evidence: sourceEvidence({
        sourceName: row.sourceName,
        sourceType: 'news',
        confidence: sourceQuality,
        url: row.url,
        publishedAt
      }),
      scores: score,
      labels:
        eventType === 'lawsuit' || eventType === 'regulation'
          ? ['risk', 'needs_verification']
          : ['watch', 'needs_verification'],
      compliance: {
        isInvestmentAdvice: false,
        limitation: 'News signals require source verification and may already be priced in.'
      }
    });
  }

  return events.sort((a, b) => b.scores.finalScore - a.scores.finalScore);
}

export function buildThemeMomentumEvents(input: {
  rows: ThemeRow[];
  targetThemes: string[];
  minSignalScore: number;
  mentionSpikeRatio: number;
}) {
  const detectedAt = new Date().toISOString();
  const events: NewsThemeEvent[] = [];

  for (const row of input.rows) {
    const theme = row.theme || row.topic || '';
    if (!theme) continue;
    const mentions = numberOrUndefined(row.mentions) ?? 0;
    const previousMentions = numberOrUndefined(row.previousMentions) ?? 0;
    const spikeRatio =
      previousMentions > 0
        ? mentions / previousMentions
        : mentions > 0
          ? input.mentionSpikeRatio
          : 0;
    if (spikeRatio < input.mentionSpikeRatio && !targetMatches(input.targetThemes, theme)) continue;
    const engagement = numberOrUndefined(row.engagement) ?? 0;
    const sentiment = numberOrUndefined(row.sentiment) ?? 0;
    const score = scoreEvent({
      magnitude: Math.min(100, spikeRatio * 22 + Math.log10(Math.max(1, engagement)) * 6),
      novelty: spikeRatio >= input.mentionSpikeRatio ? 80 : 65,
      sourceQuality: row.sourceName ? 70 : 55,
      marketImpact: 68,
      userRelevance: targetMatches(input.targetThemes, theme) ? 85 : 65,
      confidence: row.sourceName ? 70 : 55
    });
    if (score.finalScore < input.minSignalScore) continue;

    events.push({
      eventId: `theme:${theme}:${detectedAt.slice(0, 10)}:${mentions}`,
      eventType: 'theme_momentum',
      title: `${theme} theme momentum ${spikeRatio.toFixed(1)}x`,
      summary: `${theme} mentions rose to ${mentions}${previousMentions ? ` from ${previousMentions}` : ''}; sentiment ${sentiment}.`,
      detectedAt,
      entities: [{ type: 'theme', name: theme }],
      metrics: {
        mentions,
        previousMentions,
        spikeRatio,
        engagement,
        sentiment,
        sourceCount: row.sourceCount ?? ''
      },
      evidence: sourceEvidence({
        sourceName: row.sourceName,
        sourceType: 'theme_signal',
        confidence: row.sourceName ? 70 : 55,
        url: row.url
      }),
      scores: score,
      labels:
        sentiment < -0.2 ? ['risk', 'needs_verification'] : ['opportunity', 'needs_verification'],
      compliance: {
        isInvestmentAdvice: false,
        limitation:
          'Theme heat can be promotional, noisy, or late; connect it to company fundamentals before acting.'
      }
    });
  }

  return events.sort((a, b) => b.scores.finalScore - a.scores.finalScore);
}

export function buildThemeCompanyMap(input: {
  rows: RelationRow[];
  theme: string;
  minExposureScore: number;
}) {
  return input.rows
    .filter((row) => !input.theme || targetMatches([input.theme], row.theme || input.theme))
    .map((row) => ({
      theme: row.theme || input.theme,
      company: row.company || row.symbol || row.ticker || '',
      symbol: String(row.symbol || row.ticker || '').toUpperCase(),
      relationship: row.relationship || 'theme_exposure',
      exposureScore: numberOrUndefined(row.exposureScore) ?? 50,
      evidence: row.evidence || '',
      sourceName: row.sourceName || 'provided_relation_data',
      url: row.url || ''
    }))
    .filter((row) => row.company && row.exposureScore >= input.minExposureScore)
    .sort((a, b) => b.exposureScore - a.exposureScore);
}

export function buildPeopleInstitutionEvents(input: {
  rows: EntitySignalRow[];
  minSignalScore: number;
}) {
  const detectedAt = new Date().toISOString();
  const events: NewsThemeEvent[] = [];

  for (const row of input.rows) {
    const entity = row.entity || row.name || '';
    if (!entity) continue;
    const signalType = normalizeEntitySignalType(row.signalType || row.title || '');
    const title = row.title || `${entity} ${signalType.replace(/_/g, ' ')}`;
    const relatedSymbols = parseRelated(row.relatedSymbols).map((item) => item.toUpperCase());
    const relatedThemes = parseRelated(row.relatedThemes);
    const marketImpact =
      numberOrUndefined(row.marketImpact) ?? materialityByEntitySignal(signalType);
    const sourceQuality = row.sourceName ? 72 : 55;
    const score = scoreEvent({
      magnitude: marketImpact,
      novelty:
        signalType === 'investment' ||
        signalType === 'hiring' ||
        signalType === 'product_commentary'
          ? 75
          : 62,
      sourceQuality,
      marketImpact,
      userRelevance: 72,
      confidence: sourceQuality
    });
    if (score.finalScore < input.minSignalScore) continue;

    events.push({
      eventId: `entity:${entity}:${signalType}:${row.publishedAt || detectedAt}:${hashText(title)}`,
      eventType: 'people_institution_signal',
      title,
      summary: row.summary || title,
      detectedAt,
      entities: [
        {
          type:
            row.entityType === 'institution'
              ? 'institution'
              : row.entityType === 'company'
                ? 'company'
                : 'person',
          name: entity
        },
        ...relatedSymbols.map((ticker) => ({ type: 'ticker' as const, name: ticker, ticker })),
        ...relatedThemes.map((theme) => ({ type: 'theme' as const, name: theme }))
      ],
      metrics: {
        signalType,
        marketImpact,
        publishedAt: row.publishedAt || ''
      },
      evidence: sourceEvidence({
        sourceName: row.sourceName,
        sourceType: signalType,
        confidence: sourceQuality,
        url: row.url,
        publishedAt: row.publishedAt
      }),
      scores: score,
      labels:
        signalType === 'layoff' || signalType === 'lawsuit_commentary'
          ? ['risk', 'needs_verification']
          : ['watch', 'needs_verification'],
      compliance: {
        isInvestmentAdvice: false,
        limitation:
          'People and institution signals can be promotional or ambiguous; verify source, timing, and market linkage.'
      }
    });
  }

  return events.sort((a, b) => b.scores.finalScore - a.scores.finalScore);
}

function parseRelated(value: unknown): string[] {
  if (!value) return [];
  if (Array.isArray(value)) return value.map(String).filter(Boolean);
  return String(value)
    .split(/[\s,，;；]+/)
    .map((item) => item.trim())
    .filter(Boolean);
}

function targetMatches(targets: string[], value: string) {
  if (!targets.length) return false;
  const normalized = value.toLowerCase();
  return targets.some(
    (target) =>
      normalized.includes(target.toLowerCase()) || target.toLowerCase().includes(normalized)
  );
}

function normalizeNewsType(value: unknown) {
  const text = String(value || '').toLowerCase();
  if (/acquir|merger|m&a|takeover/.test(text)) return 'mna';
  if (/lawsuit|litigation|sue|court/.test(text)) return 'lawsuit';
  if (/regulat|doj|ftc|sec|investigation/.test(text)) return 'regulation';
  if (/launch|product|release|ship/.test(text)) return 'product_launch';
  if (/order|contract|customer|partnership/.test(text)) return 'customer_order';
  if (/earnings|guidance/.test(text)) return 'earnings_related';
  return 'general_news';
}

function normalizeEntitySignalType(value: unknown) {
  const text = String(value || '').toLowerCase();
  if (/hire|recruit|job|talent/.test(text)) return 'hiring';
  if (/layoff|cut|restructur/.test(text)) return 'layoff';
  if (/invest|funding|financing|stake/.test(text)) return 'investment';
  if (/podcast|interview|speech|conference|keynote/.test(text)) return 'public_commentary';
  if (/product|agent|chip|robot|model/.test(text)) return 'product_commentary';
  if (/lawsuit|regulat|investigation/.test(text)) return 'lawsuit_commentary';
  return 'entity_update';
}

function materialityByNewsType(eventType: string, title: string) {
  const base: Record<string, number> = {
    mna: 85,
    lawsuit: 75,
    regulation: 78,
    product_launch: 72,
    customer_order: 80,
    earnings_related: 74,
    general_news: 55
  };
  const text = title.toLowerCase();
  const booster = /billion|multi-year|exclusive|approval|ban|probe|breakthrough/.test(text)
    ? 10
    : 0;
  return Math.min(100, (base[eventType] || 55) + booster);
}

function materialityByEntitySignal(signalType: string) {
  const map: Record<string, number> = {
    hiring: 65,
    layoff: 70,
    investment: 78,
    public_commentary: 62,
    product_commentary: 72,
    lawsuit_commentary: 74,
    entity_update: 55
  };
  return map[signalType] || 55;
}

function hashText(value: string) {
  let hash = 0;
  for (let i = 0; i < value.length; i++) {
    hash = (hash << 5) - hash + value.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash).toString(36);
}
