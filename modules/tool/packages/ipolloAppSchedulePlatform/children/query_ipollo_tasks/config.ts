import { defineTool } from '@tool/type';
import {
  FlowNodeInputTypeEnum,
  FlowNodeOutputTypeEnum,
  WorkflowIOValueTypeEnum
} from '@tool/type/ipolloos';

export default defineTool({
  name: { 'zh-CN': '查询 iPollo 任务', en: 'Query iPollo tasks' },
  description: {
    'zh-CN': '查询当前用户在 iPollo App 中的任务/日程。',
    en: 'Query iPollo App tasks for the current user.'
  },
  toolDescription:
    '当用户问今天/明天/某 Agent 有哪些任务，或 Agent 执行前需要读取任务列表时调用。工具会自动使用当前 iPollo App 和当前可信 App 用户。',
  versionList: [
    {
      value: '1.4.0',
      description: '查询 iPollo App 任务，使用严格任务接口配置',
      inputs: [
        {
          key: 'from',
          label: '开始时间',
          valueType: WorkflowIOValueTypeEnum.string,
          renderTypeList: [FlowNodeInputTypeEnum.reference, FlowNodeInputTypeEnum.input],
          toolDescription:
            '查询开始时间，使用 ISO 字符串；例如今天 00:00 对应 2026-06-07T00:00:00+08:00。'
        },
        {
          key: 'to',
          label: '结束时间',
          valueType: WorkflowIOValueTypeEnum.string,
          renderTypeList: [FlowNodeInputTypeEnum.reference, FlowNodeInputTypeEnum.input],
          toolDescription:
            '查询结束时间，使用 ISO 字符串；例如今天结束对应 2026-06-07T23:59:59+08:00。'
        },
        {
          key: 'status',
          label: '状态',
          valueType: WorkflowIOValueTypeEnum.string,
          renderTypeList: [FlowNodeInputTypeEnum.reference, FlowNodeInputTypeEnum.input],
          toolDescription: '可空；需要过滤状态时填写 pending、running、completed 或 cancelled。'
        },
        {
          key: 'include_completed',
          label: '包含已完成',
          valueType: WorkflowIOValueTypeEnum.boolean,
          renderTypeList: [FlowNodeInputTypeEnum.switch],
          defaultValue: false,
          toolDescription: '用户明确要求查看已完成任务时设为 true，否则设为 false。'
        },
        {
          key: 'limit',
          label: '数量',
          valueType: WorkflowIOValueTypeEnum.number,
          renderTypeList: [FlowNodeInputTypeEnum.numberInput],
          defaultValue: 20,
          toolDescription: '最多返回多少条，默认 20。'
        }
      ],
      outputs: [
        { valueType: WorkflowIOValueTypeEnum.boolean, key: 'ok', label: '是否成功' },
        { valueType: WorkflowIOValueTypeEnum.string, key: 'tasks_json', label: '任务 JSON' },
        {
          valueType: WorkflowIOValueTypeEnum.string,
          key: 'tasks_markdown',
          label: '任务 Markdown'
        },
        { valueType: WorkflowIOValueTypeEnum.string, key: 'action_json', label: '动作 JSON' },
        { valueType: WorkflowIOValueTypeEnum.number, key: 'count', label: '数量' },
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
