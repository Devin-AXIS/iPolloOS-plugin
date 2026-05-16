import { z } from 'zod';

/** 与 AINO 营养卡 `remaining`、识图报告字段对齐；由多模态节点产出 JSON */
const RemainingSchema = z
  .object({
    calories: z.coerce.number().finite().optional(),
    protein: z.coerce.number().finite().optional(),
    fat: z.coerce.number().finite().optional(),
    carbs: z.coerce.number().finite().optional()
  })
  .optional();

export const MealAnalysisJsonSchema = z
  .object({
    food_name: z.string().optional(),
    kcal: z.coerce.number().finite(),
    protein_g: z.coerce.number().finite().optional(),
    fat_g: z.coerce.number().finite().optional(),
    carbs_g: z.coerce.number().finite().optional(),
    can_eat: z.string().optional(),
    verdict_reason: z.string().optional(),
    reason: z.string().optional(),
    image_url: z.string().optional(),
    card_title: z.string().optional(),
    /** 若本餐后剩余可摄入（AINO 营养卡上方灰色说明行） */
    remaining: RemainingSchema,
    /** 报告要点，列表展示（AINO strategy 子卡风格） */
    analysis_points: z.array(z.string().max(2000)).max(24).optional(),
    /** 结尾建议一句 */
    closing_tip: z.string().max(4000).optional()
  })
  .passthrough();

export type MealAnalysisInput = z.infer<typeof MealAnalysisJsonSchema>;

export function parseMealAnalysisJson(raw: string): MealAnalysisInput | null {
  const t = raw.trim();
  if (!t) return null;
  try {
    const parsed = JSON.parse(t) as unknown;
    const r = MealAnalysisJsonSchema.safeParse(parsed);
    if (!r.success || !Number.isFinite(r.data.kcal)) return null;
    return r.data;
  } catch {
    return null;
  }
}

/** 供工作流校验：非空字符串且可解析为有效餐次 */
export function isValidMealAnalysisJson(raw: string): boolean {
  return parseMealAnalysisJson(raw) != null;
}
