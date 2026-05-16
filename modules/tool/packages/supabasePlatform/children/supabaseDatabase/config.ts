import { defineTool } from '@tool/type';
import {
  FlowNodeInputTypeEnum,
  FlowNodeOutputTypeEnum,
  WorkflowIOValueTypeEnum
} from '@tool/type/ipolloos';

export default defineTool({
  name: {
    'zh-CN': 'Supabase 数据库',
    en: 'Supabase Database'
  },
  description: {
    'zh-CN': '在已配置项目上执行只读或可写 SQL（Management API database query）。',
    en: 'Run read-only or read/write SQL via Management API.'
  },
  toolDescription:
    'sqlMode=readOnly 走 read-only 端点；readWrite 可走 DDL/DML（高危）。projectRef 可空，使用插件「默认项目 ref」。',
  versionList: [
    {
      value: '0.2.0',
      description: 'Aggregated SQL',
      inputs: [
        {
          key: 'projectRef',
          label: '项目 ref（可选）',
          valueType: WorkflowIOValueTypeEnum.string,
          renderTypeList: [FlowNodeInputTypeEnum.reference, FlowNodeInputTypeEnum.input],
          required: false,
          toolDescription: '覆盖插件默认 defaultProjectRef。'
        },
        {
          key: 'sqlMode',
          label: 'SQL 模式',
          valueType: WorkflowIOValueTypeEnum.string,
          renderTypeList: [FlowNodeInputTypeEnum.select],
          required: true,
          list: [
            { label: '只读 SQL', value: 'readOnly' },
            { label: '可写 SQL', value: 'readWrite' }
          ],
          defaultValue: 'readOnly',
          toolDescription: 'readOnly：安全探查；readWrite：DDL/DML。'
        },
        {
          key: 'sqlQuery',
          label: 'SQL',
          valueType: WorkflowIOValueTypeEnum.string,
          renderTypeList: [FlowNodeInputTypeEnum.textarea, FlowNodeInputTypeEnum.reference],
          required: true,
          toolDescription: 'SQL 文本。'
        },
        {
          key: 'parametersJson',
          label: 'parameters JSON（可选）',
          valueType: WorkflowIOValueTypeEnum.string,
          renderTypeList: [FlowNodeInputTypeEnum.textarea, FlowNodeInputTypeEnum.reference],
          required: false,
          toolDescription: '参数化查询时的 parameters 数组 JSON。'
        },
        {
          key: 'readOnly',
          label: 'read_only（仅可写端点）',
          valueType: WorkflowIOValueTypeEnum.boolean,
          renderTypeList: [FlowNodeInputTypeEnum.switch],
          defaultValue: false,
          toolDescription: 'sqlMode=readWrite 时设为 true 则请求体带 read_only。'
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
