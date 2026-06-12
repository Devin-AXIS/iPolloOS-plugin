import { escapeAttr, escapeHtml, safeHttpUrl } from './escape';
import { buildWorkgroupSignalTags, isGenericWorkgroupTag } from './workgroup-intelligence';
import { renderWorkgroupBaseCss } from './workgroup-components';

export type CompetitiveIntelligenceKind = 'company' | 'person' | 'product' | 'relation';

export type CompetitiveIntelligenceInput = {
  subject_name?: unknown;
  company_name?: unknown;
  person_name?: unknown;
  product_name?: unknown;
  relation_subject?: unknown;
  industry?: unknown;
  research_focus?: unknown;
  relationship_context?: unknown;
  visual_image_url?: unknown;
  logo_url?: unknown;
  portrait_image_url?: unknown;
  image_search_query?: unknown;
  dossier_json?: unknown;
  evidence_json?: unknown;
  entities_json?: unknown;
  report_date?: unknown;
};

export type CompetitiveIntelligenceDossier = {
  kind: CompetitiveIntelligenceKind;
  subjectName: string;
  industry: string;
  focus: string;
  relationshipContext: string;
  reportDate: string;
  templateName: string;
  title: string;
  subtitle: string;
  summary: string;
  tags: string[];
  metrics: MetricItem[];
  sections: NarrativeSection[];
  entities: EntityItem[];
  relations: RelationEdge[];
  sources: SourceItem[];
  coverVisual: CoverVisual;
};

export type CompetitiveIntelligenceOutput = {
  page_html: string;
  page_url: string;
  page_cover: string;
  full_html: string;
  summary: string;
  system_error?: string;
};

type AnyRecord = Record<string, unknown>;

type MetricItem = {
  label: string;
  value: number | string;
  note: string;
  tone: 'charcoal' | 'fog' | 'butter' | 'yellow' | 'coral';
};

type BarItem = {
  label: string;
  value: number;
  note: string;
  tone: MetricItem['tone'];
};

type NarrativeSection = {
  label: string;
  title: string;
  body: string;
  bullets: string[];
  bars: BarItem[];
  evidences: EvidenceItem[];
};

type EvidenceItem = {
  label: string;
  title: string;
  note: string;
  source: string;
};

type EntityItem = {
  id: string;
  name: string;
  type: string;
  summary: string;
  facts: string[];
  tone: MetricItem['tone'];
};

type RelationEdge = {
  from: string;
  to: string;
  label: string;
  strength?: number;
  proof: string;
};

type SourceItem = {
  publisher: string;
  title: string;
  url: string;
};

type CoverVisual = {
  imageUrl: string;
  mode: 'portrait' | 'logo' | 'product' | 'relation' | 'abstract';
  label: string;
};

const kindLabel: Record<CompetitiveIntelligenceKind, string> = {
  company: '企业档案',
  person: '人物档案',
  product: '产品技术档案',
  relation: '关系概览'
};

const templateEyebrow: Record<CompetitiveIntelligenceKind, string> = {
  company: 'Company Dossier',
  person: 'Person Dossier',
  product: 'Product & Technology Dossier',
  relation: 'Relationship Overview'
};

const defaultIndustry: Record<CompetitiveIntelligenceKind, string> = {
  company: '目标行业',
  person: '相关行业',
  product: '产品所在市场',
  relation: '关系对象所在领域'
};

function asRecord(value: unknown): AnyRecord {
  return value && typeof value === 'object' && !Array.isArray(value) ? (value as AnyRecord) : {};
}

function trimText(value: unknown, fallback = '', maxLength = 1200): string {
  const text = String(value ?? '')
    .replace(/\s+/g, ' ')
    .trim();
  if (!text) return fallback;
  return text.length > maxLength ? `${text.slice(0, maxLength - 1)}...` : text;
}

function parseJson(value: unknown, label: string): unknown {
  if (value == null || value === '') return undefined;
  if (typeof value !== 'string') return value;
  const text = value.trim();
  if (!text) return undefined;
  try {
    return JSON.parse(text);
  } catch {
    throw new Error(`${label} 不是合法 JSON`);
  }
}

function normalizeList(value: unknown, max = 10, maxLength = 120): string[] {
  const parsed = (() => {
    if (typeof value !== 'string') return value;
    const text = value.trim();
    if (!text) return [];
    if (
      (text.startsWith('[') && text.endsWith(']')) ||
      (text.startsWith('{') && text.endsWith('}'))
    ) {
      try {
        return JSON.parse(text);
      } catch {
        return text;
      }
    }
    return text;
  })();

  if (Array.isArray(parsed)) {
    return parsed
      .map((item) => {
        if (typeof item === 'string') return item;
        const obj = asRecord(item);
        return obj.title || obj.name || obj.label || obj.value || obj.summary || '';
      })
      .map((item) => trimText(item, '', maxLength))
      .filter(Boolean)
      .slice(0, max);
  }

  if (parsed && typeof parsed === 'object') {
    return Object.values(parsed as AnyRecord)
      .map((item) => trimText(item, '', maxLength))
      .filter(Boolean)
      .slice(0, max);
  }

  return String(parsed ?? '')
    .split(/[\n,，、;；|]+/g)
    .map((item) => trimText(item, '', maxLength))
    .filter(Boolean)
    .slice(0, max);
}

function normalizeNumber(value: unknown, fallback = 50): number {
  const n = typeof value === 'number' ? value : Number(String(value ?? '').replace(/[^\d.-]/g, ''));
  if (!Number.isFinite(n)) return fallback;
  return Math.max(0, Math.min(100, Math.round(n)));
}

function normalizePositiveScore(value: unknown): number | undefined {
  const text = String(value ?? '').trim();
  if (!text) return undefined;
  const n = typeof value === 'number' ? value : Number(text.replace(/[^\d.-]/g, ''));
  if (!Number.isFinite(n) || n <= 0) return undefined;
  return Math.max(1, Math.min(100, Math.round(n)));
}

function normalizeTone(value: unknown, index: number): MetricItem['tone'] {
  const text = String(value ?? '').toLowerCase();
  if (text.includes('risk') || text.includes('风险') || text.includes('coral')) return 'coral';
  if (text.includes('market') || text.includes('规模') || text.includes('fog')) return 'fog';
  if (text.includes('cash') || text.includes('财务') || text.includes('butter')) return 'butter';
  if (text.includes('signal') || text.includes('机会') || text.includes('yellow')) return 'yellow';
  return (['charcoal', 'fog', 'butter', 'yellow', 'coral'] as const)[index % 5];
}

function buildSpecificTags(
  kind: CompetitiveIntelligenceKind,
  rawTags: string[],
  metrics: MetricItem[],
  sections: NarrativeSection[],
  entities: EntityItem[],
  relations: RelationEdge[],
  industry: string
): string[] {
  return buildWorkgroupSignalTags({
    rawTags,
    entities: entities.map((entity) => ({ name: entity.name })),
    relations: relations.map((relation) => ({ label: relation.label })),
    facts: sections
      .flatMap((section) => section.evidences)
      .map((item) => ({ title: item.title, label: item.label })),
    metrics: metrics.map((metric) => ({ label: metric.label, value: metric.value })),
    industry,
    fallback: kindLabel[kind],
    max: 6
  });
}

function getInputSubject(
  kind: CompetitiveIntelligenceKind,
  input: CompetitiveIntelligenceInput
): string {
  const candidates = {
    company: [input.company_name, input.subject_name],
    person: [input.person_name, input.subject_name],
    product: [input.product_name, input.subject_name],
    relation: [input.relation_subject, input.subject_name]
  }[kind];
  return (
    candidates.map((item) => trimText(item, '', 180)).find(Boolean) || `${kindLabel[kind]}对象`
  );
}

function getReportRoot(raw: unknown): AnyRecord {
  const obj = asRecord(raw);
  return asRecord(obj.dossier || obj.report || obj.profile || obj.data || obj);
}

function firstSafeUrl(...values: unknown[]): string {
  for (const value of values) {
    const url = safeHttpUrl(value);
    if (url) return url;
  }
  return '';
}

function normalizeCoverVisual(
  kind: CompetitiveIntelligenceKind,
  input: CompetitiveIntelligenceInput,
  rawDossier: AnyRecord
): CoverVisual {
  const cover = asRecord(rawDossier.cover);
  const coverVisual = asRecord(cover.visual || cover.image || cover.asset);
  const visual = asRecord(rawDossier.visual || rawDossier.hero || rawDossier.media);
  const portraitUrl = firstSafeUrl(
    input.portrait_image_url,
    rawDossier.portraitImageUrl,
    rawDossier.portrait_image_url,
    cover.portraitImageUrl,
    cover.portrait_image_url,
    coverVisual.portraitImageUrl,
    coverVisual.portrait_image_url
  );
  const logoUrl = firstSafeUrl(
    input.logo_url,
    rawDossier.logoUrl,
    rawDossier.logo_url,
    cover.logoUrl,
    cover.logo_url,
    coverVisual.logoUrl,
    coverVisual.logo_url
  );
  const visualUrl = firstSafeUrl(
    input.visual_image_url,
    rawDossier.visualImageUrl,
    rawDossier.visual_image_url,
    rawDossier.imageUrl,
    rawDossier.image_url,
    cover.imageUrl,
    cover.image_url,
    coverVisual.imageUrl,
    coverVisual.image_url,
    coverVisual.url,
    visual.imageUrl,
    visual.image_url,
    visual.url
  );
  const explicitMode = trimText(
    coverVisual.mode || coverVisual.type || visual.mode || visual.type,
    '',
    24
  ).toLowerCase();
  const mode = (() => {
    if (explicitMode.includes('logo')) return 'logo' as const;
    if (
      explicitMode.includes('portrait') ||
      explicitMode.includes('person') ||
      explicitMode.includes('photo')
    ) {
      return 'portrait' as const;
    }
    if (kind === 'person') return 'portrait' as const;
    if (kind === 'company') return 'logo' as const;
    if (kind === 'product') return 'product' as const;
    if (kind === 'relation') return 'relation' as const;
    return 'abstract' as const;
  })();
  const imageUrl =
    mode === 'portrait'
      ? portraitUrl || visualUrl || logoUrl
      : mode === 'logo'
        ? logoUrl || visualUrl || portraitUrl
        : visualUrl || logoUrl || portraitUrl;

  return {
    imageUrl,
    mode,
    label: trimText(
      coverVisual.caption || cover.caption || visual.caption || coverVisual.prompt || visual.prompt,
      '',
      140
    )
  };
}

function normalizeMetrics(raw: unknown, kind: CompetitiveIntelligenceKind): MetricItem[] {
  const items = Array.isArray(raw) ? raw : [];
  const metrics = items
    .map((item, index) => {
      const obj = asRecord(item);
      const label = trimText(obj.label || obj.name || obj.title, '', 40);
      if (!label) return null;
      const rawValue = obj.value ?? obj.score ?? obj.percent;
      if (rawValue == null || rawValue === '') return null;
      if (typeof rawValue === 'number' && rawValue <= 0) return null;
      if (typeof rawValue === 'string' && /^0+(\.0+)?%?$/.test(rawValue.trim())) return null;
      return {
        label,
        value: obj.value == null ? normalizeNumber(rawValue, 0) : trimText(obj.value, '', 48),
        note: trimText(
          obj.note || obj.summary || obj.description || obj.source || obj.evidence,
          '',
          160
        ),
        tone: normalizeTone(obj.tone || obj.type || label, index)
      };
    })
    .filter((item): item is MetricItem => Boolean(item))
    .slice(0, 6);
  return metrics;
}

function normalizeBars(raw: unknown, kind: CompetitiveIntelligenceKind, index: number): BarItem[] {
  const bars = (Array.isArray(raw) ? raw : [])
    .map((item, itemIndex) => {
      const obj = asRecord(item);
      const label = trimText(obj.label || obj.name || obj.title, '', 44);
      const rawValue = obj.value ?? obj.score ?? obj.percent;
      if (!label || rawValue == null || rawValue === '') return null;
      return {
        label,
        value: normalizeNumber(rawValue, 0),
        note: trimText(
          obj.note || obj.summary || obj.description || obj.source || obj.evidence,
          '',
          160
        ),
        tone: normalizeTone(obj.tone || label, itemIndex)
      };
    })
    .filter((item): item is BarItem => Boolean(item))
    .slice(0, 6);
  return bars;
}

function buildFallbackSection(
  kind: CompetitiveIntelligenceKind,
  subjectName: string,
  summary: string,
  tags: string[]
): NarrativeSection[] {
  if (!summary) return [];
  return [
    {
      label: 'Readout',
      title: `${subjectName} · ${kindLabel[kind]}摘要`,
      body: summary,
      bullets: tags.slice(0, 5),
      bars: [],
      evidences: []
    }
  ];
}

function normalizeEvidenceItems(raw: unknown, max = 6): EvidenceItem[] {
  const values = Array.isArray(raw) ? raw : [];
  return values
    .map((item, index) => {
      if (typeof item === 'string') {
        const title = trimText(item, '', 180);
        return title
          ? { label: String(index + 1).padStart(2, '0'), title, note: '', source: '' }
          : null;
      }
      const obj = asRecord(item);
      const title = trimText(
        obj.title ||
          obj.fact ||
          obj.claim ||
          obj.name ||
          obj.metric ||
          obj.dataPoint ||
          obj.data_point ||
          obj.summary,
        '',
        180
      );
      if (!title) return null;
      const label = trimText(
        obj.label ||
          obj.type ||
          obj.category ||
          obj.date ||
          obj.publisher ||
          obj.source ||
          obj.sourceName,
        String(index + 1).padStart(2, '0'),
        48
      );
      return {
        label,
        title,
        note: trimText(
          obj.note || obj.description || obj.body || obj.detail || obj.evidence,
          '',
          220
        ),
        source: trimText(
          obj.source || obj.sourceName || obj.publisher || obj.url || obj.link,
          '',
          120
        )
      };
    })
    .filter((item): item is EvidenceItem => Boolean(item))
    .slice(0, max);
}

function normalizeSections(
  raw: unknown,
  kind: CompetitiveIntelligenceKind,
  subjectName: string,
  summary: string,
  tags: string[]
): NarrativeSection[] {
  const items = Array.isArray(raw) ? raw : [];
  const sections = items
    .map((item, index) => {
      const obj = asRecord(item);
      const title = trimText(obj.title || obj.headline || obj.name, '', 90);
      if (!title) return null;
      return {
        label: trimText(obj.label || obj.kicker || obj.category, `Section ${index + 1}`, 28),
        title,
        body: trimText(obj.body || obj.summary || obj.description || obj.finding, summary, 640),
        bullets: normalizeList(obj.bullets || obj.items || obj.findings || obj.points, 5, 140),
        bars: normalizeBars(obj.bars || obj.metrics || obj.indicators, kind, index),
        evidences: normalizeEvidenceItems(
          obj.evidence ||
            obj.evidences ||
            obj.proofs ||
            obj.facts ||
            obj.records ||
            obj.dataPoints ||
            obj.data_points
        )
      };
    })
    .filter((item): item is NarrativeSection => Boolean(item))
    .slice(0, 8);
  return sections.length ? sections : buildFallbackSection(kind, subjectName, summary, tags);
}

function normalizeEntities(
  raw: unknown,
  kind: CompetitiveIntelligenceKind,
  subjectName: string
): EntityItem[] {
  const candidates = Array.isArray(raw) ? raw : [];
  const entities = candidates
    .map((item, index) => {
      const obj = asRecord(item);
      const name = trimText(
        obj.name || obj.title || obj.label || obj.company || obj.organization || obj.product,
        '',
        100
      );
      if (!name) return null;
      const id = trimText(
        obj.id || name.toLowerCase().replace(/\W+/g, '-'),
        `entity-${index + 1}`,
        80
      );
      const type = trimText(obj.type || obj.role || obj.category, '对象', 48);
      const explicitFacts = normalizeList(
        obj.facts || obj.items || obj.bullets || obj.evidence || obj.points,
        8,
        160
      );
      const derivedFacts = normalizeList(
        [
          obj.relationship || obj.relation || obj.connection,
          obj.position || obj.jobTitle || obj.job_title,
          obj.period || obj.timeRange || obj.time_range || obj.date,
          obj.source || obj.sourceName || obj.publisher,
          obj.note
        ].filter(Boolean),
        8,
        160
      );
      const facts = explicitFacts.length ? explicitFacts : derivedFacts;
      return {
        id,
        name,
        type,
        summary: trimText(
          obj.summary || obj.description || obj.body,
          facts[0] || `${name} 是当前档案中的${type}关联对象；上游只提供了名称和类型。`,
          260
        ),
        facts,
        tone: normalizeTone(obj.tone || obj.type || obj.role, index)
      };
    })
    .filter((item): item is EntityItem => Boolean(item))
    .slice(0, 8);

  if (entities.length) return entities;

  if (kind === 'relation') {
    return [
      {
        id: 'target-a',
        name: subjectName,
        type: '目标对象',
        summary: '关系分析的主要对象。点击后展示身份、业务和证据摘要。',
        facts: ['主体身份需要先确认', '关系强度来自公开证据', '后续可进入企业、人物或产品档案'],
        tone: 'charcoal'
      },
      {
        id: 'target-b',
        name: '关联对象',
        type: '对比对象',
        summary: '与目标对象存在商业、资本、人员或产品关系的对象。',
        facts: ['关系类型待上游补充', '证据路径需要继续核验', '可比较商业相关和风险冲突'],
        tone: 'fog'
      },
      {
        id: 'person',
        name: '关键人物',
        type: '人物节点',
        summary: '用于解释公司之间为什么发生关系的人物节点。',
        facts: ['任职路径', '共同项目', '公开发言或投资关系'],
        tone: 'butter'
      },
      {
        id: 'product',
        name: '相关产品',
        type: '产品节点',
        summary: '用于判断关系商业价值和竞争压力的产品节点。',
        facts: ['替代对象', '目标客户', '生态依赖'],
        tone: 'yellow'
      }
    ];
  }

  return [];
}

function normalizeRelations(raw: unknown, entities: EntityItem[]): RelationEdge[] {
  const items = (Array.isArray(raw) ? raw : [])
    .map((item) => {
      const obj = asRecord(item);
      const from = trimText(obj.from || obj.source || obj.a, '', 80);
      const to = trimText(obj.to || obj.target || obj.b, '', 80);
      if (!from || !to) return null;
      const strength = normalizePositiveScore(obj.strength ?? obj.score ?? obj.value);
      return {
        from,
        to,
        label: trimText(obj.label || obj.type || obj.relationship, '关系待确认', 60),
        ...(strength ? { strength } : {}),
        proof: trimText(
          obj.proof || obj.evidence || obj.summary || obj.description,
          '等待补充公开证据。',
          180
        )
      };
    })
    .filter((item): item is RelationEdge => Boolean(item))
    .slice(0, 10);

  return items;
}

function normalizeSources(rawSources: unknown, rawEvidence: unknown): SourceItem[] {
  const sourceCandidates = [
    ...(Array.isArray(rawSources) ? rawSources : []),
    ...(Array.isArray(rawEvidence) ? rawEvidence : [])
  ];
  return sourceCandidates
    .map((item) => {
      const obj = asRecord(item);
      const title = trimText(obj.title || obj.name || obj.summary || obj.description, '', 180);
      if (!title) return null;
      return {
        publisher: trimText(
          obj.publisher || obj.source || obj.sourceName || obj.site,
          'Source',
          80
        ),
        title,
        url: trimText(obj.url || obj.link, '', 700)
      };
    })
    .filter((item): item is SourceItem => Boolean(item))
    .slice(0, 16);
}

export function normalizeCompetitiveIntelligenceDossier(
  kind: CompetitiveIntelligenceKind,
  input: CompetitiveIntelligenceInput
): CompetitiveIntelligenceDossier {
  const rawDossier = getReportRoot(parseJson(input.dossier_json, 'dossier_json'));
  const rawEvidence = parseJson(input.evidence_json, 'evidence_json');
  const rawEntities = parseJson(input.entities_json, 'entities_json');
  const subjectName = trimText(
    rawDossier.subjectName || rawDossier.subject_name || rawDossier.name,
    getInputSubject(kind, input),
    180
  );
  const industry = trimText(rawDossier.industry || input.industry, defaultIndustry[kind], 100);
  const focus = trimText(
    rawDossier.focus || rawDossier.research_focus || input.research_focus,
    '识别机会、风险和下一步核验动作',
    180
  );
  const relationshipContext = trimText(
    rawDossier.relationshipContext || rawDossier.relationship_context || input.relationship_context,
    '',
    240
  );
  const reportDate = trimText(
    rawDossier.reportDate || rawDossier.report_date || input.report_date,
    new Date().toISOString().slice(0, 10),
    80
  );
  const summary = trimText(
    rawDossier.summary || rawDossier.verdict || rawDossier.judgement,
    `${subjectName} 的${kindLabel[kind]}已生成。上游未提供更多摘要内容。`,
    520
  );
  const rawTags = normalizeList(
    rawDossier.tags || rawDossier.cover?.tags || rawDossier.keyTags || rawDossier.key_tags,
    8,
    32
  );
  const seedTags = rawTags.filter((tag) => !isGenericWorkgroupTag(tag));
  const metrics = normalizeMetrics(
    rawDossier.metrics || rawDossier.kpis || rawDossier.indicators,
    kind
  );
  const sections = normalizeSections(
    rawDossier.sections || rawDossier.analysis || rawDossier.blocks,
    kind,
    subjectName,
    summary,
    seedTags.length ? seedTags : rawTags
  );
  const entities = normalizeEntities(
    rawEntities || rawDossier.entities || rawDossier.objects,
    kind,
    subjectName
  );
  const relations = normalizeRelations(
    rawDossier.relations || rawDossier.edges || rawDossier.paths,
    entities
  );
  const sources = normalizeSources(rawDossier.sources, rawEvidence);
  const coverVisual = normalizeCoverVisual(kind, input, rawDossier);
  const tags = buildSpecificTags(kind, rawTags, metrics, sections, entities, relations, industry);

  return {
    kind,
    subjectName,
    industry,
    focus,
    relationshipContext,
    reportDate,
    templateName: kindLabel[kind],
    title: trimText(
      rawDossier.title || rawDossier.headline,
      `${subjectName} · ${kindLabel[kind]}`,
      120
    ),
    subtitle: trimText(rawDossier.subtitle || rawDossier.deck, `${industry} / ${focus}`, 220),
    summary,
    tags,
    metrics,
    sections,
    entities,
    relations,
    sources,
    coverVisual
  };
}

export function buildCompetitiveIntelligencePageCover(
  dossier: CompetitiveIntelligenceDossier
): string {
  return JSON.stringify({
    variant: 'competitive-intelligence',
    template: dossier.kind,
    eyebrow: '竞争情报系统',
    title: dossier.title,
    description: dossier.summary,
    status: dossier.reportDate,
    actionLabel: `打开${dossier.templateName}`,
    accentColor: '#ffd63d',
    coverImageUrl: dossier.coverVisual.imageUrl,
    chips: [dossier.industry, dossier.templateName, ...dossier.tags.slice(0, 2)].filter(Boolean),
    fields: dossier.metrics.slice(0, 4).map((item) => ({
      label: item.label,
      value: String(item.value)
    }))
  });
}

function renderMetricValue(value: number | string): string {
  return typeof value === 'number' ? `${value}` : value;
}

function detailAttr(value: unknown): string {
  const text = trimText(value, '', 220);
  return text ? ` data-detail-title="${escapeAttr(text)}"` : '';
}

function renderMetrics(metrics: MetricItem[]): string {
  if (!metrics.length) return '';
  return `<div class="ci-metrics">
    ${metrics
      .slice(0, 6)
      .map((metric) => {
        const value = renderMetricValue(metric.value);
        const textClass = typeof metric.value !== 'number' || value.length > 8 ? ' text-value' : '';
        return `<article class="ci-metric tone-${escapeAttr(metric.tone)}${textClass}"${detailAttr(metric.note)}>
          <b>${escapeHtml(renderMetricValue(metric.value))}</b>
          <span>${escapeHtml(metric.label)}</span>
        </article>`;
      })
      .join('')}
  </div>`;
}

function renderCoverArt(dossier: CompetitiveIntelligenceDossier): string {
  const visual = dossier.coverVisual;
  if (visual.imageUrl) {
    return `<figure class="cover-art has-image mode-${escapeAttr(visual.mode)}" aria-label="${escapeAttr(
      visual.label || dossier.subjectName
    )}">
      <img src="${escapeAttr(visual.imageUrl)}" alt="${escapeAttr(visual.label || dossier.subjectName)}">
    </figure>`;
  }

  return '';
}

function renderEvidenceList(section: NarrativeSection): string {
  if (!section.evidences.length) {
    return `<div class="ci-evidence-list ci-evidence-empty">
      <article>
        <small>DATA</small>
        <strong>${escapeHtml(section.body)}</strong>
      </article>
    </div>`;
  }

  return `<div class="ci-evidence-list">
    ${section.evidences
      .map(
        (item) => `<article${detailAttr(item.note || item.source)}>
          <small>${escapeHtml(item.label)}</small>
          <strong>${escapeHtml(item.title)}</strong>
          ${item.note ? `<span>${escapeHtml(item.note)}</span>` : ''}
          ${item.source ? `<em>${escapeHtml(item.source)}</em>` : ''}
        </article>`
      )
      .join('')}
  </div>`;
}

function renderBars(section: { bars: BarItem[] }): string {
  return `<div class="ci-bars">
    ${section.bars
      .map(
        (bar) => `<div class="ci-bar-row"${detailAttr(bar.note)}>
          <strong>${escapeHtml(bar.label)}</strong>
          <span class="ci-track"><i class="tone-${escapeAttr(bar.tone)}" style="width:${bar.value}%"></i></span>
          <b>${bar.value}</b>
        </div>`
      )
      .join('')}
  </div>`;
}

function renderSectionChart(
  section: NarrativeSection,
  index: number,
  kind: CompetitiveIntelligenceKind,
  entities: EntityItem[]
): string {
  if (kind === 'relation' && index === 0) {
    return renderMiniRelation(entities, true);
  }

  if (!section.bars.length) {
    return renderEvidenceList(section);
  }

  if (index % 3 === 1) {
    return `<div class="ci-proof-grid">
      ${section.bars
        .slice(0, 4)
        .map(
          (bar) => `<article class="ci-proof tone-${escapeAttr(bar.tone)}"${detailAttr(bar.note)}>
            <b>${bar.value}</b>
            <strong>${escapeHtml(bar.label)}</strong>
            <span>${escapeHtml(bar.note)}</span>
          </article>`
        )
        .join('')}
    </div>`;
  }

  if (index % 3 === 2) {
    return `<div class="ci-ecosystem">
      ${['上游', '核心对象', '客户/渠道', '替代品']
        .map((label, itemIndex) => {
          const bar = section.bars[itemIndex] || section.bars[0];
          return `<article class="${itemIndex === 1 ? 'core' : ''}"${detailAttr(bar?.note)}>
          <span>${escapeHtml(label)}</span>
          <strong>${escapeHtml(bar?.label || label)}</strong>
        </article>`;
        })
        .join('')}
    </div>`;
  }

  return renderBars(section);
}

function renderNarrativeSections(dossier: CompetitiveIntelligenceDossier): string {
  return dossier.sections
    .map(
      (section, index) => `<section class="ci-section">
        <article class="ci-copy">
          <span>${escapeHtml(section.label)}</span>
          <h2>${escapeHtml(section.title)}</h2>
          <p>${escapeHtml(section.body)}</p>
          ${
            section.bullets.length
              ? `<ul>${section.bullets.map((item) => `<li>${escapeHtml(item)}</li>`).join('')}</ul>`
              : ''
          }
        </article>
        <figure class="ci-chart">
          ${renderSectionChart(section, index, dossier.kind, dossier.entities)}
        </figure>
      </section>`
    )
    .join('');
}

function renderMiniRelation(entities: EntityItem[], interactive = false): string {
  const shown = entities.slice(0, 4);
  return `<div class="ci-mini-relation">
    ${shown
      .map((entity, index) => {
        const tagName = interactive ? 'button' : 'span';
        const actionAttrs = interactive
          ? ` type="button" data-entity-open="${escapeAttr(entity.id)}"`
          : '';
        return `<${tagName}${actionAttrs} class="ci-entity tone-${escapeAttr(entity.tone)} pos-${index + 1}"${detailAttr(entity.summary)}>
          <strong>${escapeHtml(entity.name)}</strong>
          <span>${escapeHtml(entity.type)}</span>
        </${tagName}>`;
      })
      .join('')}
    <i class="line l1"></i><i class="line l2"></i><i class="line l3"></i>
  </div>`;
}

function renderRelationOverview(dossier: CompetitiveIntelligenceDossier): string {
  const [first, second, third, fourth] = dossier.entities;
  const visibleEntities = dossier.entities.slice(0, 4);
  const relationStrengthBars = dossier.relations
    .filter(
      (edge): edge is RelationEdge & { strength: number } =>
        typeof edge.strength === 'number' && edge.strength > 0
    )
    .slice(0, 5);
  return `<section class="relation-overview" data-relation-overview>
    <div class="relation-grid">
      <article class="relation-map">
        <div class="compare-col">
          <span>对象 A</span>
          ${first ? renderEntityButton(first, 'large') : ''}
          ${third ? renderEntityButton(third, '') : ''}
        </div>
        <div class="compare-mid">
          ${
            dossier.metrics.length
              ? dossier.metrics
                  .slice(0, 4)
                  .map(
                    (
                      metric
                    ) => `<button type="button" class="compare-metric tone-${escapeAttr(metric.tone)}"${detailAttr(
                      metric.note
                    )}>
                <b>${escapeHtml(renderMetricValue(metric.value))}</b>
                <span>${escapeHtml(metric.label)}</span>
              </button>`
                  )
                  .join('')
              : '<p class="relation-empty">上游未提供关系指标；这里只显示对象和来源。</p>'
          }
        </div>
        <div class="compare-col right">
          <span>对象 B / 关系判断</span>
          ${second ? renderEntityButton(second, 'large') : ''}
          ${fourth ? renderEntityButton(fourth, '') : ''}
        </div>
      </article>
      <aside class="relation-side">
        <h2>关系强度</h2>
        ${
          relationStrengthBars.length
            ? renderBars({
                label: 'Relation',
                title: '关系强度',
                body: '',
                bullets: [],
                bars: relationStrengthBars.map((edge, index) => ({
                  label: edge.label,
                  value: edge.strength,
                  note: edge.proof,
                  tone: normalizeTone(edge.label, index)
                }))
              })
            : '<p class="relation-empty">未提供可信关系强度，插件不展示分数。</p>'
        }
        <div class="path-list">
          ${
            dossier.relations.length
              ? dossier.relations
                  .slice(0, 4)
                  .map(
                    (edge) => `<button type="button"${detailAttr(edge.proof)}>
                <strong>${escapeHtml(resolveEntityName(edge.from, visibleEntities))} -> ${escapeHtml(resolveEntityName(edge.to, visibleEntities))}</strong>
                <span>${escapeHtml(edge.label)}${edge.strength ? ` / ${edge.strength}` : ''}</span>
              </button>`
                  )
                  .join('')
              : ''
          }
        </div>
      </aside>
    </div>
  </section>
  <section class="entity-detail" data-entity-detail hidden>
    <button type="button" class="back-button" data-back-overview>返回关系概览</button>
    <span class="detail-type" data-entity-type>对象</span>
    <h2 data-entity-title></h2>
    <p data-entity-summary></p>
    <ul data-entity-facts></ul>
  </section>`;
}

function renderEntityButton(entity: EntityItem, size: string): string {
  return `<button type="button" class="entity-button ${escapeAttr(size)} tone-${escapeAttr(entity.tone)}" data-entity-open="${escapeAttr(
    entity.id
  )}"${detailAttr(entity.summary)}>
    <strong>${escapeHtml(entity.name)}</strong>
    <span>${escapeHtml(entity.type)}</span>
  </button>`;
}

function resolveEntityName(idOrName: string, entities: EntityItem[]): string {
  return (
    entities.find((entity) => entity.id === idOrName || entity.name === idOrName)?.name || idOrName
  );
}

function renderSources(dossier: CompetitiveIntelligenceDossier): string {
  if (!dossier.sources.length) {
    return `<section class="ci-sources">
      <h2>来源与核验</h2>
      <p>上游 Agent 应把官网、工商、财报、新闻、论文、专利、招聘、招投标和访谈线索写入 evidence_json 或 dossier_json.sources。</p>
    </section>`;
  }

  return `<section class="ci-sources">
    <h2>来源与核验</h2>
    <div class="source-grid">
      ${dossier.sources
        .map((source, index) => {
          const url = safeHttpUrl(source.url);
          const body = `<small>${String(index + 1).padStart(2, '0')}</small><strong>${escapeHtml(
            source.publisher
          )}</strong><span>${escapeHtml(source.title)}</span>`;
          return url
            ? `<a href="${escapeAttr(url)}" target="_blank" rel="noreferrer">${body}</a>`
            : `<span>${body}</span>`;
        })
        .join('')}
    </div>
  </section>`;
}

function renderScript(entities: EntityItem[]): string {
  const entityJson = JSON.stringify(entities).replace(/</g, '\\u003c');
  return `<script>
    (() => {
      const entities = ${entityJson};
      const byId = new Map(entities.map((item) => [item.id, item]));
      const overview = document.querySelector('[data-relation-overview]');
      const associations = document.querySelector('[data-entity-associations]');
      const detail = document.querySelector('[data-entity-detail]');
      if (!detail) return;
      const title = detail.querySelector('[data-entity-title]');
      const type = detail.querySelector('[data-entity-type]');
      const summary = detail.querySelector('[data-entity-summary]');
      const facts = detail.querySelector('[data-entity-facts]');
      document.querySelectorAll('[data-entity-open]').forEach((button) => {
        button.addEventListener('click', () => {
          const entity = byId.get(button.getAttribute('data-entity-open'));
          if (!entity) return;
          title.textContent = entity.name;
          type.textContent = entity.type;
          summary.textContent = entity.summary;
          const factItems = entity.facts.length ? entity.facts : ['上游只提供了名称和类型，未提供进一步事实。'];
          facts.replaceChildren(
            ...factItems.map((item) => {
              const li = document.createElement('li');
              li.textContent = item;
              return li;
            })
          );
          if (overview) overview.hidden = true;
          detail.hidden = false;
          detail.scrollIntoView({ block: 'start' });
        });
      });
      detail.querySelector('[data-back-overview]')?.addEventListener('click', () => {
        detail.hidden = true;
        if (overview) {
          overview.hidden = false;
          overview.scrollIntoView({ block: 'start' });
        } else {
          associations?.scrollIntoView({ block: 'start' });
        }
      });
    })();
  </script>`;
}

function renderCss(): string {
  return `${renderWorkgroupBaseCss()}
    * { box-sizing: border-box; }
    html { margin: 0; background: var(--wg-paper); color: var(--wg-ink); font-family: ui-sans-serif, -apple-system, BlinkMacSystemFont, "Segoe UI", "Noto Sans SC", "PingFang SC", Arial, sans-serif; letter-spacing: 0; }
    body { margin: 0; background: var(--wg-paper); overflow-x: hidden; }
    button, a { font: inherit; color: inherit; }
    button { border-radius: 0; }
    a { text-decoration: none; }
    h1, h2, h3, p, li, span, strong, small, b { margin: 0; overflow-wrap: anywhere; }
    .ci-page { width: 100%; max-width: 1240px; margin: 0 auto; padding: 26px 22px 72px; overflow-x: hidden; }
    .mast { display: grid; grid-template-columns: 1fr auto; gap: 18px; align-items: end; border-top: 6px solid var(--wg-ink); border-bottom: 1px solid var(--wg-ink); padding: 16px 0; margin-bottom: 18px; }
    .mast strong { font-size: 14px; font-weight: 950; text-transform: uppercase; }
    .mast span { color: var(--wg-muted); font-size: 12px; font-weight: 850; text-align: right; text-transform: uppercase; }
    .ci-hero { position: relative; min-height: 520px; display: grid; grid-template-columns: minmax(0, 1fr) minmax(300px, .55fr); gap: 18px; align-items: end; overflow: hidden; isolation: isolate; padding: 26px; border: 2px solid var(--wg-ink); background: var(--wg-ink); color: var(--wg-cream); }
    .ci-hero::after { content: ""; position: absolute; inset: 0; z-index: 1; background: rgb(40 40 35 / 64%); pointer-events: none; }
    .ci-hero.no-cover-art::after { background: transparent; }
    .ci-hero > :not(.cover-art) { position: relative; z-index: 2; min-width: 0; }
    .cover-art { position: absolute; inset: 0; z-index: 0; margin: 0; background: var(--wg-ink); overflow: hidden; }
    .cover-art img { display: block; width: 100%; height: 100%; object-fit: cover; object-position: center; opacity: .56; filter: saturate(.9) contrast(1.04); }
    .cover-art.mode-logo img { width: 72%; height: 72%; margin: 7% 0 0 auto; object-fit: contain; object-position: center; opacity: .28; filter: saturate(.8) contrast(1.1); }
    .cover-art.mode-portrait img { object-position: center top; opacity: .5; }
    .cover-art.mode-product img, .cover-art.mode-relation img { opacity: .44; }
    .eyebrow { display: inline-flex; width: fit-content; border: 1px solid var(--wg-ink); padding: 6px 9px; color: var(--wg-muted); font-size: 11px; font-weight: 950; text-transform: uppercase; }
    h1 { margin-top: 28px; font-family: Georgia, "Times New Roman", serif; font-size: clamp(46px, 7.6vw, 88px); line-height: .9; font-weight: 800; }
    .subtitle { max-width: 760px; margin-top: 18px; color: var(--wg-muted); font-size: clamp(15px, 1.8vw, 19px); line-height: 1.55; }
    .tag-row { display: flex; flex-wrap: wrap; gap: 8px; margin-top: 22px; }
    .tag-row span { border: 1px solid var(--wg-line); background: var(--wg-paper); padding: 7px 9px; color: var(--wg-muted); font-size: 11px; font-weight: 900; text-transform: uppercase; }
    .ci-hero .eyebrow { border-color: rgb(255 249 236 / 64%); color: rgb(255 249 236 / 82%); background: rgb(40 40 35 / 52%); }
    .ci-hero .subtitle { color: rgb(255 249 236 / 82%); }
    .ci-hero .tag-row span { border-color: rgb(255 249 236 / 26%); background: rgb(40 40 35 / 54%); color: rgb(255 249 236 / 82%); }
    .hero-note { align-self: stretch; display: grid; align-content: end; gap: 12px; background: rgb(40 40 35 / 88%); color: var(--wg-cream); padding: 20px; }
    .hero-note b { color: var(--wg-yellow); font-family: Georgia, "Times New Roman", serif; font-size: 42px; line-height: .95; }
    .hero-note p { color: rgb(255 249 236 / 78%); font-size: 13px; line-height: 1.55; }
    .ci-metrics { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); margin-top: 18px; border-top: 1px solid var(--wg-line); border-left: 1px solid var(--wg-line); }
    .ci-metric { position: relative; min-width: 0; border-right: 1px solid var(--wg-line); border-bottom: 1px solid var(--wg-line); background: var(--wg-paper-strong); padding: 15px; }
    .ci-metric b { display: block; font-family: Georgia, "Times New Roman", serif; font-size: 34px; line-height: .9; }
    .ci-metric.text-value b { font-family: inherit; font-size: 17px; line-height: 1.25; font-weight: 950; }
    .ci-metric span { display: block; margin-top: 8px; color: var(--wg-muted); font-size: 11px; font-weight: 950; line-height: 1.2; text-transform: uppercase; }
    .tone-charcoal b { color: var(--wg-ink); }
    .tone-fog b { color: var(--wg-fog); }
    .tone-butter b { color: #a87a0d; }
    .tone-yellow b { color: #806400; }
    .tone-coral b { color: var(--wg-coral); }
    .tone-charcoal i { background: var(--wg-ink); }
    .tone-fog i { background: var(--wg-fog); }
    .tone-butter i { background: var(--wg-butter); }
    .tone-yellow i { background: var(--wg-yellow); }
    .tone-coral i { background: var(--wg-coral); }
    [data-detail-title] { position: relative; cursor: default; transition: transform .14s ease, background-color .14s ease; }
    [data-detail-title]:hover { transform: translateY(-2px); outline: 2px solid var(--wg-yellow); outline-offset: 0; }
    [data-detail-title]:hover::after { content: attr(data-detail-title); position: absolute; left: 12px; right: 12px; bottom: calc(100% + 8px); z-index: 20; background: var(--wg-ink); color: var(--wg-cream); border: 1px solid var(--wg-ink); padding: 9px 10px; font-size: 11px; line-height: 1.4; text-align: left; text-transform: none; }
    .ci-section { display: grid; grid-template-columns: minmax(0, .78fr) minmax(0, 1fr); gap: 18px; align-items: stretch; margin-top: 24px; }
    .ci-copy, .ci-chart, .relation-side, .entity-detail, .ci-sources { min-width: 0; border: 1px solid var(--wg-ink); background: var(--wg-paper-strong); }
    .ci-copy { padding: 24px; }
    .ci-copy > span { display: inline-block; margin-bottom: 16px; background: var(--wg-ink); color: var(--wg-cream); padding: 6px 8px; font-size: 10px; font-weight: 950; text-transform: uppercase; }
    .ci-copy h2 { font-family: Georgia, "Times New Roman", serif; font-size: clamp(34px, 4vw, 52px); line-height: .95; font-weight: 800; }
    .ci-copy p { margin-top: 16px; color: var(--wg-muted); font-size: 15px; line-height: 1.7; }
    .ci-copy ul { margin: 16px 0 0; padding-left: 18px; color: var(--wg-ink); font-size: 13px; line-height: 1.65; }
    .ci-chart { margin: 0; padding: 18px; }
    .ci-chart figcaption { margin-bottom: 14px; color: var(--wg-muted); font-size: 11px; font-weight: 950; text-transform: uppercase; }
    .ci-evidence-list { display: grid; gap: 10px; }
    .ci-evidence-list article { min-width: 0; border: 1px solid var(--wg-line); background: var(--wg-paper); padding: 13px; }
    .ci-evidence-list small { display: block; color: var(--wg-coral); font-size: 10px; font-weight: 950; }
    .ci-evidence-list strong { display: block; margin-top: 7px; color: var(--wg-ink); font-size: 13px; line-height: 1.45; }
    .ci-evidence-list span { display: block; margin-top: 7px; color: var(--wg-muted); font-size: 12px; line-height: 1.45; }
    .ci-evidence-list em { display: block; margin-top: 8px; color: var(--wg-fog); font-size: 10px; font-style: normal; font-weight: 950; text-transform: uppercase; }
    .ci-bars { display: grid; gap: 13px; }
    .ci-bar-row { display: grid; grid-template-columns: 112px minmax(0, 1fr) 42px; gap: 10px; align-items: center; padding: 8px; border: 1px solid var(--wg-line); background: var(--wg-paper); }
    .ci-bar-row strong { font-size: 13px; line-height: 1.25; }
    .ci-bar-row b { font-family: Georgia, "Times New Roman", serif; font-size: 18px; line-height: 1; text-align: right; }
    .ci-track { display: block; height: 16px; border: 1px solid rgb(21 17 13 / 42%); background: var(--wg-stone); overflow: hidden; }
    .ci-track i { display: block; height: 100%; }
    .ci-proof-grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 12px; }
    .ci-proof { min-height: 132px; border: 1px solid var(--wg-line); background: var(--wg-paper); padding: 14px; }
    .ci-proof b { display: block; font-family: Georgia, "Times New Roman", serif; font-size: 44px; line-height: .9; }
    .ci-proof strong { display: block; margin-top: 12px; font-size: 15px; line-height: 1.25; }
    .ci-proof span { display: block; margin-top: 8px; color: var(--wg-muted); font-size: 12px; line-height: 1.45; }
    .ci-ecosystem { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); border-top: 1px solid var(--wg-line); border-left: 1px solid var(--wg-line); }
    .ci-ecosystem article { min-height: 220px; display: grid; align-content: center; gap: 12px; border-right: 1px solid var(--wg-line); border-bottom: 1px solid var(--wg-line); padding: 14px; background: var(--wg-paper); }
    .ci-ecosystem article.core { background: var(--wg-yellow); }
    .ci-ecosystem span { color: var(--wg-muted); font-size: 10px; font-weight: 950; text-transform: uppercase; }
    .ci-ecosystem strong { font-family: Georgia, "Times New Roman", serif; font-size: 26px; line-height: 1; }
    .ci-mini-relation { position: relative; min-height: 360px; border: 1px solid var(--wg-line); background: var(--wg-paper); overflow: hidden; }
    .ci-mini-relation .line { position: absolute; left: 50%; top: 50%; width: 35%; height: 2px; background: var(--wg-ink); transform-origin: left center; }
    .ci-mini-relation .l1 { transform: rotate(-150deg); }
    .ci-mini-relation .l2 { transform: rotate(-28deg); }
    .ci-mini-relation .l3 { transform: rotate(140deg); }
    .ci-entity, .entity-button, .compare-metric, .path-list button, .back-button { border: 1px solid var(--wg-ink); background: var(--wg-paper-strong); text-align: left; }
    .ci-entity { position: absolute; width: 172px; padding: 13px; z-index: 2; }
    .ci-entity strong, .entity-button strong { display: block; font-size: 15px; line-height: 1.22; }
    .ci-entity span, .entity-button span { display: block; margin-top: 7px; color: var(--wg-muted); font-size: 10px; font-weight: 950; text-transform: uppercase; }
    .ci-entity.pos-1 { left: 50%; top: 50%; transform: translate(-50%, -50%); background: var(--wg-ink); color: var(--wg-cream); }
    .ci-entity.pos-1 span { color: rgb(255 249 236 / 74%); }
    .ci-entity.pos-2 { left: 7%; top: 12%; border-top: 9px solid var(--wg-fog); }
    .ci-entity.pos-3 { right: 7%; top: 12%; border-top: 9px solid var(--wg-butter); }
    .ci-entity.pos-4 { left: 8%; bottom: 12%; border-top: 9px solid var(--wg-yellow); }
    .relation-overview { margin-top: 24px; }
    .relation-grid { display: grid; grid-template-columns: minmax(0, 1fr) 320px; gap: 18px; align-items: start; }
    .relation-map { display: grid; grid-template-columns: minmax(0, .8fr) minmax(260px, .7fr) minmax(0, .8fr); gap: 12px; min-height: 520px; border: 2px solid var(--wg-ink); background: var(--wg-paper-strong); padding: 18px; }
    .compare-col, .compare-mid { display: grid; gap: 12px; align-content: center; min-width: 0; }
    .compare-col > span { color: var(--wg-muted); font-size: 11px; font-weight: 950; text-transform: uppercase; }
    .entity-button { width: 100%; padding: 16px; border-top-width: 8px; }
    .entity-button.large { min-height: 150px; }
    .entity-button.tone-charcoal { border-top-color: var(--wg-ink); }
    .entity-button.tone-fog { border-top-color: var(--wg-fog); }
    .entity-button.tone-butter { border-top-color: var(--wg-butter); }
    .entity-button.tone-yellow { border-top-color: var(--wg-yellow); }
    .entity-button.tone-coral { border-top-color: var(--wg-coral); }
    .compare-metric { display: grid; grid-template-columns: auto minmax(0, 1fr); gap: 10px; align-items: end; padding: 13px; }
    .compare-metric b { font-family: Georgia, "Times New Roman", serif; font-size: 30px; line-height: .9; }
    .compare-metric span { color: var(--wg-muted); font-size: 11px; font-weight: 950; text-transform: uppercase; }
    .relation-empty { color: var(--wg-muted); font-size: 13px; line-height: 1.55; }
    .relation-side { padding: 18px; }
    .relation-side h2, .entity-detail h2, .ci-sources h2 { font-family: Georgia, "Times New Roman", serif; font-size: 36px; line-height: .95; margin-bottom: 16px; }
    .path-list { display: grid; gap: 10px; margin-top: 16px; }
    .path-list button { padding: 12px; }
    .path-list strong { display: block; font-size: 13px; line-height: 1.35; }
    .path-list span { display: block; margin-top: 6px; color: var(--wg-muted); font-size: 11px; font-weight: 900; text-transform: uppercase; }
    .entity-detail { margin-top: 24px; padding: 24px; }
    .back-button { display: inline-flex; margin-bottom: 16px; padding: 8px 10px; font-size: 12px; font-weight: 900; }
    .detail-type { display: block; color: var(--wg-muted); font-size: 11px; font-weight: 950; text-transform: uppercase; }
    .entity-detail p { margin-top: 14px; max-width: 760px; color: var(--wg-muted); font-size: 15px; line-height: 1.65; }
    .entity-detail ul { margin: 14px 0 0; padding-left: 18px; font-size: 13px; line-height: 1.65; }
    .ci-association-grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 10px; }
    .association-card { min-width: 0; min-height: 140px; display: grid; align-content: start; gap: 9px; border: 1px solid var(--wg-ink); border-top-width: 8px; background: var(--wg-paper); padding: 14px; text-align: left; }
    .association-card.tone-charcoal { border-top-color: var(--wg-ink); }
    .association-card.tone-fog { border-top-color: var(--wg-fog); }
    .association-card.tone-butter { border-top-color: var(--wg-butter); }
    .association-card.tone-yellow { border-top-color: var(--wg-yellow); }
    .association-card.tone-coral { border-top-color: var(--wg-coral); }
    .association-card span { color: var(--wg-muted); font-size: 10px; font-weight: 950; line-height: 1.25; text-transform: uppercase; }
    .association-card strong { font-size: 15px; line-height: 1.28; }
    .association-card small { color: var(--wg-muted); font-size: 12px; line-height: 1.45; }
    .ci-sources { margin-top: 24px; padding: 22px; }
    .ci-sources p { color: var(--wg-muted); line-height: 1.6; }
    .source-grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 10px; }
    .source-grid a, .source-grid > span { min-width: 0; border: 1px solid var(--wg-line); background: var(--wg-paper); padding: 12px; }
    .source-grid small { display: block; color: var(--wg-coral); font-size: 10px; font-weight: 950; }
    .source-grid strong { display: block; margin-top: 6px; font-size: 12px; line-height: 1.2; }
    .source-grid span { display: block; margin-top: 6px; color: var(--wg-muted); font-size: 12px; line-height: 1.45; }
    @media (max-width: 860px) {
      .ci-page { padding: 20px 14px 54px; }
      .mast, .ci-hero, .ci-section, .relation-grid, .relation-map { grid-template-columns: minmax(0, 1fr); }
      .mast span { text-align: left; }
      .ci-hero { min-height: auto; padding: 16px; gap: 14px; align-content: end; }
      h1 { margin-top: 18px; font-size: clamp(28px, 8.2vw, 38px); line-height: 1.02; }
      .subtitle { margin-top: 11px; font-size: 12px; line-height: 1.45; }
      .tag-row { margin-top: 16px; gap: 6px; }
      .tag-row span { padding: 6px 7px; font-size: 10px; }
      .hero-note { min-height: auto; gap: 9px; padding: 14px; }
      .hero-note b { font-size: 22px; line-height: 1.05; }
      .hero-note p { font-size: 11.5px; line-height: 1.5; }
      .ci-copy { padding: 18px; }
      .ci-copy h2 { font-size: clamp(24px, 6.6vw, 32px); line-height: 1.05; }
      .ci-copy p { margin-top: 12px; font-size: 12.5px; line-height: 1.58; }
      .ci-copy ul { margin-top: 12px; font-size: 12px; line-height: 1.55; }
      .ci-chart { padding: 14px; }
      .ci-metrics, .ci-proof-grid, .ci-ecosystem, .source-grid, .ci-association-grid { grid-template-columns: minmax(0, 1fr); }
      .ci-bar-row { grid-template-columns: minmax(0, 1fr) 38px; }
      .ci-bar-row strong { grid-column: 1 / -1; }
      .relation-side { order: 2; }
      .relation-map { min-height: auto; }
      .ci-mini-relation { min-height: 520px; }
      .ci-entity { width: min(190px, 43%); }
      [data-detail-title]:hover::after { position: static; display: block; margin-top: 8px; }
    }
  `;
}

export function renderCompetitiveIntelligenceHtml(dossier: CompetitiveIntelligenceDossier): string {
  const body =
    dossier.kind === 'relation'
      ? renderRelationOverview(dossier)
      : `${renderNarrativeSections(dossier)}${renderEntityAssociationsSection(dossier)}`;

  return `<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${escapeHtml(dossier.title)} · 竞争情报系统</title>
  <style>${renderCss()}</style>
</head>
<body>
  <main class="ci-page ${escapeAttr(dossier.kind)}">
    <header class="mast">
      <strong>iPolloOS Intelligence · ${escapeHtml(templateEyebrow[dossier.kind])}</strong>
      <span>${escapeHtml(dossier.reportDate)} · ${escapeHtml(dossier.industry)}</span>
    </header>
    <section class="ci-hero ${dossier.coverVisual.imageUrl ? 'with-cover-art' : 'no-cover-art'}">
      ${renderCoverArt(dossier)}
      <div>
        <span class="eyebrow">竞争情报系统 · ${escapeHtml(dossier.templateName)}</span>
        <h1>${escapeHtml(dossier.title)}</h1>
        <p class="subtitle">${escapeHtml(dossier.subtitle)}</p>
        <div class="tag-row">${dossier.tags.map((tag) => `<span>${escapeHtml(tag)}</span>`).join('')}</div>
      </div>
      <aside class="hero-note">
        <b>${escapeHtml(dossier.subjectName)}</b>
        <p>${escapeHtml(dossier.summary)}</p>
      </aside>
    </section>
    ${renderMetrics(dossier.metrics)}
    ${body}
    ${renderSources(dossier)}
  </main>
  ${renderScript(dossier.entities)}
</body>
</html>`;
}

function renderEntityAssociationsSection(dossier: CompetitiveIntelligenceDossier): string {
  if (!dossier.entities.length) return '';
  const relationBullets = dossier.relations
    .slice(0, 4)
    .map(
      (edge) =>
        `${resolveEntityName(edge.from, dossier.entities)} -> ${resolveEntityName(edge.to, dossier.entities)}：${edge.label}`
    );
  return `<section class="ci-section">
    <article class="ci-copy">
      <span>Associations</span>
      <h2>${escapeHtml(dossier.kind === 'person' ? '公司与对象关联' : '关联对象与证据路径')}</h2>
      <p>这里展示上游已经查到的关联公司、人物、产品、投资方或生态对象。点击右侧卡片可查看对象小档案；如果上游只给了名称和类型，插件不会补写不存在的细节。</p>
      ${
        relationBullets.length
          ? `<ul>${relationBullets.map((item) => `<li>${escapeHtml(item)}</li>`).join('')}</ul>`
          : ''
      }
    </article>
    <figure class="ci-chart">
      <div class="ci-association-grid" data-entity-associations>
        ${dossier.entities
          .map(
            (
              entity
            ) => `<button type="button" class="association-card tone-${escapeAttr(entity.tone)}" data-entity-open="${escapeAttr(
              entity.id
            )}"${detailAttr(entity.summary)}>
              <span>${escapeHtml(entity.type)}</span>
              <strong>${escapeHtml(entity.name)}</strong>
              <small>${escapeHtml(entity.facts[0] || entity.summary)}</small>
            </button>`
          )
          .join('')}
      </div>
    </figure>
  </section>
  <section class="entity-detail" data-entity-detail hidden>
    <button type="button" class="back-button" data-back-overview>返回关联对象</button>
    <span class="detail-type" data-entity-type>对象</span>
    <h2 data-entity-title></h2>
    <p data-entity-summary></p>
    <ul data-entity-facts></ul>
  </section>`;
}

export function runCompetitiveIntelligenceTool(
  kind: CompetitiveIntelligenceKind,
  props: CompetitiveIntelligenceInput
): CompetitiveIntelligenceOutput {
  const dossier = normalizeCompetitiveIntelligenceDossier(kind, props);
  const fullHtml = renderCompetitiveIntelligenceHtml(dossier);
  return {
    page_html: fullHtml,
    page_url: '',
    page_cover: buildCompetitiveIntelligencePageCover(dossier),
    full_html: fullHtml,
    summary: `已生成 ${dossier.subjectName} 的竞争情报系统${dossier.templateName}，包含核心指标、证据图表、来源与下一步核验。`
  };
}

export function emptyCompetitiveIntelligenceOutput(
  system_error: string
): CompetitiveIntelligenceOutput {
  return {
    page_html: '',
    page_url: '',
    page_cover: '',
    full_html: '',
    summary: '',
    system_error
  };
}
