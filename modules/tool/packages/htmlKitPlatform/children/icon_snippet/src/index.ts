import { z } from 'zod';
import { PRESET_ICONS } from '../../../lib/icons';
import { escapeHtml, sanitizeHttpUrl } from '../../../lib/escape';

const emptyToUndef = (v: unknown) => (v === '' || v === null || v === undefined ? undefined : v);

function sanitizeSvg(s: string): { ok: true; svg: string } | { ok: false; err: string } {
  const t = s.trim();
  if (t.length < 10 || t.length > 48_000) return { ok: false, err: 'SVG 长度不合法' };
  const lower = t.toLowerCase();
  if (
    /<script\b/i.test(t) ||
    /\bon[a-z]+\s*=/i.test(t) ||
    /\bhref\s*=\s*"?\s*javascript:/i.test(t) ||
    /<\s*foreignobject\b/i.test(lower)
  ) {
    return { ok: false, err: 'SVG 含不安全内容（script/on* 等），已拒绝' };
  }
  if (!/^<svg\b/i.test(t) || !/<\/svg>\s*$/i.test(t)) {
    return { ok: false, err: '须为单行或多行完整的 <svg>…</svg>' };
  }
  return { ok: true, svg: t };
}

export const InputType = z
  .object({
    mode: z.enum(['preset', 'custom_url', 'custom_svg']),
    preset_icon: z.preprocess(emptyToUndef, z.string().optional()),
    custom_url: z.preprocess(emptyToUndef, z.string().optional()),
    custom_svg: z.preprocess(emptyToUndef, z.string().optional()),
    size_px: z.coerce.number().min(12).max(128).optional().default(24),
    aria_label: z.preprocess(emptyToUndef, z.string().max(200).optional())
  })
  .superRefine((v, ctx) => {
    if (v.mode === 'preset') {
      const k = (v.preset_icon ?? '').trim();
      if (!k || !PRESET_ICONS[k])
        ctx.addIssue({ code: 'custom', message: '请选择有效的 preset_icon' });
    }
    if (v.mode === 'custom_url') {
      if (!sanitizeHttpUrl(v.custom_url ?? ''))
        ctx.addIssue({ code: 'custom', message: '须提供 https:// 的 custom_url' });
    }
    if (v.mode === 'custom_svg') {
      const svg = sanitizeSvg(v.custom_svg ?? '');
      if (!svg.ok) ctx.addIssue({ code: 'custom', message: svg.err });
    }
  });

export const OutputType = z.object({
  markup: z.string(),
  summary: z.string(),
  system_error: z.string().optional()
});

type In = z.infer<typeof InputType>;
type Out = z.infer<typeof OutputType>;

export async function tool(props: In): Promise<Out> {
  try {
    const inp = InputType.parse(props);
    const size = inp.size_px;
    const al = inp.aria_label?.trim();

    let inner = '';
    if (inp.mode === 'preset') {
      const svg = PRESET_ICONS[inp.preset_icon!.trim()]!;
      inner = svg
        .replace(/width="1em"/g, `width="${size}"`)
        .replace(/height="1em"/g, `height="${size}"`);
    } else if (inp.mode === 'custom_url') {
      const url = sanitizeHttpUrl(inp.custom_url!.trim())!;
      const alt = escapeHtml(al || 'icon');
      const role = al ? ` role="img" aria-label="${escapeHtml(al)}"` : ' role="presentation"';
      inner = `<img src="${escapeHtml(url)}" alt="${alt}" width="${size}" height="${size}" decoding="async"${role} />`;
    } else {
      const sanitized = sanitizeSvg(inp.custom_svg!.trim());
      if (!sanitized.ok) return { markup: '', summary: '', system_error: sanitized.err };
      inner = sanitized.svg;
    }

    const a11y = al
      ? `<span style="display:inline-flex;vertical-align:middle;line-height:0" role="img" aria-label="${escapeHtml(al)}">${inner}</span>`
      : `<span style="display:inline-flex;vertical-align:middle;line-height:0">${inner}</span>`;

    return {
      markup: a11y,
      summary:
        inp.mode === 'preset'
          ? `内联预设图标 "${inp.preset_icon}" (${size}px)。颜色继承 CSS color / currentColor。`
          : `已生成图标片段（${inp.mode}，${size}px）。`
    };
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    return { markup: '', summary: '', system_error: msg };
  }
}
