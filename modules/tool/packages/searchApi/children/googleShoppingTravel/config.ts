import { defineTool } from '@tool/type';
import { FlowNodeInputTypeEnum, WorkflowIOValueTypeEnum } from '@tool/type/ipolloos';
import {
  commonOutputs,
  countryInput,
  languageInput,
  locationInput,
  numInput,
  qInput
} from '../../lib/configIo';

const simpleTextInput = (key: string, label: string, placeholder: string) => ({
  key,
  label,
  valueType: WorkflowIOValueTypeEnum.string,
  renderTypeList: [FlowNodeInputTypeEnum.input, FlowNodeInputTypeEnum.reference],
  placeholder
});

export default defineTool({
  name: {
    'zh-CN': 'Google 购物与旅行',
    en: 'Google Shopping & Travel'
  },
  description: {
    'zh-CN': '查询 Google Shopping、Flights、Hotels 或 Travel Explore。',
    en: 'Search Google Shopping, Flights, Hotels, or Travel Explore.'
  },
  toolDescription:
    '购物和旅行合并工具。购物/酒店/探索通常填搜索关键词；航班模式需要填写出发、到达和出发日期。',
  versionList: [
    {
      value: '0.1.0',
      description: 'Google 购物 / 航班 / 酒店 / 旅行探索',
      inputs: [
        qInput,
        {
          key: 'mode',
          label: '搜索类型',
          valueType: WorkflowIOValueTypeEnum.string,
          renderTypeList: [FlowNodeInputTypeEnum.select, FlowNodeInputTypeEnum.reference],
          defaultValue: 'shopping',
          list: [
            { label: '购物', value: 'shopping' },
            { label: '航班', value: 'flights' },
            { label: '酒店', value: 'hotels' },
            { label: '旅行探索', value: 'travel_explore' }
          ]
        },
        simpleTextInput('from', '出发地（航班）', 'SFO'),
        simpleTextInput('to', '到达地（航班）', 'JFK'),
        simpleTextInput('date', '出发日期（航班）', '2026-07-01'),
        locationInput,
        numInput,
        countryInput,
        languageInput
      ],
      outputs: commonOutputs
    }
  ]
});
