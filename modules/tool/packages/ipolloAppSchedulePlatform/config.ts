import { defineToolSet } from '@tool/type';
import { ToolTagEnum } from '@tool/type/tags';

export default defineToolSet({
  tags: [ToolTagEnum.enum.productivity],
  name: {
    'zh-CN': 'iPollo App 日程任务',
    en: 'iPollo App schedule tasks'
  },
  description: {
    'zh-CN':
      '让 iPolloOS Agent 和工作流通过插件创建、修改、查询 iPollo App 用户任务/日程。支持执行人、子任务、附件、一次性和重复规则。',
    en: 'Let iPolloOS agents and workflows create, update, and query iPollo App user tasks and schedules with assignees, subtasks, attachments, and recurrence.'
  },
  toolDescription:
    '当用户明确要安排任务、提醒、日程、周期任务，或 Agent 需要读取当前用户任务列表时调用。插件会自动使用运行时当前 iPollo App、可信 App 用户与服务端内置日程接口。'
});
