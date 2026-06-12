import { defineTool } from '@tool/type';
import {
  FlowNodeInputTypeEnum,
  FlowNodeOutputTypeEnum,
  WorkflowIOValueTypeEnum
} from '@tool/type/ipolloos';

export default defineTool({
  name: {
    'zh-CN': 'CIDMS 素材组与素材',
    en: 'CIDMS Assets'
  },
  description: {
    'zh-CN': '创建素材组或上传图片/视频/音频素材，返回可用于视频生成的人脸/角色素材引用。',
    en: 'Create asset groups or upload image/video/audio assets for video generation references.'
  },
  toolDescription:
    'Use create_group first, then upload_asset with GroupId and a public URL. The returned asset_ref can be passed to cidmsVideoCreate.reference_url.',
  versionList: [
    {
      value: '1.0.0',
      description: '素材组创建与素材上传',
      inputs: [
        {
          key: 'action',
          label: '操作',
          valueType: WorkflowIOValueTypeEnum.string,
          renderTypeList: [FlowNodeInputTypeEnum.select, FlowNodeInputTypeEnum.reference],
          required: true,
          defaultValue: 'upload_asset',
          list: [
            { label: '创建素材组', value: 'create_group' },
            { label: '上传素材', value: 'upload_asset' }
          ]
        },
        {
          key: 'group_name',
          label: '素材组名称',
          valueType: WorkflowIOValueTypeEnum.string,
          renderTypeList: [FlowNodeInputTypeEnum.input, FlowNodeInputTypeEnum.reference],
          defaultValue: 'cidms-asset-group'
        },
        {
          key: 'group_id',
          label: '素材组 ID',
          valueType: WorkflowIOValueTypeEnum.string,
          renderTypeList: [FlowNodeInputTypeEnum.input, FlowNodeInputTypeEnum.reference],
          defaultValue: '',
          toolDescription: '上传素材时填写 CreateAssetGroup 返回的 Id。'
        },
        {
          key: 'asset_name',
          label: '素材名称',
          valueType: WorkflowIOValueTypeEnum.string,
          renderTypeList: [FlowNodeInputTypeEnum.input, FlowNodeInputTypeEnum.reference],
          defaultValue: 'character-reference'
        },
        {
          key: 'asset_type',
          label: '素材类型',
          valueType: WorkflowIOValueTypeEnum.string,
          renderTypeList: [FlowNodeInputTypeEnum.select, FlowNodeInputTypeEnum.reference],
          defaultValue: 'Image',
          list: [
            { label: '图片', value: 'Image' },
            { label: '视频', value: 'Video' },
            { label: '音频', value: 'Audio' }
          ]
        },
        {
          key: 'asset_url',
          label: '素材 URL',
          valueType: WorkflowIOValueTypeEnum.string,
          renderTypeList: [FlowNodeInputTypeEnum.input, FlowNodeInputTypeEnum.reference],
          defaultValue: '',
          toolDescription: '公网可访问素材 URL。人脸/角色图片通常选择 Image。'
        }
      ],
      outputs: [
        { valueType: WorkflowIOValueTypeEnum.string, key: 'group_id', label: '素材组 ID' },
        { valueType: WorkflowIOValueTypeEnum.string, key: 'asset_id', label: '素材 ID' },
        { valueType: WorkflowIOValueTypeEnum.string, key: 'asset_ref', label: '素材引用' },
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
