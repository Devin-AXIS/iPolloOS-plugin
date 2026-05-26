import { defineTool } from '@tool/type';
import {
  FlowNodeInputTypeEnum,
  FlowNodeOutputTypeEnum,
  WorkflowIOValueTypeEnum
} from '@tool/type/ipolloos';
import { ToolTagEnum } from '@tool/type/tags';

export default defineTool({
  tags: [ToolTagEnum.enum.entertainment, ToolTagEnum.enum.productivity],
  name: { 'zh-CN': 'App 短视频卡片', en: 'App Short Video Cards' },
  description: {
    'zh-CN': '生成 App 短视频号可渲染的脚本、分镜、成片进度和投放复盘卡片。',
    en: 'Build structured App cards for scripts, storyboards, production progress and campaign review.'
  },
  toolDescription:
    '短视频号结构化卡片工具。AI 根据用户意图选择 card_type；人工编排时也可以用下拉选择。card_data 填该卡片的数据 JSON，工具会输出 App 可渲染 payload。',
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
          defaultValue: 'video_script',
          list: [
            { label: '视频脚本卡', value: 'video_script' },
            { label: '分镜卡', value: 'shot_list' },
            { label: '成片进度卡', value: 'production_progress' },
            { label: '发布清单卡', value: 'publish_checklist' },
            { label: '投放复盘卡', value: 'campaign_review' },
            { label: '开头钩子卡', value: 'hook_options' }
          ],
          toolDescription:
            '根据用户意图选择卡片类型：脚本=video_script，分镜=shot_list，进度=production_progress，发布=publish_checklist，复盘=campaign_review，开头钩子=hook_options。'
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
