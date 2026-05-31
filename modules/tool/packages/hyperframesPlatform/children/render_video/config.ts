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
      '把已经生成好的 HyperFrames 视频工程提交到阿里云函数计算渲染服务，支持长视频安全参数、分段渲染提示和结构化错误诊断。',
    en: 'Submit ready HyperFrames video projects to an Alibaba Cloud Function Compute render service with long-video safety options and structured diagnostics.'
  },
  toolDescription:
    '独立的 HyperFrames 渲染调度工具。它不负责决定视频类型、画幅、时长、动画、字幕、配音、音轨或转场；这些由「HyperFrames · 生成视频工程」输出的 composition_html / manifest_json 决定。本工具只负责提交阿里云函数计算渲染任务、查询状态、取消任务，并返回 video_url。对 3 分钟以上或 1080p 长视频，默认会向函数侧传入 performance_mode、分段渲染、低 FPS、禁用重型滤镜和 verbose diagnostics 建议，函数侧应按 render_options 执行并返回 stage/exit_code/signal/stderr_tail 等错误信息。',
  courseUrl: 'https://help.aliyun.com/zh/functioncompute/',
  versionList: [
    {
      value: '0.3.0',
      description:
        'Submit/query/cancel ready HyperFrames render jobs with timeline artifacts, long-video safety options and diagnostics',
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
            '必填。生成视频工程节点输出的 manifest_json，必须包含 duration_seconds 和 timeline/scenes，里面包含视频类型、画幅、时长、剪辑时间轴、来源素材、字幕、配音、转场等渲染信息。不能只传 HTML 页面 URL。'
        },
        {
          key: 'storyboard_json',
          label: '分镜脚本 JSON',
          valueType: WorkflowIOValueTypeEnum.string,
          renderTypeList: [FlowNodeInputTypeEnum.reference, FlowNodeInputTypeEnum.textarea],
          toolDescription:
            '可选但强烈建议。生成视频工程节点输出的 storyboard_json，函数侧应用它校验每个镜头的开始时间、持续时间、画面、转场、字幕和素材。'
        },
        {
          key: 'voiceover_script',
          label: '配音稿',
          valueType: WorkflowIOValueTypeEnum.string,
          renderTypeList: [FlowNodeInputTypeEnum.reference, FlowNodeInputTypeEnum.textarea],
          toolDescription:
            '可选。生成视频工程节点输出的完整配音稿。函数侧若接 TTS，应按 scene 切片生成，不要整段一次性合成。'
        },
        {
          key: 'subtitle_srt',
          label: '字幕 SRT',
          valueType: WorkflowIOValueTypeEnum.string,
          renderTypeList: [FlowNodeInputTypeEnum.reference, FlowNodeInputTypeEnum.textarea],
          toolDescription:
            '可选。生成视频工程节点输出的完整 SRT 字幕。函数侧应按时间轴烧录或外挂，不要只渲染静态页面文字。'
        },
        {
          key: 'asset_plan_json',
          label: '素材计划 JSON',
          valueType: WorkflowIOValueTypeEnum.string,
          renderTypeList: [FlowNodeInputTypeEnum.reference, FlowNodeInputTypeEnum.textarea],
          toolDescription:
            '可选。生成视频工程节点输出的素材计划，包含图片、视频、Logo、图标、图表和界面截图等。'
        },
        {
          key: 'validation_report_json',
          label: 'HyperFrames 校验报告',
          valueType: WorkflowIOValueTypeEnum.string,
          renderTypeList: [FlowNodeInputTypeEnum.reference, FlowNodeInputTypeEnum.textarea],
          toolDescription:
            '可选。生成视频工程节点输出的校验报告。用于让函数侧记录 lint_contract/layout_contract/timeline_contract 是否通过。'
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
        },
        {
          key: 'performance_mode',
          label: '长视频安全模式',
          valueType: WorkflowIOValueTypeEnum.string,
          renderTypeList: [FlowNodeInputTypeEnum.reference, FlowNodeInputTypeEnum.select],
          defaultValue: 'auto',
          list: [
            { label: '自动：长视频启用', value: 'auto' },
            { label: '强制启用', value: 'on' },
            { label: '关闭', value: 'off' }
          ],
          toolDescription:
            'auto 会对 3 分钟以上或 1080p 长视频传入安全渲染建议：分段、低 FPS、禁用重型滤镜、输出详细诊断。'
        },
        {
          key: 'target_fps',
          label: '目标 FPS',
          valueType: WorkflowIOValueTypeEnum.number,
          renderTypeList: [FlowNodeInputTypeEnum.reference, FlowNodeInputTypeEnum.input],
          toolDescription:
            '可选。长信息类视频建议 18fps；高动态动画可用 24/30fps。不填时长视频自动降到 18fps。'
        },
        {
          key: 'segment_duration_seconds',
          label: '分段时长（秒）',
          valueType: WorkflowIOValueTypeEnum.number,
          renderTypeList: [FlowNodeInputTypeEnum.reference, FlowNodeInputTypeEnum.input],
          toolDescription:
            '可选。建议 30-60 秒。函数侧支持时会按分段渲染后 concat，降低超时、OOM 和 /tmp 爆掉风险。'
        },
        {
          key: 'disable_heavy_effects',
          label: '禁用重型视觉效果',
          valueType: WorkflowIOValueTypeEnum.string,
          renderTypeList: [FlowNodeInputTypeEnum.reference, FlowNodeInputTypeEnum.select],
          defaultValue: 'auto',
          list: [
            { label: '自动：长视频禁用', value: 'auto' },
            { label: '强制禁用', value: 'on' },
            { label: '关闭', value: 'off' }
          ],
          toolDescription:
            '建议函数侧在启用时注入 CSS 降级：backdrop-filter/filter/大阴影等设为 none，提升 Chromium 截帧稳定性。'
        },
        {
          key: 'diagnostics_level',
          label: '诊断级别',
          valueType: WorkflowIOValueTypeEnum.string,
          renderTypeList: [FlowNodeInputTypeEnum.reference, FlowNodeInputTypeEnum.select],
          defaultValue: 'verbose',
          list: [
            { label: '详细诊断', value: 'verbose' },
            { label: '基础诊断', value: 'basic' }
          ],
          toolDescription:
            '建议函数侧返回 stage、exit_code、signal、stderr_tail、duration_before_exit_sec、memory_peak_mb、tmp_usage_mb、trace_id。'
        },
        {
          key: 'client_timeout_seconds',
          label: '请求等待超时（秒）',
          valueType: WorkflowIOValueTypeEnum.number,
          renderTypeList: [FlowNodeInputTypeEnum.reference, FlowNodeInputTypeEnum.input],
          defaultValue: 120,
          toolDescription:
            '只限制本插件等待函数响应的时间，不是视频渲染总时长。长视频应由函数异步提交后尽快返回 job_id。'
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
