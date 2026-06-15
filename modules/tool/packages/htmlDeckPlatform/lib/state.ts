import { DeckStateSchema, type DeckState } from './types';

export function parseDeckState(raw: string): DeckState {
  const t = raw?.trim() ?? '';
  if (!t) throw new Error('deck_state 为空：请先调用 deck_init 或传入上一步返回的 deck_state。');
  let j: unknown;
  try {
    j = JSON.parse(t) as unknown;
  } catch {
    throw new Error('deck_state 不是合法 JSON。请原样复制工具返回的 deck_state。');
  }
  if (typeof j === 'object' && j !== null && (j as { v?: number }).v === 1) {
    throw new Error('deck_state 不是当前 v2 结构，请重新执行「幻灯片 · 生成整套」。');
  }
  const r = DeckStateSchema.safeParse(j);
  if (!r.success) {
    const msg = r.error.issues.map((i) => `${i.path.join('.')}: ${i.message}`).join('; ');
    throw new Error(`deck_state 校验失败: ${msg}`);
  }
  return r.data;
}

export function stringifyDeckState(state: DeckState): string {
  return JSON.stringify(state);
}
