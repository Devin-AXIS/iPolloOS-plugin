import { defineTool } from '@tool/type';
import {
  FlowNodeInputTypeEnum,
  FlowNodeOutputTypeEnum,
  WorkflowIOValueTypeEnum
} from '@tool/type/ipolloos';

export default defineTool({
  name: {
    'zh-CN': 'Manus 在线浏览器客户端',
    en: 'Manus Browser Online List'
  },
  description: {
    'zh-CN':
      'GET browser.onlineList — needConnectMyBrowser 时用 client_id 配合 task.confirmAction。',
    en: 'GET /v2/browser.onlineList for connected browser clients.'
  },
  toolDescription: 'See task lifecycle “My Browser”. client_id pairs with task.confirmAction.',
  versionList: [
    {
      value: '1.0.0',
      description: 'Initial',
      inputs: [],
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
