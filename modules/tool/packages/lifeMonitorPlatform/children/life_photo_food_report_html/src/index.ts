import { z } from 'zod';
import { assembleFoodReportPage } from '../../../lib/assemble-food-report-page';
import { MealAnalysisJsonSchema } from '../../../lib/meal-json';
import { buildFoodReportPageCover } from '../../../lib/page-cover';

const LangSchema = z.enum(['zh-CN', 'en']);

export const InputType = z.object({
  meal_analysis_json: z.string().min(2).max(50_000),
  page_title: z.string().max(200).optional().default(''),
  heading_h1: z.string().max(400).optional().default(''),
  prepend_progress_card: z.boolean().optional().default(true),
  daily_targets_json: z.string().optional().default(''),
  daily_state_json: z.string().optional().default(''),
  lang: LangSchema.optional().default('zh-CN'),
  page_output_mode: z
    .enum(['auto_publish', 'resource_center', 'raw_html'])
    .optional()
    .default('auto_publish')
});

export const OutputType = z.object({
  page_html: z.string(),
  page_url: z.string(),
  page_cover: z.string(),
  summary: z.string(),
  system_error: z.string().optional()
});

type In = z.infer<typeof InputType>;
type Out = z.infer<typeof OutputType>;

export async function tool(props: In): Promise<Out> {
  try {
    const inp = InputType.parse(props);
    const lang = inp.lang;
    const raw = inp.meal_analysis_json.trim();
    let parsed: unknown;
    try {
      parsed = JSON.parse(raw);
    } catch {
      return {
        page_html: '',
        page_url: '',
        page_cover: '',
        summary: '',
        system_error: 'meal_analysis_json 不是合法 JSON'
      };
    }
    const r = MealAnalysisJsonSchema.safeParse(parsed);
    if (!r.success || !Number.isFinite(r.data.kcal)) {
      return {
        page_html: '',
        page_url: '',
        page_cover: '',
        summary: '',
        system_error: 'meal_analysis_json 缺少有效 kcal 或字段不正确'
      };
    }

    const pageTitle =
      (inp.page_title ?? '').trim() || (lang === 'en' ? 'Meal report' : '本餐食物报告');
    const heading =
      (inp.heading_h1 ?? '').trim() || (lang === 'en' ? 'Food analysis report' : '食物分析报告');
    const subtitle =
      lang === 'en'
        ? 'From your food photo. Structured by the life-monitor plugin to match AINO life-assistant cards.'
        : '根据您上传的食物照片生成；由生活监测插件排版为 AINO 生活助手同款卡片。';

    const out = assembleFoodReportPage({
      lang,
      page_title: pageTitle,
      heading_h1: heading,
      subtitle,
      meal_analysis_json: raw,
      main_inner_html: '',
      prepend_progress_card: inp.prepend_progress_card ?? true,
      daily_targets_json: inp.daily_targets_json ?? '',
      daily_state_json: inp.daily_state_json ?? ''
    });
    return {
      ...out,
      page_cover: buildFoodReportPageCover({
        lang,
        title: heading,
        summary: out.summary,
        meal_analysis_json: raw,
        accentColor: '#10b981'
      })
    };
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    return {
      page_html: '',
      page_url: '',
      page_cover: '',
      summary: '',
      system_error: msg
    };
  }
}
