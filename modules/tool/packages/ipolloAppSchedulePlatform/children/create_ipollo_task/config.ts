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
      value: '1.3.2',
      description: '创建 iPollo App 任务/日程，支持运行时身份兜底',
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
