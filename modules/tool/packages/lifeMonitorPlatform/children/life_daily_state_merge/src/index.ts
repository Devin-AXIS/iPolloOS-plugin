import { z } from 'zod';

const MealSchema = z.object({
  food_label: z.string().min(1).max(500),
  kcal: z.number().finite(),
  protein_g: z.number().finite().optional().default(0),
  fat_g: z.number().finite().optional().default(0),
  carbs_g: z.number().finite().optional().default(0),
  sodium_mg: z.number().finite().optional().default(0)
});

export const InputType = z.object({
  daily_state_json: z.string().max(500_000).optional().default(''),
  meal_json: z.string().min(2).max(50_000),
  log_date: z.string().optional().default('')
});

export const OutputType = z.object({
  daily_state_json: z.string(),
  merge_summary: z.string(),
  system_error: z.string().optional()
});

type In = z.infer<typeof InputType>;
type Out = z.infer<typeof OutputType>;

type Totals = {
  kcal: number;
  protein_g: number;
  fat_g: number;
  carbs_g: number;
  sodium_mg: number;
};
type MealRow = Totals & { id: string; food_label: string; logged_at: string };

function todayStr(logDate: string): string {
  const t = logDate.trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(t)) return t;
  return new Date().toISOString().slice(0, 10);
}

export async function tool(props: In): Promise<Out> {
  try {
    const inp = InputType.parse(props);
    let meal: z.infer<typeof MealSchema>;
    try {
      meal = MealSchema.parse(JSON.parse(inp.meal_json.trim()));
    } catch {
      return { daily_state_json: '', merge_summary: '', system_error: 'meal_json 格式不正确' };
    }

    const date = todayStr(inp.log_date ?? '');
    let state: {
      schema_version: number;
      date: string;
      totals: Totals;
      meals: MealRow[];
    };

    const raw = (inp.daily_state_json ?? '').trim();
    if (raw) {
      try {
        const parsed = JSON.parse(raw) as {
          schema_version?: number;
          date?: string;
          totals?: Partial<Totals>;
          meals?: MealRow[];
        };
        if (parsed.date && parsed.date !== date) {
          state = {
            schema_version: 1,
            date,
            totals: { kcal: 0, protein_g: 0, fat_g: 0, carbs_g: 0, sodium_mg: 0 },
            meals: []
          };
        } else {
          const t = parsed.totals ?? {};
          state = {
            schema_version: 1,
            date: parsed.date ?? date,
            totals: {
              kcal: Number(t.kcal) || 0,
              protein_g: Number(t.protein_g) || 0,
              fat_g: Number(t.fat_g) || 0,
              carbs_g: Number(t.carbs_g) || 0,
              sodium_mg: Number(t.sodium_mg) || 0
            },
            meals: Array.isArray(parsed.meals) ? parsed.meals : []
          };
        }
      } catch {
        return {
          daily_state_json: '',
          merge_summary: '',
          system_error: 'daily_state_json 无法解析'
        };
      }
    } else {
      state = {
        schema_version: 1,
        date,
        totals: { kcal: 0, protein_g: 0, fat_g: 0, carbs_g: 0, sodium_mg: 0 },
        meals: []
      };
    }

    const row: MealRow = {
      id: `m_${Date.now()}`,
      food_label: meal.food_label,
      kcal: meal.kcal,
      protein_g: meal.protein_g,
      fat_g: meal.fat_g,
      carbs_g: meal.carbs_g,
      sodium_mg: meal.sodium_mg,
      logged_at: new Date().toISOString()
    };

    state.date = date;
    state.totals.kcal += row.kcal;
    state.totals.protein_g += row.protein_g;
    state.totals.fat_g += row.fat_g;
    state.totals.carbs_g += row.carbs_g;
    state.totals.sodium_mg += row.sodium_mg;
    state.meals.push(row);

    return {
      daily_state_json: JSON.stringify(state),
      merge_summary: `已记入「${row.food_label}」${row.kcal} kcal；今日累计约 ${Math.round(state.totals.kcal)} kcal。`
    };
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    return { daily_state_json: '', merge_summary: '', system_error: msg };
  }
}
