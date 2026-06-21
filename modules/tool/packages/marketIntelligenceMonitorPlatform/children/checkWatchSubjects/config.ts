import { defineTool } from '@tool/type';
import {
  FlowNodeInputTypeEnum,
  FlowNodeOutputTypeEnum,
  WorkflowIOValueTypeEnum
} from '@tool/type/ipolloos';

export default defineTool({
  name: {
    'zh-CN': '检查关注对象异动',
    en: 'Check watch subject events'
  },
  description: {
    'zh-CN': '聚合多个来源的新增事件，匹配共享关注对象池，输出去重后的监控异动和下一次状态。',
    en: 'Aggregate source events, match shared watch subjects, and return deduplicated alerts with next state.'
  },
  toolDescription:
    'Polling trigger for the AI Market Intelligence monitor. Pass market_watch_subject rows plus events from market, SEC, news/theme, X, or flow plugins. The tool returns events_json, next_state_json, card_inputs_json for MarketMonitorEventCard, and records_json for market_signal_event/cursor writes.',
  runtime: {
    kind: 'trigger',
    trigger: {
      type: 'polling',
      schedule: {
        minIntervalSeconds: 300,
        defaultIntervalSeconds: 3600,
        maxIntervalSeconds: 21600,
        timeoutSeconds: 120,
        jitterSeconds: 60
      },
      state: {
        inputKey: 'state_json',
        outputKey: 'next_state_json',
        schemaVersion: 'market-watch-monitor-state.v1',
        cursorKey: 'subjects',
        resettable: true
      },
      event: {
        outputKey: 'events_json',
        schemaVersion: 'market-watch-monitor-event.v1',
        dedupeKey: 'dedupeKey',
        occurredAtKey: 'eventTime',
        maxBatchEvents: 50
      },
      delivery: {
        retryMaxAttempts: 3,
        retryBackoff: 'exponential',
        failurePolicy: 'keep_state',
        concurrencyKeyInput: 'watch_subjects_json',
        lockTtlSeconds: 180
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
      description: '共享关注对象池聚合监控检查',
      inputs: [
        {
          key: 'watch_subjects_json',
          label: '关注对象 JSON',
          required: true,
          valueType: WorkflowIOValueTypeEnum.string,
          renderTypeList: [FlowNodeInputTypeEnum.textarea, FlowNodeInputTypeEnum.reference],
          toolDescription:
            'market_watch_subject 或 market_watch_target 行数组。支持 subject_key/target_key、subject_type/target_type、display_name/name、primary_ticker/symbol、aliases_json、source_bindings_json。'
        },
        {
          key: 'state_json',
          label: '状态 JSON',
          valueType: WorkflowIOValueTypeEnum.string,
          renderTypeList: [FlowNodeInputTypeEnum.hidden, FlowNodeInputTypeEnum.reference],
          toolDescription: '上一次输出的 next_state_json。平台触发运行时会自动保存和传回。'
        },
        {
          key: 'market_events_json',
          label: '行情事件 JSON',
          valueType: WorkflowIOValueTypeEnum.string,
          renderTypeList: [FlowNodeInputTypeEnum.textarea, FlowNodeInputTypeEnum.reference]
        },
        {
          key: 'sec_events_json',
          label: 'SEC/披露事件 JSON',
          valueType: WorkflowIOValueTypeEnum.string,
          renderTypeList: [FlowNodeInputTypeEnum.textarea, FlowNodeInputTypeEnum.reference]
        },
        {
          key: 'news_events_json',
          label: '新闻主题事件 JSON',
          valueType: WorkflowIOValueTypeEnum.string,
          renderTypeList: [FlowNodeInputTypeEnum.textarea, FlowNodeInputTypeEnum.reference]
        },
        {
          key: 'x_events_json',
          label: 'X 事件 JSON',
          valueType: WorkflowIOValueTypeEnum.string,
          renderTypeList: [FlowNodeInputTypeEnum.textarea, FlowNodeInputTypeEnum.reference]
        },
        {
          key: 'flow_events_json',
          label: '资金流事件 JSON',
          valueType: WorkflowIOValueTypeEnum.string,
          renderTypeList: [FlowNodeInputTypeEnum.textarea, FlowNodeInputTypeEnum.reference]
        },
        {
          key: 'source_events_json',
          label: '其他来源事件 JSON',
          valueType: WorkflowIOValueTypeEnum.string,
          renderTypeList: [FlowNodeInputTypeEnum.textarea, FlowNodeInputTypeEnum.reference]
        },
        {
          key: 'min_importance_score',
          label: '最低重要性',
          valueType: WorkflowIOValueTypeEnum.number,
          renderTypeList: [FlowNodeInputTypeEnum.numberInput, FlowNodeInputTypeEnum.reference],
          defaultValue: 55,
          min: 0,
          max: 100
        },
        {
          key: 'lookback_hours',
          label: '回看小时',
          valueType: WorkflowIOValueTypeEnum.number,
          renderTypeList: [FlowNodeInputTypeEnum.numberInput, FlowNodeInputTypeEnum.reference],
          defaultValue: 72,
          min: 1,
          max: 720
        },
        {
          key: 'max_events',
          label: '最多事件数',
          valueType: WorkflowIOValueTypeEnum.number,
          renderTypeList: [FlowNodeInputTypeEnum.numberInput, FlowNodeInputTypeEnum.reference],
          defaultValue: 50,
          min: 1,
          max: 200
        }
      ],
      outputs: [
        { valueType: WorkflowIOValueTypeEnum.string, key: 'events_json', label: '监控事件 JSON' },
        {
          valueType: WorkflowIOValueTypeEnum.string,
          key: 'card_inputs_json',
          label: '卡片入参 JSON'
        },
        { valueType: WorkflowIOValueTypeEnum.string, key: 'records_json', label: '写入记录 JSON' },
        {
          valueType: WorkflowIOValueTypeEnum.string,
          key: 'cursor_records_json',
          label: '游标记录 JSON'
        },
        {
          valueType: WorkflowIOValueTypeEnum.string,
          key: 'next_state_json',
          label: '下一次状态 JSON'
        },
        { valueType: WorkflowIOValueTypeEnum.string, key: 'summary_markdown', label: '检查摘要' },
        { valueType: WorkflowIOValueTypeEnum.number, key: 'count', label: '事件数量' },
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
