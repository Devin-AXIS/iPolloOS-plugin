import { defineTool } from '@tool/type';
import {
  FlowNodeInputTypeEnum,
  FlowNodeOutputTypeEnum,
  WorkflowIOValueTypeEnum
} from '@tool/type/ipolloos';

export default defineTool({
  toolId: 'xPlatform_xapito/checkAccountUpdates',
  name: {
    'zh-CN': '触发器：监控 X 账号内容变化',
    en: 'Trigger: Monitor X account changes'
  },
  description: {
    'zh-CN': '标准 polling trigger：每次调用检查一个 X 账号，并输出新增事件和下一次状态。',
    en: 'Standard polling trigger: check one X account per invocation, then return new events and next state.'
  },
  toolDescription:
    'Standard iPolloOS polling trigger. The host system schedules this tool, passes state_json, stores next_state_json, deduplicates events, and dispatches workflows. The plugin performs exactly one X update check per invocation.',
  runtime: {
    kind: 'trigger',
    trigger: {
      type: 'polling',
      configurableInterval: true,
      schedule: {
        minIntervalSeconds: 60,
        defaultIntervalSeconds: 60,
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
        occurredAtKey: 'occurredAt',
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
      value: '1.0.7',
      description: '状态化检查账号新增内容',
      inputs: [
        {
          key: 'username',
          label: '用户名',
          required: true,
          valueType: WorkflowIOValueTypeEnum.string,
          renderTypeList: [FlowNodeInputTypeEnum.input, FlowNodeInputTypeEnum.reference],
          placeholder: 'openai',
          toolDescription: 'X 用户名，可带或不带 @。一个 Trigger Instance 建议监控一个账号。'
        },
        {
          key: 'state_json',
          label: '状态 JSON',
          valueType: WorkflowIOValueTypeEnum.string,
          renderTypeList: [FlowNodeInputTypeEnum.hidden, FlowNodeInputTypeEnum.reference],
          required: false,
          toolDescription:
            '主系统保存的上一次 next_state_json。标准 Trigger 模式下插件不会读取本地状态文件。'
        },
        {
          key: 'max_results',
          label: '最大检查数量',
          defaultValue: 20,
          valueType: WorkflowIOValueTypeEnum.number,
          renderTypeList: [FlowNodeInputTypeEnum.numberInput, FlowNodeInputTypeEnum.reference],
          min: 5,
          max: 100,
          toolDescription: '每次检查读取的最近帖子数量。'
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
        },
        {
          key: 'initial_mode',
          label: '首次运行模式',
          defaultValue: 'baseline',
          valueType: WorkflowIOValueTypeEnum.string,
          renderTypeList: [FlowNodeInputTypeEnum.select, FlowNodeInputTypeEnum.reference],
          list: [
            { label: '建立基线', value: 'baseline' },
            { label: '回填历史', value: 'backfill' }
          ],
          toolDescription:
            'baseline 首次运行只建立游标，不产生历史事件；backfill 会将首次查询结果作为事件返回。'
        },
        {
          key: 'mask_sensitive_info',
          label: '屏蔽敏感信息',
          defaultValue: true,
          valueType: WorkflowIOValueTypeEnum.boolean,
          renderTypeList: [FlowNodeInputTypeEnum.switch, FlowNodeInputTypeEnum.reference],
          toolDescription: '开启后会屏蔽社交平台敏感词和链接，适合传给模型或用户端展示。'
        },
      ],
      outputs: [
        {
          valueType: WorkflowIOValueTypeEnum.arrayAny,
          key: 'events_json',
          label: '新增事件 JSON'
        },
        {
          valueType: WorkflowIOValueTypeEnum.number,
          key: 'count',
          label: '新增数量'
        },
        {
          valueType: WorkflowIOValueTypeEnum.boolean,
          key: 'should_push',
          label: '是否有新增需推送'
        },
        {
          valueType: WorkflowIOValueTypeEnum.object,
          key: 'next_state_json',
          label: '下一次状态 JSON'
        },
        {
          type: FlowNodeOutputTypeEnum.error,
          valueType: WorkflowIOValueTypeEnum.object,
          key: 'system_error',
          label: '错误'
        }
      ]
    }
  ]
});
