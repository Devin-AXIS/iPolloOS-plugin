import { defineTool } from '@tool/type';
import {
  FlowNodeInputTypeEnum,
  FlowNodeOutputTypeEnum,
  WorkflowIOValueTypeEnum
} from '@tool/type/ipolloos';

export default defineTool({
  name: {
    'zh-CN': '竞争情报系统 · 关系概览',
    en: 'Competitive Intelligence System · relationship overview'
  },
  description: {
    'zh-CN': '把公司、人、产品、技术之间的多对象关系渲染成可点击的关系概览。',
    en: 'Render multi-object relationship intelligence into an interactive overview page.'
  },
  toolDescription:
    '竞争情报系统的关系模板。它不是普通档案页，而是多对象对比页。上游 AI/Agent 负责查公司和公司、公司和人、公司和产品、人和人、产品和技术之间的关系，并填写 dossier_json、entities_json 和证据来源。生成页面前，上游可搜索品牌组合图、对象 Logo 或生成一张关系主题图，填入 visual_image_url；搜不到就留空。本工具负责稳定渲染：关系概览、核心指标、关系强度、证据路径、对象小档案和左侧返回；有图时做带蒙版的杂志封面。',
  versionList: [
    {
      value: '0.1.6',
      description: 'Interactive relationship overview renderer with masked cover visual',
      inputs: [
        {
          key: 'relation_subject',
          label: '关系对象',
          valueType: WorkflowIOValueTypeEnum.string,
          renderTypeList: [FlowNodeInputTypeEnum.reference, FlowNodeInputTypeEnum.input],
          required: true,
          toolDescription: '要分析的一组对象，例如三家公司、一个人和一家公司、公司和产品。'
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
          label: '关系判断重点',
          valueType: WorkflowIOValueTypeEnum.string,
          renderTypeList: [FlowNodeInputTypeEnum.reference, FlowNodeInputTypeEnum.textarea],
          defaultValue: '',
          toolDescription: '选填；例如合作关系、竞争关系、资本关系、人员关系、风险冲突。'
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
          label: '关系概览封面图 URL',
          valueType: WorkflowIOValueTypeEnum.string,
          renderTypeList: [FlowNodeInputTypeEnum.reference, FlowNodeInputTypeEnum.input],
          defaultValue: '',
          toolDescription: '选填；多对象关系图、品牌组合图或生成图。未传时插件不再生成抽象图形。'
        },
        {
          key: 'image_search_query',
          label: '关系图片搜索词',
          valueType: WorkflowIOValueTypeEnum.string,
          renderTypeList: [FlowNodeInputTypeEnum.reference, FlowNodeInputTypeEnum.input],
          defaultValue: '',
          toolDescription:
            '选填；给上游 Agent 的图片搜索提示，例如“公司 A 公司 B logo”或“主题 relationship visual”。插件不会直接搜索。'
        },
        {
          key: 'dossier_json',
          label: '关系概览 JSON',
          valueType: WorkflowIOValueTypeEnum.string,
          renderTypeList: [FlowNodeInputTypeEnum.reference, FlowNodeInputTypeEnum.textarea],
          required: true,
          toolDescription:
            '必填。建议包含 title、summary、tags、metrics、sections、relations、sources。relations 用 from/to/label/strength/proof 描述关系路径；sections 中 bars/metrics 用于对比图表，evidence/proofs/facts/data_points 用于事实卡。不要把“先确认/再核验/最后复查”这类流程提示当作 evidence。'
        },
        {
          key: 'entities_json',
          label: '对象列表 JSON',
          valueType: WorkflowIOValueTypeEnum.string,
          renderTypeList: [FlowNodeInputTypeEnum.reference, FlowNodeInputTypeEnum.textarea],
          defaultValue: '',
          toolDescription:
            '强烈建议填写。数组项建议包含 id、name、type、summary、facts，用于关系图里的对象小档案入口。'
        },
        {
          key: 'evidence_json',
          label: '来源/证据 JSON',
          valueType: WorkflowIOValueTypeEnum.string,
          renderTypeList: [FlowNodeInputTypeEnum.reference, FlowNodeInputTypeEnum.textarea],
          defaultValue: ''
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
