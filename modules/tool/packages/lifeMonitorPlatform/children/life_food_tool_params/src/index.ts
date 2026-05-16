import { z } from 'zod';
import { sanitizeHttpUrl } from '../../../lib/escape';

export const InputType = z.object({
  image_url: z.string().optional().default(''),
  food_text: z.string().optional().default(''),
  intent: z.enum(['can_eat', 'already_eaten']),
  profile_json: z.string().min(1).max(100_000),
  daily_targets_json: z.string().min(1).max(100_000),
  daily_state_json: z.string().optional().default('{}')
});

export const OutputType = z.object({
  food_tool_params_json: z.string(),
  hint_zh: z.string(),
  system_error: z.string().optional()
});

type In = z.infer<typeof InputType>;
type Out = z.infer<typeof OutputType>;

export async function tool(props: In): Promise<Out> {
  try {
    const inp = InputType.parse(props);
    let profile: unknown;
    let targets: unknown;
    let state: unknown;
    try {
      profile = JSON.parse(inp.profile_json.trim());
    } catch {
      return { food_tool_params_json: '', hint_zh: '', system_error: 'profile_json 非法' };
    }
    try {
      targets = JSON.parse(inp.daily_targets_json.trim());
    } catch {
      return { food_tool_params_json: '', hint_zh: '', system_error: 'daily_targets_json 非法' };
    }
    const rawState = (inp.daily_state_json ?? '').trim() || '{}';
    try {
      state = JSON.parse(rawState);
    } catch {
      return { food_tool_params_json: '', hint_zh: '', system_error: 'daily_state_json 非法' };
    }

    const safeUrl = sanitizeHttpUrl(inp.image_url ?? '');

    const instruction_zh =
      inp.intent === 'can_eat'
        ? '请根据图片与文字识别餐食及份量，估算营养素与热量，并对照「今日目标」与「当日已摄入」判断：用户若吃下这份，是否明显超标或触犯忌口/健康状况；只给饮食建议，不给医疗诊断。不要自动扣减累计。'
        : '请识别餐食及份量，估算营养素与热量；输出结构化数值（kcal、protein_g、fat_g、carbs_g、sodium_mg 可选）供下游「合并记账」节点使用。';

    const bundle = {
      schema_version: 1 as const,
      intent: inp.intent,
      image_url: safeUrl || undefined,
      food_text: (inp.food_text ?? '').trim(),
      user_profile: profile,
      daily_targets: targets,
      daily_state: state,
      instruction_zh
    };

    const hint =
      inp.intent === 'can_eat'
        ? '已打包咨询上下文：请模型判断「能否吃」及注意点。'
        : '已打包记账上下文：请模型输出营养素数字供合并节点。';

    return {
      food_tool_params_json: JSON.stringify(bundle),
      hint_zh: hint
    };
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    return { food_tool_params_json: '', hint_zh: '', system_error: msg };
  }
}
