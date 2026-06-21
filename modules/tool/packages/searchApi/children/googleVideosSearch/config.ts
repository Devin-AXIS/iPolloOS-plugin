import { defineTool } from '@tool/type';
import { FlowNodeInputTypeEnum, WorkflowIOValueTypeEnum } from '@tool/type/ipolloos';
import {
  commonOutputs,
  countryInput,
  languageInput,
  locationInput,
  numInput,
  qInput,
  timePeriodInput
} from '../../lib/configIo';

export default defineTool({
  name: {
    'zh-CN': 'Google 视频搜索',
    en: 'Google Videos Search'
  },
  description: {
    'zh-CN': '调用 Google 视频或 Shorts 搜索。',
    en: 'Call Google videos or Shorts search.'
  },
  toolDescription: 'Google 视频搜索，支持普通视频和 Shorts 热门短视频结果。',
  versionList: [
    {
      value: '0.2.0',
      description: 'Google 视频 / Shorts 搜索',
      inputs: [
        qInput,
        {
          key: 'mode',
          label: '搜索类型',
          valueType: WorkflowIOValueTypeEnum.string,
          renderTypeList: [FlowNodeInputTypeEnum.select, FlowNodeInputTypeEnum.reference],
          defaultValue: 'videos',
          list: [
            { label: '视频', value: 'videos' },
            { label: 'Shorts 短视频', value: 'shorts' }
          ]
        },
        numInput,
        timePeriodInput,
        countryInput,
        languageInput,
        locationInput
      ],
      outputs: commonOutputs
    }
  ]
});
