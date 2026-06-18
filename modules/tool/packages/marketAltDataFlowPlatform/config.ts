import { defineToolSet } from '@tool/type';
import { ToolTagEnum } from '@tool/type/tags';

export default defineToolSet({
  tags: [ToolTagEnum.enum.finance, ToolTagEnum.enum.news],
  name: {
    'zh-CN': '资金流与大额交易监控',
    en: 'Market Flow Monitor'
  },
  description: {
    'zh-CN': '监控期权大单、Sweep、Dark Pool、国会议员交易和 ETF/基金流向。',
    en: 'Monitor options flow, sweeps, dark-pool prints, Congress trades, and ETF/fund flows.'
  },
  toolDescription:
    'Alternative market-flow intelligence toolset. Use it for large call/put flow, sweeps, dark-pool block prints, Congress transaction disclosures, ETF/fund inflows and outflows, and smart-money capital-flow summaries. User inputs stay simple; provider payloads can be passed as JSON.',
  courseUrl: 'https://polygon.io/docs/options/get_v3_reference_options_contracts',
  secretInputConfig: [
    {
      key: 'optionsFlowProvider',
      label: 'Options Flow Provider',
      description: 'auto / unusual_whales / polygon / tradier / custom。默认 custom JSON。',
      required: false,
      inputType: 'input'
    },
    {
      key: 'optionsFlowApiKey',
      label: 'Options Flow API Key',
      description: '用于期权大单、Sweep 数据源。',
      required: false,
      inputType: 'secret'
    },
    {
      key: 'darkPoolApiKey',
      label: 'Dark Pool API Key',
      description: '用于 Dark Pool / ATS block print 数据源。',
      required: false,
      inputType: 'secret'
    },
    {
      key: 'congressDataApiKey',
      label: 'Congress Data API Key',
      description: '用于国会议员交易披露数据源，例如 Quiver/CapitolTrades 类 provider。',
      required: false,
      inputType: 'secret'
    },
    {
      key: 'fundFlowApiKey',
      label: 'Fund Flow API Key',
      description: '用于 ETF/基金资金流数据源。',
      required: false,
      inputType: 'secret'
    }
  ]
});
