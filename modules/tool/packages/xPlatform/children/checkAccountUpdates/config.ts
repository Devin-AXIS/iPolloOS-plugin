import { defineTool } from '@tool/type';
import {
  FlowNodeInputTypeEnum,
  FlowNodeOutputTypeEnum,
  WorkflowIOValueTypeEnum
} from '@tool/type/ipolloos';

export default defineTool({
  name: {
    'zh-CN': '检查 X 账号新增内容',
    en: 'Check X account updates'
  },
  description: {
    'zh-CN': '按状态检查某个 X 账号是否有新增内容，并输出事件和下一次状态。',
    en: 'Check whether an X account has new posts by state, then return events and next state.'
  },
  toolDescription:
    'Trigger-friendly X polling check. It reads state_json, fetches user posts with since_id, returns events_json and next_state_json. Use this in monitor workflows.',
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
        schemaVersion: 'x-account-watch-state.v1',
        cursorKey: 'lastPostId',
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
      value: '1.0.0',
      description: '状态化检查账号新增内容',
      inputs: [
        {
          key: 'username',
          label: '用户名',
          required: true,
          valueType: WorkflowIOValueTypeEnum.string,
          renderTypeList: [FlowNodeInputTypeEnum.reference, FlowNodeInputTypeEnum.input],
          placeholder: 'xdevelopers',
          toolDescription: 'X 用户名，可带或不带 @。'
        },
        {
          key: 'user_id',
          label: '用户 ID（可选）',
          valueType: WorkflowIOValueTypeEnum.string,
          renderTypeList: [FlowNodeInputTypeEnum.reference, FlowNodeInputTypeEnum.input],
          toolDescription: '已知 X user id 时可填写，避免每次解析 username。'
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
          key: 'max_results',
          label: '单次检查条数',
          required: true,
          defaultValue: 10,
          valueType: WorkflowIOValueTypeEnum.number,
          renderTypeList: [FlowNodeInputTypeEnum.numberInput, FlowNodeInputTypeEnum.reference],
          min: 5,
          max: 100,
          toolDescription: '建议 5-50，过大可能增加 API 成本。'
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
