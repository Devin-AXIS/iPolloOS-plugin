import { defineToolSet } from '@tool/type';
import { ToolTagEnum } from '@tool/type/tags';

export default defineToolSet({
  tags: [ToolTagEnum.enum.productivity],
  name: {
    'zh-CN': 'Manus 智能体 API',
    en: 'Manus Agent API'
  },
  description: {
    'zh-CN':
      '封装 Manus Open API v2：任务与对话、项目与技能、Agent、连接器与在线浏览器、文件上传、用量与 Webhook、网站发布等（不含文档站「数据集成」类第三方产品）。对话 Agent 请在系统提示中粘贴 extras/iPolloOS-plugin-manus-platform/docs/agent-system-prompt.md 内段落，确保 reply_markdown 会进用户可见回复。',
    en: 'Manus Open API v2: tasks, projects, skills, agents, connectors, files, usage, webhooks, websites. For chat agents, paste the snippet from extras/iPolloOS-plugin-manus-platform/docs/agent-system-prompt.md into system prompt so reply_markdown is shown to users.'
  },
  toolDescription:
    'Paste reply_markdown when non-empty. Poll taskListMessages every ~8–15s or on user ask—not every reasoning step; do not loop taskDetail+listMessages. Chain: taskCreate → listMessages → sendMessage/confirmAction. manusApiKey once. See docs/agent-system-prompt.md.',
  courseUrl: 'https://open.manus.ai/docs/v2/introduction',
  secretInputConfig: [
    {
      key: 'manusApiKey',
      label: 'Manus API Key',
      description:
        'manus.im → Integration → Manus API。在 iPolloOS 应用/资源配置里绑定到本工具集（系统密钥），工作流节点无需重复填。',
      required: true,
      inputType: 'secret'
    },
    {
      key: 'baseUrl',
      label: 'API Base URL（可选）',
      description: '默认 https://api.manus.ai；自建网关可改。',
      required: false,
      inputType: 'input'
    }
  ]
});
