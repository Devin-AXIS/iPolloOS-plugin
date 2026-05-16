import { z } from 'zod';

const empty = (v: unknown) => (v === '' || v === null || v === undefined ? undefined : v);

function parseNum(s: string | undefined): number | null {
  if (s == null || !String(s).trim()) return null;
  const n = Number(String(s).trim().replace(',', '.'));
  return Number.isFinite(n) ? n : null;
}

export const InputType = z.object({
  age: z.preprocess(empty, z.string().optional()).default(''),
  sex: z.enum(['unknown', 'male', 'female']).optional().default('unknown'),
  height_cm: z.preprocess(empty, z.string().optional()).default(''),
  weight_kg: z.preprocess(empty, z.string().optional()).default(''),
  health_conditions: z.preprocess(empty, z.string().optional()).default(''),
  allergies: z.preprocess(empty, z.string().optional()).default(''),
  goal_primary: z
    .enum(['lose_weight', 'maintain', 'gain_muscle', 'control_glucose', 'other'])
    .optional()
    .default('maintain'),
  goal_notes: z.preprocess(empty, z.string().optional()).default('')
});

export const OutputType = z.object({
  profile_json: z.string(),
  profile_summary: z.string(),
  system_error: z.string().optional()
});

type In = z.infer<typeof InputType>;
type Out = z.infer<typeof OutputType>;

export async function tool(props: In): Promise<Out> {
  try {
    const inp = InputType.parse(props);
    const age = parseNum(inp.age);
    const height_cm = parseNum(inp.height_cm);
    const weight_kg = parseNum(inp.weight_kg);

    const profile = {
      schema_version: 1 as const,
      age,
      sex: inp.sex,
      height_cm,
      weight_kg,
      health_conditions: (inp.health_conditions ?? '').trim(),
      allergies: (inp.allergies ?? '').trim(),
      goal_primary: inp.goal_primary,
      goal_notes: (inp.goal_notes ?? '').trim()
    };

    const parts: string[] = [];
    if (age != null) parts.push(`${age} 岁`);
    if (inp.sex !== 'unknown') parts.push(inp.sex === 'male' ? '男' : '女');
    if (height_cm != null) parts.push(`身高 ${height_cm} cm`);
    if (weight_kg != null) parts.push(`体重 ${weight_kg} kg`);
    parts.push(`目标：${inp.goal_primary}`);
    if (profile.health_conditions) parts.push(`健康状况已记录`);
    if (profile.allergies) parts.push(`忌口已记录`);

    return {
      profile_json: JSON.stringify(profile),
      profile_summary: parts.join(' · ')
    };
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    return { profile_json: '', profile_summary: '', system_error: msg };
  }
}
