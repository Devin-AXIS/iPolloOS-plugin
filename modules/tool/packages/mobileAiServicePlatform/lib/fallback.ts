const escapeHtml = (value: string) =>
  value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');

export function buildFallbackMobileAppHtml(props: {
  userRequirement: string;
  serviceLanguage: string;
  background: string;
  visualPrompt: string;
  interactionMode: string;
  upstreamError: string;
}): string {
  const title = props.userRequirement.split(/\n/)[0]?.trim() || '移动端 AI 服务';
  const safeTitle = escapeHtml(title.slice(0, 80));
  const safeRequirement = escapeHtml(props.userRequirement);
  const safeBackground = escapeHtml(props.background);
  const safeVisual = escapeHtml(props.visualPrompt);
  const safeError = escapeHtml(props.upstreamError.slice(0, 600));

  return `<!DOCTYPE html>
<html lang="${props.serviceLanguage === 'en' ? 'en' : 'zh-CN'}">
<head>
<meta charset="utf-8"/>
<meta name="viewport" content="width=device-width, initial-scale=1"/>
<title>${safeTitle}</title>
<style>
:root{--bg:#10131f;--panel:rgba(255,255,255,.12);--panel2:rgba(255,255,255,.18);--text:#f8fafc;--muted:#cbd5e1;--accent:#8b5cf6;--accent2:#06b6d4;--warn:#f59e0b}
*{box-sizing:border-box}html,body{margin:0;min-height:100%;font-family:system-ui,-apple-system,"Segoe UI","PingFang SC",sans-serif;background:radial-gradient(circle at 18% 6%,rgba(6,182,212,.36),transparent 34%),radial-gradient(circle at 88% 14%,rgba(139,92,246,.38),transparent 36%),linear-gradient(160deg,#0f172a,#111827 48%,#1e1b4b);color:var(--text)}
body{overflow-x:hidden}.app{width:min(100%,480px);margin:0 auto;min-height:100vh;padding:18px 16px 28px;display:flex;flex-direction:column;gap:14px}.top{display:flex;justify-content:space-between;align-items:center;gap:12px}.badge{border:1px solid rgba(255,255,255,.18);background:rgba(255,255,255,.1);backdrop-filter:blur(16px);border-radius:999px;padding:7px 10px;color:var(--muted);font-size:12px}.panel{border:1px solid rgba(255,255,255,.16);background:var(--panel);box-shadow:0 18px 60px rgba(0,0,0,.28);backdrop-filter:blur(22px);border-radius:22px;padding:16px}h1{font-size:28px;line-height:1.08;margin:4px 0 8px;letter-spacing:0}p{margin:0;color:var(--muted);line-height:1.6}.grid{display:grid;grid-template-columns:1fr 1fr;gap:10px}.cap{min-height:78px;border-radius:16px;padding:12px;background:rgba(255,255,255,.1);border:1px solid rgba(255,255,255,.12)}.cap b{display:block;margin-bottom:6px}.cap span{font-size:12px;color:var(--muted);line-height:1.45;display:block}label{display:block;font-size:13px;color:#e2e8f0;margin-bottom:7px}textarea,input,select{width:100%;border:1px solid rgba(255,255,255,.18);background:rgba(15,23,42,.58);color:var(--text);border-radius:16px;padding:12px;font:inherit;outline:none}textarea{min-height:112px;resize:vertical}button{width:100%;min-height:48px;border:0;border-radius:16px;background:linear-gradient(135deg,var(--accent),var(--accent2));color:white;font-weight:760;font-size:15px;cursor:pointer}.row{display:flex;gap:10px}.row>*{flex:1}.status{display:grid;gap:8px}.step{display:flex;align-items:center;gap:10px;color:var(--muted);font-size:13px}.dot{width:9px;height:9px;border-radius:999px;background:var(--accent2);box-shadow:0 0 18px var(--accent2)}.result{white-space:pre-wrap;color:#e5e7eb;line-height:1.55;font-size:13px}.warn{border-color:rgba(245,158,11,.38);background:rgba(245,158,11,.12)}.warn strong{color:#fde68a}@media (max-width:380px){.grid{grid-template-columns:1fr}h1{font-size:24px}.app{padding-left:12px;padding-right:12px}}
</style>
</head>
<body>
<main class="app">
  <section class="top"><div class="badge">AI Service</div><div class="badge">${escapeHtml(props.interactionMode)}</div></section>
  <section class="panel">
    <h1>${safeTitle}</h1>
    <p>NO_EMPTY_OUTPUT：这是一个移动端功能应用工作台。上游 iPolloOS 应用本次没有返回可发布 HTML，页面已自动降级为可操作版本，避免交付中断。</p>
  </section>
  <section class="panel warn">
    <strong>上游生成状态</strong>
    <p>${safeError}</p>
  </section>
  <section class="panel">
    <label>你的需求</label>
    <textarea id="need">${safeRequirement}</textarea>
    <div class="row" style="margin-top:10px">
      <select id="mode">
        <option>自动规划</option><option>搜索增强</option><option>深图生成</option><option>深视频生成</option><option>代码/工具调用</option>
      </select>
      <button id="run" type="button">生成方案</button>
    </div>
  </section>
  <section class="grid">
    <div class="cap"><b>网络搜索</b><span>补充实时资料、趋势、案例和背景。</span></div>
    <div class="cap"><b>深图</b><span>生成封面、视觉参考和图像素材。</span></div>
    <div class="cap"><b>深视频</b><span>规划短片、分镜、镜头和视频任务。</span></div>
    <div class="cap"><b>工具调用</b><span>拆解任务、执行步骤、校验并导出结果。</span></div>
  </section>
  <section class="panel status" id="status">
    <div class="step"><span class="dot"></span><span>等待输入，点击生成方案后开始规划。</span></div>
  </section>
  <section class="panel">
    <label>结果预览</label>
    <div class="result" id="result">背景：${safeBackground}
风格：${safeVisual}

点击“生成方案”后，这里会生成适合该需求的移动端应用流程、输入项、能力调用和结果结构。</div>
  </section>
</main>
<script>
const run=document.getElementById('run');
const need=document.getElementById('need');
const mode=document.getElementById('mode');
const statusBox=document.getElementById('status');
const result=document.getElementById('result');
run.addEventListener('click',()=>{
  const value=need.value.trim()||'${safeTitle}';
  statusBox.innerHTML=[
    '<div class="step"><span class="dot"></span><span>分析需求与背景</span></div>',
    '<div class="step"><span class="dot"></span><span>选择 '+mode.value+' 能力路径</span></div>',
    '<div class="step"><span class="dot"></span><span>组织输入、任务状态和结果区</span></div>'
  ].join('');
  result.textContent='应用目标：'+value+'\\n\\n推荐交互：移动端工作台 + 分步骤任务流\\n\\n核心输入：用户目标、时间/素材/偏好、补充限制\\n\\n能力调用：根据任务自动选择搜索、深图、深视频或工具调用\\n\\n结果区：生成结果、可复制提示词、下一步优化建议、历史任务状态\\n\\n当前说明：iPolloOS 上游返回失败，本页面为本地降级版本。修复上游 403 后，可由 AI 自动生成更贴合需求的完整应用。';
});
</script>
</body>
</html>`;
}
