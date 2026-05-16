import { defineTool } from '@tool/type';
import {
  FlowNodeInputTypeEnum,
  FlowNodeOutputTypeEnum,
  WorkflowIOValueTypeEnum
} from '@tool/type/ipolloos';

export default defineTool({
  name: {
    'zh-CN': 'Manus 用量列表',
    en: 'Manus Usage List'
  },
  description: {
    'zh-CN': 'GET usage.list — 当前用户积分变动历史（会话粒度）。',
    en: 'GET /v2/usage.list — credit history.'
  },
  toolDescription: 'Paginated with limit (max 100) and cursor.',
  versionList: [
    {
      value: '1.0.0',
      description: 'Initial',
      inputs: [
        {
          key: 'limit',
          label: 'limit（最大 100）',
          valueType: WorkflowIOValueTypeEnum.number,
          renderTypeList: [FlowNodeInputTypeEnum.reference, FlowNodeInputTypeEnum.numberInput]
        },
        {
          key: 'cursor',
          label: 'cursor',
          valueType: WorkflowIOValueTypeEnum.string,
          renderTypeList: [FlowNodeInputTypeEnum.reference, FlowNodeInputTypeEnum.input]
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
