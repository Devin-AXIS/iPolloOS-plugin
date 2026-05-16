/** 与 OpenAI GPT-Image-2 文档一致的常用尺寸 + auto + 自定义 */
export const PRESET_SIZES = [
  'auto',
  '1024x1024',
  '1536x1024',
  '1024x1536',
  '2048x2048',
  '2048x1152',
  '3840x2160',
  '2160x3840',
  'custom'
] as const;

export type PresetSize = (typeof PRESET_SIZES)[number];

const PIXEL_MIN = 655_360;
const PIXEL_MAX = 8_294_400;
const EDGE_MAX = 3840;
const RATIO_MAX = 3;

/** 校验自定义 WxH（gpt-image-2 约束） */
export function validateCustomSize(raw: string): string | null {
  const s = raw.trim().toLowerCase();
  const m = /^(\d+)\s*x\s*(\d+)$/.exec(s);
  if (!m) {
    return '自定义尺寸格式须为「宽x高」，例如 1920x1080（可含空格）';
  }
  const w = Number(m[1]);
  const h = Number(m[2]);
  if (!Number.isFinite(w) || !Number.isFinite(h) || w <= 0 || h <= 0) {
    return '宽高须为正整数';
  }
  const long = Math.max(w, h);
  const short = Math.min(w, h);
  if (long > EDGE_MAX) {
    return `长边不可超过 ${EDGE_MAX}px（当前 ${long}）`;
  }
  if (w % 16 !== 0 || h % 16 !== 0) {
    return '宽、高均须为 16 的倍数';
  }
  if (short > 0 && long / short > RATIO_MAX + 1e-9) {
    return `长宽比不可超过 ${RATIO_MAX}:1`;
  }
  const pixels = w * h;
  if (pixels < PIXEL_MIN || pixels > PIXEL_MAX) {
    return `总像素须在 ${PIXEL_MIN.toLocaleString()}～${PIXEL_MAX.toLocaleString()} 之间（当前 ${pixels.toLocaleString()}）`;
  }
  return null;
}

/** 发往 API 的 size 字符串（须先通过 validateCustomSize） */
export function resolveApiSize(preset: PresetSize, sizeCustom: string | undefined): string {
  if (preset === 'custom') {
    const raw = (sizeCustom ?? '').trim();
    const m = /^(\d+)\s*x\s*(\d+)$/i.exec(raw);
    if (!m) return '1024x1024';
    return `${Number(m[1])}x${Number(m[2])}`;
  }
  return preset;
}
