import { z } from 'zod';
import { DeckInitFieldsSchema, initDeckFromFields } from '../../../lib/deckInit';
import { LayoutIdEnum, ChartTypeEnum, ImageRoleEnum, type SlideSpec } from '../../../lib/types';
import { ThemeIdEnum, resolveDeckTheme } from '../../../lib/themes';
import { parseDeckState, stringifyDeckState } from '../../../lib/state';
import {
  buildSlideImagePrompt,
  collectDeckImageRequests,
  parseImageReferenceUrls
} from '../../../lib/imageRequests';

const emptyToUndef = (v: unknown) => (v === '' || v === null || v === undefined ? undefined : v);

export const InputType = z
  .object({
    deck_state: z.string().optional().default(''),
    deck_title: z.string().optional(),
    theme_id: z.preprocess(emptyToUndef, ThemeIdEnum.optional()),
    layout_id: LayoutIdEnum,
    title: z.string().optional(),
    body: z.string().optional(),
    chart_data: z.string().optional(),
    image_url: z.string().optional(),
    image_prompt: z.string().optional(),
    image_role: ImageRoleEnum.optional().default('right_illustration'),
    image_reference_urls: z.string().optional(),
    image_size: z.string().optional().default('1536x1024'),
    mermaid_code: z.string().optional()
  })
  .superRefine((v, ctx) => {
    if (!v.deck_state?.trim() && !v.deck_title?.trim()) {
      ctx.addIssue({
        code: 'custom',
        message: '首次调用须填 deck_title；theme_id 五选一，不填则由你根据内容选择。'
      });
    }
    if (v.layout_id === 'mermaid_focus' && !v.mermaid_code?.trim()) {
      ctx.addIssue({ code: 'custom', message: 'mermaid_focus 须填 mermaid_code。' });
    }
    if (
      ['chart_focus', 'chart_story', 'chart_compare'].includes(v.layout_id) &&
      !v.chart_data?.trim()
    ) {
      ctx.addIssue({ code: 'custom', message: '图表页须填 chart_data；颜色与图标自动跟随主题。' });
    }
    if (v.layout_id === 'split_image' && !v.image_url?.trim() && !v.image_prompt?.trim()) {
      ctx.addIssue({ code: 'custom', message: 'split_image 须填 image_url 或 image_prompt。' });
    }
  });

export const OutputType = z.object({
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

function parseBody(raw: string | undefined): string[] | undefined {
  if (!raw?.trim()) return undefined;
  const lines = raw
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);
  return lines.length ? lines : undefined;
}

function parseChartBlocks(raw: string | undefined): {
  primary?: string;
  secondary?: string;
} {
  const text = raw?.trim() ?? '';
  if (!text) return {};
  const parts = text.split(/\n---\n/).map((p) => p.trim());
  return { primary: parts[0], secondary: parts[1] };
}

function loadOrInitDeck(input: In) {
  const raw = input.deck_state?.trim() ?? '';
  if (raw) return parseDeckState(raw);
  return initDeckFromFields(
    DeckInitFieldsSchema.parse({
      deck_title: input.deck_title!,
      theme_id: input.theme_id
    })
  );
}

export async function tool(props: In): Promise<Out> {
  try {
    const input = InputType.parse(props);
    const state = loadOrInitDeck(input);
    if (state.slides.length >= 80) {
      return {
        deck_state: stringifyDeckState(state),
        slide_count: state.slides.length,
        theme_id: state.meta.theme_id ?? 'huashu_editorial',
        theme_label: '',
        summary: '',
        system_error: '已达 80 页上限。'
      };
    }

    const n = state.slides.length + 1;
    const charts = parseChartBlocks(input.chart_data);
    const slide: SlideSpec = {
      layout: input.layout_id,
      kicker: `SECTION ${String(n).padStart(2, '0')}`,
      title: input.title?.trim() || undefined,
      bullets: parseBody(input.body),
      chart_type: ChartTypeEnum.enum.area,
      chart_data: charts.primary,
      secondary_chart_data: charts.secondary,
      secondary_chart_type: 'bar',
      chart_palette: 'theme',
      mermaid: input.mermaid_code?.trim() || undefined,
      footer_left: state.meta.title
    };

    const url = input.image_url?.trim();
    if (url) {
      slide.image = { url, position: 'right' };
    } else if (input.image_prompt?.trim()) {
      slide.layout = 'split_image';
      slide.image_request = {
        prompt: buildSlideImagePrompt({
          state,
          slide,
          imagePrompt: input.image_prompt,
          role: input.image_role
        }),
        role: input.image_role,
        reference_urls: parseImageReferenceUrls(input.image_reference_urls),
        size: input.image_size?.trim() || '1536x1024'
      };
    }

    state.slides.push(slide);
    const deck_state = stringifyDeckState(state);
    const themeId = state.meta.theme_id ?? 'huashu_editorial';
    const themeLabel = resolveDeckTheme(themeId).label;
    const created = !input.deck_state?.trim();
    const imageRequests = collectDeckImageRequests(state);

    return {
      deck_state,
      slide_count: n,
      theme_id: themeId,
      theme_label: themeLabel,
      image_requests_json: JSON.stringify(imageRequests),
      pending_image_count: imageRequests.length,
      summary: created
        ? `已创建 deck（${themeLabel}）并添加第 ${n} 页。${imageRequests.length ? `有 ${imageRequests.length} 个待生成配图。` : ''}继续本工具，最后「导出网页」。`
        : `已添加第 ${n} 页。主题 ${themeLabel} 不变。${imageRequests.length ? `有 ${imageRequests.length} 个待生成配图。` : ''}`
    };
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    return {
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
