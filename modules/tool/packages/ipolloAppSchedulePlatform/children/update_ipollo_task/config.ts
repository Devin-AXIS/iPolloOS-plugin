import { defineTool } from '@tool/type';
import {
  FlowNodeInputTypeEnum,
  FlowNodeOutputTypeEnum,
  WorkflowIOValueTypeEnum
} from '@tool/type/ipolloos';

export default defineTool({
  name: { 'zh-CN': '更新 iPollo 任务', en: 'Update iPollo task' },
  description: {
    'zh-CN': '修改 iPollo App 任务内容、时间、执行人、子任务或状态。',
    en: 'Update an iPollo App task.'
  },
  toolDescription:
    '当用户明确要求修改、取消、完成某个任务时调用。工具会自动使用当前 iPollo App 和当前可信 App 用户。',
  versionList: [
    {
      value: '1.3.2',
      description: '更新 iPollo App 任务，支持运行时身份兜底',
      inputs: [
        {
          key: 'task_id',
          label: '任务 ID',
          valueType: WorkflowIOValueTypeEnum.string,
          renderTypeList: [FlowNodeInputTypeEnum.reference, FlowNodeInputTypeEnum.input],
          required: true,
          toolDescription: '要更新的任务 ID。若用户只说任务标题，应先查询任务列表确认 ID。'
        },
        {
          key: 'patch_json',
          label: '更新内容 JSON',
          valueType: WorkflowIOValueTypeEnum.string,
          renderTypeList: [FlowNodeInputTypeEnum.reference, FlowNodeInputTypeEnum.textarea],
          required: true,
          toolDescription:
            'JSON：{title,content,goal,schedule,assignees,subtasks,attachments,status}。完成任务时可填 {"status":"completed"}。'
        },
        {
          key: 'require_user_confirm',
          label: '需要用户确认',
          valueType: WorkflowIOValueTypeEnum.boolean,
          renderTypeList: [FlowNodeInputTypeEnum.switch],
          defaultValue: false,
          toolDescription: '用户明确要求修改/完成时设为 false；用户要求先确认、预览时设为 true。'
        }
      ],
      outputs: [
        { valueType: WorkflowIOValueTypeEnum.boolean, key: 'ok', label: '是否成功' },
        { valueType: WorkflowIOValueTypeEnum.string, key: 'action_json', label: '动作 JSON' },
        {
          valueType: WorkflowIOValueTypeEnum.string,
          key: 'confirm_card_json',
          label: '确认卡片 JSON'
        },
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
