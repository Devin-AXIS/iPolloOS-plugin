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
    'zh-CN': 'Google 本地地点',
    en: 'Google Local & Place'
  },
  description: {
    'zh-CN': '查询 Google Local、Maps 或 Place 地点详情。',
    en: 'Search Google Local, Maps, or Place details.'
  },
  toolDescription:
    '本地地点合并工具。Local/Maps 可填地点名称；Place 详情建议填 SearchAPI 返回的 data_id 或 place_id。',
  versionList: [
    {
      value: '0.1.0',
      description: 'Google 本地 / 地图 / 地点详情',
      inputs: [
        qInput,
        {
          key: 'mode',
          label: '搜索类型',
          valueType: WorkflowIOValueTypeEnum.string,
          renderTypeList: [FlowNodeInputTypeEnum.select, FlowNodeInputTypeEnum.reference],
          defaultValue: 'local',
          list: [
            { label: '本地搜索', value: 'local' },
            { label: '地图搜索', value: 'maps' },
            { label: '地点详情', value: 'place' }
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
