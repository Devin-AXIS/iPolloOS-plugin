import { defineTool } from '@tool/type';
import {
  FlowNodeInputTypeEnum,
  FlowNodeOutputTypeEnum,
  WorkflowIOValueTypeEnum
} from '@tool/type/ipolloos';

export default defineTool({
  name: {
    'zh-CN': '健康报告 · 单页 HTML',
    en: 'Health report · single-file HTML'
  },
  description: {
    'zh-CN':
      '生成与 AINO 生活助手「内容卡」相近的单文件 HTML：磨砂外卡、琥珀饮食芯片、营养条（蓝/绿/橙）、今日热量进度区；支持 meal_analysis_json 由识图 AI 填入后自动排版（能不能吃 + 原因）。',
    en: 'Single-file HTML styled like AINO life-assistant cards; optional meal_analysis_json from your vision model.'
  },
  toolDescription:
    '识图在对话/多模态节点完成。meal_analysis_json 支持：kcal、food_name、image_url、宏量、can_eat、verdict_reason、remaining{calories,protein,fat,carbs}（AINO「今日还可摄入」说明行）、analysis_points[]、closing_tip（AINO strategy 风营养解读）。main_inner_html 可空。发图一键整页也可用 life_photo_food_report_html。',
  versionList: [
    {
      value: '1.0.2',
      description: 'AINO 营养卡 remaining 行 + 营养解读卡 + 可选发图专页',
      inputs: [
        {
          key: 'page_title',
          label: '页面标题',
          valueType: WorkflowIOValueTypeEnum.string,
          renderTypeList: [FlowNodeInputTypeEnum.reference, FlowNodeInputTypeEnum.input],
          required: true,
          toolDescription: '<title>'
        },
        {
          key: 'heading_h1',
          label: '主标题 H1',
          valueType: WorkflowIOValueTypeEnum.string,
          renderTypeList: [FlowNodeInputTypeEnum.reference, FlowNodeInputTypeEnum.input],
          defaultValue: '',
          toolDescription: '可空=同标题'
        },
        {
          key: 'meal_analysis_json',
          label: '食物分析 JSON（识图 AI 输出）',
          valueType: WorkflowIOValueTypeEnum.string,
          renderTypeList: [FlowNodeInputTypeEnum.reference, FlowNodeInputTypeEnum.textarea],
          defaultValue: '',
          toolDescription:
            '必填 kcal；可选 food_name、protein_g、fat_g、carbs_g、can_eat(yes|caution|no 或中文)、verdict_reason、image_url(https)。'
        },
        {
          key: 'main_inner_html',
          label: '附加正文 HTML',
          valueType: WorkflowIOValueTypeEnum.string,
          renderTypeList: [FlowNodeInputTypeEnum.reference, FlowNodeInputTypeEnum.textarea],
          defaultValue: '',
          toolDescription: '可空；勿含 script；会包在内层卡片区'
        },
        {
          key: 'prepend_progress_card',
          label: '自动插入今日进度卡',
          valueType: WorkflowIOValueTypeEnum.boolean,
          renderTypeList: [FlowNodeInputTypeEnum.switch],
          defaultValue: true,
          toolDescription: '需同时填写 daily_targets_json 与 daily_state_json'
        },
        {
          key: 'daily_targets_json',
          label: '今日目标 JSON（可选）',
          valueType: WorkflowIOValueTypeEnum.string,
          renderTypeList: [FlowNodeInputTypeEnum.reference, FlowNodeInputTypeEnum.textarea],
          defaultValue: '',
          toolDescription: 'life_daily_targets 输出'
        },
        {
          key: 'daily_state_json',
          label: '当日累计 JSON（可选）',
          valueType: WorkflowIOValueTypeEnum.string,
          renderTypeList: [FlowNodeInputTypeEnum.reference, FlowNodeInputTypeEnum.textarea],
          defaultValue: '',
          toolDescription: 'life_daily_state_merge 输出'
        },
        {
          key: 'lang',
          label: '语言',
          valueType: WorkflowIOValueTypeEnum.string,
          renderTypeList: [FlowNodeInputTypeEnum.select],
          defaultValue: 'zh-CN',
          list: [
            { label: 'zh-CN', value: 'zh-CN' },
            { label: 'en', value: 'en' }
          ],
          toolDescription: ''
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
          ],
          toolDescription:
            '默认自动发布到平台对象存储；选资源中心需在服务端配置 PAGE_RESOURCE_CENTER_PUBLISH_URL；raw_html 供下游自建 OSS。'
        }
      ],
      outputs: [
        {
          valueType: WorkflowIOValueTypeEnum.string,
          key: 'page_html',
          label: '页面 HTML',
          description: '完整单文件'
        },
        {
          valueType: WorkflowIOValueTypeEnum.string,
          key: 'page_url',
          label: '页面公开链接',
          description: '自动发布或资源中心模式下由平台写入可访问链接；raw_html 时为空。'
        },
        {
          valueType: WorkflowIOValueTypeEnum.string,
          key: 'page_cover',
          label: '页面卡片',
          description: 'JSON 字符串。聊天端用它渲染健康报告的封面、摘要和营养字段预览。'
        },
        {
          valueType: WorkflowIOValueTypeEnum.string,
          key: 'full_html',
          label: '完整 HTML（兼容字段）'
        },
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
