import { z } from 'zod';

/** 版式：对齐 Huashu-Design「出版物 grammar」与 slide-decks 常见页型 */
export const LayoutIdEnum = z.enum([
  'cover',
  'section',
  'content',
  'big_number',
  'comparison',
  'timeline',
  'matrix',
  'chart_focus',
  'chart_story',
  'chart_compare',
  'split_image',
  'quote',
  'mermaid_focus',
  'closing'
]);

export const ImagePositionEnum = z.enum(['left', 'right']);
export const ChartTypeEnum = z.enum([
  'line',
  'area',
  'bar',
  'horizontal_bar',
  'stacked_bar',
  'combo',
  'pie',
  'donut',
  'gauge',
  'progress',
  'ranking',
  'radar',
  'scatter',
  'bubble',
  'heatmap',
  'funnel',
  'timeline'
]);
export const ChartPaletteEnum = z.enum([
  'theme',
  'amber_charcoal',
  'blue_slate',
  'mint_ink',
  'rose_graphite',
  'violet_steel',
  'gold_cream'
]);

export const SlideSchema = z.object({
  layout: LayoutIdEnum,
  /** kicker：短横 + 大写标签行，如 CHAPTER 01 · INTRO */
  kicker: z.string().optional(),
  title: z.string().optional(),
  /** 标题中要加品牌主色高亮的短语（首处匹配） */
  title_highlight: z.string().optional(),
  /** 英文副标题，Lora italic */
  subtitle_en: z.string().optional(),
  bullets: z.array(z.string()).optional(),
  metric_value: z.string().optional(),
  metric_label: z.string().optional(),
  left_title: z.string().optional(),
  left_bullets: z.array(z.string()).optional(),
  right_title: z.string().optional(),
  right_bullets: z.array(z.string()).optional(),
  timeline_items: z.array(z.string()).optional(),
  matrix_items: z
    .array(
      z.object({
        title: z.string(),
        body: z.string().optional()
      })
    )
    .optional(),
  chart_html: z.string().optional(),
  secondary_chart_html: z.string().optional(),
  chart_page_url: z.string().optional(),
  secondary_chart_page_url: z.string().optional(),
  chart_type: ChartTypeEnum.optional(),
  secondary_chart_type: ChartTypeEnum.optional(),
  chart_data: z.string().optional(),
  secondary_chart_data: z.string().optional(),
  chart_palette: ChartPaletteEnum.optional(),
  chart_caption: z.string().optional(),
  image: z
    .object({
      url: z.string().min(1),
      alt: z.string().optional(),
      caption: z.string().optional(),
      position: ImagePositionEnum.default('right')
    })
    .optional(),
  mermaid: z.string().optional(),
  /** 底栏左侧文案，如章节名 */
  footer_left: z.string().optional(),
  speaker_notes: z.string().optional()
});

export const DeckStateSchema = z.object({
  v: z.literal(2),
  meta: z.object({
    title: z.string(),
    subtitle: z.string().optional(),
    /** 固定主题包 id，见 lib/themes.ts */
    theme_id: z.string().optional(),
    logo_url: z.string().optional(),
    /** 顶栏右侧：如 Issue · 2026 · example.com */
    masthead_right: z.string().optional(),
    canvas_w: z.number().int().min(640).max(3840).default(1920),
    canvas_h: z.number().int().min(360).max(2160).default(1080)
  }),
  /** 主题变量：三色 + 纸面背景 + 正文色（对齐花叔 skill 里 B2B grammar 可配置 token） */
  theme: z.object({
    brand_primary: z.string(),
    brand_secondary: z.string(),
    brand_tertiary: z.string(),
    page_background: z.string(),
    text_color: z.string()
  }),
  slides: z.array(SlideSchema).max(80)
});

export type DeckState = z.infer<typeof DeckStateSchema>;
export type SlideSpec = z.infer<typeof SlideSchema>;
