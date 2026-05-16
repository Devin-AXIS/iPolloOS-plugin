import { defineTool } from '@tool/type';
import {
  FlowNodeInputTypeEnum,
  FlowNodeOutputTypeEnum,
  WorkflowIOValueTypeEnum
} from '@tool/type/ipolloos';

export default defineTool({
  name: {
    'zh-CN': '方舟视频 · Seedance',
    en: 'Ark video · Seedance'
  },
  description: {
    'zh-CN':
      '创建视频生成任务：文生视频、参考图、或首尾帧。比例、分辨率、时长用下拉选择；密钥与接入点在插件资源配置。',
    en: 'Create a video generation task: text-to-video, reference image, or first/last frame. Ratio, resolution, and duration are dropdowns; credentials live in plugin config.'
  },
  toolDescription:
    '文生：只填创意描述。参考图：选「参考生成」并填参考图地址。首尾帧：选「首尾帧」并填首帧、尾帧图地址。时长可选「按秒数」或「智能时长」。',
  versionList: [
    {
      value: '1.0.0',
      description: '首版：POST /contents/generations/tasks',
      inputs: [
        {
          key: 'creative_prompt',
          label: '创意描述',
          valueType: WorkflowIOValueTypeEnum.string,
          renderTypeList: [FlowNodeInputTypeEnum.reference, FlowNodeInputTypeEnum.textarea],
          required: true,
          toolDescription: '画面与镜头的中文或英文描述'
        },
        {
          key: 'generation_mode',
          label: '生成模式',
          valueType: WorkflowIOValueTypeEnum.string,
          renderTypeList: [FlowNodeInputTypeEnum.reference, FlowNodeInputTypeEnum.select],
          required: true,
          defaultValue: 'text',
          list: [
            { label: '文生视频（仅描述）', value: 'text' },
            { label: '参考生成（一张参考图）', value: 'reference' },
            { label: '首尾帧（首帧 + 尾帧）', value: 'frames' }
          ],
          toolDescription: '参考图与首尾帧需填写对应图片地址'
        },
        {
          key: 'reference_image_url',
          label: '参考图地址',
          valueType: WorkflowIOValueTypeEnum.string,
          renderTypeList: [FlowNodeInputTypeEnum.reference, FlowNodeInputTypeEnum.input],
          defaultValue: '',
          toolDescription: 'http(s) 可访问的图片 URL；参考生成模式必填'
        },
        {
          key: 'first_frame_url',
          label: '首帧图地址',
          valueType: WorkflowIOValueTypeEnum.string,
          renderTypeList: [FlowNodeInputTypeEnum.reference, FlowNodeInputTypeEnum.input],
          defaultValue: '',
          toolDescription: '首尾帧模式：第一帧图片 URL'
        },
        {
          key: 'last_frame_url',
          label: '尾帧图地址',
          valueType: WorkflowIOValueTypeEnum.string,
          renderTypeList: [FlowNodeInputTypeEnum.reference, FlowNodeInputTypeEnum.input],
          defaultValue: '',
          toolDescription: '首尾帧模式：最后一帧图片 URL'
        },
        {
          key: 'aspect_ratio',
          label: '视频比例',
          valueType: WorkflowIOValueTypeEnum.string,
          renderTypeList: [FlowNodeInputTypeEnum.reference, FlowNodeInputTypeEnum.select],
          required: true,
          defaultValue: '16:9',
          list: [
            { label: '21:9', value: '21:9' },
            { label: '16:9', value: '16:9' },
            { label: '4:3', value: '4:3' },
            { label: '1:1', value: '1:1' },
            { label: '3:4', value: '3:4' },
            { label: '9:16', value: '9:16' },
            { label: '智能', value: '智能' }
          ],
          toolDescription: '智能对应方舟 adaptive 画幅'
        },
        {
          key: 'resolution',
          label: '分辨率',
          valueType: WorkflowIOValueTypeEnum.string,
          renderTypeList: [FlowNodeInputTypeEnum.reference, FlowNodeInputTypeEnum.select],
          required: true,
          defaultValue: '720p',
          list: [
            { label: '480p', value: '480p' },
            { label: '720p', value: '720p' },
            { label: '1080p', value: '1080p' }
          ],
          toolDescription: '若接入点不支持 1080p，上游可能报错'
        },
        {
          key: 'duration_mode',
          label: '视频时长',
          valueType: WorkflowIOValueTypeEnum.string,
          renderTypeList: [FlowNodeInputTypeEnum.reference, FlowNodeInputTypeEnum.select],
          required: true,
          defaultValue: 'smart',
          list: [
            { label: '按秒数', value: 'seconds' },
            { label: '智能时长', value: 'smart' }
          ],
          toolDescription: '按秒数时填写下一项；智能时长不写 --dur，由模型决定'
        },
        {
          key: 'duration_seconds',
          label: '时长（秒）',
          valueType: WorkflowIOValueTypeEnum.string,
          renderTypeList: [FlowNodeInputTypeEnum.reference, FlowNodeInputTypeEnum.numberInput],
          defaultValue: '5',
          toolDescription: '一般 4–15 秒；仅在「按秒数」时生效'
        }
      ],
      outputs: [
        {
          valueType: WorkflowIOValueTypeEnum.string,
          key: 'task_id',
          label: '任务 ID',
          description: '用于后续查询生成结果'
        },
        {
          valueType: WorkflowIOValueTypeEnum.string,
          key: 'task_response_json',
          label: '接口返回 JSON',
          description: '方舟创建任务接口完整响应'
        },
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
