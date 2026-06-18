import { defineToolSet } from '@tool/type';
import { ToolTagEnum } from '@tool/type/tags';

export default defineToolSet({
  tags: [ToolTagEnum.enum.finance, ToolTagEnum.enum.news],
  name: {
    'zh-CN': 'SEC 披露与持仓监控',
    en: 'SEC Disclosure Monitor'
  },
  description: {
    'zh-CN':
      '优先使用 SEC 官方免费结构化数据监控文件披露、财务异动、13F 机构持仓和内部人交易，输出可解释的市场情报事件。',
    en: 'Use official free SEC structured data first to monitor filings, financial anomalies, 13F holdings, and insider transactions for market-intelligence events.'
  },
  toolDescription:
    'SEC and disclosure intelligence toolset. Use it for financial statement anomalies, 8-K/10-Q/10-K/S-3/13D/13G/Form 4 filings, 13F institution holding changes, and insider-trading signals. Inputs stay simple. SEC filings and financial anomalies can use official free SEC APIs when SEC User-Agent is configured; raw provider JSON can still be passed when a paid or indexed data source is available.',
  courseUrl: 'https://www.sec.gov/search-filings/edgar-application-programming-interfaces',
  secretInputConfig: [
    {
      key: 'secUserAgent',
      label: 'SEC User-Agent',
      description:
        'SEC API 要求的 User-Agent，例如 product email。填后可使用 SEC 官方免费 filings/companyfacts 数据；未填时仅处理传入 JSON。',
      required: false,
      inputType: 'input'
    },
    {
      key: 'secApiBaseUrl',
      label: 'SEC API Base URL',
      description: '默认 https://data.sec.gov。一般无需修改。',
      required: false,
      inputType: 'input',
      defaultValue: 'https://data.sec.gov'
    },
    {
      key: 'secCompanyTickersUrl',
      label: 'SEC Ticker Map URL',
      description: '默认 https://www.sec.gov/files/company_tickers.json。一般无需修改。',
      required: false,
      inputType: 'input',
      defaultValue: 'https://www.sec.gov/files/company_tickers.json'
    }
  ]
});
