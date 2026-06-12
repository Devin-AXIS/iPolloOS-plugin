export const VIDEO_PURPOSES = [
  {
    id: 'product-intro',
    zhName: '产品介绍',
    enName: 'Product intro',
    description: '产品发布、SaaS/AI 工具介绍、插件能力说明、功能卖点介绍。',
    structure: ['痛点', '产品定位', '核心能力', '工作流/使用方式', '价值总结', 'CTA']
  },
  {
    id: 'news-briefing',
    zhName: '资讯解读',
    enName: 'News briefing',
    description: 'AI 新闻周报、行业动态、模型更新、融资/产品事件解读。',
    structure: ['Hook', '事件列表', '关键变化', '影响判断', 'iPolloOS 建议', '结论']
  },
  {
    id: 'research-briefing',
    zhName: '研究报告视频版',
    enName: 'Research briefing',
    description: '白皮书、研究报告、咨询报告、战略分析、论文/开源项目解读。',
    structure: ['一句话结论', '背景问题', '关键发现', '证据/对比', '架构图/流程图', '建议和风险']
  },
  {
    id: 'architecture-explainer',
    zhName: '架构方案讲解',
    enName: 'Architecture explainer',
    description: 'Agent 架构、插件调用流、系统设计、技术方案、工程路线。',
    structure: ['目标', '模块', '调用链', '数据流', '风险点', '推荐方案']
  },
  {
    id: 'feature-demo',
    zhName: '功能演示',
    enName: 'Feature demo',
    description: '软件功能、插件操作、内部工具、流程自动化演示。',
    structure: ['使用场景', '操作步骤', '结果展示', '前后对比', '使用建议']
  }
] as const;

export const VIDEO_STYLES = [
  {
    id: 'magazine-editorial',
    zhName: '杂志风',
    enName: 'Magazine editorial',
    description: '高级杂志排版、强留白、编辑部图表、章节卡和引用块。',
    visualLanguage:
      '大标题 + kicker，图文比例强，允许 drop cap、pull quote、章节卡；图表像编辑部图表，不像后台 dashboard。',
    motion:
      '慢速推入、章节翻页、引用块扫光、图片遮罩 reveal；转场以 editorial wipe/crossfade 为主。',
    fonts: ['Source Serif Pro', 'Playfair Display', 'Noto Serif SC', 'Inter', 'Noto Sans SC']
  },
  {
    id: 'tech-product',
    zhName: '科技产品风',
    enName: 'Tech product',
    description: '适合 AI 产品、SaaS、插件和功能发布。',
    visualLanguage: '深色或浅色科技界面、细线框、玻璃质感、柔和阴影、产品界面局部放大。',
    motion:
      '精准 grid reveal、产品界面局部 zoom、能力模块 stagger；转场以 geometric wipe/zoom 为主。',
    fonts: ['Inter', 'SF Pro', 'Noto Sans SC', 'JetBrains Mono']
  },
  {
    id: 'consulting-report',
    zhName: '咨询报告风',
    enName: 'Consulting report',
    description: '适合内部决策、研究报告、方案说明和管理汇报。',
    visualLanguage: '结构严谨，图表、矩阵、架构图占主导，配色克制，层级清楚。',
    motion: '图表逐步构建、矩阵分层出现、架构线条追踪；转场以 clean slide/reveal 为主。',
    fonts: ['Inter', 'Noto Sans SC', 'IBM Plex Sans', 'IBM Plex Mono']
  },
  {
    id: 'keynote-launch',
    zhName: '发布会 Keynote 风',
    enName: 'Keynote launch',
    description: '适合产品发布、功能发布、愿景表达。',
    visualLanguage: '一屏一个观点，大字号，强节奏转场，画面干净有冲击力。',
    motion: '一屏一个观点，强节奏 scale/fade，长 hold；转场以 cinematic zoom/cross-warp 为主。',
    fonts: ['SF Pro', 'Inter Tight', 'Noto Sans SC']
  },
  {
    id: 'data-journalism',
    zhName: '数据新闻风',
    enName: 'Data journalism',
    description: '适合趋势、排行、对比、市场数据和研究结论。',
    visualLanguage: '图表驱动叙事，折线、柱状、排行、时间线，关键数字动效揭示。',
    motion: '数据计数、曲线绘制、排行上升、时间线推进；转场以 data morph/wipe 为主。',
    fonts: ['Source Serif Pro', 'IBM Plex Mono', 'Inter']
  },
  {
    id: 'social-reel',
    zhName: '竖屏社媒风',
    enName: 'Social reel',
    description: '适合短视频平台的快节奏解释、资讯卡点和功能切片。',
    visualLanguage: '强 Hook、大字幕、高对比关键词、快速卡点，信息密度高但不能拥挤。',
    motion: '0.3-0.6 秒强入场、关键词弹出、字幕卡点；转场以 snap/cut-with-mask 为主。',
    fonts: ['Inter Tight', 'Noto Sans SC', 'DIN Condensed']
  }
] as const;

export const VIDEO_TEMPLATES = [
  {
    id: 'product-launch-landscape',
    zhName: '产品发布横屏片',
    enName: 'Product launch landscape',
    purposeId: 'product-intro',
    styleId: 'tech-product',
    orientation: 'landscape',
    description: '适合 AI 产品、SaaS、插件能力发布，强调产品定位、核心能力和价值闭环。',
    scenePlan: ['痛点开场', '产品亮相', '三段核心能力', '工作流演示', '价值总结', 'CTA']
  },
  {
    id: 'keynote-product-story',
    zhName: '发布会 Keynote 叙事',
    enName: 'Keynote product story',
    purposeId: 'product-intro',
    styleId: 'keynote-launch',
    orientation: 'landscape',
    description: '一屏一个观点，适合做新品发布、愿景表达、重大功能发布。',
    scenePlan: ['Big idea', '关键变化', '能力展开', '高光镜头', '总结口号']
  },
  {
    id: 'feature-demo-walkthrough',
    zhName: '功能演示讲解',
    enName: 'Feature demo walkthrough',
    purposeId: 'feature-demo',
    styleId: 'tech-product',
    orientation: 'landscape',
    description: '适合软件操作、插件流程、后台能力演示，强调步骤和结果对比。',
    scenePlan: ['场景问题', '步骤一', '步骤二', '结果展示', '前后对比', '使用建议']
  },
  {
    id: 'social-feature-reel',
    zhName: '竖屏功能短视频',
    enName: 'Social feature reel',
    purposeId: 'feature-demo',
    styleId: 'social-reel',
    orientation: 'portrait',
    description: '适合短视频平台，强 Hook、大字幕、高节奏展示一个能力点。',
    scenePlan: ['3 秒 Hook', '痛点', '快速演示', '结果放大', '行动提示']
  },
  {
    id: 'ai-news-magazine',
    zhName: 'AI 资讯杂志片',
    enName: 'AI news magazine',
    purposeId: 'news-briefing',
    styleId: 'magazine-editorial',
    orientation: 'landscape',
    description: '适合 AI 新闻周报、行业动态解读，用杂志排版和章节卡组织信息。',
    scenePlan: ['封面 Hook', '新闻列表', '重点事件', '影响判断', '建议', '结论']
  },
  {
    id: 'news-reel-portrait',
    zhName: '竖屏资讯快讯',
    enName: 'Portrait news reel',
    purposeId: 'news-briefing',
    styleId: 'social-reel',
    orientation: 'portrait',
    description: '适合短新闻、模型更新、融资/产品事件，用快节奏字幕卡讲清楚。',
    scenePlan: ['一句话新闻', '三条要点', '关键数字', '影响', '结论']
  },
  {
    id: 'research-report-briefing',
    zhName: '研究报告视频版',
    enName: 'Research report briefing',
    purposeId: 'research-briefing',
    styleId: 'consulting-report',
    orientation: 'landscape',
    description: '适合白皮书、论文、咨询报告，强调结论、证据、架构图和风险建议。',
    scenePlan: ['一句话结论', '背景问题', '关键发现', '证据对比', '架构/流程图', '建议和风险']
  },
  {
    id: 'architecture-deep-dive',
    zhName: '架构方案讲解',
    enName: 'Architecture deep dive',
    purposeId: 'architecture-explainer',
    styleId: 'consulting-report',
    orientation: 'landscape',
    description: '适合 Agent 架构、插件调用链、系统设计方案，强调模块、数据流和风险点。',
    scenePlan: ['目标', '模块分层', '调用链', '数据流', '关键风险', '推荐方案']
  },
  {
    id: 'data-insight-story',
    zhName: '数据洞察叙事',
    enName: 'Data insight story',
    purposeId: 'research-briefing',
    styleId: 'data-journalism',
    orientation: 'landscape',
    description: '适合趋势、排行、市场数据和研究发现，以图表动效驱动叙事。',
    scenePlan: ['核心问题', '关键数字', '趋势变化', '对比排行', '原因解释', '结论']
  }
] as const;

export type VideoPurposeId = (typeof VIDEO_PURPOSES)[number]['id'];
export type VideoStyleId = (typeof VIDEO_STYLES)[number]['id'];
export type VideoTemplateId = (typeof VIDEO_TEMPLATES)[number]['id'];

export const VIDEO_PURPOSE_IDS = VIDEO_PURPOSES.map((item) => item.id) as [
  VideoPurposeId,
  ...VideoPurposeId[]
];
export const VIDEO_STYLE_IDS = VIDEO_STYLES.map((item) => item.id) as [
  VideoStyleId,
  ...VideoStyleId[]
];
export const VIDEO_TEMPLATE_IDS = VIDEO_TEMPLATES.map((item) => item.id) as [
  VideoTemplateId,
  ...VideoTemplateId[]
];

const normalizeKey = (value: unknown) =>
  typeof value === 'string'
    ? value
        .trim()
        .toLowerCase()
        .replace(/[\s_]+/g, '-')
    : '';

const makeAliasMap = <T extends { id: string; zhName: string; enName: string }>(
  items: readonly T[],
  extraAliases: Record<string, string>
) => {
  const map = new Map<string, string>();
  for (const item of items) {
    map.set(normalizeKey(item.id), item.id);
    map.set(normalizeKey(item.zhName), item.id);
    map.set(normalizeKey(item.enName), item.id);
  }
  for (const [alias, id] of Object.entries(extraAliases)) {
    map.set(normalizeKey(alias), id);
  }
  return map;
};

const purposeAliasMap = makeAliasMap(VIDEO_PURPOSES, {
  新闻: 'news-briefing',
  资讯: 'news-briefing',
  新闻解读: 'news-briefing',
  ai资讯: 'news-briefing',
  产品: 'product-intro',
  产品视频: 'product-intro',
  报告: 'research-briefing',
  研究: 'research-briefing',
  白皮书: 'research-briefing',
  架构: 'architecture-explainer',
  方案: 'architecture-explainer',
  演示: 'feature-demo',
  demo: 'feature-demo'
});

const styleAliasMap = makeAliasMap(VIDEO_STYLES, {
  magazine: 'magazine-editorial',
  magazine_style: 'magazine-editorial',
  'magazine-style': 'magazine-editorial',
  杂志: 'magazine-editorial',
  杂志风格: 'magazine-editorial',
  科技: 'tech-product',
  科技风: 'tech-product',
  科技产品: 'tech-product',
  产品风: 'tech-product',
  consulting: 'consulting-report',
  report: 'consulting-report',
  咨询: 'consulting-report',
  咨询风: 'consulting-report',
  报告风: 'consulting-report',
  keynote: 'keynote-launch',
  keynote风: 'keynote-launch',
  发布会: 'keynote-launch',
  发布会风: 'keynote-launch',
  data: 'data-journalism',
  data_news: 'data-journalism',
  'data-news': 'data-journalism',
  数据: 'data-journalism',
  数据新闻: 'data-journalism',
  数据新闻风: 'data-journalism',
  social: 'social-reel',
  reel: 'social-reel',
  social_reel: 'social-reel',
  竖屏: 'social-reel',
  短视频: 'social-reel',
  社媒: 'social-reel',
  竖屏社媒: 'social-reel'
});

const templateAliasMap = makeAliasMap(VIDEO_TEMPLATES, {
  横屏新闻: 'ai-news-magazine',
  ai新闻: 'ai-news-magazine',
  ai资讯: 'ai-news-magazine',
  新闻杂志: 'ai-news-magazine',
  竖屏新闻: 'news-reel-portrait',
  资讯快讯: 'news-reel-portrait',
  产品发布: 'product-launch-landscape',
  产品介绍: 'product-launch-landscape',
  发布会: 'keynote-product-story',
  功能演示: 'feature-demo-walkthrough',
  竖屏功能: 'social-feature-reel',
  研究报告: 'research-report-briefing',
  架构讲解: 'architecture-deep-dive',
  数据洞察: 'data-insight-story'
});

export function normalizeVideoPurposeId(value: unknown) {
  const normalized = purposeAliasMap.get(normalizeKey(value));
  return normalized as VideoPurposeId | undefined;
}

export function normalizeVideoStyleId(value: unknown) {
  const normalized = styleAliasMap.get(normalizeKey(value));
  return normalized as VideoStyleId | undefined;
}

export function normalizeVideoTemplateId(value: unknown) {
  const normalized = templateAliasMap.get(normalizeKey(value));
  return normalized as VideoTemplateId | undefined;
}

export function resolveVideoTemplateForOrientation(params: {
  videoTemplateId?: VideoTemplateId;
  purposeId?: VideoPurposeId;
  styleId?: VideoStyleId;
  orientation: 'landscape' | 'portrait';
}) {
  const template = params.videoTemplateId ? getVideoTemplate(params.videoTemplateId) : undefined;
  if (!template || template.orientation === params.orientation) {
    return params.videoTemplateId;
  }

  return (
    VIDEO_TEMPLATES.find(
      (item) =>
        item.orientation === params.orientation &&
        item.purposeId === template.purposeId &&
        (!params.styleId || item.styleId === params.styleId)
    )?.id ||
    VIDEO_TEMPLATES.find(
      (item) => item.orientation === params.orientation && item.purposeId === template.purposeId
    )?.id ||
    VIDEO_TEMPLATES.find(
      (item) =>
        item.orientation === params.orientation &&
        params.purposeId &&
        item.purposeId === params.purposeId
    )?.id ||
    params.videoTemplateId
  );
}

export function getVideoPurpose(id: string) {
  return VIDEO_PURPOSES.find((item) => item.id === id);
}

export function getVideoStyle(id: string) {
  return VIDEO_STYLES.find((item) => item.id === id);
}

export function getVideoTemplate(id: string) {
  return VIDEO_TEMPLATES.find((item) => item.id === id);
}

export function listVideoPurposeOptions() {
  return VIDEO_PURPOSES.map((item) => ({
    label: `${item.zhName} / ${item.enName}`,
    value: item.id,
    description: item.description
  }));
}

export function listVideoStyleOptions() {
  return VIDEO_STYLES.map((item) => ({
    label: `${item.zhName} / ${item.enName}`,
    value: item.id,
    description: item.description
  }));
}

export function listVideoTemplateOptions() {
  return VIDEO_TEMPLATES.map((item) => ({
    label: `${item.zhName} / ${item.enName}`,
    value: item.id,
    description: item.description
  }));
}

export function buildVideoTemplateCatalog() {
  const templates = VIDEO_TEMPLATES.map((item) =>
    [
      `- video_template_id: ${item.id}`,
      `  name: ${item.zhName} / ${item.enName}`,
      `  purpose_id: ${item.purposeId}`,
      `  style_id: ${item.styleId}`,
      `  orientation: ${item.orientation}`,
      `  description: ${item.description}`,
      `  scene_plan: ${item.scenePlan.join(' -> ')}`
    ].join('\n')
  ).join('\n');

  const purposes = VIDEO_PURPOSES.map((item) =>
    [
      `- purpose_id: ${item.id}`,
      `  name: ${item.zhName} / ${item.enName}`,
      `  description: ${item.description}`,
      `  structure: ${item.structure.join(' -> ')}`
    ].join('\n')
  ).join('\n');

  const styles = VIDEO_STYLES.map((item) =>
    [
      `- style_id: ${item.id}`,
      `  name: ${item.zhName} / ${item.enName}`,
      `  description: ${item.description}`,
      `  visual_language: ${item.visualLanguage}`,
      `  motion: ${item.motion}`,
      `  fonts: ${item.fonts.join(', ')}`
    ].join('\n')
  ).join('\n');

  return `【视频模板库】\n${templates}\n\n【用途库】\n${purposes}\n\n【风格库】\n${styles}`;
}
