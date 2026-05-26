import { defineTool } from '@tool/type';
import {
  FlowNodeInputTypeEnum,
  FlowNodeOutputTypeEnum,
  WorkflowIOValueTypeEnum
} from '@tool/type/ipolloos';
import { ToolTagEnum } from '@tool/type/tags';

export default defineTool({
  tags: [ToolTagEnum.enum.productivity],
  name: { 'zh-CN': 'App 行业分析卡片', en: 'App Industry Analysis Cards' },
  description: {
    'zh-CN': '生成 App 行业分析号可渲染的行业速览、趋势、概念验证、案例和方案地图卡片。',
    en: 'Build structured App cards for industry snapshots, trends, validation, cases and solution maps.'
  },
  toolDescription:
    '行业分析号结构化卡片工具。AI 根据用户意图选择 card_type；人工编排时也可以用下拉选择。card_data 填该卡片的数据 JSON，工具会输出 App 可渲染 payload。',
  versionList: [
    {
      value: '1.1.0',
      description: '新增 card_type 显式选择，支持 AI 自动选择和人工下拉配置',
      inputs: [
        {
          key: 'reply_text',
          label: '回复文本',
          valueType: WorkflowIOValueTypeEnum.string,
          renderTypeList: [FlowNodeInputTypeEnum.reference, FlowNodeInputTypeEnum.textarea],
          defaultValue: '',
          toolDescription: '卡片前的简短说明，可空。'
        },
        {
          key: 'card_type',
          label: '卡片类型',
          valueType: WorkflowIOValueTypeEnum.string,
          renderTypeList: [FlowNodeInputTypeEnum.select, FlowNodeInputTypeEnum.reference],
          required: true,
          defaultValue: 'industry_snapshot',
          list: [
            { label: '行业速览卡', value: 'industry_snapshot' },
            { label: '趋势信号卡', value: 'trend_signal' },
            { label: '概念验证卡', value: 'concept_validation' },
            { label: '案例研究卡', value: 'case_study' },
            { label: '方案地图卡', value: 'solution_map' },
            { label: '风险观察卡', value: 'risk_watch' }
          ],
          toolDescription:
            '根据用户意图选择卡片类型：行业概览=industry_snapshot，趋势=trend_signal，概念验证=concept_validation，案例=case_study，方案=solution_map，风险=risk_watch。'
        },
        {
          key: 'card_data',
          label: '卡片数据 JSON',
          valueType: WorkflowIOValueTypeEnum.object,
          renderTypeList: [FlowNodeInputTypeEnum.JSONEditor, FlowNodeInputTypeEnum.reference],
          required: true,
          toolDescription: '该卡片的数据对象。'
        },
        {
          key: 'title',
          label: '卡片标题',
          valueType: WorkflowIOValueTypeEnum.string,
          renderTypeList: [FlowNodeInputTypeEnum.input, FlowNodeInputTypeEnum.reference],
          defaultValue: '',
          toolDescription: '可空；为空时由 App 前端按 card_type 使用默认标题。'
        },
        {
          key: 'placement',
          label: '展示位置',
          valueType: WorkflowIOValueTypeEnum.string,
          renderTypeList: [FlowNodeInputTypeEnum.select, FlowNodeInputTypeEnum.reference],
          defaultValue: 'auto',
          list: [
            { label: '自动', value: 'auto' },
            { label: '对话消息', value: 'message' },
            { label: '标签栏', value: 'tab' }
          ]
        },
        {
          key: 'update_mode',
          label: '更新方式',
          valueType: WorkflowIOValueTypeEnum.string,
          renderTypeList: [FlowNodeInputTypeEnum.select, FlowNodeInputTypeEnum.reference],
          defaultValue: 'append',
          list: [
            { label: '追加', value: 'append' },
            { label: '替换同类型卡片', value: 'replace' }
          ]
        }
      ],
      outputs: [
        { key: 'answer_text', label: '回复文本', valueType: WorkflowIOValueTypeEnum.string },
        {
          key: 'app_cards_payload',
          label: 'App 卡片 Payload',
          valueType: WorkflowIOValueTypeEnum.object
        },
        {
          key: 'app_cards_json',
          label: 'App 卡片 JSON',
          valueType: WorkflowIOValueTypeEnum.string
        },
        {
          key: 'app_cards_comment',
          label: 'App 卡片标记',
          valueType: WorkflowIOValueTypeEnum.string
        },
        { key: 'card_count', label: '卡片数量', valueType: WorkflowIOValueTypeEnum.number },
        {
          key: 'selected_card_type',
          label: '已选卡片类型',
          valueType: WorkflowIOValueTypeEnum.string
        },
        {
          key: 'allowed_card_types',
          label: '允许类型',
          valueType: WorkflowIOValueTypeEnum.arrayString
        },
        {
          type: FlowNodeOutputTypeEnum.error,
          key: 'system_error',
          label: '错误',
          valueType: WorkflowIOValueTypeEnum.string
        }
      ]
    }
  ]
});
