import { defineTool } from '@tool/type';
import {
  FlowNodeInputTypeEnum,
  FlowNodeOutputTypeEnum,
  WorkflowIOValueTypeEnum
} from '@tool/type/ipolloos';

export default defineTool({
  name: {
    'zh-CN': '查询 AI HOT 日报日期',
    en: 'List AI HOT daily dates'
  },
  description: {
    'zh-CN': '查询 AI HOT 当前可用的日报日期列表。',
    en: 'List available AI HOT daily brief dates.'
  },
  toolDescription: '用于回答“有哪些日报/最近几期日报”。再用 getAiHotDaily 按 date 获取具体日报。',
  versionList: [
    {
      value: '1.0.0',
      description: '查询可用日报日期',
      inputs: [
        {
          key: 'take',
          label: '返回期数',
          valueType: WorkflowIOValueTypeEnum.number,
          renderTypeList: [FlowNodeInputTypeEnum.numberInput, FlowNodeInputTypeEnum.reference],
          required: true,
          defaultValue: 10,
          toolDescription: '建议 5-20；插件资源配置 maxItems 会做上限兜底。'
        }
      ],
      outputs: [
        {
          valueType: WorkflowIOValueTypeEnum.string,
          key: 'dailies_markdown',
          label: '日期列表 Markdown'
        },
        {
          valueType: WorkflowIOValueTypeEnum.string,
          key: 'dailies_json',
          label: '日期列表 JSON'
        },
        {
          valueType: WorkflowIOValueTypeEnum.number,
          key: 'count',
          label: '返回期数'
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
