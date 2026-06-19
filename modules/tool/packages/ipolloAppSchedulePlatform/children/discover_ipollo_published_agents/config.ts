import { defineTool } from '@tool/type';
import {
  FlowNodeInputTypeEnum,
  FlowNodeOutputTypeEnum,
  WorkflowIOValueTypeEnum
} from '@tool/type/ipolloos';

export default defineTool({
  name: { 'zh-CN': '发现 iPollo 已发布智能体', en: 'Discover published iPollo agents' },
  description: {
    'zh-CN': '从 FastGPT 已发布到 iPollo App 的智能体中查找适合当前任务的执行者。',
    en: 'Find suitable executors from FastGPT agents published to iPollo App.'
  },
  toolDescription:
    '当用户的日程/任务需要 AI 执行、协作或拆分子任务时，先调用本工具查找已发布智能体；只记录个人日程时不用调用。',
  versionList: [
    {
      value: '1.4.0',
      description: '发现已发布且可分配的 iPollo App 智能体',
      inputs: [
        {
          key: 'task_text',
          label: '任务描述',
          valueType: WorkflowIOValueTypeEnum.string,
          renderTypeList: [FlowNodeInputTypeEnum.reference, FlowNodeInputTypeEnum.textarea],
          required: true,
          toolDescription: '用户原始任务描述，用于匹配智能体能力。'
        },
        {
          key: 'limit',
          label: '返回数量',
          valueType: WorkflowIOValueTypeEnum.number,
          renderTypeList: [FlowNodeInputTypeEnum.numberInput],
          defaultValue: 10,
          toolDescription: '最多返回多少个候选智能体，默认 10。'
        },
        {
          key: 'exclude_current_agent',
          label: '排除当前智能体',
          valueType: WorkflowIOValueTypeEnum.boolean,
          renderTypeList: [FlowNodeInputTypeEnum.switch],
          defaultValue: true,
          toolDescription: '默认排除当前正在运行的 FastGPT Agent，避免把任务重新分配给自己。'
        }
      ],
      outputs: [
        { valueType: WorkflowIOValueTypeEnum.boolean, key: 'ok', label: '是否成功' },
        { valueType: WorkflowIOValueTypeEnum.string, key: 'agents_json', label: '智能体 JSON' },
        {
          valueType: WorkflowIOValueTypeEnum.string,
          key: 'agents_markdown',
          label: '智能体 Markdown'
        },
        {
          valueType: WorkflowIOValueTypeEnum.string,
          key: 'recommended_agent_id',
          label: '推荐智能体 ID'
        },
        {
          valueType: WorkflowIOValueTypeEnum.string,
          key: 'recommended_agent_name',
          label: '推荐智能体名称'
        },
        {
          valueType: WorkflowIOValueTypeEnum.string,
          key: 'recommended_assignees_json',
          label: '推荐执行人 JSON'
        },
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
