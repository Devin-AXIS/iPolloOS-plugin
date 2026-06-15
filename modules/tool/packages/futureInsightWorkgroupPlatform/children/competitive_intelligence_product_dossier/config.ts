import { defineTool } from '@tool/type';
import {
  FlowNodeInputTypeEnum,
  FlowNodeOutputTypeEnum,
  WorkflowIOValueTypeEnum
} from '@tool/type/ipolloos';

export default defineTool({
  name: {
    'zh-CN': '竞争情报系统 · 产品技术档案',
    en: 'Competitive Intelligence System · product and technology dossier'
  },
  description: {
    'zh-CN': '把产品、技术、替代品、客户和商业化线索渲染成产品技术情报页。',
    en: 'Render product and technology intelligence into an executive dossier page.'
  },
  toolDescription:
    '竞争情报系统的产品技术模板。上游 AI/Agent 负责查产品定位、替代对象、目标客户、技术证据、专利论文、文档、Demo、客户案例、定价、渠道、竞品和生态依赖，并填写 dossier_json。生成页面前，上游应尽量搜索产品图、官网截图、架构图或品牌图；搜到后填入 visual_image_url 或 logo_url，搜不到就留空。本工具负责稳定渲染：产品定位、技术证据、商业化、生态和风险判断；有图时做带蒙版的杂志封面。',
  versionList: [
    {
      value: '0.1.6',
      description: 'Product and technology dossier renderer with masked magazine cover visual',
      inputs: [
        {
          key: 'product_name',
          label: '产品/技术名',
          valueType: WorkflowIOValueTypeEnum.string,
          renderTypeList: [FlowNodeInputTypeEnum.reference, FlowNodeInputTypeEnum.input],
          required: true,
          toolDescription: '要调研的产品、技术、平台或方案名称。'
        },
        {
          key: 'industry',
          label: '行业/场景',
          valueType: WorkflowIOValueTypeEnum.string,
          renderTypeList: [FlowNodeInputTypeEnum.reference, FlowNodeInputTypeEnum.input],
          defaultValue: ''
        },
        {
          key: 'research_focus',
          label: '调研重点',
          valueType: WorkflowIOValueTypeEnum.string,
          renderTypeList: [FlowNodeInputTypeEnum.reference, FlowNodeInputTypeEnum.textarea],
          defaultValue: '',
          toolDescription: '选填；例如替代风险、采购判断、技术路线、竞品对标、合作可能性。'
        },
        {
          key: 'relationship_context',
          label: '与我的关系',
          valueType: WorkflowIOValueTypeEnum.string,
          renderTypeList: [FlowNodeInputTypeEnum.reference, FlowNodeInputTypeEnum.textarea],
          defaultValue: ''
        },
        {
          key: 'visual_image_url',
          label: '产品/技术封面图 URL',
          valueType: WorkflowIOValueTypeEnum.string,
          renderTypeList: [FlowNodeInputTypeEnum.reference, FlowNodeInputTypeEnum.input],
          defaultValue: '',
          toolDescription:
            '选填；产品图、架构图、官网图或生成图。没有合适图片时留空，插件不再生成抽象图形。'
        },
        {
          key: 'image_search_query',
          label: '产品图片搜索词',
          valueType: WorkflowIOValueTypeEnum.string,
          renderTypeList: [FlowNodeInputTypeEnum.reference, FlowNodeInputTypeEnum.input],
          defaultValue: '',
          toolDescription:
            '选填；给上游 Agent 的图片搜索提示，例如“产品名 screenshot official”或“产品名 architecture”。插件不会直接搜索。'
        },
        {
          key: 'logo_url',
          label: '所属公司 Logo URL',
          valueType: WorkflowIOValueTypeEnum.string,
          renderTypeList: [FlowNodeInputTypeEnum.reference, FlowNodeInputTypeEnum.input],
          defaultValue: '',
          toolDescription: '选填；没有产品图但有公司 Logo 时可作为封面底图。'
        },
        {
          key: 'dossier_json',
          label: '产品技术档案 JSON',
          valueType: WorkflowIOValueTypeEnum.string,
          renderTypeList: [FlowNodeInputTypeEnum.reference, FlowNodeInputTypeEnum.textarea],
          required: true,
          toolDescription:
            '必填。建议包含 title、summary、tags、metrics、sections、entities、relations、sources。sections 里写定位、技术证据、商业化、趋势风险等内容；bars/metrics 用于商业图表，evidence/proofs/facts/data_points 用于右侧事实卡。不要把“先确认/再核验/最后复查”这类流程提示当作 evidence。'
        },
        {
          key: 'evidence_json',
          label: '来源/证据 JSON',
          valueType: WorkflowIOValueTypeEnum.string,
          renderTypeList: [FlowNodeInputTypeEnum.reference, FlowNodeInputTypeEnum.textarea],
          defaultValue: ''
        },
        {
          key: 'entities_json',
          label: '关联对象 JSON',
          valueType: WorkflowIOValueTypeEnum.string,
          renderTypeList: [FlowNodeInputTypeEnum.reference, FlowNodeInputTypeEnum.textarea],
          defaultValue: '',
          toolDescription: '选填；厂商、客户、替代品、上游供应、渠道和生态对象。'
        },
        {
          key: 'report_date',
          label: '报告日期',
          valueType: WorkflowIOValueTypeEnum.string,
          renderTypeList: [FlowNodeInputTypeEnum.reference, FlowNodeInputTypeEnum.input],
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
