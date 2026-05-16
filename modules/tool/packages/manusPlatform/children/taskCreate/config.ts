import { defineTool } from '@tool/type';
import {
  FlowNodeInputTypeEnum,
  FlowNodeOutputTypeEnum,
  WorkflowIOValueTypeEnum
} from '@tool/type/ipolloos';

export default defineTool({
  name: {
    'zh-CN': 'Manus 创建任务',
    en: 'Manus Create Task'
  },
  description: {
    'zh-CN':
      '调用 task.create 提交首条指令，任务异步运行；可通过 task.detail / task.listMessages 轮询。',
    en: 'POST /v2/task.create — asynchronous task with first message; poll task.detail or task.listMessages.'
  },
  toolDescription:
    'iPolloOS: first step — map `prompt` from user; wire `task_id` to taskListMessages (then paste reply_markdown to user if non-empty; see toolset docs/agent-system-prompt.md). Async; poll until stopped/waiting.',
  versionList: [
    {
      value: '1.0.0',
      description: 'Initial',
      inputs: [
        {
          key: 'prompt',
          label: '首条指令 / 用户需求',
          valueType: WorkflowIOValueTypeEnum.string,
          renderTypeList: [FlowNodeInputTypeEnum.reference, FlowNodeInputTypeEnum.textarea],
          required: true,
          toolDescription: 'Plain-text first message (`message.content`).'
        },
        {
          key: 'projectId',
          label: 'Project ID（可选）',
          valueType: WorkflowIOValueTypeEnum.string,
          renderTypeList: [FlowNodeInputTypeEnum.reference, FlowNodeInputTypeEnum.input],
          toolDescription: 'Associate with project; inherits project instructions.'
        },
        {
          key: 'locale',
          label: '语言区域（可选）',
          valueType: WorkflowIOValueTypeEnum.string,
          renderTypeList: [FlowNodeInputTypeEnum.reference, FlowNodeInputTypeEnum.input],
          toolDescription: 'e.g. en, zh-CN, ja.'
        },
        {
          key: 'title',
          label: '任务标题（可选）',
          valueType: WorkflowIOValueTypeEnum.string,
          renderTypeList: [FlowNodeInputTypeEnum.reference, FlowNodeInputTypeEnum.input]
        },
        {
          key: 'interactiveMode',
          label: 'Interactive mode',
          valueType: WorkflowIOValueTypeEnum.boolean,
          renderTypeList: [FlowNodeInputTypeEnum.switch],
          defaultValue: false,
          toolDescription: 'Agent may ask follow-up questions when enabled.'
        },
        {
          key: 'hideInTaskList',
          label: '在 Manus Web 列表隐藏',
          valueType: WorkflowIOValueTypeEnum.boolean,
          renderTypeList: [FlowNodeInputTypeEnum.switch],
          defaultValue: false
        },
        {
          key: 'shareVisibility',
          label: '分享可见性',
          valueType: WorkflowIOValueTypeEnum.string,
          renderTypeList: [FlowNodeInputTypeEnum.select, FlowNodeInputTypeEnum.input],
          defaultValue: 'private',
          list: [
            { label: 'private', value: 'private' },
            { label: 'team', value: 'team' },
            { label: 'public', value: 'public' }
          ]
        },
        {
          key: 'agentProfile',
          label: 'Agent profile',
          valueType: WorkflowIOValueTypeEnum.string,
          renderTypeList: [FlowNodeInputTypeEnum.select, FlowNodeInputTypeEnum.input],
          defaultValue: 'manus-1.6',
          list: [
            { label: 'manus-1.6', value: 'manus-1.6' },
            { label: 'manus-1.6-lite', value: 'manus-1.6-lite' },
            { label: 'manus-1.6-max', value: 'manus-1.6-max' }
          ]
        },
        {
          key: 'connectorsCsv',
          label: 'Connectors（逗号分隔 ID）',
          valueType: WorkflowIOValueTypeEnum.string,
          renderTypeList: [FlowNodeInputTypeEnum.reference, FlowNodeInputTypeEnum.textarea],
          toolDescription: 'Maps to message.connectors'
        },
        {
          key: 'enableSkillsCsv',
          label: 'enable_skills（逗号分隔）',
          valueType: WorkflowIOValueTypeEnum.string,
          renderTypeList: [FlowNodeInputTypeEnum.reference, FlowNodeInputTypeEnum.textarea],
          toolDescription: 'skill.list → IDs'
        },
        {
          key: 'forceSkillsCsv',
          label: 'force_skills（逗号分隔）',
          valueType: WorkflowIOValueTypeEnum.string,
          renderTypeList: [FlowNodeInputTypeEnum.reference, FlowNodeInputTypeEnum.textarea]
        },
        {
          key: 'structuredOutputSchemaJson',
          label: 'structured_output_schema（JSON 字符串）',
          valueType: WorkflowIOValueTypeEnum.string,
          renderTypeList: [FlowNodeInputTypeEnum.reference, FlowNodeInputTypeEnum.JSONEditor],
          toolDescription: 'See Structured Output docs; must satisfy JSON subset rules.'
        }
      ],
      outputs: [
        {
          valueType: WorkflowIOValueTypeEnum.string,
          key: 'summary',
          label: '摘要'
        },
        {
          valueType: WorkflowIOValueTypeEnum.string,
          key: 'detail_json',
          label: '完整响应 JSON'
        },
        {
          valueType: WorkflowIOValueTypeEnum.string,
          key: 'task_id',
          label: 'Task ID'
        },
        {
          valueType: WorkflowIOValueTypeEnum.string,
          key: 'task_url',
          label: 'Manus Web 链接'
        },
        {
          type: FlowNodeOutputTypeEnum.error,
          valueType: WorkflowIOValueTypeEnum.string,
          key: 'system_error',
          label: '错误信息'
        }
      ]
    }
  ]
});
