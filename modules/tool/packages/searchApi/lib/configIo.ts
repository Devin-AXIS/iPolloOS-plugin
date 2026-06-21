import {
  FlowNodeInputTypeEnum,
  FlowNodeOutputTypeEnum,
  WorkflowIOValueTypeEnum
} from '@tool/type/ipolloos';

export const qInput = {
  key: 'q',
  label: '搜索关键词',
  toolDescription: '输入要搜索的关键词、问题、地点、职位、公司或主题。',
  required: true,
  valueType: WorkflowIOValueTypeEnum.string,
  renderTypeList: [FlowNodeInputTypeEnum.reference, FlowNodeInputTypeEnum.input]
};

export const queryTextareaInput = {
  ...qInput,
  renderTypeList: [FlowNodeInputTypeEnum.reference, FlowNodeInputTypeEnum.textarea]
};

export const numInput = {
  key: 'num',
  label: '最大搜索数量',
  valueType: WorkflowIOValueTypeEnum.number,
  renderTypeList: [FlowNodeInputTypeEnum.numberInput, FlowNodeInputTypeEnum.reference],
  defaultValue: 20,
  max: 100,
  min: 1
};

export const timePeriodInput = {
  key: 'time_period',
  label: '搜索日期范围',
  valueType: WorkflowIOValueTypeEnum.string,
  renderTypeList: [FlowNodeInputTypeEnum.select, FlowNodeInputTypeEnum.reference],
  defaultValue: '',
  list: [
    { label: '不限制', value: '' },
    { label: '最近 1 小时', value: 'last_hour' },
    { label: '最近 1 天', value: 'last_day' },
    { label: '最近 1 周', value: 'last_week' },
    { label: '最近 1 月', value: 'last_month' },
    { label: '最近 1 年', value: 'last_year' }
  ]
};

export const countryInput = {
  key: 'country',
  label: '国家（可选）',
  valueType: WorkflowIOValueTypeEnum.string,
  renderTypeList: [FlowNodeInputTypeEnum.input, FlowNodeInputTypeEnum.reference],
  placeholder: 'us',
  toolDescription: 'Google gl 国家码；不填使用父插件默认国家。'
};

export const languageInput = {
  key: 'language',
  label: '语言（可选）',
  valueType: WorkflowIOValueTypeEnum.string,
  renderTypeList: [FlowNodeInputTypeEnum.input, FlowNodeInputTypeEnum.reference],
  placeholder: 'en',
  toolDescription: 'Google hl 语言码；不填使用父插件默认语言。'
};

export const locationInput = {
  key: 'location',
  label: '地点（可选）',
  valueType: WorkflowIOValueTypeEnum.string,
  renderTypeList: [FlowNodeInputTypeEnum.input, FlowNodeInputTypeEnum.reference],
  placeholder: 'New York, United States',
  toolDescription: '需要本地化结果时填写城市、地区或国家。'
};

export const commonOutputs = [
  {
    valueType: WorkflowIOValueTypeEnum.arrayObject,
    key: 'result',
    label: '搜索结果',
    description: '归一化后的搜索结果'
  },
  {
    valueType: WorkflowIOValueTypeEnum.string,
    key: 'raw_json',
    label: '原始响应 JSON'
  },
  {
    valueType: WorkflowIOValueTypeEnum.string,
    key: 'source_links',
    label: '来源链接'
  },
  {
    valueType: WorkflowIOValueTypeEnum.number,
    key: 'count',
    label: '返回条数'
  },
  {
    valueType: WorkflowIOValueTypeEnum.string,
    key: 'engine',
    label: 'SearchAPI Engine'
  },
  {
    type: FlowNodeOutputTypeEnum.error,
    valueType: WorkflowIOValueTypeEnum.string,
    key: 'system_error',
    label: '错误'
  }
];
