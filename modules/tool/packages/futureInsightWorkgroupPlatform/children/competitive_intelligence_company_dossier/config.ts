import { defineTool } from '@tool/type';
import {
  FlowNodeInputTypeEnum,
  FlowNodeOutputTypeEnum,
  WorkflowIOValueTypeEnum
} from '@tool/type/ipolloos';

export default defineTool({
  name: {
    'zh-CN': '竞争情报系统 · 企业档案',
    en: 'Competitive Intelligence System · company dossier'
  },
  description: {
    'zh-CN': '把公司尽调和竞争情报结构化内容，渲染成企业档案报告页。',
    en: 'Render structured company intelligence into an executive dossier page.'
  },
  toolDescription:
    '竞争情报系统的企业模板。上游 AI/Agent 负责查公司主体、股权控制、高管团队、产品线、知识产权、客户、渠道、融资、财报、诉讼、舆情和行业位置，并填写 dossier_json。生成页面前，上游应尽量用公司名 + logo / brand / official 做一次图片搜索；搜到可信 Logo 或品牌图后填入 logo_url 或 visual_image_url，搜不到就留空，不要填无关图片。本工具只负责稳定渲染：企业身份、财务质量、产品客户、风险判断、来源和下一步核验；有图时做带蒙版的杂志封面。适合查公司、供应商、客户、竞品和潜在合作对象。',
  versionList: [
    {
      value: '0.1.6',
      description: 'Company dossier renderer with masked magazine cover visual',
      inputs: [
        {
          key: 'company_name',
          label: '公司名',
          valueType: WorkflowIOValueTypeEnum.string,
          renderTypeList: [FlowNodeInputTypeEnum.reference, FlowNodeInputTypeEnum.input],
          required: true,
          toolDescription: '要调研的公司、机构或主体名称。'
        },
        {
          key: 'industry',
          label: '行业/赛道',
          valueType: WorkflowIOValueTypeEnum.string,
          renderTypeList: [FlowNodeInputTypeEnum.reference, FlowNodeInputTypeEnum.input],
          defaultValue: '',
          toolDescription: '选填；用于判断公司所处行业和竞争环境。'
        },
        {
          key: 'research_focus',
          label: '调研重点',
          valueType: WorkflowIOValueTypeEnum.string,
          renderTypeList: [FlowNodeInputTypeEnum.reference, FlowNodeInputTypeEnum.textarea],
          defaultValue: '',
          toolDescription: '选填；例如合作判断、竞品分析、投资尽调、供应商风险、客户背景。'
        },
        {
          key: 'relationship_context',
          label: '与我的关系',
          valueType: WorkflowIOValueTypeEnum.string,
          renderTypeList: [FlowNodeInputTypeEnum.reference, FlowNodeInputTypeEnum.textarea],
          defaultValue: '',
          toolDescription: '选填；例如潜在客户、竞品、供应商、投资对象、合作对象。'
        },
        {
          key: 'logo_url',
          label: '公司 Logo URL',
          valueType: WorkflowIOValueTypeEnum.string,
          renderTypeList: [FlowNodeInputTypeEnum.reference, FlowNodeInputTypeEnum.input],
          defaultValue: '',
          toolDescription: '选填；上游搜到公司 Logo 或品牌图后填入，插件会作为封面底图并加蒙版。'
        },
        {
          key: 'image_search_query',
          label: 'Logo 图片搜索词',
          valueType: WorkflowIOValueTypeEnum.string,
          renderTypeList: [FlowNodeInputTypeEnum.reference, FlowNodeInputTypeEnum.input],
          defaultValue: '',
          toolDescription:
            '选填；给上游 Agent 的图片搜索提示，例如“OpenAI logo official”或“某公司 brand logo”。插件不会直接搜索，但调用前应优先用这个词搜索 Logo。'
        },
        {
          key: 'visual_image_url',
          label: '封面图 URL',
          valueType: WorkflowIOValueTypeEnum.string,
          renderTypeList: [FlowNodeInputTypeEnum.reference, FlowNodeInputTypeEnum.input],
          defaultValue: '',
          toolDescription:
            '选填；公司现场、产品图、官网图或品牌图。没有合适图片时留空，插件不再生成抽象图形。'
        },
        {
          key: 'dossier_json',
          label: '企业档案 JSON',
          valueType: WorkflowIOValueTypeEnum.string,
          renderTypeList: [FlowNodeInputTypeEnum.reference, FlowNodeInputTypeEnum.textarea],
          required: true,
          toolDescription:
            '必填。建议包含 title、summary、tags、metrics、sections、entities、relations、sources。sections 里写身份、财务、产品客户、风险等内容；bars/metrics 用于商业图表，evidence/proofs/facts/data_points 用于右侧事实卡。不要把“先确认/再核验/最后复查”这类流程提示当作 evidence。'
        },
        {
          key: 'evidence_json',
          label: '来源/证据 JSON',
          valueType: WorkflowIOValueTypeEnum.string,
          renderTypeList: [FlowNodeInputTypeEnum.reference, FlowNodeInputTypeEnum.textarea],
          defaultValue: '',
          toolDescription:
            '选填；公开来源列表，例如官网、工商、财报、新闻、专利、招聘、招投标、数据库结果。'
        },
        {
          key: 'entities_json',
          label: '关联对象 JSON',
          valueType: WorkflowIOValueTypeEnum.string,
          renderTypeList: [FlowNodeInputTypeEnum.reference, FlowNodeInputTypeEnum.textarea],
          defaultValue: '',
          toolDescription: '选填；重要高管、产品、客户、投资方、竞品等对象，用于关系入口。'
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
