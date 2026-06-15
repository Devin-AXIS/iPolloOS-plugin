import { defineTool } from '@tool/type';
import {
  FlowNodeInputTypeEnum,
  FlowNodeOutputTypeEnum,
  WorkflowIOValueTypeEnum
} from '@tool/type/ipolloos';

export default defineTool({
  name: { 'zh-CN': '查询和管理动态表', en: 'Query and manage dynamic table' },
  description: {
    'zh-CN': '查询、新增、更新、删除当前 Agent 已存在的动态表记录。',
    en: 'Query, insert, update, and delete records in an existing dynamic table for the current Agent.'
  },
  toolDescription:
    '运行期使用。选择动作后只填写对应业务字段：查询用筛选条件/关键词/数量；新增用记录内容；更新用记录 ID 和更新内容；删除用记录 ID。不要填写应用 ID、用户 ID、Agent ID、密钥或 token。',
  versionList: [
    {
      value: '1.0.0',
      description: '动态表记录查询和管理',
      inputs: [
        {
          key: 'action',
          label: '动作',
          valueType: WorkflowIOValueTypeEnum.string,
          renderTypeList: [FlowNodeInputTypeEnum.select, FlowNodeInputTypeEnum.reference],
          required: true,
          defaultValue: 'query',
          list: [
            { label: '查询', value: 'query' },
            { label: '新增', value: 'insert' },
            { label: '更新', value: 'update' },
            { label: '删除', value: 'delete' }
          ],
          toolDescription: '要执行的记录动作。'
        },
        {
          key: 'table',
          label: '表名',
          valueType: WorkflowIOValueTypeEnum.string,
          renderTypeList: [FlowNodeInputTypeEnum.reference, FlowNodeInputTypeEnum.input],
          required: true,
          toolDescription: '动态表名称、key 或 slug。不要填写应用 ID 或 Agent ID。'
        },
        {
          key: 'filter_json',
          label: '筛选条件',
          valueType: WorkflowIOValueTypeEnum.string,
          renderTypeList: [FlowNodeInputTypeEnum.reference, FlowNodeInputTypeEnum.textarea],
          toolDescription: '查询时可用。JSON 对象，例如 {"goal":"减脂"}。'
        },
        {
          key: 'search',
          label: '关键词',
          valueType: WorkflowIOValueTypeEnum.string,
          renderTypeList: [FlowNodeInputTypeEnum.reference, FlowNodeInputTypeEnum.input],
          toolDescription: '查询时可用，按文本模糊搜索。'
        },
        {
          key: 'limit',
          label: '数量',
          valueType: WorkflowIOValueTypeEnum.number,
          renderTypeList: [FlowNodeInputTypeEnum.numberInput, FlowNodeInputTypeEnum.reference],
          defaultValue: 20,
          toolDescription: '查询时可用。最多返回多少条，默认 20，最大 100。'
        },
        {
          key: 'record_json',
          label: '记录内容',
          valueType: WorkflowIOValueTypeEnum.string,
          renderTypeList: [FlowNodeInputTypeEnum.reference, FlowNodeInputTypeEnum.textarea],
          toolDescription: '新增时必填。JSON 对象，例如 {"goal":"减脂","height":175}。'
        },
        {
          key: 'record_id',
          label: '记录 ID',
          valueType: WorkflowIOValueTypeEnum.string,
          renderTypeList: [FlowNodeInputTypeEnum.reference, FlowNodeInputTypeEnum.input],
          toolDescription: '更新或删除时必填。'
        },
        {
          key: 'patch_json',
          label: '更新内容',
          valueType: WorkflowIOValueTypeEnum.string,
          renderTypeList: [FlowNodeInputTypeEnum.reference, FlowNodeInputTypeEnum.textarea],
          toolDescription: '更新时必填。JSON 对象，例如 {"weight":70.5}。'
        }
      ],
      outputs: [
        { valueType: WorkflowIOValueTypeEnum.boolean, key: 'ok', label: '是否成功' },
        { valueType: WorkflowIOValueTypeEnum.string, key: 'operation', label: '动作' },
        { valueType: WorkflowIOValueTypeEnum.string, key: 'records_json', label: '记录列表 JSON' },
        {
          valueType: WorkflowIOValueTypeEnum.string,
          key: 'records_markdown',
          label: '记录列表 Markdown'
        },
        { valueType: WorkflowIOValueTypeEnum.string, key: 'record_json', label: '单条记录 JSON' },
        { valueType: WorkflowIOValueTypeEnum.number, key: 'count', label: '数量' },
        { valueType: WorkflowIOValueTypeEnum.string, key: 'action_json', label: '动作 JSON' },
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
