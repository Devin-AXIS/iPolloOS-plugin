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
    '当用户的日程/任务可能需要 AI 执行、协作、研究、监控、资料整理、摘要生成、会前准备、会后纪要、复盘或定时产出时，必须先调用本工具查找当前 iPollo App 已发布且可分配的智能体，再根据返回的 AI 名称、简介、能力和匹配理由判断“这件事适合谁做”。本工具会先查 FastGPT 发布索引；若没有正向匹配，会兜底读取当前 iPollo App 已上线 Agent 列表。用户明确只要提醒、只记录个人时间、起床、吃饭、运动等纯个人日程时不用调用。不要为了展示效果强行发现智能体；只有 AI 子任务能服务用户原始目的且存在正向匹配智能体时才分配。',
  versionList: [
    {
      value: '1.4.6',
      description: '发现已发布且可分配的 iPollo App 智能体',
      inputs: [
        {
          key: 'task_text',
          label: '任务描述',
          valueType: WorkflowIOValueTypeEnum.string,
          renderTypeList: [FlowNodeInputTypeEnum.reference, FlowNodeInputTypeEnum.textarea],
          required: true,
          toolDescription:
            '用户原始任务描述 + 你规划出的 AI 可辅助事项，用于按已发布 AI 的名称、简介和能力匹配执行者。例如：见某人前收集背景资料、会议后整理纪要、每天监控特斯拉新闻并摘要、修改页面代码并测试。'
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
          toolDescription:
            '默认排除当前正在运行的 FastGPT Agent，避免把日程助手自己的任务重新分配给自己；除非用户明确要当前智能体也作为执行者。'
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
