import { z } from 'zod';
import { assembleFoodReportPage } from '../../../lib/assemble-food-report-page';
import { MealAnalysisJsonSchema } from '../../../lib/meal-json';
import { buildFoodReportPageCover } from '../../../lib/page-cover';

const LangSchema = z.enum(['zh-CN', 'en']);

export const InputType = z
  .object({
    page_title: z.string().min(1).max(200),
    heading_h1: z.string().max(400).optional().default(''),
    meal_analysis_json: z.string().max(50_000).optional().default(''),
    main_inner_html: z.string().max(900_000).optional().default(''),
    prepend_progress_card: z.boolean().optional().default(true),
    daily_targets_json: z.string().optional().default(''),
    daily_state_json: z.string().optional().default(''),
    lang: LangSchema.optional().default('zh-CN'),
    page_output_mode: z
      .enum(['auto_publish', 'resource_center', 'raw_html'])
      .optional()
      .default('auto_publish')
  })
  .superRefine((v, ctx) => {
    const user = (v.main_inner_html ?? '').trim();
    if (user && /<script\b/i.test(user)) {
      ctx.addIssue({ code: 'custom', message: 'main_inner_html 不允许包含 <script>' });
    }
    const mealRaw = (v.meal_analysis_json ?? '').trim();
    let hasMeal = false;
    if (mealRaw) {
      try {
        const parsed = JSON.parse(mealRaw);
        const r = MealAnalysisJsonSchema.safeParse(parsed);
        if (r.success && Number.isFinite(r.data.kcal)) {
          hasMeal = true;
        } else {
          ctx.addIssue({
            code: 'custom',
            message: 'meal_analysis_json 缺少有效 kcal 或字段类型不正确'
          });
        }
      } catch {
        ctx.addIssue({ code: 'custom', message: 'meal_analysis_json 不是合法 JSON' });
      }
    }
    const prog =
      v.prepend_progress_card &&
      (v.daily_targets_json ?? '').trim() &&
      (v.daily_state_json ?? '').trim();
    if (!hasMeal && !prog && !user) {
      ctx.addIssue({
        code: 'custom',
        message: '请至少提供 meal_analysis_json、今日进度（目标+累计 JSON）或 main_inner_html 之一'
      });
    }
  });

export const OutputType = z.object({
  page_html: z.string(),
  page_url: z.string(),
  page_cover: z.string(),
  full_html: z.string(),
  summary: z.string(),
  system_error: z.string().optional()
});

type In = z.infer<typeof InputType>;
type Out = z.infer<typeof OutputType>;

export async function tool(props: In): Promise<Out> {
  try {
    const inp = InputType.parse(props);
    const lang = inp.lang;
    const subtitle =
      lang === 'en'
        ? 'Diet snapshot. Let your vision model output meal_analysis_json (with image_url) for this layout.'
        : '饮食快照：识图模型输出 meal_analysis_json（含 image_url、解读要点）即可生成与 AINO 生活助手一致的食物分析报告。';

    const out = assembleFoodReportPage({
      lang,
      page_title: inp.page_title.trim(),
      heading_h1: inp.heading_h1?.trim() || inp.page_title.trim(),
      subtitle,
      meal_analysis_json: inp.meal_analysis_json ?? '',
      main_inner_html: inp.main_inner_html ?? '',
      prepend_progress_card: inp.prepend_progress_card ?? true,
      daily_targets_json: inp.daily_targets_json ?? '',
      daily_state_json: inp.daily_state_json ?? ''
    });
    return {
      ...out,
      page_cover: buildFoodReportPageCover({
        lang,
        title: inp.heading_h1?.trim() || inp.page_title.trim(),
        summary: out.summary,
        meal_analysis_json: inp.meal_analysis_json ?? '',
        accentColor: '#10b981'
      })
    };
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    return {
      page_html: '',
      page_url: '',
      page_cover: '',
      full_html: '',
      summary: '',
      system_error: msg
    };
  }
}
