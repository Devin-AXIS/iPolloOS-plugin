import { defineTool } from '@tool/type';
import {
  FlowNodeInputTypeEnum,
  FlowNodeOutputTypeEnum,
  WorkflowIOValueTypeEnum
} from '@tool/type/ipolloos';

export default defineTool({
  name: {
    'zh-CN': '分析项目投资人',
    en: 'Analyze project investors'
  },
  description: {
    'zh-CN': '通过网上搜索分析项目画像、融资与投资人线索、市场信号、风险和待验证问题。',
    en: 'Analyze a project with web search results for investor signals, market signals, risks, and verification questions.'
  },
  toolDescription:
    '输入项目名、官网或项目描述后，工具会搜索公开网页并整理投资人分析。适合投融资线索发现、投资机构匹配前的公开信息梳理和尽调问题准备。',
  versionList: [
    {
      value: '1.0.0',
      description: '基于公开网页搜索的投资人分析第一版',
      inputs: [
        {
          key: 'project',
          label: '项目',
          valueType: WorkflowIOValueTypeEnum.string,
          renderTypeList: [FlowNodeInputTypeEnum.reference, FlowNodeInputTypeEnum.input],
          required: true,
          placeholder: '项目名、公司名、官网 URL 或 GitHub URL',
          toolDescription: '要分析的项目、公司、产品或官网链接。'
        },
        {
          key: 'projectDescription',
          label: '项目补充描述',
          valueType: WorkflowIOValueTypeEnum.string,
          renderTypeList: [FlowNodeInputTypeEnum.reference, FlowNodeInputTypeEnum.textarea],
          defaultValue: '',
          toolDescription: '可选。补充项目定位、业务方向、产品描述或用户提供的上下文。'
        },
        {
          key: 'market',
          label: '目标市场',
          valueType: WorkflowIOValueTypeEnum.string,
          renderTypeList: [FlowNodeInputTypeEnum.reference, FlowNodeInputTypeEnum.input],
          defaultValue: 'global',
          toolDescription: '可填 global、US、China、Europe、Southeast Asia，或具体行业/地区。'
        },
        {
          key: 'stage',
          label: '融资阶段',
          valueType: WorkflowIOValueTypeEnum.string,
          renderTypeList: [FlowNodeInputTypeEnum.select, FlowNodeInputTypeEnum.reference],
          defaultValue: 'unknown',
          list: [
            { label: '未知', value: 'unknown' },
            { label: 'Pre-seed', value: 'pre_seed' },
            { label: 'Seed', value: 'seed' },
            { label: 'Series A', value: 'series_a' },
            { label: 'Series B+', value: 'series_b_plus' },
            { label: 'Growth', value: 'growth' }
          ]
        },
        {
          key: 'analysisFocus',
          label: '分析重点',
          valueType: WorkflowIOValueTypeEnum.string,
          renderTypeList: [FlowNodeInputTypeEnum.select, FlowNodeInputTypeEnum.reference],
          defaultValue: 'full',
          list: [
            { label: '完整分析', value: 'full' },
            { label: '融资线索', value: 'fundraising' },
            { label: '投资人匹配', value: 'investor_fit' },
            { label: '市场信号', value: 'market_signals' },
            { label: '风险审查', value: 'risk_review' }
          ]
        },
        {
          key: 'maxResults',
          label: '每类最大搜索结果',
          valueType: WorkflowIOValueTypeEnum.number,
          renderTypeList: [FlowNodeInputTypeEnum.numberInput, FlowNodeInputTypeEnum.reference],
          defaultValue: 8,
          min: 3,
          max: 15
        },
        {
          key: 'language',
          label: '输出语言',
          valueType: WorkflowIOValueTypeEnum.string,
          renderTypeList: [FlowNodeInputTypeEnum.select, FlowNodeInputTypeEnum.reference],
          defaultValue: 'zh-CN',
          list: [
            { label: '中文', value: 'zh-CN' },
            { label: 'English', value: 'en' }
          ]
        }
      ],
      outputs: [
        {
          valueType: WorkflowIOValueTypeEnum.string,
          key: 'report_markdown',
          label: '投资人分析报告'
        },
        {
          valueType: WorkflowIOValueTypeEnum.string,
          key: 'analysis_json',
          label: '分析 JSON'
        },
        {
          valueType: WorkflowIOValueTypeEnum.string,
          key: 'search_results_json',
          label: '搜索结果 JSON'
        },
        {
          valueType: WorkflowIOValueTypeEnum.string,
          key: 'source_links',
          label: '来源链接'
        },
        {
          valueType: WorkflowIOValueTypeEnum.string,
          key: 'investor_candidates_json',
          label: '投资人候选 JSON'
        },
        {
          valueType: WorkflowIOValueTypeEnum.string,
          key: 'risk_flags_json',
          label: '风险信号 JSON'
        },
        {
          valueType: WorkflowIOValueTypeEnum.string,
          key: 'verification_questions',
          label: '待验证问题'
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
