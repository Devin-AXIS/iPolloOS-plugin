import { defineTool } from '@tool/type';
import {
  FlowNodeInputTypeEnum,
  FlowNodeOutputTypeEnum,
  WorkflowIOValueTypeEnum
} from '@tool/type/ipolloos';

export default defineTool({
  name: {
    'zh-CN': 'Manus 任务消息列表',
    en: 'Manus List Task Messages'
  },
  description: {
    'zh-CN': 'GET task.listMessages 分页拉取任务事件消息，用于轮询进度。',
    en: 'GET /v2/task.listMessages — poll task progress & transcripts.'
  },
  toolDescription:
    'Poll sparingly: at most every ~8–15s or when user asks; do not call every model thought step. Same turn: prefer ONE listMessages (verbose if need attachments) then summarize; avoid alternating with taskDetail in a tight loop. Paste reply_markdown to user when non-empty.',
  versionList: [
    {
      value: '1.0.0',
      description: 'Initial',
      inputs: [
        {
          key: 'taskId',
          label: 'Task ID',
          valueType: WorkflowIOValueTypeEnum.string,
          renderTypeList: [FlowNodeInputTypeEnum.reference, FlowNodeInputTypeEnum.input],
          required: true
        },
        {
          key: 'limit',
          label: '每页条数（默认 50，最大 200）',
          valueType: WorkflowIOValueTypeEnum.number,
          renderTypeList: [FlowNodeInputTypeEnum.reference, FlowNodeInputTypeEnum.numberInput],
          toolDescription: 'Optional; omit to use API default'
        },
        {
          key: 'cursor',
          label: 'cursor（分页）',
          valueType: WorkflowIOValueTypeEnum.string,
          renderTypeList: [FlowNodeInputTypeEnum.reference, FlowNodeInputTypeEnum.input],
          toolDescription: 'From prior response next_cursor'
        },
        {
          key: 'order',
          label: '排序',
          valueType: WorkflowIOValueTypeEnum.string,
          renderTypeList: [FlowNodeInputTypeEnum.select, FlowNodeInputTypeEnum.input],
          defaultValue: 'desc',
          list: [
            { label: 'desc（新在前）', value: 'desc' },
            { label: 'asc', value: 'asc' }
          ]
        },
        {
          key: 'verbose',
          label: 'verbose',
          valueType: WorkflowIOValueTypeEnum.boolean,
          renderTypeList: [FlowNodeInputTypeEnum.switch],
          defaultValue: false,
          toolDescription:
            'true 时含 tool_used 等，便于从正文里解析截图链接（配合 reply_markdown）。'
        },
        {
          key: 'includeHeuristicUrls',
          label: '从正文中提取媒体 URL',
          valueType: WorkflowIOValueTypeEnum.boolean,
          renderTypeList: [FlowNodeInputTypeEnum.switch],
          defaultValue: true,
          toolDescription:
            '除官方 attachments 外，是否在 assistant / tool 文本里用正则提取图片、PDF、视频链接。'
        },
        {
          key: 'slidesFormat',
          label: 'slides_format（可选）',
          valueType: WorkflowIOValueTypeEnum.string,
          renderTypeList: [FlowNodeInputTypeEnum.select, FlowNodeInputTypeEnum.input],
          list: [
            { label: '(默认)', value: '' },
            { label: 'html', value: 'html' },
            { label: 'pptx', value: 'pptx' }
          ]
        }
      ],
      outputs: [
        {
          valueType: WorkflowIOValueTypeEnum.string,
          key: 'summary',
          label: '摘要'
        },
        {
          valueType: WorkflowIOValueTypeEnum.number,
          key: 'attachment_count',
          label: '附件条数（含截图/文件 URL）'
        },
        {
          valueType: WorkflowIOValueTypeEnum.string,
          key: 'attachments_json',
          label: '附件列表 JSON（url/type/filename）'
        },
        {
          valueType: WorkflowIOValueTypeEnum.string,
          key: 'reply_markdown',
          label: '可直接发给用户的 Markdown（含图片语法）'
        },
        {
          valueType: WorkflowIOValueTypeEnum.string,
          key: 'detail_json',
          label: '完整响应 JSON'
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
