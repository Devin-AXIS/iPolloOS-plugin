const DEFAULT_CAPABILITIES =
  'iPolloOS 应用已配置深图/图像生成与理解、深视频/视频生成与理解、网络搜索、工具调用与多步骤 Agent 编排能力。';

export function buildMobileAiServicePrompt(props: {
  userRequirement: string;
  serviceLanguage: string;
  background: string;
  visualPrompt: string;
  interactionMode: string;
  availableCapabilities?: string;
}): string {
  const capabilities = props.availableCapabilities?.trim() || DEFAULT_CAPABILITIES;
  return `你是移动端 AI 服务产品经理、交互设计师和前端工程师。请根据下面信息生成一个可直接发布的完整单文件 HTML 应用。

优先级最高：稳定完整输出。宁可页面精简，也必须完整闭合、可运行、以 </html> 结束。不要输出长篇说明，不要生成过长 CSS。

用户需求：
${props.userRequirement}

服务语言：
${props.serviceLanguage}

背景设定：
${props.background}

交互模式：
${props.interactionMode}

可用 Agent 能力：
${capabilities}

能力使用原则：
你正在调用的是一个已经配置好工具能力的 iPolloOS 应用。开发这个移动端应用时，要把这些能力当成产品能力底座，而不是普通文案素材：
- 需要实时资料、事实、趋势、案例、竞品、地点、人物、作品、品牌信息时，应设计成可使用网络搜索。
- 需要图片理解、图片生成、封面、海报、视觉参考、角色/场景图时，应设计成可使用深图能力。
- 需要短片、视频脚本、分镜、镜头、视频理解、视频生成或视频素材分析时，应设计成可使用深视频能力。
- 需要多步骤任务、资料收集、生成、校验、改写、导出时，应设计成可使用工具调用和 Agent 编排。
你不需要把所有能力都塞进页面；请根据用户需求自行判断哪些能力最有价值，并把它们自然融入应用交互。

视觉提示词：
${props.visualPrompt}

短输出稳定版要求：
1. 只输出完整 HTML 文档，不要输出 Markdown、解释文字或代码围栏。
2. 必须包含 <!DOCTYPE html>、<html>、<head>、<meta name="viewport">、<style>、<body>。
3. 移动端优先，手机宽度下可读、可点、无横向溢出。
4. 这是 AI 服务，不是普通静态落地页；具体交互形态、页面结构、流程密度和功能呈现都由你根据应用目标自行决定。
5. 你可以做成对话型，也可以做成任务型、生成器型、测算型、游戏型、视频/图像工作台型或混合形态；不要默认只能聊天。
6. 必须善用 iPolloOS 应用本身已经具备的 AI 与插件能力；不要生成一个与这些能力脱节的普通静态页面。
7. 必须开发功能性应用，而不是展示性页面：至少包含输入区、操作按钮、状态反馈、结果区域、空状态和下一步动作。
8. 控件必须可用：按钮点击后要更新状态或结果；表单要有基本提示；结果能查看/复制/继续优化。
9. 不要把真实 API Key 写入 HTML；如需表现接口调用，可用前端模拟状态、任务队列、结果卡片或提示词预览。
10. 允许内联 CSS 和少量原生 JS；不要依赖构建工具；外链资源必须可降级。
11. 返回给调用方时，最终答案必须包含完整 HTML；如果你的工作流有插件输出节点，优先把 HTML 放到 page_html 字段。

完整性硬约束：
1. 输出必须以 <!DOCTYPE html> 开始。
2. 输出必须以 </html> 结束。
3. 所有 CSS 花括号、HTML 标签、script 标签必须闭合。
4. CSS 控制在约 180 行以内；JavaScript 控制在约 120 行以内；不要生成大量重复样式。
5. 如果内容很多，减少文案和装饰，保留核心功能，确保最终 HTML 完整。
6. 最终输出前自检：最后必须是 </html>。`;
}

export { DEFAULT_CAPABILITIES };
