import { z } from 'zod';
import { buildSingleFileHtml } from '../../../lib/buildHtml';
import { createDeckState } from '../../../lib/presets';
import { stringifyDeckState } from '../../../lib/state';
import { LayoutIdEnum, type DeckState, type SlideSpec } from '../../../lib/types';
import { ThemeIdEnum, resolveDeckTheme } from '../../../lib/themes';
import { collectDeckImageRequests } from '../../../lib/imageRequests';

const emptyToUndef = (v: unknown) => (v === '' || v === null || v === undefined ? undefined : v);

export const InputType = z.object({
  deck_title: z.string().min(1),
  theme_id: z.preprocess(emptyToUndef, ThemeIdEnum.optional()),
  deck_outline: z.string().min(1),
  slide_count: z.coerce.number().int().min(3).max(40).optional().default(8),
  audience: z.string().optional(),
  embed_mermaid: z.coerce.boolean().optional().default(true),
  page_output_mode: z
    .enum(['auto_publish', 'raw_html', 'resource_center'])
    .optional()
    .default('auto_publish')
});

export const OutputType = z.object({
  page_html: z.string(),
  page_url: z.string(),
  html_document: z.string(),
  full_html: z.string(),
  deck_state: z.string(),
  slide_count: z.number(),
  theme_id: z.string(),
  theme_label: z.string(),
  summary: z.string(),
  image_requests_json: z.string(),
  pending_image_count: z.number(),
  system_error: z.string().optional()
});

type In = z.infer<typeof InputType>;
type Out = z.infer<typeof OutputType>;

type OutlineBlock = {
  title: string;
  bullets: string[];
  mermaid?: string;
};

const SECTION_RE = /^\s*#{1,4}\s+/;
const BULLET_RE = /^\s*(?:[-*+]\s+|\d+[.)]\s*)/;

function cleanLine(line: string): string {
  return line.replace(SECTION_RE, '').replace(BULLET_RE, '').trim();
}

function extractMermaid(text: string): { text: string; mermaid?: string } {
  const match = text.match(/```mermaid\s*([\s\S]*?)```/i);
  if (!match) return { text };
  return {
    text: text.replace(match[0], '').trim(),
    mermaid: match[1]?.trim()
  };
}

function splitOutline(raw: string): OutlineBlock[] {
  const normalized = raw.replace(/\r\n/g, '\n').trim();
  if (!normalized) return [];

  const lines = normalized.split('\n');
  const blocks: string[] = [];
  let current: string[] = [];

  const push = () => {
    const text = current.join('\n').trim();
    if (text) blocks.push(text);
    current = [];
  };

  for (const line of lines) {
    if (/^\s*---+\s*$/.test(line)) {
      push();
      continue;
    }
    if (SECTION_RE.test(line) && current.length > 0) {
      push();
    }
    current.push(line);
  }
  push();

  if (blocks.length <= 1) {
    const paragraphBlocks = normalized
      .split(/\n{2,}/)
      .map((part) => part.trim())
      .filter(Boolean);
    if (paragraphBlocks.length > 1) {
      return paragraphBlocks.map(blockToOutline);
    }
  }

  return blocks.map(blockToOutline);
}

function blockToOutline(block: string): OutlineBlock {
  const mermaid = extractMermaid(block);
  const lines = mermaid.text
    .split('\n')
    .map((line) => cleanLine(line))
    .filter(Boolean);
  const [first, ...rest] = lines;
  return {
    title: first || '未命名页面',
    bullets: rest.length ? rest : [],
    mermaid: mermaid.mermaid
  };
}

function compactBlocks(blocks: OutlineBlock[], maxContentSlides: number): OutlineBlock[] {
  if (blocks.length <= maxContentSlides) return blocks;
  const kept = blocks.slice(0, maxContentSlides);
  const overflow = blocks.slice(maxContentSlides);
  const last = kept[kept.length - 1];
  if (last) {
    last.bullets = [
      ...last.bullets,
      ...overflow.flatMap((block) => [block.title, ...block.bullets]).slice(0, 8)
    ];
  }
  return kept;
}

function looksLikeTimeline(block: OutlineBlock): boolean {
  const text = [block.title, ...block.bullets].join('\n');
  return /\b(20\d{2}|19\d{2}|Q[1-4]|第[一二三四五六七八九十]+阶段|阶段\s*\d+)/i.test(text);
}

function looksLikeComparison(block: OutlineBlock): boolean {
  const text = [block.title, ...block.bullets].join(' ');
  return /(对比|比较|差异|取舍|\bvs\b| versus )/i.test(text);
}

function looksLikeMetric(block: OutlineBlock): boolean {
  const text = [block.title, ...block.bullets].join(' ');
  return /(\d+(?:\.\d+)?\s*(?:%|倍|x|X|万|亿|ms|s|秒|分钟|小时|天))/.test(text);
}

function firstMetric(block: OutlineBlock): { value?: string; label?: string } {
  const line = [block.title, ...block.bullets].find((item) =>
    /(\d+(?:\.\d+)?\s*(?:%|倍|x|X|万|亿|ms|s|秒|分钟|小时|天))/.test(item)
  );
  if (!line) return {};
  const match = line.match(/(\d+(?:\.\d+)?\s*(?:%|倍|x|X|万|亿|ms|s|秒|分钟|小时|天))/);
  return {
    value: match?.[1],
    label: line.replace(match?.[1] ?? '', '').trim() || block.title
  };
}

function chooseLayout(block: OutlineBlock, index: number) {
  if (block.mermaid) return LayoutIdEnum.enum.mermaid_focus;
  if (looksLikeComparison(block)) return LayoutIdEnum.enum.comparison;
  if (looksLikeTimeline(block)) return LayoutIdEnum.enum.timeline;
  if (looksLikeMetric(block) && index % 3 === 1) return LayoutIdEnum.enum.big_number;
  if (index === 0 && block.bullets.length <= 2) return LayoutIdEnum.enum.section;
  return LayoutIdEnum.enum.content;
}

function toSlide(state: DeckState, block: OutlineBlock, index: number): SlideSpec {
  const layout = chooseLayout(block, index);
  const metric = firstMetric(block);
  const footer = state.meta.title;
  const base: SlideSpec = {
    layout,
    kicker: `SECTION ${String(index + 1).padStart(2, '0')}`,
    title: block.title,
    bullets: block.bullets.length ? block.bullets : undefined,
    footer_left: footer,
    mermaid: block.mermaid
  };

  if (layout === 'comparison') {
    const mid = Math.ceil(block.bullets.length / 2);
    return {
      ...base,
      left_title: '方案 A',
      left_bullets: block.bullets.slice(0, mid),
      right_title: '方案 B',
      right_bullets: block.bullets.slice(mid)
    };
  }

  if (layout === 'timeline') {
    return {
      ...base,
      timeline_items: block.bullets.length ? block.bullets : [block.title]
    };
  }

  if (layout === 'big_number') {
    return {
      ...base,
      metric_value: metric.value,
      metric_label: metric.label
    };
  }

  return base;
}

function buildState(input: In): DeckState {
  const state = createDeckState({
    title: input.deck_title.trim(),
    themeId: input.theme_id,
    mastheadRight: input.audience?.trim() || undefined
  });

  const blocks = compactBlocks(
    splitOutline(input.deck_outline),
    Math.max(1, input.slide_count - 2)
  );
  state.slides.push({
    layout: 'cover',
    kicker: 'PRESENTATION',
    title: state.meta.title,
    bullets: undefined,
    footer_left: state.meta.title
  });

  for (const [index, block] of blocks.entries()) {
    state.slides.push(toSlide(state, block, index));
  }

  state.slides.push({
    layout: 'closing',
    kicker: 'END',
    title: '谢谢',
    bullets: ['完整内容已按统一主题生成', '可继续使用高级工具精修单页'],
    footer_left: state.meta.title
  });

  return state;
}

export async function tool(props: In): Promise<Out> {
  try {
    const input = InputType.parse(props);
    const state = buildState(input);
    const html_document = buildSingleFileHtml(state, { embedMermaid: input.embed_mermaid });
    const deck_state = stringifyDeckState(state);
    const themeId = state.meta.theme_id ?? 'huashu_editorial';
    const themeLabel = resolveDeckTheme(themeId).label;
    const imageRequests = collectDeckImageRequests(state);

    return {
      page_html: html_document,
      page_url: '',
      html_document,
      full_html: html_document,
      deck_state,
      slide_count: state.slides.length,
      theme_id: themeId,
      theme_label: themeLabel,
      image_requests_json: JSON.stringify(imageRequests),
      pending_image_count: imageRequests.length,
      summary: `已用「${themeLabel}」主题生成 ${state.slides.length} 页完整 HTML 幻灯片。${imageRequests.length ? `有 ${imageRequests.length} 个待生成配图。` : ''}page_html 是最终页面；deck_state 可用于高级单页精修。`
    };
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    return {
      page_html: '',
      page_url: '',
      html_document: '',
      full_html: '',
      deck_state: '',
      slide_count: 0,
      theme_id: '',
      theme_label: '',
      summary: '',
      image_requests_json: '[]',
      pending_image_count: 0,
      system_error: msg
    };
  }
}
