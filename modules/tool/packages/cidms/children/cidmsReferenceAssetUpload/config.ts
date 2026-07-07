import { defineTool } from '@tool/type';
import {
  FlowNodeInputTypeEnum,
  FlowNodeOutputTypeEnum,
  WorkflowIOValueTypeEnum
} from '@tool/type/ipolloos';

export default defineTool({
  toolId: 'cidms/cidmsReferenceAssetUpload',
  name: {
    'zh-CN': 'CIDMS 参考素材上传',
    en: 'CIDMS Reference Asset Upload'
  },
  description: {
    'zh-CN': '上传图片或视频为 CIDMS 可复用参考素材，返回 asset:// 引用。',
    en: 'Upload an image or video as reusable CIDMS reference asset and return an asset:// reference.'
  },
  toolDescription:
    'Upload a public image/video URL as a CIDMS reference asset. Use the returned asset_ref in video generation reference fields.',
  versionList: [
    {
      value: '1.0.0',
      description: '参考素材上传',
      inputs: [
        {
          key: 'asset_purpose',
          label: '素材用途',
          valueType: WorkflowIOValueTypeEnum.string,
          renderTypeList: [FlowNodeInputTypeEnum.select, FlowNodeInputTypeEnum.reference],
          required: true,
          defaultValue: 'character_reference',
          list: [
            { label: '人物参考图', value: 'character_reference' },
            { label: '背景参考图', value: 'background_reference' },
            { label: '续写参考视频', value: 'continuation_video' }
          ]
        },
        {
          key: 'asset_url',
          label: '素材 URL',
          valueType: WorkflowIOValueTypeEnum.string,
          renderTypeList: [FlowNodeInputTypeEnum.input, FlowNodeInputTypeEnum.reference],
          required: true,
          toolDescription: '公网可访问的图片或视频 URL。'
        },
        {
          key: 'asset_name',
          label: '素材名称（可选）',
          valueType: WorkflowIOValueTypeEnum.string,
          renderTypeList: [FlowNodeInputTypeEnum.input, FlowNodeInputTypeEnum.reference],
          defaultValue: ''
        }
      ],
      outputs: [
        { valueType: WorkflowIOValueTypeEnum.string, key: 'asset_ref', label: '素材引用' },
        { valueType: WorkflowIOValueTypeEnum.string, key: 'asset_id', label: '素材 ID' },
        { valueType: WorkflowIOValueTypeEnum.string, key: 'group_id', label: '素材组 ID' },
        { valueType: WorkflowIOValueTypeEnum.string, key: 'asset_type', label: '素材类型' },
        { valueType: WorkflowIOValueTypeEnum.string, key: 'usage_hint', label: '使用提示' },
        { valueType: WorkflowIOValueTypeEnum.string, key: 'response_json', label: '接口返回 JSON' },
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
