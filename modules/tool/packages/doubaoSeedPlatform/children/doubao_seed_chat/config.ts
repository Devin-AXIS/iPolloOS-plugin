import { defineTool } from '@tool/type';
import {
  FlowNodeInputTypeEnum,
  FlowNodeOutputTypeEnum,
  WorkflowIOValueTypeEnum
} from '@tool/type/ipolloos';

export default defineTool({
  name: {
    'zh-CN': '方舟对话',
    en: 'Ark chat'
  },
  description: {
    'zh-CN': '用插件里配置好的密钥与对话接入点发一条消息（非流式）。',
    en: 'One-shot chat using plugin-configured credentials and chat endpoint (non-streaming).'
  },
  toolDescription:
    '只填「你想说的话」；可选「补充说明」会作为系统提示。密钥与接入点在插件资源配置里配置。',
  versionList: [
    {
      value: '1.1.0',
      description: '密钥迁入插件配置；节点仅保留文案输入',
      inputs: [
        {
          key: 'user_message',
          label: '你想说的话',
          valueType: WorkflowIOValueTypeEnum.string,
          renderTypeList: [FlowNodeInputTypeEnum.reference, FlowNodeInputTypeEnum.textarea],
          required: true,
          toolDescription: '发给模型的一段文字'
        },
        {
          key: 'extra_note',
          label: '补充说明（可选）',
          valueType: WorkflowIOValueTypeEnum.string,
          renderTypeList: [FlowNodeInputTypeEnum.reference, FlowNodeInputTypeEnum.textarea],
          defaultValue: '',
          toolDescription: '可选；会作为系统提示，约束语气或格式'
        }
      ],
      outputs: [
        {
          valueType: WorkflowIOValueTypeEnum.string,
          key: 'reply',
          label: '回复正文',
          description: '模型返回的正文'
        },
        {
          valueType: WorkflowIOValueTypeEnum.string,
          key: 'finish_reason',
          label: '结束原因',
          description: '如 stop、length'
        },
        {
          valueType: WorkflowIOValueTypeEnum.string,
          key: 'usage_json',
          label: '用量 JSON',
          description: 'token 用量'
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
