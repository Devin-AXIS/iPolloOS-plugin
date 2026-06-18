import { defineTool } from '@tool/type';
import {
  FlowNodeInputTypeEnum,
  FlowNodeOutputTypeEnum,
  WorkflowIOValueTypeEnum
} from '@tool/type/ipolloos';

export default defineTool({
  name: {
    'zh-CN': '扫描主题热度',
    en: 'Scan theme momentum'
  },
  description: {
    'zh-CN': '扫描 AI、机器人、核聚变、量子计算、自动驾驶等主题热度变化。',
    en: 'Scan momentum changes for themes such as AI, robotics, fusion, quantum, and autonomy.'
  },
  toolDescription:
    'Theme momentum monitor. Users provide themes; optional theme_signals_json can contain rows with theme/topic, mentions, previousMentions, engagement, sentiment, sourceCount, sourceName, and url.',
  runtime: {
    kind: 'execute',
    execute: {
      riskLevel: 'read'
    }
  },
  versionList: [
    {
      value: '1.0.0',
      description: '主题热度与提及量扫描',
      inputs: [
        {
          key: 'themes',
          label: '主题',
          required: true,
          valueType: WorkflowIOValueTypeEnum.string,
          renderTypeList: [FlowNodeInputTypeEnum.textarea, FlowNodeInputTypeEnum.reference],
          placeholder: 'AI Agent, Robotics, Nuclear fusion, Quantum computing',
          toolDescription: '主题、行业或产业关键词。'
        },
        {
          key: 'theme_signals_json',
          label: '主题信号 JSON',
          valueType: WorkflowIOValueTypeEnum.string,
          renderTypeList: [FlowNodeInputTypeEnum.textarea, FlowNodeInputTypeEnum.reference],
          required: false,
          toolDescription: '可选。上游新闻、搜索、X、趋势 provider 返回的主题热度数据。'
        },
        {
          key: 'mention_spike_ratio',
          label: '提及量倍数',
          valueType: WorkflowIOValueTypeEnum.number,
          renderTypeList: [FlowNodeInputTypeEnum.numberInput, FlowNodeInputTypeEnum.reference],
          defaultValue: 2,
          min: 1,
          max: 50
        },
        {
          key: 'min_signal_score',
          label: '最低信号分',
          valueType: WorkflowIOValueTypeEnum.number,
          renderTypeList: [FlowNodeInputTypeEnum.numberInput, FlowNodeInputTypeEnum.reference],
          defaultValue: 45,
          min: 0,
          max: 100
        }
      ],
      outputs: [
        {
          valueType: WorkflowIOValueTypeEnum.string,
          key: 'theme_events_json',
          label: '主题事件 JSON'
        },
        {
          valueType: WorkflowIOValueTypeEnum.string,
          key: 'theme_scores_json',
          label: '主题分数 JSON'
        },
        {
          valueType: WorkflowIOValueTypeEnum.string,
          key: 'summary_markdown',
          label: '扫描摘要'
        },
        {
          valueType: WorkflowIOValueTypeEnum.number,
          key: 'count',
          label: '事件数'
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
