import { defineToolSet } from '@tool/type';
import { ToolTagEnum } from '@tool/type/tags';
import send_ipollo_push from './children/send_ipollo_push';

const icon = 'https://os.ipollo.net/system/plugin/tools/ipolloPushPlatform/logo';

export default defineToolSet({
  toolId: 'ipolloPushPlatform',
  tags: [ToolTagEnum.enum.productivity],
  icon,
  avatar: icon,
  children: [send_ipollo_push],
  name: {
    'zh-CN': 'iPollo 推送服务',
    en: 'iPollo Push Service'
  },
  description: {
    'zh-CN': '通过 iPollo App Agent Hook 推送监控、报告和事件更新。',
    en: 'Send monitor, report, and event updates through an iPollo App Agent Hook.'
  },
  toolDescription:
    '当工作流或 Agent 需要把监控结果、报告摘要、事件更新推送到 iPollo App 智能体聊天时调用。使用 App 里点击 Agent 名字复制出来的 Hook 地址。'
});
