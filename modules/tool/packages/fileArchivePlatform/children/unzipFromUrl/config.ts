import { defineTool } from '@tool/type';
import {
  FlowNodeInputTypeEnum,
  FlowNodeOutputTypeEnum,
  WorkflowIOValueTypeEnum
} from '@tool/type/ipolloos';

export default defineTool({
  name: {
    'zh-CN': '解压压缩包',
    en: 'Extract archive'
  },
  description: {
    'zh-CN':
      '支持三种来源（三选一）：① 压缩包 HTTP(S) 直链；② archive_base64（整包 base64，可带 data:...;base64, 前缀）；③ 工作流中「文件」连线（取第一个可下载 URL）。解压 zip/tar/tgz 等。小文本进 JSON 的 text 字段，二进制为 base64。',
    en: 'Extract from URL, base64, or first file attachment URL. zip/tar/tgz.'
  },
  toolDescription:
    '三选一：archive_url、archive_base64、或 archive_files（引用用户上传/文件列表）。不要同时填多个。',
  versionList: [
    {
      value: '1.1.3',
      description: '支持主应用内联 __ipolloosInlineArchiveBase64',
      inputs: [
        {
          key: 'archive_url',
          label: '压缩包 URL（可选）',
          valueType: WorkflowIOValueTypeEnum.string,
          renderTypeList: [FlowNodeInputTypeEnum.reference, FlowNodeInputTypeEnum.input],
          required: false,
          placeholder: 'https://example.com/a.zip',
          toolDescription: '与 base64、文件连线三选一'
        },
        {
          key: 'archive_base64',
          label: '压缩包 Base64（可选）',
          valueType: WorkflowIOValueTypeEnum.string,
          renderTypeList: [FlowNodeInputTypeEnum.reference, FlowNodeInputTypeEnum.textarea],
          required: false,
          toolDescription: '整包 base64；大文件建议用 URL 或文件连线'
        },
        {
          key: 'archive_files',
          label: '上传的压缩包（可选）',
          valueType: WorkflowIOValueTypeEnum.arrayAny,
          renderTypeList: [FlowNodeInputTypeEnum.fileSelect, FlowNodeInputTypeEnum.reference],
          required: false,
          toolDescription:
            '工作流/Agent 中绑定上传文件：主应用会把存储 key 换成临时下载 URL 再调用插件；也可直接传 URL 字符串。'
        },
        {
          key: 'max_uncompressed_mb',
          label: '解压后总大小上限（MB）',
          valueType: WorkflowIOValueTypeEnum.number,
          renderTypeList: [FlowNodeInputTypeEnum.numberInput, FlowNodeInputTypeEnum.reference],
          defaultValue: 12,
          toolDescription: '默认 12MB'
        },
        {
          key: 'max_files',
          label: '最多文件数',
          valueType: WorkflowIOValueTypeEnum.number,
          renderTypeList: [FlowNodeInputTypeEnum.numberInput, FlowNodeInputTypeEnum.reference],
          defaultValue: 60,
          toolDescription: '单包条目上限'
        }
      ],
      outputs: [
        { valueType: WorkflowIOValueTypeEnum.string, key: 'summary', label: '摘要' },
        { valueType: WorkflowIOValueTypeEnum.string, key: 'files_json', label: '文件列表 JSON' },
        { valueType: WorkflowIOValueTypeEnum.string, key: 'file_count', label: '文件数' },
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
