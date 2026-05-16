import { defineTool } from '@tool/type';
import {
  FlowNodeInputTypeEnum,
  FlowNodeOutputTypeEnum,
  WorkflowIOValueTypeEnum
} from '@tool/type/ipolloos';

export default defineTool({
  name: {
    'zh-CN': 'Manus 发送消息',
    en: 'Manus Send Message'
  },
  description: {
    'zh-CN': '调用 task.sendMessage，对现有任务追加指令或回复 agent 的用户提问。',
    en: 'POST /v2/task.sendMessage — follow-up message or reply when agent asks.'
  },
  toolDescription:
    'iPolloOS: follow-up or reply when agent asks the user (messageAskUser). Reference task_id from taskCreate/listMessages; map `content` from chat/user input. Not for browser/confirm waits — use taskConfirmAction.',
  versionList: [
    {
      value: '1.0.0',
      description: 'Initial',
      inputs: [
        {
          key: 'taskId',
          label: 'Task ID',
          valueType: WorkflowIOValueTypeEnum.string,
          renderTypeList: [FlowNodeInputTypeEnum.reference, FlowNodeInputTypeEnum.input],
          required: true
        },
        {
          key: 'content',
          label: '消息内容',
          valueType: WorkflowIOValueTypeEnum.string,
          renderTypeList: [FlowNodeInputTypeEnum.reference, FlowNodeInputTypeEnum.textarea],
          required: true
        },
        {
          key: 'agentProfile',
          label: '本轮 Agent profile（可选，空则保持任务当前）',
          valueType: WorkflowIOValueTypeEnum.string,
          renderTypeList: [FlowNodeInputTypeEnum.select, FlowNodeInputTypeEnum.input],
          list: [
            { label: '(keep current)', value: '' },
            { label: 'manus-1.6', value: 'manus-1.6' },
            { label: 'manus-1.6-lite', value: 'manus-1.6-lite' },
            { label: 'manus-1.6-max', value: 'manus-1.6-max' }
          ]
        },
        {
          key: 'connectorsCsv',
          label: 'Connectors（逗号分隔）',
          valueType: WorkflowIOValueTypeEnum.string,
          renderTypeList: [FlowNodeInputTypeEnum.reference, FlowNodeInputTypeEnum.textarea]
        },
        {
          key: 'enableSkillsCsv',
          label: 'enable_skills（逗号分隔）',
          valueType: WorkflowIOValueTypeEnum.string,
          renderTypeList: [FlowNodeInputTypeEnum.reference, FlowNodeInputTypeEnum.textarea]
        },
        {
          key: 'forceSkillsCsv',
          label: 'force_skills（逗号分隔）',
          valueType: WorkflowIOValueTypeEnum.string,
          renderTypeList: [FlowNodeInputTypeEnum.reference, FlowNodeInputTypeEnum.textarea]
        },
        {
          key: 'structuredOutputSchemaJson',
          label: 'structured_output_schema（JSON，可选）',
          valueType: WorkflowIOValueTypeEnum.string,
          renderTypeList: [FlowNodeInputTypeEnum.reference, FlowNodeInputTypeEnum.JSONEditor]
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
          type: FlowNodeOutputTypeEnum.error,
          valueType: WorkflowIOValueTypeEnum.string,
          key: 'system_error',
          label: '错误信息'
        }
      ]
    }
  ]
});
