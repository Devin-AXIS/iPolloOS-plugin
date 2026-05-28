import { defineTool } from '@tool/type';
import {
  FlowNodeInputTypeEnum,
  FlowNodeOutputTypeEnum,
  WorkflowIOValueTypeEnum
} from '@tool/type/ipolloos';
import { themeGuideForAgent, themeSelectList } from '../../lib/themes';

export default defineTool({
  name: {
    'zh-CN': '高级 · 幻灯片添加一页',
    en: 'Advanced · add one deck slide'
  },
  description: {
    'zh-CN':
      '高级精修工具：在已有 deck_state 上补充或重做单页。普通生成请优先使用「幻灯片 · 生成整套」。',
    en: 'Advanced refinement tool for adding one slide to an existing deck state.'
  },
  toolDescription: `【反复调用】首次 deck_state 留空 + deck_title + theme_id（五选一，不填则由你判断：${themeGuideForAgent()}）。每页：layout_id、title、body（要点每行一条）。图表页另填 chart_data；已有配图填 image_url；需要生成配图时填 image_prompt，本工具会输出带主题色和版式约束的 image_requests_json，随后调用图片生成/融合工具，把得到的 image_url 再用于本页或后续精修。流程图填 mermaid_code。完成后「导出网页」。图标和配图风格都跟随主题。`,
  versionList: [
    {
      value: '5.0.0',
      description: 'Minimal inputs; themed icons built-in',
      inputs: [
        {
          key: 'deck_state',
          label: 'deck_state',
          valueType: WorkflowIOValueTypeEnum.string,
          renderTypeList: [FlowNodeInputTypeEnum.reference, FlowNodeInputTypeEnum.textarea],
          toolDescription: '上一页返回；首次留空'
        },
        {
          key: 'deck_title',
          label: '演示标题',
          valueType: WorkflowIOValueTypeEnum.string,
          renderTypeList: [FlowNodeInputTypeEnum.reference, FlowNodeInputTypeEnum.input],
          toolDescription: '仅首次必填'
        },
        {
          key: 'theme_id',
          label: '主题（五选一）',
          valueType: WorkflowIOValueTypeEnum.string,
          renderTypeList: [FlowNodeInputTypeEnum.select, FlowNodeInputTypeEnum.reference],
          list: themeSelectList(),
          toolDescription: '仅首次生效；整套色组+图标+图表同色，勿自定义 hex'
        },
        {
          key: 'layout_id',
          label: '版式',
          valueType: WorkflowIOValueTypeEnum.string,
          renderTypeList: [FlowNodeInputTypeEnum.select, FlowNodeInputTypeEnum.reference],
          required: true,
          list: [
            { label: 'cover', value: 'cover' },
            { label: 'section', value: 'section' },
            { label: 'content', value: 'content' },
            { label: 'big_number', value: 'big_number' },
            { label: 'comparison', value: 'comparison' },
            { label: 'timeline', value: 'timeline' },
            { label: 'matrix', value: 'matrix' },
            { label: 'chart_focus', value: 'chart_focus' },
            { label: 'chart_story', value: 'chart_story' },
            { label: 'chart_compare', value: 'chart_compare' },
            { label: 'split_image', value: 'split_image' },
            { label: 'quote', value: 'quote' },
            { label: 'mermaid_focus', value: 'mermaid_focus' },
            { label: 'closing', value: 'closing' }
          ],
          toolDescription: '由你根据叙事选择'
        },
        {
          key: 'title',
          label: '标题',
          valueType: WorkflowIOValueTypeEnum.string,
          renderTypeList: [FlowNodeInputTypeEnum.reference, FlowNodeInputTypeEnum.input],
          toolDescription: '本页标题'
        },
        {
          key: 'body',
          label: '正文要点',
          valueType: WorkflowIOValueTypeEnum.string,
          renderTypeList: [FlowNodeInputTypeEnum.reference, FlowNodeInputTypeEnum.textarea],
          toolDescription: '每行一条；对比/时间线/矩阵也用它；图标颜色自动跟主题'
        },
        {
          key: 'chart_data',
          label: '图表数据',
          valueType: WorkflowIOValueTypeEnum.string,
          renderTypeList: [FlowNodeInputTypeEnum.reference, FlowNodeInputTypeEnum.textarea],
          placeholder: '2024,32\n2025,55\n---\n2024,12',
          toolDescription: 'chart_* 必填；双图对比用 --- 分隔两段数据'
        },
        {
          key: 'image_url',
          label: '图片 URL',
          valueType: WorkflowIOValueTypeEnum.string,
          renderTypeList: [FlowNodeInputTypeEnum.reference, FlowNodeInputTypeEnum.input],
          toolDescription:
            '已有图片时填写。若还没有图片，不要编造 URL，改填 image_prompt 让上游先生成主题一致的局部配图。'
        },
        {
          key: 'image_prompt',
          label: '配图生成需求',
          valueType: WorkflowIOValueTypeEnum.string,
          renderTypeList: [FlowNodeInputTypeEnum.reference, FlowNodeInputTypeEnum.textarea],
          toolDescription:
            '需要本页配图但还没有图片 URL 时填写。只描述局部图，不要要求生成整页 PPT；系统会自动追加主题色、版式和风格锁定。'
        },
        {
          key: 'image_role',
          label: '配图角色',
          valueType: WorkflowIOValueTypeEnum.string,
          renderTypeList: [FlowNodeInputTypeEnum.select, FlowNodeInputTypeEnum.reference],
          defaultValue: 'right_illustration',
          list: [
            { label: '右侧插图', value: 'right_illustration' },
            { label: '左侧插图', value: 'left_illustration' },
            { label: '背景主视觉', value: 'background_visual' },
            { label: '产品视觉', value: 'product_visual' },
            { label: '概念视觉', value: 'concept_visual' },
            { label: '纹理/氛围图', value: 'texture' }
          ],
          toolDescription: '决定图片尺寸、构图和插入位置的语义角色。'
        },
        {
          key: 'image_reference_urls',
          label: '参考图 URL',
          valueType: WorkflowIOValueTypeEnum.string,
          renderTypeList: [FlowNodeInputTypeEnum.reference, FlowNodeInputTypeEnum.textarea],
          toolDescription: '可选，每行一个 URL。需要图生图/多图融合时给上游图片融合工具使用。'
        },
        {
          key: 'image_size',
          label: '配图尺寸',
          valueType: WorkflowIOValueTypeEnum.string,
          renderTypeList: [FlowNodeInputTypeEnum.select, FlowNodeInputTypeEnum.reference],
          defaultValue: '1536x1024',
          list: [
            { label: '1536 × 1024（横向插图）', value: '1536x1024' },
            { label: '2048 × 1152（16:9 主视觉）', value: '2048x1152' },
            { label: '1024 × 1024（方图）', value: '1024x1024' },
            { label: '1024 × 1536（竖图）', value: '1024x1536' }
          ],
          toolDescription: '传给图片生成工具的目标尺寸。'
        },
        {
          key: 'mermaid_code',
          label: 'Mermaid',
          valueType: WorkflowIOValueTypeEnum.string,
          renderTypeList: [FlowNodeInputTypeEnum.reference, FlowNodeInputTypeEnum.textarea],
          toolDescription: 'mermaid_focus 必填'
        }
      ],
      outputs: [
        { valueType: WorkflowIOValueTypeEnum.string, key: 'deck_state', label: 'deck_state' },
        { valueType: WorkflowIOValueTypeEnum.number, key: 'slide_count', label: '页数' },
        { valueType: WorkflowIOValueTypeEnum.string, key: 'theme_id', label: '主题 id' },
        { valueType: WorkflowIOValueTypeEnum.string, key: 'theme_label', label: '主题名' },
        { valueType: WorkflowIOValueTypeEnum.string, key: 'summary', label: '摘要' },
        {
          valueType: WorkflowIOValueTypeEnum.string,
          key: 'image_requests_json',
          label: '待生成配图请求'
        },
        {
          valueType: WorkflowIOValueTypeEnum.number,
          key: 'pending_image_count',
          label: '待生成配图数'
        },
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
