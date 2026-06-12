export type WorkgroupSignalMetric = {
  label?: unknown;
  value?: unknown;
};

export type WorkgroupSignalEntity = {
  name?: unknown;
  title?: unknown;
  label?: unknown;
};

export type WorkgroupSignalFact = {
  label?: unknown;
  title?: unknown;
  name?: unknown;
  summary?: unknown;
};

export type WorkgroupSignalRelation = {
  label?: unknown;
  title?: unknown;
  type?: unknown;
};

export type WorkgroupSignalTagInput = {
  rawTags?: unknown[];
  entities?: WorkgroupSignalEntity[];
  relations?: WorkgroupSignalRelation[];
  facts?: WorkgroupSignalFact[];
  metrics?: WorkgroupSignalMetric[];
  newsItems?: WorkgroupSignalFact[];
  signals?: WorkgroupSignalFact[];
  radarPoints?: WorkgroupSignalFact[];
  sources?: WorkgroupSignalFact[];
  industry?: unknown;
  fallback?: unknown;
  max?: number;
};

const genericTagPatterns = [
  /人物背景/,
  /公司关联/,
  /对象关联/,
  /公开履历/,
  /关系核验/,
  /背景情报/,
  /竞争情报/,
  /未来洞察/,
  /证据核验/,
  /行动建议/,
  /公开资料/,
  /核心指标/,
  /人物档案/,
  /企业档案/,
  /产品技术档案/,
  /关系概览/,
  /身份确认/,
  /来源复查/,
  /当前任职/,
  /历史关联/,
  /机构任命/,
  /行业变化/,
  /市场动作/,
  /核心新闻/,
  /关键信号/,
  /趋势雷达/,
  /影响判断/,
  /^profile$/i,
  /^associations$/i,
  /^dossier$/i,
  /^future lens$/i,
  /^competition$/i,
  /^decision loop$/i,
  /^core signal$/i,
  /^market move$/i,
  /^competitor watch$/i,
  /^policy \/ capital$/i,
  /^daily monitoring/i,
  /^tag$/i,
  /^headline picks$/i,
  /^key signals$/i,
  /^next moves$/i,
  /^sources cited$/i
];

function trimText(value: unknown, fallback = '', maxLength = 1200): string {
  const text = String(value ?? '')
    .replace(/\s+/g, ' ')
    .trim();
  if (!text) return fallback;
  return text.length > maxLength ? `${text.slice(0, maxLength - 1)}...` : text;
}

function hasCjk(text: string): boolean {
  return /[\u4e00-\u9fff]/.test(text);
}

function compactEntityName(value: unknown): string {
  const text = trimText(value, '', 80)
    .replace(/\b(Ltd|Inc|LLC|Limited|Corporation|Corp|Co)\b\.?/gi, '')
    .replace(/\s+/g, ' ')
    .trim();
  if (!text) return '';
  const parts = text.split(/[\s/｜|·,，]+/).filter(Boolean);
  const cjkPart = parts
    .filter((part) => hasCjk(part) && part.length <= 10)
    .sort((a, b) => a.length - b.length)[0];
  return trimText(cjkPart || text, '', 18);
}

function compactSignalTag(value: unknown): string {
  let text = trimText(value, '', 140);
  if (!text) return '';
  if (/香港数码港/.test(text) && /任命|委任|董事/.test(text)) return '数码港董事任命';
  if (/Nano Labs/i.test(text) && /CEO|董事长|主席/.test(text)) return 'Nano Labs CEO';
  if (/嘉楠科技|Canaan/i.test(text) && /履历|历史|任职|关联/.test(text)) return '嘉楠科技履历';
  if (/OpenAI/i.test(text) && /Agent|GPT|model|模型|平台/i.test(text)) return 'OpenAI';
  if (/Anthropic|Claude/i.test(text)) return 'Anthropic';
  if (/Gemini|Google/i.test(text) && /AI|模型|Agent|平台/i.test(text)) return 'Google Gemini';
  if (/NVIDIA|英伟达/i.test(text)) return 'NVIDIA';
  if (/DeepSeek/i.test(text)) return 'DeepSeek';
  if (/Replit/i.test(text)) return 'Replit';
  if (/BNB/i.test(text)) {
    if (/钱包|Wallet/i.test(text)) return 'BNB 钱包';
    if (/生态|Chain|链/i.test(text)) return 'BNB 生态';
    return 'BNB';
  }
  text = text
    .replace(/出现在公开履历口径中/g, '履历')
    .replace(/相关任命应按个人节点处理/g, '任命')
    .replace(/董事长兼\s*CEO/g, 'CEO')
    .replace(/当前核心职务/g, '')
    .replace(/每日变化|连续信号|关键变化|重点关注/g, '')
    .replace(/[。；;：:].*$/g, '')
    .replace(/\s+/g, ' ')
    .trim();
  return trimText(text, '', 18);
}

export function isGenericWorkgroupTag(value: unknown): boolean {
  const text = trimText(value, '', 40);
  return !text || genericTagPatterns.some((pattern) => pattern.test(text));
}

function pushSpecificTag(
  tags: string[],
  value: unknown,
  mode: 'entity' | 'signal' = 'signal'
): void {
  const tag = mode === 'entity' ? compactEntityName(value) : compactSignalTag(value);
  if (!tag || isGenericWorkgroupTag(tag)) return;
  const normalized = tag.toLowerCase();
  const exists = tags.some(
    (item) => item.toLowerCase() === normalized || item.includes(tag) || tag.includes(item)
  );
  if (!exists) tags.push(tag);
}

export function buildWorkgroupSignalTags(input: WorkgroupSignalTagInput): string[] {
  const tags: string[] = [];
  const max = input.max ?? 6;

  input.rawTags?.forEach((tag) => pushSpecificTag(tags, tag));
  input.entities?.forEach((entity) =>
    pushSpecificTag(tags, entity.name || entity.title || entity.label, 'entity')
  );
  input.relations?.forEach((relation) =>
    pushSpecificTag(tags, relation.label || relation.title || relation.type)
  );
  input.facts?.forEach((fact) =>
    pushSpecificTag(tags, fact.title || fact.name || fact.summary || fact.label)
  );
  input.newsItems?.forEach((item) =>
    pushSpecificTag(tags, item.title || item.name || item.summary || item.label)
  );
  input.signals?.forEach((signal) =>
    pushSpecificTag(tags, signal.title || signal.name || signal.summary || signal.label)
  );
  input.radarPoints?.forEach((point) =>
    pushSpecificTag(tags, point.title || point.name || point.label || point.summary)
  );
  input.sources?.forEach((source) =>
    pushSpecificTag(tags, source.title || source.name || source.label)
  );
  input.metrics?.forEach((metric) => {
    if (typeof metric.value === 'string') pushSpecificTag(tags, metric.value);
    if (tags.length < max) pushSpecificTag(tags, metric.label);
  });

  if (tags.length < Math.min(3, max)) pushSpecificTag(tags, input.industry);
  if (!tags.length) pushSpecificTag(tags, input.fallback);
  return tags.slice(0, max);
}
