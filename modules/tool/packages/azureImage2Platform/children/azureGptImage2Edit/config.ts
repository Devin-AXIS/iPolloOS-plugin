import { defineTool } from '@tool/type';
import {
  FlowNodeInputTypeEnum,
  FlowNodeOutputTypeEnum,
  WorkflowIOValueTypeEnum
} from '@tool/type/ipolloos';

export default defineTool({
  name: {
    'zh-CN': 'Azure GPT-Image-2 图生图 / 改图',
    en: 'Azure GPT-Image-2 image edit / img2img'
  },
  description: {
    'zh-CN':
      '基于 **images/edits**：用 1～8 张参考图按提示词合成或修改画面；可选 **mask** 指定大致编辑区域（模型仅作引导，未必严格贴边）。输出与文生图相同（Markdown + data URL）。',
    en: 'Uses **images/edits** with 1–8 reference images and a prompt; optional **mask** guides the edit region. Same outputs as text-to-image.'
  },
  versionList: [
    {
      value: '1.0.0',
      description: '首版：multipart images/edits，多参考图 + 可选 mask',
      inputs: [
        {
          key: 'prompt',
          label: '编辑说明 / 目标画面',
          valueType: WorkflowIOValueTypeEnum.string,
          renderTypeList: [FlowNodeInputTypeEnum.reference, FlowNodeInputTypeEnum.textarea],
          required: true,
          description: '说明要如何改图或如何融合多张参考图。'
        },
        {
          key: 'image_inputs',
          label: '参考图（每行一张）',
          valueType: WorkflowIOValueTypeEnum.string,
          renderTypeList: [FlowNodeInputTypeEnum.reference, FlowNodeInputTypeEnum.textarea],
          required: true,
          description:
            '1～8 行。每行：图片 HTTPS 直链，或 data:image/png;base64,...，或不含前缀的纯 base64。'
        },
        {
          key: 'mask_input',
          label: '遮罩图（可选）',
          valueType: WorkflowIOValueTypeEnum.string,
          renderTypeList: [FlowNodeInputTypeEnum.reference, FlowNodeInputTypeEnum.textarea],
          description:
            '与官方一致：多参考图时 mask 作用于**第一张**。透明/灰度语义以模型为准；可留空。'
        },
        {
          key: 'size',
          label: '输出尺寸',
          valueType: WorkflowIOValueTypeEnum.string,
          renderTypeList: [FlowNodeInputTypeEnum.select, FlowNodeInputTypeEnum.reference],
          required: true,
          defaultValue: 'auto',
          list: [
            { label: 'auto', value: 'auto' },
            { label: '1024 × 1024', value: '1024x1024' },
            { label: '1536 × 1024', value: '1536x1024' },
            { label: '1024 × 1536', value: '1024x1536' },
            { label: '2048 × 2048', value: '2048x2048' },
            { label: '2048 × 1152', value: '2048x1152' },
            { label: '3840 × 2160（4K 横）', value: '3840x2160' },
            { label: '2160 × 3840（4K 竖）', value: '2160x3840' },
            { label: '自定义 WxH', value: 'custom' }
          ],
          description: '与文生图相同的尺寸选项与自定义校验。'
        },
        {
          key: 'size_custom',
          label: '自定义尺寸 WxH',
          valueType: WorkflowIOValueTypeEnum.string,
          renderTypeList: [FlowNodeInputTypeEnum.input, FlowNodeInputTypeEnum.reference],
          placeholder: '如 1920x1080',
          description: '仅当尺寸选「自定义」时必填。'
        },
        {
          key: 'n',
          label: '输出张数 n',
          valueType: WorkflowIOValueTypeEnum.number,
          renderTypeList: [FlowNodeInputTypeEnum.numberInput, FlowNodeInputTypeEnum.reference],
          required: true,
          defaultValue: 1
        },
        {
          key: 'quality',
          label: '质量',
          valueType: WorkflowIOValueTypeEnum.string,
          renderTypeList: [FlowNodeInputTypeEnum.select, FlowNodeInputTypeEnum.reference],
          required: true,
          defaultValue: 'auto',
          list: [
            { label: 'auto', value: 'auto' },
            { label: 'low', value: 'low' },
            { label: 'medium', value: 'medium' },
            { label: 'high', value: 'high' }
          ]
        },
        {
          key: 'output_format',
          label: '输出格式',
          valueType: WorkflowIOValueTypeEnum.string,
          renderTypeList: [FlowNodeInputTypeEnum.select, FlowNodeInputTypeEnum.reference],
          required: true,
          defaultValue: 'png',
          list: [
            { label: 'PNG', value: 'png' },
            { label: 'JPEG', value: 'jpeg' },
            { label: 'WebP', value: 'webp' }
          ]
        },
        {
          key: 'output_compression',
          label: 'JPEG/WebP 压缩 0–100',
          valueType: WorkflowIOValueTypeEnum.number,
          renderTypeList: [FlowNodeInputTypeEnum.numberInput, FlowNodeInputTypeEnum.reference],
          defaultValue: 90,
          description: '仅 jpeg/webp 生效。'
        }
      ],
      outputs: [
        {
          valueType: WorkflowIOValueTypeEnum.string,
          key: 'markdown_image',
          label: 'Markdown 图片（可多张）',
          description: '同文生图'
        },
        {
          valueType: WorkflowIOValueTypeEnum.string,
          key: 'image_data_url',
          label: '首张 Data URL 或 URL',
          description: '同文生图'
        },
        {
          valueType: WorkflowIOValueTypeEnum.string,
          key: 'all_image_data_urls_json',
          label: '全部图片 JSON 数组',
          description: '同文生图'
        },
        {
          valueType: WorkflowIOValueTypeEnum.string,
          key: 'mime_type',
          label: '首张 MIME',
          description: '同文生图'
        },
        {
          valueType: WorkflowIOValueTypeEnum.string,
          key: 'raw_b64',
          label: '首张纯 Base64',
          description: '同文生图'
        },
        {
          valueType: WorkflowIOValueTypeEnum.string,
          key: 'image_url',
          label: '首张 HTTPS 链',
          description: '同文生图'
        },
        {
          valueType: WorkflowIOValueTypeEnum.string,
          key: 'minimal_json',
          label: '元数据 JSON',
          description: '含 endpoint_kind=edits、ref_image_count 等'
        },
        {
          type: FlowNodeOutputTypeEnum.error,
          valueType: WorkflowIOValueTypeEnum.string,
          key: 'system_error',
          label: '错误信息'
        }
      ]
    }
  ]
});
