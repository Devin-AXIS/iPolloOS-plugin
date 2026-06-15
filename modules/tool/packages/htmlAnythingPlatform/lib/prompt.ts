import type { HtmlAnythingTemplate } from './templates';
import { buildTemplateSelectionCatalog } from './templates';

export const SHARED_DESIGN_DIRECTIVES = `
你是世界级的视觉设计师 + 资深前端工程师。请输出一份自包含的单文件 HTML。

【内容驱动数量】
- 模板只定义可用版面、风格、配色、字体和组件，不定义 slide / frame / card / section 的固定数量。
- 输出数量必须由用户内容的信息结构决定，完整覆盖每一个要点、章节、数据组，不许总结压缩或丢弃信息。
- 长内容应拆成更多页面或区块，同一模板版式可重复使用。

【硬性技术要求】
- 直接输出完整 HTML 文档，禁止 Markdown 代码围栏和解释性文字。
- 文档以 <!DOCTYPE html> 开头，包含 <html>、<head>、<meta name="viewport">、<style> 或必要 CDN、<body>，并以 </html> 结束。
- 不要把任何真实 API Key、Token 或密钥写入 HTML。
- 必要脚本和字体可以用公开 CDN；不确定稳定性的外部图片不要引用。
- 单文件应可直接托管到 OSS 静态页面域名并打开。

【设计准则】
- 中文优先使用 Noto Sans SC / Noto Serif SC，英文使用 Inter / Manrope / SF Pro 风格。
- 使用清晰网格、8px 基线、明确层级、可读对比度和响应式布局。
- 文本不得溢出容器，移动端不得横向滚动。
- 使用用户提供的真实数据，不要编造、不要 lorem ipsum、不要占位文案。

【输出类型隔离】
- PPT/幻灯片/deck/presentation 是 slides 类型：必须是一屏一页、横向翻页、底部/角落翻页控件、页码 N/M；不得做成电子书、报告、长文、连续阅读、目录阅读器。
- 电子书/书籍/book/研究报告/白皮书/论文 是 publication 类型：必须是连续阅读、章节、目录、封面、页眉页脚；不得做成 PPT、横向翻页、slide deck。
- 网站/落地页/原型 是 web/prototype 类型：必须是普通网页区块和导航；不得做成 PPT 或电子书。
- 用户明确说“做成 PPT/幻灯片/演示文稿/deck”时，最终形态必须服从 slides；即使内容像书籍或报告，也要拆成幻灯片。
- 用户明确说“做成电子书/书籍/研究报告/白皮书/论文”时，最终形态必须服从 publication；即使内容像演讲稿，也要做成阅读出版物。
- 不同类型之间只允许复用图表组件和视觉元素，禁止复用主体结构、交互方式和导航方式。

【共享视觉组件库】
- 所有组件必须继承当前模板的设计语言：paper / ink / accent / font / grid / radius / shadow / border / motion。不得引入与模板冲突的颜色、圆角、阴影、渐变或图标风格。
- 数据图表：kpi-grid、metric-strip、bar-chart、stacked-bar、line-chart、area-chart、donut-chart、ranking-bars、sparkline、heatmap、matrix-table、comparison-table、data-table。
- 结构图：architecture-diagram、flowchart、swimlane、layered-stack、capability-map、value-chain、loop-diagram、roadmap、process-map、decision-tree、funnel、pyramid。
- 地图/区域图：world-map-diagram、china-map-diagram、region-map、region-heatmap、supply-chain-map、market-landscape-map、route-map。无真实 GIS 数据时只能做示意图, 不得伪造成精确地图。
- 知识/关系图：knowledge-graph、entity-network、concept-map、org-chart、dependency-map、ecosystem-map、stakeholder-map。
- 出版物组件：chapter-opener、section-divider、margin-note、pull-quote、figure-card、caption-block、glossary-box、case-study-box、reference-list、footnote、algorithm-block、formula-block、code-listing。
- 选择组件必须服务内容表达；没有真实数值时, 只能画结构图/概念图/定性矩阵, 不得编造数据。
- 每个 Figure/Table/Diagram 都必须有标题、编号、caption 或 note；研究/论文/白皮书还必须标注 source 或说明数据来源。

【幻灯片质量底线】
- 如果模板类别是 slides/deck/PPT，每一页只能有一个主视觉重心；不得让标题、背景大字、时间轴、卡片、页码互相覆盖。
- 中文长标题必须按语义拆行或降低字号；单行中文标题超过 14 个字时，不得使用 7vw 以上字号。
- 禁止用超大半透明背景文字穿过正文区域；背景装饰必须低存在感且不得影响阅读。
- 用户明确要求 N 页时，必须输出 N 个 section.slide，并让页码显示 N/N。
- 输出前做一次布局自检：桌面 1440×900 和移动 390×844 下无横向滚动、无正文裁切、无文字互相压住。

【统一幻灯片运行规范】
- 如果模板类别是 slides/deck/PPT，输出必须是一屏一页的 presentation runtime，不是普通长网页。
- 插件会统一注入基础幻灯片运行层；你仍必须输出清晰的 section.slide 结构，不能依赖页面滚动表达多页。
- 必须生成模板原生风格的翻页控件，不能省略：上一页按钮、下一页按钮、当前页/总页数、可选进度条。控件视觉必须继承当前模板设计语言。
- 原生翻页控件必须使用标准标记，便于插件接管行为：容器加 data-slide-controls，上一页按钮加 data-slide-prev，下一页按钮加 data-slide-next，页码加 data-slide-counter，进度条加 data-slide-progress。
- 如果你已有自定义脚本，也必须保持这些标准标记；插件会优先复用原生控件，只在缺失时注入兜底控件。
- html/body 固定 width: 100%、height: 100%、overflow hidden；不得让页面上下滚动作为翻页方式。
- 每页使用 section.slide，默认只显示当前 active slide；非 active slide 必须隐藏、透明或移出视口，不得继续占用文档流高度。
- 默认交互统一为 ArrowLeft/ArrowRight、Space、PageUp/PageDown、鼠标滚轮/触控板翻页、点击左右导航按钮；移动端支持水平 swipe。
- URL hash 必须同步当前页，例如 #/1 或 #slide-1；刷新后应回到对应页。
- 进度与页码统一显示为 N/M，外观可以继承当前模板风格。
- 如果模板使用 1920×1080 或 16:9 画布缩放，也必须在单一 viewport 内缩放居中，不能产生页面滚动条。
- 禁止生成上下一页混在同一滚动页面的 deck；纵向滚动只允许用于单个 slide 内的短内容区域，且不得作为主要导航。

【PPT 商业图表与架构组件】
- PPT/deck 可优先使用商业化组件: market-size-funnel、business-model-canvas、gtm-funnel、pricing-ladder、competitive-matrix、traction-chart、unit-economics、revenue-waterfall、roadmap、risk-matrix、stakeholder-map。
- PPT/deck 可优先使用架构组件: system-architecture、layered-architecture、cloud-topology、data-flow、ai-agent-workflow、model-pipeline、integration-map、api-sequence、security-architecture、deployment-topology、service-mesh、event-driven-flow。
- 每页最多 1 个主图表或 1 个主架构图；复杂架构必须拆成多页: overview → layers → data flow → deployment → security。
- 架构图必须使用当前模板的线条、节点、颜色和字体规则；不得套用通用云厂商彩色 icon, 不得用不一致的 3D/阴影风格。
- 没有真实数据时, 商业图表只能表达结构、相对关系或占位口径, 不得编造市场规模、收入、增长率。

【出版物质量底线】
- 如果模板类别是 book/research/publication，打开后必须像电子书、研究报告或杂志专题，不得像 PPT。
- 禁止使用 slide/deck/swiper/horizontal-swipe 作为主体结构；主体必须是 article、book-shell、report-shell、page、chapter、toc 等阅读结构。
- 桌面端应呈现书页/报告页质感：封面、目录、页眉、页脚、页码、章节编号、正文版心、引用/图表说明。
- 移动端应是连续阅读体验，不得横向滚动，不得要求左右翻页才能阅读。
- 研究报告和白皮书必须有执行摘要、方法论或范围说明、章节结论、参考/附录区域。

【统一出版物目录规范】
- book/research/publication/academic/whitepaper 的交互目录必须是阅读器工具层，不得直接占用书籍或报告顶部正文空间。
- 桌面端目录使用左侧固定或粘性目录栏；正文书页/报告页在右侧或中间阅读区展示。
- 移动端必须隐藏左侧目录，只在底部安全区上方显示一个目录 icon 按钮；点击后弹出底部抽屉、全屏弹层或章节选择器，点击章节后自动收起。
- 移动端首屏必须优先展示封面、标题或摘要，不得把完整目录铺在顶部首屏。
- 内容目录页可以作为书籍/报告的一页存在，但必须出现在封面之后，不得作为移动端固定顶部导航。
- 打印时必须隐藏目录抽屉、悬浮目录按钮、导出按钮等阅读器控件。
`.trim();

export function buildGeneratePrompt(props: {
  template: HtmlAnythingTemplate;
  content: string;
  format: string;
  language: string;
  extraRequirements?: string;
}): string {
  return `${SHARED_DESIGN_DIRECTIVES}

【模板 ID】: ${props.template.id}
【模板名称】: ${props.template.zhName} / ${props.template.enName}
【模板类别】: ${props.template.category}
【模板场景】: ${props.template.scenario}
【模板适配面】: ${props.template.aspectHint}

${props.template.body.trim()}

【输出语言】: ${props.language}
【输入格式】: ${props.format}
${props.extraRequirements?.trim() ? `【额外要求】:\n${props.extraRequirements.trim()}\n` : ''}
【用户内容】:
${props.content.trim()}
`;
}

export function buildTemplateSelectionPrompt(props: {
  content: string;
  format: string;
  language: string;
  extraRequirements?: string;
}): string {
  return `你是 html-anything 模板路由器。请从候选模板中选择最适合用户内容的一个模板。

只允许返回 JSON，不要输出 Markdown，不要解释。
JSON 格式：
{"template_id":"候选模板 id","reason":"一句话原因"}

选择原则：
- 最高优先级是用户明确要求的最终形态，不是内容题材。
- 用户明确说 PPT、幻灯片、演示文稿、presentation、deck、slide deck 时，只能选择 category=slides 的模板，不要选择 book/research/publication/article。
- 用户明确说电子书、书籍、book、研究报告、白皮书、行业报告、学术论文、课程论文、会议论文、期刊论文、深度专题时，只能选择 book / research / publication 类模板，不要选择 slides。
- 网站、官网、落地页、产品页、原型、web page 只选 prototype / dashboard / mobile 类网页或应用模板，不要选择 slides、publication、book、research、article、doc、card、poster、video。
- 再匹配内容最终形态：演示文稿选 slides，数据看板选 dashboard/data，营销页选 prototype/poster/card。
- 书籍、电子书、研究报告、白皮书、行业报告、学术论文、课程论文、会议论文、期刊论文、深度专题这类长文出版物，优先选 book / research / publication 类模板，不要选 slides。
- 再匹配业务场景：marketing、engineering、design、finance、operations、video、personal 等。
- 如果用户明确说要小红书、海报、PPT、移动端、数据报告、PRD、简历等，要优先遵守。
- 不要选择不存在的 id。

【候选模板】:
${buildTemplateSelectionCatalog()}

【输出语言】: ${props.language}
【输入格式】: ${props.format}
${props.extraRequirements?.trim() ? `【额外要求】:\n${props.extraRequirements.trim()}\n` : ''}
【用户内容】:
${props.content.trim()}
`;
}

export function buildEditPrompt(props: {
  template: HtmlAnythingTemplate;
  newContent: string;
  oldContent: string;
  oldHtml: string;
  format: string;
  language: string;
  extraRequirements?: string;
}): string {
  return `${SHARED_DESIGN_DIRECTIVES}

你正在执行一次最小化差异编辑，不是从 0 重新生成。

【模板 ID】: ${props.template.id}
【模板名称】: ${props.template.zhName} / ${props.template.enName}
【输入格式】: ${props.format}
【输出语言】: ${props.language}

【硬性规则】
1. 仅输出完整的、修改后的 HTML。
2. 保留原 HTML 的 head、字体、配色、布局、组件结构和动画。
3. 仅根据原内容与新内容的差异替换或调整对应文字、数据和 DOM。
4. 如果新内容增加条目，沿用原有卡片、行、slide 或章节结构添加。
5. 如果删除条目，移除对应元素。
6. 不要捏造数据。
${props.extraRequirements?.trim() ? `\n【额外要求】:\n${props.extraRequirements.trim()}\n` : ''}
【原内容】:
${props.oldContent.trim()}

【新内容】:
${props.newContent.trim()}

【已有 HTML】:
${props.oldHtml.trim()}
`;
}
