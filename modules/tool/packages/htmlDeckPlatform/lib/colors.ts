import { z } from 'zod';

const hex = z
  .string()
  .trim()
  .regex(/^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/, '须为 #RGB 或 #RRGGBB');

export function normalizeHex(input: string): string {
  const s = input.trim();
  if (/^#[0-9a-fA-F]{3}$/.test(s)) {
    const r = s[1]!;
    const g = s[2]!;
    const b = s[3]!;
    return `#${r}${r}${g}${g}${b}${b}`.toLowerCase();
  }
  return s.toLowerCase();
}

export const HexColorSchema = hex.transform(normalizeHex);

/** Solid muted label color for ECharts (no CSS color-mix). */
export function mixHex(fg: string, bg: string, fgWeight = 0.55): string {
  const parse = (h: string) => {
    const c = normalizeHex(h).slice(1);
    return [0, 2, 4].map((i) => Number.parseInt(c.slice(i, i + 2), 16));
  };
  const [fr, fgG, fb] = parse(fg);
  const [br, bgG, bb] = parse(bg);
  const w = Math.min(1, Math.max(0, fgWeight));
  const mix = (a: number, b: number) => Math.round(a * w + b * (1 - w));
  const toHex = (n: number) => n.toString(16).padStart(2, '0');
  return `#${toHex(mix(fr, br))}${toHex(mix(fgG, bgG))}${toHex(mix(fb, bb))}`;
}
