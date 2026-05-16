import { defineTool } from '@tool/type';
import {
  FlowNodeInputTypeEnum,
  FlowNodeOutputTypeEnum,
  WorkflowIOValueTypeEnum
} from '@tool/type/ipolloos';

export default defineTool({
  name: {
    'zh-CN': '将多文件打成 ZIP',
    en: 'Create ZIP from files JSON'
  },
  description: {
    'zh-CN':
      '根据 JSON 描述的多文件内容生成标准 ZIP（DEFLATE）。支持每条为 text（UTF-8）或 base64（二进制）。路径含子目录用斜杠；禁止 ..。有总输入体积与输出 base64 上限。',
    en: 'Build a ZIP from a JSON array of text or base64 files with relative paths.'
  },
  toolDescription:
    'files_json 示例：[{"path":"readme.txt","text":"hi"},{"path":"a.bin","base64":"..."}]（二选一字段 text 或 base64）',
  versionList: [
    {
      value: '1.0.0',
      description: '首版',
      inputs: [
        {
          key: 'files_json',
          label: '文件描述 JSON',
          valueType: WorkflowIOValueTypeEnum.string,
          renderTypeList: [FlowNodeInputTypeEnum.reference, FlowNodeInputTypeEnum.textarea],
          required: true,
          toolDescription: '数组；每项 path + text（UTF-8）或 path + base64（二进制）'
        }
      ],
      outputs: [
        { valueType: WorkflowIOValueTypeEnum.string, key: 'summary', label: '摘要' },
        { valueType: WorkflowIOValueTypeEnum.string, key: 'zip_base64', label: 'ZIP Base64' },
        { valueType: WorkflowIOValueTypeEnum.string, key: 'entry_count', label: '文件数' },
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
