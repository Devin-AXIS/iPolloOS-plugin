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
