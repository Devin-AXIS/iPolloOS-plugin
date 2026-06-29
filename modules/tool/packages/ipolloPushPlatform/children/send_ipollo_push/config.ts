import { defineTool } from '@tool/type';
import {
  FlowNodeInputTypeEnum,
  FlowNodeOutputTypeEnum,
  WorkflowIOValueTypeEnum
} from '@tool/type/ipolloos';

export default defineTool({
  name: {
    'zh-CN': '发送 iPollo 推送',
    en: 'Send iPollo push'
  },
  description: {
    'zh-CN': '向当前 iPollo App 智能体发送监控推送，支持原生卡片。',
    en: 'Send a monitor push with an optional native card to the current iPollo App Agent.'
  },
  toolDescription:
    '用于把监控更新、报告摘要或事件提醒推送到当前 iPollo App 智能体聊天。默认使用运行时 App/Agent 身份，不需要用户填写 Hook 地址；如上游原生卡片插件返回 app_card，可把 app_card 传入 app_card_json。有原生卡片时聊天正文会自动简化，完整监控内容进入卡片。',
  versionList: [
    {
      value: '1.2.0',
      description: '向当前 iPollo App 智能体发送文本或原生卡片推送',
      inputs: [
        {
          key: 'hook_url',
          label: 'Hook 地址',
          valueType: WorkflowIOValueTypeEnum.string,
          renderTypeList: [FlowNodeInputTypeEnum.hidden, FlowNodeInputTypeEnum.reference],
          toolDescription: '兼容旧版 Hook 推送。当前 iPollo App 智能体推送不需要填写。'
        },
        {
          key: 'agent_id',
          label: 'Agent ID',
          valueType: WorkflowIOValueTypeEnum.string,
          renderTypeList: [FlowNodeInputTypeEnum.hidden],
          toolDescription: '默认从当前 iPollo App 运行时读取；通常不需要填写。'
        },
        {
          key: 'application_id',
          label: 'Application ID',
          valueType: WorkflowIOValueTypeEnum.string,
          renderTypeList: [FlowNodeInputTypeEnum.hidden],
          toolDescription: '默认从当前 iPollo App 运行时或系统环境读取；通常不需要填写。'
        },
        {
          key: 'text',
          label: '聊天短提示',
          valueType: WorkflowIOValueTypeEnum.string,
          renderTypeList: [FlowNodeInputTypeEnum.reference, FlowNodeInputTypeEnum.textarea],
          toolDescription:
            '可选；聊天里显示的短提示。有原生卡片时插件会默认使用“本次监控内容已更新，查看卡片获取摘要和变化。”，旧工作流把完整正文接到这里也会自动进入卡片内容。'
        },
        {
          key: 'push_content',
          label: '监控内容',
          valueType: WorkflowIOValueTypeEnum.string,
          renderTypeList: [FlowNodeInputTypeEnum.reference, FlowNodeInputTypeEnum.textarea],
          toolDescription:
            '本次监控变化的完整内容，会进入 APP 卡片的“监控变化”区域；有卡片时不会在聊天文字里重复展示。'
        },
        {
          key: 'monitor_object',
          label: '监控对象名称',
          valueType: WorkflowIOValueTypeEnum.string,
          renderTypeList: [FlowNodeInputTypeEnum.reference, FlowNodeInputTypeEnum.input],
          toolDescription:
            '本次变化对应的具体对象名称，例如 TSLA、SpaceX、某主题或某机构；多个对象可用逗号、换行或空格分隔。APP 卡片最多展示 3 个并显示 +N。'
        },
        {
          key: 'monitor_object_name',
          label: '监控对象名称',
          valueType: WorkflowIOValueTypeEnum.string,
          renderTypeList: [FlowNodeInputTypeEnum.hidden, FlowNodeInputTypeEnum.reference],
          toolDescription:
            '监控对象名称的兼容字段；优先使用监控对象名称，通常不需要和 monitor_object 同时填写。'
        },
        {
          key: 'ai_summary',
          label: 'AI 总结',
          valueType: WorkflowIOValueTypeEnum.string,
          renderTypeList: [FlowNodeInputTypeEnum.reference, FlowNodeInputTypeEnum.textarea],
          toolDescription: '给 APP 卡片展示的核心总结。为空时使用摘要或监控内容。'
        },
        {
          key: 'event_time',
          label: '变化时间',
          valueType: WorkflowIOValueTypeEnum.string,
          renderTypeList: [FlowNodeInputTypeEnum.reference, FlowNodeInputTypeEnum.input],
          toolDescription: '监控变化发生或生成时间，建议传 ISO 时间字符串。为空时由插件自动生成。'
        },
        {
          key: 'app_card_json',
          label: 'APP 原生卡片 JSON',
          valueType: WorkflowIOValueTypeEnum.string,
          renderTypeList: [FlowNodeInputTypeEnum.hidden, FlowNodeInputTypeEnum.reference],
          toolDescription:
            '可选；传入上游原生卡片插件返回的 app_card，例如 MarketMonitorEventCard。App 打开消息时会按 componentName 渲染卡片。'
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
        {
          type: FlowNodeOutputTypeEnum.error,
          valueType: WorkflowIOValueTypeEnum.string,
          key: 'system_error',
          label: '错误'
        }
      ]
    },
    {
      value: '1.1.0',
      description: '兼容旧版：向 iPollo App Agent Hook 发送文本推送',
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
