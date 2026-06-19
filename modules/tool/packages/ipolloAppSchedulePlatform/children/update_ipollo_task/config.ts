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
    '当用户明确要求修改、取消、完成某个任务时调用。工具会自动使用当前 iPollo App 和当前可信 App 用户。若用户要求新增/修改的子任务涉及 AI 可执行事项（如美股消息、研究、监控、资料整理、日报、复盘、代码修改测试、会前准备、会后纪要），必须先调用 discover_ipollo_published_agents 读取当前 App 已上线智能体，再把正向匹配的智能体写入子任务的 assigneeType/assigneeId/assigneeName。对于 agent 子任务，本工具会把该 agent 同步补到任务顶层 assignees，保证到点能被调度执行；如果没有正向匹配，不要编造智能体。',
  versionList: [
    {
      value: '1.4.6',
      description: '更新 iPollo App 任务，使用严格任务接口配置',
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
            'JSON：{title,content,goal,schedule,assignees,subtasks,attachments,status}。完成任务时可填 {"status":"completed"}。新增 AI 可执行子任务时，先调用 discover_ipollo_published_agents；把推荐智能体写入对应 subtask：{title,content,assigneeType:"agent",assigneeId,assigneeName}。若显式填写 assignees，也必须使用 discover 返回的智能体 ID；不要只写“自己”，也不要编造 ID。'
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
          valueType: WorkflowIOValueTypeEnum.string,
          key: 'app_card',
          label: 'APP 日程卡片 JSON'
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
