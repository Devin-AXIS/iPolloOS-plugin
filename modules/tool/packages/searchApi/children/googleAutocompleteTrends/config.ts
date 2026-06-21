import { defineTool } from '@tool/type';
import { FlowNodeInputTypeEnum, WorkflowIOValueTypeEnum } from '@tool/type/ipolloos';
import {
  commonOutputs,
  countryInput,
  languageInput,
  qInput,
  timePeriodInput
} from '../../lib/configIo';

export default defineTool({
  name: {
    'zh-CN': 'Google 趋势与补全',
    en: 'Google Trends & Autocomplete'
  },
  description: {
    'zh-CN': '查询 Google Trends 或 Google Autocomplete。',
    en: 'Search Google Trends or Google Autocomplete.'
  },
  toolDescription: '趋势和自动补全合并工具。用于关键词热度、相关查询、用户搜索意图和选题判断。',
  versionList: [
    {
      value: '0.1.0',
      description: 'Google Trends / Autocomplete',
      inputs: [
        qInput,
        {
          key: 'mode',
          label: '搜索类型',
          valueType: WorkflowIOValueTypeEnum.string,
          renderTypeList: [FlowNodeInputTypeEnum.select, FlowNodeInputTypeEnum.reference],
          defaultValue: 'trends',
          list: [
            { label: '趋势', value: 'trends' },
            { label: '自动补全', value: 'autocomplete' }
          ]
        },
        timePeriodInput,
        countryInput,
        languageInput
      ],
      outputs: commonOutputs
    }
  ]
});
