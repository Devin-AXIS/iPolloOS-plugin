import { defineTool } from '@tool/type';
import {
  FlowNodeInputTypeEnum,
  FlowNodeOutputTypeEnum,
  WorkflowIOValueTypeEnum
} from '@tool/type/ipolloos';

export default defineTool({
  name: {
    'zh-CN': '扫描股票异动',
    en: 'Scan market assets'
  },
  description: {
    'zh-CN': '输入股票或 watchlist，扫描涨跌、放量和技术突破，并输出市场情报事件。',
    en: 'Scan tickers or a watchlist for price moves, volume spikes, and technical breakouts.'
  },
  toolDescription:
    'Market-radar tool for simple user inputs. Users provide symbols or a watchlist. Optional market_data_json can contain provider rows with symbol, price, previousClose, changePercent, volume, avgVolume, fiftyTwoWeekHigh, fiftyTwoWeekLow, movingAverage50, and movingAverage200.',
  runtime: {
    kind: 'execute',
    execute: {
      riskLevel: 'read'
    }
  },
  versionList: [
    {
      value: '1.0.0',
      description: '股票涨跌、放量和技术突破扫描',
      inputs: [
        {
          key: 'symbols',
          label: '股票/Watchlist',
          required: true,
          valueType: WorkflowIOValueTypeEnum.string,
          renderTypeList: [FlowNodeInputTypeEnum.textarea, FlowNodeInputTypeEnum.reference],
          placeholder: 'NVDA, TSLA, PLTR, META',
          toolDescription: '股票 ticker 列表，可用逗号、空格或换行分隔。'
        },
        {
          key: 'market_data_json',
          label: '行情数据 JSON',
          valueType: WorkflowIOValueTypeEnum.string,
          renderTypeList: [FlowNodeInputTypeEnum.textarea, FlowNodeInputTypeEnum.reference],
          required: false,
          toolDescription:
            '可选。上游 provider 或测试传入的行情数据。支持数组或 {data/results/items: []}。不填时只返回 watchlist 待接入提示。'
        },
        {
          key: 'price_move_threshold',
          label: '涨跌阈值 %',
          valueType: WorkflowIOValueTypeEnum.number,
          renderTypeList: [FlowNodeInputTypeEnum.numberInput, FlowNodeInputTypeEnum.reference],
          defaultValue: 3,
          min: 0.5,
          max: 50
        },
        {
          key: 'volume_spike_ratio',
          label: '放量倍数',
          valueType: WorkflowIOValueTypeEnum.number,
          renderTypeList: [FlowNodeInputTypeEnum.numberInput, FlowNodeInputTypeEnum.reference],
          defaultValue: 2,
          min: 1,
          max: 20
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
          key: 'events_json',
          label: '市场事件 JSON'
        },
        {
          valueType: WorkflowIOValueTypeEnum.string,
          key: 'signals_json',
          label: '股票信号 JSON'
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
