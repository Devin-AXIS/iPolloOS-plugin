import { defineToolSet } from '@tool/type';
import { ToolTagEnum } from '@tool/type/tags';

export default defineToolSet({
  tags: [ToolTagEnum.enum.finance, ToolTagEnum.enum.news],
  name: {
    'zh-CN': '美股市场核心',
    en: 'US Market Core'
  },
  description: {
    'zh-CN': '监控美股行情、成交量、技术突破、财报日历和财报结果，输出统一市场情报事件。',
    en: 'Monitor US equity price, volume, technical, earnings calendar, and earnings-result events.'
  },
  toolDescription:
    'Core US equity market intelligence toolset. Use it for stock watchlists, price/volume anomaly checks, technical breakout scans, earnings calendar checks, and earnings surprise summaries. User-facing inputs stay simple; provider keys and thresholds are optional.',
  courseUrl: 'https://site.financialmodelingprep.com/developer/docs/quickstart',
  secretInputConfig: [
    {
      key: 'marketDataProvider',
      label: '默认行情源',
      description: 'auto / fmp / finnhub / alpha_vantage。默认 auto。',
      required: false,
      inputType: 'input'
    },
    {
      key: 'fmpApiKey',
      label: 'FMP API Key',
      description: '用于 Financial Modeling Prep 行情、财报和公司数据。',
      required: false,
      inputType: 'secret'
    },
    {
      key: 'finnhubApiKey',
      label: 'Finnhub API Key',
      description: '用于 Finnhub 行情、财报日历和公司数据。',
      required: false,
      inputType: 'secret'
    },
    {
      key: 'alphaVantageApiKey',
      label: 'Alpha Vantage API Key',
      description: '用于 Alpha Vantage 行情和新闻情绪兜底。',
      required: false,
      inputType: 'secret'
    }
  ]
});
