import { defineTool } from '@tool/type';
import {
  FlowNodeInputTypeEnum,
  FlowNodeOutputTypeEnum,
  WorkflowIOValueTypeEnum
} from '@tool/type/ipolloos';

export default defineTool({
  toolId: 'cidms/cidmsTalkshowVideoCreate',
  name: {
    'zh-CN': 'CIDMS 脱口秀视频生成',
    en: 'CIDMS Talkshow Video Create'
  },
  description: {
    'zh-CN': '生成 15s/30s 脱口秀或口播视频，30s 会先生成前段，再用前段视频素材续写后段。',
    en: 'Create 15s or 30s talkshow videos. 30s generation continues from the first segment via a video asset.'
  },
  toolDescription:
    'Generate a 15s or 30s talkshow/oral video. For 30s, the first 15s segment is generated first, then used as a video reference to continue the second 15s segment.',
  versionList: [
    {
      value: '1.1.4',
      description: '15s/30s talkshow video workflow',
      inputs: [
        {
          key: 'description',
          label: '视频内容描述',
          valueType: WorkflowIOValueTypeEnum.string,
          renderTypeList: [FlowNodeInputTypeEnum.textarea, FlowNodeInputTypeEnum.reference],
          required: true
        },
        {
          key: 'dialogue',
          label: '人物台词',
          valueType: WorkflowIOValueTypeEnum.string,
          renderTypeList: [FlowNodeInputTypeEnum.textarea, FlowNodeInputTypeEnum.reference],
          defaultValue: '',
          toolDescription: '30s 时会按长度中点附近标点拆分为前后两段。'
        },
        {
          key: 'duration',
          label: '视频时长',
          valueType: WorkflowIOValueTypeEnum.string,
          renderTypeList: [FlowNodeInputTypeEnum.select, FlowNodeInputTypeEnum.reference],
          required: true,
          defaultValue: '15',
          list: [
            { label: '15s', value: '15' },
            { label: '30s', value: '30' }
          ]
        },
        {
          key: 'orientation',
          label: '画面比例',
          valueType: WorkflowIOValueTypeEnum.string,
          renderTypeList: [FlowNodeInputTypeEnum.select, FlowNodeInputTypeEnum.reference],
          required: true,
          defaultValue: 'vertical',
          list: [
            { label: '竖屏 9:16', value: 'vertical' },
            { label: '横屏 16:9', value: 'horizontal' }
          ]
        },
        {
          key: 'character_reference_url',
          label: '人物参考图片',
          valueType: WorkflowIOValueTypeEnum.string,
          renderTypeList: [FlowNodeInputTypeEnum.input, FlowNodeInputTypeEnum.reference],
          defaultValue: '',
          toolDescription: '支持 http(s) 图片 URL 或 asset://。普通 URL 会先上传为 Image asset。'
        },
        {
          key: 'background_reference_url',
          label: '背景参考图片',
          valueType: WorkflowIOValueTypeEnum.string,
          renderTypeList: [FlowNodeInputTypeEnum.input, FlowNodeInputTypeEnum.reference],
          defaultValue: '',
          toolDescription: '支持 http(s) 图片 URL 或 asset://。普通 URL 会先上传为 Image asset。'
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
          key: 'generate_audio',
          label: '生成音频',
          valueType: WorkflowIOValueTypeEnum.boolean,
          renderTypeList: [FlowNodeInputTypeEnum.switch],
          defaultValue: true
        }
      ],
      outputs: [
        { valueType: WorkflowIOValueTypeEnum.string, key: 'task_id', label: '任务 ID' },
        { valueType: WorkflowIOValueTypeEnum.string, key: 'status', label: '状态' },
        { valueType: WorkflowIOValueTypeEnum.number, key: 'progress', label: '进度' },
        { valueType: WorkflowIOValueTypeEnum.string, key: 'result_url', label: '最终视频地址' },
        { valueType: WorkflowIOValueTypeEnum.string, key: 'first_task_id', label: '前段任务 ID' },
        { valueType: WorkflowIOValueTypeEnum.string, key: 'second_task_id', label: '后段任务 ID' },
        { valueType: WorkflowIOValueTypeEnum.string, key: 'first_video_url', label: '前段视频地址' },
        { valueType: WorkflowIOValueTypeEnum.string, key: 'second_video_url', label: '后段视频地址' },
        { valueType: WorkflowIOValueTypeEnum.string, key: 'final_prompt', label: '最终 Prompt' },
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
