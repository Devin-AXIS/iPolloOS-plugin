import { defineTool } from '@tool/type';
import {
  FlowNodeInputTypeEnum,
  FlowNodeOutputTypeEnum,
  WorkflowIOValueTypeEnum
} from '@tool/type/ipolloos';
import { ToolTagEnum } from '@tool/type/tags';

export default defineTool({
  tags: [ToolTagEnum.enum.finance],
  name: {
    'zh-CN': 'App 股票金融卡片',
    en: 'App Stock & Market Cards'
  },
  description: {
    'zh-CN': '生成 App 股票/金融号可渲染的行情、异动、财报、估值、组合和研报结构化卡片。',
    en: 'Build structured App cards for stock quotes, movers, earnings, valuation, portfolios and research.'
  },
  toolDescription:
    '股票金融号结构化卡片工具。AI 根据用户意图选择 card_type；人工编排时也可以用下拉选择。card_data 填该卡片的数据 JSON，工具会输出 App 可渲染 payload。',
  versionList: [
    {
      value: '1.1.0',
      description: '新增 card_type 显式选择，支持 AI 自动选择和人工下拉配置',
      inputs: [
        {
          key: 'card_type',
          label: '卡片类型',
          valueType: WorkflowIOValueTypeEnum.string,
          renderTypeList: [FlowNodeInputTypeEnum.select, FlowNodeInputTypeEnum.reference],
          required: true,
          defaultValue: 'stock_quote',
          list: [
            {
              label: '股票行情卡',
              value: 'stock_quote',
              description: '展示个股价格、涨跌幅、成交量等。'
            },
            {
              label: '市场异动卡',
              value: 'market_mover',
              description: '展示大涨大跌、放量、突破等异动。'
            },
            {
              label: '财报总结卡',
              value: 'earnings_summary',
              description: '展示营收、利润、指引和关键变化。'
            },
            {
              label: '估值快照卡',
              value: 'valuation_snapshot',
              description: '展示 PE、PS、市值、增长等估值数据。'
            },
            {
              label: '组合观察卡',
              value: 'portfolio_watch',
              description: '展示自选/持仓组合变化。'
            },
            {
              label: '研报摘要卡',
              value: 'research_brief',
              description: '展示观点、评级、目标价和风险。'
            },
            {
              label: '期货信号卡',
              value: 'futures_signal',
              description: '展示期货/大宗方向和关键价位。'
            },
            {
              label: '每日市场展望卡',
              value: 'daily_market_outlook',
              description: '展示盘前/盘后市场重点。'
            }
          ],
          toolDescription:
            '根据用户意图选择卡片类型：个股行情=stock_quote，异动=market_mover，财报=earnings_summary，估值=valuation_snapshot，组合=portfolio_watch，研报=research_brief，期货=futures_signal，市场展望=daily_market_outlook。'
        },
        {
          key: 'card_data',
          label: '卡片数据 JSON',
          valueType: WorkflowIOValueTypeEnum.object,
          renderTypeList: [FlowNodeInputTypeEnum.JSONEditor, FlowNodeInputTypeEnum.reference],
          required: true,
          toolDescription:
            '该卡片的数据对象。示例 stock_quote: {"symbol":"AAPL","price":203.4,"changePct":1.2}。'
        },
        {
          key: 'title',
          label: '卡片标题',
          valueType: WorkflowIOValueTypeEnum.string,
          renderTypeList: [FlowNodeInputTypeEnum.input, FlowNodeInputTypeEnum.reference],
          defaultValue: '',
          toolDescription: '可空；为空时由 App 前端按 card_type 使用默认标题。'
        },
        {
          key: 'reply_text',
          label: '回复文本',
          valueType: WorkflowIOValueTypeEnum.string,
          renderTypeList: [FlowNodeInputTypeEnum.reference, FlowNodeInputTypeEnum.textarea],
          defaultValue: '',
          toolDescription: '卡片前的简短自然语言说明，可空。'
        },
        {
          key: 'placement',
          label: '展示位置',
          valueType: WorkflowIOValueTypeEnum.string,
          renderTypeList: [FlowNodeInputTypeEnum.select, FlowNodeInputTypeEnum.reference],
          defaultValue: 'auto',
          list: [
            { label: '自动', value: 'auto' },
            { label: '对话消息', value: 'message' },
            { label: '标签栏', value: 'tab' }
          ]
        },
        {
          key: 'update_mode',
          label: '更新方式',
          valueType: WorkflowIOValueTypeEnum.string,
          renderTypeList: [FlowNodeInputTypeEnum.select, FlowNodeInputTypeEnum.reference],
          defaultValue: 'append',
          list: [
            { label: '追加', value: 'append' },
            { label: '替换同类型卡片', value: 'replace' }
          ]
        }
      ],
      outputs: [
        { key: 'answer_text', label: '回复文本', valueType: WorkflowIOValueTypeEnum.string },
        {
          key: 'app_cards_payload',
          label: 'App 卡片 Payload',
          valueType: WorkflowIOValueTypeEnum.object
        },
        {
          key: 'app_cards_json',
          label: 'App 卡片 JSON',
          valueType: WorkflowIOValueTypeEnum.string
        },
        {
          key: 'app_cards_comment',
          label: 'App 卡片标记',
          valueType: WorkflowIOValueTypeEnum.string
        },
        { key: 'card_count', label: '卡片数量', valueType: WorkflowIOValueTypeEnum.number },
        {
          key: 'selected_card_type',
          label: '已选卡片类型',
          valueType: WorkflowIOValueTypeEnum.string
        },
        {
          key: 'allowed_card_types',
          label: '允许类型',
          valueType: WorkflowIOValueTypeEnum.arrayString
        },
        {
          type: FlowNodeOutputTypeEnum.error,
          key: 'system_error',
          label: '错误',
          valueType: WorkflowIOValueTypeEnum.string
        }
      ]
    }
  ]
});
