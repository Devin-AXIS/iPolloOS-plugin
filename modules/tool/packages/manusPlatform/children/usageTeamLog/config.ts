import { defineTool } from '@tool/type';
import {
  FlowNodeInputTypeEnum,
  FlowNodeOutputTypeEnum,
  WorkflowIOValueTypeEnum
} from '@tool/type/ipolloos';

export default defineTool({
  name: {
    'zh-CN': 'Manus 团队用量明细',
    en: 'Manus Team Usage Log'
  },
  description: {
    'zh-CN': 'GET usage.teamLog — 团队成员任务数与积分消耗。',
    en: 'GET /v2/usage.teamLog'
  },
  toolDescription: 'Team feature; filter by Unix start_date/end_date seconds.',
  versionList: [
    {
      value: '1.0.0',
      description: 'Initial',
      inputs: [
        {
          key: 'limit',
          label: 'limit',
          valueType: WorkflowIOValueTypeEnum.number,
          renderTypeList: [FlowNodeInputTypeEnum.reference, FlowNodeInputTypeEnum.numberInput]
        },
        {
          key: 'cursor',
          label: 'cursor',
          valueType: WorkflowIOValueTypeEnum.string,
          renderTypeList: [FlowNodeInputTypeEnum.reference, FlowNodeInputTypeEnum.input]
        },
        {
          key: 'startDate',
          label: 'start_date（Unix 秒）',
          valueType: WorkflowIOValueTypeEnum.number,
          renderTypeList: [FlowNodeInputTypeEnum.reference, FlowNodeInputTypeEnum.numberInput]
        },
        {
          key: 'endDate',
          label: 'end_date（Unix 秒）',
          valueType: WorkflowIOValueTypeEnum.number,
          renderTypeList: [FlowNodeInputTypeEnum.reference, FlowNodeInputTypeEnum.numberInput]
        },
        {
          key: 'sortBy',
          label: 'sort_by',
          valueType: WorkflowIOValueTypeEnum.string,
          renderTypeList: [FlowNodeInputTypeEnum.select, FlowNodeInputTypeEnum.input],
          list: [
            { label: 'task_count', value: 'task_count' },
            { label: 'credits', value: 'credits' }
          ]
        },
        {
          key: 'isAsc',
          label: 'is_asc',
          valueType: WorkflowIOValueTypeEnum.boolean,
          renderTypeList: [FlowNodeInputTypeEnum.reference, FlowNodeInputTypeEnum.switch]
        }
      ],
      outputs: [
        {
          valueType: WorkflowIOValueTypeEnum.string,
          key: 'summary',
          label: '摘要'
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
