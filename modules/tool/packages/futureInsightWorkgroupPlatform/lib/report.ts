import { buildWorkgroupSignalTags } from './workgroup-intelligence';

export type AnyRecord = Record<string, unknown>;

export type FutureInsightNewsItem = {
  title: string;
  summary: string;
  impact: 'High impact' | 'Medium-high' | 'Medium' | 'Watch';
  source?: string;
  url?: string;
};

export type FutureInsightReport = {
  input: {
    industry: string;
    preparedFor?: string;
    companyOrProduct: string[];
    competitors: string[];
    regions: string[];
    contentStyle?: string;
    logoUrl?: string;
  };
  publication: {
    name: string;
    eyebrow: string;
    issue: string;
    dateLabel: string;
    footerLeft: string;
    footerRight: string;
  };
  cover: {
    headline: string;
    deck: string;
    metrics: Array<{ value: string; label: string }>;
    visual?: { imageUrl?: string; caption?: string; prompt?: string };
  };
  verdict: {
    label: string;
    title: string;
    body: string;
    bullets: string[];
  };
  newsWall: {
    title: string;
    subtitle: string;
    columns: Array<{ title: string; items: FutureInsightNewsItem[] }>;
  };
  signals: {
    title: string;
    subtitle: string;
    items: Array<{ label: string; title: string; summary: string; hot?: boolean }>;
  };
  radar: {
    label: string;
    title: string;
    body: string[];
    verdict: string;
    visual?: { imageUrl?: string; caption?: string; prompt?: string };
    points: Array<{ label: string; phase: 'Now' | 'Next' | 'Watch'; color?: string }>;
  };
  visualPanels: {
    title: string;
    subtitle: string;
    items: Array<{ title: string; caption: string; imageUrl: string; prompt?: string }>;
  };
  impacts: {
    title: string;
    subtitle: string;
    items: Array<{ label: string; title: string; body: string }>;
  };
  actions: {
    title: string;
    subtitle: string;
    items: Array<{ title: string; bullets: string[] }>;
  };
  sources: {
    title: string;
    subtitle: string;
    items: Array<{ publisher?: string; title: string; url?: string }>;
  };
  keySignals: string[];
};

export type FutureInsightNormalizeInput = {
  industry: string;
  prepared_for?: unknown;
  preparedFor?: unknown;
  competitors?: unknown;
  regions?: unknown;
  report_json?: unknown;
  report_date?: string;
};

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

function normalizeList(value: unknown, max = 12, maxLength = 80): string[] {
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
        if (item && typeof item === 'object') {
          const obj = item as AnyRecord;
          return obj.title || obj.name || obj.label || obj.value || '';
        }
        return item == null ? '' : String(item);
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

function normalizeImpact(value: unknown): FutureInsightNewsItem['impact'] {
  const text = String(value ?? '').toLowerCase();
  if (text.includes('high') || text.includes('高')) return 'High impact';
  if (text.includes('medium-high') || text.includes('较高') || text.includes('中高')) {
    return 'Medium-high';
  }
  if (text.includes('watch') || text.includes('观察')) return 'Watch';
  return 'Medium';
}

function normalizeNewsItem(item: unknown, fallbackTitle: string): FutureInsightNewsItem {
  const obj = item && typeof item === 'object' ? (item as AnyRecord) : {};
  return {
    title: trimText(obj.title || obj.headline || obj.name, fallbackTitle, 140),
    summary: trimText(
      obj.summary || obj.description || obj.body || obj.content,
      '等待上游 AI 补充新闻摘要和影响判断。',
      320
    ),
    impact: normalizeImpact(obj.impact || obj.importance || obj.level),
    source:
      trimText(
        obj.source || obj.sourceName || obj.source_name || obj.publisher || obj.site,
        '',
        100
      ) || undefined,
    url: trimText(obj.url || obj.link, '', 700) || undefined
  };
}

function normalizeVisualPanelItem(item: unknown, fallbackTitle: string) {
  const obj = item && typeof item === 'object' ? (item as AnyRecord) : {};
  const visual = asRecord(obj.visual || obj.asset || obj.media);
  const imageCandidate =
    obj.imageUrl ||
    obj.image_url ||
    obj.url ||
    obj.src ||
    obj.image ||
    visual.imageUrl ||
    visual.image_url ||
    visual.url ||
    visual.src ||
    visual.image;
  const imageUrl = trimText(imageCandidate, '', 700);
  if (!imageUrl) return null;
  return {
    title: trimText(obj.title || obj.headline || obj.name || obj.label, fallbackTitle, 120),
    caption: trimText(
      obj.caption ||
        obj.summary ||
        obj.description ||
        obj.body ||
        visual.caption ||
        visual.description,
      '',
      220
    ),
    imageUrl,
    prompt: trimText(obj.prompt || visual.prompt, '', 500) || undefined
  };
}

function normalizeVisualPanelItems(report: AnyRecord) {
  const candidates = [
    report.visualPanels,
    report.visual_panels,
    report.imagePanels,
    report.image_panels,
    report.visuals,
    report.mediaPanels,
    report.media_panels
  ];
  const rawItems = candidates.flatMap((candidate) => {
    if (Array.isArray(candidate)) return candidate;
    const obj = asRecord(candidate);
    if (Array.isArray(obj.items)) return obj.items;
    if (Array.isArray(obj.images)) return obj.images;
    if (Array.isArray(obj.panels)) return obj.panels;
    return [];
  });
  const seen = new Set<string>();
  return rawItems
    .map((item, index) => normalizeVisualPanelItem(item, `视觉线索 ${index + 1}`))
    .filter((item): item is NonNullable<ReturnType<typeof normalizeVisualPanelItem>> => {
      if (!item) return false;
      const key = item.imageUrl;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    })
    .slice(0, 2);
}

function buildNewsColumns(
  input: {
    industry: string;
    regions: string[];
  },
  items: FutureInsightNewsItem[]
) {
  if (items.length > 0) {
    const columns = ['核心新闻', '行业变化', '市场动作'].map((title) => ({
      title,
      items: [] as FutureInsightNewsItem[]
    }));
    items.slice(0, 12).forEach((item, index) => {
      columns[index % columns.length].items.push(item);
    });
    return columns.filter((column) => column.items.length > 0);
  }

  const regionText = input.regions.length ? input.regions.join('、') : '全球';
  return [
    {
      title: '核心新闻',
      items: [
        {
          title: `${input.industry} 今日关键变化待追踪`,
          summary: '上游 AI 会把每日检索到的公开新闻压缩成可复核、可判断、可行动的摘要。',
          impact: 'High impact' as const
        },
        {
          title: `${regionText} 市场信号需要连续观察`,
          summary: '插件会保持新闻墙位置和结构稳定，但每条新闻内容可按当天信息自然增长。',
          impact: 'Medium-high' as const
        }
      ]
    },
    {
      title: '行业变化',
      items: [
        {
          title: '政策、资本、技术和产品动作合并判断',
          summary: '报告不只罗列新闻，而是把外部变化收束成对业务节奏的判断。',
          impact: 'Medium' as const
        }
      ]
    },
    {
      title: '市场动作',
      items: [
        {
          title: '竞品和渠道动作进入每日监控',
          summary: '招聘、融资、发布、定价和 PR 变化会进入竞争态势分析。',
          impact: 'Watch' as const
        }
      ]
    }
  ];
}

function buildSources(
  newsColumns: FutureInsightReport['newsWall']['columns'],
  reportSources: unknown
) {
  const provided = (() => {
    if (!Array.isArray(reportSources)) return [];
    return reportSources
      .map((source) => {
        const obj = source && typeof source === 'object' ? (source as AnyRecord) : {};
        return {
          publisher:
            trimText(
              obj.publisher ||
                obj.source ||
                obj.sourceName ||
                obj.source_name ||
                obj.site ||
                obj.media,
              '',
              100
            ) || undefined,
          title: trimText(obj.title || obj.name, '来源', 180),
          url: trimText(obj.url || obj.link, '', 700) || undefined
        };
      })
      .filter((item) => item.title || item.url)
      .slice(0, 16);
  })();
  if (provided.length > 0) return provided;

  const fromNews = newsColumns
    .flatMap((column) => column.items)
    .filter((item) => item.url || item.source)
    .map((item) => ({
      publisher: item.source || 'Source',
      title: item.title,
      url: item.url
    }))
    .slice(0, 16);
  if (fromNews.length > 0) return fromNews;

  return [
    { publisher: 'iPolloOS', title: '未来洞察系统生成记录' },
    { publisher: 'Future Insight', title: 'Daily monitoring brief' }
  ];
}

function getZhDate(dateLabel?: string): string {
  const label = trimText(dateLabel, '', 60);
  if (label) return label;
  const parts = new Intl.DateTimeFormat('zh-CN', {
    timeZone: 'Asia/Shanghai',
    year: 'numeric',
    month: 'numeric',
    day: 'numeric'
  }).formatToParts(new Date());
  const year = parts.find((part) => part.type === 'year')?.value ?? '';
  const month = parts.find((part) => part.type === 'month')?.value ?? '';
  const day = parts.find((part) => part.type === 'day')?.value ?? '';
  return `${year} 年 ${month} 月 ${day} 日`;
}

function deepMerge(base: AnyRecord, override: AnyRecord): AnyRecord {
  const next: AnyRecord = { ...base };
  for (const [key, value] of Object.entries(override)) {
    if (value == null || value === '') continue;
    if (Array.isArray(value)) {
      next[key] = value;
      continue;
    }
    if (
      value &&
      typeof value === 'object' &&
      next[key] &&
      typeof next[key] === 'object' &&
      !Array.isArray(next[key])
    ) {
      next[key] = deepMerge(next[key] as AnyRecord, value as AnyRecord);
      continue;
    }
    next[key] = value;
  }
  return next;
}

function asRecord(value: unknown): AnyRecord {
  return value && typeof value === 'object' && !Array.isArray(value) ? (value as AnyRecord) : {};
}

function objectFromSection(value: unknown, itemKey = 'items'): AnyRecord {
  if (Array.isArray(value)) return { [itemKey]: value };
  return asRecord(value);
}

function addIfMissing(target: AnyRecord, key: string, value: unknown) {
  if (target[key] != null && target[key] !== '') return;
  if (value == null || value === '') return;
  target[key] = value;
}

function normalizeSectionAliases(section: AnyRecord, aliases: Array<[string, unknown]>) {
  for (const [key, value] of aliases) {
    addIfMissing(section, key, value);
  }
  return section;
}

function normalizeReportCandidate(report: AnyRecord): AnyRecord {
  const next: AnyRecord = { ...report };
  for (const key of ['publication', 'cover', 'verdict', 'input']) {
    if (key in next && !next[key]) {
      delete next[key];
      continue;
    }
    if (key in next && (typeof next[key] !== 'object' || Array.isArray(next[key]))) {
      delete next[key];
    }
  }

  if (Array.isArray(next.newsWall)) {
    next.newsWall = next.newsWall.some((item) => Array.isArray(asRecord(item).items))
      ? { columns: next.newsWall }
      : {
          columns: buildNewsColumns(
            { industry: '', regions: [] },
            next.newsWall.map((item, index) => normalizeNewsItem(item, `新闻 ${index + 1}`))
          )
        };
  }
  if (Array.isArray(next.news_wall)) {
    next.news_wall = next.news_wall.some((item) => Array.isArray(asRecord(item).items))
      ? { columns: next.news_wall }
      : {
          columns: buildNewsColumns(
            { industry: '', regions: [] },
            next.news_wall.map((item, index) => normalizeNewsItem(item, `新闻 ${index + 1}`))
          )
        };
  }
  if (Array.isArray(next.signals)) next.signals = { items: next.signals };
  if (Array.isArray(next.impacts)) next.impacts = { items: next.impacts };
  if (Array.isArray(next.actions)) next.actions = { items: next.actions };
  if (Array.isArray(next.sources)) next.sources = { items: next.sources };
  if (Array.isArray(next.radar)) next.radar = { points: next.radar };
  if (Array.isArray(next.visualPanels)) next.visualPanels = { items: next.visualPanels };
  if (Array.isArray(next.visuals)) next.visuals = { items: next.visuals };
  if (Array.isArray(next.imagePanels)) next.imagePanels = { items: next.imagePanels };

  next.newsWall = objectFromSection(next.newsWall);
  next.news_wall = objectFromSection(next.news_wall);
  next.signals = objectFromSection(next.signals);
  next.radar = objectFromSection(next.radar, 'points');
  next.visualPanels = objectFromSection(
    next.visualPanels ||
      next.visual_panels ||
      next.imagePanels ||
      next.image_panels ||
      next.visuals ||
      next.mediaPanels ||
      next.media_panels
  );
  next.impacts = objectFromSection(next.impacts);
  next.actions = objectFromSection(next.actions);
  next.sources = objectFromSection(next.sources);
  next.publication = asRecord(next.publication);
  next.cover = asRecord(next.cover);
  next.verdict = asRecord(next.verdict);
  next.input = asRecord(next.input);
  const cover = next.cover as AnyRecord;
  const input = next.input as AnyRecord;
  const verdict = next.verdict as AnyRecord;
  const radar = next.radar as AnyRecord;

  next.cover = normalizeSectionAliases(cover, [
    ['headline', cover.title || cover.name],
    ['deck', cover.subtitle || cover.summary || cover.description]
  ]);
  const coverVisual = asRecord(cover.visual);
  cover.visual = normalizeSectionAliases(coverVisual, [
    [
      'imageUrl',
      coverVisual.imageUrl ||
        coverVisual.image_url ||
        coverVisual.url ||
        coverVisual.src ||
        coverVisual.image ||
        cover.imageUrl ||
        cover.image_url ||
        cover.backgroundImageUrl ||
        cover.background_image_url ||
        cover.coverImageUrl ||
        cover.cover_image_url ||
        cover.visualImageUrl ||
        cover.visual_image_url ||
        next.cover_background_image_url ||
        next.coverBackgroundImageUrl ||
        next.cover_image_url ||
        next.coverImageUrl
    ],
    [
      'caption',
      coverVisual.caption ||
        coverVisual.alt ||
        coverVisual.description ||
        cover.visualCaption ||
        cover.visual_caption ||
        cover.caption
    ],
    ['prompt', coverVisual.prompt || cover.visualPrompt || cover.visual_prompt || cover.prompt]
  ]);
  if (!Array.isArray(cover.metrics) && cover.tags) {
    const tags = normalizeList(cover.tags, 4);
    if (tags.length) {
      cover.metrics = tags.map((tag) => ({ value: tag, label: 'tag' }));
    }
  }

  next.input = normalizeSectionAliases(input, [
    ['preparedFor', input.prepared_for || next.prepared_for || next.preparedFor],
    ['companyOrProduct', input.company_or_product || next.company_or_product],
    ['competitors', input.competitors || next.competitors],
    ['regions', input.regions || next.regions]
  ]);

  const verdictBullets = normalizeList(verdict.bullets || verdict.points || verdict.items, 6, 260);
  next.verdict = normalizeSectionAliases(verdict, [
    ['title', verdict.headline || verdict.name],
    [
      'body',
      verdict.summary ||
        verdict.description ||
        verdict.conclusion ||
        verdict.judgement ||
        verdict.judgment
    ]
  ]);
  if (verdictBullets.length) {
    verdict.bullets = verdictBullets;
  }

  next.radar = normalizeSectionAliases(radar, [
    ['title', radar.trend || radar.headline || radar.name],
    ['verdict', radar.judgement || radar.judgment || radar.summary]
  ]);
  const radarVisual = asRecord(radar.visual);
  radar.visual = normalizeSectionAliases(radarVisual, [
    [
      'imageUrl',
      radarVisual.image_url ||
        radarVisual.url ||
        radarVisual.src ||
        radarVisual.image ||
        radar.imageUrl ||
        radar.image_url ||
        radar.visualImageUrl ||
        radar.visual_image_url ||
        next.visualImageUrl ||
        next.visual_image_url
    ],
    [
      'caption',
      radarVisual.caption ||
        radarVisual.alt ||
        radarVisual.description ||
        radar.visualCaption ||
        radar.visual_caption ||
        next.visualCaption ||
        next.visual_caption
    ],
    [
      'prompt',
      radarVisual.prompt ||
        radar.visualPrompt ||
        radar.visual_prompt ||
        next.visualPrompt ||
        next.visual_prompt
    ]
  ]);
  if (!Array.isArray(radar.body)) {
    const bodyItems = normalizeList(radar.body || radar.description || radar.details, 4);
    if (bodyItems.length) radar.body = bodyItems;
  }
  if (!Array.isArray(radar.points) && Array.isArray(radar.items)) {
    radar.points = radar.items;
  }

  return next;
}

export function normalizeFutureInsightReport(
  raw: FutureInsightNormalizeInput
): FutureInsightReport {
  const reportCandidate = normalizeReportCandidate(
    asRecord(parseJson(raw.report_json, 'report_json'))
  );
  const reportInput = asRecord(reportCandidate.input);
  const companyOrProduct = [...normalizeList(reportInput.companyOrProduct)];
  const industry = trimText(
    raw.industry || reportInput.industry || companyOrProduct[0],
    '关注行业',
    120
  );
  const preparedFor = trimText(
    raw.prepared_for ||
      raw.preparedFor ||
      reportInput.preparedFor ||
      reportInput.prepared_for ||
      companyOrProduct[0],
    '',
    100
  );
  const competitors = [
    ...normalizeList(raw.competitors),
    ...normalizeList(reportInput.competitors)
  ].slice(0, 12);
  const regions = [...normalizeList(raw.regions), ...normalizeList(reportInput.regions)].slice(
    0,
    10
  );
  const reportNewsWall = asRecord(reportCandidate.newsWall || reportCandidate.news_wall);
  const directNewsItems = Array.isArray(reportNewsWall.items)
    ? reportNewsWall.items
        .slice(0, 18)
        .map((item, index) => normalizeNewsItem(item, `新闻 ${index + 1}`))
    : [];
  const newsColumns =
    Array.isArray(reportNewsWall.columns) && reportNewsWall.columns.length
      ? reportNewsWall.columns
          .slice(0, 4)
          .map((column, index) => {
            const obj = asRecord(column);
            return {
              title: trimText(obj.title, `新闻组 ${index + 1}`, 80),
              items: Array.isArray(obj.items)
                ? obj.items
                    .slice(0, 6)
                    .map((item, itemIndex) => normalizeNewsItem(item, `新闻 ${itemIndex + 1}`))
                : []
            };
          })
          .filter((column) => column.items.length > 0)
      : buildNewsColumns({ industry, regions }, directNewsItems);

  const sourceItems = buildSources(newsColumns, asRecord(reportCandidate.sources).items);
  const dateLabelSource = raw.report_date || asRecord(reportCandidate.publication).dateLabel;
  const dateLabel = getZhDate(typeof dateLabelSource === 'string' ? dateLabelSource : undefined);
  const recipient = preparedFor || companyOrProduct[0] || industry;
  const competitorText = competitors.length ? competitors.join('、') : '重点竞品';
  const visualPanelItems = normalizeVisualPanelItems(reportCandidate);
  const fallback: FutureInsightReport = {
    input: {
      industry,
      preparedFor,
      companyOrProduct: Array.from(new Set(companyOrProduct)).slice(0, 8),
      competitors: Array.from(new Set(competitors)).slice(0, 12),
      regions: Array.from(new Set(regions)).slice(0, 10),
      contentStyle: trimText(reportInput.contentStyle, '杂志式未来洞察报告', 140),
      logoUrl: trimText(reportInput.logoUrl, '', 700)
    },
    publication: {
      name: 'Future Insight Review',
      eyebrow: 'iPolloOS Intelligence',
      issue: 'Daily Brief',
      dateLabel,
      footerLeft: 'iPolloOS · Future Insight System',
      footerRight: `Prepared Brief · ${dateLabel.replace(/\s/g, '')}`
    },
    cover: {
      headline: trimText(asRecord(reportCandidate.cover).headline, `${industry} 未来洞察`, 120),
      deck: trimText(
        asRecord(reportCandidate.cover).deck,
        `围绕 ${industry}，把今日新闻、趋势、竞品和影响压缩成一份可执行判断。`,
        360
      ),
      metrics: [
        {
          value: String(newsColumns.reduce((sum, column) => sum + column.items.length, 0)),
          label: 'headline picks'
        },
        { value: '4', label: 'key signals' },
        { value: '3', label: 'next moves' },
        { value: String(sourceItems.length), label: 'sources cited' }
      ],
      visual: {
        imageUrl: trimText(asRecord(asRecord(reportCandidate.cover).visual).imageUrl, '', 700),
        caption: trimText(asRecord(asRecord(reportCandidate.cover).visual).caption, '', 180),
        prompt: trimText(asRecord(asRecord(reportCandidate.cover).visual).prompt, '', 500)
      }
    },
    verdict: {
      label: 'Verdict',
      title: '今日结论',
      body: `今天最重要的不是单条新闻，而是判断 ${industry} 的变化是否会影响 ${recipient} 的产品、市场、资本和竞争节奏。`,
      bullets: []
    },
    newsWall: {
      title: '新闻墙',
      subtitle: '先看每日变化，再看后面的信号归纳',
      columns: newsColumns
    },
    signals: {
      title: '关键信号',
      subtitle: '从新闻墙提炼出的 3 到 4 个判断',
      items: [
        {
          label: 'Future Lens',
          title: '外部变化正在形成新判断',
          summary: `围绕 ${industry} 的新闻需要按政策、资本、技术和产品动作一起看。`,
          hot: true
        },
        {
          label: 'Competition',
          title: '竞争动作需要连续监控',
          summary: `${competitorText} 的公开发布、融资、招聘和产品节奏会影响后续行动优先级。`
        },
        {
          label: 'Decision Loop',
          title: '简报必须回到行动',
          summary: '报告最后需要沉淀为任务、会议准备、跟进事项和复盘节点。'
        }
      ]
    },
    radar: {
      label: 'Trend Radar',
      title: '趋势雷达',
      body: [
        `当前更应该优先看 ${industry} 中已经影响用户决策和市场动作的信号。`,
        '视觉区域可以接入生成图，但标题、判断和来源仍由结构化内容承载。'
      ],
      verdict: '判断：先抓确定性高、能在 7 天内转成动作的机会。',
      visual: {
        imageUrl: trimText(asRecord(asRecord(reportCandidate.radar).visual).imageUrl, '', 700),
        caption: `${industry} 的公开信号正在收束成新的行动优先级。`
      },
      points: [
        { label: 'Core Signal', phase: 'Now', color: '#f97316' },
        { label: 'Market Move', phase: 'Now', color: '#84cc16' },
        { label: 'Competitor Watch', phase: 'Next', color: '#2563eb' },
        { label: 'Policy / Capital', phase: 'Watch', color: '#111827' }
      ]
    },
    visualPanels: {
      title: '视觉线索',
      subtitle: '需要图片承载的关键变化，最多保留 1 到 2 张',
      items: visualPanelItems
    },
    impacts: {
      title: '影响判断',
      subtitle: '这些变化对当前业务的直接影响',
      items: [
        {
          label: 'Product',
          title: '产品节奏',
          body: '把今天的信号转成产品优先级、上线窗口和风险验证。'
        },
        {
          label: 'Market',
          title: '市场窗口',
          body: '判断哪些新闻会改变用户认知、销售话术或渠道进入顺序。'
        },
        {
          label: 'Risk',
          title: '外部风险',
          body: '关注政策、资信、竞品反击和合作对象背景带来的不确定性。'
        }
      ]
    },
    actions: {
      title: '7 天行动清单',
      subtitle: '把资讯判断转成可执行动作',
      items: [
        {
          title: '确认高优先级信号',
          bullets: ['把 1 到 2 条高影响新闻转成具体跟进任务。', '标注负责人、截止时间和复盘节点。']
        },
        {
          title: '更新竞争监控列表',
          bullets: ['补充重点竞品、产品、融资和招聘关键词。', '过滤低价值信息源，保留可回溯链接。']
        },
        {
          title: '准备下一次会议材料',
          bullets: ['会议前整理对方公司和人物背景。', '会后沉淀纪要、风险和下一步行动。']
        }
      ]
    },
    sources: {
      title: '来源',
      subtitle: '来源用于复核判断，正式简报应尽量保留原始链接',
      items: sourceItems
    },
    keySignals: []
  };

  const merged = deepMerge(
    fallback as unknown as AnyRecord,
    reportCandidate
  ) as unknown as FutureInsightReport;
  merged.publication = {
    ...fallback.publication,
    ...asRecord(merged.publication)
  };
  merged.cover = {
    ...fallback.cover,
    ...asRecord(merged.cover)
  };
  merged.verdict = {
    ...fallback.verdict,
    ...asRecord(merged.verdict)
  };
  merged.newsWall = {
    ...fallback.newsWall,
    ...asRecord(merged.newsWall)
  };
  merged.signals = {
    ...fallback.signals,
    ...asRecord(merged.signals)
  };
  merged.radar = {
    ...fallback.radar,
    ...asRecord(merged.radar)
  };
  merged.visualPanels = {
    ...fallback.visualPanels,
    ...asRecord(merged.visualPanels)
  };
  merged.impacts = {
    ...fallback.impacts,
    ...asRecord(merged.impacts)
  };
  merged.actions = {
    ...fallback.actions,
    ...asRecord(merged.actions)
  };
  merged.sources = {
    ...fallback.sources,
    ...asRecord(merged.sources)
  };
  merged.input = fallback.input;
  merged.newsWall.columns = newsColumns;
  merged.sources.items = sourceItems;
  merged.cover.visual = {
    imageUrl: trimText(
      asRecord(merged.cover.visual).imageUrl || asRecord(merged.radar.visual).imageUrl,
      '',
      700
    ),
    caption: trimText(asRecord(merged.cover.visual).caption, '', 180),
    prompt: trimText(asRecord(merged.cover.visual).prompt, '', 500)
  };
  merged.verdict = {
    ...merged.verdict,
    label: trimText(asRecord(merged.verdict).label, fallback.verdict.label, 80),
    title: trimText(asRecord(merged.verdict).title, fallback.verdict.title, 180),
    body: trimText(asRecord(merged.verdict).body, fallback.verdict.body, 700),
    bullets: normalizeList(
      asRecord(merged.verdict).bullets ||
        asRecord(merged.verdict).points ||
        asRecord(merged.verdict).items,
      6,
      260
    )
  };
  merged.cover.metrics =
    Array.isArray(merged.cover?.metrics) && merged.cover.metrics.length
      ? merged.cover.metrics.slice(0, 4).map((metric, index) => {
          const obj = asRecord(metric);
          return {
            value: trimText(obj.value, fallback.cover.metrics[index]?.value ?? '', 40),
            label: trimText(obj.label, fallback.cover.metrics[index]?.label ?? 'metric', 80)
          };
        })
      : fallback.cover.metrics;
  merged.signals.items =
    Array.isArray(merged.signals?.items) && merged.signals.items.length
      ? merged.signals.items.slice(0, 6).map((signal, index) => {
          const obj = asRecord(signal);
          const fallbackItem = fallback.signals.items[index % fallback.signals.items.length];
          return {
            label: trimText(obj.label || obj.level || obj.category, fallbackItem.label, 80),
            title: trimText(obj.title || obj.signal || obj.name, fallbackItem.title, 160),
            summary: trimText(
              obj.summary || obj.description || obj.body || obj.detail || obj.content,
              fallbackItem.summary,
              360
            ),
            hot: Boolean(obj.hot ?? fallbackItem.hot)
          };
        })
      : fallback.signals.items;
  merged.radar.body =
    Array.isArray(merged.radar?.body) && merged.radar.body.length
      ? merged.radar.body
          .map((item) => trimText(item, '', 360))
          .filter(Boolean)
          .slice(0, 4)
      : fallback.radar.body;
  merged.radar.points =
    Array.isArray(merged.radar?.points) && merged.radar.points.length
      ? merged.radar.points.slice(0, 8).map((point, index) => {
          const obj = asRecord(point);
          const fallbackPoint = fallback.radar.points[index % fallback.radar.points.length];
          const phaseText = trimText(obj.phase, fallbackPoint.phase, 20);
          const phase =
            phaseText === 'Now' || phaseText === 'Next' || phaseText === 'Watch'
              ? phaseText
              : fallbackPoint.phase;
          return {
            label: trimText(
              obj.label || obj.trend || obj.title || obj.name,
              fallbackPoint.label,
              100
            ),
            phase,
            color: trimText(obj.color, fallbackPoint.color, 40)
          };
        })
      : fallback.radar.points;
  merged.radar.visual = {
    imageUrl: trimText(
      asRecord(merged.radar.visual).imageUrl,
      fallback.radar.visual?.imageUrl || '',
      700
    ),
    caption: trimText(
      asRecord(merged.radar.visual).caption,
      fallback.radar.visual?.caption || '',
      180
    ),
    prompt: trimText(asRecord(merged.radar.visual).prompt, '', 500)
  };
  merged.visualPanels = {
    title: trimText(asRecord(merged.visualPanels).title, fallback.visualPanels.title, 120),
    subtitle: trimText(asRecord(merged.visualPanels).subtitle, fallback.visualPanels.subtitle, 180),
    items: normalizeVisualPanelItems(merged as unknown as AnyRecord)
  };
  merged.impacts.items =
    Array.isArray(merged.impacts?.items) && merged.impacts.items.length
      ? merged.impacts.items.slice(0, 6).map((item, index) => {
          const obj = asRecord(item);
          const fallbackItem = fallback.impacts.items[index % fallback.impacts.items.length];
          return {
            label: trimText(obj.label || obj.level || obj.category, fallbackItem.label, 80),
            title: trimText(obj.title || obj.name || obj.topic, fallbackItem.title, 160),
            body: trimText(
              obj.body || obj.summary || obj.judgement || obj.judgment || obj.description,
              fallbackItem.body,
              360
            )
          };
        })
      : fallback.impacts.items;
  merged.actions.items =
    Array.isArray(merged.actions?.items) && merged.actions.items.length
      ? merged.actions.items.slice(0, 6).map((action, index) => {
          const obj = asRecord(action);
          const fallbackItem = fallback.actions.items[index % fallback.actions.items.length];
          const taskText = trimText(obj.task || obj.description || obj.body, '', 260);
          const dayText = trimText(obj.day || obj.date || obj.phase, '', 40);
          const explicitTitle = trimText(obj.title || obj.name || obj.heading, '', 160);
          const bullets = normalizeList(
            obj.tasks || obj.bullets || obj.bullet || obj.items || obj.steps,
            5,
            220
          );
          const title =
            explicitTitle ||
            (bullets.length && taskText ? taskText : '') ||
            (dayText ? `${dayText} 行动` : fallbackItem.title);
          const shouldUseTaskAsBullet = taskText && taskText !== title;
          return {
            title,
            bullets: bullets.length
              ? bullets
              : shouldUseTaskAsBullet
                ? [taskText]
                : fallbackItem.bullets
          };
        })
      : fallback.actions.items;
  merged.keySignals = buildWorkgroupSignalTags({
    rawTags: [
      ...normalizeList(
        reportCandidate.tags || reportCandidate.keyTags || reportCandidate.key_tags,
        8,
        40
      ),
      ...normalizeList(asRecord(reportCandidate.cover).tags, 8, 40),
      ...companyOrProduct,
      ...competitors
    ],
    entities: [
      ...companyOrProduct.map((name) => ({ name })),
      ...competitors.map((name) => ({ name }))
    ],
    newsItems: newsColumns.flatMap((column) =>
      column.items.map((item) => ({ title: item.title, summary: item.summary, label: item.source }))
    ),
    signals: merged.signals.items.map((item) => ({
      title: item.title,
      summary: item.summary,
      label: item.label
    })),
    radarPoints: merged.radar.points.map((point) => ({ label: point.label })),
    sources: sourceItems.map((item) => ({ title: item.title, label: item.publisher })),
    metrics: merged.cover.metrics.map((metric) => ({ label: metric.label, value: metric.value })),
    industry,
    fallback: industry,
    max: 6
  });
  return merged;
}
