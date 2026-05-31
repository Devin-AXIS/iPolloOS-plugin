import { describe, expect, it } from 'vitest';
import {
  HTML_ANYTHING_TEMPLATES,
  HTML_ANYTHING_PUBLIC_TEMPLATES,
  coerceTemplateForRequest,
  getRequestedOutputFamily,
  getHtmlAnythingTemplate,
  getTemplateOutputFamily,
  inferTemplateFromGeneratedHtml,
  resolveExplicitHtmlAnythingTemplate
} from '../lib/templates';
import { buildGeneratePrompt } from '../lib/prompt';
import { SHARED_DESIGN_DIRECTIVES } from '../lib/prompt';

describe('html-anything templates', () => {
  it('bundles all current upstream templates', () => {
    expect(HTML_ANYTHING_TEMPLATES.length).toBe(80);
    expect(getHtmlAnythingTemplate('deck-swiss-international')?.zhName).toContain('瑞士');
    expect(getHtmlAnythingTemplate('book-editorial')?.category).toBe('book');
    expect(getHtmlAnythingTemplate('research-report')?.category).toBe('research');
    expect(getHtmlAnythingTemplate('academic-paper')?.scenario).toBe('academic');
    expect(getHtmlAnythingTemplate('video-hyperframes')?.category).toBe('video');
  });

  it('keeps video templates out of public html routing', () => {
    expect(HTML_ANYTHING_PUBLIC_TEMPLATES.some((item) => item.category === 'video')).toBe(false);
    expect(HTML_ANYTHING_PUBLIC_TEMPLATES.some((item) => item.id === 'video-hyperframes')).toBe(
      false
    );
  });

  it('builds prompt with selected template body', () => {
    const template = getHtmlAnythingTemplate('saas-landing');
    expect(template).toBeTruthy();
    const prompt = buildGeneratePrompt({
      template: template!,
      content: '# 产品\n用于团队协作。',
      format: 'markdown',
      language: 'zh-CN'
    });
    expect(prompt).toContain('saas-landing');
    expect(prompt).toContain('用于团队协作');
    expect(prompt).toContain(template!.body.slice(0, 40));
  });

  it('defines a shared visual component library with style inheritance', () => {
    expect(SHARED_DESIGN_DIRECTIVES).toContain('【共享视觉组件库】');
    expect(SHARED_DESIGN_DIRECTIVES).toContain('world-map-diagram');
    expect(SHARED_DESIGN_DIRECTIVES).toContain('knowledge-graph');
    expect(SHARED_DESIGN_DIRECTIVES).toContain('必须继承当前模板的设计语言');
    expect(SHARED_DESIGN_DIRECTIVES).toContain('不得编造数据');
  });

  it('defines strict output type isolation', () => {
    expect(SHARED_DESIGN_DIRECTIVES).toContain('【输出类型隔离】');
    expect(SHARED_DESIGN_DIRECTIVES).toContain('PPT/幻灯片/deck/presentation 是 slides 类型');
    expect(SHARED_DESIGN_DIRECTIVES).toContain('不得做成电子书、报告、长文、连续阅读、目录阅读器');
    expect(SHARED_DESIGN_DIRECTIVES).toContain('最终形态必须服从 slides');
    expect(SHARED_DESIGN_DIRECTIVES).toContain('最终形态必须服从 publication');
    expect(SHARED_DESIGN_DIRECTIVES).toContain('禁止复用主体结构、交互方式和导航方式');
  });

  it('defines PPT business chart and architecture component rules', () => {
    expect(SHARED_DESIGN_DIRECTIVES).toContain('【PPT 商业图表与架构组件】');
    expect(SHARED_DESIGN_DIRECTIVES).toContain('market-size-funnel');
    expect(SHARED_DESIGN_DIRECTIVES).toContain('system-architecture');
    expect(SHARED_DESIGN_DIRECTIVES).toContain('复杂架构必须拆成多页');
  });

  it('defines a unified slide runtime for deck templates', () => {
    expect(SHARED_DESIGN_DIRECTIVES).toContain('【统一幻灯片运行规范】');
    expect(SHARED_DESIGN_DIRECTIVES).toContain('overflow hidden');
    expect(SHARED_DESIGN_DIRECTIVES).toContain('不得让页面上下滚动作为翻页方式');
    expect(SHARED_DESIGN_DIRECTIVES).toContain('插件会统一注入基础幻灯片运行层');
    expect(SHARED_DESIGN_DIRECTIVES).toContain('必须生成模板原生风格的翻页控件');
    expect(SHARED_DESIGN_DIRECTIVES).toContain('data-slide-controls');
    expect(SHARED_DESIGN_DIRECTIVES).toContain('data-slide-prev');
    expect(SHARED_DESIGN_DIRECTIVES).toContain('data-slide-next');
    expect(SHARED_DESIGN_DIRECTIVES).toContain('插件会优先复用原生控件');
    expect(SHARED_DESIGN_DIRECTIVES).toContain('section.slide');
    expect(SHARED_DESIGN_DIRECTIVES).toContain('ArrowLeft/ArrowRight');
    expect(SHARED_DESIGN_DIRECTIVES).toContain('鼠标滚轮/触控板翻页');
    expect(SHARED_DESIGN_DIRECTIVES).toContain('水平 swipe');
    expect(SHARED_DESIGN_DIRECTIVES).toContain('URL hash');
  });

  it('avoids swiss deck when the explicit request conflicts with swiss constraints', () => {
    const template = resolveExplicitHtmlAnythingTemplate(
      'deck-swiss-international',
      '帮我做 AI 未来发展的中文幻灯片，参考 Apple / OpenAI / Linear / Stripe，深色背景，毛玻璃，大圆角，柔和阴影，弥散渐变。'
    );

    expect(template?.id).toBe('deck-graphify-dark');
  });

  it('keeps swiss deck for matching editorial grid requests', () => {
    const template = resolveExplicitHtmlAnythingTemplate(
      'deck-swiss-international',
      '做一套冷静理性的事实分析 PPT，16 列网格，直角，黑白蓝配色。'
    );

    expect(template?.id).toBe('deck-swiss-international');
  });

  it('keeps auto template routing inside the requested output family', () => {
    expect(getRequestedOutputFamily('帮我做一个 AI 培训课程幻灯片')).toBe('slides');
    expect(getRequestedOutputFamily('帮我写一本 AI 培训电子书')).toBe('publication');
    expect(getRequestedOutputFamily('帮我做一个产品官网')).toBe('web');

    expect(
      coerceTemplateForRequest(
        getHtmlAnythingTemplate('book-editorial'),
        '帮我做一个 AI 培训课程幻灯片'
      )?.category
    ).toBe('slides');

    expect(
      coerceTemplateForRequest(getHtmlAnythingTemplate('deck-simple'), '帮我写一本 AI 培训电子书')
        ?.id
    ).toBe('book-editorial');

    expect(
      coerceTemplateForRequest(getHtmlAnythingTemplate('deck-simple'), '帮我写一份行业研究报告')?.id
    ).toBe('research-report');

    expect(
      coerceTemplateForRequest(getHtmlAnythingTemplate('deck-simple'), '帮我做一个产品官网')
        ?.category
    ).not.toBe('slides');
  });

  it('maps hard output families without mixing template categories', () => {
    for (const template of HTML_ANYTHING_TEMPLATES) {
      expect(
        getTemplateOutputFamily(
          coerceTemplateForRequest(template, '帮我做一个公司介绍 PPT 幻灯片')!
        )
      ).toBe('slides');

      expect(
        getTemplateOutputFamily(coerceTemplateForRequest(template, '帮我写一本行业电子书')!)
      ).toBe('publication');

      expect(
        getTemplateOutputFamily(coerceTemplateForRequest(template, '帮我做一个产品官网')!)
      ).toBe('web');
    }
  });

  it('coerces manual template picks to the requested output family', () => {
    expect(
      coerceTemplateForRequest(
        resolveExplicitHtmlAnythingTemplate('book-editorial', '帮我做一个融资 PPT'),
        '帮我做一个融资 PPT'
      )?.category
    ).toBe('slides');

    expect(
      coerceTemplateForRequest(
        resolveExplicitHtmlAnythingTemplate('deck-simple', '帮我写一本产品电子书'),
        '帮我写一本产品电子书'
      )?.id
    ).toBe('book-editorial');
  });

  it('keeps publication templates away from deck structures', () => {
    for (const id of [
      'book-editorial',
      'research-report',
      'academic-paper',
      'whitepaper-html',
      'magazine-feature'
    ]) {
      const body = getHtmlAnythingTemplate(id)?.body ?? '';
      expect(body).toContain('禁止使用 slide/deck/swiper/horizontal-swipe');
      expect(body).toMatch(/连续阅读|电子书阅读器|报告阅读器|杂志专题/);
    }
  });

  it('defines ebook navigation as non-intrusive reader controls', () => {
    const body = getHtmlAnythingTemplate('book-editorial')?.body ?? '';

    expect(SHARED_DESIGN_DIRECTIVES).toContain('【统一出版物目录规范】');
    expect(SHARED_DESIGN_DIRECTIVES).toContain('移动端必须隐藏左侧目录');
    expect(SHARED_DESIGN_DIRECTIVES).toContain('不得把完整目录铺在顶部首屏');
    expect(body).toContain('阅读器工具层');
    expect(body).toContain('桌面端使用左侧固定/粘性目录栏');
    expect(body).toContain('移动端隐藏左侧目录');
    expect(body).toContain('底部安全区上方放一个目录 icon 按钮');
    expect(body).toContain('不得直接占用书籍顶部正文空间');
    expect(body).toContain('打印时全部隐藏');
  });

  it('keeps publication mobile toc in a bottom drawer instead of top navigation', () => {
    for (const id of ['research-report', 'academic-paper', 'whitepaper-html'] as const) {
      const body = getHtmlAnythingTemplate(id)?.body ?? '';
      expect(body).toContain('底部安全区上方');
      expect(body).toContain('目录 icon 按钮');
      expect(body).toContain('首屏顶部');
      expect(body).not.toContain('目录变成顶部/侧边章节导航');
    }
  });

  it('defines academic paper structure and citation safeguards', () => {
    const body = getHtmlAnythingTemplate('academic-paper')?.body ?? '';

    expect(body).toContain('Abstract');
    expect(body).toContain('Related Work');
    expect(body).toContain('References');
    expect(body).toContain('不得编造实验数据、引用来源、作者和 DOI');
  });

  it('adds rich component categories for publication templates', () => {
    const expectations = [
      ['book-editorial', '【电子书组件类别】', 'world-map-diagram', '组件视觉必须像书籍插图'],
      ['research-report', '【研究报告组件类别】', 'region-heatmap', '组件视觉必须像咨询/研究报告'],
      [
        'academic-paper',
        '【学术论文组件类别】',
        'confusion-matrix-style',
        '组件视觉必须像论文 Figure/Table'
      ],
      ['magazine-feature', '【杂志专题组件类别】', 'storyline-map', '组件视觉必须像杂志专题'],
      ['whitepaper-html', '【白皮书组件类别】', 'deployment-topology', '组件视觉必须像企业白皮书']
    ] as const;

    for (const [id, heading, component, styleRule] of expectations) {
      const body = getHtmlAnythingTemplate(id)?.body ?? '';
      expect(body).toContain(heading);
      expect(body).toContain(component);
      expect(body).toContain(styleRule);
    }
  });

  it('adds PPT business and architecture components to major deck templates', () => {
    const expectations = [
      ['deck-graphify-dark', 'ai-agent-workflow', 'system-architecture'],
      ['deck-open-slide-canvas', 'business-model-canvas', 'deployment-topology'],
      ['deck-pitch', 'tam-sam-som', 'defensibility-map'],
      ['deck-product-launch', 'value-prop-canvas', 'product-architecture'],
      ['deck-simple', 'pricing-ladder', 'capability-map'],
      ['deck-swiss-international', 'KPI Tower', 'layered-architecture'],
      ['deck-tech-sharing', 'service-mesh', 'security-architecture'],
      ['ppt-keynote', 'customer-journey', 'ai-agent-workflow']
    ] as const;

    for (const [id, first, second] of expectations) {
      const body = getHtmlAnythingTemplate(id)?.body ?? '';
      expect(body).toContain('【PPT 图表/架构组件】');
      expect(body).toContain(first);
      expect(body).toContain(second);
    }
  });

  it('infers template family from upstream generated html structure', () => {
    expect(
      inferTemplateFromGeneratedHtml(
        '<!DOCTYPE html><html><body><article class="book-shell"><section class="page book-page"><h1>第一章</h1></section></article></body></html>'
      )?.id
    ).toBe('book-editorial');

    expect(
      inferTemplateFromGeneratedHtml(
        '<!DOCTYPE html><html><body><article class="report-shell"><section class="report-page"><h1>Executive Summary</h1></section></article></body></html>'
      )?.id
    ).toBe('research-report');

    expect(
      inferTemplateFromGeneratedHtml(
        '<!DOCTYPE html><html><body><section class="slide active"><h1>Roadmap</h1></section><nav data-slide-controls></nav></body></html>'
      )?.id
    ).toBe('deck-simple');
  });
});
