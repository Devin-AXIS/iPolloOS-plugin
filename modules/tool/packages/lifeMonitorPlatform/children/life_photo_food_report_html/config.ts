import { defineTool } from '@tool/type';
import {
  FlowNodeInputTypeEnum,
  FlowNodeOutputTypeEnum,
  WorkflowIOValueTypeEnum
} from '@tool/type/ipolloos';

export default defineTool({
  name: {
    'zh-CN': '食物照片 · 分析报告页',
    en: 'Food photo · analysis report page'
  },
  description: {
    'zh-CN':
      '专用于「每次发食物图片 → 识图 AI 输出 JSON」生成整页报告：AINO 生活助手风营养卡（图、热量、宏量条、能不能吃、营养解读）+ 可选今日进度卡。',
    en: 'One-shot HTML report from vision model JSON: AINO-style meal card + optional daily progress card.'
  },
  toolDescription:
    '工作流：用户图 → 多模态节点 → 输出 meal_analysis_json（须含 kcal；建议含 image_url、food_name、can_eat、verdict_reason、remaining、analysis_points、closing_tip）→ 本节点 → page_html。可与 life_daily_targets / life_daily_state_merge 连线。',
  versionList: [
    {
      value: '1.0.0',
      description: '专用于发图报告',
      inputs: [
        {
          key: 'meal_analysis_json',
          label: '食物分析 JSON（识图必填）',
          valueType: WorkflowIOValueTypeEnum.string,
          renderTypeList: [FlowNodeInputTypeEnum.reference, FlowNodeInputTypeEnum.textarea],
          required: true,
          toolDescription:
            '示例见 life_health_report_html；建议含 image_url(https)、analysis_points 数组作报告要点。'
        },
        {
          key: 'page_title',
          label: '页面标题',
          valueType: WorkflowIOValueTypeEnum.string,
          renderTypeList: [FlowNodeInputTypeEnum.reference, FlowNodeInputTypeEnum.input],
          defaultValue: '本餐食物报告',
          toolDescription: '浏览器标题'
        },
        {
          key: 'heading_h1',
          label: '页内主标题',
          valueType: WorkflowIOValueTypeEnum.string,
          renderTypeList: [FlowNodeInputTypeEnum.reference, FlowNodeInputTypeEnum.input],
          defaultValue: '食物分析报告',
          toolDescription: '页面 H1'
        },
        {
          key: 'prepend_progress_card',
          label: '附带今日进度卡',
          valueType: WorkflowIOValueTypeEnum.boolean,
          renderTypeList: [FlowNodeInputTypeEnum.switch],
          defaultValue: true,
          toolDescription: '需同时填 daily_targets_json 与 daily_state_json'
        },
        {
          key: 'daily_targets_json',
          label: '今日目标 JSON',
          valueType: WorkflowIOValueTypeEnum.string,
          renderTypeList: [FlowNodeInputTypeEnum.reference, FlowNodeInputTypeEnum.textarea],
          defaultValue: '',
          toolDescription: '可选'
        },
        {
          key: 'daily_state_json',
          label: '当日累计 JSON',
          valueType: WorkflowIOValueTypeEnum.string,
          renderTypeList: [FlowNodeInputTypeEnum.reference, FlowNodeInputTypeEnum.textarea],
          defaultValue: '',
          toolDescription: '可选'
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
            '默认平台对象存储；资源中心需配置 PAGE_RESOURCE_CENTER_PUBLISH_URL；raw_html 接自建 OSS。'
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
          description: '自动发布或资源中心模式下由平台写入；raw_html 时为空。'
        },
        {
          valueType: WorkflowIOValueTypeEnum.string,
          key: 'page_cover',
          label: '页面卡片',
          description: 'JSON 字符串。聊天端用它渲染食物照片报告的封面、摘要和营养字段预览。'
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
