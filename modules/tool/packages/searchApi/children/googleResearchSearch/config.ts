import { defineTool } from '@tool/type';
import { FlowNodeInputTypeEnum, WorkflowIOValueTypeEnum } from '@tool/type/ipolloos';
import {
  commonOutputs,
  countryInput,
  languageInput,
  numInput,
  qInput,
  timePeriodInput
} from '../../lib/configIo';

export default defineTool({
  name: {
    'zh-CN': 'Google 学术资料搜索',
    en: 'Google Research Search'
  },
  description: {
    'zh-CN': '查询 Google Scholar、Forums、Patents 或 Books。',
    en: 'Search Google Scholar, Forums, Patents, or Books.'
  },
  toolDescription:
    '学术、论坛、专利、图书合并工具。适合查论文、论坛讨论、专利发明人/受让人信息和图书。',
  versionList: [
    {
      value: '0.1.0',
      description: 'Google 学术 / 论坛 / 专利 / 图书搜索',
      inputs: [
        qInput,
        {
          key: 'mode',
          label: '搜索类型',
          valueType: WorkflowIOValueTypeEnum.string,
          renderTypeList: [FlowNodeInputTypeEnum.select, FlowNodeInputTypeEnum.reference],
          defaultValue: 'scholar',
          list: [
            { label: '学术', value: 'scholar' },
            { label: '论坛', value: 'forums' },
            { label: '专利', value: 'patents' },
            { label: '图书', value: 'books' }
          ]
        },
        numInput,
        timePeriodInput,
        countryInput,
        languageInput
      ],
      outputs: commonOutputs
    }
  ]
});
