import { defineTool } from '@tool/type';
import {
  FlowNodeInputTypeEnum,
  FlowNodeOutputTypeEnum,
  WorkflowIOValueTypeEnum
} from '@tool/type/ipolloos';

const icon = 'https://os.ipollo.net/system/plugin/tools/ipolloPushPlatform/send_ipollo_push/logo';

export default defineTool({
  toolId: 'ipolloPushPlatform/send_ipollo_push',
  icon,
  avatar: icon,
  name: {
    'zh-CN': '发送 iPollo 推送',
    en: 'Send iPollo push'
  },
  description: {
    'zh-CN': '填写 iPollo App Agent Hook 地址并发送一条监控推送。',
    en: 'Send a monitor push to an iPollo App Agent Hook URL.'
  },
  toolDescription:
    '用于把监控更新、报告摘要或事件提醒推送到 iPollo App 智能体聊天。hook_url 填 App 里点击 Agent 名字复制出来的 Hook 地址；text 放要推送的正文内容。',
  versionList: [
    {
      value: '1.1.1',
      description: '向 iPollo App Agent Hook 发送文本推送',
      inputs: [
        {
          key: 'hook_url',
          label: 'Hook 地址',
          valueType: WorkflowIOValueTypeEnum.string,
          renderTypeList: [FlowNodeInputTypeEnum.reference, FlowNodeInputTypeEnum.input],
          required: true,
          toolDescription:
            '在 iPollo App 里点击 Agent 名字复制出来的 Hook 地址。同一个 Agent 的地址对所有用户一致。'
        },
        {
          key: 'agent_id',
          label: 'Agent ID',
          valueType: WorkflowIOValueTypeEnum.string,
          renderTypeList: [FlowNodeInputTypeEnum.hidden],
          toolDescription: '兼容字段；通常不需要填写。'
        },
        {
          key: 'text',
          label: '推送内容',
          valueType: WorkflowIOValueTypeEnum.string,
          renderTypeList: [FlowNodeInputTypeEnum.reference, FlowNodeInputTypeEnum.textarea],
          toolDescription:
            '要推送到智能体聊天里的正文内容。为空时会依次使用摘要、标题、payload_json.text / summary / content。'
        },
        {
          key: 'title',
          label: '标题',
          valueType: WorkflowIOValueTypeEnum.string,
          renderTypeList: [FlowNodeInputTypeEnum.hidden],
          toolDescription: '可选；监控或报告标题。'
        },
        {
          key: 'summary',
          label: '摘要',
          valueType: WorkflowIOValueTypeEnum.string,
          renderTypeList: [FlowNodeInputTypeEnum.hidden],
          toolDescription: '可选；简短摘要。'
        },
        {
          key: 'event_type',
          label: '事件类型',
          valueType: WorkflowIOValueTypeEnum.string,
          renderTypeList: [FlowNodeInputTypeEnum.hidden],
          defaultValue: 'ipolloos.push',
          toolDescription: '可选；默认 ipolloos.push。'
        },
        {
          key: 'event_id',
          label: '事件 ID',
          valueType: WorkflowIOValueTypeEnum.string,
          renderTypeList: [FlowNodeInputTypeEnum.hidden],
          toolDescription: '可选；为空时自动生成。'
        },
        {
          key: 'target_user_ids',
          label: '指定用户 ID',
          valueType: WorkflowIOValueTypeEnum.string,
          renderTypeList: [FlowNodeInputTypeEnum.hidden, FlowNodeInputTypeEnum.reference],
          toolDescription: '可选；JSON 数组或逗号分隔 application_users.id。通常不需要填写。'
        },
        {
          key: 'payload_json',
          label: '原始事件 JSON',
          valueType: WorkflowIOValueTypeEnum.string,
          renderTypeList: [FlowNodeInputTypeEnum.hidden, FlowNodeInputTypeEnum.reference],
          toolDescription: '可选；监控事件原始 JSON，会进入用户会话消息 payload。'
        },
        {
          key: 'per_user_payload_json',
          label: '用户差异 JSON',
          valueType: WorkflowIOValueTypeEnum.string,
          renderTypeList: [FlowNodeInputTypeEnum.hidden, FlowNodeInputTypeEnum.reference],
          toolDescription:
            '可选；按 userId 分组的差异内容 JSON，例如 {"userId":{"text":"..."}}。默认不需要填写。'
        },
        {
          key: 'push_policy',
          label: 'Push Policy',
          valueType: WorkflowIOValueTypeEnum.string,
          renderTypeList: [FlowNodeInputTypeEnum.hidden, FlowNodeInputTypeEnum.reference],
          toolDescription:
            'Optional policy. Use skip_empty_allowed_updates to skip empty updates from allowlisted source tools.'
        },
        {
          key: 'source_tool',
          label: 'Source Tool',
          valueType: WorkflowIOValueTypeEnum.string,
          renderTypeList: [FlowNodeInputTypeEnum.hidden, FlowNodeInputTypeEnum.reference],
          toolDescription: 'Optional source tool id, for example xPlatform_xapito/checkAccountUpdates.'
        },
        {
          key: 'count',
          label: 'Update Count',
          valueType: WorkflowIOValueTypeEnum.number,
          renderTypeList: [FlowNodeInputTypeEnum.hidden, FlowNodeInputTypeEnum.reference],
          toolDescription: 'Optional update count from a monitor node.'
        },
        {
          key: 'system_error',
          label: 'System Error',
          valueType: WorkflowIOValueTypeEnum.any,
          renderTypeList: [FlowNodeInputTypeEnum.hidden, FlowNodeInputTypeEnum.reference],
          toolDescription: 'Optional upstream system error. Push is not skipped when this has content.'
        }
      ],
      outputs: [
        { valueType: WorkflowIOValueTypeEnum.boolean, key: 'ok', label: '是否成功' },
        { valueType: WorkflowIOValueTypeEnum.string, key: 'status_code', label: '状态码' },
        { valueType: WorkflowIOValueTypeEnum.string, key: 'event_id', label: '事件 ID' },
        {
          valueType: WorkflowIOValueTypeEnum.number,
          key: 'matched_user_count',
          label: '匹配用户数'
        },
        { valueType: WorkflowIOValueTypeEnum.number, key: 'delivered_count', label: '投递数' },
        { valueType: WorkflowIOValueTypeEnum.number, key: 'skipped_count', label: '跳过数' },
        { valueType: WorkflowIOValueTypeEnum.string, key: 'response_text', label: '响应内容' },
        { valueType: WorkflowIOValueTypeEnum.boolean, key: 'skipped', label: 'Skipped' },
        { valueType: WorkflowIOValueTypeEnum.string, key: 'skip_reason', label: 'Skip Reason' },
        {
          type: FlowNodeOutputTypeEnum.error,
          valueType: WorkflowIOValueTypeEnum.string,
          key: 'system_error',
          label: '错误'
        }
      ]
    },
    {
      value: '1.0.0',
      description: '兼容旧版：向 iPollo App Agent Hook 发送文本推送',
      inputs: [
        {
          key: 'hook_url',
          label: 'Hook 地址',
          valueType: WorkflowIOValueTypeEnum.string,
          renderTypeList: [FlowNodeInputTypeEnum.reference, FlowNodeInputTypeEnum.input],
          required: true,
          toolDescription: '在 iPollo App 里点击 Agent 名字复制出来的 Hook 地址。'
        },
        {
          key: 'text',
          label: '推送内容',
          valueType: WorkflowIOValueTypeEnum.string,
          renderTypeList: [FlowNodeInputTypeEnum.reference, FlowNodeInputTypeEnum.textarea],
          toolDescription:
            '要推送到智能体聊天里的正文内容。为空时会依次使用摘要、标题、payload_json.text / summary / content。'
        },
        {
          key: 'title',
          label: '标题',
          valueType: WorkflowIOValueTypeEnum.string,
          renderTypeList: [FlowNodeInputTypeEnum.hidden],
          toolDescription: '可选；监控或报告标题。'
        },
        {
          key: 'summary',
          label: '摘要',
          valueType: WorkflowIOValueTypeEnum.string,
          renderTypeList: [FlowNodeInputTypeEnum.hidden],
          toolDescription: '可选；简短摘要。'
        },
        {
          key: 'event_type',
          label: '事件类型',
          valueType: WorkflowIOValueTypeEnum.string,
          renderTypeList: [FlowNodeInputTypeEnum.hidden],
          defaultValue: 'ipolloos.push',
          toolDescription: '可选；默认 ipolloos.push。'
        },
        {
          key: 'event_id',
          label: '事件 ID',
          valueType: WorkflowIOValueTypeEnum.string,
          renderTypeList: [FlowNodeInputTypeEnum.hidden],
          toolDescription: '可选；为空时自动生成。'
        }
      ],
      outputs: [
        { valueType: WorkflowIOValueTypeEnum.boolean, key: 'ok', label: '是否成功' },
        { valueType: WorkflowIOValueTypeEnum.string, key: 'status_code', label: '状态码' },
        { valueType: WorkflowIOValueTypeEnum.string, key: 'event_id', label: '事件 ID' },
        { valueType: WorkflowIOValueTypeEnum.string, key: 'response_text', label: '响应内容' },
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
