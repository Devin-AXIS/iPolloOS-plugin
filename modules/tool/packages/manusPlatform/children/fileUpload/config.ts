import { defineTool } from '@tool/type';
import {
  FlowNodeInputTypeEnum,
  FlowNodeOutputTypeEnum,
  WorkflowIOValueTypeEnum
} from '@tool/type/ipolloos';

export default defineTool({
  name: {
    'zh-CN': 'Manus 申请上传文件',
    en: 'Manus File Upload (presign)'
  },
  description: {
    'zh-CN': 'POST file.upload 返回 upload_url，需自行 PUT 字节；再用 file_id 附加到任务消息。',
    en: 'POST /v2/file.upload — presigned URL; PUT bytes separately.'
  },
  toolDescription:
    'iPolloOS: step 1 only — use HTTP Request tool/node to PUT bytes to upload_url from detail_json, then fileDetail until uploaded; pass file_id into task messages in a later Manus node.',
  versionList: [
    {
      value: '1.0.0',
      description: 'Initial',
      inputs: [
        {
          key: 'filename',
          label: 'filename（含扩展名）',
          valueType: WorkflowIOValueTypeEnum.string,
          renderTypeList: [FlowNodeInputTypeEnum.reference, FlowNodeInputTypeEnum.input],
          required: true
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
