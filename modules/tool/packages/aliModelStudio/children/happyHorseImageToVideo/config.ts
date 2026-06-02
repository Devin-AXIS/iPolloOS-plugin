import { defineTool } from '@tool/type';
import {
  FlowNodeInputTypeEnum,
  FlowNodeOutputTypeEnum,
  WorkflowIOValueTypeEnum
} from '@tool/type/ipolloos';

export default defineTool({
  name: {
    'zh-CN': 'HappyHorse 图生视频',
    en: 'HappyHorse Image-to-Video'
  },
  description: {
    'zh-CN': '使用阿里云百炼 HappyHorse 1.0，根据首帧图片和可选提示词异步生成视频。',
    en: 'Generate videos from a first-frame image and optional prompt with Alibaba Cloud Model Studio HappyHorse 1.0.'
  },
  versionList: [
    {
      value: '0.1.0',
      description: '接入 happyhorse-1.0-i2v 首帧图生视频',
      inputs: [
        {
          key: 'image_url',
          label: '首帧图片',
          description:
            '支持用户上传图片、图片 URL、上游文生图输出的图片数组、Markdown 图片或 data:image；会自动取第一张图。',
          toolDescription:
            'First-frame image. Can be an uploaded user image, URL, upstream image array, markdown image, image object, or data:image value. Use the first available image.',
          renderTypeList: [
            FlowNodeInputTypeEnum.fileSelect,
            FlowNodeInputTypeEnum.reference,
            FlowNodeInputTypeEnum.input
          ],
          valueType: WorkflowIOValueTypeEnum.any,
          required: true
        },
        {
          key: 'prompt',
          label: '提示词',
          description: '可选，用于描述视频运动、镜头或氛围。',
          toolDescription: 'Optional text prompt for motion or scene direction.',
          renderTypeList: [FlowNodeInputTypeEnum.textarea, FlowNodeInputTypeEnum.reference],
          valueType: WorkflowIOValueTypeEnum.string
        },
        {
          key: 'region',
          label: '地域',
          description: '必须和模型、API Key 所在地域一致。',
          renderTypeList: [FlowNodeInputTypeEnum.select],
          valueType: WorkflowIOValueTypeEnum.string,
          defaultValue: 'beijing',
          list: [
            { label: '华北2（北京）', value: 'beijing' },
            { label: '新加坡', value: 'singapore' },
            { label: '美国（弗吉尼亚）', value: 'us' }
          ]
        },
        {
          key: 'resolution',
          label: '分辨率',
          renderTypeList: [FlowNodeInputTypeEnum.select],
          valueType: WorkflowIOValueTypeEnum.string,
          defaultValue: '1080P',
          list: [
            { label: '1080P', value: '1080P' },
            { label: '720P', value: '720P' }
          ]
        },
        {
          key: 'duration',
          label: '时长（秒）',
          description: '默认交给模型自动选择；手动选择后才会固定时长。',
          toolDescription:
            'Video duration in seconds. Use auto unless the user explicitly asks for a fixed duration.',
          renderTypeList: [FlowNodeInputTypeEnum.select, FlowNodeInputTypeEnum.reference],
          valueType: WorkflowIOValueTypeEnum.string,
          defaultValue: 'auto',
          list: [
            { label: 'AI 自动选择', value: 'auto' },
            { label: '3 秒', value: '3' },
            { label: '5 秒', value: '5' },
            { label: '10 秒', value: '10' },
            { label: '15 秒', value: '15' }
          ]
        },
        {
          key: 'watermark',
          label: '添加水印',
          description: '是否添加 Happy Horse 水印。',
          renderTypeList: [FlowNodeInputTypeEnum.switch],
          valueType: WorkflowIOValueTypeEnum.boolean,
          defaultValue: true
        }
      ],
      outputs: [
        {
          key: 'video_url',
          label: '视频链接',
          description: '生成的视频 MP4 URL，有效期通常为 24 小时。',
          valueType: WorkflowIOValueTypeEnum.string
        },
        { key: 'task_id', label: '任务 ID', valueType: WorkflowIOValueTypeEnum.string },
        { key: 'task_status', label: '任务状态', valueType: WorkflowIOValueTypeEnum.string },
        { key: 'request_id', label: '请求 ID', valueType: WorkflowIOValueTypeEnum.string },
        { key: 'usage', label: '用量信息', valueType: WorkflowIOValueTypeEnum.object },
        {
          key: 'raw_response_json',
          label: '原始响应 JSON',
          valueType: WorkflowIOValueTypeEnum.string
        },
        {
          type: FlowNodeOutputTypeEnum.error,
          key: 'system_error',
          label: '错误信息',
          valueType: WorkflowIOValueTypeEnum.string
        }
      ]
    }
  ]
});
