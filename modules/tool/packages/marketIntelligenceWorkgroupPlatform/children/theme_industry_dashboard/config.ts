import { defineTool } from '@tool/type';
import {
  FlowNodeInputTypeEnum,
  FlowNodeOutputTypeEnum,
  WorkflowIOValueTypeEnum
} from '@tool/type/ipolloos';

export default defineTool({
  name: {
    'zh-CN': '主题产业 · 深度看板',
    en: 'Theme Industry · dashboard'
  },
  description: {
    'zh-CN': '把主题热度、产业链关系、受益/受损公司和证据映射渲染成稳定 HTML 看板。',
    en: 'Render theme momentum, industry mapping, exposed companies, and evidence into a stable HTML dashboard.'
  },
  toolDescription:
    '用于主题/产业深度分析。上游 Agent 应先调用新闻主题、主题公司映射、行情、SEC 和 X 读侧插件，形成结构化 report_json；本工具只做稳定金融看板渲染和 page_html/page_cover 输出，不抓数据、不调用模型。不要把宽泛主题写入长期监控配置；主题产业应作为一次性深度分析或机会扫描处理。',
  runtime: {
    kind: 'execute',
    execute: {
      riskLevel: 'read'
    }
  },
  versionList: [
    {
      value: '0.1.0',
      description: '稳定的主题产业深度分析看板',
      inputs: [
        {
          key: 'report_json',
          label: '结构化主题产业报告 JSON',
          required: true,
          valueType: WorkflowIOValueTypeEnum.string,
          renderTypeList: [FlowNodeInputTypeEnum.textarea, FlowNodeInputTypeEnum.reference],
          toolDescription:
            '必填。建议包含 title、summary、signals/topSignals/events、sections、sources、dataGaps。signals 应区分 beneficiary、supplier、customer、competitor、risk_exposed 或 attention_only。若暂时只有长研究内容，可传 {"title":"","content":"","dataGaps":[]}；不要传用户原始需求。已有完整 HTML 时改用通用 HTML 页面工具。'
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
