import { z } from 'zod';

const empty = (v: unknown) => (v === '' || v === null || v === undefined ? undefined : v);

const ProfileSchema = z.object({
  schema_version: z.number().optional(),
  age: z.number().nullable().optional(),
  sex: z.enum(['unknown', 'male', 'female']).optional(),
  height_cm: z.number().nullable().optional(),
  weight_kg: z.number().nullable().optional(),
  goal_primary: z.string().optional()
});

export const InputType = z.object({
  profile_json: z.string().min(2).max(100_000),
  activity_level: z.enum(['sedentary', 'light', 'moderate', 'active']).optional().default('light'),
  calorie_override_kcal: z.preprocess(empty, z.string().optional()).default('')
});

export const OutputType = z.object({
  daily_targets_json: z.string(),
  targets_summary: z.string(),
  system_error: z.string().optional()
});

type In = z.infer<typeof InputType>;
type Out = z.infer<typeof OutputType>;

const ACT: Record<string, number> = {
  sedentary: 1.2,
  light: 1.375,
  moderate: 1.55,
  active: 1.725
};

function parseOverride(s: string): number | null {
  const n = Number(String(s).trim());
  return Number.isFinite(n) && n > 0 ? Math.round(n) : null;
}

function bmr(age: number, sex: string, w: number, h: number): number {
  if (sex === 'female') return 10 * w + 6.25 * h - 5 * age - 161;
  if (sex === 'male') return 10 * w + 6.25 * h - 5 * age + 5;
  return 10 * w + 6.25 * h - 5 * age - 78;
}

function goalFactor(goal: string | undefined): number {
  if (goal === 'lose_weight') return 0.86;
  if (goal === 'gain_muscle') return 1.08;
  if (goal === 'control_glucose') return 0.94;
  return 1;
}

export async function tool(props: In): Promise<Out> {
  try {
    const inp = InputType.parse(props);
    let profile: z.infer<typeof ProfileSchema>;
    try {
      profile = ProfileSchema.parse(JSON.parse(inp.profile_json.trim()));
    } catch {
      return { daily_targets_json: '', targets_summary: '', system_error: 'profile_json 无法解析' };
    }

    const ov = parseOverride(inp.calorie_override_kcal ?? '');
    const actMul = ACT[inp.activity_level] ?? 1.375;

    let target_kcal: number;
    let bmrEst: number | null = null;
    let tdeeEst: number | null = null;
    let notes: string;

    if (ov != null) {
      target_kcal = ov;
      notes = '使用手动覆盖热量。';
    } else {
      const age = profile.age ?? null;
      const w = profile.weight_kg ?? null;
      const h = profile.height_cm ?? null;
      const sex = profile.sex ?? 'unknown';
      if (
        age != null &&
        w != null &&
        h != null &&
        age > 10 &&
        age < 120 &&
        w > 20 &&
        w < 300 &&
        h > 50 &&
        h < 250
      ) {
        bmrEst = Math.round(bmr(age, sex, w, h));
        tdeeEst = Math.round(bmrEst * actMul);
        target_kcal = Math.max(1200, Math.round(tdeeEst * goalFactor(profile.goal_primary)));
        notes = `按 Mifflin–St Jeor 估算 BMR≈${bmrEst}，TDEE≈${tdeeEst}，再按目标与活动微调。`;
      } else {
        target_kcal = 2000;
        notes = '档案缺少年龄/体重/身高，采用默认 2000 kcal；建议补全后重算。';
      }
    }

    const protein_g = Math.round((target_kcal * 0.3) / 4);
    const fat_g = Math.round((target_kcal * 0.28) / 9);
    const carbs_g = Math.round((target_kcal * 0.42) / 4);
    const weight = profile.weight_kg && profile.weight_kg > 30 ? profile.weight_kg : 65;
    const water_ml = Math.round(Math.min(4000, Math.max(1500, weight * 35)));

    const out = {
      schema_version: 1 as const,
      date: new Date().toISOString().slice(0, 10),
      target_kcal,
      protein_g,
      fat_g,
      carbs_g,
      water_ml,
      sodium_max_mg: 2300,
      fiber_target_g: 30,
      bmr_estimate: bmrEst,
      tdee_estimate: tdeeEst,
      activity_level: inp.activity_level,
      notes
    };

    return {
      daily_targets_json: JSON.stringify(out),
      targets_summary: `约 ${target_kcal} kcal/日 · 蛋白 ${protein_g} g · 碳水 ${carbs_g} g · 脂肪 ${fat_g} g · 饮水目标 ${water_ml} ml`
    };
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    return { daily_targets_json: '', targets_summary: '', system_error: msg };
  }
}
