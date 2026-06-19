import { defineTool } from '@tool/type';
import {
  FlowNodeInputTypeEnum,
  FlowNodeOutputTypeEnum,
  WorkflowIOValueTypeEnum
} from '@tool/type/ipolloos';

export default defineTool({
  name: {
    'zh-CN': 'Smart Money · 资金看板',
    en: 'Smart Money · flow dashboard'
  },
  description: {
    'zh-CN': '把期权、暗池、ETF、13F、Insider、Congress 等资金信号渲染成稳定 HTML 看板。',
    en: 'Render options, dark-pool, ETF, 13F, insider, and Congress signals into a stable HTML dashboard.'
  },
  toolDescription:
    '用于 Smart Money / 资金雷达。上游必须保留数据延迟和来源，不能把期权流、暗池或 13F 解释成确定性机构方向。本工具只做确定性可视化。',
  runtime: {
    kind: 'execute',
    execute: {
      riskLevel: 'read'
    }
  },
  versionList: [
    {
      value: '0.1.1',
      description: '稳定的 Smart Money 资金流看板',
      inputs: [
        {
          key: 'report_json',
          label: '结构化资金报告 JSON',
          required: true,
          valueType: WorkflowIOValueTypeEnum.string,
          renderTypeList: [FlowNodeInputTypeEnum.textarea, FlowNodeInputTypeEnum.reference],
          toolDescription:
            '必填。建议包含 options/dark pool/ETF/13F/insider/Congress 归一化后的 signals、sections、sources、dataGaps。若暂时只有长研究内容，可传 {"title":"","content":"","dataGaps":[]}；不要传用户原始需求。已有完整 HTML 时改用通用 HTML 页面工具。'
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
