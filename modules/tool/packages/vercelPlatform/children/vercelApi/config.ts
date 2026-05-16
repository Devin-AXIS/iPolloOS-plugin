import { defineTool } from '@tool/type';
import {
  FlowNodeInputTypeEnum,
  FlowNodeOutputTypeEnum,
  WorkflowIOValueTypeEnum
} from '@tool/type/ipolloos';

export default defineTool({
  name: {
    'zh-CN': 'Vercel API（兜底）',
    en: 'Vercel raw API'
  },
  description: {
    'zh-CN':
      '直接调用 api.vercel.com 上任意受支持路径（须以 /v数字/ 开头），用于覆盖未单独封装的全部 REST 能力；供自动化与高级场景使用。',
    en: 'Invoke any Vercel REST path starting with /vN/ for full API coverage; for automation and advanced use.'
  },
  toolDescription:
    'http_method + path（/v13/...）+ 可选 query_json、body_json 字符串。仅允许官方 API 路径前缀，防止 SSRF。',
  versionList: [
    {
      value: '1.0.0',
      description: '首版',
      inputs: [
        {
          key: 'http_method',
          label: 'HTTP 方法',
          valueType: WorkflowIOValueTypeEnum.string,
          renderTypeList: [FlowNodeInputTypeEnum.input, FlowNodeInputTypeEnum.reference],
          required: true,
          toolDescription: 'GET | POST | PUT | PATCH | DELETE'
        },
        {
          key: 'path',
          label: '路径',
          valueType: WorkflowIOValueTypeEnum.string,
          renderTypeList: [FlowNodeInputTypeEnum.input, FlowNodeInputTypeEnum.reference],
          required: true,
          toolDescription: '例如 /v10/projects'
        },
        {
          key: 'query_json',
          label: 'Query JSON（可选）',
          valueType: WorkflowIOValueTypeEnum.string,
          renderTypeList: [FlowNodeInputTypeEnum.textarea, FlowNodeInputTypeEnum.reference],
          required: false,
          toolDescription: '扁平对象，如 {"limit":"10"}'
        },
        {
          key: 'body_json',
          label: 'Body JSON（可选）',
          valueType: WorkflowIOValueTypeEnum.string,
          renderTypeList: [FlowNodeInputTypeEnum.textarea, FlowNodeInputTypeEnum.reference],
          required: false,
          toolDescription: 'POST/PATCH/PUT 时使用'
        }
      ],
      outputs: [
        { valueType: WorkflowIOValueTypeEnum.string, key: 'status', label: 'HTTP 状态码' },
        { valueType: WorkflowIOValueTypeEnum.string, key: 'result_json', label: '响应 JSON' },
        { valueType: WorkflowIOValueTypeEnum.string, key: 'result_text', label: '响应原文' },
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
