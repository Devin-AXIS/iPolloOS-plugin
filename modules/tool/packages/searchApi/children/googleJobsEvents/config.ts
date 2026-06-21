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

export default defineTool({
  name: {
    'zh-CN': 'Google 招聘与活动',
    en: 'Google Jobs & Events'
  },
  description: {
    'zh-CN': '查询 Google Jobs 或 Google Events。',
    en: 'Search Google Jobs or Google Events.'
  },
  toolDescription: '招聘和活动搜索合并工具。输入职位/活动关键词，地点按需填写。',
  versionList: [
    {
      value: '0.1.0',
      description: 'Google 招聘 / 活动搜索',
      inputs: [
        qInput,
        {
          key: 'mode',
          label: '搜索类型',
          valueType: WorkflowIOValueTypeEnum.string,
          renderTypeList: [FlowNodeInputTypeEnum.select, FlowNodeInputTypeEnum.reference],
          defaultValue: 'jobs',
          list: [
            { label: '招聘', value: 'jobs' },
            { label: '活动', value: 'events' }
          ]
        },
        locationInput,
        numInput,
        countryInput,
        languageInput
      ],
      outputs: commonOutputs
    }
  ]
});
