import { z } from 'zod';
import { buildThemedSingleFileHtml } from '../../../lib/scaffold';
import { HexColorSchema } from '../../../lib/colors';

const LangSchema = z.enum(['zh-CN', 'en']);
const emptyToUndef = (v: unknown) => (v === '' || v === null || v === undefined ? undefined : v);

export const InputType = z
  .object({
    page_title: z.string().min(1).max(200),
    interactive_title: z.preprocess(emptyToUndef, z.string().max(200).optional()),
    interactive_description: z.preprocess(emptyToUndef, z.string().max(2000).optional()),
    main_inner_html: z.string().min(1).max(900_000),
    lang: z.preprocess(emptyToUndef, LangSchema.optional()).default('zh-CN'),
    color_primary: z.preprocess(emptyToUndef, HexColorSchema.optional()),
    color_surface: z.preprocess(emptyToUndef, HexColorSchema.optional()),
    color_text: z.preprocess(emptyToUndef, HexColorSchema.optional()),
    page_output_mode: z
      .enum(['auto_publish', 'resource_center', 'raw_html'])
      .optional()
      .default('auto_publish')
  })
  .superRefine((v, ctx) => {
    if (/<script\b/i.test(v.main_inner_html)) {
      ctx.addIssue({
        code: 'custom',
        message: 'main_inner_html 不允许包含 <script>；交互提交桥由插件自动注入'
      });
    }
    if (!/\bname\s*=/i.test(v.main_inner_html)) {
      ctx.addIssue({
        code: 'custom',
        message: '交互表单字段需要 name 属性，否则无法形成提交 JSON'
      });
    }
  });

export const OutputType = z.object({
  page_html: z.string(),
  page_url: z.string(),
  interactive_html_result: z.record(z.string(), z.any()),
  interactive_html: z.boolean(),
  interactive_title: z.string(),
  interactive_description: z.string(),
  summary: z.string(),
  system_error: z.string().optional()
});

type In = z.infer<typeof InputType>;
type Out = z.infer<typeof OutputType>;

const bridgeScript = `<script>
(function(){
  var EVENT_TYPE = 'ipolloos:interactive-html:submit';
  function readForm(form){
    var data = {};
    var fd = new FormData(form);
    fd.forEach(function(value,key){
      if (Object.prototype.hasOwnProperty.call(data,key)) {
        if (!Array.isArray(data[key])) data[key] = [data[key]];
        data[key].push(value);
      } else {
        data[key] = value;
      }
    });
    Array.prototype.forEach.call(form.elements || [], function(el){
      if (!el || !el.name || el.type !== 'checkbox') return;
      if (!Object.prototype.hasOwnProperty.call(data, el.name)) data[el.name] = false;
    });
    return data;
  }
  function setSubmitStatus(text, ok){
    var id = 'ipolloos-interactive-submit-status';
    var el = document.getElementById(id);
    if (!el) {
      el = document.createElement('div');
      el.id = id;
      el.setAttribute('role', 'status');
      el.style.cssText = 'position:fixed;left:50%;bottom:24px;transform:translateX(-50%);z-index:2147483647;padding:10px 14px;border-radius:999px;font:14px/1.4 system-ui,-apple-system,BlinkMacSystemFont,Segoe UI,sans-serif;box-shadow:0 12px 32px rgba(15,23,42,.18);background:' + (ok === false ? '#fef2f2' : '#ecfdf5') + ';color:' + (ok === false ? '#991b1b' : '#065f46');
      document.body.appendChild(el);
    }
    el.textContent = text;
  }
  function submit(data){
    data = data || {};
    var cfg = window.__IPOLLOOS_INTERACTIVE_SUBMIT__;
    if (cfg && cfg.url && cfg.token) {
      setSubmitStatus('正在提交...', true);
      fetch(cfg.url, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          appId: cfg.appId,
          chatId: cfg.chatId,
          interactiveSubmitToken: cfg.token,
          stream: false,
          detail: true,
          messages: [{ role: 'user', content: JSON.stringify(data) }]
        })
      }).then(function(res){
        if (!res.ok) throw new Error('submit failed');
        return res.json();
      }).then(function(){
        setSubmitStatus('已提交，AI 将继续处理', true);
        window.parent.postMessage({ type: EVENT_TYPE, data: data, submitted: true }, '*');
      }).catch(function(err){
        setSubmitStatus('提交失败，请回到对话重试', false);
        window.parent.postMessage({ type: EVENT_TYPE, data: data, error: String(err && err.message || err) }, '*');
      });
      return;
    }
    window.parent.postMessage({ type: EVENT_TYPE, data: data }, '*');
  }
  window.iPolloOSInteractive = { submit: submit };
  document.addEventListener('submit', function(event){
    var form = event.target;
    if (!form || !form.tagName || String(form.tagName).toLowerCase() !== 'form') return;
    event.preventDefault();
    submit(readForm(form));
  }, true);
  document.addEventListener('click', function(event){
    var target = event.target && event.target.closest ? event.target.closest('[data-ipolloos-submit]') : null;
    if (!target) return;
    event.preventDefault();
    var raw = target.getAttribute('data-ipolloos-submit');
    if (raw && raw !== 'true') {
      try { submit(JSON.parse(raw)); return; } catch (err) {}
    }
    var form = target.form || target.closest('form');
    submit(form ? readForm(form) : {});
  }, true);
})();
</script>`;

function injectBridge(html: string): string {
  if (/<\/body>/i.test(html)) return html.replace(/<\/body>/i, `${bridgeScript}</body>`);
  return `${html}\n${bridgeScript}`;
}

export async function tool(props: In): Promise<Out> {
  try {
    const inp = InputType.parse(props);
    const title = inp.page_title.trim();
    const interactiveTitle = inp.interactive_title?.trim() || title;
    const primary = inp.color_primary ?? '#0ea5e9';
    const surface = inp.color_surface ?? '#f8fafc';
    const text = inp.color_text ?? '#0f172a';

    const pageHtml = injectBridge(
      buildThemedSingleFileHtml({
        lang: inp.lang,
        page_title: title,
        heading_h1: title,
        color_primary: primary,
        color_surface: surface,
        color_text: text,
        favicon_mode: 'none',
        main_inner_html: inp.main_inner_html.trim(),
        include_lucide_cdn_hint: false
      })
    );

    return {
      page_html: pageHtml,
      page_url: '',
      interactive_html_result: {},
      interactive_html: true,
      interactive_title: interactiveTitle,
      interactive_description: inp.interactive_description?.trim() || '',
      summary:
        inp.lang === 'en'
          ? 'Interactive HTML page generated. It will be published and wait for user submission.'
          : '已生成交互式 HTML 页面；发布后会等待用户提交，提交数据将回到当前工作流继续执行。'
    };
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    return {
      page_html: '',
      page_url: '',
      interactive_html_result: {},
      interactive_html: false,
      interactive_title: '',
      interactive_description: '',
      summary: '',
      system_error: msg
    };
  }
}
