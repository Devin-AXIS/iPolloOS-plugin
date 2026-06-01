import { defineTool } from '@tool/type';
import {
  FlowNodeInputTypeEnum,
  FlowNodeOutputTypeEnum,
  WorkflowIOValueTypeEnum
} from '@tool/type/ipolloos';

export default defineTool({
  name: {
    'zh-CN': 'HappyHorse 视频编辑',
    en: 'HappyHorse Video Edit'
  },
  description: {
    'zh-CN': '使用阿里云百炼 HappyHorse 1.0，根据文本指令编辑已有视频，可选参考图片。',
    en: 'Edit an existing video with text instructions and optional reference images using Alibaba Cloud Model Studio HappyHorse 1.0.'
  },
  versionList: [
    {
      value: '0.1.0',
      description: '接入 happyhorse-1.0-video-edit 异步视频编辑',
      inputs: [
        {
          key: 'video_url',
          label: '视频 URL',
          description: '待编辑的视频公网 URL，支持 MP4/MOV，建议 H.264 编码。',
          toolDescription: 'Public URL of the video to edit. Required.',
          renderTypeList: [FlowNodeInputTypeEnum.input, FlowNodeInputTypeEnum.reference],
          valueType: WorkflowIOValueTypeEnum.string,
          required: true
        },
        {
          key: 'prompt',
          label: '编辑指令',
          description: '描述要对视频做的风格转换、元素替换或局部修改。',
          toolDescription: 'Text instruction for the video edit. Required.',
          renderTypeList: [FlowNodeInputTypeEnum.textarea, FlowNodeInputTypeEnum.reference],
          valueType: WorkflowIOValueTypeEnum.string,
          required: true
        },
        {
          key: 'reference_image_urls',
          label: '参考图片 URL',
          description: '可选，最多 5 张。多张请用换行、逗号或 JSON 数组分隔。',
          toolDescription: 'Optional reference image URLs, up to 5.',
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
          key: 'watermark',
          label: '添加水印',
          description: '是否添加 Happy Horse 水印。',
          renderTypeList: [FlowNodeInputTypeEnum.switch],
          valueType: WorkflowIOValueTypeEnum.boolean,
          defaultValue: true
        },
        {
          key: 'audio_setting',
          label: '声音控制',
          renderTypeList: [FlowNodeInputTypeEnum.select],
          valueType: WorkflowIOValueTypeEnum.string,
          defaultValue: 'auto',
          list: [
            { label: '自动', value: 'auto' },
            { label: '保留原声', value: 'origin' }
          ]
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
