import { defineTool } from '@tool/type';
import {
  FlowNodeInputTypeEnum,
  FlowNodeOutputTypeEnum,
  WorkflowIOValueTypeEnum
} from '@tool/type/ipolloos';
import { ToolTagEnum } from '@tool/type/tags';

export default defineTool({
  tags: [ToolTagEnum.enum.productivity],
  name: {
    'zh-CN': 'App 健康生活卡片',
    en: 'App Health & Life Cards'
  },
  description: {
    'zh-CN': '生成 App 生活号可渲染的饮食、喝水、运动、热量和身体指标结构化卡片。',
    en: 'Build structured App cards for food, hydration, exercise, calories and body metrics.'
  },
  toolDescription:
    '生活号结构化卡片工具。AI 根据用户意图选择 card_type；人工编排时也可以用下拉选择。card_data 填该卡片的数据 JSON，工具会输出 App 可渲染 payload。',
  versionList: [
    {
      value: '1.1.0',
      description: '新增 card_type 显式选择，支持 AI 自动选择和人工下拉配置',
      inputs: [
        {
          key: 'card_type',
          label: '卡片类型',
          valueType: WorkflowIOValueTypeEnum.string,
          renderTypeList: [FlowNodeInputTypeEnum.select, FlowNodeInputTypeEnum.reference],
          required: true,
          defaultValue: 'daily_calorie',
          list: [
            {
              label: '饮食记录卡',
              value: 'meal_log',
              description: '记录一餐或一次食物识别结果，适合“我刚吃了…”“拍一下食物”。'
            },
            {
              label: '营养总结卡',
              value: 'nutrition_summary',
              description: '汇总蛋白质、脂肪、碳水、钠、纤维等营养结构。'
            },
            {
              label: '喝水卡',
              value: 'water_intake',
              description: '记录饮水量、目标进度和补水提醒。'
            },
            {
              label: '运动记录卡',
              value: 'exercise_log',
              description: '记录训练、步数、消耗热量、时长和运动建议。'
            },
            {
              label: '今日热量卡',
              value: 'daily_calorie',
              description: '展示今日已摄入、目标、剩余额度和热量判断。'
            },
            {
              label: '身体指标卡',
              value: 'body_metric',
              description: '展示体重、BMI、体脂、腰围等身体数据。'
            },
            {
              label: '健康目标卡',
              value: 'health_goal',
              description: '展示减脂、增肌、控糖、饮食计划等目标进度。'
            }
          ],
          toolDescription:
            '根据用户意图选择卡片类型：食物/拍照=meal_log，热量额度=daily_calorie，喝水=water_intake，运动=exercise_log，体重/BMI=body_metric，目标计划=health_goal，营养宏量=nutrition_summary。'
        },
        {
          key: 'card_data',
          label: '卡片数据 JSON',
          valueType: WorkflowIOValueTypeEnum.object,
          renderTypeList: [FlowNodeInputTypeEnum.JSONEditor, FlowNodeInputTypeEnum.reference],
          required: true,
          toolDescription:
            '该卡片的数据对象。示例 daily_calorie: {"consumed":520,"target":1800,"remaining":1280,"status":"ok"}。'
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
          key: 'reply_text',
          label: '回复文本',
          valueType: WorkflowIOValueTypeEnum.string,
          renderTypeList: [FlowNodeInputTypeEnum.reference, FlowNodeInputTypeEnum.textarea],
          defaultValue: '',
          toolDescription: '卡片前的简短自然语言说明，可空。'
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
          ],
          toolDescription: '默认 auto；需要固定进标签栏时选 tab。'
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
          ],
          toolDescription: '标签栏数据类卡片通常用 replace，对话流水卡片通常用 append。'
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
