import { defineTool } from '@tool/type';
import {
  FlowNodeInputTypeEnum,
  FlowNodeOutputTypeEnum,
  WorkflowIOValueTypeEnum
} from '@tool/type/ipolloos';

export default defineTool({
  name: {
    'zh-CN': 'Manus Webhook 公钥',
    en: 'Manus Webhook Public Key'
  },
  description: {
    'zh-CN': 'GET webhook.publicKey — 校验回调签名。',
    en: 'GET /v2/webhook.publicKey'
  },
  toolDescription: 'Verify webhook signatures per Manus security guide.',
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
