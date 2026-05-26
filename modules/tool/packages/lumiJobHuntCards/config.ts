import { defineTool } from '@tool/type';
import {
  FlowNodeInputTypeEnum,
  FlowNodeOutputTypeEnum,
  WorkflowIOValueTypeEnum
} from '@tool/type/ipolloos';
import { ToolTagEnum } from '@tool/type/tags';

export default defineTool({
  tags: [ToolTagEnum.enum.productivity],
  name: { 'zh-CN': 'App 求职卡片', en: 'App Job Hunt Cards' },
  description: {
    'zh-CN': '生成 App 求职号可渲染的简历诊断、职位匹配、面试准备和投递进度卡片。',
    en: 'Build structured App cards for resume review, job matching, interview prep and application tracking.'
  },
  toolDescription:
    '求职号结构化卡片工具。AI 根据用户意图选择 card_type；人工编排时也可以用下拉选择。card_data 填该卡片的数据 JSON，工具会输出 App 可渲染 payload。',
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
          defaultValue: 'job_match',
          list: [
            { label: '简历诊断卡', value: 'resume_diagnosis' },
            { label: '职位匹配卡', value: 'job_match' },
            { label: '面试准备卡', value: 'interview_prep' },
            { label: '投递进度卡', value: 'application_tracker' },
            { label: 'Offer 对比卡', value: 'offer_compare' },
            { label: '职业规划卡', value: 'career_plan' }
          ],
          toolDescription:
            '根据用户意图选择卡片类型：简历=resume_diagnosis，职位匹配=job_match，面试=interview_prep，投递=application_tracker，Offer=offer_compare，规划=career_plan。'
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
