import { defineTool } from '@tool/type';
import {
  FlowNodeInputTypeEnum,
  FlowNodeOutputTypeEnum,
  WorkflowIOValueTypeEnum
} from '@tool/type/ipolloos';

export default defineTool({
  name: {
    'zh-CN': '获取 AI HOT 日报',
    en: 'Get AI HOT daily brief'
  },
  description: {
    'zh-CN': '获取 AI HOT 最近一期或指定日期的每日精编日报。',
    en: 'Get the latest or a specific AI HOT daily brief.'
  },
  toolDescription:
    'date 留空获取最近一期；指定日期使用 YYYY-MM-DD。输出 daily_markdown 可直接回复，source_links 用于核对原文。',
  versionList: [
    {
      value: '1.0.0',
      description: '获取最近一期或指定日期 AI HOT 日报',
      inputs: [
        {
          key: 'date',
          label: '日期（可选）',
          valueType: WorkflowIOValueTypeEnum.string,
          renderTypeList: [FlowNodeInputTypeEnum.reference, FlowNodeInputTypeEnum.input],
          placeholder: '2026-05-19',
          toolDescription: 'YYYY-MM-DD；留空则读取最近一期日报。'
        }
      ],
      outputs: [
        {
          valueType: WorkflowIOValueTypeEnum.string,
          key: 'daily_markdown',
          label: '日报 Markdown'
        },
        {
          valueType: WorkflowIOValueTypeEnum.string,
          key: 'daily_json',
          label: '日报 JSON'
        },
        {
          valueType: WorkflowIOValueTypeEnum.string,
          key: 'source_links',
          label: '原文链接列表'
        },
        {
          valueType: WorkflowIOValueTypeEnum.string,
          key: 'date',
          label: '日报日期'
        },
        {
          valueType: WorkflowIOValueTypeEnum.string,
          key: 'generated_at',
          label: '生成时间'
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
