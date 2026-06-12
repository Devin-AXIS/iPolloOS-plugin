import { defineTool } from '@tool/type';
import {
  FlowNodeInputTypeEnum,
  FlowNodeOutputTypeEnum,
  WorkflowIOValueTypeEnum
} from '@tool/type/ipolloos';

export default defineTool({
  name: {
    'zh-CN': 'CIDMS 创建视频任务',
    en: 'CIDMS Create Video Task'
  },
  description: {
    'zh-CN': '创建 Seedance 异步视频生成任务，支持人脸/角色素材引用。',
    en: 'Create an async Seedance video generation task with face or character asset references.'
  },
  toolDescription:
    'Create a CIDMS video generation task. Use cidmsAsset first to upload face/character references, then pass asset://... as reference_url.',
  versionList: [
    {
      value: '1.0.0',
      description: 'Seedance 视频任务创建',
      inputs: [
        {
          key: 'model',
          label: '模型',
          valueType: WorkflowIOValueTypeEnum.string,
          renderTypeList: [FlowNodeInputTypeEnum.select, FlowNodeInputTypeEnum.reference],
          required: true,
          defaultValue: 'seedance-2.0-asset-fast',
          list: [
            { label: 'seedance-2.0-asset-fast（素材/人脸）', value: 'seedance-2.0-asset-fast' },
            { label: 'seedance-2.0-asset（素材/人脸）', value: 'seedance-2.0-asset' },
            { label: 'seedance-2.0-fast', value: 'seedance-2.0-fast' },
            { label: 'seedance-2.0', value: 'seedance-2.0' }
          ]
        },
        {
          key: 'prompt',
          label: '视频描述',
          valueType: WorkflowIOValueTypeEnum.string,
          renderTypeList: [FlowNodeInputTypeEnum.textarea, FlowNodeInputTypeEnum.reference],
          required: true,
          toolDescription: '使用素材时可写类似：@图1 中的人物走在阳光明媚的街道上'
        },
        {
          key: 'reference_url',
          label: '参考素材地址',
          valueType: WorkflowIOValueTypeEnum.string,
          renderTypeList: [FlowNodeInputTypeEnum.input, FlowNodeInputTypeEnum.reference],
          defaultValue: '',
          toolDescription:
            '支持 asset://asset-xxx 或 http(s) 图片地址。人脸/角色一致性建议传 asset:// 引用。'
        },
        {
          key: 'reference_role',
          label: '参考素材角色',
          valueType: WorkflowIOValueTypeEnum.string,
          renderTypeList: [FlowNodeInputTypeEnum.select, FlowNodeInputTypeEnum.reference],
          defaultValue: 'reference_image',
          list: [
            { label: '参考图', value: 'reference_image' },
            { label: '首帧', value: 'first_frame' },
            { label: '尾帧', value: 'last_frame' }
          ]
        },
        {
          key: 'ratio',
          label: '视频比例',
          valueType: WorkflowIOValueTypeEnum.string,
          renderTypeList: [FlowNodeInputTypeEnum.select, FlowNodeInputTypeEnum.reference],
          defaultValue: '16:9',
          list: [
            { label: '16:9', value: '16:9' },
            { label: '9:16', value: '9:16' },
            { label: '1:1', value: '1:1' },
            { label: '4:3', value: '4:3' },
            { label: '3:4', value: '3:4' }
          ]
        },
        {
          key: 'resolution',
          label: '分辨率',
          valueType: WorkflowIOValueTypeEnum.string,
          renderTypeList: [FlowNodeInputTypeEnum.select, FlowNodeInputTypeEnum.reference],
          defaultValue: '720p',
          list: [
            { label: '480p', value: '480p' },
            { label: '720p', value: '720p' },
            { label: '1080p', value: '1080p' }
          ]
        },
        {
          key: 'duration',
          label: '时长（秒）',
          valueType: WorkflowIOValueTypeEnum.number,
          renderTypeList: [FlowNodeInputTypeEnum.numberInput, FlowNodeInputTypeEnum.reference],
          defaultValue: 5
        },
        {
          key: 'generate_audio',
          label: '生成音频',
          valueType: WorkflowIOValueTypeEnum.boolean,
          renderTypeList: [FlowNodeInputTypeEnum.switch],
          defaultValue: false
        },
        {
          key: 'callback_url',
          label: '回调地址（可选）',
          valueType: WorkflowIOValueTypeEnum.string,
          renderTypeList: [FlowNodeInputTypeEnum.input, FlowNodeInputTypeEnum.reference],
          defaultValue: ''
        },
        {
          key: 'client_reference_id',
          label: '业务引用 ID（可选）',
          valueType: WorkflowIOValueTypeEnum.string,
          renderTypeList: [FlowNodeInputTypeEnum.input, FlowNodeInputTypeEnum.reference],
          defaultValue: ''
        },
        {
          key: 'content_json',
          label: '自定义 content JSON（可选）',
          valueType: WorkflowIOValueTypeEnum.string,
          renderTypeList: [FlowNodeInputTypeEnum.textarea, FlowNodeInputTypeEnum.reference],
          defaultValue: '',
          toolDescription:
            '高级用法：填写 content 数组 JSON 后，将覆盖上方 prompt/reference_url 生成的 content。'
        }
      ],
      outputs: [
        { valueType: WorkflowIOValueTypeEnum.string, key: 'task_id', label: '任务 ID' },
        { valueType: WorkflowIOValueTypeEnum.string, key: 'status', label: '状态' },
        { valueType: WorkflowIOValueTypeEnum.number, key: 'progress', label: '进度' },
        { valueType: WorkflowIOValueTypeEnum.string, key: 'result_url', label: '结果视频地址' },
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
