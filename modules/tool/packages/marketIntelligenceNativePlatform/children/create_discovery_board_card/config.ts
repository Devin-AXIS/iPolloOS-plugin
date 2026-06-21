import { defineTool } from '@tool/type';
import {
  FlowNodeInputTypeEnum,
  FlowNodeOutputTypeEnum,
  WorkflowIOValueTypeEnum
} from '@tool/type/ipolloos';

export default defineTool({
  name: {
    'zh-CN': '生成发现机会看板',
    en: 'Create discovery board card'
  },
  description: {
    'zh-CN': '把 8 类发现机会扫描结果整理成 MarketDiscoveryBoardCard。',
    en: 'Package opportunity discovery scan results into a MarketDiscoveryBoardCard.'
  },
  toolDescription:
    '用于官方美股“发现机会”原生结果页。支持 8 个用户入口：异动雷达、财报指引、内部人交易、名人机构动向、资金流向、新闻政策催化、媒体社区热度、主题产业热度。SEC、Form 4、13F/13D/G、公司公告、新闻、X/社区和行情数据都是证据源，不是独立入口。调用前先取数，本工具只生成 app_card、原生视图模型和写入记录 JSON。signals_json 有结构化信号时优先传；如果没有，插件会从 ai_blocks_json 的信号分析段落中抽取重点信号。ai_blocks_json 是上方 AI 解读区，应该写整体判断、机会/风险框架、反证、情景推演和下一步验证，不要再次逐条列 Top 信号或重复 signals_json；单条信号详情必须放在 signals_json。sources_json 应包含所有新闻、SEC、公告、文件、URL、引用点和 reference。',
  runtime: {
    kind: 'execute',
    execute: {
      riskLevel: 'read'
    }
  },
  versionList: [
    {
      value: '1.2.5',
      description: '生成 8 类发现机会原生看板、动态内容板块、去重后的 AI 解读和视图模型',
      inputs: [
        {
          key: 'scan_mode',
          label: '扫描方式',
          valueType: WorkflowIOValueTypeEnum.string,
          renderTypeList: [FlowNodeInputTypeEnum.input, FlowNodeInputTypeEnum.reference],
          toolDescription:
            '可选但建议填写。8 类之一：price_move、earnings、insider、famous_institution_trade、capital_flow、policy_news_catalyst、sentiment_theme_heat、theme_industry_heat。为空时插件会从 signals_json/AI 内容推断，推断失败默认 price_move。'
        },
        {
          key: 'universe',
          label: '扫描范围',
          valueType: WorkflowIOValueTypeEnum.string,
          renderTypeList: [FlowNodeInputTypeEnum.textarea, FlowNodeInputTypeEnum.reference]
        },
        {
          key: 'signals_json',
          label: '信号 JSON',
          valueType: WorkflowIOValueTypeEnum.string,
          renderTypeList: [FlowNodeInputTypeEnum.textarea, FlowNodeInputTypeEnum.reference],
          toolDescription:
            '可选。推荐传结构化信号数组，每项包含 title/eventType/target/impactedTickers/importanceScore/summary/why_it_matters/evidence/confidence/delay_or_limitation/next_verification。若省略，插件会从 ai_blocks_json 的 signal_analysis/Top 信号/事件类型/影响标的等段落自动抽取重点信号；若已传 signals_json，不要在 ai_blocks_json 里重复逐条信号。'
        },
        {
          key: 'ai_blocks_json',
          label: 'AI 内容块 JSON',
          valueType: WorkflowIOValueTypeEnum.string,
          renderTypeList: [FlowNodeInputTypeEnum.textarea, FlowNodeInputTypeEnum.reference],
          toolDescription:
            'AI 的完整解释内容。建议 JSON 数组，每项包含 title/type/content/items/sources/citations/references。不要强制固定栏目；按证据自由组织标题、段落和要点，但这里是上方 AI 解读区，只写整体判断、为什么重要、机会路径、风险与反证、情景推演、结论和下一步验证。不要再次列出 Top 5-10 信号、重点信号清单或逐条展开 signals_json。不要省略本字段；如果调用方漏传，插件会从 signals_json 兜底生成整体分析，但质量不如显式 AI 分析。'
        },
        {
          key: 'sources_json',
          label: '来源 JSON',
          valueType: WorkflowIOValueTypeEnum.string,
          renderTypeList: [FlowNodeInputTypeEnum.textarea, FlowNodeInputTypeEnum.reference],
          toolDescription:
            '所有用到的来源清单，不要只放少数来源。包含新闻链接、SEC 文件、公告、文件、URL、引用句、citation、reference，以及每条来源被用于支持哪个判断。'
        },
        {
          key: 'data_gaps_json',
          label: '数据缺口 JSON',
          valueType: WorkflowIOValueTypeEnum.string,
          renderTypeList: [FlowNodeInputTypeEnum.textarea, FlowNodeInputTypeEnum.reference]
        }
      ],
      outputs: [
        { valueType: WorkflowIOValueTypeEnum.string, key: 'app_card', label: 'APP 原生卡片 JSON' },
        { valueType: WorkflowIOValueTypeEnum.string, key: 'records_json', label: '写入记录 JSON' },
        { valueType: WorkflowIOValueTypeEnum.string, key: 'summary_markdown', label: '摘要' },
        { valueType: WorkflowIOValueTypeEnum.number, key: 'count', label: '信号数' },
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
