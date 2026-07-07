import { defineTool } from '@tool/type';
import {
  FlowNodeInputTypeEnum,
  FlowNodeOutputTypeEnum,
  WorkflowIOValueTypeEnum
} from '@tool/type/ipolloos';

export default defineTool({
  name: {
    'zh-CN': 'CIDMS 图像生成',
    en: 'CIDMS Image Generation'
  },
  description: {
    'zh-CN': '通过 CIDMS 网关生成图片，支持 gpt-image 与 Gemini 图片模型。',
    en: 'Generate images through CIDMS with gpt-image and Gemini image models.'
  },
  toolDescription:
    'Use CIDMS image generation. For gpt-image models, size/quality/output format apply. For Gemini image models, aspect ratio and image size apply.',
  versionList: [
    {
      value: '1.1.4',
      description: '支持 gpt-image 与 Gemini 图片生成',
      inputs: [
        {
          key: 'model',
          label: '模型',
          valueType: WorkflowIOValueTypeEnum.string,
          renderTypeList: [FlowNodeInputTypeEnum.select, FlowNodeInputTypeEnum.reference],
          required: true,
          defaultValue: 'gpt-image-2',
          list: [
            { label: 'gpt-image-2', value: 'gpt-image-2' },
            { label: 'gemini-3-pro-image-preview', value: 'gemini-3-pro-image-preview' },
            { label: 'gemini-3.1-flash-image-preview', value: 'gemini-3.1-flash-image-preview' },
            { label: 'gemini-2.5-flash-image', value: 'gemini-2.5-flash-image' }
          ]
        },
        {
          key: 'prompt',
          label: '图像描述',
          valueType: WorkflowIOValueTypeEnum.string,
          renderTypeList: [FlowNodeInputTypeEnum.textarea, FlowNodeInputTypeEnum.reference],
          required: true
        },
        {
          key: 'size',
          label: 'gpt-image 尺寸',
          valueType: WorkflowIOValueTypeEnum.string,
          renderTypeList: [FlowNodeInputTypeEnum.select, FlowNodeInputTypeEnum.reference],
          defaultValue: '2048x2048',
          list: [
            { label: '1024x1024', value: '1024x1024' },
            { label: '2048x2048', value: '2048x2048' },
            { label: '1024x1536', value: '1024x1536' },
            { label: '1536x1024', value: '1536x1024' }
          ]
        },
        {
          key: 'quality',
          label: 'gpt-image 质量',
          valueType: WorkflowIOValueTypeEnum.string,
          renderTypeList: [FlowNodeInputTypeEnum.select, FlowNodeInputTypeEnum.reference],
          defaultValue: 'low',
          list: [
            { label: '低', value: 'low' },
            { label: '标准', value: 'medium' },
            { label: '高', value: 'high' }
          ]
        },
        {
          key: 'output_format',
          label: 'gpt-image 格式',
          valueType: WorkflowIOValueTypeEnum.string,
          renderTypeList: [FlowNodeInputTypeEnum.select, FlowNodeInputTypeEnum.reference],
          defaultValue: 'png',
          list: [
            { label: 'PNG', value: 'png' },
            { label: 'JPEG', value: 'jpeg' }
          ]
        },
        {
          key: 'aspect_ratio',
          label: 'Gemini 画幅',
          valueType: WorkflowIOValueTypeEnum.string,
          renderTypeList: [FlowNodeInputTypeEnum.select, FlowNodeInputTypeEnum.reference],
          defaultValue: '1:1',
          list: [
            { label: '1:1', value: '1:1' },
            { label: '16:9', value: '16:9' },
            { label: '9:16', value: '9:16' },
            { label: '4:3', value: '4:3' },
            { label: '3:4', value: '3:4' }
          ]
        },
        {
          key: 'image_size',
          label: 'Gemini 图片尺寸',
          valueType: WorkflowIOValueTypeEnum.string,
          renderTypeList: [FlowNodeInputTypeEnum.select, FlowNodeInputTypeEnum.reference],
          defaultValue: '2K',
          list: [
            { label: '默认', value: '' },
            { label: '0.5K', value: '0.5K' },
            { label: '1K', value: '1K' },
            { label: '2K', value: '2K' },
            { label: '4K', value: '4K' }
          ]
        }
      ],
      outputs: [
        { valueType: WorkflowIOValueTypeEnum.string, key: 'image_url', label: '图片链接' },
        { valueType: WorkflowIOValueTypeEnum.string, key: 'mime_type', label: '图片类型' },
        { valueType: WorkflowIOValueTypeEnum.string, key: 'text', label: '模型文本' },
        { valueType: WorkflowIOValueTypeEnum.string, key: 'detail_json', label: '接口返回 JSON' },
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
