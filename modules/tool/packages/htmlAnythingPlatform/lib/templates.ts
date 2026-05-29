import { HTML_ANYTHING_TEMPLATES, type HtmlAnythingTemplate } from './templates.generated';

export { HTML_ANYTHING_TEMPLATES, type HtmlAnythingTemplate };

export const AUTO_TEMPLATE_ID = 'auto';

export function getHtmlAnythingTemplate(id: string): HtmlAnythingTemplate | undefined {
  return HTML_ANYTHING_TEMPLATES.find((item) => item.id === id);
}

export function hasHtmlAnythingTemplate(id: string): boolean {
  return id === AUTO_TEMPLATE_ID || Boolean(getHtmlAnythingTemplate(id));
}

const SWISS_TEMPLATE_STYLE_CONFLICT_RE =
  /Apple|OpenAI|Linear|Stripe|硅谷|AI\s*Native|毛玻璃|玻璃拟态|glassmorphism|glass|大圆角|圆角|柔和阴影|阴影|弥散渐变|渐变|深色|暗色|dark/i;

const TECH_DECK_RE = /AI|Agent|智能|模型|技术|科技|未来|基础设施|产品|战略|架构|dev|developer/i;
const SLIDES_REQUEST_RE =
  /PPT|幻灯片|演示文稿|演示稿|presentation|slide\s*deck|slides?|deck|keynote/i;
const PUBLICATION_REQUEST_RE =
  /电子书|书籍|书本|图书|book|ebook|研究报告|行业报告|白皮书|论文|学术论文|课程论文|会议论文|期刊论文|paper|whitepaper|report/i;
const WEB_REQUEST_RE = /网站|官网|落地页|产品页|原型|网页|web\s*page|landing\s*page|prototype/i;

type RequestedOutputFamily = 'slides' | 'publication' | 'web';

const PUBLICATION_CATEGORIES = new Set(['book', 'research', 'publication']);
const WEB_CATEGORIES = new Set(['prototype', 'dashboard', 'mobile']);

export function inferTemplateFromGeneratedHtml(html: string): HtmlAnythingTemplate | undefined {
  const text = html.slice(0, 300_000);

  if (
    /academic-paper-shell|paper-page|class=["'][^"']*(academic|paper)/i.test(text) ||
    /<h1[^>]*>\s*(Abstract|摘要|论文|References|参考文献)/i.test(text)
  ) {
    return getHtmlAnythingTemplate('academic-paper');
  }

  if (/whitepaper-shell|whitepaper-page|白皮书|whitepaper/i.test(text)) {
    return getHtmlAnythingTemplate('whitepaper-html');
  }

  if (/report-shell|report-page|executive-summary|methodology|研究报告|行业报告/i.test(text)) {
    return getHtmlAnythingTemplate('research-report');
  }

  if (/book-shell|book-page|chapter-opener|toc-drawer|电子书|书籍|chapter\s+\d/i.test(text)) {
    return getHtmlAnythingTemplate('book-editorial');
  }

  if (/magazine-feature|masthead|drop-cap|pull-quote|杂志专题/i.test(text)) {
    return getHtmlAnythingTemplate('magazine-feature');
  }

  if (
    /section[^>]+class=["'][^"']*\bslide\b/i.test(text) ||
    /data-slide-controls|data-slide-next|data-slide-prev|slide-counter|presentation-runtime/i.test(
      text
    )
  ) {
    if (/swiss|IKB|Klein Blue|16\s*列|hairline/i.test(text)) {
      return getHtmlAnythingTemplate('deck-swiss-international');
    }
    return getHtmlAnythingTemplate('deck-simple');
  }

  if (/dashboard|kpi-grid|metric-card|data-report|chart-panel|analytics/i.test(text)) {
    return getHtmlAnythingTemplate('dashboard');
  }

  if (/iphone|mobile-app|bottom-tab|status-bar|dynamic-island|phone-frame/i.test(text)) {
    return getHtmlAnythingTemplate('mobile-app');
  }

  if (/landing|hero|pricing|testimonial|feature-grid|call-to-action|navbar/i.test(text)) {
    return getHtmlAnythingTemplate('saas-landing');
  }

  return undefined;
}

export function getTemplateOutputFamily(
  template: HtmlAnythingTemplate
): RequestedOutputFamily | undefined {
  if (template.category === 'slides') return 'slides';
  if (PUBLICATION_CATEGORIES.has(template.category)) return 'publication';
  if (WEB_CATEGORIES.has(template.category)) return 'web';
  return undefined;
}

export function resolveExplicitHtmlAnythingTemplate(
  id: string,
  requestText = ''
): HtmlAnythingTemplate | undefined {
  if (id === 'deck-swiss-international' && SWISS_TEMPLATE_STYLE_CONFLICT_RE.test(requestText)) {
    return (
      getHtmlAnythingTemplate(
        TECH_DECK_RE.test(requestText) ? 'deck-graphify-dark' : 'deck-product-launch'
      ) || getHtmlAnythingTemplate('deck-simple')
    );
  }

  return getHtmlAnythingTemplate(id);
}

export function getRequestedOutputFamily(requestText: string): RequestedOutputFamily | undefined {
  if (SLIDES_REQUEST_RE.test(requestText)) return 'slides';
  if (PUBLICATION_REQUEST_RE.test(requestText)) return 'publication';
  if (WEB_REQUEST_RE.test(requestText)) return 'web';
  return undefined;
}

export function coerceTemplateForRequest(
  template: HtmlAnythingTemplate | undefined,
  requestText: string
): HtmlAnythingTemplate | undefined {
  const family = getRequestedOutputFamily(requestText);
  if (!template || !family) return template;
  const templateFamily = getTemplateOutputFamily(template);

  if (family === 'slides' && templateFamily !== 'slides') {
    return (
      getHtmlAnythingTemplate('ppt-keynote') || getHtmlAnythingTemplate('deck-simple') || template
    );
  }

  if (family === 'publication' && templateFamily !== 'publication') {
    if (/论文|paper|academic/i.test(requestText)) {
      return getHtmlAnythingTemplate('academic-paper') || template;
    }
    if (/白皮书|whitepaper/i.test(requestText)) {
      return getHtmlAnythingTemplate('whitepaper-html') || template;
    }
    if (/研究报告|行业报告|report/i.test(requestText)) {
      return getHtmlAnythingTemplate('research-report') || template;
    }
    return getHtmlAnythingTemplate('book-editorial') || template;
  }

  if (family === 'web' && templateFamily !== 'web') {
    if (/原型|prototype/i.test(requestText)) {
      return getHtmlAnythingTemplate('prototype-web') || template;
    }
    return (
      getHtmlAnythingTemplate('saas-landing') ||
      getHtmlAnythingTemplate('prototype-web') ||
      template
    );
  }

  return template;
}

export function listTemplateOptions(): Array<{
  label: string;
  value: string;
  description?: string;
  alias?: string;
  category?: string;
  scenario?: string;
  tags?: string[];
}> {
  return [
    {
      label: 'AI 自动选择',
      value: AUTO_TEMPLATE_ID,
      description: '根据内容、格式和额外要求自动选择最合适的 html-anything 模板。',
      alias: 'AI 自动选择'
    },
    ...HTML_ANYTHING_TEMPLATES.map((item) => ({
      label: `${item.zhName} / ${item.enName}`,
      value: item.id,
      description: `${item.description}；适配：${item.aspectHint}`,
      alias: `${item.zhName} (${item.id})`,
      category: item.category,
      scenario: item.scenario,
      tags: item.tags
    }))
  ];
}

export function buildTemplateSelectionCatalog(): string {
  return HTML_ANYTHING_TEMPLATES.map((item) =>
    [
      `- id: ${item.id}`,
      `  name: ${item.zhName} / ${item.enName}`,
      `  category: ${item.category}`,
      `  scenario: ${item.scenario}`,
      `  aspect: ${item.aspectHint}`,
      `  description: ${item.description}`,
      `  tags: ${item.tags.join(', ')}`
    ].join('\n')
  ).join('\n');
}
