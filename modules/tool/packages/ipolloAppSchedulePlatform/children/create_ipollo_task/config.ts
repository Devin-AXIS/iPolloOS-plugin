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
    '当用户明确要求安排、提醒、定时执行某事时调用。工具会自动使用当前 iPollo App 和当前可信 App 用户；用户明确要求创建时直接创建，只有用户要求预览/确认时才设置 require_user_confirm=true。',
  versionList: [
    {
      value: '1.4.0',
      description: '创建 iPollo App 任务/日程，支持已发布智能体直分配',
      inputs: [
        {
          key: 'title',
          label: '任务标题',
          valueType: WorkflowIOValueTypeEnum.string,
          renderTypeList: [FlowNodeInputTypeEnum.reference, FlowNodeInputTypeEnum.input],
          required: true,
          toolDescription: '根据用户话术生成简短任务标题，必须填写。'
        },
        {
          key: 'content',
          label: '任务内容',
          valueType: WorkflowIOValueTypeEnum.string,
          renderTypeList: [FlowNodeInputTypeEnum.reference, FlowNodeInputTypeEnum.textarea],
          toolDescription: '可空；用户描述中的补充要求、会议地点、准备事项等。'
        },
        {
          key: 'goal',
          label: '任务目标',
          valueType: WorkflowIOValueTypeEnum.string,
          renderTypeList: [FlowNodeInputTypeEnum.reference, FlowNodeInputTypeEnum.textarea],
          toolDescription: '可空；任务完成后希望达成的目标。'
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
            'JSON 数组。需要 AI 执行时用 discover_ipollo_published_agents 的 recommended_assignees_json；只记录用户个人日程时留空。'
        },
        {
          key: 'subtasks_json',
          label: '子任务 JSON',
          valueType: WorkflowIOValueTypeEnum.string,
          renderTypeList: [FlowNodeInputTypeEnum.hidden],
          toolDescription:
            'JSON 数组。需要拆分执行步骤时填写，每项包含 title/content/assigneeType/assigneeId/assigneeName。'
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
