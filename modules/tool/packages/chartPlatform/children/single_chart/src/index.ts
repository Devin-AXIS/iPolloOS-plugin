import { z } from 'zod';
import { buildChartEmbedHtml, buildChartHtml } from '../../../lib/buildChart';
import { parsePoints } from '../../../lib/data';
import { CHART_TYPES } from '../../../lib/theme';

export const InputType = z.object({
  chart_type: z.enum(CHART_TYPES).optional().default('area'),
  title: z.string().min(1),
  subtitle: z.string().optional(),
  data: z.string().optional(),
  unit: z.string().optional(),
  palette: z.string().optional().default('amber_charcoal'),
  container: z
    .enum(['none', 'glass', 'soft_card', 'dark_card', 'paper'])
    .optional()
    .default('none'),
  show_header: z.coerce.boolean().optional().default(false),
  opacity: z.coerce.number().optional().default(72),
  fill_opacity: z.coerce.number().optional().default(18),
  grid_opacity: z.coerce.number().optional().default(10),
  shadow: z.enum(['none', 'soft', 'medium', 'strong']).optional().default('medium'),
  width: z.coerce.number().int().min(320).max(2400).optional().default(960),
  height: z.coerce.number().int().min(240).max(1600).optional().default(540),
  page_output_mode: z.enum(['auto_publish', 'raw_html']).optional().default('auto_publish')
});

export const OutputType = z.object({
  page_html: z.string(),
  page_url: z.string(),
  html_document: z.string(),
  embed_html: z.string(),
  summary: z.string(),
  system_error: z.string().optional()
});

type In = z.infer<typeof InputType>;
type Out = z.infer<typeof OutputType>;

export async function tool(props: In): Promise<Out> {
  try {
    const input = InputType.parse(props);
    const points = parsePoints(input.data);
    const html = buildChartHtml({
      chartType: input.chart_type,
      title: input.title,
      subtitle: input.subtitle?.trim() || undefined,
      unit: input.unit?.trim() || undefined,
      points,
      paletteId: input.palette,
      container: input.container,
      opacity: input.opacity / 100,
      fillOpacity: input.fill_opacity / 100,
      gridOpacity: input.grid_opacity / 100,
      shadow: input.shadow,
      width: input.width,
      height: input.height,
      showHeader: input.show_header
    });
    const embed = buildChartEmbedHtml({
      chartType: input.chart_type,
      title: input.title,
      subtitle: input.subtitle?.trim() || undefined,
      unit: input.unit?.trim() || undefined,
      points,
      paletteId: input.palette,
      container: input.container,
      opacity: input.opacity / 100,
      fillOpacity: input.fill_opacity / 100,
      gridOpacity: input.grid_opacity / 100,
      shadow: input.shadow,
      width: input.width,
      height: input.height,
      showHeader: input.show_header
    });

    return {
      page_html: html,
      page_url: '',
      html_document: html,
      embed_html: embed,
      summary: `已生成 ${input.chart_type} 图表，${points.length} 条数据，颜色组 ${input.palette}，容器 ${input.container}。`
    };
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    return {
      page_html: '',
      page_url: '',
      html_document: '',
      embed_html: '',
      summary: '',
      system_error: msg
    };
  }
}
