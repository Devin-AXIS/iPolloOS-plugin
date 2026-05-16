import { z } from 'zod';
import { isLikelyFullHtml } from '../../../lib/merge';
import { escapeHtml } from '../../../lib/escape';

const emptyToUndef = (v: unknown) => (v === '' || v === null || v === undefined ? undefined : v);

export const InputType = z
  .object({
    page_title: z.preprocess(emptyToUndef, z.string().max(240).optional()),
    lang: z.enum(['zh-CN', 'en']).optional().default('zh-CN'),
    fragment_1: z.string().min(1).max(1_050_000),
    fragment_2: z.preprocess(emptyToUndef, z.string().max(1_050_000).optional()),
    fragment_3: z.preprocess(emptyToUndef, z.string().max(1_050_000).optional()),
    fragment_4: z.preprocess(emptyToUndef, z.string().max(1_050_000).optional()),
    between_separator: z.preprocess(emptyToUndef, z.string().max(8_000).optional()),
    page_output_mode: z
      .enum(['auto_publish', 'resource_center', 'raw_html'])
      .optional()
      .default('auto_publish')
  })
  .superRefine((v, ctx) => {
    const parts = [v.fragment_1, v.fragment_2, v.fragment_3, v.fragment_4].filter(
      (x): x is string => !!x?.trim()
    );
    const singleFull = parts.length === 1 && isLikelyFullHtml(parts[0]!);
    if (!singleFull && !(v.page_title ?? '').trim()) {
      ctx.addIssue({
        code: 'custom',
        path: ['page_title'],
        message:
          '包装合并为外壳时须填写 page_title；若仅一段完整 HTML（<!DOCTYPE 或 <html 开头）可留空'
      });
    }
    let total = 0;
    for (const p of parts) {
      if (/<script\b/i.test(p)) {
        ctx.addIssue({ code: 'custom', message: '片段中不允许 <script>' });
        break;
      }
      total += p.length;
    }
    const sep = v.between_separator ?? '';
    if (sep && /<script\b/i.test(sep))
      ctx.addIssue({ code: 'custom', message: '分隔片段不允许 <script>' });
    total += sep.length * Math.max(parts.length - 1, 0);
    if (total > 4_000_000)
      ctx.addIssue({ code: 'custom', message: '合并后总长度过大（>4M），请拆分多轮调用' });
  });

export const OutputType = z.object({
  full_html: z.string(),
  page_html: z.string(),
  page_url: z.string(),
  summary: z.string(),
  system_error: z.string().optional()
});

type In = z.infer<typeof InputType>;
type Out = z.infer<typeof OutputType>;

function wrapBody(lang: In['lang'], title: string, bodyInner: string): string {
  return `<!DOCTYPE html>
<html lang="${escapeHtml(lang)}">
<head>
<meta charset="utf-8"/>
<meta name="viewport" content="width=device-width, initial-scale=1"/>
<title>${escapeHtml(title)}</title>
</head>
<body>
${bodyInner}
</body>
</html>`;
}

export async function tool(props: In): Promise<Out> {
  try {
    const v = InputType.parse(props);
    const parts = [v.fragment_1, v.fragment_2, v.fragment_3, v.fragment_4].filter((x) =>
      x?.trim()
    ) as string[];
    const sep = v.between_separator?.trim() ?? '';

    if (parts.length === 1 && isLikelyFullHtml(parts[0])) {
      const full_html = parts[0].trim();
      return {
        full_html,
        page_html: full_html,
        page_url: '',
        summary:
          '单段已为完整 HTML，已原样输出。默认自动上传至平台存储，完成后对话中可打开 page_url。'
      };
    }

    const joined =
      sep.length === 0 ? parts.join('\n') : parts.join(sep.includes('<') ? sep : `\n${sep}\n`);

    const full_html = wrapBody(v.lang, (v.page_title ?? '').trim() || 'Page', joined);
    return {
      full_html,
      page_html: full_html,
      page_url: '',
      summary:
        parts.length === 1
          ? '已将单段片段包入极简外壳；默认自动上传至平台存储，完成后对话中可打开 page_url。要主题样式请用 fast_html_page 或 page_init。'
          : `已将 ${parts.length} 段合并为单文档（lang=${v.lang}）；默认自动上传至平台存储，完成后对话中可打开 page_url。`
    };
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    return { full_html: '', page_html: '', page_url: '', summary: '', system_error: msg };
  }
}
