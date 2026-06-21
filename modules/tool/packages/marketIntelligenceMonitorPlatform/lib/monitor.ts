import { createHash } from 'node:crypto';

export type WatchSubject = {
  subjectKey: string;
  subjectType: string;
  displayName: string;
  primaryTicker: string;
  aliases: string[];
  sourceBindings: Record<string, unknown>;
  focusValues: string[];
  enabled: boolean;
};

export type SourceEvent = {
  sourceKey: string;
  eventId: string;
  eventType: string;
  title: string;
  summary: string;
  eventTime: string;
  impactedTickers: string[];
  entities: Array<{ type?: string; name?: string; ticker?: string; username?: string }>;
  sources: Array<Record<string, unknown>>;
  metrics: Record<string, unknown>;
  labels: string[];
  score: number;
  raw: Record<string, unknown>;
};

export type MonitorEvent = {
  id: string;
  dedupeKey: string;
  sourceKey: string;
  sourceEventId: string;
  target: {
    targetType: string;
    targetKey: string;
    name: string;
    symbol?: string;
  };
  eventType: string;
  title: string;
  summary: string;
  impactedTickers: string[];
  importanceScore: number;
  eventTime: string;
  sources: Array<Record<string, unknown>>;
  aiBlocks: Array<Record<string, unknown>>;
  sourceEvent: Record<string, unknown>;
};

type MonitorState = {
  version?: string;
  emittedKeys?: Record<string, string>;
  subjects?: Record<string, { lastCheckedAt?: string; lastEventAt?: string; eventCount?: number }>;
};

const tableKeys = {
  signalEvent: 'market_signal_event',
  watchCursor: 'market_watch_cursor'
} as const;

export function parseJsonValue(value: unknown, fallback: unknown) {
  if (value === undefined || value === null || value === '') return fallback;
  if (typeof value !== 'string') return value;
  try {
    return JSON.parse(value);
  } catch {
    return fallback;
  }
}

export function stringifyJson(value: unknown): string {
  return JSON.stringify(value, null, 2);
}

export function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

function asArray(value: unknown): unknown[] {
  const parsed = parseJsonValue(value, value);
  if (Array.isArray(parsed)) return parsed;
  const record = asRecord(parsed);
  for (const key of [
    'events',
    'events_json',
    'signals',
    'signals_json',
    'items',
    'data',
    'results',
    'records',
    'posts',
    'news',
    'filings',
    'transactions',
    'holdings'
  ]) {
    const inner = record[key];
    if (typeof inner === 'string') {
      const parsedInner = parseJsonValue(inner, undefined);
      if (Array.isArray(parsedInner)) return parsedInner;
    }
    if (Array.isArray(inner)) return inner;
  }
  return Object.keys(record).length ? [record] : [];
}

function firstString(...values: unknown[]): string {
  for (const value of values) {
    if (typeof value === 'string' && value.trim()) return value.trim();
    if (typeof value === 'number' && Number.isFinite(value)) return String(value);
  }
  return '';
}

function toNumber(value: unknown, fallback = 0): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function clampScore(value: unknown, fallback = 50): number {
  return Math.max(0, Math.min(100, Math.round(toNumber(value, fallback))));
}

function normalizeKey(value: unknown) {
  return String(value || '')
    .trim()
    .toLowerCase()
    .replace(/^@/, '')
    .replace(/^\$/, '')
    .replace(/[^a-z0-9_.:-]+/g, '_')
    .replace(/^_+|_+$/g, '');
}

function splitList(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value
      .flatMap((item) => splitList(item))
      .map((item) => item.trim())
      .filter(Boolean);
  }
  return String(value || '')
    .split(/[\n,，;；]+|\s{2,}/)
    .map((item) => item.trim())
    .filter(Boolean);
}

function parseStringArray(value: unknown): string[] {
  const parsed = parseJsonValue(value, value);
  return Array.from(new Set(splitList(parsed))).slice(0, 40);
}

function parseRecord(value: unknown) {
  return asRecord(parseJsonValue(value, value));
}

function hashText(value: string) {
  return createHash('sha1').update(value).digest('hex').slice(0, 16);
}

function stableId(parts: unknown[]) {
  return parts
    .map((part) => normalizeKey(part) || 'none')
    .join(':')
    .slice(0, 220);
}

export function parseWatchSubjects(raw: unknown): WatchSubject[] {
  const seen = new Set<string>();
  return asArray(raw)
    .map((item) => {
      const record = asRecord(item);
      const subjectType =
        firstString(
          record.subject_type,
          record.subjectType,
          record.target_type,
          record.targetType,
          record.type
        ) || 'ticker';
      const primaryTicker = firstString(
        record.primary_ticker,
        record.primaryTicker,
        record.symbol,
        record.ticker
      ).toUpperCase();
      const displayName =
        firstString(record.display_name, record.displayName, record.name, record.title) ||
        primaryTicker ||
        firstString(record.subject_key, record.subjectKey, record.target_key, record.targetKey);
      const subjectKey =
        normalizeKey(
          firstString(
            record.subject_key,
            record.subjectKey,
            record.target_key,
            record.targetKey,
            primaryTicker,
            displayName
          )
        ) || hashText(displayName);
      const aliases = Array.from(
        new Set(
          [
            ...parseStringArray(record.aliases_json ?? record.aliases),
            ...parseStringArray(record.aliasesJson),
            displayName,
            primaryTicker
          ].filter(Boolean)
        )
      );
      const focusValues = parseStringArray(
        record.focus_values ?? record.focusValues ?? record.focus_json ?? record.focus
      );
      const enabled = record.enabled === undefined ? true : record.enabled !== false;

      return {
        subjectKey,
        subjectType,
        displayName,
        primaryTicker,
        aliases,
        sourceBindings: parseRecord(record.source_bindings_json ?? record.sourceBindings),
        focusValues,
        enabled
      };
    })
    .filter((subject) => {
      if (!subject.enabled || !subject.subjectKey || seen.has(subject.subjectKey)) return false;
      seen.add(subject.subjectKey);
      return true;
    })
    .slice(0, 500);
}

export function parseMonitorState(raw: unknown): MonitorState {
  return asRecord(parseJsonValue(raw, {})) as MonitorState;
}

function extractEntities(record: Record<string, unknown>) {
  return [...asArray(record.entities), ...asArray(record.targets), ...asArray(record.companies)]
    .map((item) => {
      const entity = asRecord(item);
      if (!Object.keys(entity).length && typeof item === 'string') return { name: item };
      return {
        type: firstString(entity.type, entity.entityType, entity.entity_type),
        name: firstString(entity.name, entity.displayName, entity.display_name, entity.username),
        ticker: firstString(entity.ticker, entity.symbol).toUpperCase(),
        username: firstString(entity.username, entity.screenName, entity.screen_name)
      };
    })
    .filter((entity) => entity.name || entity.ticker || entity.username);
}

function extractTickers(record: Record<string, unknown>, entities: SourceEvent['entities']) {
  const explicit = [
    ...splitList(record.impactedTickers ?? record.impacted_tickers),
    ...splitList(record.symbols),
    ...splitList(record.tickers),
    ...splitList(record.symbol),
    ...splitList(record.ticker),
    ...entities.map((entity) => entity.ticker || '')
  ];
  const text = [
    firstString(record.title),
    firstString(record.summary, record.description, record.text, record.content)
  ].join(' ');
  const textTickers = text.match(/\b[A-Z]{2,6}\b/g) || [];
  const ignored = new Set(['AI', 'API', 'CEO', 'CFO', 'SEC', 'ETF', 'EPS', 'USA', 'US', 'X']);
  return Array.from(
    new Set(
      [...explicit, ...textTickers]
        .map((item) => item.replace(/^\$/, '').toUpperCase())
        .filter((item) => item && !ignored.has(item))
    )
  ).slice(0, 20);
}

function extractSources(record: Record<string, unknown>, sourceKey: string) {
  const items = [
    ...asArray(record.evidence),
    ...asArray(record.sources),
    ...asArray(record.citations),
    ...asArray(record.references)
  ];
  const sources = items.map((item, index) => {
    if (typeof item === 'string') {
      return {
        title: /^https?:\/\//i.test(item) ? item : `${sourceKey} source ${index + 1}`,
        url: /^https?:\/\//i.test(item) ? item : '',
        publisher: sourceKey,
        snippet: item
      };
    }
    const source = asRecord(item);
    return {
      title:
        firstString(source.title, source.name, source.sourceName, source.source_name) || sourceKey,
      url: firstString(source.url, source.link, source.href),
      publisher:
        firstString(source.publisher, source.source, source.sourceName, source.source_name) ||
        sourceKey,
      publishedAt: firstString(source.publishedAt, source.published_at, source.time),
      type: firstString(source.type, source.sourceType, source.source_type),
      snippet: firstString(source.snippet, source.summary, source.description, source.quote)
    };
  });
  const directUrl = firstString(record.url, record.link, record.href);
  if (directUrl && !sources.some((source) => source.url === directUrl)) {
    sources.push({
      title: firstString(record.title) || directUrl,
      url: directUrl,
      publisher: sourceKey,
      snippet: firstString(record.summary, record.text, record.content)
    });
  }
  return sources.slice(0, 20);
}

function inferEventType(record: Record<string, unknown>, sourceKey: string) {
  const explicit = firstString(record.eventType, record.event_type, record.type, record.kind);
  if (explicit) return explicit;
  if (sourceKey === 'x') return 'person_public_comments';
  if (sourceKey === 'sec') return 'filing_disclosure';
  if (sourceKey === 'market') return 'market_price_action';
  if (sourceKey === 'flow') return 'capital_flow';
  if (sourceKey === 'news') return 'policy_news_catalyst';
  return 'monitor_signal';
}

function eventTime(record: Record<string, unknown>) {
  return (
    firstString(
      record.eventTime,
      record.event_time,
      record.detectedAt,
      record.detected_at,
      record.postedAt,
      record.posted_at,
      record.publishedAt,
      record.published_at,
      record.createdAt,
      record.created_at,
      record.time,
      record.timestamp
    ) || new Date().toISOString()
  );
}

function eventScore(record: Record<string, unknown>) {
  const scores = asRecord(record.scores);
  return clampScore(
    record.importanceScore ??
      record.importance_score ??
      record.score ??
      scores.finalScore ??
      scores.final_score,
    55
  );
}

export function normalizeSourceEvents(sourceKey: string, raw: unknown): SourceEvent[] {
  return asArray(raw)
    .map((item, index) => {
      const record = asRecord(item);
      if (!Object.keys(record).length && typeof item !== 'string') return null;
      const textRecord =
        typeof item === 'string'
          ? {
              title: item,
              summary: item
            }
          : record;
      const entities = extractEntities(textRecord);
      const impactedTickers = extractTickers(textRecord, entities);
      const title =
        firstString(textRecord.title, textRecord.name, textRecord.text, textRecord.content) ||
        `监控事件 ${index + 1}`;
      const summary =
        firstString(
          textRecord.summary,
          textRecord.description,
          textRecord.reason,
          textRecord.text,
          textRecord.content
        ) || title;
      const time = eventTime(textRecord);
      const eventType = inferEventType(textRecord, sourceKey);
      const eventId =
        firstString(textRecord.eventId, textRecord.event_id, textRecord.dedupeKey, textRecord.id) ||
        stableId([sourceKey, eventType, title, time]);

      return {
        sourceKey,
        eventId,
        eventType,
        title,
        summary,
        eventTime: time,
        impactedTickers,
        entities,
        sources: extractSources(textRecord, sourceKey),
        metrics: asRecord(textRecord.metrics),
        labels: splitList(textRecord.labels ?? textRecord.tags ?? textRecord.stance),
        score: eventScore(textRecord),
        raw: textRecord
      };
    })
    .filter(Boolean) as SourceEvent[];
}

function isRecentEnough(time: string, lookbackHours: number) {
  const parsed = Date.parse(time);
  if (!Number.isFinite(parsed)) return true;
  return Date.now() - parsed <= lookbackHours * 60 * 60 * 1000;
}

function subjectAliases(subject: WatchSubject) {
  return Array.from(
    new Set(
      [
        subject.subjectKey,
        subject.displayName,
        subject.primaryTicker,
        ...subject.aliases,
        firstString(subject.sourceBindings.xUsername, subject.sourceBindings.username)
      ]
        .map((item) => item.trim())
        .filter(Boolean)
    )
  );
}

function eventHaystack(event: SourceEvent) {
  return [
    event.title,
    event.summary,
    event.eventType,
    event.impactedTickers.join(' '),
    ...event.entities.flatMap((entity) => [
      entity.name || '',
      entity.ticker || '',
      entity.username || ''
    ])
  ].join(' ');
}

function includesToken(haystack: string, token: string) {
  const normalized = haystack.toLowerCase();
  const value = token.toLowerCase().replace(/^[@$]/, '');
  if (!value) return false;
  if (/^[A-Z0-9.]{1,6}$/i.test(token) && token === token.toUpperCase()) {
    return new RegExp(
      `(^|[^A-Za-z0-9])${token.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}([^A-Za-z0-9]|$)`
    ).test(haystack);
  }
  return normalized.includes(value);
}

function matchesSubject(subject: WatchSubject, event: SourceEvent) {
  const type = normalizeKey(subject.subjectType);
  const aliases = subjectAliases(subject);
  const haystack = eventHaystack(event);
  if (type === 'ticker' || subject.primaryTicker) {
    const ticker = subject.primaryTicker.toUpperCase();
    if (ticker && event.impactedTickers.includes(ticker)) return true;
    if (ticker && includesToken(haystack, ticker)) return true;
  }
  if (type === 'x_account') {
    return aliases.some((alias) =>
      event.entities.some(
        (entity) => normalizeKey(entity.username || entity.name) === normalizeKey(alias)
      )
    );
  }
  return aliases.some((alias) => includesToken(haystack, alias));
}

function aiBlocksFor(event: SourceEvent, subject: WatchSubject) {
  return [
    {
      id: 'monitor-ai-summary',
      type: 'summary',
      title: 'AI 判断',
      content: `${subject.displayName} 出现 ${event.eventType} 信号：${event.summary}`
    },
    {
      id: 'monitor-next-check',
      type: 'scenario',
      title: '下一步验证',
      content:
        '继续检查原始来源、价格/成交量确认、相关公司公告和二次传播；不要把单一来源或延迟披露直接当成确定性方向。'
    }
  ];
}

function toMonitorEvent(subject: WatchSubject, event: SourceEvent): MonitorEvent {
  const dedupeKey = stableId([subject.subjectKey, event.sourceKey, event.eventId]);
  const id = `market-monitor:${dedupeKey}`;
  return {
    id,
    dedupeKey,
    sourceKey: event.sourceKey,
    sourceEventId: event.eventId,
    target: {
      targetType: subject.subjectType,
      targetKey: subject.subjectKey,
      name: subject.displayName,
      symbol: subject.primaryTicker || undefined
    },
    eventType: event.eventType,
    title: event.title,
    summary: event.summary,
    impactedTickers: event.impactedTickers,
    importanceScore: event.score,
    eventTime: event.eventTime,
    sources: event.sources,
    aiBlocks: aiBlocksFor(event, subject),
    sourceEvent: event.raw
  };
}

function pruneEmittedKeys(emittedKeys: Record<string, string>, now: string) {
  const entries = Object.entries(emittedKeys)
    .sort((a, b) => String(b[1]).localeCompare(String(a[1])))
    .slice(0, 1000);
  return Object.fromEntries(entries.length ? entries : [[`state-created:${now}`, now]]);
}

export function buildCardInputs(events: MonitorEvent[]) {
  return events.map((event) => ({
    target_json: stringifyJson(event.target),
    event_type: event.eventType,
    change_summary: event.summary,
    impacted_tickers: event.impactedTickers.join(', '),
    importance_score: event.importanceScore,
    event_time: event.eventTime,
    sources_json: stringifyJson(event.sources),
    ai_blocks_json: stringifyJson(event.aiBlocks),
    mini_visual_json: stringifyJson({
      sourceKey: event.sourceKey,
      sourceEventId: event.sourceEventId,
      score: event.importanceScore
    })
  }));
}

export function buildSignalRecords(events: MonitorEvent[]) {
  return events.map((event) => ({
    tableKey: tableKeys.signalEvent,
    recordId: event.id,
    data: {
      subject_key: event.target.targetKey,
      source_key: event.sourceKey,
      dedupe_key: event.dedupeKey,
      event_type: event.eventType,
      target_type: event.target.targetType,
      target_key: event.target.targetKey,
      title: event.title,
      summary: event.summary,
      impacted_tickers: event.impactedTickers,
      importance_score: event.importanceScore,
      event_time: event.eventTime,
      sources_json: stringifyJson(event.sources),
      ai_blocks_json: stringifyJson(event.aiBlocks),
      source_event_json: stringifyJson(event.sourceEvent),
      created_at: new Date().toISOString()
    }
  }));
}

export function buildCursorRecords(subjects: WatchSubject[], state: MonitorState, now: string) {
  return subjects.map((subject) => ({
    tableKey: tableKeys.watchCursor,
    recordId: stableId(['cursor', subject.subjectKey, 'aggregate_monitor']),
    data: {
      subject_key: subject.subjectKey,
      source_key: 'aggregate_monitor',
      cursor_json: stringifyJson(state.subjects?.[subject.subjectKey] || {}),
      last_checked_at: now,
      next_check_at: '',
      status: 'active',
      error_summary: ''
    }
  }));
}

export function runMonitorAggregation(input: {
  watchSubjects: WatchSubject[];
  sourceEvents: SourceEvent[];
  previousState: MonitorState;
  minImportanceScore: number;
  lookbackHours: number;
  maxEvents: number;
}) {
  const now = new Date().toISOString();
  const emittedKeys = { ...(input.previousState.emittedKeys || {}) };
  const nextSubjects = { ...(input.previousState.subjects || {}) };
  const monitorEvents: MonitorEvent[] = [];

  for (const subject of input.watchSubjects) {
    const matched = input.sourceEvents
      .filter((event) => event.score >= input.minImportanceScore)
      .filter((event) => isRecentEnough(event.eventTime, input.lookbackHours))
      .filter((event) => matchesSubject(subject, event))
      .map((event) => toMonitorEvent(subject, event))
      .filter((event) => !emittedKeys[event.dedupeKey]);

    for (const event of matched) {
      emittedKeys[event.dedupeKey] = now;
      monitorEvents.push(event);
    }

    const newestEventAt = matched
      .map((event) => event.eventTime)
      .sort()
      .at(-1);
    nextSubjects[subject.subjectKey] = {
      lastCheckedAt: now,
      lastEventAt: newestEventAt || nextSubjects[subject.subjectKey]?.lastEventAt || '',
      eventCount: (nextSubjects[subject.subjectKey]?.eventCount || 0) + matched.length
    };
  }

  const events = monitorEvents
    .sort((a, b) => b.importanceScore - a.importanceScore || b.eventTime.localeCompare(a.eventTime))
    .slice(0, input.maxEvents);
  const nextState: MonitorState = {
    version: 'market-watch-monitor-state.v1',
    emittedKeys: pruneEmittedKeys(emittedKeys, now),
    subjects: nextSubjects
  };

  return {
    events,
    nextState,
    records: buildSignalRecords(events),
    cursorRecords: buildCursorRecords(input.watchSubjects, nextState, now),
    cardInputs: buildCardInputs(events)
  };
}

export function formatSummary(subjectCount: number, eventCount: number, sourceEventCount: number) {
  if (!subjectCount) return '没有可监控的关注对象。';
  if (!sourceEventCount) return `检查 ${subjectCount} 个关注对象，但本次没有传入来源事件。`;
  if (!eventCount) {
    return `检查 ${subjectCount} 个关注对象和 ${sourceEventCount} 条来源事件，未发现新的可推送异动。`;
  }
  return `检查 ${subjectCount} 个关注对象和 ${sourceEventCount} 条来源事件，发现 ${eventCount} 条新的监控异动。`;
}
