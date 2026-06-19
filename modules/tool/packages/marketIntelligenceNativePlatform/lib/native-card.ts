import { z } from 'zod';

export const MARKET_NATIVE_CARD_OUTPUT_KEY = 'app_card';
export const MARKET_MONITOR_EVENT_COMPONENT = 'MarketMonitorEventCard';
export const MARKET_DISCOVERY_BOARD_COMPONENT = 'MarketDiscoveryBoardCard';
export const MARKET_DEEP_ANALYSIS_COMPONENT = 'MarketDeepAnalysisCard';
export const MARKET_RADAR_DASHBOARD_COMPONENT = 'MarketRadarDashboardCard';

export const optionalJsonInput = z
  .union([z.string(), z.record(z.string(), z.any()), z.array(z.any())])
  .optional()
  .default('');

export const textInput = () => z.string().optional().default('');

export function parseJsonValue(value: unknown, fallback: unknown) {
  if (value === undefined || value === null || value === '') return fallback;
  if (typeof value !== 'string') return value;
  try {
    return JSON.parse(value);
  } catch {
    return fallback;
  }
}

export function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

export function asArray(value: unknown): unknown[] {
  const parsed = parseJsonValue(value, value);
  if (Array.isArray(parsed)) return parsed;
  const record = asRecord(parsed);
  for (const key of ['items', 'data', 'results', 'signals', 'events', 'blocks', 'sources']) {
    if (Array.isArray(record[key])) return record[key] as unknown[];
  }
  return [];
}

export function firstString(...values: unknown[]): string {
  for (const value of values) {
    if (typeof value === 'string' && value.trim()) return value.trim();
    if (typeof value === 'number' && Number.isFinite(value)) return String(value);
  }
  return '';
}

export function toNumber(value: unknown, fallback = 0): number {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string') {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) return parsed;
  }
  return fallback;
}

export function splitTags(value: unknown): string[] {
  if (Array.isArray(value)) return value.map((item) => String(item).trim()).filter(Boolean);
  return String(value || '')
    .split(/[,，;\s]+/)
    .map((item) => item.trim())
    .filter(Boolean);
}

function compactIdPart(value: string, fallback = 'none') {
  const text = value.trim();
  if (!text) return fallback;
  return text.replace(/[^A-Za-z0-9_.:-]+/g, '_').slice(0, 120);
}

export function buildCardId(parts: unknown[]) {
  return parts.map((part) => compactIdPart(String(part || ''))).join(':');
}

export function stringifyJson(value: unknown): string {
  return JSON.stringify(value);
}

export function normalizeTarget(value: unknown, fallbackType = 'ticker') {
  const record = asRecord(parseJsonValue(value, value));
  const targetType =
    firstString(record.targetType, record.target_type, record.type) || fallbackType;
  const targetKey = firstString(
    record.targetKey,
    record.target_key,
    record.symbol,
    record.ticker,
    record.id
  );
  const name =
    firstString(record.name, record.displayName, record.display_name, record.title) || targetKey;
  return {
    targetType,
    targetKey,
    name,
    symbol: firstString(record.symbol, record.ticker) || (targetType === 'ticker' ? targetKey : ''),
    metadata: asRecord(record.metadata)
  };
}

export function normalizeSources(value: unknown) {
  return asArray(value)
    .map((item, index) => {
      const record = asRecord(item);
      return {
        id: firstString(record.id, record.url, `source-${index + 1}`),
        title: firstString(record.title, record.name, record.publisher) || `来源 ${index + 1}`,
        url: firstString(record.url, record.link),
        publisher: firstString(record.publisher, record.source),
        publishedAt: firstString(record.publishedAt, record.published_at, record.time)
      };
    })
    .slice(0, 20);
}

export function normalizeAiBlocks(value: unknown, fallbackSummary = '') {
  const blocks = asArray(value)
    .map((item, index) => {
      if (typeof item === 'string') {
        return {
          id: `ai-block-${index + 1}`,
          type: 'text',
          title: '',
          content: item
        };
      }
      const record = asRecord(item);
      return {
        id: firstString(record.id, `ai-block-${index + 1}`),
        type: firstString(record.type, record.kind) || 'text',
        title: firstString(record.title, record.label),
        content: firstString(record.content, record.body, record.summary, record.text),
        items: Array.isArray(record.items) ? record.items : undefined
      };
    })
    .filter((block) => block.content || block.title || (block.items?.length || 0) > 0)
    .slice(0, 12);

  if (blocks.length > 0) return blocks;
  return fallbackSummary
    ? [{ id: 'ai-block-summary', type: 'summary', title: 'AI 判断', content: fallbackSummary }]
    : [];
}

export function normalizeSignals(value: unknown) {
  return asArray(value)
    .map((item, index) => {
      const record = asRecord(item);
      const target = normalizeTarget(
        record.target || record,
        firstString(record.targetType) || 'ticker'
      );
      return {
        id: firstString(record.id, record.eventId, `signal-${index + 1}`),
        title: firstString(record.title, record.name) || target.name || `信号 ${index + 1}`,
        summary: firstString(record.summary, record.description, record.reason),
        eventType: firstString(record.eventType, record.event_type, record.type),
        target,
        impactedTickers: splitTags(
          record.impactedTickers ?? record.impacted_tickers ?? record.symbols
        ),
        importanceScore: Math.max(
          0,
          Math.min(100, toNumber(record.importanceScore ?? record.score, 50))
        ),
        eventTime: firstString(record.eventTime, record.event_time, record.time),
        metrics: asRecord(record.metrics)
      };
    })
    .slice(0, 50);
}

export function buildAppCard(input: {
  id: string;
  componentName: string;
  data: Record<string, unknown>;
}) {
  return {
    id: input.id,
    componentName: input.componentName,
    data: input.data
  };
}

export function buildSignalRecord(input: {
  signal: Record<string, unknown>;
  cardId?: string;
  aiBlocks?: unknown[];
  sources?: unknown[];
}) {
  const target = normalizeTarget(input.signal.target || input.signal);
  return {
    tableKey: 'market_signal_event',
    mode: 'insert_record',
    record: {
      event_type: firstString(input.signal.eventType, input.signal.event_type, input.signal.type),
      target_type: target.targetType,
      target_key: target.targetKey,
      title: firstString(input.signal.title),
      summary: firstString(input.signal.summary),
      impacted_tickers: splitTags(input.signal.impactedTickers ?? input.signal.impacted_tickers),
      importance_score: toNumber(input.signal.importanceScore ?? input.signal.importance_score, 50),
      event_time: firstString(input.signal.eventTime, input.signal.event_time),
      card_id: input.cardId || '',
      sources_json: stringifyJson(input.sources || []),
      ai_blocks_json: stringifyJson(input.aiBlocks || [])
    }
  };
}

export function buildDeliveryRecord(input: {
  deliveryType: string;
  card: Record<string, unknown>;
  signalEventIds?: string[];
}) {
  return {
    tableKey: 'market_delivery_record',
    mode: 'insert_record',
    record: {
      delivery_type: input.deliveryType,
      status: 'generated',
      card_component: firstString(input.card.componentName),
      card_json: stringifyJson(input.card),
      signal_event_ids: input.signalEventIds || [],
      delivered_at: new Date().toISOString()
    }
  };
}
