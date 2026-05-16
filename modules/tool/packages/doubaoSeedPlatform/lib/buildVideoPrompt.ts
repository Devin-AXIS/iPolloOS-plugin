/** 方舟 Seedance 类模型常用：在提示词末尾拼接 --ratio / --resolution / --dur（以官方文档为准） */

export type AspectChoice = '21:9' | '16:9' | '4:3' | '1:1' | '3:4' | '9:16' | '智能';

export type ResolutionChoice = '480p' | '720p' | '1080p';

export type DurationMode = 'seconds' | 'smart';

export function aspectToRatioFlag(choice: AspectChoice): string {
  if (choice === '智能') return 'adaptive';
  return choice;
}

export function clampDurationSeconds(n: number): number {
  if (!Number.isFinite(n)) return 5;
  return Math.min(15, Math.max(4, Math.round(n)));
}

/** 返回需拼到用户创意描述后的后缀（前置空格） */
export function buildArkVideoPromptSuffix(opts: {
  aspect: AspectChoice;
  resolution: ResolutionChoice;
  duration_mode: DurationMode;
  duration_seconds?: number;
}): string {
  const ratio = aspectToRatioFlag(opts.aspect);
  const parts = [`--ratio ${ratio}`, `--resolution ${opts.resolution}`];
  if (opts.duration_mode === 'seconds') {
    parts.push(`--dur ${clampDurationSeconds(opts.duration_seconds ?? 5)}`);
  }
  return ` ${parts.join(' ')}`;
}
