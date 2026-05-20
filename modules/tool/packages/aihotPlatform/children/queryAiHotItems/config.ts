import { defineTool } from '@tool/type';
import {
  FlowNodeInputTypeEnum,
  FlowNodeOutputTypeEnum,
  WorkflowIOValueTypeEnum
} from '@tool/type/ipolloos';

export default defineTool({
  name: {
    'zh-CN': '查询 AI HOT 动态',
    en: 'Query AI HOT updates'
  },
  description: {
    'zh-CN':
      '按关键词、分类、时间窗查询 AI HOT 动态。默认精选；只有明确要求全部/全量/所有时才选择全量。',
    en: 'Query AI HOT updates by keyword, category, and time window. Defaults to selected items.'
  },
  toolDescription:
    '默认 mode=selected。q 用于 OpenAI/Anthropic 等关键词搜索；since 使用 ISO-8601 时间。输出 answer_markdown 可直接回复，source_links 用于核对原文。',
  versionList: [
    {
      value: '1.0.0',
      description: '查询 AI HOT 精选/全量动态',
      inputs: [
        {
          key: 'q',
          label: '关键词（可选）',
          valueType: WorkflowIOValueTypeEnum.string,
          renderTypeList: [FlowNodeInputTypeEnum.reference, FlowNodeInputTypeEnum.input],
          toolDescription: '如 OpenAI、Anthropic、Gemini、模型发布；留空则按时间/分类查询。'
        },
        {
          key: 'category',
          label: '分类（可选）',
          valueType: WorkflowIOValueTypeEnum.string,
          renderTypeList: [FlowNodeInputTypeEnum.select, FlowNodeInputTypeEnum.reference],
          list: [
            { label: '不限制', value: '' },
            { label: 'AI 产品', value: 'ai-products' },
            { label: '行业动态', value: 'industry' },
            { label: '论文研究', value: 'papers' },
            { label: '模型发布', value: 'models' },
            { label: '技巧观点', value: 'tips' }
          ],
          toolDescription: '分类值按 AI HOT 当前接口透传；不确定可留空。'
        },
        {
          key: 'since',
          label: '起始时间（可选）',
          valueType: WorkflowIOValueTypeEnum.string,
          renderTypeList: [FlowNodeInputTypeEnum.reference, FlowNodeInputTypeEnum.input],
          placeholder: '2026-05-19T00:00:00.000Z',
          toolDescription: 'ISO-8601 时间；例如最近 3 天由上游节点计算后传入。'
        },
        {
          key: 'mode',
          label: '查询范围',
          valueType: WorkflowIOValueTypeEnum.string,
          renderTypeList: [FlowNodeInputTypeEnum.select, FlowNodeInputTypeEnum.reference],
          required: true,
          defaultValue: 'selected',
          list: [
            { label: '精选（推荐）', value: 'selected' },
            { label: '全量', value: 'all' }
          ],
          toolDescription: '除非用户明确说全部/全量/所有，否则使用 selected。'
        },
        {
          key: 'take',
          label: '返回条数',
          valueType: WorkflowIOValueTypeEnum.number,
          renderTypeList: [FlowNodeInputTypeEnum.numberInput, FlowNodeInputTypeEnum.reference],
          required: true,
          defaultValue: 10,
          toolDescription: '建议 5-20；插件资源配置 maxItems 会做上限兜底。'
        },
        {
          key: 'cursor',
          label: '分页游标（可选）',
          valueType: WorkflowIOValueTypeEnum.string,
          renderTypeList: [FlowNodeInputTypeEnum.reference, FlowNodeInputTypeEnum.input],
          toolDescription: '上一页输出 next_cursor，用于继续翻页。'
        }
      ],
      outputs: [
        {
          valueType: WorkflowIOValueTypeEnum.string,
          key: 'answer_markdown',
          label: '可直接回复的 Markdown'
        },
        {
          valueType: WorkflowIOValueTypeEnum.string,
          key: 'items_json',
          label: '动态 JSON'
        },
        {
          valueType: WorkflowIOValueTypeEnum.string,
          key: 'source_links',
          label: '原文链接列表'
        },
        {
          valueType: WorkflowIOValueTypeEnum.number,
          key: 'count',
          label: '返回条数'
        },
        {
          valueType: WorkflowIOValueTypeEnum.string,
          key: 'next_cursor',
          label: '下一页游标'
        },
        {
          valueType: WorkflowIOValueTypeEnum.boolean,
          key: 'has_next',
          label: '是否还有更多'
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
