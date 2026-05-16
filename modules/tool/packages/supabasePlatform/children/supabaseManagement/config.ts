import { defineTool } from '@tool/type';
import {
  FlowNodeInputTypeEnum,
  FlowNodeOutputTypeEnum,
  WorkflowIOValueTypeEnum
} from '@tool/type/ipolloos';
import { MANAGEMENT_OPERATION_LIST } from '../../lib/routeTable';

const opSelectList = [
  ...MANAGEMENT_OPERATION_LIST.map((v) => ({ label: v, value: v })),
  { label: 'raw.request（任意 /v1）', value: 'raw.request' }
];

export default defineTool({
  name: {
    'zh-CN': 'Supabase 管理',
    en: 'Supabase Management'
  },
  description: {
    'zh-CN':
      '统一入口：组织/项目/Secrets/API Keys/Edge Functions/配置/域名/Vanity/分支等 Management API；另含 raw.request 逃生口。',
    en: 'Unified Management API router plus raw /v1 escape hatch.'
  },
  toolDescription:
    '选 operation；路径参数填 projectRef / organizationSlug / branchId 等。可与插件默认 defaultProjectRef、defaultOrganizationSlug 合并。raw.request 需另填 httpMethod、path、queryJson、bodyJson。',
  versionList: [
    {
      value: '0.2.0',
      description: 'Unified router',
      inputs: [
        {
          key: 'operation',
          label: '操作',
          valueType: WorkflowIOValueTypeEnum.string,
          renderTypeList: [FlowNodeInputTypeEnum.select, FlowNodeInputTypeEnum.input],
          required: true,
          list: opSelectList,
          toolDescription: 'Management 操作名，或 raw.request。'
        },
        {
          key: 'projectRef',
          label: '项目 ref（可选）',
          valueType: WorkflowIOValueTypeEnum.string,
          renderTypeList: [FlowNodeInputTypeEnum.reference, FlowNodeInputTypeEnum.input],
          required: false,
          toolDescription: '覆盖插件 defaultProjectRef。'
        },
        {
          key: 'organizationSlug',
          label: '组织 slug（可选）',
          valueType: WorkflowIOValueTypeEnum.string,
          renderTypeList: [FlowNodeInputTypeEnum.reference, FlowNodeInputTypeEnum.input],
          required: false,
          toolDescription: '覆盖插件 defaultOrganizationSlug。'
        },
        {
          key: 'branchId',
          label: '分支 ID（可选）',
          valueType: WorkflowIOValueTypeEnum.string,
          renderTypeList: [FlowNodeInputTypeEnum.reference, FlowNodeInputTypeEnum.input],
          required: false,
          toolDescription: 'branch.get/delete/merge。'
        },
        {
          key: 'apiKeyId',
          label: 'API Key ID（可选）',
          valueType: WorkflowIOValueTypeEnum.string,
          renderTypeList: [FlowNodeInputTypeEnum.reference, FlowNodeInputTypeEnum.input],
          required: false,
          toolDescription: 'apiKey.delete。'
        },
        {
          key: 'functionSlug',
          label: '函数 slug（可选）',
          valueType: WorkflowIOValueTypeEnum.string,
          renderTypeList: [FlowNodeInputTypeEnum.reference, FlowNodeInputTypeEnum.input],
          required: false,
          toolDescription: 'function.delete。'
        },
        {
          key: 'slug',
          label: 'query slug（可选）',
          valueType: WorkflowIOValueTypeEnum.string,
          renderTypeList: [FlowNodeInputTypeEnum.reference, FlowNodeInputTypeEnum.input],
          required: false,
          toolDescription: 'function.deploy 的 query 参数。'
        },
        {
          key: 'bodyJson',
          label: '请求体 JSON（可选）',
          valueType: WorkflowIOValueTypeEnum.string,
          renderTypeList: [FlowNodeInputTypeEnum.textarea, FlowNodeInputTypeEnum.reference],
          required: false,
          toolDescription: 'POST/PATCH/DELETE 等有 body 的操作。'
        },
        {
          key: 'httpMethod',
          label: 'HTTP 方法（仅 raw.request）',
          valueType: WorkflowIOValueTypeEnum.string,
          renderTypeList: [FlowNodeInputTypeEnum.select],
          required: false,
          list: [
            { label: 'GET', value: 'GET' },
            { label: 'POST', value: 'POST' },
            { label: 'PATCH', value: 'PATCH' },
            { label: 'PUT', value: 'PUT' },
            { label: 'DELETE', value: 'DELETE' }
          ],
          toolDescription: 'raw.request 专用。'
        },
        {
          key: 'path',
          label: '路径（仅 raw.request）',
          valueType: WorkflowIOValueTypeEnum.string,
          renderTypeList: [FlowNodeInputTypeEnum.input, FlowNodeInputTypeEnum.reference],
          required: false,
          toolDescription: '必须以 /v1/ 开头。'
        },
        {
          key: 'queryJson',
          label: 'Query JSON（仅 raw.request）',
          valueType: WorkflowIOValueTypeEnum.string,
          renderTypeList: [FlowNodeInputTypeEnum.textarea, FlowNodeInputTypeEnum.reference],
          required: false,
          toolDescription: 'query string 键值 JSON。'
        }
      ],
      outputs: [
        { valueType: WorkflowIOValueTypeEnum.string, key: 'summary', label: '摘要' },
        { valueType: WorkflowIOValueTypeEnum.string, key: 'detail_json', label: 'JSON' },
        { valueType: WorkflowIOValueTypeEnum.number, key: 'http_status', label: 'HTTP 状态码' },
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
