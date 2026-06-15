import { defineTool } from '@tool/type';
import {
  FlowNodeInputTypeEnum,
  FlowNodeOutputTypeEnum,
  WorkflowIOValueTypeEnum
} from '@tool/type/ipolloos';

export default defineTool({
  name: {
    'zh-CN': '上传到 OSS 并获取链接',
    en: 'OSS upload and get links'
  },
  description: {
    'zh-CN':
      '单节点完成上传与分享：从网址拉取或写入文本/HTML。用「用途」区分网页/静态站与普文件（打开方式自动处理）。私有桶会自动带 24h 临时访问链。约 50MB 内直传，更大返回 PUT 预签名。Next 需静态导出再上传，不能 SSR。',
    en: 'One node: upload from URL or text/HTML. Use scope for site vs file (auto inline vs download). Private buckets get a 24h presigned URL. ~50MB direct upload; larger returns presigned PUT. Next needs static export.'
  },
  toolDescription:
    '与七牛 Kodo 上传工具对齐：有「文本内容」时忽略「文件网址」；appId/userId/chatId 可留空（路径段 _）；对外链接可绑 final_public_url；拉取失败带 error_kind。',
  versionList: [
    {
      value: '2.3.0',
      description:
        '可选隔离 ID；文本优先；fetch 归类 timeout/network/http；输出增加 final_public_url / stable_reply_line / minimal_json',
      inputs: [
        {
          key: 'appId',
          label: '应用 ID',
          valueType: WorkflowIOValueTypeEnum.string,
          renderTypeList: [FlowNodeInputTypeEnum.reference, FlowNodeInputTypeEnum.input],
          required: false,
          defaultValue: '',
          toolDescription: '推荐系统变量 appId；留空时路径段为 _'
        },
        {
          key: 'userId',
          label: '用户 ID',
          valueType: WorkflowIOValueTypeEnum.string,
          renderTypeList: [FlowNodeInputTypeEnum.reference, FlowNodeInputTypeEnum.input],
          required: false,
          defaultValue: '',
          toolDescription: '推荐系统变量 userId；留空时路径段为 _'
        },
        {
          key: 'chatId',
          label: '会话 ID',
          valueType: WorkflowIOValueTypeEnum.string,
          renderTypeList: [FlowNodeInputTypeEnum.reference, FlowNodeInputTypeEnum.input],
          required: false,
          defaultValue: '',
          toolDescription: '推荐系统变量 chatId；留空时路径段为 _'
        },
        {
          key: 'scope',
          label: '用途',
          valueType: WorkflowIOValueTypeEnum.string,
          renderTypeList: [FlowNodeInputTypeEnum.select, FlowNodeInputTypeEnum.reference],
          required: true,
          defaultValue: 'files',
          list: [
            { label: '网页/静态站（含 Next 静态导出资源）', value: 'sites' },
            { label: '普通文件（文档、图片、压缩包）', value: 'files' }
          ]
        },
        {
          key: 'relativeKey',
          label: '保存路径（含文件名）',
          valueType: WorkflowIOValueTypeEnum.string,
          renderTypeList: [FlowNodeInputTypeEnum.reference, FlowNodeInputTypeEnum.input],
          required: true,
          placeholder: '例如 index.html 或 docs/readme.pdf',
          toolDescription:
            '相对路径不含前缀；最终会落在 ipolloos/应用ID/用户ID/会话ID/用途(relativeKey)。不同用户或会话目录天然隔离；禁止 ..'
        },
        {
          key: 'sourceUrl',
          label: '文件网址（与下方文本二选一）',
          valueType: WorkflowIOValueTypeEnum.string,
          renderTypeList: [FlowNodeInputTypeEnum.reference, FlowNodeInputTypeEnum.input],
          toolDescription: 'HTTP(S) 可下载地址，如对话里的附件链接。'
        },
        {
          key: 'textContent',
          label: '文本内容（与上方网址二选一）',
          valueType: WorkflowIOValueTypeEnum.string,
          renderTypeList: [FlowNodeInputTypeEnum.reference, FlowNodeInputTypeEnum.textarea],
          toolDescription:
            '直接粘贴 HTML/JSON/Markdown 等；Content-Type 可留空（按保存路径后缀猜测）。'
        },
        {
          key: 'contentType',
          label: 'Content-Type（可选，写文本时未填则按路径后缀猜测）',
          valueType: WorkflowIOValueTypeEnum.string,
          renderTypeList: [FlowNodeInputTypeEnum.reference, FlowNodeInputTypeEnum.input],
          defaultValue: 'text/html; charset=utf-8',
          toolDescription:
            '写网址时可留空，将按扩展名/响应头猜测。写文本时也可留空，若后缀无法识别则需填写。'
        },
        {
          key: 'deliveryMode',
          label: '打开方式（可选）',
          valueType: WorkflowIOValueTypeEnum.string,
          renderTypeList: [FlowNodeInputTypeEnum.select, FlowNodeInputTypeEnum.reference],
          defaultValue: 'auto',
          list: [
            { label: '自动', value: 'auto' },
            { label: '预览/在线打开 (browse)', value: 'browse' },
            { label: '下载 (download)', value: 'download' }
          ],
          toolDescription:
            'Must be exactly one of: auto, browse, download. Omit to use auto. Do not use inline/attachment or other strings.'
        },
        {
          key: 'temporaryLinkDelivery',
          label: '临时链接打开方式（可选）',
          valueType: WorkflowIOValueTypeEnum.string,
          renderTypeList: [FlowNodeInputTypeEnum.select, FlowNodeInputTypeEnum.reference],
          defaultValue: 'auto',
          list: [
            { label: '自动', value: 'auto' },
            { label: '预览/在线打开 (browse)', value: 'browse' },
            { label: '下载 (download)', value: 'download' }
          ],
          toolDescription:
            'Must be exactly one of: auto, browse, download. Omit to use auto. Same enum as deliveryMode.'
        }
      ],
      outputs: [
        { valueType: WorkflowIOValueTypeEnum.string, key: 'summary', label: '摘要（给人读）' },
        {
          valueType: WorkflowIOValueTypeEnum.string,
          key: 'reply_hint',
          label: '可复制到回复的短链说明'
        },
        { valueType: WorkflowIOValueTypeEnum.string, key: 'primary_link', label: '主推访问链接' },
        {
          valueType: WorkflowIOValueTypeEnum.string,
          key: 'final_public_url',
          label: '对外链接（与七牛 final_public_url 同语义）',
          description: '与 primary_link 相同，便于跨云工具统一绑键'
        },
        {
          valueType: WorkflowIOValueTypeEnum.string,
          key: 'stable_reply_line',
          label: '整段可复制说明',
          description: '与 reply_hint 对齐七牛命名；完整排版文案'
        },
        {
          valueType: WorkflowIOValueTypeEnum.string,
          key: 'minimal_json',
          label: '极简 JSON（含 ok、error_kind）',
          description: '程序解析或排障；失败时含 error_kind'
        },
        {
          valueType: WorkflowIOValueTypeEnum.string,
          key: 'static_site_preview_url',
          label: '静态站预览地址'
        },
        {
          valueType: WorkflowIOValueTypeEnum.string,
          key: 'temporary_access_url',
          label: '临时访问链接'
        },
        {
          valueType: WorkflowIOValueTypeEnum.string,
          key: 'large_file_upload_url',
          label: '大文件直传地址'
        },
        {
          valueType: WorkflowIOValueTypeEnum.string,
          key: 'object_key',
          label: '对象 Key（排障用）'
        },
        { valueType: WorkflowIOValueTypeEnum.string, key: 'detail_json', label: '完整 JSON' },
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
