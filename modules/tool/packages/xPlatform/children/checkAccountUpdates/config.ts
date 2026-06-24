import { defineTool } from '@tool/type';
import {
  FlowNodeInputTypeEnum,
  FlowNodeOutputTypeEnum,
  WorkflowIOValueTypeEnum
} from '@tool/type/ipolloos';

export default defineTool({
  name: {
    'zh-CN': '监控 X 内容变化',
    en: 'Monitor X content changes'
  },
  description: {
    'zh-CN': '监控 X 账号内容变化，并输出新增事件和下一次状态。未配置账号时保持轮询但不产生事件。',
    en: 'Monitor X account content changes, then return new events and next state. If no account is configured, polling stays active without emitting events.'
  },
  toolDescription:
    'Trigger-friendly X polling check. It accepts one or more usernames, reads state_json, fetches user posts with since_id per account, returns events_json and next_state_json. Use this in monitor workflows.',
  runtime: {
    kind: 'trigger',
    trigger: {
      type: 'polling',
      schedule: {
        minIntervalSeconds: 60,
        defaultIntervalSeconds: 300,
        maxIntervalSeconds: 86400,
        timeoutSeconds: 60,
        jitterSeconds: 15
      },
      state: {
        inputKey: 'state_json',
        outputKey: 'next_state_json',
        schemaVersion: 'x-account-watch-state.v2',
        cursorKey: 'accounts',
        resettable: true
      },
      event: {
        outputKey: 'events_json',
        schemaVersion: 'x-account-post-event.v1',
        dedupeKey: 'dedupeKey',
        occurredAtKey: 'postedAt',
        maxBatchEvents: 50
      },
      delivery: {
        retryMaxAttempts: 3,
        retryBackoff: 'exponential',
        failurePolicy: 'keep_state',
        concurrencyKeyInput: 'username',
        lockTtlSeconds: 120
      },
      permissions: {
        allowManualRun: true,
        allowAutoRun: true
      }
    }
  },
  versionList: [
    {
      value: '1.0.2',
      description: '允许空监控名单保持轮询',
      inputs: [
        {
          key: 'username',
          label: '用户名列表',
          required: false,
          valueType: WorkflowIOValueTypeEnum.string,
          renderTypeList: [FlowNodeInputTypeEnum.textarea, FlowNodeInputTypeEnum.reference],
          placeholder: 'xdevelopers\nopenai\nelonmusk',
          toolDescription:
            'X 用户名列表，可带或不带 @。多个账号用换行、逗号或空格分隔。为空时保持轮询但不产生事件。'
        },
        {
          key: 'state_json',
          label: '状态 JSON',
          valueType: WorkflowIOValueTypeEnum.string,
          renderTypeList: [FlowNodeInputTypeEnum.hidden, FlowNodeInputTypeEnum.reference],
          required: false,
          toolDescription: '上一次输出的 next_state_json。平台监控实例会自动保存和传回。'
        },
        {
          key: 'include_replies',
          label: '包含回复',
          defaultValue: false,
          valueType: WorkflowIOValueTypeEnum.boolean,
          renderTypeList: [FlowNodeInputTypeEnum.switch, FlowNodeInputTypeEnum.reference]
        },
        {
          key: 'include_retweets',
          label: '包含转发',
          defaultValue: false,
          valueType: WorkflowIOValueTypeEnum.boolean,
          renderTypeList: [FlowNodeInputTypeEnum.switch, FlowNodeInputTypeEnum.reference]
        }
      ],
      outputs: [
        {
          valueType: WorkflowIOValueTypeEnum.string,
          key: 'events_json',
          label: '新增事件 JSON'
        },
        {
          valueType: WorkflowIOValueTypeEnum.string,
          key: 'next_state_json',
          label: '下一次状态 JSON'
        },
        {
          valueType: WorkflowIOValueTypeEnum.string,
          key: 'summary_markdown',
          label: '检查摘要'
        },
        {
          valueType: WorkflowIOValueTypeEnum.number,
          key: 'count',
          label: '新增数量'
        },
        {
          valueType: WorkflowIOValueTypeEnum.string,
          key: 'newest_post_id',
          label: '最新 Post ID'
        },
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
