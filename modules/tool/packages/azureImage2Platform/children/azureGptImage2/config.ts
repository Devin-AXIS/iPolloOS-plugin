import { defineTool } from '@tool/type';
import {
  FlowNodeInputTypeEnum,
  FlowNodeOutputTypeEnum,
  WorkflowIOValueTypeEnum
} from '@tool/type/ipolloos';

export default defineTool({
  name: {
    'zh-CN': 'Azure GPT-Image-2 文生图',
    en: 'Azure GPT-Image-2 text-to-image'
  },
  description: {
    'zh-CN':
      '通过 **Azure OpenAI / Foundry** 的 **gpt-image-2** 部署文生图。支持常用尺寸（含 2K/4K、auto）、自定义合规分辨率、quality/background、PNG/JPEG/WebP 与多图输出聚合。',
    en: 'Text-to-image via **gpt-image-2** on Azure OpenAI / Foundry: preset sizes (2K/4K, auto), validated custom sizes, quality/background, PNG/JPEG/WebP, multi-image output.'
  },
  versionList: [
    {
      value: '1.2.0',
      description:
        '资源配置精简；内置 api-version；去掉 moderation/body_model 表单项（审核走服务端默认）',
      inputs: [
        {
          key: 'prompt',
          label: '提示词',
          valueType: WorkflowIOValueTypeEnum.string,
          renderTypeList: [FlowNodeInputTypeEnum.reference, FlowNodeInputTypeEnum.textarea],
          required: true,
          description: '描述画面；支持多语言。'
        },
        {
          key: 'size',
          label: '尺寸',
          valueType: WorkflowIOValueTypeEnum.string,
          renderTypeList: [FlowNodeInputTypeEnum.select, FlowNodeInputTypeEnum.reference],
          required: true,
          defaultValue: 'auto',
          list: [
            { label: 'auto（由模型根据提示选择）', value: 'auto' },
            { label: '1024 × 1024（方图）', value: '1024x1024' },
            { label: '1536 × 1024（横图）', value: '1536x1024' },
            { label: '1024 × 1536（竖图）', value: '1024x1536' },
            { label: '2048 × 2048（2K 方图）', value: '2048x2048' },
            { label: '2048 × 1152（2K 横图）', value: '2048x1152' },
            { label: '3840 × 2160（4K 横图）', value: '3840x2160' },
            { label: '2160 × 3840（4K 竖图）', value: '2160x3840' },
            { label: '自定义（见下方 WxH）', value: 'custom' }
          ],
          description: '与 OpenAI GPT-Image-2 文档「Popular sizes」一致；自定义时填写 size_custom。'
        },
        {
          key: 'size_custom',
          label: '自定义尺寸 WxH',
          valueType: WorkflowIOValueTypeEnum.string,
          renderTypeList: [FlowNodeInputTypeEnum.input, FlowNodeInputTypeEnum.reference],
          placeholder: '例如 1920x1080（须满足 16 倍数与像素范围）',
          description:
            '仅当「尺寸」为自定义时必填。宽x高均为 16 的倍数；长边≤3840；长宽比≤3:1；总像素在 655360～8294400。'
        },
        {
          key: 'n',
          label: '生成张数 n',
          valueType: WorkflowIOValueTypeEnum.number,
          renderTypeList: [FlowNodeInputTypeEnum.numberInput, FlowNodeInputTypeEnum.reference],
          required: true,
          defaultValue: 1,
          description: '多图时 markdown_image 会拼接多段；具体上限以部署策略为准。'
        },
        {
          key: 'quality',
          label: '质量',
          valueType: WorkflowIOValueTypeEnum.string,
          renderTypeList: [FlowNodeInputTypeEnum.select, FlowNodeInputTypeEnum.reference],
          required: true,
          defaultValue: 'auto',
          list: [
            { label: 'auto（默认，由模型选择）', value: 'auto' },
            { label: 'low（最快）', value: 'low' },
            { label: 'medium', value: 'medium' },
            { label: 'high', value: 'high' }
          ],
          description: '官方 quality；auto 适合让模型随 prompt 权衡。'
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
            { label: 'JPEG（可压测延迟）', value: 'jpeg' },
            { label: 'WebP', value: 'webp' }
          ],
          description: 'jpeg/webp 可配 output_compression；透明背景仅 png。'
        },
        {
          key: 'background',
          label: '背景',
          valueType: WorkflowIOValueTypeEnum.string,
          renderTypeList: [FlowNodeInputTypeEnum.select, FlowNodeInputTypeEnum.reference],
          required: true,
          defaultValue: 'auto',
          list: [
            { label: 'auto', value: 'auto' },
            { label: 'transparent（仅 GPT-Image-1 系部署）', value: 'transparent' }
          ],
          description:
            'OpenAI 文档：gpt-image-2 **不支持** transparent；若部署为 gpt-image-2 请保持 auto，否则接口可能报错。'
        },
        {
          key: 'output_compression',
          label: 'JPEG/WebP 压缩 0–100',
          valueType: WorkflowIOValueTypeEnum.number,
          renderTypeList: [FlowNodeInputTypeEnum.numberInput, FlowNodeInputTypeEnum.reference],
          defaultValue: 90,
          description: '仅 jpeg / webp 时发往 API；png 时忽略。'
        }
      ],
      outputs: [
        {
          valueType: WorkflowIOValueTypeEnum.string,
          key: 'markdown_image',
          label: 'Markdown 图片（可多张）',
          description: '多张时为多段 ![](...) 空行拼接'
        },
        {
          valueType: WorkflowIOValueTypeEnum.string,
          key: 'image_data_url',
          label: '首张 Data URL 或 URL',
          description: '首张为 base64 则带 data: 前缀；否则为 https 链'
        },
        {
          valueType: WorkflowIOValueTypeEnum.string,
          key: 'all_image_data_urls_json',
          label: '全部图片 URL JSON 数组',
          description: '字符串化 JSON 数组，每项为 data:... 或 https:...'
        },
        {
          valueType: WorkflowIOValueTypeEnum.string,
          key: 'mime_type',
          label: '首张 MIME（base64 时）',
          description: '首张为 b64 时有 image/png、jpeg、webp'
        },
        {
          valueType: WorkflowIOValueTypeEnum.string,
          key: 'raw_b64',
          label: '首张纯 Base64',
          description: '首张含 b64_json 时'
        },
        {
          valueType: WorkflowIOValueTypeEnum.string,
          key: 'image_url',
          label: '首张 HTTPS 图链（若有）',
          description: '若首张来自 url 字段'
        },
        {
          valueType: WorkflowIOValueTypeEnum.string,
          key: 'minimal_json',
          label: '元数据 JSON',
          description: 'size_sent、n_returned、quality、moderation 等'
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
