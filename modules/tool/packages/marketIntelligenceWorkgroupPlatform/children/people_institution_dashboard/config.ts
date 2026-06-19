import { defineTool } from '@tool/type';
import {
  FlowNodeInputTypeEnum,
  FlowNodeOutputTypeEnum,
  WorkflowIOValueTypeEnum
} from '@tool/type/ipolloos';

export default defineTool({
  name: {
    'zh-CN': '人物机构 · 深度看板',
    en: 'People Institution · dashboard'
  },
  description: {
    'zh-CN': '把人物、机构、基金、CEO、公开发声、披露和相关股票映射渲染成稳定 HTML 看板。',
    en: 'Render people, institutions, funds, public remarks, disclosures, and mapped equities into a stable HTML dashboard.'
  },
  toolDescription:
    '用于人物/机构深度分析。上游 Agent 应先调用 X 读侧、新闻主题、SEC、行情和资金插件，形成结构化 report_json；本工具只做稳定金融看板渲染和 page_html/page_cover 输出，不抓数据、不调用模型。必须区分公开发声、披露交易、机构持仓和推断关系。',
  runtime: {
    kind: 'execute',
    execute: {
      riskLevel: 'read'
    }
  },
  versionList: [
    {
      value: '0.1.0',
      description: '稳定的人物机构深度分析看板',
      inputs: [
        {
          key: 'report_json',
          label: '结构化人物机构报告 JSON',
          required: true,
          valueType: WorkflowIOValueTypeEnum.string,
          renderTypeList: [FlowNodeInputTypeEnum.textarea, FlowNodeInputTypeEnum.reference],
          toolDescription:
            '必填。建议包含 title、summary、signals/topSignals/events、sections、sources、dataGaps。signals 应保留 source/speaker、公开发声或披露类型、关联股票、证据强度和限制。若暂时只有长研究内容，可传 {"title":"","content":"","dataGaps":[]}；不要传用户原始需求。已有完整 HTML 时改用通用 HTML 页面工具。'
        },
        {
          key: 'prepared_for',
          label: '报告对象',
          valueType: WorkflowIOValueTypeEnum.string,
          renderTypeList: [FlowNodeInputTypeEnum.input, FlowNodeInputTypeEnum.reference],
          required: false,
          defaultValue: ''
        },
        {
          key: 'report_date',
          label: '报告日期',
          valueType: WorkflowIOValueTypeEnum.string,
          renderTypeList: [FlowNodeInputTypeEnum.input, FlowNodeInputTypeEnum.reference],
          required: false,
          defaultValue: ''
        },
        {
          key: 'page_output_mode',
          label: '页面输出模式',
          valueType: WorkflowIOValueTypeEnum.string,
          renderTypeList: [FlowNodeInputTypeEnum.select],
          defaultValue: 'auto_publish',
          list: [
            { label: '自动发布到 iPolloOS', value: 'auto_publish' },
            { label: '发布到资源中心（HTTP）', value: 'resource_center' },
            { label: '返回 HTML 字符串', value: 'raw_html' }
          ]
        }
      ],
      outputs: [
        { valueType: WorkflowIOValueTypeEnum.string, key: 'page_html', label: '页面 HTML' },
        { valueType: WorkflowIOValueTypeEnum.string, key: 'page_url', label: '页面公开链接' },
        { valueType: WorkflowIOValueTypeEnum.string, key: 'page_cover', label: '页面卡片' },
        { valueType: WorkflowIOValueTypeEnum.string, key: 'summary', label: '摘要' },
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
