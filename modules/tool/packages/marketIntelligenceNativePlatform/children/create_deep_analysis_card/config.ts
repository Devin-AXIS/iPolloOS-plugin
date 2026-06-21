import { defineTool } from '@tool/type';
import {
  FlowNodeInputTypeEnum,
  FlowNodeOutputTypeEnum,
  WorkflowIOValueTypeEnum
} from '@tool/type/ipolloos';

export default defineTool({
  name: {
    'zh-CN': '生成深度分析卡片',
    en: 'Create deep analysis card'
  },
  description: {
    'zh-CN': '把股票、人物机构或主题板块分析整理成 MarketDeepAnalysisCard。',
    en: 'Package ticker, people/institution, or theme analysis into a MarketDeepAnalysisCard.'
  },
  toolDescription:
    '用于官方美股“深度分析”原生结果页。固定数据走 metrics/signals/targets，AI 自由解释放入 aiBlocks；本工具不发布 HTML。ai_blocks_json 是核心内容，必须包含机构级深度分析，不要只放一句结论。建议 6-8 个分析块：投资判断、证据地图、核心分歧、机会路径、风险与反证、估值/催化桥梁、情景推演、下一步验证。股票、人物机构、主题板块必须使用不同分析框架。sources_json 应列出所有新闻、SEC、公告、文件、URL、引用点和 reference。',
  runtime: {
    kind: 'execute',
    execute: {
      riskLevel: 'read'
    }
  },
  versionList: [
    {
      value: '1.2.7',
      description: '生成原生深度分析卡片，并输出概览与正文分段',
      inputs: [
        {
          key: 'analysis_type',
          label: '分析类别',
          valueType: WorkflowIOValueTypeEnum.string,
          renderTypeList: [FlowNodeInputTypeEnum.input, FlowNodeInputTypeEnum.reference],
          required: true
        },
        {
          key: 'targets_json',
          label: '分析对象 JSON',
          valueType: WorkflowIOValueTypeEnum.string,
          renderTypeList: [FlowNodeInputTypeEnum.textarea, FlowNodeInputTypeEnum.reference],
          required: true
        },
        {
          key: 'analysis_focus',
          label: '分析重点',
          valueType: WorkflowIOValueTypeEnum.string,
          renderTypeList: [FlowNodeInputTypeEnum.input, FlowNodeInputTypeEnum.reference]
        },
        {
          key: 'metrics_json',
          label: '指标 JSON',
          valueType: WorkflowIOValueTypeEnum.string,
          renderTypeList: [FlowNodeInputTypeEnum.textarea, FlowNodeInputTypeEnum.reference]
        },
        {
          key: 'signals_json',
          label: '信号 JSON',
          valueType: WorkflowIOValueTypeEnum.string,
          renderTypeList: [FlowNodeInputTypeEnum.textarea, FlowNodeInputTypeEnum.reference]
        },
        {
          key: 'ai_blocks_json',
          label: 'AI 内容块 JSON',
          valueType: WorkflowIOValueTypeEnum.string,
          renderTypeList: [FlowNodeInputTypeEnum.textarea, FlowNodeInputTypeEnum.reference],
          required: true,
          toolDescription:
            'AI 的完整解释内容。建议 JSON 数组，每项包含 title/type/content/items/sources/citations/references。至少覆盖：投资判断、证据地图、核心分歧、机会路径、风险与反证、估值/催化桥梁、情景推演、下一步验证；每块尽量 120-300 字或 3-6 条要点。'
        },
        {
          key: 'sources_json',
          label: '来源 JSON',
          valueType: WorkflowIOValueTypeEnum.string,
          renderTypeList: [FlowNodeInputTypeEnum.textarea, FlowNodeInputTypeEnum.reference],
          toolDescription:
            '所有用到的来源清单，不要只放少数来源。包含新闻链接、SEC 文件、公告、文件、URL、引用句、citation、reference，以及每条来源被用于支持哪个判断。'
        }
      ],
      outputs: [
        { valueType: WorkflowIOValueTypeEnum.string, key: 'app_card', label: 'APP 原生卡片 JSON' },
        { valueType: WorkflowIOValueTypeEnum.string, key: 'records_json', label: '写入记录 JSON' },
        { valueType: WorkflowIOValueTypeEnum.string, key: 'summary_markdown', label: '摘要' },
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
