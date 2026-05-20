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
- 优先匹配内容最终形态：演示文稿选 slides，数据看板选 dashboard/data，营销页选 prototype/poster/card。
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
3. 仅根据旧内容与新内容的差异替换或调整对应文字、数据和 DOM。
4. 如果新内容增加条目，沿用原有卡片、行、slide 或章节结构添加。
5. 如果删除条目，移除对应元素。
6. 不要捏造数据。
${props.extraRequirements?.trim() ? `\n【额外要求】:\n${props.extraRequirements.trim()}\n` : ''}
【旧内容】:
${props.oldContent.trim()}

【新内容】:
${props.newContent.trim()}

【已有 HTML】:
${props.oldHtml.trim()}
`;
}
