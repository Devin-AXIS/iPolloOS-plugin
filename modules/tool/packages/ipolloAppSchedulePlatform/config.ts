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
    '当用户明确要安排任务、提醒、日程、周期任务，或 Agent 需要读取当前用户任务列表时调用。创建任务前先做任务规划：把口语化描述改写为清晰标题、内容和目标，判断主任务和子任务分别适合当前用户、其他人还是已发布 AI。纯提醒、起床、吃饭、只记录一下等个人日程不要强行分配 AI；涉及见人、开会、研究、整理资料、监控、日报、复盘、会前准备、会后跟进、修改代码或测试时，必须先发现已发布智能体，读取 AI 名称、简介、能力和匹配理由，再拆出可执行子任务。插件会自动使用运行时当前 iPollo App、可信 App 用户与服务端内置日程接口。'
});
