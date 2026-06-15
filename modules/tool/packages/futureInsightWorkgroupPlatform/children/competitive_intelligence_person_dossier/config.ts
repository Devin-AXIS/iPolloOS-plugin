import { defineTool } from '@tool/type';
import {
  FlowNodeInputTypeEnum,
  FlowNodeOutputTypeEnum,
  WorkflowIOValueTypeEnum
} from '@tool/type/ipolloos';

export default defineTool({
  name: {
    'zh-CN': '竞争情报系统 · 人物档案',
    en: 'Competitive Intelligence System · person dossier'
  },
  description: {
    'zh-CN': '把人物背景、履历、关系和风险线索渲染成高管可读的人物档案。',
    en: 'Render structured person intelligence into an executive dossier page.'
  },
  toolDescription:
    '竞争情报系统的人物模板。上游 AI/Agent 负责查姓名别名、履历、学历、任职、公司关系、投资关系、公开发言、项目经历、争议和利益冲突，并填写 dossier_json。生成页面前，上游应尽量用人物姓名 + 公司/职位做一次公开图片搜索；搜到可信人物照片后填入 portrait_image_url，搜不到就留空，不要填无关图片。本工具不联网搜索图片，只负责稳定渲染：人物身份、公司关系、行业影响力、风险判断、来源和接触建议；有图时做带蒙版的杂志封面。',
  versionList: [
    {
      value: '0.1.6',
      description: 'Person dossier renderer with masked portrait magazine cover',
      inputs: [
        {
          key: 'person_name',
          label: '人物姓名',
          valueType: WorkflowIOValueTypeEnum.string,
          renderTypeList: [FlowNodeInputTypeEnum.reference, FlowNodeInputTypeEnum.input],
          required: true,
          toolDescription: '要调研的人物姓名，可包含公司或职位辅助消歧。'
        },
        {
          key: 'industry',
          label: '行业/背景',
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
          toolDescription: '选填；例如合作背调、候选人判断、投资人背景、关键高管尽调。'
        },
        {
          key: 'relationship_context',
          label: '与我的关系',
          valueType: WorkflowIOValueTypeEnum.string,
          renderTypeList: [FlowNodeInputTypeEnum.reference, FlowNodeInputTypeEnum.textarea],
          defaultValue: ''
        },
        {
          key: 'portrait_image_url',
          label: '人物照片 URL',
          valueType: WorkflowIOValueTypeEnum.string,
          renderTypeList: [FlowNodeInputTypeEnum.reference, FlowNodeInputTypeEnum.input],
          defaultValue: '',
          toolDescription: '选填；上游搜到公开人物照片后填入，插件会作为封面底图并加蒙版。'
        },
        {
          key: 'image_search_query',
          label: '人物图片搜索词',
          valueType: WorkflowIOValueTypeEnum.string,
          renderTypeList: [FlowNodeInputTypeEnum.reference, FlowNodeInputTypeEnum.input],
          defaultValue: '',
          toolDescription:
            '选填；给上游 Agent 的图片搜索提示，例如“孔剑平 Nano Labs CEO photo”。插件不会直接搜索，但调用前应优先用这个词搜索人物照片。'
        },
        {
          key: 'visual_image_url',
          label: '封面图 URL',
          valueType: WorkflowIOValueTypeEnum.string,
          renderTypeList: [FlowNodeInputTypeEnum.reference, FlowNodeInputTypeEnum.input],
          defaultValue: '',
          toolDescription: '选填；没有可信人物照片时留空，插件不再生成抽象人物图形。'
        },
        {
          key: 'dossier_json',
          label: '人物档案 JSON',
          valueType: WorkflowIOValueTypeEnum.string,
          renderTypeList: [FlowNodeInputTypeEnum.reference, FlowNodeInputTypeEnum.textarea],
          required: true,
          toolDescription:
            '必填。建议包含 title、summary、tags、metrics、sections、entities、relations、sources。sections 里写履历、关系、影响力、风险等内容；bars/metrics 用于商业图表，evidence/proofs/facts/data_points 用于右侧事实卡。不要把“先确认/再核验/最后复查”这类流程提示当作 evidence。'
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
          toolDescription: '选填；相关公司、项目、产品、投资方和共同任职对象。'
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
