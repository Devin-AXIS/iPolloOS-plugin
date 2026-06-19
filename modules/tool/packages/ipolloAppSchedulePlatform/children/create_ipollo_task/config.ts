import { defineTool } from '@tool/type';
import {
  FlowNodeInputTypeEnum,
  FlowNodeOutputTypeEnum,
  WorkflowIOValueTypeEnum
} from '@tool/type/ipolloos';

export default defineTool({
  name: {
    'zh-CN': '创建 iPollo 任务',
    en: 'Create iPollo task'
  },
  description: {
    'zh-CN': '为当前 iPollo App 用户创建任务/日程，支持一次性和重复规则。',
    en: 'Create a task/schedule for the current iPollo App user with one-time and recurring schedules.'
  },
  toolDescription:
    '当用户明确要求安排、提醒、定时执行某事时调用。调用前必须先完成任务规划：把用户口语改写成清晰 title/content/goal，判断是纯个人日程还是 AI 可辅助任务，并决定主任务和子任务分别适合当前用户、其他人还是已发布 AI。纯提醒、起床、吃饭、只记录时间等个人日程不要强行加 AI；涉及见人、开会、研究、监控、整理资料、日报、复盘、会前准备、会后跟进、修改代码或测试时，必须先调用 discover_ipollo_published_agents，读取返回 AI 的名称/简介/能力和匹配理由，再把正向匹配的 AI 可执行部分写入子任务。工具会自动使用当前 iPollo App 和当前可信 App 用户；用户明确要求创建时直接创建，只有用户要求预览/确认时才设置 require_user_confirm=true。',
  versionList: [
    {
      value: '1.4.6',
      description: '创建 iPollo App 任务/日程，支持已发布智能体直分配',
      inputs: [
        {
          key: 'title',
          label: '任务标题',
          valueType: WorkflowIOValueTypeEnum.string,
          renderTypeList: [FlowNodeInputTypeEnum.reference, FlowNodeInputTypeEnum.input],
          required: true,
          toolDescription:
            '根据用户话术生成简短、可执行、可在日程列表直接识别的任务标题。不要照抄长口语；例如“明天下午3点见张三聊合作”可写为“见张三聊合作”。'
        },
        {
          key: 'content',
          label: '任务内容',
          valueType: WorkflowIOValueTypeEnum.string,
          renderTypeList: [FlowNodeInputTypeEnum.reference, FlowNodeInputTypeEnum.textarea],
          toolDescription:
            '可空；写清用户原始目的、地点、对象、背景、准备事项和需要提醒的上下文。若任务有 AI 子任务，content 应说明主任务背景，不要只写“提醒我”。'
        },
        {
          key: 'goal',
          label: '任务目标',
          valueType: WorkflowIOValueTypeEnum.string,
          renderTypeList: [FlowNodeInputTypeEnum.reference, FlowNodeInputTypeEnum.textarea],
          toolDescription:
            '可空；写任务完成后希望达成的结果。例如“准时参会并提前拿到对方背景资料”“每天获得特斯拉新闻摘要”。'
        },
        {
          key: 'schedule_json',
          label: '时间规则 JSON',
          valueType: WorkflowIOValueTypeEnum.string,
          renderTypeList: [FlowNodeInputTypeEnum.reference, FlowNodeInputTypeEnum.textarea],
          toolDescription:
            'JSON：{mode, timezone, dueAt, startAt, endAt, repeatRule}。mode 可为 none/once/recurring/range。'
        },
        {
          key: 'assignees_json',
          label: '执行人 JSON',
          valueType: WorkflowIOValueTypeEnum.string,
          renderTypeList: [FlowNodeInputTypeEnum.hidden],
          toolDescription:
            'JSON 数组。只记录个人日程时留空，工具会自动把当前可信 App 用户作为 owner。需要 AI 协助时，先调用 discover_ipollo_published_agents，读取推荐智能体的名称、简介、能力和匹配理由，再把正向匹配的智能体作为 executor/coordinator 放入此字段；工具仍会自动补当前用户 owner，形成“用户总负责人 + AI 执行部分子任务”。不要编造用户 ID 或智能体 ID；如果没有正向匹配智能体，不要硬分配。'
        },
        {
          key: 'subtasks_json',
          label: '子任务 JSON',
          valueType: WorkflowIOValueTypeEnum.string,
          renderTypeList: [FlowNodeInputTypeEnum.hidden],
          toolDescription:
            'JSON 数组。只有当拆分能服务用户原始目的时填写；不要为了卡片好看乱拆。个人提醒可留空。AI 可辅助任务应拆成少量明确子任务，每项包含 title/content/assigneeType/assigneeId/assigneeName；例如会前收集对方背景、生成会议问题清单、会后整理纪要、定时监控并摘要、修改代码并测试。子任务分配给 AI 时必须使用 discover_ipollo_published_agents 返回且正向匹配的智能体 ID。'
        },
        {
          key: 'attachments_json',
          label: '附件 JSON',
          valueType: WorkflowIOValueTypeEnum.string,
          renderTypeList: [FlowNodeInputTypeEnum.hidden],
          toolDescription: 'JSON 数组。需要把上下文、原始语音文本、工具结果等附加给任务时填写。'
        },
        {
          key: 'require_user_confirm',
          label: '需要用户确认',
          valueType: WorkflowIOValueTypeEnum.boolean,
          renderTypeList: [FlowNodeInputTypeEnum.switch],
          defaultValue: false,
          toolDescription:
            '用户只是要求创建/安排时设为 false；用户要求先确认、预览、草稿时设为 true。'
        }
      ],
      outputs: [
        { valueType: WorkflowIOValueTypeEnum.boolean, key: 'ok', label: '是否成功' },
        { valueType: WorkflowIOValueTypeEnum.string, key: 'task_id', label: '任务 ID' },
        { valueType: WorkflowIOValueTypeEnum.string, key: 'task_json', label: '任务 JSON' },
        {
          valueType: WorkflowIOValueTypeEnum.string,
          key: 'execution_packages_json',
          label: '执行包 JSON'
        },
        {
          valueType: WorkflowIOValueTypeEnum.string,
          key: 'confirm_card_json',
          label: '确认卡片 JSON'
        },
        {
          valueType: WorkflowIOValueTypeEnum.string,
          key: 'app_card',
          label: 'APP 日程卡片 JSON'
        },
        { valueType: WorkflowIOValueTypeEnum.string, key: 'action_json', label: '动作 JSON' },
        {
          type: FlowNodeOutputTypeEnum.error,
          valueType: WorkflowIOValueTypeEnum.string,
          key: 'system_error',
          label: '错误'
        }
      ]
    }
  ]
});
