import { defineTool } from '@tool/type';
import {
  FlowNodeInputTypeEnum,
  FlowNodeOutputTypeEnum,
  WorkflowIOValueTypeEnum
} from '@tool/type/ipolloos';

export default defineTool({
  name: {
    'zh-CN': '识餐参数 · 打包给模型',
    en: 'Food params · bundle for model'
  },
  description: {
    'zh-CN':
      '不执行识图：将图片 URL、文字描述、意图（能不能吃 / 已吃）与档案、今日目标、当日累计打包为 JSON，供上游多模态或对话节点使用。',
    en: 'Pack image URL, text, intent, profile, targets and daily state into JSON for a vision model.'
  },
  toolDescription:
    'intent=can_eat 仅咨询；already_eaten 记账。识图完成后请让模型输出 meal_analysis_json 供 life_photo_food_report_html / life_health_report_html 使用，示例：{"food_name":"藜麦鸡胸碗","kcal":520,"protein_g":42,"fat_g":14,"carbs_g":48,"image_url":"https://...","can_eat":"yes","verdict_reason":"未明显超今日剩余","remaining":{"calories":780,"protein":35},"analysis_points":["膳食纤维尚可","钠不高"],"closing_tip":"下一餐可搭配深色蔬菜。"}',
  versionList: [
    {
      value: '1.0.0',
      description: '首版',
      inputs: [
        {
          key: 'image_url',
          label: '食物图片 URL（可空）',
          valueType: WorkflowIOValueTypeEnum.string,
          renderTypeList: [FlowNodeInputTypeEnum.reference, FlowNodeInputTypeEnum.input],
          defaultValue: '',
          toolDescription: 'https://，由上游上传或系统变量提供'
        },
        {
          key: 'food_text',
          label: '食物文字描述',
          valueType: WorkflowIOValueTypeEnum.string,
          renderTypeList: [FlowNodeInputTypeEnum.reference, FlowNodeInputTypeEnum.textarea],
          defaultValue: '',
          toolDescription: '用户或模型对餐食的文字说明'
        },
        {
          key: 'intent',
          label: '意图',
          valueType: WorkflowIOValueTypeEnum.string,
          renderTypeList: [FlowNodeInputTypeEnum.reference, FlowNodeInputTypeEnum.select],
          required: true,
          list: [
            { label: '能不能吃（咨询）', value: 'can_eat' },
            { label: '已经吃了（记账）', value: 'already_eaten' }
          ],
          toolDescription: '区分是否写入累计'
        },
        {
          key: 'profile_json',
          label: '档案 JSON',
          valueType: WorkflowIOValueTypeEnum.string,
          renderTypeList: [FlowNodeInputTypeEnum.reference, FlowNodeInputTypeEnum.textarea],
          required: true,
          toolDescription: 'life_profile_pack'
        },
        {
          key: 'daily_targets_json',
          label: '今日目标 JSON',
          valueType: WorkflowIOValueTypeEnum.string,
          renderTypeList: [FlowNodeInputTypeEnum.reference, FlowNodeInputTypeEnum.textarea],
          required: true,
          toolDescription: 'life_daily_targets'
        },
        {
          key: 'daily_state_json',
          label: '当日累计 JSON',
          valueType: WorkflowIOValueTypeEnum.string,
          renderTypeList: [FlowNodeInputTypeEnum.reference, FlowNodeInputTypeEnum.textarea],
          defaultValue: '{}',
          toolDescription: '可为空对象；life_daily_state_merge 的输出再喂回'
        }
      ],
      outputs: [
        {
          valueType: WorkflowIOValueTypeEnum.string,
          key: 'food_tool_params_json',
          label: '模型用参数 JSON',
          description: '整包上下文，建议原样传给多模态系统提示或工具'
        },
        { valueType: WorkflowIOValueTypeEnum.string, key: 'hint_zh', label: '简短中文提示' },
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
