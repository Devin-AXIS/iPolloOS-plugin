import { defineTool } from '@tool/type';
import {
  FlowNodeInputTypeEnum,
  FlowNodeOutputTypeEnum,
  WorkflowIOValueTypeEnum
} from '@tool/type/ipolloos';
import { ToolTagEnum } from '@tool/type/tags';

export default defineTool({
  tags: [ToolTagEnum.enum.multimodal, ToolTagEnum.enum.productivity],
  name: {
    'zh-CN': '合成音视频',
    en: 'Compose media'
  },
  description: {
    'zh-CN':
      '把视频、音频、字幕和时间线计划提交到公共媒体处理函数，支持拼接、音画合成、混音、替换音轨、分屏、画中画和任务查询。',
    en: 'Submit videos, audio, subtitles, and timeline plans to the shared media processing function. Supports concatenation, audio-video merge, mixing, audio replacement, split screen, picture-in-picture, and job status checks.'
  },
  toolDescription:
    '公共媒体合成节点。上游插件只需给出素材和合成意图；本节点复用 HyperFrames 的阿里云国际函数计算配置，提交 task_type=media_processing 的任务。不要把 HyperFrames composition_html 传给这里；视频创作工程仍走 HyperFrames 视频插件。',
  courseUrl: 'https://www.alibabacloud.com/help/en/functioncompute/',
  versionList: [
    {
      value: '1.1.0',
      description:
        'Submit/status/cancel shared media processing jobs; requires the shared HyperFrames Alibaba Cloud International Function Compute endpoint with task_type=media_processing support',
      inputs: [
        {
          key: 'action',
          label: '操作',
          valueType: WorkflowIOValueTypeEnum.string,
          renderTypeList: [FlowNodeInputTypeEnum.reference, FlowNodeInputTypeEnum.select],
          defaultValue: 'submit',
          list: [
            { label: '提交合成任务', value: 'submit' },
            { label: '查询任务状态', value: 'status' },
            { label: '取消任务', value: 'cancel' }
          ],
          toolDescription: 'submit 提交新任务；status 查询 job_id；cancel 取消 job_id。'
        },
        {
          key: 'operation',
          label: '合成方式',
          valueType: WorkflowIOValueTypeEnum.string,
          renderTypeList: [FlowNodeInputTypeEnum.reference, FlowNodeInputTypeEnum.select],
          defaultValue: 'auto',
          list: [
            { label: '自动判断', value: 'auto' },
            { label: '视频顺序拼接', value: 'concat_videos' },
            { label: '视频加音频', value: 'merge_audio_video' },
            { label: '替换视频音轨', value: 'replace_audio' },
            { label: '多音轨混音', value: 'mix_audio_tracks' },
            { label: '左右分屏', value: 'side_by_side' },
            { label: '画中画', value: 'picture_in_picture' },
            { label: '字幕烧录', value: 'burn_subtitles' },
            { label: '提取音频', value: 'extract_audio' },
            { label: '按时间线合成', value: 'timeline_compose' }
          ],
          toolDescription:
            '选择业务上的合成方式。复杂场景用 timeline_compose，并在时间线 JSON 中描述素材开始时间、轨道、音量、裁剪和布局。'
        },
        {
          key: 'video_urls',
          label: '视频 URL 列表',
          valueType: WorkflowIOValueTypeEnum.string,
          renderTypeList: [FlowNodeInputTypeEnum.reference, FlowNodeInputTypeEnum.textarea],
          toolDescription:
            '可填一行一个视频 URL，也可填 JSON 数组。视频拼接、分屏、画中画、音画合成等场景使用。'
        },
        {
          key: 'audio_urls',
          label: '音频 URL 列表',
          valueType: WorkflowIOValueTypeEnum.string,
          renderTypeList: [FlowNodeInputTypeEnum.reference, FlowNodeInputTypeEnum.textarea],
          toolDescription:
            '可填一行一个音频 URL，也可填 JSON 数组。背景音乐、旁白、音效、混音或替换音轨时使用。'
        },
        {
          key: 'media_items_json',
          label: '媒体素材 JSON',
          valueType: WorkflowIOValueTypeEnum.object,
          renderTypeList: [FlowNodeInputTypeEnum.JSONEditor, FlowNodeInputTypeEnum.reference],
          toolDescription:
            '可选。结构化素材列表，推荐数组：[{ "id": "v1", "type": "video", "url": "...", "start": 0, "duration": 5 }]。'
        },
        {
          key: 'timeline_json',
          label: '时间线 JSON',
          valueType: WorkflowIOValueTypeEnum.object,
          renderTypeList: [FlowNodeInputTypeEnum.JSONEditor, FlowNodeInputTypeEnum.reference],
          toolDescription:
            '可选。复杂合成计划，描述 track/layer/start/end/volume/layout/transition 等。函数侧按该计划执行。'
        },
        {
          key: 'subtitle_srt',
          label: '字幕 SRT',
          valueType: WorkflowIOValueTypeEnum.string,
          renderTypeList: [FlowNodeInputTypeEnum.reference, FlowNodeInputTypeEnum.textarea],
          toolDescription: '可选。burn_subtitles 或需要字幕合成时传入。'
        },
        {
          key: 'output_format',
          label: '输出格式',
          valueType: WorkflowIOValueTypeEnum.string,
          renderTypeList: [FlowNodeInputTypeEnum.reference, FlowNodeInputTypeEnum.select],
          defaultValue: 'mp4',
          list: [
            { label: 'MP4 视频', value: 'mp4' },
            { label: 'MOV 视频', value: 'mov' },
            { label: 'WEBM 视频', value: 'webm' },
            { label: 'MP3 音频', value: 'mp3' },
            { label: 'M4A 音频', value: 'm4a' },
            { label: 'WAV 音频', value: 'wav' }
          ]
        },
        {
          key: 'output_profile',
          label: '输出规格',
          valueType: WorkflowIOValueTypeEnum.string,
          renderTypeList: [FlowNodeInputTypeEnum.reference, FlowNodeInputTypeEnum.select],
          defaultValue: 'web_1080p',
          list: [
            { label: '网页 1080p', value: 'web_1080p' },
            { label: '网页 720p', value: 'web_720p' },
            { label: '竖屏 1080x1920', value: 'portrait_1080p' },
            { label: '原始规格', value: 'source' },
            { label: '仅音频', value: 'audio_only' }
          ]
        },
        {
          key: 'output_fps',
          label: '输出 FPS',
          valueType: WorkflowIOValueTypeEnum.number,
          renderTypeList: [FlowNodeInputTypeEnum.reference, FlowNodeInputTypeEnum.input],
          toolDescription: '可选。视频输出帧率，不填由函数侧按素材或输出规格决定。'
        },
        {
          key: 'output_filename',
          label: '输出文件名',
          valueType: WorkflowIOValueTypeEnum.string,
          renderTypeList: [FlowNodeInputTypeEnum.reference, FlowNodeInputTypeEnum.input],
          toolDescription: '可选。用于函数侧生成 OSS 对象名或下载文件名。'
        },
        {
          key: 'job_id',
          label: '任务 ID',
          valueType: WorkflowIOValueTypeEnum.string,
          renderTypeList: [FlowNodeInputTypeEnum.reference, FlowNodeInputTypeEnum.input],
          toolDescription: 'status/cancel 时必填。'
        },
        {
          key: 'extra_payload',
          label: '函数扩展参数 JSON',
          valueType: WorkflowIOValueTypeEnum.object,
          renderTypeList: [FlowNodeInputTypeEnum.JSONEditor, FlowNodeInputTypeEnum.reference],
          toolDescription:
            '可选。透传给函数侧，例如 OSS 输出前缀、回调地址、队列优先级、trace 上下文。'
        },
        {
          key: 'client_timeout_seconds',
          label: '请求等待超时（秒）',
          valueType: WorkflowIOValueTypeEnum.number,
          renderTypeList: [FlowNodeInputTypeEnum.reference, FlowNodeInputTypeEnum.input],
          defaultValue: 120,
          toolDescription:
            '只限制本插件等待函数响应的时间，不是合成任务总时长。长任务应由函数异步提交后尽快返回 job_id。'
        }
      ],
      outputs: [
        { valueType: WorkflowIOValueTypeEnum.string, key: 'job_id', label: '任务 ID' },
        { valueType: WorkflowIOValueTypeEnum.string, key: 'status', label: '任务状态' },
        { valueType: WorkflowIOValueTypeEnum.string, key: 'output_url', label: '输出链接' },
        { valueType: WorkflowIOValueTypeEnum.string, key: 'video_url', label: '视频链接' },
        { valueType: WorkflowIOValueTypeEnum.string, key: 'audio_url', label: '音频链接' },
        { valueType: WorkflowIOValueTypeEnum.string, key: 'poster_url', label: '封面链接' },
        { valueType: WorkflowIOValueTypeEnum.string, key: 'logs_url', label: '日志链接' },
        { valueType: WorkflowIOValueTypeEnum.string, key: 'summary', label: '摘要' },
        {
          valueType: WorkflowIOValueTypeEnum.string,
          key: 'raw_response',
          label: '函数原始响应'
        },
        {
          valueType: WorkflowIOValueTypeEnum.string,
          key: 'error_detail_json',
          label: '错误诊断 JSON'
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
