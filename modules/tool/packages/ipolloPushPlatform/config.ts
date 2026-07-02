import { defineToolSet } from '@tool/type';
import { ToolTagEnum } from '@tool/type/tags';

export default defineToolSet({
  tags: [ToolTagEnum.enum.productivity],
  name: {
    'zh-CN': 'iPollo 推送服务',
    en: 'iPollo Push Service'
  },
  description: {
    'zh-CN': '向 iPollo App 智能体订阅层推送监控、报告和事件更新。',
    en: 'Send monitor, report, and event updates to the iPollo App Agent subscription layer.'
  },
  toolDescription:
    '当工作流或 Agent 需要把监控结果、报告摘要、事件更新推送到 iPollo App 智能体订阅/监控层时调用。默认使用运行时 App/Agent 身份；旧 Hook 地址仅作为兼容输入。'
});
