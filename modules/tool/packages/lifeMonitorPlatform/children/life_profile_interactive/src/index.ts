import { z } from 'zod';

const empty = (v: unknown) => (v === '' || v === null || v === undefined ? undefined : v);

export const InputType = z.object({
  page_title: z.preprocess(empty, z.string().max(120).optional()).default('完善健康档案'),
  accent_color: z
    .preprocess(
      empty,
      z
        .string()
        .regex(/^#[0-9a-fA-F]{6}$/)
        .optional()
    )
    .default('#10b981'),
  page_output_mode: z
    .enum(['auto_publish', 'resource_center', 'raw_html'])
    .optional()
    .default('auto_publish')
});

export const OutputType = z.object({
  page_html: z.string(),
  page_url: z.string(),
  page_cover: z.string(),
  full_html: z.string(),
  interactive_html: z.boolean(),
  interactive_html_result: z.record(z.string(), z.any()),
  interactive_title: z.string(),
  interactive_description: z.string(),
  summary: z.string(),
  system_error: z.string().optional()
});

type In = z.infer<typeof InputType>;
type Out = z.infer<typeof OutputType>;

function escapeHtml(value: string) {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function buildPage(title: string, accent: string) {
  const safeTitle = escapeHtml(title);
  return `<!doctype html>
<html lang="zh-CN">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width,initial-scale=1,maximum-scale=1" />
  <title>${safeTitle}</title>
  <style>
    :root{--accent:${accent};--ink:#0f172a;--muted:#64748b;--line:rgba(15,23,42,.1);--panel:rgba(255,255,255,.82);--bg:#f6faf8}
    *{box-sizing:border-box} html,body{margin:0;min-height:100%;font-family:system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI","PingFang SC","Microsoft YaHei",sans-serif;color:var(--ink);background:linear-gradient(180deg,#f8fffb 0%,var(--bg) 100%)}
    body{display:grid;place-items:center;padding:28px 16px}
    main{width:min(720px,100%);background:var(--panel);border:1px solid var(--line);border-radius:28px;box-shadow:0 24px 80px rgba(15,23,42,.12);padding:28px;backdrop-filter:blur(18px)}
    h1{margin:0;font-size:28px;line-height:1.18;letter-spacing:0;color:var(--ink)}
    .sub{margin:10px 0 24px;color:var(--muted);font-size:14px;line-height:1.6}
    form{display:grid;gap:16px}
    .grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:14px}
    label{display:grid;gap:8px;font-size:13px;font-weight:650;color:#1e293b}
    input,select,textarea{width:100%;border:1px solid var(--line);border-radius:16px;background:#fff;color:var(--ink);font:16px/1.4 inherit;padding:13px 14px;outline:none}
    textarea{min-height:92px;resize:vertical}
    input:focus,select:focus,textarea:focus{border-color:var(--accent);box-shadow:0 0 0 4px color-mix(in srgb,var(--accent) 14%,transparent)}
    .full{grid-column:1/-1}
    button{border:0;border-radius:999px;background:var(--accent);color:#fff;font:700 16px/1 inherit;padding:15px 20px;cursor:pointer;box-shadow:0 14px 30px color-mix(in srgb,var(--accent) 26%,transparent)}
    @media (max-width:640px){main{padding:22px;border-radius:22px}.grid{grid-template-columns:1fr}h1{font-size:24px}}
  </style>
</head>
<body>
  <main>
    <h1>${safeTitle}</h1>
    <p class="sub">请补充基础信息，提交后会继续生成你的健康档案和后续建议。</p>
    <form>
      <div class="grid">
        <label>年龄<input name="age" inputmode="numeric" placeholder="例如 30" /></label>
        <label>性别<select name="sex"><option value="unknown">暂不透露</option><option value="male">男</option><option value="female">女</option></select></label>
        <label>身高 cm<input name="height_cm" inputmode="decimal" placeholder="例如 175" /></label>
        <label>体重 kg<input name="weight_kg" inputmode="decimal" placeholder="例如 70" /></label>
        <label class="full">主要目标<select name="goal_primary"><option value="lose_weight">减重</option><option value="maintain">维持</option><option value="gain_muscle">增肌</option><option value="control_glucose">控糖</option><option value="other">其他</option></select></label>
        <label class="full">健康状况 / 慢性病<textarea name="health_conditions" placeholder="例如血糖偏高、胃不舒服、近期睡眠差，可不填"></textarea></label>
        <label class="full">过敏 / 忌口<textarea name="allergies" placeholder="例如乳糖不耐、海鲜过敏、不吃辣，可不填"></textarea></label>
        <label class="full">目标补充说明<textarea name="goal_notes" placeholder="例如三个月减 5kg、想改善晚餐结构，可不填"></textarea></label>
      </div>
      <button type="submit">提交健康档案</button>
    </form>
  </main>
</body>
</html>`;
}

function buildPageCover(title: string, accent: string) {
  return JSON.stringify({
    title,
    description: '补充基础身体信息、健康状况、过敏忌口和主要目标。',
    eyebrow: '健康档案',
    variant: 'form',
    status: '待填写',
    actionLabel: '填写',
    accentColor: accent,
    chips: ['生活助手', '健康档案'],
    fields: [
      { label: '年龄', placeholder: '待填写', required: true, type: 'number' },
      { label: '性别', placeholder: '待选择', type: 'select' },
      { label: '身高', placeholder: '待填写', type: 'number' },
      { label: '体重', placeholder: '待填写', type: 'number' },
      { label: '主要目标', placeholder: '待选择', required: true, type: 'select' },
      { label: '健康状况', placeholder: '可选填写', type: 'textarea' },
      { label: '过敏 / 忌口', placeholder: '可选填写', type: 'textarea' }
    ]
  });
}

export async function tool(props: In): Promise<Out> {
  try {
    const inp = InputType.parse(props);
    const title = inp.page_title || '完善健康档案';
    const fullHtml = buildPage(title, inp.accent_color);
    const pageCover = buildPageCover(title, inp.accent_color);

    return {
      page_html: fullHtml,
      page_url: '',
      page_cover: pageCover,
      full_html: fullHtml,
      interactive_html: true,
      interactive_html_result: {},
      interactive_title: title,
      interactive_description: '请填写健康档案，提交后会继续生成后续建议。',
      summary: '请先填写健康档案；提交后我会继续处理。'
    };
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    return {
      page_html: '',
      page_url: '',
      page_cover: '',
      full_html: '',
      interactive_html: false,
      interactive_html_result: {},
      interactive_title: '',
      interactive_description: '',
      summary: '',
      system_error: msg
    };
  }
}
