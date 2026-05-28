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
    'zh-CN': 'HyperFrames · 视频渲染',
    en: 'HyperFrames · video render'
  },
  description: {
    'zh-CN':
      '把已经生成好的 HyperFrames 视频工程提交到阿里云函数计算渲染服务，异步导出 MP4 并返回 OSS 链接。',
    en: 'Submit ready HyperFrames video projects to an Alibaba Cloud Function Compute render service and export MP4 asynchronously.'
  },
  toolDescription:
    '独立的 HyperFrames 渲染调度工具。它不负责决定视频类型、画幅、时长、动画、字幕、配音、音轨或转场；这些由「HyperFrames · 生成视频工程」输出的 composition_html / manifest_json 决定。本工具只负责提交阿里云函数计算渲染任务、查询状态、取消任务，并返回 video_url。函数侧需要实现约定的 JSON 协议。',
  courseUrl: 'https://help.aliyun.com/zh/functioncompute/',
  versionList: [
    {
      value: '0.2.0',
      description:
        'Submit/query/cancel ready HyperFrames render jobs without duplicating project authoring controls',
      inputs: [
        {
          key: 'action',
          label: '操作',
          valueType: WorkflowIOValueTypeEnum.string,
          renderTypeList: [FlowNodeInputTypeEnum.reference, FlowNodeInputTypeEnum.select],
          defaultValue: 'submit',
          list: [
            { label: '提交渲染任务', value: 'submit' },
            { label: '查询任务状态', value: 'status' },
            { label: '取消任务', value: 'cancel' }
          ],
          toolDescription: 'submit 提交新任务；status 查询 job_id；cancel 取消 job_id。'
        },
        {
          key: 'page_url',
          label: '工程页面 URL',
          valueType: WorkflowIOValueTypeEnum.string,
          renderTypeList: [FlowNodeInputTypeEnum.reference, FlowNodeInputTypeEnum.input],
          toolDescription:
            '可选。已经发布的 HyperFrames 工程页面 URL，例如 HTML Anything 或生成视频工程发布后的页面。'
        },
        {
          key: 'html',
          label: 'HyperFrames HTML',
          valueType: WorkflowIOValueTypeEnum.string,
          renderTypeList: [FlowNodeInputTypeEnum.reference, FlowNodeInputTypeEnum.textarea],
          toolDescription:
            '可选。生成视频工程节点输出的 composition_html。优先建议使用已发布的 page_url。'
        },
        {
          key: 'manifest_json',
          label: '视频工程 Manifest',
          valueType: WorkflowIOValueTypeEnum.string,
          renderTypeList: [FlowNodeInputTypeEnum.reference, FlowNodeInputTypeEnum.textarea],
          toolDescription:
            '可选。生成视频工程节点输出的 manifest_json，里面包含视频类型、画幅、时长、来源素材、字幕、配音、转场等渲染信息。'
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
          valueType: WorkflowIOValueTypeEnum.string,
          renderTypeList: [FlowNodeInputTypeEnum.reference, FlowNodeInputTypeEnum.textarea],
          toolDescription:
            '仅用于透传给函数侧的工程参数，例如 OSS 输出前缀、回调地址、队列优先级。动画、字幕、配音、音轨、转场请写在 HyperFrames composition 内，不在这里配置。'
        }
      ],
      outputs: [
        {
          valueType: WorkflowIOValueTypeEnum.string,
          key: 'job_id',
          label: '任务 ID'
        },
        {
          valueType: WorkflowIOValueTypeEnum.string,
          key: 'status',
          label: '任务状态'
        },
        {
          valueType: WorkflowIOValueTypeEnum.string,
          key: 'video_url',
          label: '视频链接'
        },
        {
          valueType: WorkflowIOValueTypeEnum.string,
          key: 'poster_url',
          label: '封面链接'
        },
        {
          valueType: WorkflowIOValueTypeEnum.string,
          key: 'logs_url',
          label: '日志链接'
        },
        {
          valueType: WorkflowIOValueTypeEnum.string,
          key: 'summary',
          label: '摘要'
        },
        {
          valueType: WorkflowIOValueTypeEnum.string,
          key: 'raw_response',
          label: '渲染服务原始响应'
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
